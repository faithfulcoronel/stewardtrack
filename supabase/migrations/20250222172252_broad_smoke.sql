-- Drop existing function if it exists
DROP FUNCTION IF EXISTS handle_new_tenant_registration(uuid, text, text, text, text, text, text);

-- Create improved function with proper validation and transaction handling
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
  -- Start transaction
  BEGIN
    -- Input validation
    IF p_tenant_subdomain !~ '^[a-z0-9-]+$' THEN
      RAISE EXCEPTION 'Invalid subdomain format';
    END IF;

    -- Check for existing subdomain with FOR UPDATE to prevent race conditions
    IF EXISTS (
      SELECT 1 FROM tenants 
      WHERE subdomain = p_tenant_subdomain
      FOR UPDATE
    ) THEN
      RAISE EXCEPTION 'Subdomain is already in use';
    END IF;

    -- Check for existing email with FOR UPDATE to prevent race conditions
    IF EXISTS (
      SELECT 1 FROM tenants 
      WHERE email = p_tenant_email
      FOR UPDATE
    ) THEN
      RAISE EXCEPTION 'Email is already in use';
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
      membership_date,
      created_by
    )
    VALUES (
      new_tenant_id,
      split_part(p_tenant_email, '@', 1),
      '',
      p_tenant_email,
      p_tenant_contact,
      p_tenant_address,
      'baptism',
      'active',
      CURRENT_DATE,
      p_user_id
    );

    -- If we get here, commit the transaction
    RETURN new_tenant_id;
  EXCEPTION
    WHEN OTHERS THEN
      -- Rollback on any error
      RAISE;
  END;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION handle_new_tenant_registration(uuid, text, text, text, text, text, text) TO authenticated;

-- Add helpful comment
COMMENT ON FUNCTION handle_new_tenant_registration IS 
  'Creates a new tenant with proper validation and transaction handling for subdomain and email uniqueness';