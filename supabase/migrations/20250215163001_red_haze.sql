-- Create function to handle user creation with proper tenant and role assignment
CREATE OR REPLACE FUNCTION handle_user_creation(
  p_email text,
  p_password text,
  p_tenant_id uuid,
  p_roles text[] DEFAULT NULL,
  p_first_name text DEFAULT NULL,
  p_last_name text DEFAULT NULL
)
RETURNS jsonb
SECURITY DEFINER
SET search_path = auth, public, extensions
LANGUAGE plpgsql
AS $$
DECLARE
  new_user_id uuid;
  instance_id uuid;
  member_role_id uuid;
  result jsonb;
  password_hash text;
BEGIN
  -- Check if user has admin permissions
  IF NOT (SELECT is_admin()) THEN
    RAISE EXCEPTION 'Only administrators can create users';
  END IF;

  -- Get instance ID
  SELECT u.instance_id INTO instance_id 
  FROM auth.users u 
  LIMIT 1;

  IF instance_id IS NULL THEN
    instance_id := '00000000-0000-0000-0000-000000000000'::uuid;
  END IF;

  -- Generate new user ID
  SELECT gen_random_uuid() INTO new_user_id;

  -- Create password hash
  SELECT crypt(p_password, gen_salt('bf', 10)) INTO password_hash;

  -- Create user
  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    created_at,
    updated_at,
    raw_app_meta_data,
    raw_user_meta_data,
    is_super_admin,
    last_sign_in_at
  )
  VALUES (
    instance_id,
    new_user_id,
    'authenticated',
    'authenticated',
    p_email,
    password_hash,
    now(),
    now(),
    now(),
    jsonb_build_object(
      'provider', 'email',
      'providers', ARRAY['email']
    ),
    jsonb_build_object(
      'first_name', COALESCE(p_first_name, split_part(p_email, '@', 1)),
      'last_name', COALESCE(p_last_name, '')
    ),
    false,
    now()
  )
  RETURNING jsonb_build_object(
    'id', id,
    'email', email,
    'created_at', created_at
  ) INTO result;

  -- Get member role ID
  SELECT id INTO member_role_id 
  FROM roles 
  WHERE name = 'member';

  -- Assign member role
  INSERT INTO user_roles (user_id, role_id, created_by)
  VALUES (new_user_id, member_role_id, auth.uid())
  ON CONFLICT DO NOTHING;

  -- Assign additional roles if provided
  IF p_roles IS NOT NULL THEN
    INSERT INTO user_roles (user_id, role_id, created_by)
    SELECT 
      new_user_id,
      r.id,
      auth.uid()
    FROM unnest(p_roles) role_name
    JOIN roles r ON r.name = role_name
    WHERE r.id != member_role_id
    ON CONFLICT DO NOTHING;
  END IF;

  -- Add to tenant
  INSERT INTO tenant_users (
    tenant_id,
    user_id,
    admin_role,
    created_by
  )
  VALUES (
    p_tenant_id,
    new_user_id,
    CASE 
      WHEN p_roles && ARRAY['admin'] THEN 'tenant_admin'
      ELSE 'member'
    END,
    auth.uid()
  );

  -- Create member profile
  INSERT INTO members (
    tenant_id,
    first_name,
    last_name,
    email,
    contact_number,
    address,
    membership_type,
    status,
    membership_date
  )
  VALUES (
    p_tenant_id,
    COALESCE(p_first_name, split_part(p_email, '@', 1)),
    COALESCE(p_last_name, ''),
    p_email,
    'Not provided',
    'Not provided',
    'non_member',
    'inactive',
    CURRENT_DATE
  );

  RETURN result;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION handle_user_creation(text, text, uuid, text[], text, text) TO authenticated;

-- Add helpful comment
COMMENT ON FUNCTION handle_user_creation IS 
  'Creates a new user with proper role assignments, tenant association, and member profile';