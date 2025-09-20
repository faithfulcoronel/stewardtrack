-- Drop existing trigger
DROP TRIGGER IF EXISTS assign_user_roles ON auth.users;
DROP FUNCTION IF EXISTS handle_new_user_role();

-- Create improved function to handle new user role assignment
CREATE OR REPLACE FUNCTION handle_new_user_role()
RETURNS TRIGGER AS $$
DECLARE
  admin_role_id uuid;
  member_role_id uuid;
  user_count int;
  current_user_id uuid;
BEGIN
  -- Get the member role ID first
  SELECT id INTO member_role_id FROM roles WHERE name = 'member';
  IF member_role_id IS NULL THEN
    RAISE EXCEPTION 'Member role not found';
  END IF;

  -- Get the total number of users
  SELECT COUNT(*) INTO user_count FROM auth.users;
  
  -- Set current_user_id to the new user's ID
  current_user_id := NEW.id;
  
  -- If this is the first user, make them an admin
  IF user_count = 1 THEN
    -- Get the admin role ID
    SELECT id INTO admin_role_id FROM roles WHERE name = 'admin';
    IF admin_role_id IS NULL THEN
      RAISE EXCEPTION 'Admin role not found';
    END IF;
    
    -- Assign admin role to the user
    INSERT INTO user_roles (user_id, role_id, created_by)
    VALUES (current_user_id, admin_role_id, current_user_id);
  END IF;
  
  -- Always assign member role to new users
  INSERT INTO user_roles (user_id, role_id, created_by)
  VALUES (current_user_id, member_role_id, current_user_id)
  ON CONFLICT DO NOTHING;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error details
    RAISE WARNING 'Error in handle_new_user_role: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create new trigger for user role assignment
CREATE TRIGGER assign_user_roles
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user_role();

-- Ensure all existing users have member role
DO $$
DECLARE
  member_role_id uuid;
BEGIN
  -- Get member role ID
  SELECT id INTO member_role_id FROM roles WHERE name = 'member';
  
  -- Add member role to any users missing it
  INSERT INTO user_roles (user_id, role_id, created_by)
  SELECT 
    u.id as user_id,
    member_role_id as role_id,
    u.id as created_by
  FROM auth.users u
  WHERE NOT EXISTS (
    SELECT 1 FROM user_roles ur 
    WHERE ur.user_id = u.id 
    AND ur.role_id = member_role_id
  )
  ON CONFLICT DO NOTHING;
END $$;

-- Add helpful comments
COMMENT ON FUNCTION handle_new_user_role() IS 
  'Automatically assigns roles to new users. First user gets admin role, all users get member role.';