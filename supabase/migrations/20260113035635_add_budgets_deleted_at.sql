-- Add deleted_at column to budgets table for soft delete support
-- This column is used by the base adapter to filter out deleted records

ALTER TABLE budgets
ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT NULL;

-- Add index for efficient filtering of non-deleted records
CREATE INDEX IF NOT EXISTS idx_budgets_deleted_at ON budgets (deleted_at) WHERE deleted_at IS NULL;

-- Add comment
COMMENT ON COLUMN budgets.deleted_at IS 'Timestamp when the budget was soft-deleted, NULL if active';
