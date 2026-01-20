-- =============================================================================
-- Migration: Extend Transaction Types Schema
-- =============================================================================
-- Adds support for all transaction types in financial_transaction_type enum:
-- income, expense, transfer, adjustment, closing_entry, fund_rollover,
-- reversal, allocation, reclass, refund, opening_balance
--
-- Changes:
-- - Add reference_transaction_id to financial_transaction_headers (for reversals)
-- - Add adjustment_reason to financial_transaction_headers
-- - Add destination_source_id, destination_fund_id, from_coa_id, to_coa_id
--   to income_expense_transactions
-- =============================================================================

BEGIN;

-- =============================================================================
-- STEP 1: Add columns to financial_transaction_headers
-- =============================================================================

-- Add reference_transaction_id for reversals - references the original transaction
ALTER TABLE financial_transaction_headers
ADD COLUMN IF NOT EXISTS reference_transaction_id UUID REFERENCES financial_transaction_headers(id);

-- Add adjustment_reason for adjustment transactions
ALTER TABLE financial_transaction_headers
ADD COLUMN IF NOT EXISTS adjustment_reason TEXT;

-- Create index for reversal lookups
CREATE INDEX IF NOT EXISTS idx_fth_reference_transaction
ON financial_transaction_headers(reference_transaction_id)
WHERE reference_transaction_id IS NOT NULL;

-- =============================================================================
-- STEP 2: Add columns to income_expense_transactions
-- =============================================================================

-- Add destination_source_id for transfer transactions (the receiving source/account)
ALTER TABLE income_expense_transactions
ADD COLUMN IF NOT EXISTS destination_source_id UUID REFERENCES financial_sources(id);

-- Add destination_fund_id for fund_rollover transactions (the receiving fund)
ALTER TABLE income_expense_transactions
ADD COLUMN IF NOT EXISTS destination_fund_id UUID REFERENCES funds(id);

-- Add from_coa_id for reclass transactions (the old chart of account)
ALTER TABLE income_expense_transactions
ADD COLUMN IF NOT EXISTS from_coa_id UUID REFERENCES chart_of_accounts(id);

-- Add to_coa_id for reclass transactions (the new chart of account)
ALTER TABLE income_expense_transactions
ADD COLUMN IF NOT EXISTS to_coa_id UUID REFERENCES chart_of_accounts(id);

-- Create indexes for new foreign keys
CREATE INDEX IF NOT EXISTS idx_iet_destination_source
ON income_expense_transactions(destination_source_id)
WHERE destination_source_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_iet_destination_fund
ON income_expense_transactions(destination_fund_id)
WHERE destination_fund_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_iet_from_coa
ON income_expense_transactions(from_coa_id)
WHERE from_coa_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_iet_to_coa
ON income_expense_transactions(to_coa_id)
WHERE to_coa_id IS NOT NULL;

-- =============================================================================
-- STEP 3: Add comments for documentation
-- =============================================================================

COMMENT ON COLUMN financial_transaction_headers.reference_transaction_id IS
  'For reversal transactions, references the original transaction being reversed';

COMMENT ON COLUMN financial_transaction_headers.adjustment_reason IS
  'For adjustment transactions, stores the reason for the adjustment';

COMMENT ON COLUMN income_expense_transactions.destination_source_id IS
  'For transfer transactions, the receiving financial source/account';

COMMENT ON COLUMN income_expense_transactions.destination_fund_id IS
  'For fund_rollover transactions, the receiving fund';

COMMENT ON COLUMN income_expense_transactions.from_coa_id IS
  'For reclass transactions, the original chart of account being reclassified from';

COMMENT ON COLUMN income_expense_transactions.to_coa_id IS
  'For reclass transactions, the target chart of account being reclassified to';

-- =============================================================================
-- Success confirmation
-- =============================================================================
DO $$
BEGIN
  RAISE NOTICE 'Migration completed: Extended transaction types schema';
END $$;

COMMIT;
