-- Complete member registration after signup
DROP FUNCTION IF EXISTS complete_member_registration(uuid, uuid, text, text);
DROP FUNCTION IF EXISTS register_member(text, text, uuid, text, text);

-- Creates member records and assigns roles after a Supabase Auth signup
CREATE OR REPLACE FUNCTION complete_member_registration(
  p_user_id uuid,
  p_tenant_id uuid,
  p_first_name text DEFAULT NULL,
  p_last_name text DEFAULT NULL
)
RETURNS jsonb
SECURITY DEFINER
SET search_path = auth, public, extensions
LANGUAGE plpgsql
AS $$
DECLARE
  v_email text;
  v_member_role_id uuid;
  v_member_type_id uuid;
  v_status_id uuid;
  v_member_id uuid;
BEGIN
  -- Verify user exists and fetch email
  SELECT email INTO v_email FROM auth.users WHERE id = p_user_id;
  IF v_email IS NULL THEN
    RAISE EXCEPTION 'User % does not exist', p_user_id;
  END IF;

  -- Assign member role if missing
  SELECT id INTO v_member_role_id FROM roles WHERE name = 'member';
  INSERT INTO user_roles (user_id, role_id, created_by)
  VALUES (p_user_id, v_member_role_id, p_user_id)
  ON CONFLICT DO NOTHING;

  -- Add tenant relationship if missing
  INSERT INTO tenant_users (tenant_id, user_id, admin_role, created_by)
  VALUES (p_tenant_id, p_user_id, 'member', p_user_id)
  ON CONFLICT DO NOTHING;

  -- Default membership type and status
  SELECT id INTO v_member_type_id
  FROM membership_type
  WHERE tenant_id = p_tenant_id AND code = 'non_member' AND deleted_at IS NULL
  LIMIT 1;

  SELECT id INTO v_status_id
  FROM membership_status
  WHERE tenant_id = p_tenant_id AND code = 'inactive' AND deleted_at IS NULL
  LIMIT 1;

  -- Create member profile if not exists
  INSERT INTO members (
    tenant_id,
    first_name,
    last_name,
    email,
    contact_number,
    address,
    membership_type_id,
    membership_status_id,
    membership_date,
    created_by
  ) VALUES (
    p_tenant_id,
    COALESCE(p_first_name, split_part(v_email, '@', 1)),
    COALESCE(p_last_name, ''),
    v_email,
    'Not provided',
    'Not provided',
    v_member_type_id,
    v_status_id,
    CURRENT_DATE,
    p_user_id
  ) RETURNING id INTO v_member_id;

  -- Link member to tenant_users record
  UPDATE tenant_users
  SET member_id = v_member_id
  WHERE tenant_id = p_tenant_id
    AND user_id = p_user_id;

  RETURN jsonb_build_object(
    'member_id', v_member_id,
    'user_id', p_user_id,
    'email', v_email
  );
END;
$$;

GRANT EXECUTE ON FUNCTION complete_member_registration(uuid, uuid, text, text) TO authenticated;

COMMENT ON FUNCTION complete_member_registration(uuid, uuid, text, text) IS
  'Completes member signup by assigning the member role, linking the tenant, and creating a member profile.';
