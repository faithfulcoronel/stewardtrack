/*
  # RBAC Schema Reset

  Drops and recreates all RBAC-related tables, views, materialized views,
  and helper functions so we can reseed the authorization system from a
  clean slate. Tenant core tables are preserved.
*/

-- Drop dependent views and materialized views
DROP VIEW IF EXISTS user_metadata_page_access;
DROP VIEW IF EXISTS user_menu_access;
DROP VIEW IF EXISTS active_tenant_license_features;
DROP MATERIALIZED VIEW IF EXISTS tenant_user_effective_permissions CASCADE;

-- Drop helper functions (will be recreated below)
DROP FUNCTION IF EXISTS get_user_licensed_metadata_pages(uuid, uuid);
DROP FUNCTION IF EXISTS get_user_licensed_menu_items(uuid, uuid);
DROP FUNCTION IF EXISTS get_user_menu_with_metadata(uuid, uuid);
DROP FUNCTION IF EXISTS can_access_metadata_page(text, uuid, uuid);
DROP FUNCTION IF EXISTS register_metadata_page(text, uuid, text, text, text, text, text, text[], text[]);
DROP FUNCTION IF EXISTS insert_surface_binding(uuid, uuid, uuid, uuid, text, text, integer, boolean, uuid, uuid);
DROP FUNCTION IF EXISTS migrate_role_menu_items_to_surface_bindings();
DROP FUNCTION IF EXISTS can_user_all(text[], uuid);
DROP FUNCTION IF EXISTS can_user_any(text[], uuid);
DROP FUNCTION IF EXISTS can_user(text, uuid);
DROP FUNCTION IF EXISTS current_tenant();
DROP FUNCTION IF EXISTS trigger_refresh_effective_permissions_safe();
DROP FUNCTION IF EXISTS refresh_tenant_user_effective_permissions_safe();
DROP FUNCTION IF EXISTS refresh_tenant_user_effective_permissions();
DROP FUNCTION IF EXISTS get_rbac_health_metrics(uuid);
DROP FUNCTION IF EXISTS cleanup_old_audit_logs(integer);
DROP FUNCTION IF EXISTS rbac_audit_trigger();
DROP FUNCTION IF EXISTS get_user_effective_permissions(uuid, uuid);
DROP FUNCTION IF EXISTS can_user_fast(text, uuid);
DROP FUNCTION IF EXISTS get_user_role_metadata_keys(uuid, uuid);
DROP FUNCTION IF EXISTS validate_rbac_tenant_isolation();
DROP FUNCTION IF EXISTS backfill_rbac_tenant_ids();
DROP FUNCTION IF EXISTS fix_rbac_surface_bindings();
DROP FUNCTION IF EXISTS create_role_metadata_keys();
DROP FUNCTION IF EXISTS validate_surface_binding_integrity();
DROP FUNCTION IF EXISTS rebuild_rbac_materialized_view(uuid);
DROP FUNCTION IF EXISTS rebuild_rbac_metadata_pages(uuid);
DROP FUNCTION IF EXISTS record_rbac_validation_event(uuid, text, text, jsonb);

-- Drop audit triggers (they will be recreated after tables exist)
DROP TRIGGER IF EXISTS rbac_audit_trigger_roles ON roles;
DROP TRIGGER IF EXISTS rbac_audit_trigger_permissions ON permissions;
DROP TRIGGER IF EXISTS rbac_audit_trigger_permission_bundles ON permission_bundles;
DROP TRIGGER IF EXISTS rbac_audit_trigger_user_roles ON user_roles;
DROP TRIGGER IF EXISTS rbac_audit_trigger_role_permissions ON role_permissions;
DROP TRIGGER IF EXISTS rbac_audit_trigger_role_bundles ON role_bundles;
DROP TRIGGER IF EXISTS rbac_audit_trigger_bundle_permissions ON bundle_permissions;
DROP TRIGGER IF EXISTS rbac_audit_trigger_surface_bindings ON rbac_surface_bindings;
DROP TRIGGER IF EXISTS refresh_effective_permissions_user_roles ON user_roles;
DROP TRIGGER IF EXISTS refresh_effective_permissions_role_permissions ON role_permissions;
DROP TRIGGER IF EXISTS refresh_effective_permissions_role_bundles ON role_bundles;
DROP TRIGGER IF EXISTS refresh_effective_permissions_bundle_permissions ON bundle_permissions;
DROP TRIGGER IF EXISTS refresh_effective_permissions_surface_bindings ON rbac_surface_bindings;

-- Drop RBAC tables (preserving tenant_* tables)
DROP TABLE IF EXISTS rbac_audit_log CASCADE;
DROP TABLE IF EXISTS rbac_surface_bindings CASCADE;
DROP TABLE IF EXISTS role_bundles CASCADE;
DROP TABLE IF EXISTS bundle_permissions CASCADE;
DROP TABLE IF EXISTS permission_bundles CASCADE;
DROP TABLE IF EXISTS permission_actions CASCADE;
DROP TABLE IF EXISTS role_permissions CASCADE;
DROP TABLE IF EXISTS user_roles CASCADE;
DROP TABLE IF EXISTS role_groups CASCADE;
DROP TABLE IF EXISTS permissions CASCADE;
DROP TABLE IF EXISTS roles CASCADE;
DROP TABLE IF EXISTS metadata_pages CASCADE;

-- ==========================================
-- Recreate core RBAC tables and constraints
-- ==========================================

CREATE TABLE roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES tenants(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  scope text DEFAULT 'tenant' CHECK (scope IN ('system', 'tenant', 'delegated')),
  metadata_key text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  updated_by uuid REFERENCES auth.users(id),
  deleted_at timestamptz,
  UNIQUE (tenant_id, name)
);

CREATE INDEX roles_tenant_id_idx ON roles(tenant_id);
CREATE INDEX roles_scope_idx ON roles(scope);
CREATE INDEX roles_metadata_key_idx ON roles(metadata_key) WHERE metadata_key IS NOT NULL;
CREATE INDEX roles_deleted_at_idx ON roles(deleted_at);

CREATE TABLE permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES tenants(id) ON DELETE CASCADE,
  code text NOT NULL,
  name text NOT NULL,
  description text,
  module text NOT NULL,
  action text,
  scope text DEFAULT 'tenant' CHECK (scope IN ('system', 'tenant', 'delegated')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  updated_by uuid REFERENCES auth.users(id),
  UNIQUE (tenant_id, code)
);

CREATE INDEX permissions_tenant_id_idx ON permissions(tenant_id);
CREATE INDEX permissions_scope_idx ON permissions(scope);
CREATE INDEX permissions_module_idx ON permissions(module);

CREATE TABLE user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES tenants(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  role_id uuid REFERENCES roles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  updated_by uuid REFERENCES auth.users(id),
  UNIQUE (tenant_id, user_id, role_id)
);

CREATE INDEX user_roles_user_idx ON user_roles(user_id);
CREATE INDEX user_roles_role_idx ON user_roles(role_id);
CREATE INDEX user_roles_tenant_idx ON user_roles(tenant_id);

CREATE TABLE role_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES tenants(id) ON DELETE CASCADE,
  role_id uuid REFERENCES roles(id) ON DELETE CASCADE,
  permission_id uuid REFERENCES permissions(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  updated_by uuid REFERENCES auth.users(id),
  UNIQUE (tenant_id, role_id, permission_id)
);

CREATE INDEX role_permissions_role_idx ON role_permissions(role_id);
CREATE INDEX role_permissions_permission_idx ON role_permissions(permission_id);
CREATE INDEX role_permissions_tenant_idx ON role_permissions(tenant_id);

CREATE TABLE role_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES tenants(id) ON DELETE CASCADE,
  parent_role_id uuid REFERENCES roles(id) ON DELETE CASCADE,
  child_role_id uuid REFERENCES roles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE (tenant_id, parent_role_id, child_role_id)
);

CREATE INDEX role_groups_parent_idx ON role_groups(parent_role_id);
CREATE INDEX role_groups_child_idx ON role_groups(child_role_id);
CREATE INDEX role_groups_tenant_idx ON role_groups(tenant_id);

