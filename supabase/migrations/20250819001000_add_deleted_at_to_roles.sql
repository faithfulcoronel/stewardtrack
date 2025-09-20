-- Add deleted_at column to roles table for soft deletes
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'roles'
      AND column_name = 'deleted_at'
  ) THEN
    ALTER TABLE roles
      ADD COLUMN deleted_at timestamptz;
  END IF;
END $$;

-- Create index on deleted_at for faster queries
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE tablename = 'roles'
      AND indexname = 'roles_deleted_at_idx'
  ) THEN
    CREATE INDEX roles_deleted_at_idx ON roles(deleted_at);
  END IF;
END $$;

COMMENT ON COLUMN roles.deleted_at IS 'Soft delete timestamp';
