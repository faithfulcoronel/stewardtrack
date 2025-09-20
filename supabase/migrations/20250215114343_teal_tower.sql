-- Create function to handle new tenant registration
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

  -- Create tenant_user relationship with appropriate role
  INSERT INTO tenant_users (
    tenant_id,
    user_id,
    admin_role,
    created_by
  ) VALUES (
    new_tenant_id,
    p_user_id,
    CASE 
      WHEN is_first_user THEN 'super_admin'::admin_role_type
      ELSE 'tenant_admin'::admin_role_type
    END,
    p_user_id
  );

  RETURN new_tenant_id;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION handle_new_tenant_registration(uuid, text, text, text, text, text, text) TO authenticated;

-- Add helpful comment
COMMENT ON FUNCTION handle_new_tenant_registration IS
  'Handles new tenant registration with proper role assignment. First user becomes super_admin, subsequent users become tenant_admin';