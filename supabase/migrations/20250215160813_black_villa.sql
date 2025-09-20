-- Drop existing materialized view if it exists
DROP MATERIALIZED VIEW IF EXISTS user_tenant_access CASCADE;

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

-- Add helpful comment
COMMENT ON FUNCTION handle_new_tenant_registration IS
  'Handles new tenant registration with proper role assignment and member creation';

-- Create function to get current tenant
CREATE OR REPLACE FUNCTION get_current_tenant()
RETURNS SETOF tenants
SECURITY DEFINER
SET search_path = public, auth
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  current_tenant_id uuid;
BEGIN
  -- Get current tenant ID
  SELECT t.id INTO current_tenant_id
  FROM tenants t
  JOIN tenant_users tu ON t.id = tu.tenant_id
  WHERE tu.user_id = auth.uid()
  AND tu.admin_role != 'super_admin'
  LIMIT 1;

  IF current_tenant_id IS NULL THEN
    -- If user is super_admin, get the first tenant
    SELECT t.id INTO current_tenant_id
    FROM tenants t
    JOIN tenant_users tu ON t.id = tu.tenant_id
    WHERE tu.user_id = auth.uid()
    LIMIT 1;
  END IF;

  RETURN QUERY
  SELECT t.*
  FROM tenants t
  WHERE t.id = current_tenant_id;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_current_tenant() TO authenticated;