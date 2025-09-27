-- RBAC Enhancements for Multi-Role System
-- This migration adds missing features for comprehensive RBAC

-- Add is_delegatable column to roles table (if not exists)
ALTER TABLE roles ADD COLUMN IF NOT EXISTS is_delegatable boolean DEFAULT false;
ALTER TABLE roles ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;
ALTER TABLE roles ADD COLUMN IF NOT EXISTS priority integer DEFAULT 0;
ALTER TABLE roles ADD COLUMN IF NOT EXISTS inherit_permissions boolean DEFAULT false;

-- Add multi-role specific fields to user_roles
ALTER TABLE user_roles ADD COLUMN IF NOT EXISTS is_primary boolean DEFAULT false;
ALTER TABLE user_roles ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;
ALTER TABLE user_roles ADD COLUMN IF NOT EXISTS assigned_at timestamptz DEFAULT now();
ALTER TABLE user_roles ADD COLUMN IF NOT EXISTS expires_at timestamptz;
ALTER TABLE user_roles ADD COLUMN IF NOT EXISTS assigned_by uuid REFERENCES auth.users(id);

-- Create role hierarchies table for role inheritance
CREATE TABLE IF NOT EXISTS role_hierarchies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES tenants(id) ON DELETE CASCADE,
  parent_role_id uuid REFERENCES roles(id) ON DELETE CASCADE,
  child_role_id uuid REFERENCES roles(id) ON DELETE CASCADE,
  inheritance_type text DEFAULT 'inherit' CHECK (inheritance_type IN ('inherit', 'exclude', 'override')),
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  UNIQUE (tenant_id, parent_role_id, child_role_id)
);

-- Create role conflicts table to track potential conflicts
CREATE TABLE IF NOT EXISTS role_conflicts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES tenants(id) ON DELETE CASCADE,
  role1_id uuid REFERENCES roles(id) ON DELETE CASCADE,
  role2_id uuid REFERENCES roles(id) ON DELETE CASCADE,
  conflict_type text NOT NULL CHECK (conflict_type IN ('scope_mismatch', 'permission_overlap', 'access_escalation', 'resource_conflict')),
  severity text NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  description text,
  auto_detected boolean DEFAULT true,
  resolved boolean DEFAULT false,
  resolved_at timestamptz,
  resolved_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  UNIQUE (tenant_id, role1_id, role2_id, conflict_type)
);

-- Create user sessions table for tracking active role contexts
CREATE TABLE IF NOT EXISTS user_role_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES tenants(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  active_role_id uuid REFERENCES roles(id) ON DELETE CASCADE,
  session_token text,
  started_at timestamptz DEFAULT now(),
  last_activity timestamptz DEFAULT now(),
  expires_at timestamptz,
  is_active boolean DEFAULT true,
  context_data jsonb DEFAULT '{}',
  UNIQUE (tenant_id, user_id, session_token)
);

-- Create role templates for quick role creation
CREATE TABLE IF NOT EXISTS role_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES tenants(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  template_data jsonb NOT NULL,
  category text,
  is_public boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  updated_at timestamptz DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id),
  UNIQUE (tenant_id, name)
);

-- Add permission conditions for dynamic permissions
ALTER TABLE permissions ADD COLUMN IF NOT EXISTS conditions jsonb DEFAULT '{}';
ALTER TABLE permissions ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;
ALTER TABLE permissions ADD COLUMN IF NOT EXISTS requires_approval boolean DEFAULT false;

