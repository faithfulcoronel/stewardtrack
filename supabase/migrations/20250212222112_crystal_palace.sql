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

-- Add function to normalize envelope numbers
CREATE OR REPLACE FUNCTION normalize_envelope_number(envelope_number text)
RETURNS text AS $$
BEGIN
  -- Return NULL if input is NULL or empty
  IF envelope_number IS NULL OR envelope_number = '' THEN
    RETURN NULL;
  END IF;
  
  -- Remove leading zeros and whitespace
  RETURN ltrim(btrim(envelope_number), '0');
END;
$$ LANGUAGE plpgsql;

-- Update existing envelope numbers to normalized format
UPDATE members 
SET envelope_number = normalize_envelope_number(envelope_number)
WHERE envelope_number IS NOT NULL;

-- Create trigger to normalize envelope numbers on insert/update
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