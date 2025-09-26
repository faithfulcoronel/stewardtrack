/*
  # Menu and Metadata Feature Code Extensions

  This migration extends menu items and metadata schemas to include
  feature_code references for license-aware access control.
*/

-- Add feature_code to menu_items for direct license binding
ALTER TABLE menu_items
  ADD COLUMN IF NOT EXISTS feature_code text,
  ADD COLUMN IF NOT EXISTS metadata_page_id text; -- Link to metadata pages

-- Create indexes for the new columns
CREATE INDEX IF NOT EXISTS menu_items_feature_code_idx ON menu_items(feature_code) WHERE feature_code IS NOT NULL;
CREATE INDEX IF NOT EXISTS menu_items_metadata_page_id_idx ON menu_items(metadata_page_id) WHERE metadata_page_id IS NOT NULL;

-- Create metadata page registry table
CREATE TABLE IF NOT EXISTS metadata_pages (
  id text PRIMARY KEY, -- The page identifier used in metadata
  tenant_id uuid REFERENCES tenants(id) ON DELETE CASCADE,
  module text NOT NULL,
  route text NOT NULL,
  title text NOT NULL,
  description text,
  feature_code text, -- Required license feature
  rbac_roles text[], -- Array of role metadata keys that can access this page
  rbac_bundles text[], -- Array of bundle codes that can access this page
  is_system boolean DEFAULT false,
  created_by uuid REFERENCES auth.users(id),
  updated_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (tenant_id, module, route)
);

-- Indexes for metadata_pages
CREATE INDEX IF NOT EXISTS metadata_pages_tenant_id_idx ON metadata_pages(tenant_id);
CREATE INDEX IF NOT EXISTS metadata_pages_module_idx ON metadata_pages(module);
CREATE INDEX IF NOT EXISTS metadata_pages_feature_code_idx ON metadata_pages(feature_code) WHERE feature_code IS NOT NULL;
CREATE INDEX IF NOT EXISTS metadata_pages_rbac_roles_idx ON metadata_pages USING GIN(rbac_roles) WHERE rbac_roles IS NOT NULL;
CREATE INDEX IF NOT EXISTS metadata_pages_rbac_bundles_idx ON metadata_pages USING GIN(rbac_bundles) WHERE rbac_bundles IS NOT NULL;

-- Enable RLS
ALTER TABLE metadata_pages ENABLE ROW LEVEL SECURITY;

-- RLS policies for metadata_pages
CREATE POLICY "Metadata pages are viewable within tenant" ON metadata_pages
  FOR SELECT TO authenticated
  USING (check_tenant_access(tenant_id) OR is_system = true);

CREATE POLICY "Metadata pages can be managed within tenant" ON metadata_pages
  FOR ALL TO authenticated
  USING (check_tenant_access(tenant_id))
  WITH CHECK (check_tenant_access(tenant_id));

-- Updated_at trigger
CREATE TRIGGER update_metadata_pages_updated_at
BEFORE UPDATE ON metadata_pages
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Function to register metadata pages for tenants
CREATE OR REPLACE FUNCTION register_metadata_page(
  p_page_id text,
  p_tenant_id uuid,
  p_module text,
  p_route text,
  p_title text,
  p_description text DEFAULT NULL,
  p_feature_code text DEFAULT NULL,
  p_rbac_roles text[] DEFAULT NULL,
  p_rbac_bundles text[] DEFAULT NULL
)
RETURNS uuid
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO metadata_pages (
    id, tenant_id, module, route, title, description,
    feature_code, rbac_roles, rbac_bundles, created_by, updated_by
  )
  VALUES (
    p_page_id, p_tenant_id, p_module, p_route, p_title, p_description,
    p_feature_code, p_rbac_roles, p_rbac_bundles, auth.uid(), auth.uid()
  )
  ON CONFLICT (tenant_id, module, route)
  DO UPDATE SET
    id = EXCLUDED.id,
    title = EXCLUDED.title,
    description = EXCLUDED.description,
    feature_code = EXCLUDED.feature_code,
    rbac_roles = EXCLUDED.rbac_roles,
    rbac_bundles = EXCLUDED.rbac_bundles,
    updated_by = auth.uid(),
    updated_at = now();

  RETURN p_tenant_id;
END;
$$;

