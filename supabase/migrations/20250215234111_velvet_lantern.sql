-- Drop existing functions
DROP FUNCTION IF EXISTS get_current_tenant();
DROP FUNCTION IF EXISTS update_tenant_settings(uuid, text, text, text, text, text, text);

-- Create improved function to get current tenant with explicit table references
CREATE OR REPLACE FUNCTION get_current_tenant()
RETURNS SETOF tenants
SECURITY DEFINER
SET search_path = public, auth
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT t.*
  FROM tenants t
  JOIN tenant_users tu ON t.id = tu.tenant_id
  WHERE tu.user_id = auth.uid()
  AND tu.admin_role != 'super_admin'
  ORDER BY t.created_at DESC
  LIMIT 1;
END;
$$;

-- Create function to update tenant settings
CREATE OR REPLACE FUNCTION update_tenant_settings(
  p_tenant_id uuid,
  p_name text,
  p_address text,
  p_contact_number text,
  p_email text,
  p_website text,
  p_profile_picture_url text
)
RETURNS jsonb
SECURITY DEFINER
SET search_path = public, auth
LANGUAGE plpgsql
AS $$
DECLARE
  v_tenant tenants%ROWTYPE;
  v_result jsonb;
BEGIN
  -- Check if user has admin permissions for this tenant
  IF NOT EXISTS (
    SELECT 1 
    FROM tenant_users tu
    WHERE tu.tenant_id = p_tenant_id
    AND tu.user_id = auth.uid()
    AND tu.admin_role IN ('super_admin', 'tenant_admin')
  ) THEN
    RAISE EXCEPTION 'Only tenant administrators can update settings';
  END IF;

  -- Get current tenant data
  SELECT * INTO v_tenant
  FROM tenants t
  WHERE t.id = p_tenant_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Tenant not found';
  END IF;

  -- Update tenant settings
  UPDATE tenants t
  SET
    name = p_name,
    address = COALESCE(NULLIF(p_address, ''), t.address),
    contact_number = COALESCE(NULLIF(p_contact_number, ''), t.contact_number),
    email = COALESCE(NULLIF(p_email, ''), t.email),
    website = COALESCE(NULLIF(p_website, ''), t.website),
    profile_picture_url = COALESCE(NULLIF(p_profile_picture_url, ''), t.profile_picture_url),
    updated_at = now()
  WHERE t.id = p_tenant_id
  RETURNING jsonb_build_object(
    'id', id,
    'name', name,
    'address', address,
    'contact_number', contact_number,
    'email', email,
    'website', website,
    'profile_picture_url', profile_picture_url,
    'updated_at', updated_at
  ) INTO v_result;

  RETURN v_result;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_current_tenant() TO authenticated;
GRANT EXECUTE ON FUNCTION update_tenant_settings(uuid, text, text, text, text, text, text) TO authenticated;

-- Add helpful comments
COMMENT ON FUNCTION get_current_tenant() IS
  'Returns the tenant (church) associated with the current user with explicit table references to avoid ambiguity';

COMMENT ON FUNCTION update_tenant_settings(uuid, text, text, text, text, text, text) IS
  'Updates tenant settings with proper permission checks and explicit table references';