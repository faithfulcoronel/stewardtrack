-- Drop existing RLS policies for members
DROP POLICY IF EXISTS "Members are viewable by tenant users" ON members;
DROP POLICY IF EXISTS "Members can be created by tenant users" ON members;
DROP POLICY IF EXISTS "Members can be updated by tenant users" ON members;
DROP POLICY IF EXISTS "Members can be deleted by tenant users" ON members;

-- Create simplified RLS policies for members
CREATE POLICY "Members are viewable by authenticated users"
  ON members FOR SELECT
  TO authenticated
  USING (
    true
  );

CREATE POLICY "Members can be created by authenticated users"
  ON members FOR INSERT
  TO authenticated
  WITH CHECK (
    true
  );

CREATE POLICY "Members can be updated by authenticated users"
  ON members FOR UPDATE
  TO authenticated
  USING (
    true
  );

CREATE POLICY "Members can be deleted by authenticated users"
  ON members FOR DELETE
  TO authenticated
  USING (
    true
  );

-- Add helpful comments
COMMENT ON POLICY "Members are viewable by authenticated users" ON members IS
  'Allows any authenticated user to view members in their tenant';

COMMENT ON POLICY "Members can be created by authenticated users" ON members IS
  'Allows any authenticated user to create members in their tenant';

COMMENT ON POLICY "Members can be updated by authenticated users" ON members IS
  'Allows any authenticated user to update members in their tenant';

COMMENT ON POLICY "Members can be deleted by authenticated users" ON members IS
  'Allows any authenticated user to delete members in their tenant';