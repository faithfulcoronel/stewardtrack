-- =====================================================================================
-- MIGRATION: Fix Final Ambiguous tenant_id Reference
-- =====================================================================================
-- This migration fixes the remaining ambiguous tenant_id reference in the
-- DELETE statement by fully qualifying all column references.
-- =====================================================================================

-- Drop and recreate with fully qualified DELETE statement
DROP FUNCTION IF EXISTS assign_license_to_tenant(uuid, uuid, uuid, text);

CREATE FUNCTION assign_license_to_tenant(
  p_tenant_id uuid,
  p_offering_id uuid,
  p_assigned_by uuid,
  p_notes text DEFAULT NULL
)
RETURNS TABLE (
  assignment_id uuid,
  tenant_id uuid,
  offering_id uuid,
  previous_offering_id uuid,
  assigned_at timestamptz,
  features_granted int,
  features_revoked int
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
BEGIN
  -- Get current offering
  SELECT subscription_offering_id INTO v_previous_offering_id
  FROM tenants
  WHERE id = p_tenant_id;

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
  RETURNING id INTO v_assignment_id;

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
      -- Delete the feature grant - use table alias to avoid ambiguity
      DELETE FROM tenant_feature_grants tfg
      WHERE tfg.tenant_id = p_tenant_id
        AND tfg.feature_id = v_old_feature_id
        AND tfg.grant_source = 'direct';

      v_features_revoked := v_features_revoked + 1;
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
    -- Insert new feature grant using correct columns
    -- grant_source = 'direct' for manual assignments
    INSERT INTO tenant_feature_grants (
      tenant_id,
      feature_id,
      grant_source,
      starts_at,
      expires_at,
      created_by
    ) VALUES (
      p_tenant_id,
      v_new_feature_id,
      'direct',
      CURRENT_DATE,
      NULL,
      p_assigned_by
    )
    ON CONFLICT (tenant_id, feature_id, grant_source, COALESCE(package_id, '00000000-0000-0000-0000-000000000000'::uuid))
    DO UPDATE SET
      starts_at = CURRENT_DATE,
      expires_at = NULL,
      updated_by = p_assigned_by,
      updated_at = now();

    v_features_granted := v_features_granted + 1;
  END LOOP;

  -- Update tenant's subscription offering
  UPDATE tenants t
  SET subscription_offering_id = p_offering_id,
      updated_at = now()
  WHERE t.id = p_tenant_id;

  -- Return assignment details
  RETURN QUERY
  SELECT
    v_assignment_id AS assignment_id,
    p_tenant_id AS tenant_id,
    p_offering_id AS offering_id,
    v_previous_offering_id AS previous_offering_id,
    now() AS assigned_at,
    v_features_granted AS features_granted,
    v_features_revoked AS features_revoked;
END;
$$;

COMMENT ON FUNCTION assign_license_to_tenant IS 'Assigns a product offering to a tenant with automated feature grant/revoke management. Uses grant_source=direct for manual assignments.';

-- Grant execute permission
GRANT EXECUTE ON FUNCTION assign_license_to_tenant(uuid, uuid, uuid, text) TO authenticated;

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';
