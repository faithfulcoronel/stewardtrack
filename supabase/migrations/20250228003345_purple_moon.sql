-- Create new migration file: supabase/migrations/20250228003345_purple_moon.sql

-- Drop existing RLS policies
DROP POLICY IF EXISTS "Categories are viewable by tenant users" ON categories;
DROP POLICY IF EXISTS "Categories can be managed by tenant admins" ON categories;

CREATE POLICY "Categories can be managed by authenticated users"
  ON categories FOR SELECT
  TO authenticated
  USING (
    true
  );

-- Add helpful comments
COMMENT ON POLICY "Categories can be managed by authenticated users" ON categories IS
  'Users can view categories within their tenant';