-- Remove deprecated care plan columns from members table
-- These columns are now managed in the dedicated member_care_plans table
-- to maintain single source of truth for care plan data

-- Drop the columns from members table
ALTER TABLE members
  DROP COLUMN IF EXISTS care_status_code,
  DROP COLUMN IF EXISTS care_pastor,
  DROP COLUMN IF EXISTS care_follow_up_at,
  DROP COLUMN IF EXISTS care_team;

-- Add comment explaining the migration
COMMENT ON TABLE member_care_plans IS 'Dedicated table for member care plans. Care plan data was migrated from members table to this table for better normalization and single source of truth.';
