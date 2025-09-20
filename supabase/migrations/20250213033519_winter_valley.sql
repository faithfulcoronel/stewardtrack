-- Add birthday column to members table
ALTER TABLE members
ADD COLUMN IF NOT EXISTS birthday date;

-- Add index for faster queries on birthday
CREATE INDEX IF NOT EXISTS members_birthday_idx ON members(birthday);

-- Add comment explaining birthday field
COMMENT ON COLUMN members.birthday IS 
  'The member''s date of birth. Used for age calculation and birthday notifications.';

-- Create function to handle new user role assignment
CREATE OR REPLACE FUNCTION handle_new_user_role()
RETURNS TRIGGER AS $$
DECLARE
  admin_role_id uuid;
  member_role_id uuid;
  user_count int;
BEGIN
  -- Get the total number of users
  SELECT COUNT(*) INTO user_count FROM auth.users;
  
  -- Get the member role ID
  SELECT id INTO member_role_id FROM roles WHERE name = 'member';
  
  -- If this is the first user, make them an admin
  IF user_count = 1 THEN
    -- Get the admin role ID
    SELECT id INTO admin_role_id FROM roles WHERE name = 'admin';
    
    -- Assign admin role to the user
    INSERT INTO user_roles (user_id, role_id, created_by)
    VALUES (NEW.id, admin_role_id, NEW.id);
  END IF;
  
  -- Always assign member role to new users
  IF member_role_id IS NOT NULL THEN
    INSERT INTO user_roles (user_id, role_id, created_by)
    VALUES (NEW.id, member_role_id, NEW.id)
    ON CONFLICT DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS assign_first_user_admin ON auth.users;

-- Create new trigger for user role assignment
CREATE TRIGGER assign_user_roles
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user_role();