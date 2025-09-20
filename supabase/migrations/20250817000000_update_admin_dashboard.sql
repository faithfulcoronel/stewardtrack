-- Update administration menu to Admin Dashboard

-- Update global menu item
UPDATE menu_items
  SET label = 'Admin Dashboard',
      path = '/admin/admindashboard',
      feature_key = 'admin.dashboard'
WHERE tenant_id IS NULL AND code = 'administration';

-- Propagate changes to tenant menu items
UPDATE menu_items t
  SET label = 'Admin Dashboard',
      path = '/admin/admindashboard',
      feature_key = 'admin.dashboard'
FROM menu_items g
WHERE g.code = 'administration'
  AND g.tenant_id IS NULL
  AND t.code = g.code
  AND t.tenant_id IS NOT NULL;

-- Ensure permission mapping remains to user.view
INSERT INTO menu_permissions (tenant_id, menu_item_id, permission_id)
SELECT mi.tenant_id, mi.id, p.id
FROM menu_items mi
JOIN permissions p
  ON p.code = 'user.view'
 AND p.tenant_id IS NOT DISTINCT FROM mi.tenant_id
WHERE mi.code = 'administration'
ON CONFLICT (tenant_id, menu_item_id, permission_id) DO NOTHING;

-- Add license feature for admin dashboard to all tenants
INSERT INTO license_features (tenant_id, license_id, feature, plan_name, feature_key, created_by, updated_by)
SELECT l.tenant_id, l.id, 'admin.dashboard', l.plan_name, 'admin.dashboard', l.created_by, l.created_by
FROM licenses l
WHERE l.plan_name = 'full'
ON CONFLICT (tenant_id, plan_name, feature_key) DO NOTHING;

-- Refresh tenant defaults
SELECT create_default_menu_items_for_all_tenants();
