-- Enable auth schema access
GRANT USAGE ON SCHEMA auth TO authenticated;
GRANT USAGE ON SCHEMA auth TO anon;

-- Grant necessary permissions for authentication
GRANT SELECT, UPDATE ON TABLE auth.users TO authenticated;
GRANT SELECT ON TABLE auth.users TO anon;

-- Create function to handle user authentication
CREATE OR REPLACE FUNCTION handle_user_authentication()
RETURNS TRIGGER AS $$
BEGIN
  -- Ensure user has proper app metadata
  NEW.raw_app_meta_data = COALESCE(NEW.raw_app_meta_data, '{}'::jsonb) || 
    jsonb_build_object(
      'provider', 'email',
      'providers', ARRAY['email']
    );
    
  -- Ensure user has proper role
  NEW.role = 'authenticated';
  
  -- Set email confirmation if not set
  IF NEW.email_confirmed_at IS NULL THEN
    NEW.email_confirmed_at = now();
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user authentication
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  BEFORE INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_user_authentication();

-- Create function to verify user credentials
CREATE OR REPLACE FUNCTION verify_user_credentials(
  p_email text,
  p_password text
)
RETURNS jsonb
SECURITY DEFINER
SET search_path = auth, public
LANGUAGE plpgsql
AS $$
DECLARE
  user_data jsonb;
  stored_user auth.users%ROWTYPE;
BEGIN
  -- Get user by email
  SELECT * INTO stored_user
  FROM auth.users
  WHERE email = p_email
  AND deleted_at IS NULL;

  IF stored_user.id IS NULL THEN
    RETURN jsonb_build_object('error', 'Invalid email or password');
  END IF;

  -- Verify password
  IF NOT (stored_user.encrypted_password = crypt(p_password, stored_user.encrypted_password)) THEN
    RETURN jsonb_build_object('error', 'Invalid email or password');
  END IF;

  -- Return user data
  RETURN jsonb_build_object(
    'id', stored_user.id,
    'email', stored_user.email,
    'role', stored_user.role,
    'last_sign_in', now()
  );
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION verify_user_credentials(text, text) TO anon;
GRANT EXECUTE ON FUNCTION verify_user_credentials(text, text) TO authenticated;

-- Add helpful comments
COMMENT ON FUNCTION handle_user_authentication IS
  'Ensures proper metadata and role assignment for new users';

COMMENT ON FUNCTION verify_user_credentials IS
  'Securely verifies user credentials during authentication';