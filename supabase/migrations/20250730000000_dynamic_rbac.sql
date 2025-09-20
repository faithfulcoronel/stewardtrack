/*
  # StewardTrack Dynamic Tenant RBAC

  This migration introduces tenant scoped roles and permissions. All RBAC tables
  include a `tenant_id` column and are protected by RLS policies utilising the
  existing `check_tenant_access` helper.
*/

-- Add tenant scoped columns to existing roles table
ALTER TABLE roles
  ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES tenants(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS updated_by uuid REFERENCES auth.users(id);

-- Ensure role names are unique per tenant
ALTER TABLE roles DROP CONSTRAINT IF EXISTS roles_name_key;
ALTER TABLE roles ADD CONSTRAINT roles_tenant_name_key UNIQUE (tenant_id, name);

ALTER TABLE permissions
  ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES tenants(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS action text,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS updated_by uuid REFERENCES auth.users(id);

ALTER TABLE permissions DROP CONSTRAINT IF EXISTS permissions_code_key;
ALTER TABLE permissions ADD CONSTRAINT permissions_tenant_code_key UNIQUE (tenant_id, code);

ALTER TABLE user_roles
  ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES tenants(id) ON DELETE CASCADE;

-- Role permissions mapping
ALTER TABLE role_permissions
  ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES tenants(id) ON DELETE CASCADE;

-- Optional role inheritance
CREATE TABLE IF NOT EXISTS role_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES tenants(id) ON DELETE CASCADE,
  parent_role_id uuid REFERENCES roles(id) ON DELETE CASCADE,
  child_role_id uuid REFERENCES roles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE (tenant_id, parent_role_id, child_role_id)
);

-- Enable RLS
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_groups ENABLE ROW LEVEL SECURITY;

-- RLS policies scoped to tenant
CREATE POLICY "Roles accessible within tenant" ON roles
  FOR ALL TO authenticated
  USING (check_tenant_access(tenant_id))
  WITH CHECK (check_tenant_access(tenant_id));

CREATE POLICY "Permissions accessible within tenant" ON permissions
  FOR ALL TO authenticated
  USING (check_tenant_access(tenant_id))
  WITH CHECK (check_tenant_access(tenant_id));

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

-- Example seed permissions
INSERT INTO permissions (tenant_id, code, name, module, action, description)
VALUES
  (NULL, 'user:view', 'View Users', 'user', 'view', 'View user list'),
  (NULL, 'user:create', 'Create Users', 'user', 'create', 'Create new user'),
  (NULL, 'role:view', 'View Roles', 'role', 'view', 'View roles and permissions')
ON CONFLICT DO NOTHING;

-- Grant function for permission checks
CREATE OR REPLACE FUNCTION can_user(required_permission text)
RETURNS boolean
SECURITY DEFINER
SET search_path = public, auth
LANGUAGE plpgsql
AS $$
DECLARE
  current_tenant uuid;
BEGIN
  SELECT tenant_id INTO current_tenant
  FROM tenant_users
  WHERE user_id = auth.uid()
  LIMIT 1;

  IF current_tenant IS NULL THEN
    RETURN false;
  END IF;

  RETURN EXISTS (
    SELECT 1
    FROM user_roles ur
    JOIN role_permissions rp ON ur.role_id = rp.role_id
    JOIN permissions p ON rp.permission_id = p.id
    WHERE ur.user_id = auth.uid()
      AND ur.tenant_id = current_tenant
      AND rp.tenant_id = current_tenant
      AND p.code = required_permission
  );
END;
$$;

GRANT EXECUTE ON FUNCTION can_user(text) TO authenticated;

COMMENT ON FUNCTION can_user(text) IS
  'Returns true if the logged in user has the given permission within their tenant.';
