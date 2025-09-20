-- Drop existing function
DROP FUNCTION IF EXISTS manage_user(text, uuid, jsonb);

-- Create improved function to manage users securely
CREATE OR REPLACE FUNCTION manage_user(
  operation text,
  target_user_id uuid DEFAULT NULL,
  user_data jsonb DEFAULT NULL
)
RETURNS jsonb
SECURITY DEFINER
SET search_path = auth, public, extensions
LANGUAGE plpgsql
AS $$
DECLARE
  result jsonb;
  password_hash text;
  new_user_id uuid;
  instance_id uuid;
  member_role_id uuid;
  current_user_id uuid;
  current_tenant_id uuid;
BEGIN
  -- Get current user ID
  current_user_id := auth.uid();
  
  -- Check if user is admin
  IF NOT (SELECT is_admin()) THEN
    RAISE EXCEPTION 'Only administrators can manage users';
  END IF;

  -- Get current tenant ID
  SELECT t.id INTO current_tenant_id
  FROM tenants t
  JOIN tenant_users tu ON t.id = tu.tenant_id
  WHERE tu.user_id = current_user_id
  AND tu.admin_role != 'super_admin'
  LIMIT 1;

  -- Get the instance ID from an existing user
  SELECT u.instance_id INTO instance_id FROM auth.users u LIMIT 1;
  
  -- If no instance_id found, use the default
  IF instance_id IS NULL THEN
    instance_id := '00000000-0000-0000-0000-000000000000'::uuid;
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
      -- Generate new user ID
      SELECT gen_random_uuid() INTO new_user_id;
      
      -- Create password hash using proper method for Supabase Auth
      SELECT crypt(user_data->>'password', gen_salt('bf', 10)) INTO password_hash;
      
      -- Create new user with minimal required columns
      INSERT INTO auth.users (
        instance_id,
        id,
        aud,
        role,
        email,
        encrypted_password,
        email_confirmed_at,
        created_at,
        updated_at,
        raw_app_meta_data,
        raw_user_meta_data,
        is_super_admin,
        last_sign_in_at
      )
      VALUES (
        instance_id,
        new_user_id,
        'authenticated',
        'authenticated',
        user_data->>'email',
        password_hash,
        now(), -- Auto-confirm email
        now(),
        now(),
        jsonb_build_object(
          'provider', 'email',
          'providers', ARRAY['email']
        ),
        jsonb_build_object(),
        false,
        now()
      )
      RETURNING jsonb_build_object(
        'id', id,
        'email', email,
        'created_at', created_at
      ) INTO result;

      -- Get the member role ID
      SELECT id INTO member_role_id FROM roles WHERE name = 'member';

      -- Assign member role to the new user
      IF member_role_id IS NOT NULL THEN
        INSERT INTO user_roles (user_id, role_id, created_by)
        VALUES (new_user_id, member_role_id, current_user_id)
        ON CONFLICT (user_id, role_id) DO NOTHING;
      END IF;

      -- Assign any additional roles from user_data
      IF user_data ? 'roles' AND jsonb_array_length(user_data->'roles') > 0 THEN
        INSERT INTO user_roles (user_id, role_id, created_by)
        SELECT DISTINCT
          new_user_id,
          r.id,
          current_user_id
        FROM jsonb_array_elements_text(user_data->'roles') AS role_id
        JOIN roles r ON r.id::text = role_id
        WHERE r.id != member_role_id
        ON CONFLICT (user_id, role_id) DO NOTHING;
      END IF;

      -- Add user to current tenant
      IF current_tenant_id IS NOT NULL THEN
        INSERT INTO tenant_users (tenant_id, user_id, admin_role, created_by)
        VALUES (current_tenant_id, new_user_id, 'member', current_user_id)
        ON CONFLICT (tenant_id, user_id) DO NOTHING;
      END IF;

    WHEN 'update' THEN
      IF user_data->>'password' IS NOT NULL THEN
        -- Update password hash using proper method for Supabase Auth
        SELECT crypt(user_data->>'password', gen_salt('bf', 10)) INTO password_hash;
        
        -- Update user with new password
        UPDATE auth.users
        SET
          encrypted_password = password_hash,
          updated_at = now()
        WHERE id = target_user_id
        RETURNING jsonb_build_object(
          'id', id,
          'email', email,
          'updated_at', updated_at
        ) INTO result;
      ELSE
        -- Update user without changing password
        UPDATE auth.users
        SET
          updated_at = now()
        WHERE id = target_user_id
        RETURNING jsonb_build_object(
          'id', id,
          'email', email,
          'updated_at', updated_at
        ) INTO result;
      END IF;

      -- Update roles if provided
      IF user_data ? 'roles' THEN
        -- Delete existing roles except member role
        DELETE FROM user_roles ur
        WHERE ur.user_id = target_user_id
        AND ur.role_id != (SELECT id FROM roles WHERE name = 'member');

        -- Get the member role ID
        SELECT id INTO member_role_id FROM roles WHERE name = 'member';

        -- Always ensure member role
        INSERT INTO user_roles (user_id, role_id, created_by)
        VALUES (target_user_id, member_role_id, current_user_id)
        ON CONFLICT (user_id, role_id) DO NOTHING;

        -- Add new roles
        IF jsonb_array_length(user_data->'roles') > 0 THEN
          INSERT INTO user_roles (user_id, role_id, created_by)
          SELECT DISTINCT
            target_user_id,
            r.id,
            current_user_id
          FROM jsonb_array_elements_text(user_data->'roles') AS role_id
          JOIN roles r ON r.id::text = role_id
          WHERE r.id != member_role_id
          ON CONFLICT (user_id, role_id) DO NOTHING;
        END IF;
      END IF;

    WHEN 'delete' THEN
      -- Delete user and their roles
      DELETE FROM user_roles ur WHERE ur.user_id = target_user_id;
      DELETE FROM tenant_users tu WHERE tu.user_id = target_user_id;
      DELETE FROM auth.users WHERE id = target_user_id;
      result := jsonb_build_object('success', true);

    ELSE
      RAISE EXCEPTION 'Invalid operation: %', operation;
  END CASE;

  RETURN result;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION manage_user(text, uuid, jsonb) TO authenticated;

-- Add helpful comment
COMMENT ON FUNCTION manage_user(text, uuid, jsonb) IS
  'Securely manages user operations with proper role handling and tenant isolation';