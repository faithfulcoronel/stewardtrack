/*
  # Add envelope number to members table

  1. Changes
    - Add envelope_number column to members table
    - Make it optional (nullable)
    - Add unique constraint to prevent duplicate envelope numbers
*/

-- Add envelope_number column to members table
ALTER TABLE members
ADD COLUMN IF NOT EXISTS envelope_number text UNIQUE;

-- Add index for faster lookups by envelope number
CREATE INDEX IF NOT EXISTS members_envelope_number_idx ON members(envelope_number);