-- Redefine assign_admin_role_to_user to stop auto-assigning the member role
-- and continue ensuring tenant_users is properly updated.
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
BEGIN
  SELECT id INTO admin_role_id FROM roles WHERE name = 'admin';
  IF admin_role_id IS NULL THEN
    RAISE EXCEPTION 'Admin role not found';
  END IF;

  INSERT INTO user_roles (user_id, role_id, tenant_id, created_by)
  VALUES (p_user_id, admin_role_id, p_tenant_id, p_user_id)
  ON CONFLICT (user_id, role_id, tenant_id) DO NOTHING;

  INSERT INTO tenant_users (tenant_id, user_id, admin_role, created_by)
  VALUES (p_tenant_id, p_user_id, 'tenant_admin', p_user_id)
  ON CONFLICT (tenant_id, user_id)
  DO UPDATE SET admin_role = 'tenant_admin';
END;
$$;

GRANT EXECUTE ON FUNCTION assign_admin_role_to_user(uuid, uuid) TO authenticated;

COMMENT ON FUNCTION assign_admin_role_to_user IS
  'Assigns only the admin role to a user and ensures tenant admin access.';
