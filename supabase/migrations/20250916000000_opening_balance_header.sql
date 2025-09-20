-- Link opening balances to financial headers
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'fund_opening_balances'
      AND column_name = 'header_id'
  ) THEN
    ALTER TABLE fund_opening_balances
      ADD COLUMN header_id uuid REFERENCES financial_transaction_headers(id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS fund_opening_balances_header_id_idx
  ON fund_opening_balances(header_id);
