-- Fix envelope_number constraints and indexes to be tenant-scoped
-- The original implementation had several issues:
-- 1. Unique constraint was globally unique instead of tenant-scoped
-- 2. Index was not tenant-scoped
-- 3. Validation was too strict (only digits)
-- 4. Normalization stripped leading zeros

-- Drop the old global unique constraint
ALTER TABLE members
DROP CONSTRAINT IF EXISTS members_envelope_number_unique;

-- Drop the old non-tenant-scoped index
DROP INDEX IF EXISTS members_envelope_number_idx;

-- Drop the overly strict check constraint
ALTER TABLE members
DROP CONSTRAINT IF EXISTS members_envelope_number_valid;

-- Drop the trigger that strips leading zeros
DROP TRIGGER IF EXISTS normalize_envelope_number_before_save ON members;

-- Update validation function to be more flexible (allows alphanumeric)
CREATE OR REPLACE FUNCTION validate_envelope_number(envelope_number text)
RETURNS boolean AS $$
BEGIN
  -- Check if envelope number is NULL (allowed)
  IF envelope_number IS NULL THEN
    RETURN true;
  END IF;

  -- Check if envelope number is empty string (not allowed)
  IF envelope_number = '' THEN
    RETURN false;
  END IF;

  -- Allow alphanumeric characters, hyphens, and underscores
  -- This supports various church envelope numbering schemes
  IF envelope_number !~ '^[A-Za-z0-9_-]+$' THEN
    RETURN false;
  END IF;

  -- Check reasonable length (1-50 characters)
  IF length(envelope_number) > 50 THEN
    RETURN false;
  END IF;

  RETURN true;
END;
$$ LANGUAGE plpgsql;

-- Update normalize function to preserve leading zeros and just trim whitespace
CREATE OR REPLACE FUNCTION normalize_envelope_number(envelope_number text)
RETURNS text AS $$
BEGIN
  -- Return NULL if input is NULL or empty
  IF envelope_number IS NULL OR envelope_number = '' THEN
    RETURN NULL;
  END IF;

  -- Only trim whitespace, preserve leading zeros and other formatting
  RETURN upper(btrim(envelope_number));
END;
$$ LANGUAGE plpgsql;

-- Re-normalize existing envelope numbers with new logic
UPDATE members
SET envelope_number = normalize_envelope_number(envelope_number)
WHERE envelope_number IS NOT NULL;

-- Add tenant-scoped unique index
-- This ensures envelope numbers are unique per tenant, allowing different tenants to use the same envelope numbers
CREATE UNIQUE INDEX members_envelope_number_tenant_unique
ON members(tenant_id, envelope_number)
WHERE envelope_number IS NOT NULL AND deleted_at IS NULL;

-- Add tenant-scoped index for faster lookups
CREATE INDEX members_envelope_number_tenant_idx
ON members(tenant_id, envelope_number)
WHERE deleted_at IS NULL;

-- Add updated check constraint with flexible validation
ALTER TABLE members
ADD CONSTRAINT members_envelope_number_valid
CHECK (validate_envelope_number(envelope_number));

-- Recreate the normalization trigger
CREATE OR REPLACE FUNCTION normalize_envelope_number_trigger()
RETURNS trigger AS $$
BEGIN
  NEW.envelope_number := normalize_envelope_number(NEW.envelope_number);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER normalize_envelope_number_before_save
  BEFORE INSERT OR UPDATE ON members
  FOR EACH ROW
  EXECUTE FUNCTION normalize_envelope_number_trigger();

-- Add helpful comment
COMMENT ON COLUMN members.envelope_number IS 'Church envelope number for giving tracking. Unique per tenant. Supports alphanumeric formats (e.g., "123", "A001", "FAM-42").';
