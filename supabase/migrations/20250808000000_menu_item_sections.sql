-- Add section column to menu_items and populate existing records
ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS section text;

-- Update default global menu items with their sections
UPDATE menu_items
SET section = CASE code
  WHEN 'welcome' THEN 'General'
  WHEN 'announcements' THEN 'General'
  WHEN 'support' THEN 'General'
  WHEN 'members' THEN 'Community'
  WHEN 'attendance' THEN 'Community'
  WHEN 'events' THEN 'Community'
  WHEN 'finances' THEN 'Financial'
  WHEN 'offerings' THEN 'Financial'
  WHEN 'expenses' THEN 'Financial'
  WHEN 'financial-reports' THEN 'Financial'
  WHEN 'administration' THEN 'Administration'
  WHEN 'menu-permissions' THEN 'Administration'
  ELSE 'General'
END
WHERE tenant_id IS NULL AND section IS NULL;

-- Updated helper to copy defaults to tenants including section
CREATE OR REPLACE FUNCTION create_default_menu_items_for_tenant(p_tenant_id uuid, p_user_id uuid)
RETURNS VOID AS $$
BEGIN
  INSERT INTO menu_items (
    tenant_id, parent_id, code, label, path, icon, sort_order, is_system, section, created_by, updated_by
  )
  SELECT p_tenant_id, parent_id, code, label, path, icon, sort_order, is_system, section, p_user_id, p_user_id
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
