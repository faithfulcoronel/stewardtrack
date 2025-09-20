/*
# Chart of Accounts for Double-Entry Accounting

1. New Tables
  - `chart_of_accounts`
    - `id` (uuid, primary key)
    - `code` (text, not null) - Account code (e.g., 1000, 2000)
    - `name` (text, not null) - Account name
    - `description` (text) - Account description
    - `account_type` (text, not null) - Asset, Liability, Equity, Revenue, Expense
    - `account_subtype` (text) - More specific categorization
    - `is_active` (boolean, default true)
    - `parent_id` (uuid, self-reference) - For hierarchical accounts
    - `tenant_id` (uuid, foreign key to tenants)
    - Standard audit fields (created_by, updated_by, etc.)

2. Security
  - Enable RLS on `chart_of_accounts` table
  - Add policies for tenant-based access control

3. Default Chart of Accounts
  - Create default chart of accounts for churches
*/

-- Create chart_of_accounts table
CREATE TABLE IF NOT EXISTS chart_of_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  account_type TEXT NOT NULL CHECK (account_type IN ('asset', 'liability', 'equity', 'revenue', 'expense')),
  account_subtype TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  parent_id UUID REFERENCES chart_of_accounts(id),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  UNIQUE(tenant_id, code)
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS chart_of_accounts_tenant_id_idx ON chart_of_accounts(tenant_id);
CREATE INDEX IF NOT EXISTS chart_of_accounts_account_type_idx ON chart_of_accounts(account_type);
CREATE INDEX IF NOT EXISTS chart_of_accounts_parent_id_idx ON chart_of_accounts(parent_id);
CREATE INDEX IF NOT EXISTS chart_of_accounts_deleted_at_idx ON chart_of_accounts(deleted_at);

-- Enable Row Level Security
ALTER TABLE chart_of_accounts ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Chart of accounts are viewable by tenant users" 
  ON chart_of_accounts
  FOR SELECT
  TO authenticated
  USING (check_tenant_access(tenant_id));

CREATE POLICY "Chart of accounts can be inserted by authenticated users" 
  ON chart_of_accounts
  FOR INSERT
  TO authenticated
  WITH CHECK (check_tenant_access(tenant_id));

CREATE POLICY "Chart of accounts can be updated by authenticated users" 
  ON chart_of_accounts
  FOR UPDATE
  TO authenticated
  USING (check_tenant_access(tenant_id));

CREATE POLICY "Chart of accounts can be deleted by authenticated users" 
  ON chart_of_accounts
  FOR DELETE
  TO authenticated
  USING (check_tenant_access(tenant_id));

-- Create trigger for updated_at
CREATE TRIGGER update_chart_of_accounts_updated_at
BEFORE UPDATE ON chart_of_accounts
FOR EACH ROW
EXECUTE FUNCTION update_updated_at();

-- Add comment to table
COMMENT ON TABLE chart_of_accounts IS 'Chart of accounts for double-entry accounting system';