-- Add dedicated permissions for previously open menu items

-- Insert new permissions if they don't already exist
INSERT INTO permissions (tenant_id, code, name, module, action, description)
VALUES
  (NULL, 'welcome.view', 'View Welcome', 'welcome', 'view', 'Can access the welcome page'),
  (NULL, 'announcements.view', 'View Announcements', 'announcements', 'view', 'Can access announcements'),
  (NULL, 'support.view', 'View Support', 'support', 'view', 'Can access support resources')
ON CONFLICT (tenant_id, code) DO NOTHING;

-- Map permissions to global menu items
WITH m(code, perm_code) AS (
  VALUES
    ('welcome', 'welcome.view'),
    ('announcements', 'announcements.view'),
    ('support', 'support.view')
)
INSERT INTO menu_permissions (tenant_id, menu_item_id, permission_id)
SELECT NULL, mi.id, p.id
FROM m
JOIN menu_items mi ON mi.code = m.code AND mi.tenant_id IS NULL
JOIN permissions p ON p.code = m.perm_code AND p.tenant_id IS NULL
ON CONFLICT (tenant_id, menu_item_id, permission_id) DO NOTHING;

-- Update permission_key for global menu items
UPDATE menu_items SET permission_key = 'welcome.view'
WHERE tenant_id IS NULL AND code = 'welcome';

UPDATE menu_items SET permission_key = 'announcements.view'
WHERE tenant_id IS NULL AND code = 'announcements';

UPDATE menu_items SET permission_key = 'support.view'
WHERE tenant_id IS NULL AND code = 'support';

-- Refresh defaults for all tenants so new permissions propagate
SELECT create_default_menu_items_for_all_tenants();
