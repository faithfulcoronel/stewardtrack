-- Add member_id column to tenant_users table
ALTER TABLE tenant_users
  ADD COLUMN member_id uuid REFERENCES members(id);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_tenant_users_member_id ON tenant_users(member_id);

COMMENT ON COLUMN tenant_users.member_id IS 'Reference to members table';
