/*
  # Update Income Categories

  1. Changes
    - Update financial_transaction_category enum to include new income categories
    - Fix typos in offering categories

  2. New Categories
    - Tithe
    - First Fruit Offering
    - Love Offering
    - Mission Offering
    - Building Offering
    - Lot Offering
    - Other
    (Plus existing expense categories)
*/

-- Create new enum type with updated categories
CREATE TYPE financial_transaction_category_new AS ENUM (
  'tithe',
  'first_fruit_offering',
  'love_offering',
  'mission_offering',
  'building_offering',
  'lot_offering',
  'other',
  'ministry_expense',
  'payroll',
  'utilities',
  'maintenance',
  'events',
  'missions',
  'education'
);

-- Create a temporary table without the enum constraint
CREATE TABLE financial_transactions_temp (
  id uuid,
  type financial_transaction_type,
  category text,
  amount decimal(10,2),
  description text,
  date date,
  budget_id uuid,
  member_id uuid,
  created_at timestamptz,
  updated_at timestamptz,
  created_by uuid
);

-- Copy data to temp table
INSERT INTO financial_transactions_temp
SELECT * FROM financial_transactions;

-- Drop the original table and type
DROP TABLE financial_transactions;
DROP TYPE financial_transaction_category;

-- Rename the new type
ALTER TYPE financial_transaction_category_new RENAME TO financial_transaction_category;

-- Recreate the financial_transactions table with the new enum
CREATE TABLE financial_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type financial_transaction_type NOT NULL,
  category financial_transaction_category NOT NULL,
  amount decimal(10,2) NOT NULL,
  description text NOT NULL,
  date date NOT NULL,
  budget_id uuid REFERENCES budgets(id),
  member_id uuid REFERENCES members(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id) NOT NULL,
  CONSTRAINT positive_amount CHECK (amount >= 0)
);

-- Reinsert the data with mapped categories
INSERT INTO financial_transactions (
  id, type, category, amount, description, date, 
  budget_id, member_id, created_at, updated_at, created_by
)
SELECT 
  id, type,
  CASE
    WHEN type = 'income' AND category = 'tithe' THEN 'tithe'
    WHEN type = 'income' THEN 'other'
    ELSE category::financial_transaction_category
  END,
  amount, description, date,
  budget_id, member_id, created_at, updated_at, created_by
FROM financial_transactions_temp;

-- Drop the temporary table
DROP TABLE financial_transactions_temp;

-- Recreate the trigger
CREATE TRIGGER update_financial_transactions_updated_at
  BEFORE UPDATE ON financial_transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Enable RLS
ALTER TABLE financial_transactions ENABLE ROW LEVEL SECURITY;

-- Recreate the policies
CREATE POLICY "Financial transactions are viewable by authenticated users"
  ON financial_transactions
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Financial transactions can be inserted by authenticated users"
  ON financial_transactions
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Financial transactions can be updated by authenticated users"
  ON financial_transactions
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = created_by);

CREATE POLICY "Financial transactions can be deleted by authenticated users"
  ON financial_transactions
  FOR DELETE
  TO authenticated
  USING (auth.uid() = created_by);