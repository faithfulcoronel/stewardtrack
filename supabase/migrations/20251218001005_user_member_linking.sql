-- User-Member Linking Enhancement
-- Implements industry standard user-member linking with audit trails

-- Create enum for member invitation status
DO $$
BEGIN
  CREATE TYPE member_invitation_status AS ENUM (
    'pending',
    'sent',
    'accepted',
    'expired',
    'revoked'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Create enum for invitation type
DO $$
BEGIN
  CREATE TYPE invitation_type AS ENUM (
    'email',
    'manual'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Add user_id column to members table for linking
ALTER TABLE members
ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS linked_at timestamptz DEFAULT NULL,
ADD COLUMN IF NOT EXISTS linked_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- Create unique index to ensure one-to-one relationship
CREATE UNIQUE INDEX IF NOT EXISTS members_user_id_unique_idx
ON members(user_id)
WHERE user_id IS NOT NULL;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS members_user_id_idx ON members(user_id);
CREATE INDEX IF NOT EXISTS members_linked_at_idx ON members(linked_at);

-- Create member_invitations table for managing access invitations
CREATE TABLE IF NOT EXISTS member_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  member_id uuid NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  email text NOT NULL,
  invitation_type invitation_type NOT NULL DEFAULT 'email',
  status member_invitation_status NOT NULL DEFAULT 'pending',
  token text UNIQUE NOT NULL,
  invited_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  invited_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  accepted_at timestamptz DEFAULT NULL,
  accepted_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  revoked_at timestamptz DEFAULT NULL,
  revoked_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  revoke_reason text DEFAULT NULL,
  email_sent_at timestamptz DEFAULT NULL,
  email_delivered_at timestamptz DEFAULT NULL,
  email_opened_at timestamptz DEFAULT NULL,
  email_clicked_at timestamptz DEFAULT NULL,
  reminder_count integer NOT NULL DEFAULT 0,
  last_reminder_at timestamptz DEFAULT NULL,
  metadata jsonb DEFAULT '{}',
  notes text DEFAULT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS member_invitations_tenant_id_idx ON member_invitations(tenant_id);
CREATE INDEX IF NOT EXISTS member_invitations_member_id_idx ON member_invitations(member_id);
CREATE INDEX IF NOT EXISTS member_invitations_email_idx ON member_invitations(email);
CREATE INDEX IF NOT EXISTS member_invitations_status_idx ON member_invitations(status);
CREATE INDEX IF NOT EXISTS member_invitations_token_idx ON member_invitations(token);
CREATE INDEX IF NOT EXISTS member_invitations_expires_at_idx ON member_invitations(expires_at);
CREATE INDEX IF NOT EXISTS member_invitations_invited_by_idx ON member_invitations(invited_by);

-- Create composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS member_invitations_tenant_status_idx ON member_invitations(tenant_id, status);
CREATE INDEX IF NOT EXISTS member_invitations_member_status_idx ON member_invitations(member_id, status);

-- Enable RLS
ALTER TABLE member_invitations ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for member_invitations
CREATE POLICY "Member invitations are viewable by admin users"
  ON member_invitations FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      INNER JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid()
      AND r.name IN ('admin', 'system_admin')
    )
  );

CREATE POLICY "Member invitations can be created by admin users"
  ON member_invitations FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles ur
      INNER JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid()
      AND r.name IN ('admin', 'system_admin')
    )
  );

CREATE POLICY "Member invitations can be updated by admin users"
  ON member_invitations FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      INNER JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid()
      AND r.name IN ('admin', 'system_admin')
    )
  );

CREATE POLICY "Member invitations can be deleted by admin users"
  ON member_invitations FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      INNER JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid()
      AND r.name IN ('admin', 'system_admin')
    )
  );

