-- Seed role_menu_items for all existing tenants

CREATE OR REPLACE FUNCTION create_default_role_menu_items_for_all_tenants()
RETURNS void AS $$
BEGIN
  INSERT INTO role_menu_items (tenant_id, role_id, menu_item_id)
  SELECT COALESCE(rp.tenant_id, mp.tenant_id), rp.role_id, mp.menu_item_id
  FROM menu_permissions mp
  JOIN role_permissions rp
    ON rp.permission_id = mp.permission_id
   AND (rp.tenant_id = mp.tenant_id OR (rp.tenant_id IS NULL AND mp.tenant_id IS NULL))
  ON CONFLICT (tenant_id, role_id, menu_item_id) DO NOTHING;
END;
$$ LANGUAGE plpgsql;

-- Ensure menu permissions and menu items are populated
SELECT create_default_menu_items_for_all_tenants();

-- Map roles to menu items for all tenants
SELECT create_default_role_menu_items_for_all_tenants();

-- Grant execute permission
GRANT EXECUTE ON FUNCTION create_default_role_menu_items_for_all_tenants() TO authenticated;
