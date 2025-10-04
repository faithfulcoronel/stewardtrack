-- License feature bundles table for licensing management
-- Allows grouping features into reusable bundles for product configuration

BEGIN;

-- License feature bundles - reusable groupings of features
CREATE TABLE IF NOT EXISTS license_feature_bundles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  bundle_type text NOT NULL CHECK (bundle_type IN ('core', 'add-on', 'module', 'custom')),
  category text NOT NULL DEFAULT 'general',
  is_active boolean DEFAULT true,
  is_system boolean DEFAULT false,
  sort_order integer DEFAULT 0,
  metadata jsonb DEFAULT '{}',
  created_by uuid REFERENCES auth.users(id),
  updated_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  deleted_at timestamptz
);

-- Feature bundle items - maps features to bundles (many-to-many)
CREATE TABLE IF NOT EXISTS license_feature_bundle_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bundle_id uuid NOT NULL REFERENCES license_feature_bundles(id) ON DELETE CASCADE,
  feature_id uuid NOT NULL REFERENCES feature_catalog(id) ON DELETE CASCADE,
  is_required boolean DEFAULT true,
  display_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  UNIQUE (bundle_id, feature_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS license_feature_bundles_code_idx ON license_feature_bundles(code);
CREATE INDEX IF NOT EXISTS license_feature_bundles_bundle_type_idx ON license_feature_bundles(bundle_type);
CREATE INDEX IF NOT EXISTS license_feature_bundles_category_idx ON license_feature_bundles(category);
CREATE INDEX IF NOT EXISTS license_feature_bundles_is_active_idx ON license_feature_bundles(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS license_feature_bundles_deleted_at_idx ON license_feature_bundles(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS license_feature_bundle_items_bundle_id_idx ON license_feature_bundle_items(bundle_id);
CREATE INDEX IF NOT EXISTS license_feature_bundle_items_feature_id_idx ON license_feature_bundle_items(feature_id);

-- Enable RLS
ALTER TABLE license_feature_bundles ENABLE ROW LEVEL SECURITY;
ALTER TABLE license_feature_bundle_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies - Bundles are globally viewable, but only admins can manage
CREATE POLICY "License feature bundles are viewable by authenticated users" ON license_feature_bundles
  FOR SELECT TO authenticated
  USING (deleted_at IS NULL AND is_active = true);

CREATE POLICY "License feature bundles can be managed by system admins" ON license_feature_bundles
  FOR ALL TO authenticated
  USING (deleted_at IS NULL)
  WITH CHECK (true);

CREATE POLICY "License feature bundle items are viewable by authenticated users" ON license_feature_bundle_items
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "License feature bundle items can be managed by system admins" ON license_feature_bundle_items
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

-- Updated at triggers
CREATE TRIGGER update_license_feature_bundles_updated_at
BEFORE UPDATE ON license_feature_bundles
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Comments for documentation
COMMENT ON TABLE license_feature_bundles IS 'Reusable groupings of features that can be assigned to product offerings.';
COMMENT ON TABLE license_feature_bundle_items IS 'Maps individual features to feature bundles.';
COMMENT ON COLUMN license_feature_bundles.bundle_type IS 'Type of bundle: core (base functionality), add-on (optional enhancement), module (functional area), or custom (tenant-specific).';
COMMENT ON COLUMN license_feature_bundles.category IS 'Functional category: members, finance, rbac, communication, reports, etc.';
COMMENT ON COLUMN license_feature_bundles.is_system IS 'System bundles are managed by platform and cannot be deleted by tenants.';
COMMENT ON COLUMN license_feature_bundles.metadata IS 'Additional bundle configuration as JSON.';
COMMENT ON COLUMN license_feature_bundle_items.is_required IS 'Whether this feature is required for the bundle to function properly.';
COMMENT ON COLUMN license_feature_bundle_items.display_order IS 'Order in which features should be displayed within the bundle.';

-- Seed initial feature bundles
INSERT INTO license_feature_bundles (code, name, description, bundle_type, category, is_system, sort_order)
VALUES
  ('core-foundation', 'Core Foundation', 'Essential platform features required for all deployments.', 'core', 'core', true, 1),
  ('member-management', 'Member Management', 'Complete member lifecycle management and family relationships.', 'module', 'members', true, 2),
  ('financial-management', 'Financial Management', 'Comprehensive church financial tracking and reporting.', 'module', 'finance', true, 3),
  ('rbac-security', 'RBAC & Security', 'Advanced role-based access control and permission management.', 'module', 'rbac', true, 4),
  ('communication-tools', 'Communication Tools', 'Messaging, announcements, and member communication features.', 'add-on', 'communication', true, 5),
  ('advanced-reporting', 'Advanced Reporting', 'Enhanced analytics and custom report generation.', 'add-on', 'reports', true, 6),
  ('multi-campus', 'Multi-Campus Management', 'Features for managing multiple campuses and delegated access.', 'add-on', 'delegation', true, 7)
ON CONFLICT (code) DO NOTHING;

-- Map features to bundles
-- Core Foundation bundle
INSERT INTO license_feature_bundle_items (bundle_id, feature_id, is_required, display_order)
SELECT
  lfb.id,
  fc.id,
  true,
  ROW_NUMBER() OVER (ORDER BY fc.code)
FROM license_feature_bundles lfb
CROSS JOIN feature_catalog fc
WHERE lfb.code = 'core-foundation'
  AND fc.category = 'core'
  AND fc.phase = 'ga'
ON CONFLICT (bundle_id, feature_id) DO NOTHING;

-- Member Management bundle
INSERT INTO license_feature_bundle_items (bundle_id, feature_id, is_required, display_order)
SELECT
  lfb.id,
  fc.id,
  true,
  ROW_NUMBER() OVER (ORDER BY fc.code)
FROM license_feature_bundles lfb
CROSS JOIN feature_catalog fc
WHERE lfb.code = 'member-management'
  AND fc.category = 'members'
  AND fc.phase IN ('ga', 'beta')
ON CONFLICT (bundle_id, feature_id) DO NOTHING;

-- Financial Management bundle
INSERT INTO license_feature_bundle_items (bundle_id, feature_id, is_required, display_order)
SELECT
  lfb.id,
  fc.id,
  true,
  ROW_NUMBER() OVER (ORDER BY fc.code)
FROM license_feature_bundles lfb
CROSS JOIN feature_catalog fc
WHERE lfb.code = 'financial-management'
  AND fc.category = 'finance'
  AND fc.phase IN ('ga', 'beta')
ON CONFLICT (bundle_id, feature_id) DO NOTHING;

-- RBAC & Security bundle
INSERT INTO license_feature_bundle_items (bundle_id, feature_id, is_required, display_order)
SELECT
  lfb.id,
  fc.id,
  true,
  ROW_NUMBER() OVER (ORDER BY fc.code)
FROM license_feature_bundles lfb
CROSS JOIN feature_catalog fc
WHERE lfb.code = 'rbac-security'
  AND fc.category = 'rbac'
  AND fc.is_active = true
ON CONFLICT (bundle_id, feature_id) DO NOTHING;

-- Multi-Campus bundle (delegatable features)
INSERT INTO license_feature_bundle_items (bundle_id, feature_id, is_required, display_order)
SELECT
  lfb.id,
  fc.id,
  true,
  ROW_NUMBER() OVER (ORDER BY fc.code)
FROM license_feature_bundles lfb
CROSS JOIN feature_catalog fc
WHERE lfb.code = 'multi-campus'
  AND fc.is_delegatable = true
  AND fc.is_active = true
ON CONFLICT (bundle_id, feature_id) DO NOTHING;

COMMIT;
