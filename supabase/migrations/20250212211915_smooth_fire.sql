/*
  # Initial Schema Setup for Church Admin System

  1. Drop existing tables and types
  2. Create new types for categorization
  3. Create tables for members, budgets, and transactions
  4. Set up RLS policies
  5. Configure storage for profile pictures

  This migration provides a clean slate by dropping existing objects and recreating
  them with the proper structure and relationships.
*/

-- Drop existing objects if they exist
DROP TABLE IF EXISTS financial_transactions CASCADE;
DROP TABLE IF EXISTS budgets CASCADE;
DROP TABLE IF EXISTS members CASCADE;
DROP TYPE IF EXISTS membership_type CASCADE;
DROP TYPE IF EXISTS member_status CASCADE;
DROP TYPE IF EXISTS financial_transaction_type CASCADE;
DROP TYPE IF EXISTS financial_transaction_category CASCADE;
DROP TYPE IF EXISTS budget_category CASCADE;

-- Create custom types
CREATE TYPE membership_type AS ENUM (
  'baptism',
  'transfer',
  'non_member',
  'non_baptized_member'
);

CREATE TYPE member_status AS ENUM (
  'active',
  'inactive',
  'under_discipline',
  'regular_attender',
  'visitor',
  'withdrawn',
  'removed'
);

CREATE TYPE financial_transaction_type AS ENUM (
  'income',
  'expense'
);

CREATE TYPE financial_transaction_category AS ENUM (
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

-- Create members table
CREATE TABLE members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name text NOT NULL,
  middle_name text,
  last_name text NOT NULL,
  address text NOT NULL,
  contact_number text NOT NULL,
  membership_date date NOT NULL,
  membership_type membership_type NOT NULL,
  status member_status NOT NULL DEFAULT 'active',
  profile_picture_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create budgets table
CREATE TABLE budgets (
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

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_members_updated_at
  BEFORE UPDATE ON members
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_budgets_updated_at
  BEFORE UPDATE ON budgets
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_financial_transactions_updated_at
  BEFORE UPDATE ON financial_transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Enable Row Level Security
ALTER TABLE members ENABLE ROW LEVEL SECURITY;
ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_transactions ENABLE ROW LEVEL SECURITY;

-- Create policies for members
CREATE POLICY "Members are viewable by authenticated users"
  ON members
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Members can be inserted by authenticated users"
  ON members
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Members can be updated by authenticated users"
  ON members
  FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Members can be deleted by authenticated users"
  ON members
  FOR DELETE
  TO authenticated
  USING (true);

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

CREATE POLICY "Budgets can be deleted by authenticated users"
  ON budgets
  FOR DELETE
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

CREATE POLICY "Financial transactions can be deleted by authenticated users"
  ON financial_transactions
  FOR DELETE
  TO authenticated
  USING (auth.uid() = created_by);

-- Create storage schema and buckets
DO $$ 
BEGIN
  -- Create storage schema if it doesn't exist
  CREATE SCHEMA IF NOT EXISTS storage;
  
  -- Create the profiles bucket if it doesn't exist
  INSERT INTO storage.buckets (id, name, public)
  VALUES ('profiles', 'profiles', true)
  ON CONFLICT (id) DO NOTHING;

EXCEPTION 
  WHEN duplicate_schema THEN NULL;
END $$;