-- Populate menu items from navigation config and update helper

-- Insert global menu items
INSERT INTO menu_items (tenant_id, code, label, path, icon, sort_order, is_system)
VALUES
  (NULL, 'welcome', 'Welcome', '/welcome', 'home', 1, TRUE),
  (NULL, 'announcements', 'Announcements', '/announcements', 'bell', 2, TRUE),
  (NULL, 'support', 'Support', '/support', 'life-buoy', 3, TRUE),
    (NULL, 'members', 'Members', '/admin/members', 'users', 4, TRUE),
    (NULL, 'finances', 'Financial Overview', '/admin/finances', 'layout-dashboard', 5, TRUE),
    (NULL, 'offerings', 'Tithes & Offerings', '/admin/income', 'hand-coins', 6, TRUE),
    (NULL, 'expenses', 'Expenses', '/admin/expenses', 'piggy-bank', 7, TRUE),
    (NULL, 'financial-reports', 'Financial Reports', '/admin/finances/reports', 'file-bar-chart', 8, TRUE),
  (NULL, 'administration', 'Admin Dashboard', '/admin/admindashboard', 'shield', 9, TRUE),
  (NULL, 'menu-permissions', 'Menu Permissions', '/admin/menupermissions', 'list-checks', 10, TRUE)
ON CONFLICT (tenant_id, code) DO NOTHING;

-- Map menu items to permissions
WITH perms(code, perm_code) AS (
  VALUES
    ('members', 'member.view'),
    ('finances', 'finance.view'),
    ('offerings', 'finance.view'),
    ('expenses', 'finance.view'),
    ('financial-reports', 'finance.view'),
    ('administration', 'user.view'),
    ('menu-permissions', 'role.edit')
)
INSERT INTO menu_permissions (tenant_id, menu_item_id, permission_id)
SELECT NULL, mi.id, p.id
FROM perms pr
JOIN menu_items mi ON mi.code = pr.code AND mi.tenant_id IS NULL
JOIN permissions p ON p.code = pr.perm_code AND p.tenant_id IS NULL
ON CONFLICT (tenant_id, menu_item_id, permission_id) DO NOTHING;

-- Update function to copy defaults for a tenant
CREATE OR REPLACE FUNCTION create_default_menu_items_for_tenant(p_tenant_id uuid, p_user_id uuid)
RETURNS VOID AS $$
BEGIN
  INSERT INTO menu_items (tenant_id, parent_id, code, label, path, icon, sort_order, is_system, created_by, updated_by)
  SELECT p_tenant_id, parent_id, code, label, path, icon, sort_order, is_system, p_user_id, p_user_id
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

-- Populate existing tenants with any missing menu items
SELECT create_default_menu_items_for_all_tenants();
