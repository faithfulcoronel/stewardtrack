-- Create admin functions with proper security
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_roles ur
    JOIN roles r ON ur.role_id = r.id
    WHERE ur.user_id = auth.uid()
    AND r.name = 'admin'
  );
END;
$$;

-- Create function to manage users securely
CREATE OR REPLACE FUNCTION manage_user(
  operation text,
  target_user_id uuid DEFAULT NULL,
  user_data jsonb DEFAULT NULL
)
RETURNS jsonb
SECURITY DEFINER
SET search_path = auth, public
LANGUAGE plpgsql
AS $$
DECLARE
  result jsonb;
BEGIN
  -- Check if user is admin
  IF NOT (SELECT is_admin()) THEN
    RAISE EXCEPTION 'Only administrators can manage users';
  END IF;

  CASE operation
    WHEN 'get' THEN
      IF target_user_id IS NULL THEN
        -- Get all users
        SELECT jsonb_agg(jsonb_build_object(
          'id', u.id,
          'email', u.email,
          'created_at', u.created_at,
          'last_sign_in_at', u.last_sign_in_at,
          'raw_user_meta_data', u.raw_user_meta_data,
          'raw_app_meta_data', u.raw_app_meta_data
        ))
        FROM auth.users u
        INTO result;
      ELSE
        -- Get specific user
        SELECT jsonb_build_object(
          'id', u.id,
          'email', u.email,
          'created_at', u.created_at,
          'last_sign_in_at', u.last_sign_in_at,
          'raw_user_meta_data', u.raw_user_meta_data,
          'raw_app_meta_data', u.raw_app_meta_data
        )
        FROM auth.users u
        WHERE u.id = target_user_id
        INTO result;
      END IF;

    WHEN 'create' THEN
      -- Create new user
      INSERT INTO auth.users (
        email,
        encrypted_password,
        email_confirmed_at,
        raw_app_meta_data,
        raw_user_meta_data,
        created_at,
        updated_at
      )
      SELECT
        user_data->>'email',
        crypt(user_data->>'password', gen_salt('bf')),
        CURRENT_TIMESTAMP,
        user_data->'app_metadata',
        user_data->'user_metadata',
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
      RETURNING jsonb_build_object(
        'id', id,
        'email', email,
        'created_at', created_at
      ) INTO result;

    WHEN 'update' THEN
      -- Update existing user
      UPDATE auth.users
      SET
        email = COALESCE((user_data->>'email')::text, email),
        encrypted_password = CASE
          WHEN user_data->>'password' IS NOT NULL
          THEN crypt(user_data->>'password', gen_salt('bf'))
          ELSE encrypted_password
        END,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = target_user_id
      RETURNING jsonb_build_object(
        'id', id,
        'email', email,
        'updated_at', updated_at
      ) INTO result;

    WHEN 'delete' THEN
      -- Delete user and their roles
      DELETE FROM public.user_roles WHERE user_id = target_user_id;
      DELETE FROM auth.users WHERE id = target_user_id;
      result := jsonb_build_object('success', true);

    ELSE
      RAISE EXCEPTION 'Invalid operation: %', operation;
  END CASE;

  RETURN result;
END;
$$;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION manage_user(text, uuid, jsonb) TO authenticated;

-- Create helper function to get user roles with permissions
CREATE OR REPLACE FUNCTION get_user_roles_with_permissions(user_id uuid)
RETURNS TABLE (
  role_id uuid,
  role_name text,
  role_description text,
  permissions jsonb
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Check if user is admin or has user.view permission
  IF NOT (SELECT is_admin()) AND NOT EXISTS (
    SELECT 1 FROM user_roles ur
    JOIN role_permissions rp ON ur.role_id = rp.role_id
    JOIN permissions p ON rp.permission_id = p.id
    WHERE ur.user_id = auth.uid() AND p.code = 'user.view'
  ) THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  RETURN QUERY
  SELECT 
    r.id,
    r.name,
    r.description,
    jsonb_agg(
      jsonb_build_object(
        'id', p.id,
        'code', p.code,
        'name', p.name,
        'description', p.description,
        'module', p.module
      )
    ) as permissions
  FROM roles r
  JOIN user_roles ur ON r.id = ur.role_id
  LEFT JOIN role_permissions rp ON r.id = rp.role_id
  LEFT JOIN permissions p ON rp.permission_id = p.id
  WHERE ur.user_id = user_id
  GROUP BY r.id, r.name, r.description;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_user_roles_with_permissions(uuid) TO authenticated;