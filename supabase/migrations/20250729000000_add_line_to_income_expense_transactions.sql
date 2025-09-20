-- Add optional line column to income_expense_transactions
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'income_expense_transactions'
      AND column_name = 'line'
  ) THEN
    ALTER TABLE income_expense_transactions
      ADD COLUMN line integer;
  END IF;
END $$;

COMMENT ON COLUMN income_expense_transactions.line IS 'Detail transaction line number';
