-- Drop existing constraints and indexes if they exist
DO $$ 
BEGIN
  -- Drop unique constraint if it exists
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'members_email_unique'
  ) THEN
    ALTER TABLE members DROP CONSTRAINT members_email_unique;
  END IF;

  -- Drop index if it exists
  IF EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'members' 
    AND indexname = 'members_email_idx'
  ) THEN
    DROP INDEX members_email_idx;
  END IF;
END $$;

-- Add or modify email column
ALTER TABLE members
DROP COLUMN IF EXISTS email;

ALTER TABLE members
ADD COLUMN email text;

-- Add index for faster lookups by email
CREATE INDEX members_email_idx ON members(email);

-- Add comment explaining email field
COMMENT ON COLUMN members.email IS 
  'The member''s email address. Used for user account association and communication.';

-- Add unique constraint to prevent duplicate emails
ALTER TABLE members
ADD CONSTRAINT members_email_unique UNIQUE (email);