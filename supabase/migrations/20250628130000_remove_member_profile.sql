-- Remove automatic member profile creation when adding users
DROP FUNCTION IF EXISTS handle_user_creation(text, text, uuid, text[], text, text, admin_role_type);

CREATE OR REPLACE FUNCTION handle_user_creation(
  p_email text,
  p_password text,
  p_tenant_id uuid,
  p_roles text[],
  p_first_name text,
  p_last_name text,
  p_admin_role admin_role_type
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
  invitation_token text;
  tenant_name text;
BEGIN
  -- Check if user has admin permissions
  IF NOT EXISTS (
    SELECT 1 FROM tenant_users
    WHERE tenant_id = p_tenant_id
    AND user_id = auth.uid()
    AND admin_role IN ('super_admin', 'tenant_admin')
  ) THEN
    RAISE EXCEPTION 'Only tenant administrators can create users';
  END IF;

  -- Check if email already exists
  IF EXISTS (
    SELECT 1 FROM auth.users
    WHERE email = p_email
  ) THEN
    RAISE EXCEPTION 'Email address is already in use';
  END IF;

  -- Get tenant name
  SELECT name INTO tenant_name
  FROM tenants
  WHERE id = p_tenant_id;

  -- Generate secure invitation token
  SELECT encode(gen_random_bytes(32), 'base64') INTO invitation_token;

  -- Create invitation record
  INSERT INTO email_invitations (
    email,
    token,
    tenant_id,
    created_by,
    expires_at,
    admin_role,
    first_name,
    last_name
  ) VALUES (
    p_email,
    invitation_token,
    p_tenant_id,
    auth.uid(),
    now() + interval '7 days',
    p_admin_role,
    p_first_name,
    p_last_name
  );

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
      'first_name', p_first_name,
      'last_name', p_last_name
    ),
    false,
    now()
  )
  RETURNING jsonb_build_object(
    'id', id,
    'email', email,
    'created_at', created_at,
    'invitation_token', invitation_token
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

  -- Add to tenant with specified admin role
  INSERT INTO tenant_users (
    tenant_id,
    user_id,
    admin_role,
    created_by
  )
  VALUES (
    p_tenant_id,
    new_user_id,
    p_admin_role,
    auth.uid()
  );

  -- Send invitation email
  PERFORM send_invitation_email(
    p_email,
    invitation_token,
    tenant_name,
    p_first_name
  );

  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION handle_user_creation(text, text, uuid, text[], text, text, admin_role_type) TO authenticated;

COMMENT ON FUNCTION handle_user_creation IS
  'Creates a new user with proper role assignments, tenant association, checks for duplicate email, and sends invitation email.';
