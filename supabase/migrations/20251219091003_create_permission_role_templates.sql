-- =====================================================================================
-- MIGRATION: Create Permission Role Templates Table
-- =====================================================================================
-- Creates permission_role_templates table to store default role assignments for permissions
-- Provides sensible defaults when tenants license features
--
-- Part of: Feature Creation with Surface ID & Permission Definition
-- Phase: 1 (Foundation)
-- =====================================================================================

BEGIN;

-- Permission role templates define default role assignments for permissions
CREATE TABLE permission_role_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  feature_permission_id uuid NOT NULL REFERENCES feature_permissions(id) ON DELETE CASCADE,
  role_key text NOT NULL,
  is_recommended boolean DEFAULT true,
  reason text,
  created_by uuid REFERENCES auth.users(id),
  updated_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),

  -- One template per permission-role combination
  UNIQUE (feature_permission_id, role_key)
);

-- Indexes for performance
CREATE INDEX permission_role_templates_feature_permission_id_idx
  ON permission_role_templates(feature_permission_id);

CREATE INDEX permission_role_templates_role_key_idx
  ON permission_role_templates(role_key);

-- Enable RLS
ALTER TABLE permission_role_templates ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Super admins can view all templates (global resources)
CREATE POLICY "Permission role templates viewable by super admins"
  ON permission_role_templates FOR SELECT
  TO authenticated
  USING (get_user_admin_role() = 'super_admin');

-- Only super admins can manage templates
CREATE POLICY "Permission role templates manageable by super admins"
  ON permission_role_templates FOR ALL
  TO authenticated
  USING (get_user_admin_role() = 'super_admin')
  WITH CHECK (get_user_admin_role() = 'super_admin');

-- Trigger for updated_at
CREATE TRIGGER update_permission_role_templates_updated_at
BEFORE UPDATE ON permission_role_templates
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Comments for documentation
COMMENT ON TABLE permission_role_templates IS
  'Default role assignments for permissions. Suggests which roles should have which permissions by default when a tenant licenses a feature. Tenant Admins can customize these assignments.';

COMMENT ON COLUMN permission_role_templates.feature_permission_id IS
  'The permission this template applies to (links to feature_permissions).';

COMMENT ON COLUMN permission_role_templates.role_key IS
  'Role key that should have this permission by default (e.g., tenant_admin, staff, volunteer). Corresponds to roles.key column.';

COMMENT ON COLUMN permission_role_templates.is_recommended IS
  'Whether this role assignment is recommended as a sensible default. UI can show recommended assignments differently.';

COMMENT ON COLUMN permission_role_templates.reason IS
  'Explanation for why this role should have this permission by default. Helps Tenant Admins understand the reasoning.';

COMMIT;
