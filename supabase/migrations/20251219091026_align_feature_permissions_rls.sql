-- =====================================================================================
-- MIGRATION: Align feature_permissions RLS with feature_catalog
-- =====================================================================================
-- Updates feature_permissions policies to mirror feature_catalog:
-- - Authenticated users can read
-- - Only super admins can insert, update, or delete
-- =====================================================================================

BEGIN;

-- Ensure RLS is enabled
ALTER TABLE feature_permissions ENABLE ROW LEVEL SECURITY;

-- Remove legacy policies that only allowed super_admin SELECT/ALL
DROP POLICY IF EXISTS "Feature permissions viewable by super admins" ON feature_permissions;
DROP POLICY IF EXISTS "Feature permissions manageable by super admins" ON feature_permissions;

-- Read: allow all authenticated users
CREATE POLICY "Feature permissions readable" ON feature_permissions
  FOR SELECT TO authenticated
  USING (true);

-- Insert: restricted to super admins
CREATE POLICY "Feature permissions insertable by super admins" ON feature_permissions
  FOR INSERT TO authenticated
  WITH CHECK (get_user_admin_role() = 'super_admin');

-- Update: restricted to super admins
CREATE POLICY "Feature permissions updatable by super admins" ON feature_permissions
  FOR UPDATE TO authenticated
  USING (get_user_admin_role() = 'super_admin')
  WITH CHECK (get_user_admin_role() = 'super_admin');

-- Delete: restricted to super admins
CREATE POLICY "Feature permissions deletable by super admins" ON feature_permissions
  FOR DELETE TO authenticated
  USING (get_user_admin_role() = 'super_admin');

-- Match feature_catalog grants so SELECT works with RLS
GRANT SELECT ON feature_permissions TO authenticated;

COMMIT;
