-- Create function to assign admin role to user
CREATE OR REPLACE FUNCTION assign_admin_role_to_user(
  p_user_id uuid,
  p_tenant_id uuid
)
RETURNS void
SECURITY DEFINER
SET search_path = public, auth
LANGUAGE plpgsql
AS $$
DECLARE
  admin_role_id uuid;
  member_role_id uuid;
BEGIN
  -- Get the admin role ID
  SELECT id INTO admin_role_id 
  FROM roles 
  WHERE name = 'admin';

  IF admin_role_id IS NULL THEN
    RAISE EXCEPTION 'Admin role not found';
  END IF;

  -- Get the member role ID
  SELECT id INTO member_role_id 
  FROM roles 
  WHERE name = 'member';

  IF member_role_id IS NULL THEN
    RAISE EXCEPTION 'Member role not found';
  END IF;

  -- Assign admin role
  INSERT INTO user_roles (user_id, role_id, created_by)
  VALUES (p_user_id, admin_role_id, p_user_id)
  ON CONFLICT DO NOTHING;

  -- Ensure member role is also assigned
  INSERT INTO user_roles (user_id, role_id, created_by)
  VALUES (p_user_id, member_role_id, p_user_id)
  ON CONFLICT DO NOTHING;

  -- Ensure tenant_users record exists with admin role
  INSERT INTO tenant_users (tenant_id, user_id, admin_role, created_by)
  VALUES (p_tenant_id, p_user_id, 'tenant_admin', p_user_id)
  ON CONFLICT (tenant_id, user_id) 
  DO UPDATE SET admin_role = 'tenant_admin';
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION assign_admin_role_to_user(uuid, uuid) TO authenticated;

-- Add helpful comment
COMMENT ON FUNCTION assign_admin_role_to_user IS
  'Assigns admin role to a user and ensures proper tenant admin access';

-- Modify handle_new_tenant_registration to use the new function
CREATE OR REPLACE FUNCTION handle_new_tenant_registration(
  p_user_id uuid,
  p_tenant_name text,
  p_tenant_subdomain text,
  p_tenant_address text,
  p_tenant_contact text,
  p_tenant_email text,
  p_tenant_website text
)
RETURNS uuid
SECURITY DEFINER
SET search_path = public, auth
LANGUAGE plpgsql
AS $$
DECLARE
  new_tenant_id uuid;
  user_count int;
  is_first_user boolean;
BEGIN
  -- Check if subdomain is already taken
  IF EXISTS (
    SELECT 1 FROM tenants 
    WHERE subdomain = p_tenant_subdomain
  ) THEN
    RAISE EXCEPTION 'Subdomain is already taken';
  END IF;

  -- Check if this is the first user
  SELECT COUNT(*) = 1 INTO is_first_user 
  FROM auth.users;

  -- Create the tenant
  INSERT INTO tenants (
    name,
    subdomain,
    address,
    contact_number,
    email,
    website,
    status,
    subscription_tier,
    subscription_status,
    created_by
  ) VALUES (
    p_tenant_name,
    p_tenant_subdomain,
    p_tenant_address,
    p_tenant_contact,
    p_tenant_email,
    p_tenant_website,
    'active',
    CASE WHEN is_first_user THEN 'system' ELSE 'free' END,
    'active',
    p_user_id
  )
  RETURNING id INTO new_tenant_id;

  -- Assign appropriate roles
  IF is_first_user THEN
    -- First user gets super admin
    INSERT INTO tenant_users (
      tenant_id,
      user_id,
      admin_role,
      created_by
    ) VALUES (
      new_tenant_id,
      p_user_id,
      'super_admin',
      p_user_id
    );
  ELSE
    -- Use the assign_admin_role_to_user function for regular tenant admins
    PERFORM assign_admin_role_to_user(p_user_id, new_tenant_id);
  END IF;

  -- Create member record for the user
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
  ) VALUES (
    new_tenant_id,
    split_part(p_tenant_email, '@', 1),
    '',
    p_tenant_email,
    p_tenant_contact,
    p_tenant_address,
    'baptism',
    'active',
    CURRENT_DATE
  );

  RETURN new_tenant_id;
EXCEPTION
  WHEN unique_violation THEN
    RAISE EXCEPTION 'Subdomain or email is already in use';
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Failed to create tenant: %', SQLERRM;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION handle_new_tenant_registration(uuid, text, text, text, text, text, text) TO authenticated;