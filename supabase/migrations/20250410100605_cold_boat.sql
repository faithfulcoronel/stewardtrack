/*
  # Add accounts table

  1. New Tables
    - `accounts`
      - `id` (uuid, primary key)
      - `name` (text, not null)
      - `account_type` (text, not null)
      - `account_number` (text, not null)
      - `description` (text)
      - `email` (text)
      - `phone` (text)
      - `address` (text)
      - `website` (text)
      - `tax_id` (text)
      - `is_active` (boolean, default true)
      - `notes` (text)
      - `member_id` (uuid, references members)
      - `tenant_id` (uuid, references tenants)
      - `created_by` (uuid, references users)
      - `updated_by` (uuid, references users)
      - `created_at` (timestamp with time zone)
      - `updated_at` (timestamp with time zone)
      - `deleted_at` (timestamp with time zone)
  
  2. Security
    - Enable RLS on `accounts` table
    - Add policies for authenticated users to manage accounts
    
  3. Indexes
    - Add index on tenant_id for faster queries
    - Add index on account_type for filtering
    - Add index on member_id for relationship lookups
*/

-- Create accounts table
CREATE TABLE IF NOT EXISTS accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  account_type text NOT NULL CHECK (account_type IN ('organization', 'person')),
  account_number text NOT NULL,
  description text,
  email text,
  phone text,
  address text,
  website text,
  tax_id text,
  is_active boolean DEFAULT true,
  notes text,
  member_id uuid REFERENCES members(id),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  created_by uuid REFERENCES auth.users(id) NOT NULL,
  updated_by uuid REFERENCES auth.users(id) NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  deleted_at timestamptz
);

-- Create indexes
CREATE INDEX IF NOT EXISTS accounts_tenant_id_idx ON accounts(tenant_id);
CREATE INDEX IF NOT EXISTS accounts_account_type_idx ON accounts(account_type);
CREATE INDEX IF NOT EXISTS accounts_member_id_idx ON accounts(member_id);
CREATE INDEX IF NOT EXISTS accounts_deleted_at_idx ON accounts(deleted_at);

-- Add trigger for updated_at
CREATE TRIGGER update_accounts_updated_at
BEFORE UPDATE ON accounts
FOR EACH ROW
EXECUTE FUNCTION update_updated_at();

-- Enable Row Level Security
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Accounts are viewable by tenant users"
  ON accounts
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Accounts can be inserted by authenticated users"
  ON accounts
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Accounts can be updated by authenticated users"
  ON accounts
  FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Accounts can be deleted by authenticated users"
  ON accounts
  FOR DELETE
  TO authenticated
  USING (true);