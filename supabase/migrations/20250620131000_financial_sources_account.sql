-- Add account_id column to financial_sources
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'financial_sources'
      AND column_name = 'account_id'
  ) THEN
    ALTER TABLE financial_sources
      ADD COLUMN account_id uuid REFERENCES chart_of_accounts(id);
  END IF;
END $$;

-- Create index for account_id column
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE tablename = 'financial_sources'
      AND indexname = 'financial_sources_account_id_idx'
  ) THEN
    CREATE INDEX financial_sources_account_id_idx
      ON financial_sources(account_id);
  END IF;
END $$;

-- Add helpful comment
COMMENT ON COLUMN financial_sources.account_id IS
  'Linked chart of account for this source';
