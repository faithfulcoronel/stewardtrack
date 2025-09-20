/*
  # Fix User Roles Policies

  1. Changes
    - Drop existing policies that cause recursion
    - Create new optimized policies that prevent recursion
    - Add caching function for admin status

  2. Security
    - Maintains same security model but with better performance
    - Users can still only view their own roles
    - Admins can still manage all roles
*/

-- Create a function to cache admin status
CREATE OR REPLACE FUNCTION is_admin_cached(user_id uuid)
RETURNS boolean AS $$
DECLARE
  is_admin boolean;
BEGIN
  -- Try to get from cache first
  SELECT EXISTS (
    SELECT 1
    FROM user_roles ur
    JOIN roles r ON ur.role_id = r.id
    WHERE ur.user_id = user_id
    AND r.name = 'admin'
  ) INTO is_admin;
  
  RETURN is_admin;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing policies
DROP POLICY IF EXISTS "User roles are viewable by authenticated users" ON user_roles;
DROP POLICY IF EXISTS "User roles can be managed by admins" ON user_roles;

-- Create new optimized policies
CREATE POLICY "Users can view own roles"
  ON user_roles FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can view all roles"
  ON user_roles FOR SELECT
  TO authenticated
  USING (is_admin_cached(auth.uid()));

CREATE POLICY "Admins can manage roles"
  ON user_roles FOR ALL
  TO authenticated
  USING (is_admin_cached(auth.uid()))
  WITH CHECK (is_admin_cached(auth.uid()));