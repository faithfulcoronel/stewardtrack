/*
  # Enhanced RBAC Foundations

  This migration implements the enhanced RBAC architecture based on the
  architecture plan. It adds scope support, permission actions/bundles,
  and tenant-aware functions for authorization.
*/

-- Add scope columns to existing RBAC tables
ALTER TABLE roles
  ADD COLUMN IF NOT EXISTS scope text DEFAULT 'tenant' CHECK (scope IN ('system', 'tenant', 'delegated')),
  ADD COLUMN IF NOT EXISTS metadata_key text; -- For mapping to metadata identifiers

ALTER TABLE permissions
  ADD COLUMN IF NOT EXISTS scope text DEFAULT 'tenant' CHECK (scope IN ('system', 'tenant', 'delegated'));

-- Create index for scope-based queries
CREATE INDEX IF NOT EXISTS roles_scope_idx ON roles(scope);
CREATE INDEX IF NOT EXISTS permissions_scope_idx ON permissions(scope);
CREATE INDEX IF NOT EXISTS roles_metadata_key_idx ON roles(metadata_key) WHERE metadata_key IS NOT NULL;

-- Standardized permission actions table
CREATE TABLE IF NOT EXISTS permission_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  module text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS permission_actions_code_idx ON permission_actions(code);
CREATE INDEX IF NOT EXISTS permission_actions_module_idx ON permission_actions(module);

-- Permission bundles for grouping related permissions
CREATE TABLE IF NOT EXISTS permission_bundles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES tenants(id) ON DELETE CASCADE,
  code text NOT NULL,
  name text NOT NULL,
  description text,
  scope text DEFAULT 'tenant' CHECK (scope IN ('system', 'tenant', 'delegated')),
  metadata_key text, -- For mapping to metadata identifiers
  created_by uuid REFERENCES auth.users(id),
  updated_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (tenant_id, code)
);

CREATE INDEX IF NOT EXISTS permission_bundles_tenant_id_idx ON permission_bundles(tenant_id);
CREATE INDEX IF NOT EXISTS permission_bundles_code_idx ON permission_bundles(code);
CREATE INDEX IF NOT EXISTS permission_bundles_scope_idx ON permission_bundles(scope);
CREATE INDEX IF NOT EXISTS permission_bundles_metadata_key_idx ON permission_bundles(metadata_key) WHERE metadata_key IS NOT NULL;

-- Bundle to permission mapping
CREATE TABLE IF NOT EXISTS bundle_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES tenants(id) ON DELETE CASCADE,
  bundle_id uuid REFERENCES permission_bundles(id) ON DELETE CASCADE,
  permission_id uuid REFERENCES permissions(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE (tenant_id, bundle_id, permission_id)
);

CREATE INDEX IF NOT EXISTS bundle_permissions_tenant_id_idx ON bundle_permissions(tenant_id);
CREATE INDEX IF NOT EXISTS bundle_permissions_bundle_id_idx ON bundle_permissions(bundle_id);
CREATE INDEX IF NOT EXISTS bundle_permissions_permission_id_idx ON bundle_permissions(permission_id);

-- Role to bundle mapping (in addition to direct role-permission mapping)
CREATE TABLE IF NOT EXISTS role_bundles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES tenants(id) ON DELETE CASCADE,
  role_id uuid REFERENCES roles(id) ON DELETE CASCADE,
  bundle_id uuid REFERENCES permission_bundles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE (tenant_id, role_id, bundle_id)
);

CREATE INDEX IF NOT EXISTS role_bundles_tenant_id_idx ON role_bundles(tenant_id);
CREATE INDEX IF NOT EXISTS role_bundles_role_id_idx ON role_bundles(role_id);
CREATE INDEX IF NOT EXISTS role_bundles_bundle_id_idx ON role_bundles(bundle_id);

-- Enable RLS on new tables
ALTER TABLE permission_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE permission_bundles ENABLE ROW LEVEL SECURITY;
ALTER TABLE bundle_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_bundles ENABLE ROW LEVEL SECURITY;

-- RLS policies for permission_actions (system-wide, no tenant scoping needed)
CREATE POLICY "Permission actions are viewable by authenticated users" ON permission_actions
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Permission actions can be managed by super admins" ON permission_actions
  FOR ALL TO authenticated USING (is_super_admin());

-- RLS policies for permission_bundles
CREATE POLICY "Permission bundles are viewable within tenant" ON permission_bundles
  FOR SELECT TO authenticated
  USING (check_tenant_access(tenant_id) OR scope = 'system');

