-- Allow null values for financial_transactions.amount

ALTER TABLE financial_transactions
  ALTER COLUMN amount DROP NOT NULL;