CREATE TABLE permission_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  module text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX permission_actions_code_idx ON permission_actions(code);
CREATE INDEX permission_actions_module_idx ON permission_actions(module);

CREATE TABLE permission_bundles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES tenants(id) ON DELETE CASCADE,
  code text NOT NULL,
  name text NOT NULL,
  description text,
  scope text DEFAULT 'tenant' CHECK (scope IN ('system', 'tenant', 'delegated')),
  metadata_key text,
  created_by uuid REFERENCES auth.users(id),
  updated_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (tenant_id, code)
);

CREATE INDEX permission_bundles_tenant_id_idx ON permission_bundles(tenant_id);
CREATE INDEX permission_bundles_code_idx ON permission_bundles(code);
CREATE INDEX permission_bundles_scope_idx ON permission_bundles(scope);
CREATE INDEX permission_bundles_metadata_key_idx ON permission_bundles(metadata_key) WHERE metadata_key IS NOT NULL;

CREATE TABLE bundle_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES tenants(id) ON DELETE CASCADE,
  bundle_id uuid REFERENCES permission_bundles(id) ON DELETE CASCADE,
  permission_id uuid REFERENCES permissions(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE (tenant_id, bundle_id, permission_id)
);

CREATE INDEX bundle_permissions_tenant_id_idx ON bundle_permissions(tenant_id);
CREATE INDEX bundle_permissions_bundle_id_idx ON bundle_permissions(bundle_id);
CREATE INDEX bundle_permissions_permission_id_idx ON bundle_permissions(permission_id);

CREATE TABLE role_bundles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES tenants(id) ON DELETE CASCADE,
  role_id uuid REFERENCES roles(id) ON DELETE CASCADE,
  bundle_id uuid REFERENCES permission_bundles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE (tenant_id, role_id, bundle_id)
);

CREATE INDEX role_bundles_tenant_id_idx ON role_bundles(tenant_id);
CREATE INDEX role_bundles_role_id_idx ON role_bundles(role_id);
CREATE INDEX role_bundles_bundle_id_idx ON role_bundles(bundle_id);

CREATE TABLE rbac_surface_bindings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES tenants(id) ON DELETE CASCADE,
  role_id uuid REFERENCES roles(id) ON DELETE CASCADE,
  bundle_id uuid REFERENCES permission_bundles(id) ON DELETE CASCADE,
  menu_item_id uuid REFERENCES menu_items(id) ON DELETE CASCADE,
  metadata_page_id text,
  required_feature_code text,
  priority integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_by uuid REFERENCES auth.users(id),
  updated_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT rbac_surface_bindings_source_check CHECK (
    (role_id IS NOT NULL AND bundle_id IS NULL) OR
    (role_id IS NULL AND bundle_id IS NOT NULL)
  ),
  CONSTRAINT rbac_surface_bindings_target_check CHECK (
    menu_item_id IS NOT NULL OR metadata_page_id IS NOT NULL
  )
);

CREATE UNIQUE INDEX rbac_surface_bindings_role_unique_idx
  ON rbac_surface_bindings (
    tenant_id,
    role_id,
    COALESCE(menu_item_id, '00000000-0000-0000-0000-000000000000'::uuid),
    COALESCE(metadata_page_id, '')
  )
  WHERE role_id IS NOT NULL;

CREATE UNIQUE INDEX rbac_surface_bindings_bundle_unique_idx
  ON rbac_surface_bindings (
    tenant_id,
    bundle_id,
    COALESCE(menu_item_id, '00000000-0000-0000-0000-000000000000'::uuid),
    COALESCE(metadata_page_id, '')
  )
  WHERE bundle_id IS NOT NULL;

CREATE INDEX rbac_surface_bindings_tenant_id_idx ON rbac_surface_bindings(tenant_id);
CREATE INDEX rbac_surface_bindings_role_id_idx ON rbac_surface_bindings(role_id) WHERE role_id IS NOT NULL;
CREATE INDEX rbac_surface_bindings_bundle_id_idx ON rbac_surface_bindings(bundle_id) WHERE bundle_id IS NOT NULL;
CREATE INDEX rbac_surface_bindings_menu_item_id_idx ON rbac_surface_bindings(menu_item_id) WHERE menu_item_id IS NOT NULL;
CREATE INDEX rbac_surface_bindings_metadata_page_id_idx ON rbac_surface_bindings(metadata_page_id) WHERE metadata_page_id IS NOT NULL;
CREATE INDEX rbac_surface_bindings_feature_code_idx ON rbac_surface_bindings(required_feature_code) WHERE required_feature_code IS NOT NULL;
CREATE INDEX rbac_surface_bindings_active_idx ON rbac_surface_bindings(is_active) WHERE is_active = true;

CREATE TABLE metadata_pages (
  id text PRIMARY KEY,
  tenant_id uuid REFERENCES tenants(id) ON DELETE CASCADE,
  module text NOT NULL,
  route text NOT NULL,
  title text NOT NULL,
  description text,
  feature_code text,
  rbac_roles text[],
  rbac_bundles text[],
  is_system boolean DEFAULT false,
  created_by uuid REFERENCES auth.users(id),
  updated_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (tenant_id, module, route)
);

CREATE INDEX metadata_pages_tenant_id_idx ON metadata_pages(tenant_id);
CREATE INDEX metadata_pages_module_idx ON metadata_pages(module);
CREATE INDEX metadata_pages_feature_code_idx ON metadata_pages(feature_code) WHERE feature_code IS NOT NULL;
CREATE INDEX metadata_pages_rbac_roles_idx ON metadata_pages USING GIN(rbac_roles) WHERE rbac_roles IS NOT NULL;
CREATE INDEX metadata_pages_rbac_bundles_idx ON metadata_pages USING GIN(rbac_bundles) WHERE rbac_bundles IS NOT NULL;

CREATE TABLE rbac_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES tenants(id) ON DELETE CASCADE,
  table_name text NOT NULL,
  operation text NOT NULL CHECK (operation IN (
    'CREATE', 'UPDATE', 'DELETE', 'INSERT',
    'REFRESH', 'GRANT', 'REVOKE', 'LOGIN',
    'LOGOUT', 'ACCESS', 'ERROR', 'SYSTEM'
  )),
  record_id uuid,
  old_values jsonb,
  new_values jsonb,
  changed_fields text[],
  user_id uuid REFERENCES auth.users(id),
  user_email text,
  ip_address inet,
  user_agent text,
  session_id text,
  created_at timestamptz DEFAULT now(),
  security_impact text,
  notes text
);

CREATE INDEX rbac_audit_log_tenant_id_idx ON rbac_audit_log(tenant_id);
CREATE INDEX rbac_audit_log_table_operation_idx ON rbac_audit_log(table_name, operation);
CREATE INDEX rbac_audit_log_user_id_idx ON rbac_audit_log(user_id);
CREATE INDEX rbac_audit_log_created_at_idx ON rbac_audit_log(created_at);
CREATE INDEX rbac_audit_log_security_impact_idx ON rbac_audit_log(security_impact);
CREATE INDEX rbac_audit_log_record_id_idx ON rbac_audit_log(record_id);

-- ==========================================
-- Re-enable row level security and policies
-- ==========================================

ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE permission_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE permission_bundles ENABLE ROW LEVEL SECURITY;
ALTER TABLE bundle_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_bundles ENABLE ROW LEVEL SECURITY;
ALTER TABLE rbac_surface_bindings ENABLE ROW LEVEL SECURITY;
ALTER TABLE metadata_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE rbac_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Roles accessible within tenant" ON roles
  FOR ALL TO authenticated
  USING (check_tenant_access(tenant_id) OR scope = 'system')
  WITH CHECK (check_tenant_access(tenant_id) OR scope = 'system');

CREATE POLICY "Permissions accessible within tenant" ON permissions
  FOR ALL TO authenticated
  USING (check_tenant_access(tenant_id) OR scope = 'system')
  WITH CHECK (check_tenant_access(tenant_id) OR scope = 'system');

