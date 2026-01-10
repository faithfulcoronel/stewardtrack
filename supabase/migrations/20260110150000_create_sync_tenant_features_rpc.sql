-- ============================================================================
-- RPC Function: sync_tenant_subscription_features
-- ============================================================================
-- Syncs a tenant's feature grants with their product subscription offering.
-- This ensures the tenant has all features included in their product offering,
-- including any newly added features.
--
-- Returns:
--   - features_added: Number of new features granted
--   - features_already_granted: Number of features that were already present
--   - permissions_deployed: Number of new permissions created
--   - role_assignments_created: Number of role-permission assignments created
-- ============================================================================

CREATE OR REPLACE FUNCTION sync_tenant_subscription_features(
  p_tenant_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_offering_id UUID;
  v_offering_tier TEXT;
  v_features_added INT := 0;
  v_features_already_granted INT := 0;
  v_permissions_deployed INT := 0;
  v_role_assignments_created INT := 0;
  v_feature RECORD;
  v_permission RECORD;
  v_role RECORD;
  v_template RECORD;
  v_new_permission_id UUID;
  v_result JSONB;
BEGIN
  -- ===== Step 1: Get tenant's current subscription offering =====
  SELECT subscription_offering_id, subscription_tier
  INTO v_offering_id, v_offering_tier
  FROM tenants
  WHERE id = p_tenant_id;

  IF v_offering_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Tenant has no subscription offering',
      'features_added', 0,
      'features_already_granted', 0,
      'permissions_deployed', 0,
      'role_assignments_created', 0
    );
  END IF;

  -- ===== Step 2: Get all features from the offering (direct + bundles) =====
  -- and sync them to tenant_feature_grants
  FOR v_feature IN
    SELECT DISTINCT fc.id AS feature_id, fc.code AS feature_code
    FROM product_offering_features pof
    JOIN feature_catalog fc ON fc.id = pof.feature_id
    WHERE pof.offering_id = v_offering_id
      AND fc.is_active = true
      AND fc.deleted_at IS NULL

    UNION

    -- Features from bundles included in the offering
    SELECT DISTINCT fc.id AS feature_id, fc.code AS feature_code
    FROM product_offering_bundles pob
    JOIN license_feature_bundle_items lfbi ON lfbi.bundle_id = pob.bundle_id
    JOIN feature_catalog fc ON fc.id = lfbi.feature_id
    WHERE pob.offering_id = v_offering_id
      AND fc.is_active = true
      AND fc.deleted_at IS NULL
  LOOP
    -- Check if feature is already granted
    IF EXISTS (
      SELECT 1 FROM tenant_feature_grants
      WHERE tenant_id = p_tenant_id
        AND feature_id = v_feature.feature_id
    ) THEN
      v_features_already_granted := v_features_already_granted + 1;
    ELSE
      -- Grant the feature
      INSERT INTO tenant_feature_grants (
        tenant_id,
        feature_id,
        grant_source,
        source_reference,
        starts_at,
        created_by
      ) VALUES (
        p_tenant_id,
        v_feature.feature_id,
        'package',
        'offering_' || v_offering_id::TEXT,
        CURRENT_DATE,
        NULL -- System operation
      )
      ON CONFLICT (tenant_id, feature_id, grant_source, COALESCE(package_id, '00000000-0000-0000-0000-000000000000'::UUID))
      DO NOTHING;

      v_features_added := v_features_added + 1;
    END IF;

    -- ===== Step 3: Deploy permissions for this feature =====
    FOR v_permission IN
      SELECT
        fp.permission_code,
        fp.display_name,
        fp.description,
        fp.category,
        fp.action,
        fp.id AS feature_permission_id
      FROM feature_permissions fp
      WHERE fp.feature_id = v_feature.feature_id
        AND fp.deleted_at IS NULL
    LOOP
      -- Check if permission already exists for this tenant
      IF NOT EXISTS (
        SELECT 1 FROM permissions
        WHERE tenant_id = p_tenant_id
          AND code = v_permission.permission_code
      ) THEN
        -- Create the permission
        INSERT INTO permissions (
          tenant_id,
          code,
          name,
          description,
          module,
          action,
          source,
          source_reference
        ) VALUES (
          p_tenant_id,
          v_permission.permission_code,
          v_permission.display_name,
          v_permission.description,
          v_permission.category,
          v_permission.action,
          'license_feature',
          v_feature.feature_id::TEXT
        )
        RETURNING id INTO v_new_permission_id;

        v_permissions_deployed := v_permissions_deployed + 1;

        -- ===== Step 4: Apply role templates for this permission =====
        FOR v_template IN
          SELECT prt.role_metadata_key
          FROM permission_role_templates prt
          WHERE prt.feature_permission_id = v_permission.feature_permission_id
        LOOP
          -- Find matching role in tenant
          FOR v_role IN
            SELECT id FROM roles
            WHERE tenant_id = p_tenant_id
              AND metadata_key = v_template.role_metadata_key
              AND deleted_at IS NULL
          LOOP
            -- Create role-permission assignment if not exists
            IF NOT EXISTS (
              SELECT 1 FROM role_permissions
              WHERE role_id = v_role.id
                AND permission_id = v_new_permission_id
                AND tenant_id = p_tenant_id
            ) THEN
              INSERT INTO role_permissions (
                role_id,
                permission_id,
                tenant_id
              ) VALUES (
                v_role.id,
                v_new_permission_id,
                p_tenant_id
              )
              ON CONFLICT DO NOTHING;

              v_role_assignments_created := v_role_assignments_created + 1;
            END IF;
          END LOOP;
        END LOOP;
      END IF;
    END LOOP;
  END LOOP;

  -- ===== Step 5: Return summary =====
  RETURN jsonb_build_object(
    'success', true,
    'offering_id', v_offering_id,
    'offering_tier', v_offering_tier,
    'features_added', v_features_added,
    'features_already_granted', v_features_already_granted,
    'permissions_deployed', v_permissions_deployed,
    'role_assignments_created', v_role_assignments_created
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM,
      'features_added', v_features_added,
      'features_already_granted', v_features_already_granted,
      'permissions_deployed', v_permissions_deployed,
      'role_assignments_created', v_role_assignments_created
    );
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION sync_tenant_subscription_features(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION sync_tenant_subscription_features(UUID) TO service_role;

-- Add comment
COMMENT ON FUNCTION sync_tenant_subscription_features IS
'Syncs a tenant''s feature grants and permissions with their product subscription offering.
Ensures the tenant has all features included in their offering, including newly added ones.';

-- Notify success
DO $$
BEGIN
  RAISE NOTICE 'Created sync_tenant_subscription_features RPC function';
END $$;