-- Add role assignment approval workflow
CREATE TABLE IF NOT EXISTS role_assignment_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES tenants(id) ON DELETE CASCADE,
  requested_user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  role_id uuid REFERENCES roles(id) ON DELETE CASCADE,
  requested_by uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  approver_id uuid REFERENCES auth.users(id),
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
  justification text,
  approval_notes text,
  expires_at timestamptz,
  created_at timestamptz DEFAULT now(),
  processed_at timestamptz,
  UNIQUE (tenant_id, requested_user_id, role_id, status) DEFERRABLE INITIALLY DEFERRED
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS roles_is_delegatable_idx ON roles(is_delegatable) WHERE is_delegatable = true;
CREATE INDEX IF NOT EXISTS roles_is_active_idx ON roles(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS roles_priority_idx ON roles(priority DESC);

CREATE INDEX IF NOT EXISTS user_roles_is_primary_idx ON user_roles(is_primary) WHERE is_primary = true;
CREATE INDEX IF NOT EXISTS user_roles_is_active_idx ON user_roles(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS user_roles_expires_at_idx ON user_roles(expires_at) WHERE expires_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS role_hierarchies_parent_idx ON role_hierarchies(parent_role_id);
CREATE INDEX IF NOT EXISTS role_hierarchies_child_idx ON role_hierarchies(child_role_id);
CREATE INDEX IF NOT EXISTS role_hierarchies_tenant_idx ON role_hierarchies(tenant_id);

CREATE INDEX IF NOT EXISTS role_conflicts_severity_idx ON role_conflicts(severity);
CREATE INDEX IF NOT EXISTS role_conflicts_resolved_idx ON role_conflicts(resolved) WHERE resolved = false;
CREATE INDEX IF NOT EXISTS role_conflicts_tenant_idx ON role_conflicts(tenant_id);

CREATE INDEX IF NOT EXISTS user_role_sessions_active_idx ON user_role_sessions(is_active, expires_at) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS user_role_sessions_user_idx ON user_role_sessions(user_id);
CREATE INDEX IF NOT EXISTS user_role_sessions_tenant_idx ON user_role_sessions(tenant_id);

CREATE INDEX IF NOT EXISTS role_templates_category_idx ON role_templates(category);
CREATE INDEX IF NOT EXISTS role_templates_public_idx ON role_templates(is_public) WHERE is_public = true;

CREATE INDEX IF NOT EXISTS permissions_is_active_idx ON permissions(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS permissions_requires_approval_idx ON permissions(requires_approval) WHERE requires_approval = true;

CREATE INDEX IF NOT EXISTS role_assignment_requests_status_idx ON role_assignment_requests(status);
CREATE INDEX IF NOT EXISTS role_assignment_requests_user_idx ON role_assignment_requests(requested_user_id);
CREATE INDEX IF NOT EXISTS role_assignment_requests_approver_idx ON role_assignment_requests(approver_id);

-- Update existing roles to be delegatable based on scope
UPDATE roles SET is_delegatable = true WHERE scope IN ('tenant', 'delegated') AND is_delegatable IS FALSE;

-- Insert some default permission actions if they don't exist
INSERT INTO permission_actions (code, name, description, module)
VALUES
  ('create', 'Create', 'Create new resources', 'core'),
  ('read', 'Read', 'View resources', 'core'),
  ('update', 'Update', 'Modify existing resources', 'core'),
  ('delete', 'Delete', 'Remove resources', 'core'),
  ('assign', 'Assign', 'Assign roles or permissions', 'rbac'),
  ('delegate', 'Delegate', 'Delegate permissions to others', 'rbac'),
  ('approve', 'Approve', 'Approve requests or actions', 'workflow'),
  ('admin', 'Admin', 'Administrative access', 'core')
ON CONFLICT (code) DO NOTHING;

-- Create a function to detect role conflicts automatically
CREATE OR REPLACE FUNCTION detect_role_conflicts()
RETURNS void AS $$
BEGIN
  -- Insert conflicts for roles with same scope (potential overlap)
  INSERT INTO role_conflicts (tenant_id, role1_id, role2_id, conflict_type, severity, description)
  SELECT DISTINCT
    r1.tenant_id,
    r1.id,
    r2.id,
    'permission_overlap',
    'medium',
    'Roles with same scope may have overlapping permissions'
  FROM roles r1
  JOIN roles r2 ON r1.tenant_id = r2.tenant_id
    AND r1.scope = r2.scope
    AND r1.id < r2.id
    AND r1.scope = 'system'
  WHERE r1.is_active = true AND r2.is_active = true
  ON CONFLICT DO NOTHING;

  -- Insert conflicts for system vs other scope combinations
  INSERT INTO role_conflicts (tenant_id, role1_id, role2_id, conflict_type, severity, description)
  SELECT DISTINCT
    r1.tenant_id,
    r1.id,
    r2.id,
    'scope_mismatch',
    'high',
    'System scope roles may conflict with other scopes'
  FROM roles r1
  JOIN roles r2 ON r1.tenant_id = r2.tenant_id
    AND r1.id != r2.id
  WHERE r1.scope = 'system' AND r2.scope != 'system'
    AND r1.is_active = true AND r2.is_active = true
  ON CONFLICT DO NOTHING;
END;
$$ LANGUAGE plpgsql;

-- Drop existing function first to avoid signature conflicts
DROP FUNCTION IF EXISTS get_user_effective_permissions(uuid, uuid);

-- Create a function to get user effective permissions
CREATE OR REPLACE FUNCTION get_user_effective_permissions(p_user_id uuid, p_tenant_id uuid)
RETURNS TABLE(permission_code text, permission_name text, module text, source_role text) AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT
    p.code,
    p.name,
    p.module,
    r.name as source_role
  FROM user_roles ur
  JOIN roles r ON ur.role_id = r.id
  JOIN role_permissions rp ON r.id = rp.role_id
  JOIN permissions p ON rp.permission_id = p.id
  WHERE ur.user_id = p_user_id
    AND ur.tenant_id = p_tenant_id
    AND ur.is_active = true
    AND r.is_active = true
    AND p.is_active = true
    AND (ur.expires_at IS NULL OR ur.expires_at > now())
  ORDER BY p.code, r.name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function to check if user can perform action
CREATE OR REPLACE FUNCTION user_can_perform(p_user_id uuid, p_tenant_id uuid, p_permission_code text)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM get_user_effective_permissions(p_user_id, p_tenant_id)
    WHERE permission_code = p_permission_code
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Run initial conflict detection
SELECT detect_role_conflicts();

-- Add some helpful comments
COMMENT ON TABLE role_hierarchies IS 'Defines role inheritance relationships for nested role structures';
COMMENT ON TABLE role_conflicts IS 'Tracks potential conflicts between roles in multi-role assignments';
COMMENT ON TABLE user_role_sessions IS 'Tracks active role contexts for users in multi-role scenarios';
COMMENT ON TABLE role_templates IS 'Predefined role templates for quick role creation';
COMMENT ON TABLE role_assignment_requests IS 'Approval workflow for role assignments requiring authorization';

COMMENT ON COLUMN roles.is_delegatable IS 'Whether this role can be assigned through delegation';
COMMENT ON COLUMN roles.priority IS 'Role priority for conflict resolution (higher number = higher priority)';
COMMENT ON COLUMN user_roles.is_primary IS 'Whether this is the users primary role';
COMMENT ON COLUMN user_roles.expires_at IS 'When this role assignment expires (null = never expires)';
COMMENT ON COLUMN permissions.conditions IS 'JSON conditions for dynamic permission evaluation';
COMMENT ON COLUMN permissions.requires_approval IS 'Whether granting this permission requires approval';