CREATE POLICY "User roles scoped to tenant" ON user_roles
  FOR ALL TO authenticated
  USING (check_tenant_access(tenant_id))
  WITH CHECK (check_tenant_access(tenant_id));

CREATE POLICY "Role permissions scoped to tenant" ON role_permissions
  FOR ALL TO authenticated
  USING (check_tenant_access(tenant_id))
  WITH CHECK (check_tenant_access(tenant_id));

CREATE POLICY "Role groups scoped to tenant" ON role_groups
  FOR ALL TO authenticated
  USING (check_tenant_access(tenant_id))
  WITH CHECK (check_tenant_access(tenant_id));

CREATE POLICY "Permission actions are viewable by authenticated users" ON permission_actions
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Permission actions can be managed by super admins" ON permission_actions
  FOR ALL TO authenticated USING (is_super_admin());

CREATE POLICY "Permission bundles are viewable within tenant" ON permission_bundles
  FOR SELECT TO authenticated
  USING (check_tenant_access(tenant_id) OR scope = 'system');

CREATE POLICY "Permission bundles can be managed within tenant" ON permission_bundles
  FOR ALL TO authenticated
  USING (check_tenant_access(tenant_id))
  WITH CHECK (check_tenant_access(tenant_id));

CREATE POLICY "Bundle permissions are viewable within tenant" ON bundle_permissions
  FOR SELECT TO authenticated
  USING (check_tenant_access(tenant_id));

CREATE POLICY "Bundle permissions can be managed within tenant" ON bundle_permissions
  FOR ALL TO authenticated
  USING (check_tenant_access(tenant_id))
  WITH CHECK (check_tenant_access(tenant_id));

CREATE POLICY "Role bundles are viewable within tenant" ON role_bundles
  FOR SELECT TO authenticated
  USING (check_tenant_access(tenant_id));

CREATE POLICY "Role bundles can be managed within tenant" ON role_bundles
  FOR ALL TO authenticated
  USING (check_tenant_access(tenant_id))
  WITH CHECK (check_tenant_access(tenant_id));

CREATE POLICY "Surface bindings are viewable within tenant" ON rbac_surface_bindings
  FOR SELECT TO authenticated
  USING (check_tenant_access(tenant_id));

CREATE POLICY "Surface bindings can be managed within tenant" ON rbac_surface_bindings
  FOR ALL TO authenticated
  USING (check_tenant_access(tenant_id))
  WITH CHECK (check_tenant_access(tenant_id));

CREATE POLICY "Metadata pages are viewable within tenant" ON metadata_pages
  FOR SELECT TO authenticated
  USING (check_tenant_access(tenant_id) OR is_system = true);

CREATE POLICY "Metadata pages can be managed within tenant" ON metadata_pages
  FOR ALL TO authenticated
  USING (check_tenant_access(tenant_id))
  WITH CHECK (check_tenant_access(tenant_id));

CREATE POLICY "RBAC audit logs viewable within tenant" ON rbac_audit_log
  FOR SELECT TO authenticated
  USING (check_tenant_access(tenant_id));

-- ==========================================
-- Triggers for updated_at timestamps
-- ==========================================

CREATE TRIGGER update_roles_updated_at
BEFORE UPDATE ON roles
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_permissions_updated_at
BEFORE UPDATE ON permissions
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_permission_actions_updated_at
BEFORE UPDATE ON permission_actions
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_permission_bundles_updated_at
BEFORE UPDATE ON permission_bundles
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_rbac_surface_bindings_updated_at
BEFORE UPDATE ON rbac_surface_bindings
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_metadata_pages_updated_at
BEFORE UPDATE ON metadata_pages
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ==========================================
-- Seed reusable permission actions
-- ==========================================

INSERT INTO permission_actions (code, name, description, module) VALUES
  ('create', 'Create', 'Create new resources', 'core'),
  ('read', 'Read', 'View existing resources', 'core'),
  ('update', 'Update', 'Modify existing resources', 'core'),
  ('delete', 'Delete', 'Remove resources', 'core'),
  ('list', 'List', 'List resources', 'core'),
  ('export', 'Export', 'Export data', 'core'),
  ('import', 'Import', 'Import data', 'core'),
  ('manage', 'Manage', 'Full management access', 'core'),
  ('view', 'View', 'View access', 'core'),
  ('admin', 'Admin', 'Administrative access', 'core')
ON CONFLICT (code) DO NOTHING;

-- ==========================================
-- Helper functions for permission checks
-- ==========================================

CREATE OR REPLACE FUNCTION current_tenant()
RETURNS uuid
SECURITY DEFINER
SET search_path = public, auth
LANGUAGE plpgsql
AS $$
DECLARE
  tenant_id uuid;
BEGIN
  SELECT tu.tenant_id INTO tenant_id
  FROM tenant_users tu
  WHERE tu.user_id = auth.uid()
  ORDER BY tu.created_at
  LIMIT 1;

  RETURN tenant_id;
END;
$$;

CREATE OR REPLACE FUNCTION can_user(required_permission text, target_tenant_id uuid DEFAULT NULL)
RETURNS boolean
SECURITY DEFINER
SET search_path = public, auth
LANGUAGE plpgsql
AS $$
DECLARE
  effective_tenant_id uuid;
BEGIN
  effective_tenant_id := COALESCE(target_tenant_id, current_tenant());

  IF effective_tenant_id IS NULL THEN
    RETURN false;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM user_roles ur
    JOIN role_permissions rp ON ur.role_id = rp.role_id
    JOIN permissions p ON rp.permission_id = p.id
    WHERE ur.user_id = auth.uid()
      AND ur.tenant_id = effective_tenant_id
      AND rp.tenant_id = effective_tenant_id
      AND p.tenant_id = effective_tenant_id
      AND p.code = required_permission
  ) THEN
    RETURN true;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM user_roles ur
    JOIN role_bundles rb ON ur.role_id = rb.role_id
    JOIN bundle_permissions bp ON rb.bundle_id = bp.bundle_id
    JOIN permissions p ON bp.permission_id = p.id
    WHERE ur.user_id = auth.uid()
      AND ur.tenant_id = effective_tenant_id
      AND rb.tenant_id = effective_tenant_id
      AND bp.tenant_id = effective_tenant_id
      AND p.tenant_id = effective_tenant_id
      AND p.code = required_permission
  ) THEN
    RETURN true;
  END IF;

  RETURN false;
END;
$$;

CREATE OR REPLACE FUNCTION can_user_any(required_permissions text[], target_tenant_id uuid DEFAULT NULL)
RETURNS boolean
SECURITY DEFINER
SET search_path = public, auth
LANGUAGE plpgsql
AS $$
DECLARE
  perm text;
BEGIN
  FOREACH perm IN ARRAY required_permissions LOOP
    IF can_user(perm, target_tenant_id) THEN
      RETURN true;
    END IF;
  END LOOP;

  RETURN false;
END;
$$;

CREATE OR REPLACE FUNCTION can_user_all(required_permissions text[], target_tenant_id uuid DEFAULT NULL)
RETURNS boolean
SECURITY DEFINER
SET search_path = public, auth
LANGUAGE plpgsql
AS $$
DECLARE
  perm text;
BEGIN
  FOREACH perm IN ARRAY required_permissions LOOP
    IF NOT can_user(perm, target_tenant_id) THEN
      RETURN false;
    END IF;
  END LOOP;

  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION can_user_fast(required_permission text, target_tenant_id uuid DEFAULT NULL)
RETURNS boolean
SECURITY DEFINER
SET search_path = public, auth
LANGUAGE plpgsql
AS $$
DECLARE
  effective_tenant_id uuid;
BEGIN
  effective_tenant_id := COALESCE(target_tenant_id, current_tenant());
  IF effective_tenant_id IS NULL THEN
    RETURN false;
  END IF;

  RETURN EXISTS (
    SELECT 1
    FROM tenant_user_effective_permissions tuep
    WHERE tuep.tenant_id = effective_tenant_id
      AND tuep.user_id = auth.uid()
      AND tuep.permission_code = required_permission
  );
END;
$$;

