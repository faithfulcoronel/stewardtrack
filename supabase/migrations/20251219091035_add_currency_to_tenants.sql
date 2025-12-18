-- Add currency field to tenants table
-- Migration: 20251219091035_add_currency_to_tenants.sql
--
-- Adds currency field to store default currency for tenant
-- Default is PHP (Philippine Peso) as per requirements

-- Add currency column
ALTER TABLE tenants
ADD COLUMN IF NOT EXISTS currency varchar(3) DEFAULT 'PHP';

-- Add comment
COMMENT ON COLUMN tenants.currency IS 'Default currency code (ISO 4217) for financial transactions';

-- Backfill existing records with default currency
UPDATE tenants
SET currency = 'PHP'
WHERE currency IS NULL;
