-- Migration: Reset migrated member address data
-- The previous migration incorrectly copied the combined address into address_street.
-- This migration resets the split columns so users can enter proper split addresses.
-- The original combined address remains in the 'address' column and is backed up in members_address_backup.

-- Reset address_street where it contains the old combined address
-- We identify these by checking if address_street equals the original combined address
UPDATE members m
SET
  address_street = NULL,
  address_street2 = NULL,
  address_city = NULL,
  address_state = NULL,
  address_postal_code = NULL
WHERE EXISTS (
  SELECT 1 FROM members_address_backup b
  WHERE b.member_id = m.id
    AND m.address_street = b.original_address
);

-- Add a comment to track this migration
COMMENT ON TABLE members_address_backup IS 'Backup of original combined address data from members table. Created during address split migration. Original addresses preserved here even after split columns are reset.';
