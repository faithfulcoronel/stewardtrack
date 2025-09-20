-- Add deleted_at column to financial_transactions for soft deletes
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'financial_transactions'
      AND column_name = 'deleted_at'
  ) THEN
    ALTER TABLE financial_transactions
      ADD COLUMN deleted_at timestamptz;
  END IF;
END $$;

-- Create index to speed up queries filtering on deleted_at
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE tablename = 'financial_transactions'
      AND indexname = 'financial_transactions_deleted_at_idx'
  ) THEN
    CREATE INDEX financial_transactions_deleted_at_idx
      ON financial_transactions(deleted_at);
  END IF;
END $$;

COMMENT ON COLUMN financial_transactions.deleted_at IS 'Soft delete timestamp';
