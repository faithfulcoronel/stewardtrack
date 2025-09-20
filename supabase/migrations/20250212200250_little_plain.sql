/*
  # Finance System Implementation

  1. New Tables
    - `budgets`: Track budget allocations for different categories
      - `id` (uuid, primary key)
      - `name` (text)
      - `amount` (decimal)
      - `start_date` (date)
      - `end_date` (date)
      - `category` (budget_category enum)
      - `description` (text)
      - `created_by` (uuid, references auth.users)
      
    - `financial_transactions`: Track income and expenses
      - `id` (uuid, primary key)
      - `type` (financial_transaction_type enum)
      - `category` (financial_transaction_category enum)
      - `amount` (decimal)
      - `description` (text)
      - `date` (date)
      - `budget_id` (uuid, references budgets)
      - `member_id` (uuid, references members)
      - `created_by` (uuid, references auth.users)

  2. Security
    - Enable RLS on both tables
    - Add policies for authenticated users to view all records
    - Add policies for creation and updates based on user ID
*/

-- Create custom types (with unique names to avoid conflicts)
CREATE TYPE budget_category AS ENUM (
  'ministry',
  'payroll',
  'utilities',
  'maintenance',
  'events',
  'missions',
  'education',
  'other'
);

CREATE TYPE financial_transaction_type AS ENUM (
  'income',
  'expense'
);

CREATE TYPE financial_transaction_category AS ENUM (
  'tithe',
  'offering',
  'donation',
  'ministry_expense',
  'payroll',
  'utilities',
  'maintenance',
  'events',
  'missions',
  'education',
  'other'
);

-- Create budgets table
CREATE TABLE IF NOT EXISTS budgets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  amount decimal(10,2) NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  category budget_category NOT NULL,
  description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id) NOT NULL,
  CONSTRAINT valid_date_range CHECK (end_date >= start_date),
  CONSTRAINT positive_amount CHECK (amount >= 0)
);

-- Create financial transactions table
CREATE TABLE IF NOT EXISTS financial_transactions (
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

-- Enable Row Level Security
ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_transactions ENABLE ROW LEVEL SECURITY;

-- Create policies for budgets
CREATE POLICY "Budgets are viewable by authenticated users"
  ON budgets
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Budgets can be inserted by authenticated users"
  ON budgets
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Budgets can be updated by authenticated users"
  ON budgets
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = created_by);

-- Create policies for financial transactions
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

-- Create updated_at triggers
CREATE TRIGGER update_budgets_updated_at
  BEFORE UPDATE ON budgets
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_financial_transactions_updated_at
  BEFORE UPDATE ON financial_transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();