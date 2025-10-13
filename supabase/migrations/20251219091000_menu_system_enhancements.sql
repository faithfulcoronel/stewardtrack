/*
  # Menu System Enhancements

  Enhances the existing menu system to support dynamic rendering with:
  - Surface ID integration for AccessGate compatibility
  - Badge configuration for menu items
  - Menu strategy configuration
  - Enhanced metadata support
*/

-- Add new columns to menu_items table
ALTER TABLE menu_items
  ADD COLUMN IF NOT EXISTS surface_id text REFERENCES metadata_surfaces(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS badge_text text,
  ADD COLUMN IF NOT EXISTS badge_variant text CHECK (badge_variant IN ('default', 'primary', 'secondary', 'success', 'warning', 'danger')),
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS is_visible boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}'::jsonb;

-- Create index on surface_id for AccessGate lookups
CREATE INDEX IF NOT EXISTS menu_items_surface_id_idx ON menu_items(surface_id);

-- Create index on is_visible for filtering
CREATE INDEX IF NOT EXISTS menu_items_is_visible_idx ON menu_items(is_visible) WHERE is_visible = true;

-- Create function to get menu items with access check
CREATE OR REPLACE FUNCTION get_accessible_menu_items(
  p_user_id uuid,
  p_tenant_id uuid
)
RETURNS TABLE (
  id uuid,
  parent_id uuid,
  code text,
  label text,
  path text,
  icon text,
  sort_order integer,
  is_system boolean,
  section text,
  feature_key text,
  surface_id text,
  badge_text text,
  badge_variant text,
  description text,
  has_access boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    mi.id,
    mi.parent_id,
    mi.code,
    mi.label,
    mi.path,
    mi.icon,
    mi.sort_order,
    mi.is_system,
    mi.section,
    mi.feature_key,
    mi.surface_id,
    mi.badge_text,
    mi.badge_variant,
    mi.description,
    CASE
      -- If no surface_id, check only role-based permissions
      WHEN mi.surface_id IS NULL THEN
        EXISTS (
          SELECT 1 FROM role_menu_items rmi
          INNER JOIN user_roles ur ON ur.role_id = rmi.role_id
          WHERE rmi.menu_item_id = mi.id
          AND ur.user_id = p_user_id
          AND ur.tenant_id = p_tenant_id
        )
      -- If surface_id exists, use surface bindings for access check
      ELSE
        EXISTS (
          SELECT 1 FROM surface_bindings sb
          INNER JOIN permission_bundles pb ON pb.id = sb.permission_bundle_id
          INNER JOIN permission_bundle_permissions pbp ON pbp.bundle_id = pb.id
          INNER JOIN role_permissions rp ON rp.permission_id = pbp.permission_id
          INNER JOIN user_roles ur ON ur.role_id = rp.role_id
          WHERE sb.surface_id = mi.surface_id
          AND ur.user_id = p_user_id
          AND ur.tenant_id = p_tenant_id
        )
        -- Also check for feature grants if feature_key exists
        AND (
          mi.feature_key IS NULL
          OR EXISTS (
            SELECT 1 FROM tenant_feature_grants tfg
            INNER JOIN license_features lf ON lf.feature = tfg.feature_code
            WHERE tfg.tenant_id = p_tenant_id
            AND tfg.feature_code = mi.feature_key
            AND tfg.deleted_at IS NULL
          )
        )
    END as has_access
  FROM menu_items mi
  WHERE mi.tenant_id = p_tenant_id
  AND mi.deleted_at IS NULL
  AND mi.is_visible = true
  ORDER BY mi.sort_order, mi.label;
END;
$$;

-- Create function to validate menu item hierarchy
CREATE OR REPLACE FUNCTION validate_menu_hierarchy()
RETURNS TRIGGER AS $$
BEGIN
  -- Prevent circular references
  IF NEW.parent_id IS NOT NULL THEN
    IF NEW.id = NEW.parent_id THEN
      RAISE EXCEPTION 'Menu item cannot be its own parent';
    END IF;

    -- Check if parent exists and is in same tenant
    IF NOT EXISTS (
      SELECT 1 FROM menu_items
      WHERE id = NEW.parent_id
      AND tenant_id = NEW.tenant_id
      AND deleted_at IS NULL
    ) THEN
      RAISE EXCEPTION 'Parent menu item does not exist or is in different tenant';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for menu hierarchy validation
DROP TRIGGER IF EXISTS validate_menu_hierarchy_trigger ON menu_items;
CREATE TRIGGER validate_menu_hierarchy_trigger
  BEFORE INSERT OR UPDATE ON menu_items
  FOR EACH ROW
  EXECUTE FUNCTION validate_menu_hierarchy();

-- Add comment for documentation
COMMENT ON COLUMN menu_items.surface_id IS 'Links menu item to metadata surface for AccessGate integration';
COMMENT ON COLUMN menu_items.badge_text IS 'Text to display in menu item badge (e.g., "New", "Beta", "3")';
COMMENT ON COLUMN menu_items.badge_variant IS 'Visual style of badge (default, primary, secondary, success, warning, danger)';
COMMENT ON COLUMN menu_items.description IS 'Tooltip or help text for menu item';
COMMENT ON COLUMN menu_items.is_visible IS 'Whether menu item should be displayed (soft hide without deleting)';
COMMENT ON COLUMN menu_items.metadata IS 'Additional JSON metadata for extensibility';

COMMENT ON FUNCTION get_accessible_menu_items IS 'Returns menu items with access check based on RBAC and licensing';