CREATE POLICY "Permission bundles can be managed within tenant" ON permission_bundles
  FOR ALL TO authenticated
  USING (check_tenant_access(tenant_id))
  WITH CHECK (check_tenant_access(tenant_id));

-- RLS policies for bundle_permissions
CREATE POLICY "Bundle permissions are viewable within tenant" ON bundle_permissions
  FOR SELECT TO authenticated
  USING (check_tenant_access(tenant_id));

CREATE POLICY "Bundle permissions can be managed within tenant" ON bundle_permissions
  FOR ALL TO authenticated
  USING (check_tenant_access(tenant_id))
  WITH CHECK (check_tenant_access(tenant_id));

-- RLS policies for role_bundles
CREATE POLICY "Role bundles are viewable within tenant" ON role_bundles
  FOR SELECT TO authenticated
  USING (check_tenant_access(tenant_id));

CREATE POLICY "Role bundles can be managed within tenant" ON role_bundles
  FOR ALL TO authenticated
  USING (check_tenant_access(tenant_id))
  WITH CHECK (check_tenant_access(tenant_id));

-- Updated_at triggers
CREATE TRIGGER update_permission_actions_updated_at
BEFORE UPDATE ON permission_actions
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_permission_bundles_updated_at
BEFORE UPDATE ON permission_bundles
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Seed standard permission actions
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

-- Function to get current tenant for a user
CREATE OR REPLACE FUNCTION current_tenant()
RETURNS uuid
SECURITY DEFINER
SET search_path = public, auth
LANGUAGE plpgsql
AS $$
DECLARE
  tenant_id uuid;
BEGIN
  -- Get the first tenant for the authenticated user
  -- In a multi-tenant context, this could be enhanced to use session variables
  SELECT tu.tenant_id INTO tenant_id
  FROM tenant_users tu
  WHERE tu.user_id = auth.uid()
  LIMIT 1;

  RETURN tenant_id;
END;
$$;

-- Enhanced can_user function with explicit tenant parameter
CREATE OR REPLACE FUNCTION can_user(required_permission text, target_tenant_id uuid DEFAULT NULL)
RETURNS boolean
SECURITY DEFINER
SET search_path = public, auth
LANGUAGE plpgsql
AS $$
DECLARE
  effective_tenant_id uuid;
BEGIN
  -- Use provided tenant_id or determine from context
  effective_tenant_id := COALESCE(target_tenant_id, current_tenant());

  IF effective_tenant_id IS NULL THEN
    RETURN false;
  END IF;

  -- Check direct role permissions
  IF EXISTS (
    SELECT 1
    FROM user_roles ur
    JOIN role_permissions rp ON ur.role_id = rp.role_id
    JOIN permissions p ON rp.permission_id = p.id
    WHERE ur.user_id = auth.uid()
      AND ur.tenant_id = effective_tenant_id
      AND rp.tenant_id = effective_tenant_id
      AND p.code = required_permission
      AND p.tenant_id = effective_tenant_id
  ) THEN
    RETURN true;
  END IF;

  -- Check bundle-based permissions
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
      AND p.code = required_permission
      AND p.tenant_id = effective_tenant_id
  ) THEN
    RETURN true;
  END IF;

  RETURN false;
END;
$$;

-- Function to check if user has any of multiple permissions (OR logic)
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

-- Function to check if user has all of multiple permissions (AND logic)
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

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION current_tenant() TO authenticated;
GRANT EXECUTE ON FUNCTION can_user(text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION can_user_any(text[], uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION can_user_all(text[], uuid) TO authenticated;

-- Comments for documentation
COMMENT ON FUNCTION current_tenant() IS
  'Returns the current tenant UUID for the authenticated user.';
COMMENT ON FUNCTION can_user(text, uuid) IS
  'Returns true if the logged in user has the given permission within the specified tenant. If no tenant is provided, uses current_tenant().';
COMMENT ON FUNCTION can_user_any(text[], uuid) IS
  'Returns true if the user has any of the specified permissions (OR logic).';
COMMENT ON FUNCTION can_user_all(text[], uuid) IS
  'Returns true if the user has all of the specified permissions (AND logic).';

COMMENT ON TABLE permission_actions IS
  'Standardized permission actions that can be reused across modules.';
COMMENT ON TABLE permission_bundles IS
  'Groups of permissions that can be assigned to roles as a bundle.';
COMMENT ON TABLE bundle_permissions IS
  'Mapping between permission bundles and individual permissions.';
COMMENT ON TABLE role_bundles IS
  'Mapping between roles and permission bundles.';