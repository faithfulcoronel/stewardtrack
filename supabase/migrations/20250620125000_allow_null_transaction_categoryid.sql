-- Allow null values for financial_transactions.amount

ALTER TABLE financial_transactions
  ALTER COLUMN category_id DROP NOT NULL;
