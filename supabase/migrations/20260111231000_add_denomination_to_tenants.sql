-- Add denomination field to tenants table
-- This stores the church's denomination (e.g., "UCCP", "Catholic", "Baptist", etc.)
-- as a text field for flexibility

ALTER TABLE tenants
ADD COLUMN IF NOT EXISTS denomination text;

-- Add comment for documentation
COMMENT ON COLUMN tenants.denomination IS 'The church/organization''s religious denomination (e.g., UCCP, Catholic, Baptist, etc.)';
