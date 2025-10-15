-- =====================================================================================
-- MIGRATION: Create Feature Permissions Table
-- =====================================================================================
-- Creates feature_permissions table to define required permissions (rights) for each feature
-- E.g., members:view, members:create, finance:delete
--
-- Part of: Feature Creation with Surface ID & Permission Definition
-- Phase: 1 (Foundation)
-- =====================================================================================

BEGIN;

-- Feature permissions define what rights are needed to use a feature
CREATE TABLE feature_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  feature_id uuid NOT NULL REFERENCES feature_catalog(id) ON DELETE CASCADE,
  permission_code text NOT NULL,
  display_name text NOT NULL,
  description text,
  category text NOT NULL,
  action text NOT NULL,
  is_required boolean DEFAULT true,
  display_order integer DEFAULT 0,
  created_by uuid REFERENCES auth.users(id),
  updated_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),

  -- One permission per feature (prevent duplicates)
  UNIQUE (feature_id, permission_code),

  -- Enforce permission code format: {category}:{action} (lowercase, underscores)
  CHECK (permission_code ~ '^[a-z_]+:[a-z_]+$')
);

-- Indexes for performance
CREATE INDEX feature_permissions_feature_id_idx
  ON feature_permissions(feature_id);

CREATE INDEX feature_permissions_permission_code_idx
  ON feature_permissions(permission_code);

CREATE INDEX feature_permissions_category_idx
  ON feature_permissions(category);

CREATE INDEX feature_permissions_category_action_idx
  ON feature_permissions(category, action);

-- Enable RLS
ALTER TABLE feature_permissions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Super admins can view all feature permissions (global resources)
CREATE POLICY "Feature permissions viewable by super admins"
  ON feature_permissions FOR SELECT
  TO authenticated
  USING (get_user_admin_role() = 'super_admin');

-- Only super admins can manage feature permissions
CREATE POLICY "Feature permissions manageable by super admins"
  ON feature_permissions FOR ALL
  TO authenticated
  USING (get_user_admin_role() = 'super_admin')
  WITH CHECK (get_user_admin_role() = 'super_admin');

-- Trigger for updated_at
CREATE TRIGGER update_feature_permissions_updated_at
BEFORE UPDATE ON feature_permissions
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Comments for documentation
COMMENT ON TABLE feature_permissions IS
  'Defines required permissions (rights) for each feature. Product Owners define permissions when creating features. E.g., members:view, finance:delete.';

COMMENT ON COLUMN feature_permissions.feature_id IS
  'The feature this permission belongs to (links to feature_catalog).';

COMMENT ON COLUMN feature_permissions.permission_code IS
  'Permission code in format {category}:{action}, e.g., members:view, finance:delete. Must be lowercase with underscores.';

COMMENT ON COLUMN feature_permissions.display_name IS
  'Human-readable name shown in UI (e.g., "View Members", "Delete Financial Records").';

COMMENT ON COLUMN feature_permissions.description IS
  'Detailed description of what this permission allows users to do.';

COMMENT ON COLUMN feature_permissions.category IS
  'Category extracted from permission code (the part before colon). E.g., "members", "finance".';

COMMENT ON COLUMN feature_permissions.action IS
  'Action extracted from permission code (the part after colon). E.g., "view", "create", "delete".';

COMMENT ON COLUMN feature_permissions.is_required IS
  'Whether this permission is required (vs optional) for the feature to function. Required permissions must always be granted.';

COMMENT ON COLUMN feature_permissions.display_order IS
  'Order in which permissions should be displayed in UI (lower numbers first).';

COMMIT;
