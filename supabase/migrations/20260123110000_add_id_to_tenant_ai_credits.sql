-- ============================================
-- Add id column to tenant_ai_credits for BaseModel compatibility
-- ============================================

-- Add id column with UUID
ALTER TABLE tenant_ai_credits ADD COLUMN id UUID DEFAULT gen_random_uuid();

-- Set id to tenant_id for existing rows
UPDATE tenant_ai_credits SET id = tenant_id;

-- Make id NOT NULL and UNIQUE
ALTER TABLE tenant_ai_credits ALTER COLUMN id SET NOT NULL;
ALTER TABLE tenant_ai_credits ADD CONSTRAINT tenant_ai_credits_id_unique UNIQUE (id);

-- Add index on id for faster lookups
CREATE INDEX idx_tenant_ai_credits_id ON tenant_ai_credits(id);
