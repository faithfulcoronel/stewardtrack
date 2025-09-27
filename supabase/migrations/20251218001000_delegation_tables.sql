-- Delegation system tables for RBAC
-- Creates tables to support delegation permission management, templates, and scopes

BEGIN;

-- Delegation scopes (campuses, ministries, departments)
CREATE TABLE delegation_scopes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name text NOT NULL,
  type text NOT NULL CHECK (type IN ('campus', 'ministry', 'department', 'program')),
  description text,
  parent_id uuid REFERENCES delegation_scopes(id) ON DELETE SET NULL,
  is_active boolean DEFAULT true,
  metadata jsonb DEFAULT '{}',
  created_by uuid REFERENCES auth.users(id),
  updated_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(tenant_id, name, type)
);

-- Delegation permissions - tracks who delegated what to whom
CREATE TABLE delegation_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  delegator_id uuid NOT NULL REFERENCES auth.users(id),
  delegatee_id uuid NOT NULL REFERENCES auth.users(id),
  scope_type text NOT NULL CHECK (scope_type IN ('campus', 'ministry', 'department', 'program')),
  scope_id uuid REFERENCES delegation_scopes(id) ON DELETE CASCADE,
  permissions text[] NOT NULL DEFAULT '{}',
  restrictions text[] DEFAULT '{}',
  expiry_date date,
  is_active boolean DEFAULT true,
  notes text,
  last_used_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(tenant_id, delegatee_id, scope_type, scope_id)
);

-- Delegation templates for common permission sets
CREATE TABLE delegation_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  scope_type text NOT NULL CHECK (scope_type IN ('campus', 'ministry', 'department', 'program')),
  permissions text[] NOT NULL DEFAULT '{}',
  restrictions text[] DEFAULT '{}',
  is_system boolean DEFAULT false,
  is_active boolean DEFAULT true,
  created_by uuid REFERENCES auth.users(id),
  updated_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(tenant_id, name, scope_type)
);

-- Insert default delegation scopes for existing tenants
INSERT INTO delegation_scopes (tenant_id, name, type, description, is_active)
SELECT
  t.id,
  'Main Campus',
  'campus',
  'Primary church campus',
  true
FROM tenants t
WHERE NOT EXISTS (
  SELECT 1 FROM delegation_scopes ds
  WHERE ds.tenant_id = t.id AND ds.name = 'Main Campus' AND ds.type = 'campus'
);

INSERT INTO delegation_scopes (tenant_id, name, type, description, parent_id, is_active)
SELECT
  t.id,
  scope_name,
  'ministry',
  scope_desc,
  (SELECT id FROM delegation_scopes WHERE tenant_id = t.id AND name = 'Main Campus' AND type = 'campus' LIMIT 1),
  true
FROM tenants t
CROSS JOIN (VALUES
  ('Youth Ministry', 'Youth programs and activities'),
  ('Worship Ministry', 'Music and worship services'),
  ('Children''s Ministry', 'Children''s programs and activities'),
  ('Finance', 'Financial management and reporting'),
  ('Volunteers', 'Volunteer coordination and management')
) AS ministries(scope_name, scope_desc)
WHERE NOT EXISTS (
  SELECT 1 FROM delegation_scopes ds
  WHERE ds.tenant_id = t.id AND ds.name = ministries.scope_name AND ds.type = 'ministry'
);

-- Insert system delegation templates
INSERT INTO delegation_templates (tenant_id, name, description, scope_type, permissions, is_system, is_active)
SELECT
  t.id,
  template_name,
  template_desc,
  template_scope,
  template_perms::text[],
  true,
  true
FROM tenants t
CROSS JOIN (VALUES
  ('Campus Manager', 'Full campus management permissions', 'campus', ARRAY['users.read', 'users.write', 'roles.read', 'roles.write', 'events.manage', 'reports.view']),
  ('Ministry Leader', 'Basic ministry leadership permissions', 'ministry', ARRAY['users.read', 'roles.read', 'events.read', 'communications.send']),
  ('Youth Pastor', 'Youth ministry specific permissions', 'ministry', ARRAY['users.read', 'users.write', 'events.manage', 'communications.send', 'reports.view']),
  ('Volunteer Coordinator', 'Volunteer management permissions', 'ministry', ARRAY['users.read', 'users.write', 'events.read', 'schedules.manage']),
  ('Finance Assistant', 'Limited financial permissions', 'ministry', ARRAY['reports.view', 'finance.read'])
) AS templates(template_name, template_desc, template_scope, template_perms)
WHERE NOT EXISTS (
  SELECT 1 FROM delegation_templates dt
  WHERE dt.tenant_id = t.id AND dt.name = templates.template_name
);

-- Indexes for performance
CREATE INDEX delegation_permissions_delegator_idx ON delegation_permissions(delegator_id);
CREATE INDEX delegation_permissions_delegatee_idx ON delegation_permissions(delegatee_id);
CREATE INDEX delegation_permissions_scope_idx ON delegation_permissions(scope_type, scope_id);
CREATE INDEX delegation_permissions_tenant_active_idx ON delegation_permissions(tenant_id, is_active);
CREATE INDEX delegation_scopes_tenant_type_idx ON delegation_scopes(tenant_id, type);
CREATE INDEX delegation_scopes_parent_idx ON delegation_scopes(parent_id);
CREATE INDEX delegation_templates_tenant_scope_idx ON delegation_templates(tenant_id, scope_type, is_active);

-- RLS policies
ALTER TABLE delegation_scopes ENABLE ROW LEVEL SECURITY;
ALTER TABLE delegation_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE delegation_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Delegation scopes accessible within tenant" ON delegation_scopes
  FOR ALL TO authenticated
  USING (check_tenant_access(tenant_id))
  WITH CHECK (check_tenant_access(tenant_id));

CREATE POLICY "Delegation permissions accessible within tenant" ON delegation_permissions
  FOR ALL TO authenticated
  USING (check_tenant_access(tenant_id))
  WITH CHECK (check_tenant_access(tenant_id));

CREATE POLICY "Delegation templates accessible within tenant" ON delegation_templates
  FOR ALL TO authenticated
  USING (check_tenant_access(tenant_id))
  WITH CHECK (check_tenant_access(tenant_id));

-- Updated_at triggers
CREATE TRIGGER update_delegation_scopes_updated_at
  BEFORE UPDATE ON delegation_scopes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_delegation_permissions_updated_at
  BEFORE UPDATE ON delegation_permissions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_delegation_templates_updated_at
  BEFORE UPDATE ON delegation_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Grants
GRANT SELECT, INSERT, UPDATE, DELETE ON delegation_scopes TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON delegation_permissions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON delegation_templates TO authenticated;

-- Comments
COMMENT ON TABLE delegation_scopes IS 'Hierarchical scopes (campus, ministry, department) for delegation boundaries';
COMMENT ON TABLE delegation_permissions IS 'Active delegation assignments with permissions and restrictions';
COMMENT ON TABLE delegation_templates IS 'Reusable templates for common delegation patterns';

COMMIT;