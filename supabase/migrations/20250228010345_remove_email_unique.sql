-- Create new migration file: supabase/migrations/20250228010345_remove_email_unique.sql

-- Drop the unique constraint on email
ALTER TABLE members
DROP CONSTRAINT IF EXISTS members_email_unique;

-- Add helpful comment
COMMENT ON COLUMN members.email IS 'The member''s email address. Used for user account association and communication. No longer required to be unique.';
