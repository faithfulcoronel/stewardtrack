-- =====================================================================================
-- MIGRATION: Fix Permission Role Templates RLS Policies
-- =====================================================================================
-- Updates permission_role_templates policies to mirror feature_permissions:
-- - Authenticated users can read
-- - Only super admins can insert, update, or delete
-- =====================================================================================

BEGIN;

-- Ensure RLS is enabled
ALTER TABLE permission_role_templates ENABLE ROW LEVEL SECURITY;

-- Remove legacy policies that only allowed super_admin SELECT/ALL
DROP POLICY IF EXISTS "Permission role templates viewable by super admins" ON permission_role_templates;
DROP POLICY IF EXISTS "Permission role templates manageable by super admins" ON permission_role_templates;
DROP POLICY IF EXISTS "Permission role templates readable" ON permission_role_templates;
DROP POLICY IF EXISTS "Permission role templates insertable by super admins" ON permission_role_templates;
DROP POLICY IF EXISTS "Permission role templates updatable by super admins" ON permission_role_templates;
DROP POLICY IF EXISTS "Permission role templates deletable by super admins" ON permission_role_templates;

-- Read: allow all authenticated users
CREATE POLICY "Permission role templates readable" ON permission_role_templates
  FOR SELECT TO authenticated
  USING (true);

-- Insert: restricted to super admins
CREATE POLICY "Permission role templates insertable by super admins" ON permission_role_templates
  FOR INSERT TO authenticated
  WITH CHECK (get_user_admin_role() = 'super_admin');

-- Update: restricted to super admins
CREATE POLICY "Permission role templates updatable by super admins" ON permission_role_templates
  FOR UPDATE TO authenticated
  USING (get_user_admin_role() = 'super_admin')
  WITH CHECK (get_user_admin_role() = 'super_admin');

-- Delete: restricted to super admins
CREATE POLICY "Permission role templates deletable by super admins" ON permission_role_templates
  FOR DELETE TO authenticated
  USING (get_user_admin_role() = 'super_admin');

-- Match feature_permissions grants so SELECT works with RLS
GRANT SELECT ON permission_role_templates TO authenticated;

COMMIT;
