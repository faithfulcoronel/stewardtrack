-- Add envelope_number column to members table
ALTER TABLE members
ADD COLUMN IF NOT EXISTS envelope_number text UNIQUE;

-- Add index for faster lookups by envelope number
CREATE INDEX IF NOT EXISTS members_envelope_number_idx ON members(envelope_number);