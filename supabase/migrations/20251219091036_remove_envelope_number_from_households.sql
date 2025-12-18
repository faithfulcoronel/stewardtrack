-- Remove envelope_number from member_households table
-- Envelope numbers should be unique per member, not per household

-- Drop the unique index first
DROP INDEX IF EXISTS member_households_envelope_unique;

-- Remove the envelope_number column from member_households
ALTER TABLE member_households
DROP COLUMN IF EXISTS envelope_number;
