-- Seed tenant-specific role records and update existing user assignments

-- 1. Copy global roles to each tenant
INSERT INTO roles (tenant_id, name, description, created_by)
SELECT t.id, r.name, r.description, t.created_by
FROM roles r CROSS JOIN tenants t
WHERE r.tenant_id IS NULL
ON CONFLICT (tenant_id, name) DO NOTHING;

-- 2. Remove assignments that would conflict after update
DELETE FROM user_roles ur
USING roles r, roles tr
WHERE ur.role_id = r.id
  AND r.tenant_id IS NULL
  AND tr.tenant_id = ur.tenant_id
  AND tr.name = r.name
  AND EXISTS (
    SELECT 1
    FROM user_roles dup
    WHERE dup.user_id = ur.user_id
      AND dup.role_id = tr.id
      AND dup.tenant_id = ur.tenant_id
  );


-- 3. Update remaining assignments to tenant-specific role IDs
UPDATE user_roles ur
SET role_id = tr.id
FROM roles r, roles tr
WHERE ur.role_id = r.id
  AND r.tenant_id IS NULL
  AND tr.tenant_id = ur.tenant_id
  AND tr.name = r.name;