-- Create user_member_link_audit table for tracking linking actions
CREATE TABLE IF NOT EXISTS user_member_link_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  member_id uuid REFERENCES members(id) ON DELETE SET NULL,
  action text NOT NULL, -- 'link', 'unlink', 'invitation_sent', 'invitation_accepted', etc.
  old_values jsonb DEFAULT NULL,
  new_values jsonb DEFAULT NULL,
  performed_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ip_address inet DEFAULT NULL,
  user_agent text DEFAULT NULL,
  notes text DEFAULT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Create indexes for audit table
CREATE INDEX IF NOT EXISTS user_member_link_audit_tenant_id_idx ON user_member_link_audit(tenant_id);
CREATE INDEX IF NOT EXISTS user_member_link_audit_user_id_idx ON user_member_link_audit(user_id);
CREATE INDEX IF NOT EXISTS user_member_link_audit_member_id_idx ON user_member_link_audit(member_id);
CREATE INDEX IF NOT EXISTS user_member_link_audit_action_idx ON user_member_link_audit(action);
CREATE INDEX IF NOT EXISTS user_member_link_audit_performed_by_idx ON user_member_link_audit(performed_by);
CREATE INDEX IF NOT EXISTS user_member_link_audit_created_at_idx ON user_member_link_audit(created_at);

-- Enable RLS for audit table
ALTER TABLE user_member_link_audit ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for audit table
CREATE POLICY "User member link audit is viewable by admin users"
  ON user_member_link_audit FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      INNER JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid()
      AND r.name IN ('admin', 'system_admin')
    )
  );

-- Create function to generate secure invitation token
CREATE OR REPLACE FUNCTION generate_invitation_token()
RETURNS text AS $$
BEGIN
  RETURN encode(gen_random_bytes(32), 'base64url');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to link user to member with audit trail
CREATE OR REPLACE FUNCTION link_user_to_member(
  p_tenant_id uuid,
  p_user_id uuid,
  p_member_id uuid,
  p_performed_by uuid,
  p_ip_address inet DEFAULT NULL,
  p_user_agent text DEFAULT NULL,
  p_notes text DEFAULT NULL
)
RETURNS jsonb AS $$
DECLARE
  v_existing_user_id uuid;
  v_existing_member_data jsonb;
  v_result jsonb;