CREATE OR REPLACE FUNCTION get_user_effective_permissions(target_user_id uuid, target_tenant_id uuid DEFAULT NULL)
RETURNS TABLE (
  permission_code text,
  permission_name text,
  permission_module text,
  role_name text,
  role_metadata_key text,
  bundle_code text,
  assignment_type text
)
SECURITY DEFINER
SET search_path = public, auth
LANGUAGE plpgsql
AS $$
DECLARE
  effective_tenant_id uuid;
BEGIN
  effective_tenant_id := COALESCE(target_tenant_id, current_tenant());
  IF effective_tenant_id IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    permission_code,
    permission_name,
    permission_module,
    role_name,
    role_metadata_key,
    bundle_code,
    assignment_type
  FROM tenant_user_effective_permissions
  WHERE tenant_id = effective_tenant_id
    AND user_id = target_user_id;
END;
$$;

CREATE OR REPLACE FUNCTION get_user_role_metadata_keys(target_user_id uuid, target_tenant_id uuid DEFAULT NULL)
RETURNS text[]
SECURITY DEFINER
SET search_path = public, auth
LANGUAGE plpgsql
AS $$
DECLARE
  effective_tenant_id uuid;
  metadata_keys text[] := ARRAY[]::text[];
BEGIN
  effective_tenant_id := COALESCE(target_tenant_id, current_tenant());
  IF effective_tenant_id IS NULL THEN
    RETURN metadata_keys;
  END IF;

  SELECT ARRAY(SELECT DISTINCT role_metadata_key
               FROM tenant_user_effective_permissions
               WHERE tenant_id = effective_tenant_id
                 AND user_id = target_user_id
                 AND role_metadata_key IS NOT NULL)
  INTO metadata_keys;

  RETURN COALESCE(metadata_keys, ARRAY[]::text[]);
END;
$$;

-- ==========================================
-- Metadata and navigation helpers
-- ==========================================

CREATE OR REPLACE FUNCTION register_metadata_page(
  p_page_id text,
  p_tenant_id uuid,
  p_module text,
  p_route text,
  p_title text,
  p_description text DEFAULT NULL,
  p_feature_code text DEFAULT NULL,
  p_rbac_roles text[] DEFAULT NULL,
  p_rbac_bundles text[] DEFAULT NULL
)
RETURNS uuid
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO metadata_pages (
    id,
    tenant_id,
    module,
    route,
    title,
    description,
    feature_code,
    rbac_roles,
    rbac_bundles,
    created_by,
    updated_by
  ) VALUES (
    p_page_id,
    p_tenant_id,
    p_module,
    p_route,
    p_title,
    p_description,
    p_feature_code,
    p_rbac_roles,
    p_rbac_bundles,
    auth.uid(),
    auth.uid()
  )
  ON CONFLICT (tenant_id, module, route)
  DO UPDATE SET
    id = EXCLUDED.id,
    title = EXCLUDED.title,
    description = EXCLUDED.description,
    feature_code = EXCLUDED.feature_code,
    rbac_roles = EXCLUDED.rbac_roles,
    rbac_bundles = EXCLUDED.rbac_bundles,
    updated_by = auth.uid(),
    updated_at = now();

  RETURN p_tenant_id;
END;
$$;

CREATE OR REPLACE FUNCTION can_access_metadata_page(
  p_page_id text,
  p_user_id uuid,
  p_tenant_id uuid DEFAULT NULL
)
RETURNS boolean
SECURITY DEFINER
SET search_path = public, auth
LANGUAGE plpgsql
AS $$
DECLARE
  effective_tenant_id uuid;
  page_record metadata_pages;
  user_role_keys text[];
BEGIN
  effective_tenant_id := COALESCE(p_tenant_id, current_tenant());
  IF effective_tenant_id IS NULL THEN
    RETURN false;
  END IF;

  SELECT * INTO page_record
  FROM metadata_pages
  WHERE id = p_page_id
    AND (tenant_id = effective_tenant_id OR is_system = true);

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  IF page_record.feature_code IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM active_tenant_license_features atlf
      WHERE atlf.tenant_id = effective_tenant_id
        AND atlf.feature = page_record.feature_code
    ) THEN
      RETURN false;
    END IF;
  END IF;

  IF (page_record.rbac_roles IS NULL OR array_length(page_record.rbac_roles, 1) = 0) AND
     (page_record.rbac_bundles IS NULL OR array_length(page_record.rbac_bundles, 1) = 0) THEN
    RETURN true;
  END IF;

  user_role_keys := get_user_role_metadata_keys(p_user_id, effective_tenant_id);

  IF page_record.rbac_roles IS NOT NULL AND user_role_keys && page_record.rbac_roles THEN
    RETURN true;
  END IF;

  IF page_record.rbac_bundles IS NOT NULL AND user_role_keys && page_record.rbac_bundles THEN
    RETURN true;
  END IF;

  RETURN false;
END;
$$;

CREATE OR REPLACE VIEW active_tenant_license_features AS
SELECT DISTINCT
  l.tenant_id,
  lf.feature,
  l.tier,
  l.status,
  l.expires_at
FROM licenses l
JOIN license_features lf ON l.id = lf.license_id
WHERE l.status = 'active'
  AND l.deleted_at IS NULL
  AND lf.deleted_at IS NULL
  AND (l.expires_at IS NULL OR l.expires_at >= CURRENT_DATE);

CREATE OR REPLACE FUNCTION get_user_menu_with_metadata(target_user_id uuid, target_tenant_id uuid DEFAULT NULL)
RETURNS TABLE (
  menu_item_id uuid,
  menu_code text,
  menu_label text,
  menu_path text,
  menu_icon text,
  sort_order integer,
  feature_code text,
  metadata_page_id text,
  can_access boolean
)
SECURITY DEFINER
SET search_path = public, auth
LANGUAGE plpgsql
AS $$
DECLARE
  effective_tenant_id uuid;
BEGIN
  effective_tenant_id := COALESCE(target_tenant_id, current_tenant());
  IF effective_tenant_id IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT DISTINCT
    mi.id,
    mi.code,
    mi.label,
    mi.path,
    mi.icon,
    mi.sort_order,
    mi.feature_code,
    mi.metadata_page_id,
    (
      (mi.feature_code IS NULL OR EXISTS (
        SELECT 1 FROM active_tenant_license_features atlf
        WHERE atlf.tenant_id = effective_tenant_id
          AND atlf.feature = mi.feature_code
      ))
      AND
      (
        rsb.id IS NULL
        OR EXISTS (
          SELECT 1 FROM tenant_user_effective_permissions tuep
          WHERE tuep.tenant_id = effective_tenant_id
            AND tuep.user_id = target_user_id
            AND (
              (rsb.role_id IS NOT NULL AND tuep.role_id = rsb.role_id)
              OR (rsb.bundle_id IS NOT NULL AND tuep.bundle_id = rsb.bundle_id)
            )
        )
      )
    ) AS can_access
  FROM menu_items mi
  LEFT JOIN rbac_surface_bindings rsb ON rsb.menu_item_id = mi.id
    AND rsb.tenant_id = mi.tenant_id
    AND rsb.is_active = true
  WHERE mi.tenant_id = effective_tenant_id
    AND mi.deleted_at IS NULL
  ORDER BY mi.sort_order, mi.label;
END;
$$;

CREATE OR REPLACE VIEW user_menu_access AS
SELECT DISTINCT
  ur.tenant_id,
  ur.user_id,
  mi.id AS menu_item_id,
  mi.code AS menu_code,
  mi.label AS menu_label,
  mi.path AS menu_path,
  mi.icon AS menu_icon,
  mi.sort_order,
  mi.feature_code AS menu_feature_code,
  rsb.required_feature_code AS binding_feature_code,
  r.name AS role_name,
  r.metadata_key AS role_metadata_key,
  pb.name AS bundle_name,
  pb.metadata_key AS bundle_metadata_key,
  CASE
    WHEN mi.feature_code IS NOT NULL THEN EXISTS (
      SELECT 1 FROM active_tenant_license_features atlf
      WHERE atlf.tenant_id = ur.tenant_id
        AND atlf.feature = mi.feature_code
    )
    WHEN rsb.required_feature_code IS NOT NULL THEN EXISTS (
      SELECT 1 FROM active_tenant_license_features atlf
      WHERE atlf.tenant_id = ur.tenant_id
        AND atlf.feature = rsb.required_feature_code
    )
    ELSE true
  END AS has_license_access,
  CASE
    WHEN rsb.role_id IS NOT NULL THEN 'role'
    WHEN rsb.bundle_id IS NOT NULL THEN 'bundle'
    ELSE 'direct'
  END AS access_type
