-- =============================================================================
-- Update create_member_invitation to support assigned_role_id
-- =============================================================================
-- Description: Updates the create_member_invitation function to accept an
-- optional assigned_role_id parameter, allowing role pre-assignment during
-- team member invitations in onboarding.
--
-- Date: 2026-01-21
-- =============================================================================

BEGIN;

-- Drop the old function signature first to avoid overloading
DROP FUNCTION IF EXISTS create_member_invitation(uuid, uuid, text, uuid, invitation_type, integer, text);

-- Create the function with the new parameter
CREATE OR REPLACE FUNCTION create_member_invitation(
  p_tenant_id uuid,
  p_member_id uuid,
  p_email text,
  p_invited_by uuid,
  p_invitation_type invitation_type DEFAULT 'email',
  p_expires_in_days integer DEFAULT 7,
  p_notes text DEFAULT NULL,
  p_assigned_role_id uuid DEFAULT NULL
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

  -- Create the invitation with assigned_role_id
  INSERT INTO member_invitations (
    tenant_id, member_id, email, invitation_type, status, token,
    invited_by, expires_at, notes, assigned_role_id, created_by, updated_by
  ) VALUES (
    p_tenant_id, p_member_id, p_email, p_invitation_type, 'pending', v_token,
    p_invited_by, v_expires_at, p_notes, p_assigned_role_id, p_invited_by, p_invited_by
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
      'expires_at', v_expires_at,
      'assigned_role_id', p_assigned_role_id
    ),
    p_invited_by
  );

  RETURN jsonb_build_object(
    'success', true,
    'invitation_id', v_invitation_id,
    'token', v_token,
    'expires_at', v_expires_at,
    'assigned_role_id', p_assigned_role_id,
    'message', 'Invitation created successfully'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION create_member_invitation(uuid, uuid, text, uuid, invitation_type, integer, text, uuid) IS 'Creates a secure invitation for member access with configurable expiration and optional role pre-assignment';

COMMIT;

-- Success confirmation
DO $$
BEGIN
  RAISE NOTICE 'Migration completed: create_member_invitation now supports assigned_role_id parameter';
END $$;
