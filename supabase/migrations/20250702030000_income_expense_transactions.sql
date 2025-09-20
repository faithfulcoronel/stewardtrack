-- Rename income_transactions table to income_expense_transactions
ALTER TABLE income_transactions RENAME TO income_expense_transactions;

-- Ensure transaction_type enum exists
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'transaction_type') THEN
    CREATE TYPE transaction_type AS ENUM ('income', 'expense');
  END IF;
END $$;

-- Add transaction_type column defaulting to 'income'
ALTER TABLE income_expense_transactions
  ADD COLUMN IF NOT EXISTS transaction_type transaction_type NOT NULL DEFAULT 'income';

-- Rename related indexes
ALTER INDEX IF EXISTS income_transactions_tenant_id_idx RENAME TO income_expense_transactions_tenant_id_idx;
ALTER INDEX IF EXISTS income_transactions_transaction_date_idx RENAME TO income_expense_transactions_transaction_date_idx;
ALTER INDEX IF EXISTS income_transactions_member_id_idx RENAME TO income_expense_transactions_member_id_idx;
ALTER INDEX IF EXISTS income_transactions_category_id_idx RENAME TO income_expense_transactions_category_id_idx;
ALTER INDEX IF EXISTS income_transactions_fund_id_idx RENAME TO income_expense_transactions_fund_id_idx;
ALTER INDEX IF EXISTS income_transactions_source_id_idx RENAME TO income_expense_transactions_source_id_idx;
ALTER INDEX IF EXISTS income_transactions_account_id_idx RENAME TO income_expense_transactions_account_id_idx;
ALTER INDEX IF EXISTS income_transactions_deleted_at_idx RENAME TO income_expense_transactions_deleted_at_idx;

-- Rename trigger
ALTER TRIGGER update_income_transactions_updated_at ON income_expense_transactions
  RENAME TO update_income_expense_transactions_updated_at;

COMMENT ON TABLE income_expense_transactions IS 'Simplified record of income and expense transactions';
