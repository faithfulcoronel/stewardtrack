-- Remove duplicate tenant_user rows by tenant and member before enforcing unique constraint
DELETE FROM tenant_users tu
USING (
  SELECT ctid
  FROM (
    SELECT ctid,
           ROW_NUMBER() OVER (PARTITION BY tenant_id, member_id ORDER BY created_at) AS rn
    FROM tenant_users
    WHERE member_id IS NOT NULL
  ) sub
  WHERE rn > 1
) dup
WHERE tu.ctid = dup.ctid;

-- Add unique constraint to ensure a member can only belong to a tenant once
ALTER TABLE tenant_users
  ADD CONSTRAINT tenant_users_member_unique
  UNIQUE (tenant_id, member_id);
