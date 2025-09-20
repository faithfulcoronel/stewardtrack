-- Add permission_key and feature_key columns to menu_items
ALTER TABLE menu_items
  ADD COLUMN IF NOT EXISTS permission_key text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS feature_key text;

-- Populate permission_key by joining menu_permissions and permissions tables
UPDATE menu_items mi
SET permission_key = p.code
FROM menu_permissions mp
JOIN permissions p ON p.id = mp.permission_id
WHERE mp.menu_item_id = mi.id
  AND mp.tenant_id = mi.tenant_id
  AND mi.permission_key = '';

-- Remove default from permission_key column
ALTER TABLE menu_items ALTER COLUMN permission_key DROP DEFAULT;

-- Update create_default_menu_items_for_tenant to include new columns
CREATE OR REPLACE FUNCTION create_default_menu_items_for_tenant(p_tenant_id uuid, p_user_id uuid)
RETURNS VOID AS $$
BEGIN
  INSERT INTO menu_items (
    tenant_id, parent_id, code, label, path, icon, sort_order, is_system, section,
    permission_key, feature_key, created_by, updated_by
  )
  SELECT p_tenant_id, parent_id, code, label, path, icon, sort_order, is_system, section,
    permission_key, feature_key, p_user_id, p_user_id
  FROM menu_items
  WHERE tenant_id IS NULL
  ON CONFLICT (tenant_id, code) DO NOTHING;

  INSERT INTO menu_permissions (tenant_id, menu_item_id, permission_id, created_by, updated_by)
  SELECT p_tenant_id, t_item.id, mp.permission_id, p_user_id, p_user_id
  FROM menu_permissions mp
  JOIN menu_items g_item ON g_item.id = mp.menu_item_id AND g_item.tenant_id IS NULL
  JOIN menu_items t_item ON t_item.code = g_item.code AND t_item.tenant_id = p_tenant_id
  WHERE mp.tenant_id IS NULL
  ON CONFLICT (tenant_id, menu_item_id, permission_id) DO NOTHING;
END;
$$ LANGUAGE plpgsql;
