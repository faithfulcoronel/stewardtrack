-- Allow null values for financial_transactions.type

ALTER TABLE financial_transactions
  ALTER COLUMN type DROP NOT NULL;
