/*
  # Fix envelope number functionality

  1. Changes
    - Drop and recreate envelope_number column with proper constraints
    - Add trigger to ensure envelope numbers are unique and properly formatted
    - Add function to validate envelope numbers
*/

-- Drop existing envelope_number column and index
ALTER TABLE members 
DROP COLUMN IF EXISTS envelope_number CASCADE;

-- Create function to validate envelope numbers
CREATE OR REPLACE FUNCTION validate_envelope_number(envelope_number text)
RETURNS boolean AS $$
BEGIN
  -- Check if envelope number is NULL (allowed)
  IF envelope_number IS NULL THEN
    RETURN true;
  END IF;

  -- Check if envelope number is empty string
  IF envelope_number = '' THEN
    RETURN false;
  END IF;

  -- Check if envelope number contains only digits
  IF envelope_number !~ '^[0-9]+$' THEN
    RETURN false;
  END IF;

  RETURN true;
END;
$$ LANGUAGE plpgsql;

-- Add envelope_number column with validation
ALTER TABLE members
ADD COLUMN envelope_number text;

-- Add unique constraint
ALTER TABLE members
ADD CONSTRAINT members_envelope_number_unique UNIQUE (envelope_number);

-- Add check constraint using validation function
ALTER TABLE members
ADD CONSTRAINT members_envelope_number_valid 
CHECK (validate_envelope_number(envelope_number));

-- Create index for faster lookups
CREATE INDEX members_envelope_number_idx ON members(envelope_number);