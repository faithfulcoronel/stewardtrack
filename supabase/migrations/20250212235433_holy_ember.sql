-- Create a function to handle first user admin assignment
CREATE OR REPLACE FUNCTION handle_first_user_admin()
RETURNS TRIGGER AS $$
DECLARE
  admin_role_id uuid;
  user_count int;
BEGIN
  -- Get the total number of users
  SELECT COUNT(*) INTO user_count FROM auth.users;
  
  -- If this is the first user
  IF user_count = 1 THEN
    -- Get the admin role ID
    SELECT id INTO admin_role_id FROM roles WHERE name = 'admin';
    
    -- Assign admin role to the user
    INSERT INTO user_roles (user_id, role_id, created_by)
    VALUES (NEW.id, admin_role_id, NEW.id);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically assign admin role to first user
DROP TRIGGER IF EXISTS assign_first_user_admin ON auth.users;
CREATE TRIGGER assign_first_user_admin
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_first_user_admin();

-- If there's already one user but no admin, make them admin
DO $$
DECLARE
  first_user_id uuid;
  admin_role_id uuid;
  admin_exists boolean;
BEGIN
  -- Check if there's exactly one user and no admins
  SELECT 
    EXISTS (
      SELECT 1 
      FROM user_roles ur 
      JOIN roles r ON ur.role_id = r.id 
      WHERE r.name = 'admin'
    ) INTO admin_exists;

  IF NOT admin_exists THEN
    -- Get the first user
    SELECT id INTO first_user_id 
    FROM auth.users 
    ORDER BY created_at 
    LIMIT 1;

    -- Get admin role
    SELECT id INTO admin_role_id 
    FROM roles 
    WHERE name = 'admin';

    -- If we found both user and role, assign admin
    IF first_user_id IS NOT NULL AND admin_role_id IS NOT NULL THEN
      INSERT INTO user_roles (user_id, role_id, created_by)
      VALUES (first_user_id, admin_role_id, first_user_id)
      ON CONFLICT DO NOTHING;
    END IF;
  END IF;
END $$;