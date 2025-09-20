-- Drop existing policies with cascade
DROP POLICY IF EXISTS "Members are viewable by tenant users" ON members CASCADE;
DROP POLICY IF EXISTS "Members can be managed by tenant users" ON members CASCADE;
DROP POLICY IF EXISTS "Financial transactions are viewable by tenant users" ON financial_transactions CASCADE;
DROP POLICY IF EXISTS "Financial transactions can be managed by tenant users" ON financial_transactions CASCADE;
DROP POLICY IF EXISTS "Budgets are viewable by tenant users" ON budgets CASCADE;
DROP POLICY IF EXISTS "Budgets can be managed by tenant users" ON budgets CASCADE;
DROP POLICY IF EXISTS "Tenant users are viewable by tenant members" ON tenant_users CASCADE;
DROP POLICY IF EXISTS "Tenant users can be managed by tenant admins" ON tenant_users CASCADE;

-- Drop materialized view with cascade
DROP MATERIALIZED VIEW IF EXISTS user_tenant_access CASCADE;

-- Create improved tenant_users policies
CREATE POLICY "Tenant users are viewable by tenant members"
  ON tenant_users FOR SELECT
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tu.tenant_id 
      FROM tenant_users tu 
      WHERE tu.user_id = auth.uid()
    )
  );

CREATE POLICY "Tenant users can be managed by tenant admins"
  ON tenant_users FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM tenant_users tu
      WHERE tu.tenant_id = tenant_users.tenant_id
      AND tu.user_id = auth.uid()
      AND tu.role = 'admin'
    )
  );

-- Create improved members policies
CREATE POLICY "Members are viewable by tenant users"
  ON members FOR SELECT
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tu.tenant_id 
      FROM tenant_users tu 
      WHERE tu.user_id = auth.uid()
    )
    AND deleted_at IS NULL
  );

CREATE POLICY "Members can be managed by tenant users"
  ON members FOR ALL
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tu.tenant_id 
      FROM tenant_users tu 
      WHERE tu.user_id = auth.uid()
    )
    AND deleted_at IS NULL
  );

-- Create function to get current tenant with better error handling
CREATE OR REPLACE FUNCTION get_current_tenant()
RETURNS SETOF tenants
SECURITY DEFINER
SET search_path = public, auth
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT t.*
  FROM tenants t
  JOIN tenant_users tu ON t.id = tu.tenant_id
  WHERE tu.user_id = auth.uid()
  LIMIT 1;

  -- Return empty set if no tenant found (instead of error)
  IF NOT FOUND THEN
    RETURN;
  END IF;
END;
$$;

-- Create function to check user permissions
CREATE OR REPLACE FUNCTION check_user_permission(p_user_id uuid, p_permission_code text)
RETURNS boolean
SECURITY DEFINER
SET search_path = public, auth
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  has_permission boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 
    FROM user_roles ur
    JOIN role_permissions rp ON ur.role_id = rp.role_id
    JOIN permissions p ON rp.permission_id = p.id
    WHERE ur.user_id = p_user_id
    AND p.code = p_permission_code
  ) INTO has_permission;

  RETURN has_permission;
END;
$$;

-- Create function to get user roles with better error handling
CREATE OR REPLACE FUNCTION get_user_roles_with_permissions(target_user_id uuid)
RETURNS TABLE (
  role_id uuid,
  role_name text,
  role_description text,
  permissions jsonb
)
SECURITY DEFINER
SET search_path = public, auth
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  -- Check if user has admin role or user.view permission
  IF NOT EXISTS (
    SELECT 1 FROM user_roles ur
    JOIN roles r ON ur.role_id = r.id
    WHERE ur.user_id = auth.uid()
    AND (
      r.name = 'admin'
      OR EXISTS (
        SELECT 1 FROM role_permissions rp
        JOIN permissions p ON rp.permission_id = p.id
        WHERE rp.role_id = r.id
        AND p.code = 'user.view'
      )
    )
  ) THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT 
    r.id,
    r.name,
    r.description,
    COALESCE(
      jsonb_agg(
        jsonb_build_object(
          'id', p.id,
          'code', p.code,
          'name', p.name,
          'description', p.description,
          'module', p.module
        )
      ) FILTER (WHERE p.id IS NOT NULL),
      '[]'::jsonb
    ) as permissions
  FROM roles r
  JOIN user_roles ur ON r.id = ur.role_id
  LEFT JOIN role_permissions rp ON r.id = rp.role_id
  LEFT JOIN permissions p ON rp.permission_id = p.id
  WHERE ur.user_id = target_user_id
  GROUP BY r.id, r.name, r.description;
END;
$$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_tenant_users_user_tenant ON tenant_users(user_id, tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_users_tenant_role ON tenant_users(tenant_id, role);
CREATE INDEX IF NOT EXISTS idx_user_roles_user_role ON user_roles(user_id, role_id);
CREATE INDEX IF NOT EXISTS idx_role_permissions_role ON role_permissions(role_id);

-- Create policies for financial transactions
CREATE POLICY "Financial transactions are viewable by tenant users"
  ON financial_transactions FOR SELECT
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tu.tenant_id 
      FROM tenant_users tu 
      WHERE tu.user_id = auth.uid()
    )
  );

CREATE POLICY "Financial transactions can be managed by tenant users"
  ON financial_transactions FOR ALL
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tu.tenant_id 
      FROM tenant_users tu 
      WHERE tu.user_id = auth.uid()
    )
  );

-- Create policies for budgets
CREATE POLICY "Budgets are viewable by tenant users"
  ON budgets FOR SELECT
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tu.tenant_id 
      FROM tenant_users tu 
      WHERE tu.user_id = auth.uid()
    )
  );

CREATE POLICY "Budgets can be managed by tenant users"
  ON budgets FOR ALL
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tu.tenant_id 
      FROM tenant_users tu 
      WHERE tu.user_id = auth.uid()
    )
  );

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_current_tenant() TO authenticated;
GRANT EXECUTE ON FUNCTION check_user_permission(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_roles_with_permissions(uuid) TO authenticated;

COMMENT ON FUNCTION get_current_tenant() IS 'Returns the tenant (church) associated with the current user';
COMMENT ON FUNCTION check_user_permission(uuid, text) IS 'Checks if a user has a specific permission';
COMMENT ON FUNCTION get_user_roles_with_permissions(uuid) IS 'Returns all roles and their permissions for a given user';