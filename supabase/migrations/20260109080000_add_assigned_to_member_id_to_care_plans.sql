-- ================================================================================
-- ADD ASSIGNED_TO_MEMBER_ID TO CARE PLANS
-- ================================================================================
--
-- This migration adds a new column to member_care_plans to store the assigned
-- staff member as a UUID reference to the members table instead of a text name.
--
-- The existing assigned_to TEXT column is kept for backward compatibility but
-- will be deprecated in favor of assigned_to_member_id.
--
-- ================================================================================

-- Add the new column to store member ID reference
ALTER TABLE member_care_plans
ADD COLUMN IF NOT EXISTS assigned_to_member_id uuid REFERENCES members(id) ON DELETE SET NULL;

-- Create index for efficient lookups by assigned member
CREATE INDEX IF NOT EXISTS idx_member_care_plans_assigned_to_member
ON member_care_plans(assigned_to_member_id)
WHERE deleted_at IS NULL AND assigned_to_member_id IS NOT NULL;

-- Add comment to document the deprecation
COMMENT ON COLUMN member_care_plans.assigned_to IS 'DEPRECATED: Use assigned_to_member_id instead. This text field is kept for backward compatibility.';
COMMENT ON COLUMN member_care_plans.assigned_to_member_id IS 'Reference to the member assigned to handle this care plan';
