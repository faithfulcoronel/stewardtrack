-- Add deleted_at column to feature_catalog for soft delete support
-- This allows BaseAdapter to work with feature_catalog without errors

ALTER TABLE feature_catalog
ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT NULL;

-- Add index for better query performance when filtering non-deleted records
CREATE INDEX IF NOT EXISTS feature_catalog_deleted_at_idx
ON feature_catalog(deleted_at)
WHERE deleted_at IS NULL;

-- Add comment for documentation
COMMENT ON COLUMN feature_catalog.deleted_at IS 'Timestamp when the feature was soft-deleted. NULL means active.';
