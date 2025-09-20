-- Add email column to members table
ALTER TABLE members
ADD COLUMN IF NOT EXISTS email text;

-- Add index for faster lookups by email
CREATE INDEX IF NOT EXISTS members_email_idx ON members(email);

-- Add comment explaining email field
COMMENT ON COLUMN members.email IS 
  'The member''s email address. Used for user account association and communication.';

-- Add unique constraint to prevent duplicate emails
ALTER TABLE members
ADD CONSTRAINT members_email_unique UNIQUE (email);