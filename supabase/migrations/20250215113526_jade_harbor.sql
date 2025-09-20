-- Create super_admin role type if it doesn't exist
DO $$ BEGIN
  CREATE TYPE admin_role_type AS ENUM (
    'super_admin',
    'tenant_admin',
    'staff',
    'member'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Add admin_role column to tenant_users if it doesn't exist
DO $$ BEGIN
  ALTER TABLE tenant_users 
  ADD COLUMN admin_role admin_role_type NOT NULL DEFAULT 'member';
EXCEPTION
  WHEN duplicate_column THEN NULL;
END $$;

-- Create function to check if user is super admin
CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS boolean
SECURITY DEFINER
SET search_path = public, auth
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  is_admin boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM tenant_users
    WHERE user_id = auth.uid()
    AND admin_role = 'super_admin'
  ) INTO is_admin;
  
  RETURN is_admin;
END;
$$;

-- Create function to check if user is tenant admin
CREATE OR REPLACE FUNCTION is_tenant_admin(check_tenant_id uuid)
RETURNS boolean
SECURITY DEFINER
SET search_path = public, auth
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  is_admin boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM tenant_users
    WHERE user_id = auth.uid()
    AND tenant_id = check_tenant_id
    AND admin_role = 'tenant_admin'
  ) INTO is_admin;
  
  RETURN is_admin;
END;
$$;

-- Update RLS policies for tenants
DROP POLICY IF EXISTS "Tenants are viewable by their members" ON tenants;
CREATE POLICY "Tenants are viewable by super admins and members"
  ON tenants FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM tenant_users
      WHERE (
        tenant_users.tenant_id = tenants.id
        AND tenant_users.user_id = auth.uid()
      ) OR (
        tenant_users.user_id = auth.uid()
        AND tenant_users.admin_role = 'super_admin'
      )
    )
  );

DROP POLICY IF EXISTS "Tenants can be created by authenticated users" ON tenants;
CREATE POLICY "Tenants can be created by super admins"
  ON tenants FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM tenant_users
      WHERE tenant_users.user_id = auth.uid()
      AND tenant_users.admin_role = 'super_admin'
    ) OR (
      NOT EXISTS (SELECT 1 FROM tenants)
    )
  );

DROP POLICY IF EXISTS "Tenants can be updated by admin users" ON tenants;
CREATE POLICY "Tenants can be updated by super admins and tenant admins"
  ON tenants FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM tenant_users
      WHERE tenant_users.user_id = auth.uid()
      AND (
        tenant_users.admin_role = 'super_admin'
        OR (
          tenant_users.tenant_id = tenants.id
          AND tenant_users.admin_role = 'tenant_admin'
        )
      )
    )
  );

-- Create function to handle first user registration
CREATE OR REPLACE FUNCTION handle_first_user_registration()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public, auth
LANGUAGE plpgsql
AS $$
DECLARE
  user_count int;
  system_tenant_id uuid;
BEGIN
  -- Get the total number of users
  SELECT COUNT(*) INTO user_count FROM auth.users;
  
  -- If this is the first user, make them a super admin
  IF user_count = 1 THEN
    -- Create default tenant for system
    INSERT INTO tenants (
      name,
      subdomain,
      status,
      subscription_tier,
      subscription_status,
      created_by
    ) VALUES (
      'System',
      'system',
      'active',
      'system',
      'active',
      NEW.id
    )
    RETURNING id INTO system_tenant_id;
    
    -- Assign super admin role
    INSERT INTO tenant_users (
      tenant_id,
      user_id,
      admin_role,
      created_by
    ) VALUES (
      system_tenant_id,
      NEW.id,
      'super_admin',
      NEW.id
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for first user registration
DROP TRIGGER IF EXISTS handle_first_user_registration ON auth.users;
CREATE TRIGGER handle_first_user_registration
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_first_user_registration();

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION is_super_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION is_tenant_admin(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION handle_first_user_registration() TO authenticated;

-- Add helpful comments
COMMENT ON FUNCTION is_super_admin() IS 
  'Checks if the current user is a super admin';

COMMENT ON FUNCTION is_tenant_admin(uuid) IS 
  'Checks if the current user is an admin for the specified tenant';

COMMENT ON FUNCTION handle_first_user_registration() IS 
  'Handles first user registration by creating system tenant and assigning super admin role';