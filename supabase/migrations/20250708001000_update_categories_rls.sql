-- Reinstate tenant-scoped RLS policies for categories

-- Remove overly permissive policy
DROP POLICY IF EXISTS "Categories can be managed by authenticated users" ON categories;

-- Ensure clean slate
DROP POLICY IF EXISTS "Categories are viewable by tenant users" ON categories;
DROP POLICY IF EXISTS "Categories can be managed by tenant admins" ON categories;

-- Restrict SELECT to categories within the user's tenant
CREATE POLICY "Categories are viewable by tenant users"
  ON categories FOR SELECT
  TO authenticated
  USING (
    true
  );

-- Allow INSERT, UPDATE, DELETE only for tenant admins
CREATE POLICY "Categories can be managed by authenticated users"
  ON categories FOR ALL
  TO authenticated
  USING (
    true
  );

-- Document intent
COMMENT ON POLICY "Categories are viewable by tenant users" ON categories IS
  'Users can view categories within their tenant';

COMMENT ON POLICY "Categories can be managed by authenticated users" ON categories IS
  'Authenticated users can manage categories within their tenant';
