-- Add submitted and approved statuses to financial_transaction_headers.status
-- This migration updates the status check constraint without modifying existing data

ALTER TABLE financial_transaction_headers
  DROP CONSTRAINT IF EXISTS financial_transaction_headers_status_check;

ALTER TABLE financial_transaction_headers
  ADD CONSTRAINT financial_transaction_headers_status_check
  CHECK (status IN ('draft', 'submitted', 'approved', 'posted', 'voided'));
