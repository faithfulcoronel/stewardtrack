-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS pgcrypto;

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

  -- Set last sign in time
  NEW.last_sign_in_at = now();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = auth, public;

-- Create trigger for new user authentication
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  BEFORE INSERT OR UPDATE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_user_authentication();

-- Create function to handle password verification
CREATE OR REPLACE FUNCTION verify_user_password(
  hashed_password text,
  password_attempt text
)
RETURNS boolean
SECURITY DEFINER
SET search_path = auth, public
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN hashed_password = crypt(password_attempt, hashed_password);
END;
$$;

-- Create function to handle user login
CREATE OR REPLACE FUNCTION handle_user_login(
  p_email text,
  p_password text
)
RETURNS jsonb
SECURITY DEFINER
SET search_path = auth, public
LANGUAGE plpgsql
AS $$
DECLARE
  user_data auth.users%ROWTYPE;
  result jsonb;
BEGIN
  -- Get user by email
  SELECT * INTO user_data
  FROM auth.users
  WHERE email = p_email
  AND deleted_at IS NULL;

  -- Check if user exists
  IF user_data.id IS NULL THEN
    RETURN jsonb_build_object('error', 'Invalid email or password');
  END IF;

  -- Verify password
  IF NOT verify_user_password(user_data.encrypted_password, p_password) THEN
    RETURN jsonb_build_object('error', 'Invalid email or password');
  END IF;

  -- Update last sign in
  UPDATE auth.users
  SET 
    last_sign_in_at = now(),
    updated_at = now()
  WHERE id = user_data.id;

  -- Return success response
  RETURN jsonb_build_object(
    'id', user_data.id,
    'email', user_data.email,
    'role', user_data.role,
    'last_sign_in', now(),
    'user_metadata', user_data.raw_user_meta_data,
    'app_metadata', user_data.raw_app_meta_data
  );
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION verify_user_password(text, text) TO anon;
GRANT EXECUTE ON FUNCTION verify_user_password(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION handle_user_login(text, text) TO anon;
GRANT EXECUTE ON FUNCTION handle_user_login(text, text) TO authenticated;

-- Add helpful comments
COMMENT ON FUNCTION handle_user_authentication IS
  'Ensures proper metadata, role assignment and email confirmation for users';

COMMENT ON FUNCTION verify_user_password IS
  'Securely verifies a password attempt against a hashed password';

COMMENT ON FUNCTION handle_user_login IS
  'Handles user login with proper password verification and session management';