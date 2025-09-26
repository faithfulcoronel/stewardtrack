/*
  # License-Aware Views and Enhanced Policies

  This migration creates views and policies that integrate license checking
  with RBAC decisions, ensuring features are only accessible when properly licensed.
*/

-- Create a view for active license features per tenant
CREATE OR REPLACE VIEW active_tenant_license_features AS
SELECT DISTINCT
  l.tenant_id,
  lf.feature,
  l.tier,
  l.status,
  l.expires_at
FROM licenses l
JOIN license_features lf ON l.id = lf.license_id
WHERE l.status = 'active'
  AND l.deleted_at IS NULL
  AND lf.deleted_at IS NULL
  AND (l.expires_at IS NULL OR l.expires_at >= CURRENT_DATE);

-- Create a view for user menu access with license validation
CREATE OR REPLACE VIEW user_menu_access AS
SELECT DISTINCT
  ur.tenant_id,
  ur.user_id,
  mi.id as menu_item_id,
  mi.code as menu_code,
  mi.label as menu_label,
  mi.path as menu_path,
  mi.icon as menu_icon,
  mi.sort_order,
  mi.feature_code as menu_feature_code,
  rsb.required_feature_code as binding_feature_code,
  r.name as role_name,
  r.metadata_key as role_metadata_key,
  pb.name as bundle_name,
  pb.metadata_key as bundle_metadata_key,
  -- License validation
  CASE
    WHEN mi.feature_code IS NOT NULL THEN
      EXISTS (
        SELECT 1 FROM active_tenant_license_features atlf
        WHERE atlf.tenant_id = ur.tenant_id
          AND atlf.feature = mi.feature_code
      )
    WHEN rsb.required_feature_code IS NOT NULL THEN
      EXISTS (
        SELECT 1 FROM active_tenant_license_features atlf
        WHERE atlf.tenant_id = ur.tenant_id
          AND atlf.feature = rsb.required_feature_code
      )
    ELSE true
  END as has_license_access,
  -- RBAC validation
  CASE
    WHEN rsb.role_id IS NOT NULL THEN 'role'
    WHEN rsb.bundle_id IS NOT NULL THEN 'bundle'
    ELSE 'direct'
  END as access_type
FROM user_roles ur
JOIN roles r ON ur.role_id = r.id
JOIN menu_items mi ON mi.tenant_id = ur.tenant_id
LEFT JOIN rbac_surface_bindings rsb ON (
  (rsb.role_id = ur.role_id OR
   EXISTS (
     SELECT 1 FROM role_bundles rb
     WHERE rb.role_id = ur.role_id
       AND rb.bundle_id = rsb.bundle_id
       AND rb.tenant_id = ur.tenant_id
   )) AND
  rsb.menu_item_id = mi.id AND
  rsb.tenant_id = ur.tenant_id AND
  rsb.is_active = true
)
LEFT JOIN permission_bundles pb ON rsb.bundle_id = pb.id
WHERE mi.deleted_at IS NULL
  AND (rsb.id IS NOT NULL OR (
    -- Allow access if no explicit binding but user has role
    NOT EXISTS (
      SELECT 1 FROM rbac_surface_bindings rsb2
      WHERE rsb2.menu_item_id = mi.id
        AND rsb2.tenant_id = mi.tenant_id
        AND rsb2.is_active = true
    )
  ));