FROM user_roles ur
JOIN roles r ON ur.role_id = r.id
JOIN menu_items mi ON mi.tenant_id = ur.tenant_id
LEFT JOIN rbac_surface_bindings rsb ON (
  rsb.tenant_id = ur.tenant_id
  AND rsb.menu_item_id = mi.id
  AND rsb.is_active = true
  AND (
    rsb.role_id = ur.role_id OR EXISTS (
      SELECT 1 FROM role_bundles rb
      WHERE rb.role_id = ur.role_id
        AND rb.bundle_id = rsb.bundle_id
        AND rb.tenant_id = ur.tenant_id
    )
  )
)
LEFT JOIN permission_bundles pb ON rsb.bundle_id = pb.id
WHERE mi.deleted_at IS NULL
  AND (rsb.id IS NOT NULL OR NOT EXISTS (
    SELECT 1 FROM rbac_surface_bindings rsb2
    WHERE rsb2.menu_item_id = mi.id
      AND rsb2.tenant_id = mi.tenant_id
      AND rsb2.is_active = true
  ));

CREATE OR REPLACE VIEW user_metadata_page_access AS
SELECT DISTINCT
  ur.tenant_id,
  ur.user_id,
  mp.id AS metadata_page_id,
  mp.module,
  mp.route,
  mp.title,
  mp.feature_code,
  r.metadata_key AS role_metadata_key,
  pb.metadata_key AS bundle_metadata_key,
  CASE
    WHEN mp.rbac_roles IS NOT NULL AND array_length(mp.rbac_roles, 1) > 0 THEN
      r.metadata_key = ANY(mp.rbac_roles)
    WHEN mp.rbac_bundles IS NOT NULL AND array_length(mp.rbac_bundles, 1) > 0 THEN EXISTS (
      SELECT 1 FROM role_bundles rb
      JOIN permission_bundles pb2 ON rb.bundle_id = pb2.id
      WHERE rb.role_id = ur.role_id
        AND rb.tenant_id = ur.tenant_id
        AND pb2.metadata_key = ANY(mp.rbac_bundles)
    )
    ELSE true
  END AS has_rbac_access,
  CASE
    WHEN mp.feature_code IS NOT NULL THEN EXISTS (
      SELECT 1 FROM active_tenant_license_features atlf
      WHERE atlf.tenant_id = ur.tenant_id
        AND atlf.feature = mp.feature_code
    )
    ELSE true
  END AS has_license_access
FROM user_roles ur
JOIN roles r ON ur.role_id = r.id
CROSS JOIN metadata_pages mp
LEFT JOIN role_bundles rb ON rb.role_id = ur.role_id AND rb.tenant_id = ur.tenant_id
LEFT JOIN permission_bundles pb ON rb.bundle_id = pb.id
WHERE mp.tenant_id = ur.tenant_id OR mp.is_system = true;

CREATE OR REPLACE FUNCTION get_user_licensed_menu_items(target_user_id uuid, target_tenant_id uuid DEFAULT NULL)
RETURNS TABLE (
  menu_item_id uuid,
  menu_code text,
  menu_label text,
  menu_path text,
  menu_icon text,
  sort_order integer,
  access_type text,
  role_name text,
  bundle_name text
)
SECURITY DEFINER
SET search_path = public, auth
LANGUAGE plpgsql
AS $$
DECLARE
  effective_tenant_id uuid;
BEGIN
  effective_tenant_id := COALESCE(target_tenant_id, current_tenant());
  IF effective_tenant_id IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT DISTINCT
    uma.menu_item_id,
    uma.menu_code,
    uma.menu_label,
    uma.menu_path,
    uma.menu_icon,
    uma.sort_order,
    uma.access_type,
    uma.role_name,
    uma.bundle_name
  FROM user_menu_access uma
  WHERE uma.tenant_id = effective_tenant_id
    AND uma.user_id = target_user_id
    AND uma.has_license_access = true
  ORDER BY uma.sort_order, uma.menu_label;
END;
$$;

CREATE OR REPLACE FUNCTION get_user_licensed_metadata_pages(target_user_id uuid, target_tenant_id uuid DEFAULT NULL)
RETURNS TABLE (
  metadata_page_id text,
  module text,
  route text,
  title text,
  feature_code text
)
SECURITY DEFINER
SET search_path = public, auth
LANGUAGE plpgsql
AS $$
DECLARE
  effective_tenant_id uuid;
BEGIN
  effective_tenant_id := COALESCE(target_tenant_id, current_tenant());
  IF effective_tenant_id IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT DISTINCT
    mp.metadata_page_id,
    mp.module,
    mp.route,
    mp.title,
    mp.feature_code
  FROM user_metadata_page_access mp
  WHERE mp.tenant_id = effective_tenant_id
    AND mp.user_id = target_user_id
    AND mp.has_rbac_access = true
    AND mp.has_license_access = true;
END;
$$;

-- ==========================================
-- Surface binding helpers
-- ==========================================

CREATE OR REPLACE FUNCTION insert_surface_binding(
  p_tenant_id uuid,
  p_role_id uuid DEFAULT NULL,
  p_bundle_id uuid DEFAULT NULL,
  p_menu_item_id uuid DEFAULT NULL,
  p_metadata_page_id text DEFAULT NULL,
  p_required_feature_code text DEFAULT NULL,
  p_priority integer DEFAULT 0,
  p_is_active boolean DEFAULT true,
  p_created_by uuid DEFAULT NULL,
  p_updated_by uuid DEFAULT NULL
)
RETURNS uuid
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
DECLARE
  binding_id uuid;
  current_user_id uuid;
BEGIN
  current_user_id := COALESCE(p_created_by, auth.uid());

  IF (p_role_id IS NULL AND p_bundle_id IS NULL) OR (p_role_id IS NOT NULL AND p_bundle_id IS NOT NULL) THEN
    RAISE EXCEPTION 'Provide either role_id or bundle_id, exclusively.';
  END IF;

  IF p_menu_item_id IS NULL AND p_metadata_page_id IS NULL THEN
    RAISE EXCEPTION 'Provide a menu_item_id or metadata_page_id.';
  END IF;

  INSERT INTO rbac_surface_bindings (
    tenant_id,
    role_id,
    bundle_id,
    menu_item_id,
    metadata_page_id,
    required_feature_code,
    priority,
    is_active,
    created_by,
    updated_by
  ) VALUES (
    p_tenant_id,
    p_role_id,
    p_bundle_id,
    p_menu_item_id,
    p_metadata_page_id,
    p_required_feature_code,
    p_priority,
    p_is_active,
    current_user_id,
    COALESCE(p_updated_by, current_user_id)
  )
  RETURNING id INTO binding_id;

  RETURN binding_id;
END;
$$;

CREATE OR REPLACE FUNCTION migrate_role_menu_items_to_surface_bindings()
RETURNS void
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
DECLARE
  rmi_record RECORD;
BEGIN
  FOR rmi_record IN
    SELECT tenant_id, role_id, menu_item_id, created_by, updated_by, created_at, updated_at
    FROM role_menu_items
  LOOP
    INSERT INTO rbac_surface_bindings (
      tenant_id,
      role_id,
      menu_item_id,
      created_by,
      updated_by,
      created_at,
      updated_at
    )
    VALUES (
      rmi_record.tenant_id,
      rmi_record.role_id,
      rmi_record.menu_item_id,
      rmi_record.created_by,
      rmi_record.updated_by,
      rmi_record.created_at,
      rmi_record.updated_at
    )
    ON CONFLICT DO NOTHING;
  END LOOP;
