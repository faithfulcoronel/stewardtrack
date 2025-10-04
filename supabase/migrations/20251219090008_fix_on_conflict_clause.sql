-- =====================================================================================
-- MIGRATION: Fix ON CONFLICT Clause to Match Unique Index
-- =====================================================================================
-- This migration fixes the ON CONFLICT clause to properly match the unique index
-- on tenant_feature_grants, or simplifies to DO NOTHING.
-- =====================================================================================

-- Drop and recreate with correct ON CONFLICT
DROP FUNCTION IF EXISTS assign_license_to_tenant(uuid, uuid, uuid, text);

CREATE FUNCTION assign_license_to_tenant(
  p_tenant_id uuid,
  p_offering_id uuid,
  p_assigned_by uuid,
  p_notes text DEFAULT NULL
)
RETURNS TABLE (
  result_assignment_id uuid,
  result_tenant_id uuid,
  result_offering_id uuid,
  result_previous_offering_id uuid,
  result_assigned_at timestamptz,
  result_features_granted int,
  result_features_revoked int
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_previous_offering_id uuid;
  v_assignment_id uuid;
  v_features_granted int := 0;
  v_features_revoked int := 0;
  v_new_feature_id uuid;
  v_old_feature_id uuid;
  v_grant_exists boolean;
BEGIN
  -- Get current offering
  SELECT t.subscription_offering_id INTO v_previous_offering_id
  FROM tenants t
  WHERE t.id = p_tenant_id;

  -- Create assignment record
  INSERT INTO license_assignments (
    tenant_id,
    offering_id,
    previous_offering_id,
    assigned_by,
    notes
  ) VALUES (
    p_tenant_id,
    p_offering_id,
    v_previous_offering_id,
    p_assigned_by,
    p_notes
  )
  RETURNING license_assignments.id INTO v_assignment_id;

  -- Revoke features from old offering that are not in new offering
  IF v_previous_offering_id IS NOT NULL THEN
    FOR v_old_feature_id IN
      SELECT pof.feature_id
      FROM product_offering_features pof
      WHERE pof.offering_id = v_previous_offering_id
        AND pof.feature_id NOT IN (
          SELECT pof_new.feature_id
          FROM product_offering_features pof_new
          WHERE pof_new.offering_id = p_offering_id
        )
    LOOP
      -- Delete the feature grant
      DELETE FROM tenant_feature_grants tfg
      WHERE tfg.tenant_id = p_tenant_id
        AND tfg.feature_id = v_old_feature_id
        AND tfg.grant_source = 'direct';

      IF FOUND THEN
        v_features_revoked := v_features_revoked + 1;
      END IF;
    END LOOP;
  END IF;

  -- Grant new features from new offering
  FOR v_new_feature_id IN
    SELECT pof.feature_id
    FROM product_offering_features pof
    WHERE pof.offering_id = p_offering_id
      AND (v_previous_offering_id IS NULL OR pof.feature_id NOT IN (
        SELECT pof_prev.feature_id
        FROM product_offering_features pof_prev
        WHERE pof_prev.offering_id = v_previous_offering_id
      ))
  LOOP
    -- Check if grant already exists
    SELECT EXISTS (
      SELECT 1 FROM tenant_feature_grants tfg
      WHERE tfg.tenant_id = p_tenant_id
        AND tfg.feature_id = v_new_feature_id
        AND tfg.grant_source = 'direct'
    ) INTO v_grant_exists;

    -- Only insert if it doesn't exist
    IF NOT v_grant_exists THEN
      INSERT INTO tenant_feature_grants (
        tenant_id,
        feature_id,
        grant_source,
        source_reference,
        starts_at,
        expires_at,
        created_by
      ) VALUES (
        p_tenant_id,
        v_new_feature_id,
        'direct',
        'license_assignment',
        CURRENT_DATE,
        NULL,
        p_assigned_by
      );

      v_features_granted := v_features_granted + 1;
    ELSE
      -- Update existing grant to ensure it's active
      UPDATE tenant_feature_grants tfg
      SET
        starts_at = CURRENT_DATE,
        expires_at = NULL,
        updated_by = p_assigned_by,
        updated_at = now()
      WHERE tfg.tenant_id = p_tenant_id
        AND tfg.feature_id = v_new_feature_id
        AND tfg.grant_source = 'direct';
    END IF;
  END LOOP;

  -- Update tenant's subscription offering
  UPDATE tenants t
  SET subscription_offering_id = p_offering_id,
      updated_at = now()
  WHERE t.id = p_tenant_id;

  -- Return assignment details
  RETURN QUERY
  SELECT
    v_assignment_id,
    p_tenant_id,
    p_offering_id,
    v_previous_offering_id,
    now()::timestamptz,
    v_features_granted,
    v_features_revoked;
END;
$$;

COMMENT ON FUNCTION assign_license_to_tenant IS 'Assigns a product offering to a tenant with automated feature grant/revoke management. Uses grant_source=direct and source_reference=license_assignment for manual assignments.';

-- Grant execute permission
GRANT EXECUTE ON FUNCTION assign_license_to_tenant(uuid, uuid, uuid, text) TO authenticated;

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';
