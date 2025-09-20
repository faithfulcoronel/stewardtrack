-- Simplify tenant registration by removing prefilled data
DROP FUNCTION IF EXISTS handle_new_tenant_registration(uuid, text, text, text, text, text, text);

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
  is_first_user boolean;
BEGIN
  IF p_tenant_subdomain !~ '^[a-z0-9-]+$' THEN
    RAISE EXCEPTION 'Invalid subdomain format';
  END IF;

  IF EXISTS (SELECT 1 FROM tenants WHERE subdomain = p_tenant_subdomain FOR UPDATE) THEN
    RAISE EXCEPTION 'Subdomain is already in use';
  END IF;

  IF EXISTS (SELECT 1 FROM tenants WHERE email = p_tenant_email FOR UPDATE) THEN
    RAISE EXCEPTION 'Email is already in use';
  END IF;

  SELECT COUNT(*) = 1 INTO is_first_user FROM auth.users;

  INSERT INTO tenants (
    name, subdomain, address, contact_number, email, website, status,
    subscription_tier, subscription_status, created_by
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
  ) RETURNING id INTO new_tenant_id;

  -- Assign admin role and create tenant_users entry
  PERFORM assign_admin_role_to_user(p_user_id, new_tenant_id);

  -- Copy base menu items and permissions
  PERFORM create_default_menu_items_for_tenant(new_tenant_id, p_user_id);

  RETURN new_tenant_id;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Error in handle_new_tenant_registration: %', SQLERRM;
    RAISE;
END;
$$;

GRANT EXECUTE ON FUNCTION handle_new_tenant_registration(uuid, text, text, text, text, text, text) TO authenticated;

COMMENT ON FUNCTION handle_new_tenant_registration IS
  'Registers a tenant and assigns admin role without prepopulating sample data.';
