-- Update menu_permissions with tenant scoped permissions
-- Replace old global permission references for tenant menu items

-- Update existing records to use tenant specific permission ids
UPDATE menu_permissions mp
SET permission_id = tp.id
FROM permissions gp, permissions tp
WHERE mp.permission_id = gp.id
  AND gp.tenant_id IS NULL
  AND mp.tenant_id IS NOT NULL
  AND tp.code = gp.code
  AND tp.tenant_id = mp.tenant_id;


-- Remove duplicates that may have been created
DELETE FROM menu_permissions mp
USING (
  SELECT id,
         ROW_NUMBER() OVER (PARTITION BY tenant_id, menu_item_id, permission_id ORDER BY id) AS rn
  FROM menu_permissions
) dup
WHERE mp.id = dup.id
  AND dup.rn > 1;

-- Delete any remaining menu_permissions referencing global permissions
DELETE FROM menu_permissions mp
USING permissions gp
WHERE mp.permission_id = gp.id
  AND gp.tenant_id IS NULL
  AND mp.tenant_id IS NOT NULL;

-- Update helper to copy menu permissions with tenant scoped ids
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
  SELECT p_tenant_id, t_item.id, tp.id, p_user_id, p_user_id
  FROM menu_permissions mp
  JOIN menu_items g_item ON g_item.id = mp.menu_item_id AND g_item.tenant_id IS NULL
  JOIN permissions gp ON gp.id = mp.permission_id AND gp.tenant_id IS NULL
  JOIN permissions tp ON tp.code = gp.code AND tp.tenant_id = p_tenant_id
  JOIN menu_items t_item ON t_item.code = g_item.code AND t_item.tenant_id = p_tenant_id
  WHERE mp.tenant_id IS NULL
  ON CONFLICT (tenant_id, menu_item_id, permission_id) DO NOTHING;
END;
$$ LANGUAGE plpgsql;

-- Refresh menu items and permissions for all tenants
SELECT create_default_menu_items_for_all_tenants();
