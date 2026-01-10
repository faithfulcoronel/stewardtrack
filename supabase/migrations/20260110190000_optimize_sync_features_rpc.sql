-- ============================================================================
-- RPC Function: sync_tenant_subscription_features (v4 - Optimized)
-- ============================================================================
-- Optimized version that uses batch operations to avoid statement timeout.
-- Uses INSERT ... ON CONFLICT for idempotent batch inserts.
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

  -- ===== Step 2: Batch insert feature grants =====
  -- Count existing grants first
  SELECT COUNT(*) INTO v_features_already_granted
  FROM tenant_feature_grants tfg
  WHERE tfg.tenant_id = p_tenant_id
    AND tfg.feature_id IN (
      SELECT fc.id
      FROM product_offering_features pof
      JOIN feature_catalog fc ON fc.id = pof.feature_id
      WHERE pof.offering_id = v_offering_id
        AND fc.is_active = true
        AND fc.deleted_at IS NULL
      UNION
      SELECT fc.id
      FROM product_offering_bundles pob
      JOIN license_feature_bundle_items lfbi ON lfbi.bundle_id = pob.bundle_id
      JOIN feature_catalog fc ON fc.id = lfbi.feature_id
      WHERE pob.offering_id = v_offering_id
        AND fc.is_active = true
        AND fc.deleted_at IS NULL
    );

  -- Batch insert new feature grants
  WITH offering_features AS (
    SELECT DISTINCT fc.id AS feature_id
    FROM product_offering_features pof
    JOIN feature_catalog fc ON fc.id = pof.feature_id
    WHERE pof.offering_id = v_offering_id
      AND fc.is_active = true
      AND fc.deleted_at IS NULL
    UNION
    SELECT DISTINCT fc.id AS feature_id
    FROM product_offering_bundles pob
    JOIN license_feature_bundle_items lfbi ON lfbi.bundle_id = pob.bundle_id
    JOIN feature_catalog fc ON fc.id = lfbi.feature_id
    WHERE pob.offering_id = v_offering_id
      AND fc.is_active = true
      AND fc.deleted_at IS NULL
  ),
  inserted AS (
    INSERT INTO tenant_feature_grants (tenant_id, feature_id, grant_source, source_reference, starts_at)
    SELECT p_tenant_id, of.feature_id, 'package', 'offering_' || v_offering_id::TEXT, CURRENT_DATE
    FROM offering_features of
    WHERE NOT EXISTS (
      SELECT 1 FROM tenant_feature_grants tfg
      WHERE tfg.tenant_id = p_tenant_id AND tfg.feature_id = of.feature_id
    )
    ON CONFLICT (tenant_id, feature_id, grant_source, COALESCE(package_id, '00000000-0000-0000-0000-000000000000'::UUID))
    DO NOTHING
    RETURNING 1
  )
  SELECT COUNT(*) INTO v_features_added FROM inserted;

  -- ===== Step 3: Count existing permissions =====
  SELECT COUNT(*) INTO v_permissions_already_exist
  FROM permissions p
  WHERE p.tenant_id = p_tenant_id
    AND p.code IN (
      SELECT fp.permission_code
      FROM feature_permissions fp
      JOIN tenant_feature_grants tfg ON tfg.feature_id = fp.feature_id
      WHERE tfg.tenant_id = p_tenant_id
    );

  -- ===== Step 4: Batch insert new permissions =====
  WITH needed_permissions AS (
    SELECT DISTINCT
      fp.permission_code,
      fp.display_name,
      fp.description,
      fp.category,
      fp.action,
      fp.feature_id,
      fp.id AS feature_permission_id
    FROM feature_permissions fp
    JOIN tenant_feature_grants tfg ON tfg.feature_id = fp.feature_id
    WHERE tfg.tenant_id = p_tenant_id
      AND NOT EXISTS (
        SELECT 1 FROM permissions p
        WHERE p.tenant_id = p_tenant_id AND p.code = fp.permission_code
      )
  ),
  inserted_perms AS (
    INSERT INTO permissions (tenant_id, code, name, description, module, action, is_active, source, source_reference)
    SELECT
      p_tenant_id,
      np.permission_code,
      np.display_name,
      np.description,
      np.category,
      COALESCE(np.action, 'execute'),
      true,
      'license_feature',
      np.feature_id::TEXT
    FROM needed_permissions np
    ON CONFLICT (tenant_id, code) DO NOTHING
    RETURNING 1
  )
  SELECT COUNT(*) INTO v_permissions_deployed FROM inserted_perms;

  -- ===== Step 5: Ensure required roles exist =====
  -- Get unique role keys from templates for tenant's features
  WITH needed_roles AS (
    SELECT DISTINCT
      CASE WHEN prt.role_key LIKE 'role_%' THEN prt.role_key ELSE 'role_' || prt.role_key END AS metadata_key,
      prt.role_key
    FROM permission_role_templates prt
    JOIN feature_permissions fp ON fp.id = prt.feature_permission_id
    JOIN tenant_feature_grants tfg ON tfg.feature_id = fp.feature_id
    WHERE tfg.tenant_id = p_tenant_id
      AND NOT EXISTS (
        SELECT 1 FROM roles r
        WHERE r.tenant_id = p_tenant_id
          AND r.metadata_key = CASE WHEN prt.role_key LIKE 'role_%' THEN prt.role_key ELSE 'role_' || prt.role_key END
          AND r.deleted_at IS NULL
      )
  ),
  inserted_roles AS (
    INSERT INTO roles (tenant_id, name, description, scope, metadata_key, is_delegatable)
    SELECT
      p_tenant_id,
      CASE nr.role_key
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
        ELSE INITCAP(REPLACE(nr.role_key, '_', ' '))
      END,
      CASE nr.role_key
        WHEN 'tenant_admin' THEN 'Full administrative access to the organization'
        WHEN 'staff' THEN 'Staff member with elevated access'
        WHEN 'volunteer' THEN 'Volunteer with limited access'
        WHEN 'member' THEN 'Church member with basic access'
        ELSE 'Auto-created role for ' || nr.role_key
      END,
      CASE nr.role_key
        WHEN 'tenant_admin' THEN 'tenant'
        WHEN 'ministry_leader' THEN 'delegated'
        WHEN 'group_leader' THEN 'delegated'
        ELSE 'tenant'
      END,
      nr.metadata_key,
      CASE nr.role_key WHEN 'tenant_admin' THEN true WHEN 'staff' THEN true ELSE false END
    FROM needed_roles nr
    ON CONFLICT (tenant_id, name) DO NOTHING
    RETURNING 1
  )
  SELECT COUNT(*) INTO v_roles_created FROM inserted_roles;

  -- Also ensure tenant_admin exists (for fallback)
  IF NOT EXISTS (
    SELECT 1 FROM roles WHERE tenant_id = p_tenant_id AND metadata_key = 'role_tenant_admin' AND deleted_at IS NULL
  ) THEN
    INSERT INTO roles (tenant_id, name, description, scope, metadata_key, is_delegatable)
    VALUES (p_tenant_id, 'Tenant Administrator', 'Full administrative access to the organization', 'tenant', 'role_tenant_admin', true)
    ON CONFLICT (tenant_id, name) DO NOTHING;
    v_roles_created := v_roles_created + 1;
  END IF;

  -- ===== Step 6: Batch insert role-permission assignments =====
  -- Assignments based on templates
  WITH template_assignments AS (
    SELECT DISTINCT
      r.id AS role_id,
      p.id AS permission_id,
      p_tenant_id AS tenant_id
    FROM permission_role_templates prt
    JOIN feature_permissions fp ON fp.id = prt.feature_permission_id
    JOIN tenant_feature_grants tfg ON tfg.feature_id = fp.feature_id
    JOIN permissions p ON p.tenant_id = p_tenant_id AND p.code = fp.permission_code
    JOIN roles r ON r.tenant_id = p_tenant_id
      AND r.metadata_key = CASE WHEN prt.role_key LIKE 'role_%' THEN prt.role_key ELSE 'role_' || prt.role_key END
      AND r.deleted_at IS NULL
    WHERE tfg.tenant_id = p_tenant_id
      AND NOT EXISTS (
        SELECT 1 FROM role_permissions rp
        WHERE rp.role_id = r.id AND rp.permission_id = p.id AND rp.tenant_id = p_tenant_id
      )
  ),
  -- Fallback assignments for permissions without templates (assign to tenant_admin)
  fallback_assignments AS (
    SELECT DISTINCT
      r.id AS role_id,
      p.id AS permission_id,
      p_tenant_id AS tenant_id
    FROM permissions p
    JOIN feature_permissions fp ON fp.permission_code = p.code
    JOIN tenant_feature_grants tfg ON tfg.feature_id = fp.feature_id
    JOIN roles r ON r.tenant_id = p_tenant_id AND r.metadata_key = 'role_tenant_admin' AND r.deleted_at IS NULL
    WHERE p.tenant_id = p_tenant_id
      AND tfg.tenant_id = p_tenant_id
      AND NOT EXISTS (
        SELECT 1 FROM permission_role_templates prt WHERE prt.feature_permission_id = fp.id
      )
      AND NOT EXISTS (
        SELECT 1 FROM role_permissions rp WHERE rp.permission_id = p.id AND rp.tenant_id = p_tenant_id
      )
  ),
  all_assignments AS (
    SELECT * FROM template_assignments
    UNION
    SELECT * FROM fallback_assignments
  ),
  inserted_assignments AS (
    INSERT INTO role_permissions (role_id, permission_id, tenant_id)
    SELECT role_id, permission_id, tenant_id FROM all_assignments
    ON CONFLICT DO NOTHING
    RETURNING 1
  )
  SELECT COUNT(*) INTO v_role_assignments_created FROM inserted_assignments;

  -- ===== Step 7: Return summary =====
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
  RAISE NOTICE 'Optimized sync_tenant_subscription_features with batch operations';
END $$;
