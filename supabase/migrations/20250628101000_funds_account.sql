-- Add account_id column to funds
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'funds'
      AND column_name = 'account_id'
  ) THEN
    ALTER TABLE funds
      ADD COLUMN account_id uuid REFERENCES chart_of_accounts(id);
  END IF;
END $$;

-- Create index for the column
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE tablename = 'funds'
      AND indexname = 'funds_account_id_idx'
  ) THEN
    CREATE INDEX funds_account_id_idx
      ON funds(account_id);
  END IF;
END $$;

-- Add comment
COMMENT ON COLUMN funds.account_id IS
  'Chart of account linked to this fund';