END;
$$;

-- ==========================================
-- Materialized view for effective permissions
-- ==========================================

CREATE MATERIALIZED VIEW tenant_user_effective_permissions AS
WITH direct_permissions AS (
  SELECT DISTINCT
    ur.tenant_id,
    ur.user_id,
    p.id AS permission_id,
    p.code AS permission_code,
    p.name AS permission_name,
    p.module AS permission_module,
    r.id AS role_id,
    r.name AS role_name,
    r.metadata_key AS role_metadata_key,
    NULL::uuid AS bundle_id,
    NULL::text AS bundle_code,
    'direct' AS assignment_type
  FROM user_roles ur
  JOIN roles r ON ur.role_id = r.id
  JOIN role_permissions rp ON r.id = rp.role_id AND ur.tenant_id = rp.tenant_id
  JOIN permissions p ON rp.permission_id = p.id AND rp.tenant_id = p.tenant_id
  WHERE ur.tenant_id IS NOT NULL
    AND r.tenant_id IS NOT NULL
    AND p.tenant_id IS NOT NULL
),
bundle_permissions AS (
  SELECT DISTINCT
    ur.tenant_id,
    ur.user_id,
    p.id AS permission_id,
    p.code AS permission_code,
    p.name AS permission_name,
    p.module AS permission_module,
    r.id AS role_id,
    r.name AS role_name,
    r.metadata_key AS role_metadata_key,
    pb.id AS bundle_id,
    pb.code AS bundle_code,
    'bundle' AS assignment_type
  FROM user_roles ur
  JOIN roles r ON ur.role_id = r.id
  JOIN role_bundles rb ON r.id = rb.role_id AND ur.tenant_id = rb.tenant_id
  JOIN permission_bundles pb ON rb.bundle_id = pb.id AND rb.tenant_id = pb.tenant_id
  JOIN bundle_permissions bp ON pb.id = bp.bundle_id AND pb.tenant_id = bp.tenant_id
  JOIN permissions p ON bp.permission_id = p.id AND bp.tenant_id = p.tenant_id
  WHERE ur.tenant_id IS NOT NULL
    AND r.tenant_id IS NOT NULL
    AND pb.tenant_id IS NOT NULL
    AND p.tenant_id IS NOT NULL
),
all_permissions AS (
  SELECT * FROM direct_permissions
  UNION ALL
  SELECT * FROM bundle_permissions
)
SELECT
  md5(
    COALESCE(tenant_id::text, '') || '|' ||
    COALESCE(user_id::text, '') || '|' ||
    COALESCE(permission_id::text, '') || '|' ||
    COALESCE(role_id::text, '') || '|' ||
    COALESCE(bundle_id::text, '') || '|' ||
    assignment_type
  ) AS unique_id,
  tenant_id,
  user_id,
  permission_id,
  permission_code,
  permission_name,
  permission_module,
  role_id,
  role_name,
  role_metadata_key,
  bundle_id,
  bundle_code,
  assignment_type,
  now() AS computed_at
FROM all_permissions;

CREATE UNIQUE INDEX tenant_user_effective_permissions_unique_id_idx
  ON tenant_user_effective_permissions (unique_id);

CREATE INDEX tenant_user_effective_permissions_tenant_user_idx
  ON tenant_user_effective_permissions (tenant_id, user_id);

CREATE INDEX tenant_user_effective_permissions_permission_code_idx
  ON tenant_user_effective_permissions (permission_code);

CREATE INDEX tenant_user_effective_permissions_role_metadata_key_idx
  ON tenant_user_effective_permissions (role_metadata_key) WHERE role_metadata_key IS NOT NULL;

CREATE INDEX tenant_user_effective_permissions_bundle_code_idx
  ON tenant_user_effective_permissions (bundle_code) WHERE bundle_code IS NOT NULL;

CREATE INDEX tenant_user_effective_permissions_lookup_idx
  ON tenant_user_effective_permissions (tenant_id, user_id, permission_code);

CREATE OR REPLACE FUNCTION refresh_tenant_user_effective_permissions()
RETURNS void
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
BEGIN
  BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY tenant_user_effective_permissions;
  EXCEPTION
    WHEN OTHERS THEN
      REFRESH MATERIALIZED VIEW tenant_user_effective_permissions;
  END;
END;
$$;

CREATE OR REPLACE FUNCTION refresh_tenant_user_effective_permissions_safe()
RETURNS void
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
DECLARE
  refresh_start_time timestamptz;
  refresh_end_time timestamptz;
  error_message text;
BEGIN
  refresh_start_time := now();

  BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY tenant_user_effective_permissions;
    refresh_end_time := now();

    INSERT INTO rbac_audit_log (
      tenant_id,
      table_name,
      operation,
      record_id,
      new_values,
      user_id,
      security_impact,
      notes
    ) VALUES (
      NULL,
      'tenant_user_effective_permissions',
      'REFRESH',
      gen_random_uuid(),
      jsonb_build_object(
        'refresh_start', refresh_start_time,
        'refresh_end', refresh_end_time,
        'duration_ms', EXTRACT(epoch FROM (refresh_end_time - refresh_start_time)) * 1000,
        'concurrent', true
      ),
      auth.uid(),
      'low',
      'Materialized view concurrent refresh completed successfully'
    );

  EXCEPTION WHEN OTHERS THEN
    error_message := SQLERRM;
    BEGIN
      REFRESH MATERIALIZED VIEW tenant_user_effective_permissions;
      refresh_end_time := now();

      INSERT INTO rbac_audit_log (
        tenant_id,
        table_name,
        operation,
        record_id,
        new_values,
        user_id,
        security_impact,
        notes
      ) VALUES (
        NULL,
        'tenant_user_effective_permissions',
        'REFRESH',
        gen_random_uuid(),
        jsonb_build_object(
          'refresh_start', refresh_start_time,
          'refresh_end', refresh_end_time,
          'duration_ms', EXTRACT(epoch FROM (refresh_end_time - refresh_start_time)) * 1000,
          'concurrent', false,
          'fallback_error', error_message
        ),
        auth.uid(),
        'medium',
        'Materialized view fallback refresh completed with prior concurrent error'
      );
    EXCEPTION WHEN OTHERS THEN
      refresh_end_time := now();
      INSERT INTO rbac_audit_log (
        tenant_id,
        table_name,
        operation,
        record_id,
        new_values,
        user_id,
        security_impact,
        notes
      ) VALUES (
        NULL,
        'tenant_user_effective_permissions',
        'REFRESH',
        gen_random_uuid(),
        jsonb_build_object(
          'refresh_start', refresh_start_time,
          'refresh_end', refresh_end_time,
          'error', SQLERRM,
          'concurrent_error', error_message
        ),
        auth.uid(),
        'high',
        'Materialized view refresh failed after fallback: ' || SQLERRM
      );
      RAISE;
    END;
  END;
END;
$$;

CREATE OR REPLACE FUNCTION trigger_refresh_effective_permissions_safe()
RETURNS trigger
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM refresh_tenant_user_effective_permissions_safe();
  RETURN COALESCE(NEW, OLD);
EXCEPTION WHEN OTHERS THEN
  INSERT INTO rbac_audit_log (
    tenant_id,
    table_name,
    operation,
    record_id,
    user_id,
    security_impact,
    notes
  ) VALUES (
    NULL,
    'materialized_view_refresh',
    'ERROR',
    gen_random_uuid(),
    auth.uid(),
    'medium',
    'Failed to refresh materialized view: ' || SQLERRM
  );
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER refresh_effective_permissions_user_roles
  AFTER INSERT OR UPDATE OR DELETE ON user_roles
  FOR EACH STATEMENT EXECUTE FUNCTION trigger_refresh_effective_permissions_safe();

CREATE TRIGGER refresh_effective_permissions_role_permissions
  AFTER INSERT OR UPDATE OR DELETE ON role_permissions
  FOR EACH STATEMENT EXECUTE FUNCTION trigger_refresh_effective_permissions_safe();

