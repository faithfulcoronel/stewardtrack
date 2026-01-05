-- Migration: Fix sync_member_address trigger function
-- The previous trigger had two issues:
-- 1. It fell back to NEW.address when split fields were empty, preserving old combined data
-- 2. It didn't properly format the combined address with correct separators
--
-- This migration fixes the trigger to:
-- - Always rebuild the combined address from split fields only
-- - Use proper formatting with commas between all parts
-- - Not fall back to existing address value

-- Step 1: Replace the sync function with corrected logic
CREATE OR REPLACE FUNCTION sync_member_address()
RETURNS TRIGGER AS $$
DECLARE
  combined_address text := '';
BEGIN
  -- Build combined address from components only (never use existing combined address)
  -- Start with street address
  IF NEW.address_street IS NOT NULL AND NEW.address_street != '' THEN
    combined_address := NEW.address_street;
  END IF;

  -- Add street2 if present
  IF NEW.address_street2 IS NOT NULL AND NEW.address_street2 != '' THEN
    IF combined_address != '' THEN
      combined_address := combined_address || ', ' || NEW.address_street2;
    ELSE
      combined_address := NEW.address_street2;
    END IF;
  END IF;

  -- Add city if present
  IF NEW.address_city IS NOT NULL AND NEW.address_city != '' THEN
    IF combined_address != '' THEN
      combined_address := combined_address || ', ' || NEW.address_city;
    ELSE
      combined_address := NEW.address_city;
    END IF;
  END IF;

  -- Add state if present
  IF NEW.address_state IS NOT NULL AND NEW.address_state != '' THEN
    IF combined_address != '' THEN
      combined_address := combined_address || ', ' || NEW.address_state;
    ELSE
      combined_address := NEW.address_state;
    END IF;
  END IF;

  -- Add postal code if present (with space, not comma)
  IF NEW.address_postal_code IS NOT NULL AND NEW.address_postal_code != '' THEN
    IF combined_address != '' THEN
      combined_address := combined_address || ' ' || NEW.address_postal_code;
    ELSE
      combined_address := NEW.address_postal_code;
    END IF;
  END IF;

  -- Set the combined address (empty string if all fields are empty)
  NEW.address := combined_address;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Note: The trigger itself doesn't need to be recreated - it will use the updated function
