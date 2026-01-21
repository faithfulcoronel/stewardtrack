-- =============================================================================
-- Update get_invitation_by_token to include tenant logo and cover image
-- =============================================================================
-- Description: The original function only returned tenant name. This update
-- adds logo_url and church_image_url (as cover_url) so the join page can
-- display the church branding.
--
-- Date: 2026-01-21
-- =============================================================================

BEGIN;

-- Update function to include tenant branding (logo and cover image)
CREATE OR REPLACE FUNCTION get_invitation_by_token(p_token text)
RETURNS jsonb AS $$
DECLARE
  v_invitation record;
  v_result jsonb;
BEGIN
  -- Find the invitation by token
  SELECT
    mi.id,
    mi.tenant_id,
    mi.member_id,
    mi.email,
    mi.status,
    mi.invitation_type,
    mi.expires_at,
    mi.invited_at,
    mi.assigned_role_id,
    m.first_name as member_first_name,
    m.last_name as member_last_name,
    t.name as tenant_name,
    t.logo_url as tenant_logo_url,
    t.church_image_url as tenant_cover_url,
    r.name as role_name,
    r.description as role_description
  INTO v_invitation
  FROM member_invitations mi
  JOIN members m ON mi.member_id = m.id
  JOIN tenants t ON mi.tenant_id = t.id
  LEFT JOIN roles r ON mi.assigned_role_id = r.id
  WHERE mi.token = p_token
  AND mi.deleted_at IS NULL;

  -- Check if invitation exists
  IF v_invitation.id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Invitation not found',
      'error_code', 'NOT_FOUND'
    );
  END IF;

  -- Check if invitation is still pending
  IF v_invitation.status NOT IN ('pending', 'sent') THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Invitation is no longer valid',
      'error_code', 'INVALID_STATUS',
      'status', v_invitation.status
    );
  END IF;

  -- Check if invitation has expired
  IF v_invitation.expires_at < now() THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Invitation has expired',
      'error_code', 'EXPIRED',
      'expires_at', v_invitation.expires_at
    );
  END IF;

  -- Return invitation details (without sensitive token)
  RETURN jsonb_build_object(
    'success', true,
    'invitation', jsonb_build_object(
      'id', v_invitation.id,
      'tenant_id', v_invitation.tenant_id,
      'member_id', v_invitation.member_id,
      'email', v_invitation.email,
      'status', v_invitation.status,
      'invitation_type', v_invitation.invitation_type,
      'expires_at', v_invitation.expires_at,
      'invited_at', v_invitation.invited_at,
      'assigned_role_id', v_invitation.assigned_role_id,
      'member', jsonb_build_object(
        'first_name', v_invitation.member_first_name,
        'last_name', v_invitation.member_last_name
      ),
      'tenant', jsonb_build_object(
        'name', v_invitation.tenant_name,
        'logo_url', v_invitation.tenant_logo_url,
        'cover_url', v_invitation.tenant_cover_url
      ),
      'assigned_role', CASE
        WHEN v_invitation.assigned_role_id IS NOT NULL THEN
          jsonb_build_object(
            'name', v_invitation.role_name,
            'description', v_invitation.role_description
          )
        ELSE NULL
      END
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMIT;

-- Success confirmation
DO $$
BEGIN
  RAISE NOTICE 'Migration completed: updated get_invitation_by_token to include tenant branding (logo_url, cover_url)';
END $$;
