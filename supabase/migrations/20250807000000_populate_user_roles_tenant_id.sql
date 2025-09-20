-- Populate user_roles.tenant_id by joining tenant_users
UPDATE user_roles ur
SET tenant_id = tu.tenant_id
FROM tenant_users tu
WHERE ur.user_id = tu.user_id
  AND ur.tenant_id IS NULL
  AND NOT EXISTS (
    SELECT 1
    FROM user_roles dup
    WHERE dup.user_id = ur.user_id
      AND dup.role_id = ur.role_id
      AND dup.tenant_id = tu.tenant_id
  );