BEGIN
  -- Check if member is already linked to another user
  SELECT user_id INTO v_existing_user_id
  FROM members
  WHERE id = p_member_id AND tenant_id = p_tenant_id;

  IF v_existing_user_id IS NOT NULL AND v_existing_user_id != p_user_id THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Member is already linked to another user',
      'error_code', 'MEMBER_ALREADY_LINKED'
    );
  END IF;

  -- Check if user is already linked to another member
  SELECT jsonb_build_object('id', id, 'first_name', first_name, 'last_name', last_name)
  INTO v_existing_member_data
  FROM members
  WHERE user_id = p_user_id AND tenant_id = p_tenant_id AND id != p_member_id;

  IF v_existing_member_data IS NOT NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'User is already linked to another member',
      'error_code', 'USER_ALREADY_LINKED',
      'existing_member', v_existing_member_data
    );
  END IF;

  -- Perform the linking
  UPDATE members
  SET
    user_id = p_user_id,
    linked_at = now(),
    linked_by = p_performed_by,
    updated_at = now(),
    updated_by = p_performed_by
  WHERE id = p_member_id AND tenant_id = p_tenant_id;

  -- Create audit record
  INSERT INTO user_member_link_audit (
    tenant_id, user_id, member_id, action, new_values,
    performed_by, ip_address, user_agent, notes
  ) VALUES (
    p_tenant_id, p_user_id, p_member_id, 'link',
    jsonb_build_object('user_id', p_user_id, 'member_id', p_member_id, 'linked_at', now()),
    p_performed_by, p_ip_address, p_user_agent, p_notes
  );

  RETURN jsonb_build_object(
    'success', true,
    'message', 'User successfully linked to member',
    'linked_at', now()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to unlink user from member
CREATE OR REPLACE FUNCTION unlink_user_from_member(
  p_tenant_id uuid,
  p_member_id uuid,
  p_performed_by uuid,
  p_ip_address inet DEFAULT NULL,
  p_user_agent text DEFAULT NULL,
  p_notes text DEFAULT NULL
)
RETURNS jsonb AS $$
DECLARE
  v_old_user_id uuid;
  v_result jsonb;
BEGIN
  -- Get the current user_id before unlinking
  SELECT user_id INTO v_old_user_id
  FROM members
  WHERE id = p_member_id AND tenant_id = p_tenant_id;

  IF v_old_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Member is not linked to any user',
      'error_code', 'MEMBER_NOT_LINKED'
    );
  END IF;

  -- Perform the unlinking
  UPDATE members
  SET
    user_id = NULL,
    linked_at = NULL,
    linked_by = NULL,
    updated_at = now(),
    updated_by = p_performed_by
  WHERE id = p_member_id AND tenant_id = p_tenant_id;

  -- Create audit record
  INSERT INTO user_member_link_audit (
    tenant_id, user_id, member_id, action, old_values,
    performed_by, ip_address, user_agent, notes
  ) VALUES (
    p_tenant_id, v_old_user_id, p_member_id, 'unlink',
    jsonb_build_object('user_id', v_old_user_id, 'member_id', p_member_id),
    p_performed_by, p_ip_address, p_user_agent, p_notes
  );

  RETURN jsonb_build_object(
    'success', true,
    'message', 'User successfully unlinked from member',
    'unlinked_user_id', v_old_user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to create member invitation
CREATE OR REPLACE FUNCTION create_member_invitation(
  p_tenant_id uuid,
  p_member_id uuid,
  p_email text,
  p_invited_by uuid,
  p_invitation_type invitation_type DEFAULT 'email',
  p_expires_in_days integer DEFAULT 7,
  p_notes text DEFAULT NULL
)
RETURNS jsonb AS $$
DECLARE
  v_existing_invitation_id uuid;
  v_invitation_id uuid;
  v_token text;
  v_expires_at timestamptz;
BEGIN
  -- Check if there's already a pending invitation for this member/email
  SELECT id INTO v_existing_invitation_id
  FROM member_invitations
  WHERE member_id = p_member_id
  AND email = p_email
  AND status IN ('pending', 'sent')
  AND expires_at > now();

  IF v_existing_invitation_id IS NOT NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Active invitation already exists for this member and email',
      'error_code', 'INVITATION_EXISTS',
      'existing_invitation_id', v_existing_invitation_id
    );
  END IF;

  -- Generate token and calculate expiration
  v_token := generate_invitation_token();
  v_expires_at := now() + (p_expires_in_days || ' days')::interval;

  -- Create the invitation
  INSERT INTO member_invitations (
    tenant_id, member_id, email, invitation_type, status, token,
    invited_by, expires_at, notes, created_by, updated_by
  ) VALUES (
    p_tenant_id, p_member_id, p_email, p_invitation_type, 'pending', v_token,
    p_invited_by, v_expires_at, p_notes, p_invited_by, p_invited_by
  ) RETURNING id INTO v_invitation_id;

  -- Create audit record
  INSERT INTO user_member_link_audit (
    tenant_id, member_id, action, new_values, performed_by
  ) VALUES (
    p_tenant_id, p_member_id, 'invitation_created',
    jsonb_build_object(
      'invitation_id', v_invitation_id,
      'email', p_email,
      'invitation_type', p_invitation_type,
      'expires_at', v_expires_at
    ),
    p_invited_by
  );

  RETURN jsonb_build_object(
    'success', true,
    'invitation_id', v_invitation_id,
    'token', v_token,
    'expires_at', v_expires_at,
    'message', 'Invitation created successfully'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to accept member invitation
CREATE OR REPLACE FUNCTION accept_member_invitation(
  p_token text,
  p_user_id uuid,
  p_ip_address inet DEFAULT NULL,
  p_user_agent text DEFAULT NULL
)
RETURNS jsonb AS $$
DECLARE
  v_invitation member_invitations%ROWTYPE;
  v_link_result jsonb;
BEGIN
  -- Get the invitation
  SELECT * INTO v_invitation
  FROM member_invitations
  WHERE token = p_token
  AND status IN ('pending', 'sent')
  AND expires_at > now();

  IF v_invitation.id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Invalid or expired invitation token',
      'error_code', 'INVALID_TOKEN'
    );
  END IF;

  -- Attempt to link the user to the member
  SELECT link_user_to_member(
    v_invitation.tenant_id,
    p_user_id,
    v_invitation.member_id,
    p_user_id,
    p_ip_address,
    p_user_agent,
    'Linked via invitation acceptance'
  ) INTO v_link_result;

  -- If linking failed, return the error
  IF NOT (v_link_result->>'success')::boolean THEN
    RETURN v_link_result;
  END IF;

  -- Update invitation status
  UPDATE member_invitations
  SET
    status = 'accepted',
    accepted_at = now(),
    accepted_by = p_user_id,
    updated_at = now(),
    updated_by = p_user_id
  WHERE id = v_invitation.id;

  -- Create audit record
  INSERT INTO user_member_link_audit (
    tenant_id, user_id, member_id, action, new_values, performed_by, ip_address, user_agent
  ) VALUES (
    v_invitation.tenant_id, p_user_id, v_invitation.member_id, 'invitation_accepted',
    jsonb_build_object('invitation_id', v_invitation.id, 'token', p_token),
    p_user_id, p_ip_address, p_user_agent
  );

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Invitation accepted and user linked successfully',
    'member_id', v_invitation.member_id,
    'tenant_id', v_invitation.tenant_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to revoke member invitation
