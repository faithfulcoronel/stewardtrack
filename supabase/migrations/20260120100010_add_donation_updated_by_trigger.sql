-- Migration: Add updated_by column with trigger to donations table
-- Description: Adds tracking for who updated donation records, handled via trigger

-- ============================================================================
-- 1. ADD COLUMN
-- ============================================================================

ALTER TABLE donations
ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);

-- Add to campaigns as well for consistency
ALTER TABLE campaigns
ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);

-- ============================================================================
-- 2. CREATE TRIGGER FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION set_donations_updated_by()
RETURNS TRIGGER AS $$
BEGIN
    -- Set updated_by to current authenticated user
    NEW.updated_by = auth.uid();
    -- Also update the timestamp
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 3. CREATE TRIGGERS
-- ============================================================================

-- Drop existing trigger if it exists (to replace with new one)
DROP TRIGGER IF EXISTS trigger_donations_updated_at ON donations;

-- Create new trigger that handles both updated_at and updated_by
CREATE TRIGGER trigger_donations_updated
    BEFORE UPDATE ON donations
    FOR EACH ROW
    EXECUTE FUNCTION set_donations_updated_by();

-- Drop existing trigger for campaigns
DROP TRIGGER IF EXISTS trigger_campaigns_updated_at ON campaigns;

-- Create trigger for campaigns
CREATE TRIGGER trigger_campaigns_updated
    BEFORE UPDATE ON campaigns
    FOR EACH ROW
    EXECUTE FUNCTION set_donations_updated_by();

-- ============================================================================
-- 4. ADD INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_donations_updated_by ON donations(updated_by);

-- ============================================================================
-- 5. COMMENTS
-- ============================================================================

COMMENT ON COLUMN donations.updated_by IS 'User who last updated the donation - set automatically by trigger';
COMMENT ON COLUMN campaigns.updated_by IS 'User who last updated the campaign - set automatically by trigger';

-- Success confirmation
DO $$
BEGIN
    RAISE NOTICE 'Added updated_by column with trigger to donations and campaigns tables';
END $$;
