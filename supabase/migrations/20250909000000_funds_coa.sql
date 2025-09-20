-- Add coa_id column to funds table linking to chart_of_accounts
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'funds'
      AND column_name = 'coa_id'
  ) THEN
    ALTER TABLE funds ADD COLUMN coa_id uuid REFERENCES chart_of_accounts(id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE tablename = 'funds'
      AND indexname = 'funds_coa_id_idx'
  ) THEN
    CREATE INDEX funds_coa_id_idx ON funds(coa_id);
  END IF;
END $$;

COMMENT ON COLUMN funds.coa_id IS 'Linked chart of account for this fund';
