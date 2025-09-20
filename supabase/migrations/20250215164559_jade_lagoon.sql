-- Create table for email invitations if it doesn't exist
CREATE TABLE IF NOT EXISTS email_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  token text NOT NULL UNIQUE,
  tenant_id uuid REFERENCES tenants(id) ON DELETE CASCADE,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz NOT NULL,
  accepted_at timestamptz,
  admin_role admin_role_type NOT NULL DEFAULT 'member',
  first_name text,
  last_name text,
  CONSTRAINT valid_email CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

-- Enable RLS
ALTER TABLE email_invitations ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Email invitations are viewable by tenant admins"
  ON email_invitations FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM tenant_users
      WHERE tenant_users.tenant_id = email_invitations.tenant_id
      AND tenant_users.user_id = auth.uid()
      AND tenant_users.admin_role IN ('super_admin', 'tenant_admin')
    )
  );

CREATE POLICY "Email invitations can be managed by tenant admins"
  ON email_invitations FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM tenant_users
      WHERE tenant_users.tenant_id = email_invitations.tenant_id
      AND tenant_users.user_id = auth.uid()
      AND tenant_users.admin_role IN ('super_admin', 'tenant_admin')
    )
  );

-- Modify handle_user_creation to create invitation
CREATE OR REPLACE FUNCTION handle_user_creation(
  p_email text,
  p_password text,
  p_tenant_id uuid,
  p_roles text[],
  p_first_name text,
  p_last_name text,
  p_admin_role admin_role_type
)
RETURNS jsonb
SECURITY DEFINER
SET search_path = auth, public, extensions
LANGUAGE plpgsql
AS $$
DECLARE
  new_user_id uuid;
  instance_id uuid;
  member_role_id uuid;
  result jsonb;
  password_hash text;
  invitation_token text;
BEGIN
  -- Check if user has admin permissions
  IF NOT EXISTS (
    SELECT 1 FROM tenant_users
    WHERE tenant_id = p_tenant_id
    AND user_id = auth.uid()
    AND admin_role IN ('super_admin', 'tenant_admin')
  ) THEN
    RAISE EXCEPTION 'Only tenant administrators can create users';
  END IF;

  -- Generate secure invitation token
  SELECT encode(gen_random_bytes(32), 'base64') INTO invitation_token;

  -- Create invitation record
  INSERT INTO email_invitations (
    email,
    token,
    tenant_id,
    created_by,
    expires_at,
    admin_role,
    first_name,
    last_name
  ) VALUES (
    p_email,
    invitation_token,
    p_tenant_id,
    auth.uid(),
    now() + interval '7 days',
    p_admin_role,
    p_first_name,
    p_last_name
  );

  -- Get instance ID
  SELECT u.instance_id INTO instance_id 
  FROM auth.users u 
  LIMIT 1;

  IF instance_id IS NULL THEN
    instance_id := '00000000-0000-0000-0000-000000000000'::uuid;
  END IF;

  -- Generate new user ID
  SELECT gen_random_uuid() INTO new_user_id;

  -- Create password hash
  SELECT crypt(p_password, gen_salt('bf', 10)) INTO password_hash;

  -- Create user
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
    p_email,
    password_hash,
    now(),
    now(),
    now(),
    jsonb_build_object(
      'provider', 'email',
      'providers', ARRAY['email']
    ),
    jsonb_build_object(
      'first_name', p_first_name,
      'last_name', p_last_name
    ),
    false,
    now()
  )
  RETURNING jsonb_build_object(
    'id', id,
    'email', email,
    'created_at', created_at,
    'invitation_token', invitation_token
  ) INTO result;

  -- Get member role ID
  SELECT id INTO member_role_id 
  FROM roles 
  WHERE name = 'member';

  -- Assign member role
  INSERT INTO user_roles (user_id, role_id, created_by)
  VALUES (new_user_id, member_role_id, auth.uid())
  ON CONFLICT DO NOTHING;

  -- Assign additional roles if provided
  IF p_roles IS NOT NULL THEN
    INSERT INTO user_roles (user_id, role_id, created_by)
    SELECT 
      new_user_id,
      r.id,
      auth.uid()
    FROM unnest(p_roles) role_name
    JOIN roles r ON r.name = role_name
    WHERE r.id != member_role_id
    ON CONFLICT DO NOTHING;
  END IF;

  -- Add to tenant with specified admin role
  INSERT INTO tenant_users (
    tenant_id,
    user_id,
    admin_role,
    created_by
  )
  VALUES (
    p_tenant_id,
    new_user_id,
    p_admin_role,
    auth.uid()
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
    membership_date
  )
  VALUES (
    p_tenant_id,
    COALESCE(p_first_name, split_part(p_email, '@', 1)),
    COALESCE(p_last_name, ''),
    p_email,
    'Not provided',
    'Not provided',
    'non_member',
    'inactive',
    CURRENT_DATE
  );

  RETURN result;
END;
$$;

-- Create function to verify invitation token
CREATE OR REPLACE FUNCTION verify_invitation_token(token text)
RETURNS jsonb
SECURITY DEFINER
SET search_path = public, auth
LANGUAGE plpgsql
AS $$
DECLARE
  invitation email_invitations%ROWTYPE;
  result jsonb;
BEGIN
  -- Get invitation details
  SELECT * INTO invitation
  FROM email_invitations
  WHERE email_invitations.token = token
  AND accepted_at IS NULL
  AND expires_at > now();

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'valid', false,
      'message', 'Invalid or expired invitation token'
    );
  END IF;

  RETURN jsonb_build_object(
    'valid', true,
    'email', invitation.email,
    'tenant_id', invitation.tenant_id,
    'admin_role', invitation.admin_role,
    'first_name', invitation.first_name,
    'last_name', invitation.last_name
  );
END;
$$;

-- Create function to mark invitation as accepted
CREATE OR REPLACE FUNCTION mark_invitation_accepted(token text)
RETURNS void
SECURITY DEFINER
SET search_path = public, auth
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE email_invitations
  SET accepted_at = now()
  WHERE email_invitations.token = token
  AND accepted_at IS NULL
  AND expires_at > now();
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION handle_user_creation(text, text, uuid, text[], text, text, admin_role_type) TO authenticated;
GRANT EXECUTE ON FUNCTION verify_invitation_token(text) TO authenticated;
GRANT EXECUTE ON FUNCTION mark_invitation_accepted(text) TO authenticated;

-- Add helpful comments
COMMENT ON TABLE email_invitations IS 
  'Stores email invitations for new users to join the system';

COMMENT ON FUNCTION handle_user_creation IS 
  'Creates a new user with proper role assignments, tenant association, member profile, and email invitation';

COMMENT ON FUNCTION verify_invitation_token IS
  'Verifies if an invitation token is valid and returns the associated invitation details';

COMMENT ON FUNCTION mark_invitation_accepted IS
  'Marks an invitation as accepted after successful user registration';