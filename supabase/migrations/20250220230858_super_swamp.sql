-- Drop assigned_pastor_id column and its references
ALTER TABLE members
DROP COLUMN IF EXISTS assigned_pastor_id CASCADE;

-- Make membership_date optional
ALTER TABLE members
ALTER COLUMN membership_date DROP NOT NULL;

-- Drop related index
DROP INDEX IF EXISTS idx_members_assigned_pastor_id;

-- Add helpful comment
COMMENT ON COLUMN members.membership_date IS 'Optional date when the member joined the church';