/*
  # Initial Church Management System Schema

  1. New Tables
    - `members`
      - `id` (uuid, primary key)
      - `first_name` (text)
      - `middle_name` (text, nullable)
      - `last_name` (text)
      - `address` (text)
      - `contact_number` (text)
      - `membership_date` (date)
      - `membership_type` (enum: 'baptism', 'transfer')
      - `status` (enum: 'active', 'inactive', 'under_discipline', 'regular_attender', 'visitor', 'withdrawn', 'removed')
      - `profile_picture_url` (text, nullable)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

    - `transactions`
      - `id` (uuid, primary key)
      - `type` (enum: 'income', 'expense')
      - `category` (enum: 'tithe', 'offering', 'donation', 'ministry', 'payroll', 'utilities', 'maintenance', 'other')
      - `amount` (decimal)
      - `description` (text)
      - `member_id` (uuid, foreign key to members, nullable)
      - `date` (date)
      - `created_at` (timestamp)
      - `created_by` (uuid, foreign key to auth.users)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users
*/

-- Create custom types
CREATE TYPE membership_type AS ENUM ('baptism', 'transfer');
CREATE TYPE member_status AS ENUM ('active', 'inactive', 'under_discipline', 'regular_attender', 'visitor', 'withdrawn', 'removed');
CREATE TYPE transaction_type AS ENUM ('income', 'expense');
CREATE TYPE transaction_category AS ENUM ('tithe', 'offering', 'donation', 'ministry', 'payroll', 'utilities', 'maintenance', 'other');

-- Create members table
CREATE TABLE IF NOT EXISTS members (
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

-- Create transactions table
CREATE TABLE IF NOT EXISTS transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type transaction_type NOT NULL,
  category transaction_category NOT NULL,
  amount decimal(10,2) NOT NULL,
  description text NOT NULL,
  member_id uuid REFERENCES members(id),
  date date NOT NULL,
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id) NOT NULL
);

-- Enable Row Level Security
ALTER TABLE members ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- Create policies for members table
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

-- Create policies for transactions table
CREATE POLICY "Transactions are viewable by authenticated users"
  ON transactions
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Transactions can be inserted by authenticated users"
  ON transactions
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for members table
CREATE TRIGGER update_members_updated_at
  BEFORE UPDATE ON members
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();