-- Add updated_by and deleted_at columns to tenants table
ALTER TABLE tenants
ADD COLUMN IF NOT EXISTS updated_by uuid REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_tenants_deleted_at ON tenants(deleted_at);