CREATE OR REPLACE FUNCTION revoke_member_invitation(
  p_invitation_id uuid,
  p_revoked_by uuid,
  p_reason text DEFAULT NULL
)
RETURNS jsonb AS $$
DECLARE
  v_invitation member_invitations%ROWTYPE;
BEGIN
  -- Get the invitation
  SELECT * INTO v_invitation
  FROM member_invitations
  WHERE id = p_invitation_id
  AND status IN ('pending', 'sent');

  IF v_invitation.id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Invitation not found or already processed',
      'error_code', 'INVITATION_NOT_FOUND'
    );
  END IF;

  -- Update invitation status
  UPDATE member_invitations
  SET
    status = 'revoked',
    revoked_at = now(),
    revoked_by = p_revoked_by,
    revoke_reason = p_reason,
    updated_at = now(),
    updated_by = p_revoked_by
  WHERE id = p_invitation_id;

  -- Create audit record
  INSERT INTO user_member_link_audit (
    tenant_id, member_id, action, old_values, performed_by
  ) VALUES (
    v_invitation.tenant_id, v_invitation.member_id, 'invitation_revoked',
    jsonb_build_object('invitation_id', v_invitation.id, 'reason', p_reason),
    p_revoked_by
  );

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Invitation revoked successfully'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to update updated_at on member_invitations
CREATE OR REPLACE FUNCTION update_member_invitations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER member_invitations_updated_at_trigger
  BEFORE UPDATE ON member_invitations
  FOR EACH ROW
  EXECUTE FUNCTION update_member_invitations_updated_at();

-- Add comments for documentation
COMMENT ON TABLE member_invitations IS 'Manages member access invitations with email workflow support';
COMMENT ON TABLE user_member_link_audit IS 'Audit trail for all user-member linking activities';
COMMENT ON FUNCTION link_user_to_member IS 'Links an authenticated user to a member profile with validation and audit logging';
COMMENT ON FUNCTION create_member_invitation IS 'Creates a secure invitation for member access with configurable expiration';
COMMENT ON FUNCTION accept_member_invitation IS 'Processes invitation acceptance and creates user-member link';