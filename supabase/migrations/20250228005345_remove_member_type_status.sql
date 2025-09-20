-- Create new migration file: supabase/migrations/20250228005345_remove_member_type_status.sql

-- Remove the columns and their constraints
ALTER TABLE members
DROP COLUMN IF EXISTS membership_type,
DROP COLUMN IF EXISTS status;

-- Drop the enums if they're no longer needed elsewhere
DROP TYPE IF EXISTS membership_type CASCADE;
DROP TYPE IF EXISTS member_status CASCADE;

-- Add helpful comment
COMMENT ON TABLE members IS 'Members table with membership and status now using category references';