-- Function to check if user can access a metadata page
CREATE OR REPLACE FUNCTION can_access_metadata_page(
  p_page_id text,
  p_user_id uuid,
  p_tenant_id uuid DEFAULT NULL
)
RETURNS boolean
SECURITY DEFINER
SET search_path = public, auth
LANGUAGE plpgsql
AS $$
DECLARE
  effective_tenant_id uuid;
  page_record metadata_pages;
  user_role_keys text[];
BEGIN
  -- Use provided tenant_id or determine from context
  effective_tenant_id := COALESCE(p_tenant_id, current_tenant());

  IF effective_tenant_id IS NULL THEN
    RETURN false;
  END IF;

  -- Get the metadata page
  SELECT * INTO page_record
  FROM metadata_pages
  WHERE id = p_page_id
    AND (tenant_id = effective_tenant_id OR is_system = true);

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  -- Check license requirement if specified
  IF page_record.feature_code IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM licenses l
      JOIN license_features lf ON l.id = lf.license_id
      WHERE l.tenant_id = effective_tenant_id
        AND l.status = 'active'
        AND l.deleted_at IS NULL
        AND lf.feature = page_record.feature_code
        AND lf.deleted_at IS NULL
        AND (l.expires_at IS NULL OR l.expires_at >= CURRENT_DATE)
    ) THEN
      RETURN false;
    END IF;
  END IF;

  -- If no RBAC restrictions, allow access
  IF (page_record.rbac_roles IS NULL OR array_length(page_record.rbac_roles, 1) = 0) AND
     (page_record.rbac_bundles IS NULL OR array_length(page_record.rbac_bundles, 1) = 0) THEN
    RETURN true;
  END IF;

  -- Get user's role metadata keys
  user_role_keys := get_user_role_metadata_keys(p_user_id, effective_tenant_id);

  -- Check if user has any required role or bundle
  IF page_record.rbac_roles IS NOT NULL THEN
    IF user_role_keys && page_record.rbac_roles THEN
      RETURN true;
    END IF;
  END IF;

  IF page_record.rbac_bundles IS NOT NULL THEN
    IF user_role_keys && page_record.rbac_bundles THEN
      RETURN true;
    END IF;
  END IF;

  RETURN false;
END;
$$;

-- Enhanced function to get user accessible menu items with metadata page integration
CREATE OR REPLACE FUNCTION get_user_menu_with_metadata(target_user_id uuid, target_tenant_id uuid DEFAULT NULL)
RETURNS TABLE (
  menu_item_id uuid,
  menu_code text,
  menu_label text,
  menu_path text,
  menu_icon text,
  sort_order integer,
  feature_code text,
  metadata_page_id text,
  can_access boolean
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
    mi.id as menu_item_id,
    mi.code as menu_code,
    mi.label as menu_label,
    mi.path as menu_path,
    mi.icon as menu_icon,
    mi.sort_order,
    COALESCE(mi.feature_code, mp.feature_code) as feature_code,
    COALESCE(mi.metadata_page_id, mp.id) as metadata_page_id,
    CASE
      -- Check menu item feature code if present
      WHEN mi.feature_code IS NOT NULL THEN
        EXISTS (
          SELECT 1 FROM licenses l
          JOIN license_features lf ON l.id = lf.license_id
          WHERE l.tenant_id = effective_tenant_id
            AND l.status = 'active'
            AND l.deleted_at IS NULL
            AND lf.feature = mi.feature_code
            AND lf.deleted_at IS NULL
            AND (l.expires_at IS NULL OR l.expires_at >= CURRENT_DATE)
        )
      -- Check metadata page accessibility
      WHEN mi.metadata_page_id IS NOT NULL THEN
        can_access_metadata_page(mi.metadata_page_id, target_user_id, effective_tenant_id)
      -- Default to accessible if no restrictions
      ELSE true
    END as can_access
  FROM menu_items mi
  LEFT JOIN metadata_pages mp ON mi.metadata_page_id = mp.id
  LEFT JOIN rbac_surface_bindings rsb ON mi.id = rsb.menu_item_id AND rsb.tenant_id = effective_tenant_id
  LEFT JOIN user_roles ur ON (
    (rsb.role_id IS NOT NULL AND ur.role_id = rsb.role_id) OR
    (rsb.bundle_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM role_bundles rb
      WHERE rb.bundle_id = rsb.bundle_id
        AND rb.role_id = ur.role_id
        AND rb.tenant_id = effective_tenant_id
    ))
  )
  WHERE mi.tenant_id = effective_tenant_id
    AND mi.deleted_at IS NULL
    AND (rsb.is_active IS NULL OR rsb.is_active = true)
    AND ur.user_id = target_user_id
    AND ur.tenant_id = effective_tenant_id
  ORDER BY mi.sort_order, mi.label;
