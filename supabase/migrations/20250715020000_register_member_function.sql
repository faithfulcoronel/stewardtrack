-- Add register_member function for member self-registration
DROP FUNCTION IF EXISTS register_member(text, text, uuid, text, text);

-- Creates a user account, tenant_user relationship, member profile and assigns
-- the member role. Returns basic user information.
CREATE OR REPLACE FUNCTION register_member(
  p_email text,
  p_password text,
  p_tenant_id uuid,
  p_first_name text,
  p_last_name text
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
  v_member_type_id uuid;
  v_status_id uuid;
  v_member_id uuid;
BEGIN
  -- Ensure email is unique
  IF EXISTS (SELECT 1 FROM auth.users WHERE email = p_email) THEN
    RAISE EXCEPTION 'Email address is already in use';
  END IF;

  -- Determine instance id
  SELECT u.instance_id INTO instance_id FROM auth.users u LIMIT 1;
  IF instance_id IS NULL THEN
    instance_id := '00000000-0000-0000-0000-000000000000'::uuid;
  END IF;

  -- Generate ids and password hash
  SELECT gen_random_uuid() INTO new_user_id;
  SELECT crypt(p_password, gen_salt('bf', 10)) INTO password_hash;

  -- Create auth user
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
  ) VALUES (
    instance_id,
    new_user_id,
    'authenticated',
    'authenticated',
    p_email,
    password_hash,
    now(),
    now(),
    now(),
    jsonb_build_object('provider','email','providers',ARRAY['email']),
    jsonb_build_object('first_name',p_first_name,'last_name',p_last_name),
    false,
    now()
  ) RETURNING jsonb_build_object(
    'id', id,
    'email', email,
    'created_at', created_at
  ) INTO result;

  -- Member role id
  SELECT id INTO member_role_id FROM roles WHERE name = 'member';

  INSERT INTO user_roles (user_id, role_id, created_by)
  VALUES (new_user_id, member_role_id, new_user_id)
  ON CONFLICT DO NOTHING;


  -- Default membership type and status
  SELECT id INTO v_member_type_id
  FROM membership_type
  WHERE tenant_id = p_tenant_id AND code = 'non_member' AND deleted_at IS NULL
  LIMIT 1;

  SELECT id INTO v_status_id
  FROM membership_status
  WHERE tenant_id = p_tenant_id AND code = 'inactive' AND deleted_at IS NULL
  LIMIT 1;

  -- Member profile
  INSERT INTO members (
    tenant_id,
    first_name,
    last_name,
    email,
    contact_number,
    address,
    membership_type_id,
    membership_status_id,
    membership_date,
    created_by
  ) VALUES (
    p_tenant_id,
    COALESCE(p_first_name, split_part(p_email, '@', 1)),
    COALESCE(p_last_name, ''),
    p_email,
    'Not provided',
    'Not provided',
    v_member_type_id,
    v_status_id,

    CURRENT_DATE,
    new_user_id
  ) RETURNING id INTO v_member_id;

  -- Tenant relationship linked to member
  INSERT INTO tenant_users (tenant_id, user_id, admin_role, member_id, created_by)
  VALUES (p_tenant_id, new_user_id, 'member', v_member_id, new_user_id);

  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION register_member(text, text, uuid, text, text) TO anon, authenticated;

COMMENT ON FUNCTION register_member(text, text, uuid, text, text) IS
  'Registers a new member by creating an auth user, tenant mapping, member record and role assignment.';
