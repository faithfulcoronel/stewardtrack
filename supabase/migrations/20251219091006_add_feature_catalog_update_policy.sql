-- =====================================================================================
-- MIGRATION: Add UPDATE/DELETE/INSERT policies to feature_catalog
-- =====================================================================================
-- Allows super admins to update, delete, and insert features in the catalog
-- =====================================================================================

BEGIN;

-- Enable RLS if not already enabled
ALTER TABLE feature_catalog ENABLE ROW LEVEL SECURITY;

-- Policy: Allow super admins to update features
CREATE POLICY "Feature catalog updatable by super admins" ON feature_catalog
  FOR UPDATE TO authenticated
  USING (get_user_admin_role() = 'super_admin')
  WITH CHECK (get_user_admin_role() = 'super_admin');

-- Policy: Allow super admins to delete features
CREATE POLICY "Feature catalog deletable by super admins" ON feature_catalog
  FOR DELETE TO authenticated
  USING (get_user_admin_role() = 'super_admin');

-- Policy: Allow super admins to insert features
CREATE POLICY "Feature catalog insertable by super admins" ON feature_catalog
  FOR INSERT TO authenticated
  WITH CHECK (get_user_admin_role() = 'super_admin');

COMMIT;
