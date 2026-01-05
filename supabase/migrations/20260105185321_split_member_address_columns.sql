-- Migration: Split member address into separate columns
-- This migration adds separate address columns to the members table
-- and backs up existing address data before making changes.

-- Step 1: Create backup table for existing address data
CREATE TABLE IF NOT EXISTS members_address_backup (
  id uuid PRIMARY KEY,
  member_id uuid NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  original_address text,
  backed_up_at timestamptz DEFAULT now(),
  UNIQUE(member_id)
);

-- Step 2: Backup existing address data
INSERT INTO members_address_backup (id, member_id, original_address)
SELECT gen_random_uuid(), id, address
FROM members
WHERE address IS NOT NULL AND address != ''
ON CONFLICT (member_id) DO NOTHING;

-- Step 3: Add new address columns to members table
ALTER TABLE members
ADD COLUMN IF NOT EXISTS address_street text,
ADD COLUMN IF NOT EXISTS address_street2 text,
ADD COLUMN IF NOT EXISTS address_city text,
ADD COLUMN IF NOT EXISTS address_state text,
ADD COLUMN IF NOT EXISTS address_postal_code text,
ADD COLUMN IF NOT EXISTS address_country text DEFAULT 'Philippines';

-- Step 4: Migrate existing address data to new columns
-- This is a best-effort migration - complex addresses may need manual review
-- The original 'address' column is kept for backwards compatibility

-- For addresses that look like "Street, City, State PostalCode" format
-- We'll put the whole address in address_street as a starting point
UPDATE members
SET address_street = address
WHERE address IS NOT NULL
  AND address != ''
  AND address_street IS NULL;

-- Step 5: Make the old address column nullable (it was NOT NULL)
-- This allows the new system to work without requiring the combined address
ALTER TABLE members
ALTER COLUMN address DROP NOT NULL;

-- Step 6: Make contact_number nullable as well (per user request)
ALTER TABLE members
ALTER COLUMN contact_number DROP NOT NULL;

-- Step 7: Set default empty string for address if null (for backwards compatibility)
ALTER TABLE members
ALTER COLUMN address SET DEFAULT '';

-- Step 8: Add indexes for common address lookups
CREATE INDEX IF NOT EXISTS idx_members_address_city ON members(address_city) WHERE address_city IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_members_address_state ON members(address_state) WHERE address_state IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_members_address_postal_code ON members(address_postal_code) WHERE address_postal_code IS NOT NULL;

-- Step 9: Add comment explaining the address structure
COMMENT ON COLUMN members.address IS 'Legacy combined address field - kept for backwards compatibility. New code should use address_street, address_city, address_state, address_postal_code columns.';
COMMENT ON COLUMN members.address_street IS 'Primary street address (house number, street name)';
COMMENT ON COLUMN members.address_street2 IS 'Secondary address line (apartment, suite, unit, building, floor, etc.)';
COMMENT ON COLUMN members.address_city IS 'City or municipality';
COMMENT ON COLUMN members.address_state IS 'State, province, or region';
COMMENT ON COLUMN members.address_postal_code IS 'Postal or ZIP code';
COMMENT ON COLUMN members.address_country IS 'Country (defaults to Philippines)';

-- Step 10: Create a function to sync the combined address field from components
CREATE OR REPLACE FUNCTION sync_member_address()
RETURNS TRIGGER AS $$
BEGIN
  -- Build combined address from components for backwards compatibility
  NEW.address := COALESCE(
    NULLIF(
      TRIM(
        COALESCE(NEW.address_street, '') ||
        CASE WHEN NEW.address_street2 IS NOT NULL AND NEW.address_street2 != '' THEN ', ' || NEW.address_street2 ELSE '' END ||
        CASE WHEN NEW.address_city IS NOT NULL AND NEW.address_city != '' THEN ', ' || NEW.address_city ELSE '' END ||
        CASE WHEN NEW.address_state IS NOT NULL AND NEW.address_state != '' THEN ', ' || NEW.address_state ELSE '' END ||
        CASE WHEN NEW.address_postal_code IS NOT NULL AND NEW.address_postal_code != '' THEN ' ' || NEW.address_postal_code ELSE '' END
      ),
      ''
    ),
    NEW.address,
    ''
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 11: Create trigger to auto-sync address on insert/update
DROP TRIGGER IF EXISTS trg_sync_member_address ON members;
CREATE TRIGGER trg_sync_member_address
  BEFORE INSERT OR UPDATE ON members
  FOR EACH ROW
  WHEN (NEW.address_street IS NOT NULL OR NEW.address_city IS NOT NULL OR NEW.address_state IS NOT NULL OR NEW.address_postal_code IS NOT NULL)
  EXECUTE FUNCTION sync_member_address();
