-- ============================================================================
-- RPC Function: sync_tenant_subscription_features (v3)
-- ============================================================================
-- Updated to be consistent with PermissionDeploymentService registration flow:
-- 1. Converts role_key to metadata_key with 'role_' prefix
-- 2. Creates roles if they don't exist
-- 3. Falls back to tenant_admin if no templates exist
-- 4. Also deploys permissions for features that were already granted
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
  v_permissions_already_exist INT := 0;
  v_role_assignments_created INT := 0;
  v_roles_created INT := 0;
  v_feature RECORD;
  v_permission RECORD;
  v_role RECORD;
  v_template RECORD;
  v_new_permission_id UUID;
  v_existing_permission_id UUID;
  v_role_id UUID;
  v_metadata_key TEXT;
  v_has_templates BOOLEAN;
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
      'permissions_already_exist', 0,
      'role_assignments_created', 0,
      'roles_created', 0
    );
  END IF;

  -- ===== Step 2: Get all features from the offering (direct + bundles) =====
  FOR v_feature IN
    SELECT DISTINCT fc.id AS feature_id, fc.code AS feature_code, fc.name AS feature_name
    FROM product_offering_features pof
    JOIN feature_catalog fc ON fc.id = pof.feature_id
    WHERE pof.offering_id = v_offering_id
      AND fc.is_active = true
      AND fc.deleted_at IS NULL

    UNION

    -- Features from bundles included in the offering
    SELECT DISTINCT fc.id AS feature_id, fc.code AS feature_code, fc.name AS feature_name
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
        NULL
      )
      ON CONFLICT (tenant_id, feature_id, grant_source, COALESCE(package_id, '00000000-0000-0000-0000-000000000000'::UUID))
      DO NOTHING;

      v_features_added := v_features_added + 1;
    END IF;

    -- ===== Step 3: Deploy permissions for this feature =====
    -- (Always deploy permissions, even for already-granted features, to ensure consistency)
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
    LOOP
      -- Check if permission already exists for this tenant
      SELECT id INTO v_existing_permission_id
      FROM permissions
      WHERE tenant_id = p_tenant_id
        AND code = v_permission.permission_code;

      IF v_existing_permission_id IS NOT NULL THEN
        -- Permission exists, use it for role assignments
        v_new_permission_id := v_existing_permission_id;
        v_permissions_already_exist := v_permissions_already_exist + 1;
      ELSE
        -- Create the permission (consistent with PermissionDeploymentService)
        INSERT INTO permissions (
          tenant_id,
          code,
          name,
          description,
          module,
          action,
          is_active,
          source,
          source_reference
        ) VALUES (
          p_tenant_id,
          v_permission.permission_code,
          v_permission.display_name,
          v_permission.description,
          v_permission.category,
          COALESCE(v_permission.action, 'execute'),
          true,
          'license_feature',
          v_feature.feature_id::TEXT
        )
        RETURNING id INTO v_new_permission_id;

        v_permissions_deployed := v_permissions_deployed + 1;
      END IF;

      -- ===== Step 4: Apply role templates for this permission =====
      -- Check if any templates exist
      SELECT EXISTS (
        SELECT 1 FROM permission_role_templates prt
        WHERE prt.feature_permission_id = v_permission.feature_permission_id
      ) INTO v_has_templates;

      IF v_has_templates THEN
        -- Apply templates
        FOR v_template IN
          SELECT prt.role_key
          FROM permission_role_templates prt
          WHERE prt.feature_permission_id = v_permission.feature_permission_id
        LOOP
          -- Convert role_key to metadata_key (consistent with PermissionDeploymentService)
          -- Template role_key is like 'tenant_admin', metadata_key is like 'role_tenant_admin'
          IF v_template.role_key LIKE 'role_%' THEN
            v_metadata_key := v_template.role_key;
          ELSE
            v_metadata_key := 'role_' || v_template.role_key;
          END IF;

          -- Find or create role
          SELECT id INTO v_role_id
          FROM roles
          WHERE tenant_id = p_tenant_id
            AND metadata_key = v_metadata_key
            AND deleted_at IS NULL;

          IF v_role_id IS NULL THEN
            -- Create the role (consistent with getRoleConfigForKey in PermissionDeploymentService)
            INSERT INTO roles (
              tenant_id,
              name,
              description,
              scope,
              metadata_key,
              is_delegatable
            ) VALUES (
              p_tenant_id,
              CASE v_template.role_key
                WHEN 'tenant_admin' THEN 'Tenant Administrator'
                WHEN 'staff' THEN 'Staff'
                WHEN 'volunteer' THEN 'Volunteer'
                WHEN 'member' THEN 'Member'
                WHEN 'finance_admin' THEN 'Finance Administrator'
                WHEN 'ministry_leader' THEN 'Ministry Leader'
                WHEN 'group_leader' THEN 'Group Leader'
                WHEN 'event_coordinator' THEN 'Event Coordinator'
                WHEN 'care_coordinator' THEN 'Care Coordinator'
                WHEN 'scheduler_admin' THEN 'Scheduler Administrator'
                ELSE INITCAP(REPLACE(v_template.role_key, '_', ' '))
              END,
              CASE v_template.role_key
                WHEN 'tenant_admin' THEN 'Full administrative access to the organization'
                WHEN 'staff' THEN 'Staff member with elevated access'
                WHEN 'volunteer' THEN 'Volunteer with limited access'
                WHEN 'member' THEN 'Church member with basic access'
                WHEN 'finance_admin' THEN 'Manages financial operations'
                WHEN 'ministry_leader' THEN 'Leads and manages a ministry'
                WHEN 'group_leader' THEN 'Leads a small group'
                WHEN 'event_coordinator' THEN 'Coordinates events'
                WHEN 'care_coordinator' THEN 'Coordinates care plans'
                WHEN 'scheduler_admin' THEN 'Manages scheduling'
                ELSE 'Auto-created role for ' || v_template.role_key
              END,
              CASE v_template.role_key
                WHEN 'tenant_admin' THEN 'tenant'
                WHEN 'ministry_leader' THEN 'delegated'
                WHEN 'group_leader' THEN 'delegated'
                WHEN 'event_coordinator' THEN 'delegated'
                WHEN 'care_coordinator' THEN 'delegated'
                ELSE 'tenant'
              END,
              v_metadata_key,
              CASE v_template.role_key
                WHEN 'tenant_admin' THEN true
                WHEN 'staff' THEN true
                ELSE false
              END
            )
            RETURNING id INTO v_role_id;

            v_roles_created := v_roles_created + 1;
          END IF;

          -- Create role-permission assignment if not exists
          IF NOT EXISTS (
            SELECT 1 FROM role_permissions
            WHERE role_id = v_role_id
              AND permission_id = v_new_permission_id
              AND tenant_id = p_tenant_id
          ) THEN
            INSERT INTO role_permissions (
              role_id,
              permission_id,
              tenant_id
            ) VALUES (
              v_role_id,
              v_new_permission_id,
              p_tenant_id
            )
            ON CONFLICT DO NOTHING;

            v_role_assignments_created := v_role_assignments_created + 1;
          END IF;
        END LOOP;
      ELSE
        -- ===== FALLBACK: No templates, assign to tenant_admin =====
        -- (Consistent with PermissionDeploymentService)
        v_metadata_key := 'role_tenant_admin';

        SELECT id INTO v_role_id
        FROM roles
        WHERE tenant_id = p_tenant_id
          AND metadata_key = v_metadata_key
          AND deleted_at IS NULL;

        IF v_role_id IS NULL THEN
          -- Create tenant_admin role
          INSERT INTO roles (
            tenant_id,
            name,
            description,
            scope,
            metadata_key,
            is_delegatable
          ) VALUES (
            p_tenant_id,
            'Tenant Administrator',
            'Full administrative access to the organization',
            'tenant',
            v_metadata_key,
            true
          )
          RETURNING id INTO v_role_id;

          v_roles_created := v_roles_created + 1;
        END IF;

        -- Create role-permission assignment if not exists
        IF NOT EXISTS (
          SELECT 1 FROM role_permissions
          WHERE role_id = v_role_id
            AND permission_id = v_new_permission_id
            AND tenant_id = p_tenant_id
        ) THEN
          INSERT INTO role_permissions (
            role_id,
            permission_id,
            tenant_id
          ) VALUES (
            v_role_id,
            v_new_permission_id,
            p_tenant_id
          )
          ON CONFLICT DO NOTHING;

          v_role_assignments_created := v_role_assignments_created + 1;
        END IF;
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
    'permissions_already_exist', v_permissions_already_exist,
    'role_assignments_created', v_role_assignments_created,
    'roles_created', v_roles_created
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM,
      'features_added', v_features_added,
      'features_already_granted', v_features_already_granted,
      'permissions_deployed', v_permissions_deployed,
      'permissions_already_exist', v_permissions_already_exist,
      'role_assignments_created', v_role_assignments_created,
      'roles_created', v_roles_created
    );
END;
$$;

-- Notify success
DO $$
BEGIN
  RAISE NOTICE 'Updated sync_tenant_subscription_features to be consistent with registration flow';
END $$;
