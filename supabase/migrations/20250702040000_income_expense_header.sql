-- Link income_expense_transactions to financial_transaction_headers
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'income_expense_transactions'
      AND column_name = 'header_id'
  ) THEN
    ALTER TABLE income_expense_transactions
      ADD COLUMN header_id uuid REFERENCES financial_transaction_headers(id);
    CREATE INDEX IF NOT EXISTS income_expense_transactions_header_id_idx
      ON income_expense_transactions(header_id);
    COMMENT ON COLUMN income_expense_transactions.header_id IS 'Header reference for corresponding debit/credit transactions';
  END IF;
END $$;