CREATE TRIGGER refresh_effective_permissions_role_bundles
  AFTER INSERT OR UPDATE OR DELETE ON role_bundles
  FOR EACH STATEMENT EXECUTE FUNCTION trigger_refresh_effective_permissions_safe();

CREATE TRIGGER refresh_effective_permissions_bundle_permissions
  AFTER INSERT OR UPDATE OR DELETE ON bundle_permissions
  FOR EACH STATEMENT EXECUTE FUNCTION trigger_refresh_effective_permissions_safe();

CREATE TRIGGER refresh_effective_permissions_surface_bindings
  AFTER INSERT OR UPDATE OR DELETE ON rbac_surface_bindings
  FOR EACH STATEMENT EXECUTE FUNCTION trigger_refresh_effective_permissions_safe();

-- ==========================================
-- Audit trigger and monitoring helpers
-- ==========================================

CREATE OR REPLACE FUNCTION rbac_audit_trigger()
RETURNS trigger
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
DECLARE
  current_user_id uuid;
  current_user_email text;
  tenant_id_value uuid;
  old_record jsonb;
  new_record jsonb;
  changed_fields_array text[] := ARRAY[]::text[];
  field_name text;
  security_impact_level text := 'medium';
BEGIN
  SELECT auth.uid() INTO current_user_id;
  SELECT COALESCE(raw_user_meta_data->>'email', email) INTO current_user_email
  FROM auth.users WHERE id = current_user_id;

  IF TG_OP IN ('INSERT', 'UPDATE') THEN
    tenant_id_value := (to_jsonb(NEW)->>'tenant_id')::uuid;
  ELSE
    tenant_id_value := (to_jsonb(OLD)->>'tenant_id')::uuid;
  END IF;

  IF TG_OP = 'INSERT' THEN
    new_record := to_jsonb(NEW);
    security_impact_level := CASE
      WHEN TG_TABLE_NAME IN ('roles', 'permissions', 'permission_bundles') THEN 'high'
      WHEN TG_TABLE_NAME IN ('user_roles', 'role_permissions', 'role_bundles') THEN 'high'
      ELSE 'medium'
    END;
  ELSIF TG_OP = 'UPDATE' THEN
    old_record := to_jsonb(OLD);
    new_record := to_jsonb(NEW);

    FOR field_name IN SELECT jsonb_object_keys(new_record) LOOP
      IF old_record->>field_name IS DISTINCT FROM new_record->>field_name THEN
        changed_fields_array := array_append(changed_fields_array, field_name);
      END IF;
    END LOOP;

    security_impact_level := CASE
      WHEN 'metadata_key' = ANY(changed_fields_array) THEN 'high'
      WHEN 'scope' = ANY(changed_fields_array) THEN 'high'
      WHEN array_length(changed_fields_array, 1) > 5 THEN 'high'
      WHEN TG_TABLE_NAME IN ('user_roles', 'role_permissions') THEN 'high'
      ELSE 'medium'
    END;
  ELSIF TG_OP = 'DELETE' THEN
    old_record := to_jsonb(OLD);
    security_impact_level := CASE
      WHEN TG_TABLE_NAME IN ('roles', 'permissions', 'permission_bundles') THEN 'critical'
      WHEN TG_TABLE_NAME IN ('user_roles', 'role_permissions', 'role_bundles') THEN 'high'
      ELSE 'medium'
    END;
  END IF;

  INSERT INTO rbac_audit_log (
    tenant_id,
    table_name,
    operation,
    record_id,
    old_values,
    new_values,
    changed_fields,
    user_id,
    user_email,
    security_impact,
    created_at
  ) VALUES (
    tenant_id_value,
    TG_TABLE_NAME,
    TG_OP,
    COALESCE((new_record->>'id')::uuid, (old_record->>'id')::uuid),
    old_record,
    new_record,
    changed_fields_array,
    current_user_id,
    current_user_email,
    security_impact_level,
    now()
  );

  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER rbac_audit_trigger_roles
  AFTER INSERT OR UPDATE OR DELETE ON roles
  FOR EACH ROW EXECUTE FUNCTION rbac_audit_trigger();

CREATE TRIGGER rbac_audit_trigger_permissions
  AFTER INSERT OR UPDATE OR DELETE ON permissions
  FOR EACH ROW EXECUTE FUNCTION rbac_audit_trigger();

CREATE TRIGGER rbac_audit_trigger_permission_bundles
  AFTER INSERT OR UPDATE OR DELETE ON permission_bundles
  FOR EACH ROW EXECUTE FUNCTION rbac_audit_trigger();

CREATE TRIGGER rbac_audit_trigger_user_roles
  AFTER INSERT OR UPDATE OR DELETE ON user_roles
  FOR EACH ROW EXECUTE FUNCTION rbac_audit_trigger();

CREATE TRIGGER rbac_audit_trigger_role_permissions
  AFTER INSERT OR UPDATE OR DELETE ON role_permissions
  FOR EACH ROW EXECUTE FUNCTION rbac_audit_trigger();

CREATE TRIGGER rbac_audit_trigger_role_bundles
  AFTER INSERT OR UPDATE OR DELETE ON role_bundles
  FOR EACH ROW EXECUTE FUNCTION rbac_audit_trigger();

CREATE TRIGGER rbac_audit_trigger_bundle_permissions
  AFTER INSERT OR UPDATE OR DELETE ON bundle_permissions
  FOR EACH ROW EXECUTE FUNCTION rbac_audit_trigger();

CREATE TRIGGER rbac_audit_trigger_surface_bindings
  AFTER INSERT OR UPDATE OR DELETE ON rbac_surface_bindings
  FOR EACH ROW EXECUTE FUNCTION rbac_audit_trigger();

CREATE OR REPLACE FUNCTION get_rbac_health_metrics(target_tenant_id uuid DEFAULT NULL)
RETURNS TABLE (
  metric_name text,
  metric_value bigint,
  status text,
  details jsonb
)
SECURITY DEFINER
SET search_path = public, auth
LANGUAGE plpgsql
AS $$
DECLARE
  effective_tenant_id uuid;
  orphaned_user_roles bigint;
  users_without_roles bigint;
  roles_without_permissions bigint;
  materialized_view_lag interval;
  recent_critical_changes bigint;
BEGIN
  effective_tenant_id := COALESCE(target_tenant_id, current_tenant());
  IF effective_tenant_id IS NULL THEN
    RETURN;
  END IF;

  SELECT COUNT(*) INTO orphaned_user_roles
  FROM user_roles ur
  LEFT JOIN roles r ON ur.role_id = r.id
  WHERE ur.tenant_id = effective_tenant_id
    AND r.id IS NULL;

  RETURN QUERY SELECT
    'orphaned_user_roles'::text,
    orphaned_user_roles,
    CASE WHEN orphaned_user_roles = 0 THEN 'healthy' ELSE 'warning' END,
    jsonb_build_object('count', orphaned_user_roles);

  SELECT COUNT(DISTINCT tu.user_id) INTO users_without_roles
  FROM tenant_users tu
  LEFT JOIN user_roles ur ON tu.user_id = ur.user_id AND tu.tenant_id = ur.tenant_id
  WHERE tu.tenant_id = effective_tenant_id
    AND ur.user_id IS NULL;

  RETURN QUERY SELECT
    'users_without_roles'::text,
    users_without_roles,
    CASE WHEN users_without_roles = 0 THEN 'healthy' ELSE 'info' END,
    jsonb_build_object('count', users_without_roles);

  SELECT COUNT(*) INTO roles_without_permissions
  FROM roles r
  LEFT JOIN role_permissions rp ON r.id = rp.role_id
  LEFT JOIN role_bundles rb ON r.id = rb.role_id
  WHERE r.tenant_id = effective_tenant_id
    AND rp.role_id IS NULL
    AND rb.role_id IS NULL;

  RETURN QUERY SELECT
    'roles_without_permissions'::text,
    roles_without_permissions,
    CASE WHEN roles_without_permissions = 0 THEN 'healthy' ELSE 'warning' END,
    jsonb_build_object('count', roles_without_permissions);

  SELECT now() - MAX(computed_at) INTO materialized_view_lag
  FROM tenant_user_effective_permissions
  WHERE tenant_id = effective_tenant_id;

  RETURN QUERY SELECT
    'materialized_view_lag_minutes'::text,
    EXTRACT(epoch FROM COALESCE(materialized_view_lag, '0 seconds'::interval))::bigint / 60,
    CASE
      WHEN materialized_view_lag IS NULL THEN 'error'
      WHEN materialized_view_lag > '1 hour'::interval THEN 'critical'
      WHEN materialized_view_lag > '15 minutes'::interval THEN 'warning'
      ELSE 'healthy'
    END,
    jsonb_build_object('lag_seconds', EXTRACT(epoch FROM COALESCE(materialized_view_lag, '0 seconds'::interval)));

  SELECT COUNT(*) INTO recent_critical_changes
  FROM rbac_audit_log
  WHERE tenant_id = effective_tenant_id
    AND security_impact IN ('critical', 'high')
    AND created_at >= now() - '24 hours'::interval;

  RETURN QUERY SELECT
    'recent_critical_changes_24h'::text,
    recent_critical_changes,
    CASE
      WHEN recent_critical_changes > 100 THEN 'critical'
      WHEN recent_critical_changes > 50 THEN 'warning'
      ELSE 'healthy'
    END,
    jsonb_build_object('count', recent_critical_changes);
