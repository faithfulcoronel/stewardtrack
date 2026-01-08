-- Migration: Change calendar_events.assigned_to to reference members instead of auth.users
-- This fixes the FK constraint error when goals with owner_id (member) sync to calendar

-- Drop the existing foreign key constraint
ALTER TABLE calendar_events DROP CONSTRAINT IF EXISTS calendar_events_assigned_to_fkey;

-- Add new foreign key constraint referencing members table
ALTER TABLE calendar_events
ADD CONSTRAINT calendar_events_assigned_to_fkey
FOREIGN KEY (assigned_to) REFERENCES members(id) ON DELETE SET NULL;

-- Add comment explaining the change
COMMENT ON COLUMN calendar_events.assigned_to IS 'Reference to the member assigned to this calendar event. Can be any church member.';
