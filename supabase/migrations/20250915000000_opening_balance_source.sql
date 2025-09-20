-- Add financial source relationship to fund_opening_balances
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'fund_opening_balances'
      AND column_name = 'source_id'
  ) THEN
    ALTER TABLE fund_opening_balances
      ADD COLUMN source_id uuid REFERENCES financial_sources(id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS fund_opening_balances_source_id_idx
  ON fund_opening_balances(source_id);

COMMENT ON COLUMN fund_opening_balances.source_id IS
  'Financial source that stores the opening balance';
