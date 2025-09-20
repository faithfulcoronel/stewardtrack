-- Populate permission_key and feature_key values for existing menu items

-- Set permission_key and feature_key for global menu items
UPDATE menu_items
SET permission_key = CASE code
    WHEN 'members' THEN 'member.view'
    WHEN 'attendance' THEN 'member.view'
    WHEN 'events' THEN 'member.view'
    WHEN 'finances' THEN 'finance.view'
    WHEN 'offerings' THEN 'finance.view'
    WHEN 'expenses' THEN 'finance.view'
    WHEN 'financial-reports' THEN 'finance.view'
    WHEN 'administration' THEN 'user.view'
    WHEN 'menu-permissions' THEN 'role.edit'
    ELSE permission_key
  END,
    feature_key = code
WHERE tenant_id IS NULL;

-- Propagate feature_key to tenant menu items
UPDATE menu_items t
SET feature_key = g.code
FROM menu_items g
WHERE g.code = t.code
  AND g.tenant_id IS NULL
  AND t.tenant_id IS NOT NULL;