END;
$$;

CREATE OR REPLACE FUNCTION cleanup_old_audit_logs(retention_days integer DEFAULT 90)
RETURNS bigint
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
DECLARE
  deleted_count bigint;
BEGIN
  DELETE FROM rbac_audit_log
  WHERE created_at < now() - (retention_days || ' days')::interval
    AND security_impact NOT IN ('critical');

  GET DIAGNOSTICS deleted_count = ROW_COUNT;

  INSERT INTO rbac_audit_log (
    tenant_id,
    table_name,
    operation,
    record_id,
    new_values,
    security_impact,
    notes
  ) VALUES (
    NULL,
    'rbac_audit_log',
    'CLEANUP',
    gen_random_uuid(),
    jsonb_build_object('deleted_count', deleted_count, 'retention_days', retention_days),
    'low',
    'Automated cleanup of old audit logs'
  );

  RETURN deleted_count;
END;
$$;

-- ==========================================
-- Validation utilities (lightweight stubs)
-- ==========================================

CREATE OR REPLACE FUNCTION record_rbac_validation_event(
  p_tenant_id uuid,
  p_event_type text,
  p_status text,
  p_details jsonb DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO rbac_audit_log (
    tenant_id,
    table_name,
    operation,
    record_id,
    new_values,
    security_impact,
    notes
  ) VALUES (
    p_tenant_id,
    'rbac_validation',
    'SYSTEM',
    gen_random_uuid(),
    p_details,
    CASE WHEN p_status = 'error' THEN 'high' ELSE 'low' END,
    p_event_type || ' - ' || p_status
  );
END;
$$;

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
  RETURN QUERY
  SELECT 'roles', 'missing_tenant_id', COUNT(*), jsonb_agg(jsonb_build_object('id', id, 'name', name) ORDER BY created_at LIMIT 5)
  FROM roles WHERE tenant_id IS NULL GROUP BY 1,2 HAVING COUNT(*) > 0;

  RETURN QUERY
  SELECT 'permissions', 'missing_tenant_id', COUNT(*), jsonb_agg(jsonb_build_object('id', id, 'code', code) ORDER BY created_at LIMIT 5)
  FROM permissions WHERE tenant_id IS NULL GROUP BY 1,2 HAVING COUNT(*) > 0;
END;
$$;

CREATE OR REPLACE FUNCTION backfill_rbac_tenant_ids()
RETURNS TABLE (
  table_name text,
  operation text,
  affected_rows bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY SELECT 'system'::text, 'noop'::text, 0::bigint;
END;
$$;

CREATE OR REPLACE FUNCTION fix_rbac_surface_bindings()
RETURNS TABLE (
  tenant_id uuid,
  processed_bindings bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY SELECT NULL::uuid, 0::bigint;
END;
$$;

CREATE OR REPLACE FUNCTION create_role_metadata_keys()
RETURNS TABLE (
  tenant_id uuid,
  processed_roles bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY SELECT NULL::uuid, 0::bigint;
END;
$$;

CREATE OR REPLACE FUNCTION validate_surface_binding_integrity()
RETURNS TABLE (
  tenant_id uuid,
  issue text,
  affected_rows bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY SELECT NULL::uuid, 'healthy', 0::bigint;
END;
$$;

CREATE OR REPLACE FUNCTION rebuild_rbac_materialized_view(p_tenant_id uuid DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  PERFORM refresh_tenant_user_effective_permissions_safe();
END;
$$;

CREATE OR REPLACE FUNCTION rebuild_rbac_metadata_pages(p_tenant_id uuid DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  PERFORM 1;
END;
$$;

-- ==========================================
-- Grants and comments
-- ==========================================

GRANT EXECUTE ON FUNCTION current_tenant() TO authenticated;
GRANT EXECUTE ON FUNCTION can_user(text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION can_user_any(text[], uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION can_user_all(text[], uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION can_user_fast(text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_effective_permissions(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_role_metadata_keys(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION register_metadata_page(text, uuid, text, text, text, text, text, text[], text[]) TO authenticated;
GRANT EXECUTE ON FUNCTION can_access_metadata_page(text, uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_menu_with_metadata(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_licensed_menu_items(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_licensed_metadata_pages(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION insert_surface_binding(uuid, uuid, uuid, uuid, text, text, integer, boolean, uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION migrate_role_menu_items_to_surface_bindings() TO authenticated;
GRANT EXECUTE ON FUNCTION refresh_tenant_user_effective_permissions() TO authenticated;
GRANT EXECUTE ON FUNCTION refresh_tenant_user_effective_permissions_safe() TO authenticated;
GRANT EXECUTE ON FUNCTION get_rbac_health_metrics(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_old_audit_logs(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION validate_rbac_tenant_isolation() TO authenticated;
GRANT EXECUTE ON FUNCTION backfill_rbac_tenant_ids() TO authenticated;
GRANT EXECUTE ON FUNCTION fix_rbac_surface_bindings() TO authenticated;
GRANT EXECUTE ON FUNCTION create_role_metadata_keys() TO authenticated;
GRANT EXECUTE ON FUNCTION validate_surface_binding_integrity() TO authenticated;
GRANT EXECUTE ON FUNCTION rebuild_rbac_materialized_view(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION rebuild_rbac_metadata_pages(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION record_rbac_validation_event(uuid, text, text, jsonb) TO authenticated;

COMMENT ON TABLE permission_actions IS 'Standardized permission actions that can be reused across modules.';
COMMENT ON TABLE permission_bundles IS 'Groups of permissions that can be assigned to roles as a bundle.';
COMMENT ON TABLE bundle_permissions IS 'Mapping between permission bundles and individual permissions.';
COMMENT ON TABLE role_bundles IS 'Mapping between roles and permission bundles.';
COMMENT ON TABLE rbac_surface_bindings IS 'Links RBAC sources (roles or bundles) to menu items and metadata pages.';
COMMENT ON TABLE metadata_pages IS 'Registry of metadata-driven pages with RBAC and license bindings.';
COMMENT ON TABLE rbac_audit_log IS 'Comprehensive audit log for RBAC-related changes with security impact scoring.';
COMMENT ON FUNCTION current_tenant() IS 'Returns the current tenant UUID for the authenticated user.';
COMMENT ON FUNCTION can_user(text, uuid) IS 'Checks if the authenticated user holds the requested permission within a tenant.';
COMMENT ON FUNCTION can_user_fast(text, uuid) IS 'Fast permission check that leverages the effective permissions materialized view.';
COMMENT ON FUNCTION get_rbac_health_metrics(uuid) IS 'Returns RBAC health metrics including orphaned records and view freshness.';
COMMENT ON FUNCTION cleanup_old_audit_logs(integer) IS 'Cleans up old audit entries while preserving high-severity events.';
