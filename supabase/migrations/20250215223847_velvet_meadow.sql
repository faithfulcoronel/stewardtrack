-- Enable auth schema access
GRANT USAGE ON SCHEMA auth TO authenticated;
GRANT USAGE ON SCHEMA auth TO anon;

-- Grant necessary permissions for authentication
GRANT SELECT ON TABLE auth.users TO authenticated;
GRANT SELECT ON TABLE auth.users TO anon;

-- Create improved function to handle authentication
CREATE OR REPLACE FUNCTION handle_auth_user_changes()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for auth.users
DROP TRIGGER IF EXISTS on_auth_user_changes ON auth.users;
CREATE TRIGGER on_auth_user_changes
  BEFORE UPDATE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_auth_user_changes();

-- Create function to safely get user data
CREATE OR REPLACE FUNCTION get_auth_user(user_id uuid)
RETURNS jsonb
SECURITY DEFINER
SET search_path = auth, public
LANGUAGE plpgsql
AS $$
DECLARE
  user_data jsonb;
BEGIN
  SELECT jsonb_build_object(
    'id', id,
    'email', email,
    'created_at', created_at,
    'last_sign_in_at', last_sign_in_at,
    'raw_user_meta_data', raw_user_meta_data,
    'raw_app_meta_data', raw_app_meta_data
  )
  INTO user_data
  FROM auth.users
  WHERE id = user_id;

  RETURN user_data;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_auth_user(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION get_auth_user(uuid) TO anon;

-- Add helpful comments
COMMENT ON FUNCTION handle_auth_user_changes IS
  'Handles updates to auth.users table and maintains updated_at timestamp';

COMMENT ON FUNCTION get_auth_user IS
  'Safely retrieves user data from auth schema';