END;
$$;

-- Seed some example metadata pages for existing routes
INSERT INTO metadata_pages (id, tenant_id, module, route, title, description, rbac_roles, is_system)
VALUES
  ('admin-members', NULL, 'admin-community', '/admin/members', 'Member Management', 'Manage congregation members', ARRAY['admin', 'member_manager'], true),
  ('admin-settings', NULL, 'admin-settings', '/admin/settings', 'System Settings', 'Configure system settings', ARRAY['admin', 'super_admin'], true),
  ('dashboard', NULL, 'core', '/dashboard', 'Dashboard', 'Main dashboard view', NULL, true),
  ('finance', NULL, 'finance', '/finance', 'Financial Management', 'Manage finances and donations', ARRAY['admin', 'treasurer'], true)
ON CONFLICT (tenant_id, module, route) DO NOTHING;

-- Function to sync metadata page bindings to surface bindings
CREATE OR REPLACE FUNCTION sync_metadata_pages_to_surface_bindings()
RETURNS void
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
DECLARE
  page_record metadata_pages;
  role_key text;
  bundle_key text;
  tenant_record tenants;
  role_record roles;
  bundle_record permission_bundles;
BEGIN
  -- For each tenant, create surface bindings for metadata pages
  FOR tenant_record IN SELECT * FROM tenants LOOP
    FOR page_record IN SELECT * FROM metadata_pages WHERE is_system = true LOOP
      -- Create role-based bindings
      IF page_record.rbac_roles IS NOT NULL THEN
        FOREACH role_key IN ARRAY page_record.rbac_roles LOOP
          -- Find matching role by metadata_key
          SELECT * INTO role_record
          FROM roles
          WHERE tenant_id = tenant_record.id
            AND metadata_key = role_key;

          IF FOUND THEN
            INSERT INTO rbac_surface_bindings (
              tenant_id, role_id, metadata_page_id, required_feature_code, created_by, updated_by
            )
            VALUES (
              tenant_record.id, role_record.id, page_record.id, page_record.feature_code, tenant_record.created_by, tenant_record.created_by
            )
            ON CONFLICT (tenant_id, role_id, menu_item_id, metadata_page_id) DO NOTHING;
          END IF;
        END LOOP;
      END IF;

      -- Create bundle-based bindings
      IF page_record.rbac_bundles IS NOT NULL THEN
        FOREACH bundle_key IN ARRAY page_record.rbac_bundles LOOP
          -- Find matching bundle by metadata_key
          SELECT * INTO bundle_record
          FROM permission_bundles
          WHERE tenant_id = tenant_record.id
            AND metadata_key = bundle_key;

          IF FOUND THEN
            INSERT INTO rbac_surface_bindings (
              tenant_id, bundle_id, metadata_page_id, required_feature_code, created_by, updated_by
            )
            VALUES (
              tenant_record.id, bundle_record.id, page_record.id, page_record.feature_code, tenant_record.created_by, tenant_record.created_by
            )
            ON CONFLICT (tenant_id, bundle_id, menu_item_id, metadata_page_id) DO NOTHING;
          END IF;
        END LOOP;
      END IF;
    END LOOP;
  END LOOP;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION register_metadata_page(text, uuid, text, text, text, text, text, text[], text[]) TO authenticated;
GRANT EXECUTE ON FUNCTION can_access_metadata_page(text, uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_menu_with_metadata(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION sync_metadata_pages_to_surface_bindings() TO authenticated;

-- Comments for documentation
COMMENT ON TABLE metadata_pages IS
  'Registry of metadata pages with their RBAC and license requirements.';
COMMENT ON FUNCTION can_access_metadata_page(text, uuid, uuid) IS
  'Checks if a user can access a specific metadata page based on RBAC and license requirements.';
COMMENT ON FUNCTION get_user_menu_with_metadata(uuid, uuid) IS
  'Returns menu items with metadata page integration and access validation.';