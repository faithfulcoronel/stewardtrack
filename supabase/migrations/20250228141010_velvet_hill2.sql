-- Add new category_id column
ALTER TABLE budgets
ADD COLUMN category_id uuid REFERENCES categories(id);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_budgets_category ON budgets(category_id);

-- Add NOT NULL constraint to category_id
ALTER TABLE budgets
ALTER COLUMN category_id SET NOT NULL;

-- Drop old category column and type
ALTER TABLE budgets 
DROP COLUMN IF EXISTS category;

-- Add helpful comments
COMMENT ON COLUMN budgets.category_id IS 
  'Reference to the budget category';