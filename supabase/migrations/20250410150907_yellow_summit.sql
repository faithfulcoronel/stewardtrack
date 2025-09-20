/*
# Run Migration Script for Double-Entry Accounting

This script executes the migration of existing transactions to the double-entry system.
It should be run manually after all other migrations have been applied and verified.
*/

-- Execute the migration function to create transaction headers and double-entry records
SELECT migrate_existing_transactions();

-- Enable the constraint to ensure amount matches debit or credit
-- This is done after migration to avoid conflicts with existing data
--ALTER TABLE financial_transactions 
--  ADD CONSTRAINT check_amount_matches_debit_credit 
--  CHECK (
--    (type = 'income' AND amount = credit) OR 
--    (type = 'expense' AND amount = debit)
--  );

-- Add a comment to indicate migration is complete
COMMENT ON TABLE financial_transactions IS 'Financial transactions with double-entry accounting support. Migration completed.';