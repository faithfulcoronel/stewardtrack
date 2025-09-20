-- Replace transaction_type enum with financial_transaction_type
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'income_expense_transactions'
      AND column_name = 'transaction_type'
      AND udt_name = 'transaction_type'
  ) THEN
    ALTER TABLE income_expense_transactions
      ALTER COLUMN transaction_type DROP DEFAULT,
      ALTER COLUMN transaction_type TYPE financial_transaction_type
        USING transaction_type::text::financial_transaction_type,
      ALTER COLUMN transaction_type SET DEFAULT 'income';
  END IF;
END $$;