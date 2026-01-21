-- =============================================================================
-- Add deleted_at column to member_invitations table
-- =============================================================================
-- Description: The BaseAdapter.buildSecureQuery() applies a filter
-- `.is('deleted_at', null)` to all queries. This column is required for
-- the soft-delete pattern used by all adapters extending BaseAdapter.
--
-- Date: 2026-01-21
-- =============================================================================

BEGIN;

-- Add deleted_at column for soft-delete pattern (required by BaseAdapter)
ALTER TABLE member_invitations
ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT NULL;

COMMENT ON COLUMN member_invitations.deleted_at IS 'Timestamp when the record was soft-deleted (required by BaseAdapter pattern)';

-- Create index for deleted_at to optimize BaseAdapter queries
CREATE INDEX IF NOT EXISTS member_invitations_deleted_at_idx
ON member_invitations(deleted_at)
WHERE deleted_at IS NULL;

COMMIT;

-- Success confirmation
DO $$
BEGIN
  RAISE NOTICE 'Migration completed: added deleted_at column to member_invitations';
END $$;
