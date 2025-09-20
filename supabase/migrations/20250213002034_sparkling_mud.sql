-- Create secure functions for user management
CREATE OR REPLACE FUNCTION get_auth_users()
RETURNS TABLE (
  id uuid,
  email text,
  created_at timestamptz,
  last_sign_in_at timestamptz,
  raw_user_meta_data jsonb,
  raw_app_meta_data jsonb
) 
SECURITY DEFINER
SET search_path = auth, public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Check if user has permission
  IF NOT EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.roles r ON ur.role_id = r.id
    WHERE ur.user_id = auth.uid()
    AND (
      r.name = 'admin'
      OR EXISTS (
        SELECT 1 FROM public.role_permissions rp
        JOIN public.permissions p ON rp.permission_id = p.id
        WHERE rp.role_id = r.id
        AND p.code = 'user.view'
      )
    )
  ) THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  RETURN QUERY
  SELECT 
    u.id,
    u.email::text,
    u.created_at,
    u.last_sign_in_at,
    u.raw_user_meta_data,
    u.raw_app_meta_data
  FROM auth.users u;
END;
$$;

-- Create function to delete users safely
CREATE OR REPLACE FUNCTION delete_user(user_id uuid)
RETURNS void
SECURITY DEFINER
SET search_path = auth, public
LANGUAGE plpgsql
AS $$
DECLARE
  current_user_id uuid;
  has_permission boolean;
BEGIN
  -- Get current user ID
  current_user_id := auth.uid();
  
  -- Check if user has permission
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.roles r ON ur.role_id = r.id
    WHERE ur.user_id = current_user_id
    AND (
      r.name = 'admin'
      OR EXISTS (
        SELECT 1 FROM public.role_permissions rp
        JOIN public.permissions p ON rp.permission_id = p.id
        WHERE rp.role_id = r.id
        AND p.code = 'user.delete'
      )
    )
  ) INTO has_permission;

  IF NOT has_permission THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  -- Delete user roles first
  DELETE FROM public.user_roles WHERE user_id = $1;
  
  -- Delete user from auth.users
  DELETE FROM auth.users WHERE id = $1;
END;
$$;

-- Create function to get user roles
CREATE OR REPLACE FUNCTION get_user_roles(user_id uuid)
RETURNS TABLE (
  role_id uuid,
  role_name text,
  role_description text
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Check if user has permission
  IF NOT EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.roles r ON ur.role_id = r.id
    WHERE ur.user_id = auth.uid()
    AND (
      r.name = 'admin'
      OR EXISTS (
        SELECT 1 FROM public.role_permissions rp
        JOIN public.permissions p ON rp.permission_id = p.id
        WHERE rp.role_id = r.id
        AND p.code = 'user.view'
      )
    )
  ) THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  RETURN QUERY
  SELECT 
    r.id,
    r.name,
    r.description
  FROM public.user_roles ur
  JOIN public.roles r ON ur.role_id = r.id
  WHERE ur.user_id = $1;
END;
$$;

-- Create function to get user permissions
CREATE OR REPLACE FUNCTION get_user_permissions(user_id uuid)
RETURNS TABLE (
  permission_id uuid,
  permission_code text,
  permission_name text,
  permission_description text,
  permission_module text
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Check if user has permission
  IF NOT EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.roles r ON ur.role_id = r.id
    WHERE ur.user_id = auth.uid()
    AND (
      r.name = 'admin'
      OR EXISTS (
        SELECT 1 FROM public.role_permissions rp
        JOIN public.permissions p ON rp.permission_id = p.id
        WHERE rp.role_id = r.id
        AND p.code = 'user.view'
      )
    )
  ) THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  RETURN QUERY
  SELECT DISTINCT
    p.id,
    p.code,
    p.name,
    p.description,
    p.module
  FROM public.permissions p
  JOIN public.role_permissions rp ON p.id = rp.permission_id
  JOIN public.user_roles ur ON rp.role_id = ur.role_id
  WHERE ur.user_id = $1;
END;
$$;