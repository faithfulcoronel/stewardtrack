/*
  # RBAC Data Migration and Validation - FIXED FOR SUPABASE

  This migration provides scripts to validate tenant isolation,
  backfill data, and ensure the new RBAC system is working correctly.
  Modified to work within Supabase's managed PostgreSQL constraints.
*/

-- Function to validate tenant isolation across all RBAC tables
CREATE OR REPLACE FUNCTION validate_rbac_tenant_isolation()
RETURNS TABLE (
  table_name text,
  issue_type text,
  issue_count bigint,
  sample_records jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Roles missing tenant
  RETURN QUERY
  SELECT
    'roles'::text AS table_name,
    'missing_tenant_id'::text AS issue_type,
    COUNT(*) AS issue_count,
    (
      SELECT jsonb_agg(
               jsonb_build_object('id', sample.id, 'name', sample.name)
               ORDER BY sample.created_at
             )
      FROM (
        SELECT r.id, r.name, r.created_at
        FROM roles r
        WHERE r.tenant_id IS NULL
        ORDER BY r.created_at
        LIMIT 5
      ) sample
    ) AS sample_records
  FROM roles r
  WHERE r.tenant_id IS NULL
  GROUP BY 1, 2
  HAVING COUNT(*) > 0;

  -- Permissions missing tenant
  RETURN QUERY
  SELECT
    'permissions'::text,
    'missing_tenant_id'::text,
    COUNT(*),
    (
      SELECT jsonb_agg(
               jsonb_build_object('id', sample.id, 'code', sample.code)
               ORDER BY sample.created_at
             )
      FROM (
        SELECT p.id, p.code, p.created_at
        FROM permissions p
        WHERE p.tenant_id IS NULL
        ORDER BY p.created_at
        LIMIT 5
      ) sample
    )
  FROM permissions p
  WHERE p.tenant_id IS NULL
  GROUP BY 1, 2
  HAVING COUNT(*) > 0;

  -- User role tenant mismatches
  RETURN QUERY
  SELECT
    'user_roles'::text,
    'tenant_mismatch'::text,
    COUNT(*),
    (
      SELECT jsonb_agg(
               jsonb_build_object(
                 'id', sample.id,
                 'user_id', sample.user_id,
                 'role_tenant', sample.role_tenant,
                 'ur_tenant', sample.ur_tenant
               )
               ORDER BY sample.created_at
             )
      FROM (
        SELECT
          ur.id,
          ur.user_id,
          r.tenant_id AS role_tenant,
          ur.tenant_id AS ur_tenant,
          ur.created_at
        FROM user_roles ur
        JOIN roles r ON ur.role_id = r.id
        WHERE ur.tenant_id IS DISTINCT FROM r.tenant_id
        ORDER BY ur.created_at
        LIMIT 5
      ) sample
    )
  FROM user_roles ur
  JOIN roles r ON ur.role_id = r.id
  WHERE ur.tenant_id IS DISTINCT FROM r.tenant_id
  GROUP BY 1, 2
  HAVING COUNT(*) > 0;

  -- Role permission tenant mismatches
  RETURN QUERY
  SELECT
    'role_permissions'::text,
    'tenant_mismatch'::text,
    COUNT(*),
    (
      SELECT jsonb_agg(
               jsonb_build_object(
                 'id', sample.id,
                 'role_tenant', sample.role_tenant,
                 'perm_tenant', sample.perm_tenant,
                 'rp_tenant', sample.rp_tenant
               )
               ORDER BY sample.created_at
             )
      FROM (
        SELECT
          rp.id,
          r.tenant_id AS role_tenant,
          p.tenant_id AS perm_tenant,
          rp.tenant_id AS rp_tenant,
          rp.created_at
        FROM role_permissions rp
        JOIN roles r ON rp.role_id = r.id
        JOIN permissions p ON rp.permission_id = p.id
        WHERE rp.tenant_id IS DISTINCT FROM r.tenant_id
           OR rp.tenant_id IS DISTINCT FROM p.tenant_id
        ORDER BY rp.created_at
        LIMIT 5
      ) sample
    )
  FROM role_permissions rp
  JOIN roles r ON rp.role_id = r.id
  JOIN permissions p ON rp.permission_id = p.id
  WHERE rp.tenant_id IS DISTINCT FROM r.tenant_id
     OR rp.tenant_id IS DISTINCT FROM p.tenant_id
  GROUP BY 1, 2
  HAVING COUNT(*) > 0;
END;
$$;

-- Function to backfill missing tenant_id values
CREATE OR REPLACE FUNCTION backfill_rbac_tenant_ids()
RETURNS TABLE (
  table_name text,
  operation text,
  affected_rows bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  updated_count bigint;
  duplicate_count bigint;
BEGIN
  -- Note: Working within Supabase's managed environment constraints
  RETURN QUERY SELECT 'system'::text, 'starting_backfill'::text, 1::bigint;

  -- Deduplicate role names per tenant before assigning tenant IDs
  WITH duplicate_roles AS (
    SELECT
      r.id,
      COALESCE(r.tenant_id, ur.ur_tenant_id) AS effective_tenant,
      r.name,
      r.created_at,
      ROW_NUMBER() OVER (
        PARTITION BY COALESCE(r.tenant_id, ur.ur_tenant_id), r.name
        ORDER BY r.created_at, r.id
      ) AS rn
    FROM roles r
    LEFT JOIN LATERAL (
      SELECT ur_inner.tenant_id AS ur_tenant_id
      FROM user_roles ur_inner
      WHERE ur_inner.role_id = r.id
        AND ur_inner.tenant_id IS NOT NULL
      ORDER BY ur_inner.created_at
      LIMIT 1
    ) ur ON true
    WHERE COALESCE(r.tenant_id, ur.ur_tenant_id) IS NOT NULL
  )
  UPDATE roles r
  SET name = r.name || ' (' || (dr.rn - 1)::text || ')',
      updated_at = now()
  FROM duplicate_roles dr
  WHERE dr.id = r.id
    AND dr.rn > 1;

  GET DIAGNOSTICS updated_count = ROW_COUNT;
  IF updated_count > 0 THEN
    RETURN QUERY SELECT 'roles'::text, 'dedupe_role_names'::text, updated_count;
  END IF;

  -- Resolve existing permission code duplicates per tenant
  WITH existing_perm_dupes AS (
    SELECT
      p.id,
      p.tenant_id,
      ROW_NUMBER() OVER (
        PARTITION BY p.tenant_id, p.code
        ORDER BY p.created_at, p.id
      ) AS rn
    FROM permissions p
    WHERE p.tenant_id IS NOT NULL
  )
  UPDATE permissions AS p
  SET code = p.code || ' (' || (epd.rn - 1)::text || ')',
      updated_at = now()
  FROM existing_perm_dupes epd
  WHERE p.id = epd.id
    AND epd.rn > 1;

  GET DIAGNOSTICS updated_count = ROW_COUNT;
  IF updated_count > 0 THEN
    RETURN QUERY SELECT 'permissions'::text, 'dedupe_existing_codes'::text, updated_count;
  END IF;

  -- Backfill roles tenant_id from related user_roles
  UPDATE roles r
  SET tenant_id = ur_data.ur_tenant_id,
      updated_at = now()
  FROM (
    SELECT DISTINCT ur_inner.role_id, ur_inner.tenant_id AS ur_tenant_id
    FROM user_roles ur_inner
    WHERE ur_inner.tenant_id IS NOT NULL
  ) ur_data
  WHERE r.id = ur_data.role_id
    AND r.tenant_id IS NULL;

  GET DIAGNOSTICS updated_count = ROW_COUNT;
  IF updated_count > 0 THEN
    RETURN QUERY SELECT 'roles'::text, 'backfill_tenant_id'::text, updated_count;
  END IF;

  -- Backfill permissions tenant_id from related role_permissions
  WITH assignment_candidates AS (
    SELECT
      perm.permission_id,
      perm.target_tenant,
      perm.code,
      perm.created_at,
      -- Check if this code already exists in the target tenant
      CASE 
        WHEN EXISTS (
          SELECT 1 FROM permissions existing_p 
          WHERE existing_p.tenant_id = perm.target_tenant 
            AND existing_p.code = perm.code 
            AND existing_p.id != perm.permission_id
        ) THEN false
        ELSE true
      END AS can_assign,
      ROW_NUMBER() OVER (
        PARTITION BY perm.target_tenant, perm.code
        ORDER BY perm.created_at, perm.permission_id
      ) AS rn
    FROM (
      SELECT DISTINCT
        p.id AS permission_id,
        r.tenant_id AS target_tenant,
        p.code,
        p.created_at
      FROM permissions p
      JOIN role_permissions rp ON rp.permission_id = p.id
      JOIN roles r ON rp.role_id = r.id
      WHERE p.tenant_id IS NULL
        AND r.tenant_id IS NOT NULL
    ) perm
  )
  UPDATE permissions AS p
  SET tenant_id = ac.target_tenant,
      updated_at = now()
  FROM assignment_candidates ac
  WHERE p.id = ac.permission_id
    AND ac.rn = 1
    AND ac.can_assign = true
    AND p.tenant_id IS NULL;

  GET DIAGNOSTICS updated_count = ROW_COUNT;
  IF updated_count > 0 THEN
    RETURN QUERY SELECT 'permissions'::text, 'backfill_tenant_id'::text, updated_count;
  END IF;

  -- Handle permissions that couldn't be assigned due to code conflicts
  WITH conflicting_permissions AS (
    SELECT DISTINCT
      p.id AS permission_id,
      r.tenant_id AS target_tenant,
      p.code,
      p.created_at
    FROM permissions p
    JOIN role_permissions rp ON rp.permission_id = p.id
    JOIN roles r ON rp.role_id = r.id
    WHERE p.tenant_id IS NULL
      AND r.tenant_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM permissions existing_p 
        WHERE existing_p.tenant_id = r.tenant_id 
          AND existing_p.code = p.code
      )
  ),
  numbered_conflicts AS (
    SELECT 
      cp.*,
      ROW_NUMBER() OVER (
        PARTITION BY cp.target_tenant, cp.code
        ORDER BY cp.created_at, cp.permission_id
      ) AS conflict_num
    FROM conflicting_permissions cp
  )
  UPDATE permissions AS p
  SET code = p.code || '_duplicate_' || nc.conflict_num::text,
      tenant_id = nc.target_tenant,
      updated_at = now()
  FROM numbered_conflicts nc
  WHERE p.id = nc.permission_id
    AND p.tenant_id IS NULL;

  GET DIAGNOSTICS updated_count = ROW_COUNT;
  IF updated_count > 0 THEN
    RETURN QUERY SELECT 'permissions'::text, 'resolve_code_conflicts'::text, updated_count;
  END IF;

  -- Backfill role_permissions tenant_id
  UPDATE role_permissions rp
  SET tenant_id = r.tenant_id
  FROM roles r
  WHERE rp.role_id = r.id
    AND rp.tenant_id IS NULL
    AND r.tenant_id IS NOT NULL;

  GET DIAGNOSTICS updated_count = ROW_COUNT;
  IF updated_count > 0 THEN
    RETURN QUERY SELECT 'role_permissions'::text, 'backfill_tenant_id'::text, updated_count;
  END IF;

  -- Clean up orphaned role_permissions
  DELETE FROM role_permissions rp
  WHERE NOT EXISTS (
    SELECT 1 FROM roles r
    WHERE r.id = rp.role_id
      AND r.tenant_id = rp.tenant_id
  );

  GET DIAGNOSTICS updated_count = ROW_COUNT;
  IF updated_count > 0 THEN
    RETURN QUERY SELECT 'role_permissions'::text, 'cleanup_orphaned'::text, updated_count;
  END IF;

  RETURN QUERY SELECT 'system'::text, 'backfill_completed'::text, 1::bigint;
END;
$$;

-- Function to create default metadata bindings for existing roles
CREATE OR REPLACE FUNCTION create_default_metadata_bindings()
RETURNS TABLE (
  current_tenant_id uuid,
  operation text,
  created_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  tenant_record RECORD;
  binding_count bigint;
BEGIN
  FOR tenant_record IN SELECT * FROM tenants LOOP
    UPDATE roles AS r
    SET metadata_key = CASE
      WHEN r.name ILIKE '%admin%' THEN 'admin'
      WHEN r.name ILIKE '%manager%' THEN 'manager'
      WHEN r.name ILIKE '%user%' THEN 'user'
      WHEN r.name ILIKE '%viewer%' OR r.name ILIKE '%readonly%' THEN 'viewer'
      WHEN r.name ILIKE '%moderator%' THEN 'moderator'
      WHEN r.name ILIKE '%treasurer%' THEN 'treasurer'
      ELSE LOWER(REGEXP_REPLACE(r.name, '[^a-zA-Z0-9]', '_', 'g'))
    END,
    updated_at = now()
    WHERE r.tenant_id = tenant_record.id
      AND r.metadata_key IS NULL;
    
    GET DIAGNOSTICS binding_count = ROW_COUNT;
    IF binding_count > 0 THEN
      RETURN QUERY SELECT tenant_record.id, 'create_role_metadata_keys'::text, binding_count;
    END IF;
  END LOOP;
END;
$$;

-- Function to create sample permission bundles for tenants
CREATE OR REPLACE FUNCTION create_sample_permission_bundles(input_tenant_uuid uuid)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  bundle_count bigint := 0;
  admin_bundle_id uuid;
  manager_bundle_id uuid;
  user_bundle_id uuid;
  viewer_bundle_id uuid;
  tenant_creator_id uuid;
BEGIN
  -- Get the tenant creator ID
  SELECT t.created_by INTO tenant_creator_id FROM tenants t WHERE t.id = input_tenant_uuid;
  
  -- Create admin bundle
  INSERT INTO permission_bundles (
    tenant_id, code, name, description, metadata_key, created_by, updated_by
  ) VALUES (
    input_tenant_uuid, 'admin_full', 'Full Administrator', 'Complete administrative access',
    'admin', tenant_creator_id, tenant_creator_id
  ) RETURNING id INTO admin_bundle_id;

  -- Create manager bundle
  INSERT INTO permission_bundles (
    tenant_id, code, name, description, metadata_key, created_by, updated_by
  ) VALUES (
    input_tenant_uuid, 'manager_standard', 'Standard Manager', 'Standard management permissions',
    'manager', tenant_creator_id, tenant_creator_id
  ) RETURNING id INTO manager_bundle_id;

  -- Create user bundle
  INSERT INTO permission_bundles (
    tenant_id, code, name, description, metadata_key, created_by, updated_by
  ) VALUES (
    input_tenant_uuid, 'user_standard', 'Standard User', 'Standard user permissions',
    'user', tenant_creator_id, tenant_creator_id
  ) RETURNING id INTO user_bundle_id;

  -- Create viewer bundle
  INSERT INTO permission_bundles (
    tenant_id, code, name, description, metadata_key, created_by, updated_by
  ) VALUES (
    input_tenant_uuid, 'viewer_readonly', 'Read Only Viewer', 'View-only permissions',
    'viewer', tenant_creator_id, tenant_creator_id
  ) RETURNING id INTO viewer_bundle_id;

  bundle_count := 4;

  -- Add permissions to admin bundle (all permissions)
  INSERT INTO bundle_permissions (tenant_id, bundle_id, permission_id)
  SELECT input_tenant_uuid, admin_bundle_id, p.id
  FROM permissions p
  WHERE p.tenant_id = input_tenant_uuid
    AND NOT EXISTS (
      SELECT 1 FROM bundle_permissions bp
      WHERE bp.tenant_id = input_tenant_uuid
        AND bp.bundle_id = admin_bundle_id
        AND bp.permission_id = p.id
    );

  RETURN bundle_count;
END;
$$;

-- Function to run complete RBAC validation and report
CREATE OR REPLACE FUNCTION run_rbac_validation_report()
RETURNS TABLE (
  check_type text,
  status text,
  details jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  total_tenants bigint;
  total_users bigint;
  total_roles bigint;
  total_permissions bigint;
  materialized_view_rows bigint;
  validation_issues bigint;
BEGIN
  -- Basic statistics
  SELECT COUNT(*) INTO total_tenants FROM tenants;
  SELECT COUNT(DISTINCT tu.user_id) INTO total_users FROM tenant_users tu;
  SELECT COUNT(*) INTO total_roles FROM roles r WHERE r.tenant_id IS NOT NULL;
  SELECT COUNT(*) INTO total_permissions FROM permissions p WHERE p.tenant_id IS NOT NULL;
  
  -- Safely get materialized view stats without triggering refresh
  BEGIN
    SELECT COUNT(*) INTO materialized_view_rows FROM tenant_user_effective_permissions;
  EXCEPTION
    WHEN others THEN
      materialized_view_rows := 0;
  END;

  RETURN QUERY SELECT
    'system_overview'::text,
    'info'::text,
    jsonb_build_object(
      'tenants', total_tenants,
      'users', total_users,
      'roles', total_roles,
      'permissions', total_permissions,
      'materialized_view_rows', materialized_view_rows
    );

  -- Count validation issues
  SELECT COUNT(*) INTO validation_issues
  FROM validate_rbac_tenant_isolation();

  RETURN QUERY SELECT
    'tenant_isolation'::text,
    CASE WHEN validation_issues = 0 THEN 'healthy' ELSE 'issues_found' END,
    jsonb_build_object(
      'total_issues', validation_issues
    );

  -- Check materialized view health
  RETURN QUERY SELECT
    'materialized_view_health'::text,
    CASE
      WHEN materialized_view_rows = 0 THEN 'error'
      WHEN materialized_view_rows < (total_users * 2) THEN 'warning'
      ELSE 'healthy'
    END,
    jsonb_build_object(
      'rows', materialized_view_rows,
      'expected_minimum', total_users * 2
    );
END;
$$;

-- Execute the migration steps
SELECT 'Running initial RBAC backfill...' as status;
SELECT * FROM backfill_rbac_tenant_ids();

SELECT 'Creating default metadata bindings...' as status;
SELECT * FROM create_default_metadata_bindings();

SELECT 'Running validation report...' as status;
SELECT * FROM run_rbac_validation_report();

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION validate_rbac_tenant_isolation() TO authenticated;
GRANT EXECUTE ON FUNCTION backfill_rbac_tenant_ids() TO authenticated;
GRANT EXECUTE ON FUNCTION create_default_metadata_bindings() TO authenticated;
GRANT EXECUTE ON FUNCTION create_sample_permission_bundles(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION run_rbac_validation_report() TO authenticated;

-- Comments for documentation
COMMENT ON FUNCTION validate_rbac_tenant_isolation() IS
  'Validates tenant isolation across all RBAC tables and identifies issues.';
COMMENT ON FUNCTION backfill_rbac_tenant_ids() IS
  'Backfills missing tenant_id values and fixes tenant mismatches.';
COMMENT ON FUNCTION run_rbac_validation_report() IS
  'Runs comprehensive validation and returns health report for the RBAC system.';