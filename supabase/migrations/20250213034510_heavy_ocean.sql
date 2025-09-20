-- Add new category to financial_transaction_category enum
ALTER TYPE financial_transaction_category ADD VALUE IF NOT EXISTS 'mission_pledge';

-- Update existing permissions to include new category
COMMENT ON TYPE financial_transaction_category IS 
  'Categories for financial transactions including tithes, offerings, pledges, and expenses';