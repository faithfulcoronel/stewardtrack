-- Add new category_id column
ALTER TABLE financial_transactions
ADD COLUMN category_id uuid REFERENCES categories(id);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_financial_transactions_category ON financial_transactions(category_id);

-- Add NOT NULL constraint to category_id
ALTER TABLE financial_transactions
ALTER COLUMN category_id SET NOT NULL;

-- Drop old category column and type
ALTER TABLE financial_transactions 
DROP COLUMN IF EXISTS category;

-- Add helpful comments
COMMENT ON COLUMN financial_transactions.category_id IS 
  'Reference to the transaction category';