-- Create a view for user metadata page access
CREATE OR REPLACE VIEW user_metadata_page_access AS
SELECT DISTINCT
  ur.tenant_id,
  ur.user_id,
  mp.id as metadata_page_id,
  mp.module,
  mp.route,
  mp.title,
  mp.feature_code,
  r.metadata_key as role_metadata_key,
  pb.metadata_key as bundle_metadata_key,
  -- Check if user has required roles/bundles
  CASE
    WHEN mp.rbac_roles IS NOT NULL AND array_length(mp.rbac_roles, 1) > 0 THEN
      r.metadata_key = ANY(mp.rbac_roles)
    WHEN mp.rbac_bundles IS NOT NULL AND array_length(mp.rbac_bundles, 1) > 0 THEN
      EXISTS (
        SELECT 1 FROM role_bundles rb
        JOIN permission_bundles pb2 ON rb.bundle_id = pb2.id
        WHERE rb.role_id = ur.role_id
          AND rb.tenant_id = ur.tenant_id
          AND pb2.metadata_key = ANY(mp.rbac_bundles)
      )
    ELSE true
  END as has_rbac_access,
  -- License validation
  CASE
    WHEN mp.feature_code IS NOT NULL THEN
      EXISTS (
        SELECT 1 FROM active_tenant_license_features atlf
        WHERE atlf.tenant_id = ur.tenant_id
          AND atlf.feature = mp.feature_code
      )
    ELSE true
  END as has_license_access
FROM user_roles ur
JOIN roles r ON ur.role_id = r.id
CROSS JOIN metadata_pages mp
LEFT JOIN role_bundles rb ON rb.role_id = ur.role_id AND rb.tenant_id = ur.tenant_id
LEFT JOIN permission_bundles pb ON rb.bundle_id = pb.id
WHERE (mp.tenant_id = ur.tenant_id OR mp.is_system = true);

-- Enhanced function to get user's licensed and permitted menu items
CREATE OR REPLACE FUNCTION get_user_licensed_menu_items(target_user_id uuid, target_tenant_id uuid DEFAULT NULL)
RETURNS TABLE (
  menu_item_id uuid,
  menu_code text,
  menu_label text,
  menu_path text,
  menu_icon text,
  sort_order integer,
  access_type text,
  role_name text,
  bundle_name text
)
SECURITY DEFINER
SET search_path = public, auth
LANGUAGE plpgsql
AS $$
DECLARE
  effective_tenant_id uuid;
BEGIN
  -- Use provided tenant_id or determine from context
  effective_tenant_id := COALESCE(target_tenant_id, current_tenant());

  IF effective_tenant_id IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT DISTINCT
    uma.menu_item_id,
    uma.menu_code,
    uma.menu_label,
    uma.menu_path,
    uma.menu_icon,
    uma.sort_order,
    uma.access_type,
    uma.role_name,
    uma.bundle_name
  FROM user_menu_access uma
  WHERE uma.tenant_id = effective_tenant_id
    AND uma.user_id = target_user_id
    AND uma.has_license_access = true
  ORDER BY uma.sort_order, uma.menu_label;
END;
$$;

-- Enhanced function to get user's licensed and permitted metadata pages
CREATE OR REPLACE FUNCTION get_user_licensed_metadata_pages(target_user_id uuid, target_tenant_id uuid DEFAULT NULL)
RETURNS TABLE (
  metadata_page_id text,
  module text,
  route text,
  title text,
  feature_code text
)
SECURITY DEFINER
SET search_path = public, auth
LANGUAGE plpgsql
AS $$
DECLARE
  effective_tenant_id uuid;
BEGIN
  -- Use provided tenant_id or determine from context
  effective_tenant_id := COALESCE(target_tenant_id, current_tenant());

  IF effective_tenant_id IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT DISTINCT
    umpa.metadata_page_id,
    umpa.module,
    umpa.route,
    umpa.title,
    umpa.feature_code
  FROM user_metadata_page_access umpa
  WHERE umpa.tenant_id = effective_tenant_id
    AND umpa.user_id = target_user_id
    AND umpa.has_rbac_access = true
    AND umpa.has_license_access = true
  ORDER BY umpa.module, umpa.route;
END;
$$;

-- Function to check if a tenant has access to a specific feature
CREATE OR REPLACE FUNCTION tenant_has_feature(feature_code text, tenant_id uuid DEFAULT NULL)
RETURNS boolean
SECURITY DEFINER
SET search_path = public, auth
LANGUAGE plpgsql
AS $$
DECLARE
  effective_tenant_id uuid;
