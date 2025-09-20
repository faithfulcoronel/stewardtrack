/*
# Update Financial Transactions Table for Double-Entry Accounting

1. Changes
  - Add `header_id` column to link to transaction headers
  - Add `account_id` column to link to chart of accounts
  - Add `debit` and `credit` columns for double-entry accounting
  - Add `is_reconciled` flag for reconciliation
  - Add `reconciled_at` and `reconciled_by` for tracking reconciliation

2. Security
  - Maintain existing RLS policies
*/

-- Add new columns to financial_transactions
ALTER TABLE financial_transactions 
  ADD COLUMN IF NOT EXISTS header_id UUID REFERENCES financial_transaction_headers(id),
  ADD COLUMN IF NOT EXISTS account_id UUID REFERENCES chart_of_accounts(id),
  ADD COLUMN IF NOT EXISTS accounts_account_id UUID REFERENCES accounts(id),
  ADD COLUMN IF NOT EXISTS debit NUMERIC(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS credit NUMERIC(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_reconciled BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS reconciled_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS reconciled_by UUID REFERENCES auth.users(id);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS financial_transactions_header_id_idx ON financial_transactions(header_id);
CREATE INDEX IF NOT EXISTS financial_transactions_account_id_idx ON financial_transactions(account_id);
CREATE INDEX IF NOT EXISTS financial_transactions_accounts_account_id_idx ON financial_transactions(accounts_account_id);
CREATE INDEX IF NOT EXISTS financial_transactions_is_reconciled_idx ON financial_transactions(is_reconciled);

-- Add constraint to ensure either debit or credit is non-zero, but not both
ALTER TABLE financial_transactions 
  ADD CONSTRAINT check_debit_credit_not_both_zero 
  CHECK (
    (debit > 0 AND credit = 0) OR 
    (credit > 0 AND debit = 0) OR
    (debit = 0 AND credit = 0) -- Allow both zero during migration
  );

-- Add constraint to ensure amount matches debit or credit
-- This is commented out for now to allow migration of existing data
-- Will be enabled after migration is complete
/*
ALTER TABLE financial_transactions 
  ADD CONSTRAINT check_amount_matches_debit_credit 
  CHECK (
    (type = 'income' AND amount = credit) OR 
    (type = 'expense' AND amount = debit)
  );
*/

-- Add comment to columns
COMMENT ON COLUMN financial_transactions.header_id IS 'Reference to the transaction header';
COMMENT ON COLUMN financial_transactions.account_id IS 'Reference to the chart of accounts';
COMMENT ON COLUMN financial_transactions.accounts_account_id IS 'Reference to the accounts';
COMMENT ON COLUMN financial_transactions.debit IS 'Debit amount for double-entry accounting';
COMMENT ON COLUMN financial_transactions.credit IS 'Credit amount for double-entry accounting';
COMMENT ON COLUMN financial_transactions.is_reconciled IS 'Flag indicating if the transaction has been reconciled';
COMMENT ON COLUMN financial_transactions.reconciled_at IS 'When the transaction was reconciled';
COMMENT ON COLUMN financial_transactions.reconciled_by IS 'Who reconciled the transaction';