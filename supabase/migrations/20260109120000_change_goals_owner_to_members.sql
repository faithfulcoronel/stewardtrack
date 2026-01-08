-- Migration: Change goals.owner_id and objectives.responsible_id to reference members instead of auth.users
-- This allows goal ownership and objective responsibility to be assigned to any church member, not just users with accounts

-- ============================================================================
-- Goals table: owner_id
-- ============================================================================

-- Drop the existing foreign key constraint
ALTER TABLE goals DROP CONSTRAINT IF EXISTS goals_owner_id_fkey;

-- Add new foreign key constraint referencing members table
ALTER TABLE goals
ADD CONSTRAINT goals_owner_id_fkey
FOREIGN KEY (owner_id) REFERENCES members(id) ON DELETE SET NULL;

-- Add comment explaining the change
COMMENT ON COLUMN goals.owner_id IS 'Reference to the member who owns this goal. Can be any church member.';

-- ============================================================================
-- Objectives table: responsible_id
-- ============================================================================

-- Drop the existing foreign key constraint
ALTER TABLE objectives DROP CONSTRAINT IF EXISTS objectives_responsible_id_fkey;

-- Add new foreign key constraint referencing members table
ALTER TABLE objectives
ADD CONSTRAINT objectives_responsible_id_fkey
FOREIGN KEY (responsible_id) REFERENCES members(id) ON DELETE SET NULL;

-- Add comment explaining the change
COMMENT ON COLUMN objectives.responsible_id IS 'Reference to the member responsible for this objective. Can be any church member.';

-- ============================================================================
-- Calendar Events table: assigned_to
-- ============================================================================
-- When goals sync to calendar, the owner_id (member) is passed to assigned_to.
-- This needs to reference members instead of auth.users for consistency.

-- Drop the existing foreign key constraint
ALTER TABLE calendar_events DROP CONSTRAINT IF EXISTS calendar_events_assigned_to_fkey;

-- Add new foreign key constraint referencing members table
ALTER TABLE calendar_events
ADD CONSTRAINT calendar_events_assigned_to_fkey
FOREIGN KEY (assigned_to) REFERENCES members(id) ON DELETE SET NULL;

-- Add comment explaining the change
COMMENT ON COLUMN calendar_events.assigned_to IS 'Reference to the member assigned to this calendar event. Can be any church member.';