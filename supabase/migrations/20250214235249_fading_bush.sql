-- Add email column to members table
ALTER TABLE members
ADD COLUMN IF NOT EXISTS email text;

-- Add index for faster lookups by email if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'members' 
    AND indexname = 'members_email_idx'
  ) THEN
    CREATE INDEX members_email_idx ON members(email);
  END IF;
END $$;

-- Add comment explaining email field
COMMENT ON COLUMN members.email IS 
  'The member''s email address. Used for user account association and communication.';

-- Add unique constraint if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'members_email_unique'
  ) THEN
    ALTER TABLE members
    ADD CONSTRAINT members_email_unique UNIQUE (email);
  END IF;
END $$;