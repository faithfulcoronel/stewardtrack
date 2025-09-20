-- Drop existing RLS policies for members
DROP POLICY IF EXISTS "Members are viewable by authenticated users" ON members;
DROP POLICY IF EXISTS "Members can be created by authenticated users" ON members;
DROP POLICY IF EXISTS "Members can be updated by authenticated users" ON members;
DROP POLICY IF EXISTS "Members can be deleted by authenticated users" ON members;

-- Create simplified RLS policies for members
CREATE POLICY "Members can be managed by authenticated users"
  ON members FOR SELECT
  TO authenticated
  USING (
    true
  );

-- Add helpful comments
COMMENT ON POLICY "Members can be managed by authenticated users" ON members IS
  'Authenticated users can manage members';