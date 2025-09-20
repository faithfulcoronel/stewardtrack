-- Drop existing policies
DROP POLICY IF EXISTS "User roles are viewable by authenticated users" ON user_roles;
DROP POLICY IF EXISTS "User roles can be managed by admins" ON user_roles;

-- Create new policies without recursion
CREATE POLICY "User roles are viewable by authenticated users"
  ON user_roles FOR SELECT
  TO authenticated
  USING (
    -- Users can view their own roles
    user_id = auth.uid() OR
    -- Admins can view all roles
    EXISTS (
      SELECT 1 FROM user_roles ur2
      WHERE ur2.user_id = auth.uid()
      AND ur2.role_id IN (SELECT id FROM roles WHERE name = 'admin')
    )
  );

CREATE POLICY "User roles can be managed by admins"
  ON user_roles FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur2
      WHERE ur2.user_id = auth.uid()
      AND ur2.role_id IN (SELECT id FROM roles WHERE name = 'admin')
    )
  );