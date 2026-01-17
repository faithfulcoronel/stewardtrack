-- Onboarding Revamp Schema Changes
-- =============================================================================
-- Description: Add fields required for the new streamlined onboarding experience
--
-- Changes:
-- 1. Add church_image_url to tenants table for hero section customization
-- 2. Add assigned_role_id to member_invitations for role pre-assignment
-- 3. Add onboarding_completed flag to tenants for tracking
--
-- Date: 2026-01-17
-- =============================================================================

BEGIN;

-- =============================================================================
-- STEP 1: Add church_image_url to tenants table
-- =============================================================================
-- This stores the URL to the church's uploaded image for the hero section
ALTER TABLE tenants
ADD COLUMN IF NOT EXISTS church_image_url TEXT;

COMMENT ON COLUMN tenants.church_image_url IS 'URL to the church image displayed in hero sections. Stored in Supabase Storage profiles bucket.';

-- =============================================================================
-- STEP 2: Add assigned_role_id to member_invitations table
-- =============================================================================
-- This allows pre-assigning a role when inviting team members during onboarding
ALTER TABLE member_invitations
ADD COLUMN IF NOT EXISTS assigned_role_id UUID REFERENCES roles(id) ON DELETE SET NULL;

-- Create index for efficient lookups
CREATE INDEX IF NOT EXISTS member_invitations_assigned_role_id_idx
ON member_invitations(assigned_role_id)
WHERE assigned_role_id IS NOT NULL;

COMMENT ON COLUMN member_invitations.assigned_role_id IS 'Pre-assigned role ID for team member invitations during onboarding. Role is automatically assigned when invitation is accepted.';

-- =============================================================================
-- STEP 3: Add onboarding_completed flag to tenants
-- =============================================================================
-- This tracks whether the tenant has completed the initial onboarding wizard
ALTER TABLE tenants
ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMPTZ;

COMMENT ON COLUMN tenants.onboarding_completed IS 'Whether the tenant has completed the initial onboarding wizard';
COMMENT ON COLUMN tenants.onboarding_completed_at IS 'Timestamp when onboarding was completed';

-- =============================================================================
-- STEP 4: Update accept_member_invitation function to handle role assignment
-- =============================================================================
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

  -- If there's a pre-assigned role, create the user_role assignment
  IF v_invitation.assigned_role_id IS NOT NULL THEN
    INSERT INTO user_roles (user_id, role_id, tenant_id, assigned_by)
    VALUES (p_user_id, v_invitation.assigned_role_id, v_invitation.tenant_id, v_invitation.invited_by)
    ON CONFLICT (user_id, role_id, tenant_id) DO NOTHING;
  END IF;

  -- Create audit record
  INSERT INTO user_member_link_audit (
    tenant_id, user_id, member_id, action, new_values, performed_by, ip_address, user_agent
  ) VALUES (
    v_invitation.tenant_id, p_user_id, v_invitation.member_id, 'invitation_accepted',
    jsonb_build_object(
      'invitation_id', v_invitation.id,
      'token', p_token,
      'assigned_role_id', v_invitation.assigned_role_id
    ),
    p_user_id, p_ip_address, p_user_agent
  );

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Invitation accepted and user linked successfully',
    'member_id', v_invitation.member_id,
    'tenant_id', v_invitation.tenant_id,
    'assigned_role_id', v_invitation.assigned_role_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION accept_member_invitation IS 'Processes invitation acceptance, creates user-member link, and assigns pre-configured role if specified';

-- =============================================================================
-- STEP 5: Create function to mark onboarding as complete
-- =============================================================================
CREATE OR REPLACE FUNCTION mark_onboarding_complete(p_tenant_id uuid)
RETURNS jsonb AS $$
BEGIN
  UPDATE tenants
  SET
    onboarding_completed = TRUE,
    onboarding_completed_at = now(),
    updated_at = now()
  WHERE id = p_tenant_id;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Onboarding marked as complete',
    'completed_at', now()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION mark_onboarding_complete IS 'Marks tenant onboarding as complete';

COMMIT;

-- Success confirmation
DO $$
BEGIN
  RAISE NOTICE 'Onboarding revamp schema changes applied successfully';
END $$;
