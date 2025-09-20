-- Ensure user_roles has a unique constraint including tenant_id for upserts
-- Remove duplicates before adding the constraint
DELETE FROM user_roles ur
USING (
  SELECT ctid
  FROM (
    SELECT ctid,
           ROW_NUMBER() OVER (PARTITION BY user_id, role_id, tenant_id ORDER BY created_at) AS rn
    FROM user_roles
  ) sub
  WHERE rn > 1
) dup
WHERE ur.ctid = dup.ctid;

ALTER TABLE user_roles
  ADD CONSTRAINT user_roles_user_role_tenant_unique
  UNIQUE (user_id, role_id, tenant_id);