BEGIN
  effective_tenant_id := COALESCE(tenant_id, current_tenant());

  IF effective_tenant_id IS NULL THEN
    RETURN false;
  END IF;

  RETURN EXISTS (
    SELECT 1 FROM active_tenant_license_features atlf
    WHERE atlf.tenant_id = effective_tenant_id
      AND atlf.feature = feature_code
  );
END;
$$;

-- Function to validate feature access for current user
CREATE OR REPLACE FUNCTION can_access_feature(feature_code text, tenant_id uuid DEFAULT NULL)
RETURNS boolean
SECURITY DEFINER
SET search_path = public, auth
LANGUAGE plpgsql
AS $$
DECLARE
  effective_tenant_id uuid;
BEGIN
  effective_tenant_id := COALESCE(tenant_id, current_tenant());

  IF effective_tenant_id IS NULL THEN
    RETURN false;
  END IF;

  -- Check if user belongs to the tenant and tenant has the feature
  RETURN EXISTS (
    SELECT 1
    FROM tenant_users tu
    JOIN active_tenant_license_features atlf ON tu.tenant_id = atlf.tenant_id
    WHERE tu.user_id = auth.uid()
      AND tu.tenant_id = effective_tenant_id
      AND atlf.feature = feature_code
  );
END;
$$;

-- Enhanced RLS policies that include license checks

-- Update menu_items policy to include license validation
DROP POLICY IF EXISTS "Menu items are viewable within tenant" ON menu_items;
CREATE POLICY "Menu items are viewable within tenant" ON menu_items
  FOR SELECT TO authenticated
  USING (
    check_tenant_access(tenant_id) AND
    deleted_at IS NULL AND
    (
      feature_code IS NULL OR
      tenant_has_feature(feature_code, tenant_id)
    )
  );

-- Update metadata_pages policy to include license validation
DROP POLICY IF EXISTS "Metadata pages are viewable within tenant" ON metadata_pages;
CREATE POLICY "Metadata pages are viewable within tenant" ON metadata_pages
  FOR SELECT TO authenticated
  USING (
    (check_tenant_access(tenant_id) OR is_system = true) AND
    (
      feature_code IS NULL OR
      tenant_has_feature(feature_code, COALESCE(tenant_id, current_tenant()))
    )
  );

-- Update rbac_surface_bindings policy to include license validation
DROP POLICY IF EXISTS "Surface bindings are viewable within tenant" ON rbac_surface_bindings;
CREATE POLICY "Surface bindings are viewable within tenant" ON rbac_surface_bindings
  FOR SELECT TO authenticated
  USING (
    check_tenant_access(tenant_id) AND
    is_active = true AND
    (
      required_feature_code IS NULL OR
      tenant_has_feature(required_feature_code, tenant_id)
    )
  );

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_user_licensed_menu_items(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_licensed_metadata_pages(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION tenant_has_feature(text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION can_access_feature(text, uuid) TO authenticated;

-- Grant access to views
GRANT SELECT ON active_tenant_license_features TO authenticated;
GRANT SELECT ON user_menu_access TO authenticated;
GRANT SELECT ON user_metadata_page_access TO authenticated;

-- Comments for documentation
COMMENT ON VIEW active_tenant_license_features IS
  'Shows active license features available for each tenant.';
COMMENT ON VIEW user_menu_access IS
  'Shows menu items accessible to users with RBAC and license validation.';
COMMENT ON VIEW user_metadata_page_access IS
  'Shows metadata pages accessible to users with RBAC and license validation.';
COMMENT ON FUNCTION tenant_has_feature(text, uuid) IS
  'Checks if a tenant has access to a specific licensed feature.';
COMMENT ON FUNCTION can_access_feature(text, uuid) IS
  'Checks if the current user can access a feature based on tenant licensing.';