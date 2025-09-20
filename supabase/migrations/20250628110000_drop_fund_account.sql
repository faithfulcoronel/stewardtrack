-- Remove account_id column from funds
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'funds'
      AND column_name = 'account_id'
  ) THEN
    ALTER TABLE funds DROP COLUMN account_id;
  END IF;
END $$;

-- Drop index if it exists
DROP INDEX IF EXISTS funds_account_id_idx;
