/*
  # Update Multi-Tenant Support

  1. Updates
    - Drop existing functions to avoid conflicts
    - Recreate functions with improved security
    - Add storage policies for tenant logos
*/

-- Drop existing functions if they exist
DROP FUNCTION IF EXISTS get_current_tenant();
DROP FUNCTION IF EXISTS create_tenant_invitation(uuid, text, text);
DROP FUNCTION IF EXISTS accept_tenant_invitation(text);

-- Create storage bucket for tenant logos if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('tenant-logos', 'tenant-logos', true)
ON CONFLICT (id) DO NOTHING;

-- Create storage policies for tenant logos
CREATE POLICY "Tenant logos are publicly accessible"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'tenant-logos');

CREATE POLICY "Tenant admins can upload logos"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'tenant-logos' AND
    EXISTS (
      SELECT 1 FROM tenant_users
      WHERE tenant_id = (storage.foldername(name))[1]::uuid
      AND user_id = auth.uid()
      AND role = 'admin'
    )
  );

CREATE POLICY "Tenant admins can update logos"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'tenant-logos' AND
    EXISTS (
      SELECT 1 FROM tenant_users
      WHERE tenant_id = (storage.foldername(name))[1]::uuid
      AND user_id = auth.uid()
      AND role = 'admin'
    )
  );

CREATE POLICY "Tenant admins can delete logos"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'tenant-logos' AND
    EXISTS (
      SELECT 1 FROM tenant_users
      WHERE tenant_id = (storage.foldername(name))[1]::uuid
      AND user_id = auth.uid()
      AND role = 'admin'
    )
  );

-- Create function to get current tenant
CREATE OR REPLACE FUNCTION get_current_tenant()
RETURNS TABLE (
  id uuid,
  name text,
  subdomain text,
  address text,
  contact_number text,
  email text,
  website text,
  logo_url text,
  status text,
  subscription_tier text,
  subscription_status text,
  subscription_end_date timestamptz,
  created_at timestamptz,
  updated_at timestamptz
)
SECURITY DEFINER
SET search_path = public, auth
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.id,
    t.name,
    t.subdomain,
    t.address,
    t.contact_number,
    t.email,
    t.website,
    t.logo_url,
    t.status,
    t.subscription_tier,
    t.subscription_status,
    t.subscription_end_date,
    t.created_at,
    t.updated_at
  FROM tenants t
  JOIN tenant_users tu ON t.id = tu.tenant_id
  WHERE tu.user_id = auth.uid()
  LIMIT 1;
END;
$$;

-- Create function to create tenant invitation
CREATE OR REPLACE FUNCTION create_tenant_invitation(
  p_tenant_id uuid,
  p_email text,
  p_role text DEFAULT 'member'::text
)
RETURNS uuid
SECURITY DEFINER
SET search_path = public, auth
LANGUAGE plpgsql
AS $$
DECLARE
  v_token text;
  v_invitation_id uuid;
BEGIN
  -- Check if user has admin role for the tenant
  IF NOT EXISTS (
    SELECT 1 FROM tenant_users
    WHERE tenant_id = p_tenant_id
    AND user_id = auth.uid()
    AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Only tenant admins can create invitations';
  END IF;

  -- Generate secure token
  SELECT encode(gen_random_bytes(32), 'base64') INTO v_token;

  -- Create invitation
  INSERT INTO invitations (
    tenant_id,
    email,
    role,
    token,
    expires_at,
    created_by
  )
  VALUES (
    p_tenant_id,
    p_email,
    p_role,
    v_token,
    now() + interval '7 days',
    auth.uid()
  )
  RETURNING id INTO v_invitation_id;

  RETURN v_invitation_id;
END;
$$;

-- Create function to accept tenant invitation
CREATE OR REPLACE FUNCTION accept_tenant_invitation(
  p_token text
)
RETURNS boolean
SECURITY DEFINER
SET search_path = public, auth
LANGUAGE plpgsql
AS $$
DECLARE
  v_invitation invitations%ROWTYPE;
BEGIN
  -- Get and validate invitation
  SELECT * INTO v_invitation
  FROM invitations
  WHERE token = p_token
  AND accepted_at IS NULL
  AND expires_at > now();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid or expired invitation';
  END IF;

  -- Create tenant_user record
  INSERT INTO tenant_users (
    tenant_id,
    user_id,
    role,
    created_by
  )
  VALUES (
    v_invitation.tenant_id,
    auth.uid(),
    v_invitation.role,
    v_invitation.created_by
  )
  ON CONFLICT DO NOTHING;

  -- Mark invitation as accepted
  UPDATE invitations
  SET accepted_at = now()
  WHERE id = v_invitation.id;

  RETURN true;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_current_tenant() TO authenticated;
GRANT EXECUTE ON FUNCTION create_tenant_invitation(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION accept_tenant_invitation(text) TO authenticated;

-- Add helpful comments
COMMENT ON FUNCTION get_current_tenant() IS
  'Returns the tenant (church) associated with the current user';

COMMENT ON FUNCTION create_tenant_invitation(uuid, text, text) IS
  'Creates an invitation for a new user to join a church organization';

COMMENT ON FUNCTION accept_tenant_invitation(text) IS
  'Accepts an invitation and creates the user-tenant relationship';