/*
  # Add Multi-Tenant Support

  1. New Tables
    - `tenants` - Stores church organization information
    - `tenant_users` - Maps users to tenants
    - `invitations` - Manages user invitations

  2. Changes
    - Add tenant_id to existing tables
    - Update RLS policies for tenant isolation
    - Add invitation management functions

  3. Security
    - Enable RLS on new tables
    - Add tenant-aware policies
    - Add secure invitation system
*/

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Create tenants table
CREATE TABLE tenants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  subdomain text UNIQUE NOT NULL,
  address text,
  contact_number text,
  email text,
  website text,
  logo_url text,
  status text NOT NULL DEFAULT 'active',
  subscription_tier text NOT NULL DEFAULT 'free',
  subscription_status text NOT NULL DEFAULT 'active',
  subscription_end_date timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id) NOT NULL,
  CONSTRAINT valid_subdomain CHECK (subdomain ~ '^[a-z0-9-]+$')
);

-- Create tenant_users junction table
CREATE TABLE tenant_users (
  tenant_id uuid REFERENCES tenants(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'member',
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id) NOT NULL,
  PRIMARY KEY (tenant_id, user_id)
);

-- Create invitations table
CREATE TABLE invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES tenants(id) ON DELETE CASCADE,
  email text NOT NULL,
  role text NOT NULL DEFAULT 'member',
  token text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  accepted_at timestamptz,
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id) NOT NULL,
  CONSTRAINT valid_email CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

-- Add tenant_id to existing tables
ALTER TABLE members ADD COLUMN tenant_id uuid REFERENCES tenants(id);
ALTER TABLE financial_transactions ADD COLUMN tenant_id uuid REFERENCES tenants(id);
ALTER TABLE budgets ADD COLUMN tenant_id uuid REFERENCES tenants(id);

-- Create indexes for tenant_id columns
CREATE INDEX members_tenant_id_idx ON members(tenant_id);
CREATE INDEX financial_transactions_tenant_id_idx ON financial_transactions(tenant_id);
CREATE INDEX budgets_tenant_id_idx ON budgets(tenant_id);

-- Enable RLS on new tables
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for tenants
CREATE POLICY "Tenants are viewable by their members"
  ON tenants FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM tenant_users
      WHERE tenant_users.tenant_id = tenants.id
      AND tenant_users.user_id = auth.uid()
    )
  );

CREATE POLICY "Tenants can be created by authenticated users"
  ON tenants FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Tenants can be updated by admin users"
  ON tenants FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM tenant_users
      WHERE tenant_users.tenant_id = tenants.id
      AND tenant_users.user_id = auth.uid()
      AND tenant_users.role = 'admin'
    )
  );

-- Create RLS policies for tenant_users
CREATE POLICY "Tenant users are viewable by tenant members"
  ON tenant_users FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM tenant_users tu
      WHERE tu.tenant_id = tenant_users.tenant_id
      AND tu.user_id = auth.uid()
    )
  );

CREATE POLICY "Tenant users can be managed by tenant admins"
  ON tenant_users FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM tenant_users tu
      WHERE tu.tenant_id = tenant_users.tenant_id
      AND tu.user_id = auth.uid()
      AND tu.role = 'admin'
    )
  );

-- Create RLS policies for invitations
CREATE POLICY "Invitations are viewable by tenant admins"
  ON invitations FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM tenant_users
      WHERE tenant_users.tenant_id = invitations.tenant_id
      AND tenant_users.user_id = auth.uid()
      AND tenant_users.role = 'admin'
    )
  );

CREATE POLICY "Invitations can be managed by tenant admins"
  ON invitations FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM tenant_users
      WHERE tenant_users.tenant_id = invitations.tenant_id
      AND tenant_users.user_id = auth.uid()
      AND tenant_users.role = 'admin'
    )
  );

-- Update RLS policies for members
DROP POLICY IF EXISTS "Members are viewable by authenticated users" ON members;
CREATE POLICY "Members are viewable by tenant users"
  ON members FOR SELECT
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM tenant_users
      WHERE user_id = auth.uid()
    )
    AND deleted_at IS NULL
  );

DROP POLICY IF EXISTS "Members can be managed by authenticated users" ON members;
CREATE POLICY "Members can be managed by tenant users"
  ON members FOR ALL
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM tenant_users
      WHERE user_id = auth.uid()
    )
    AND deleted_at IS NULL
  );

-- Update RLS policies for financial_transactions
DROP POLICY IF EXISTS "Financial transactions are viewable by authenticated users" ON financial_transactions;
CREATE POLICY "Financial transactions are viewable by tenant users"
  ON financial_transactions FOR SELECT
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM tenant_users
      WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Financial transactions can be managed by authenticated users" ON financial_transactions;
CREATE POLICY "Financial transactions can be managed by tenant users"
  ON financial_transactions FOR ALL
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM tenant_users
      WHERE user_id = auth.uid()
    )
  );

-- Update RLS policies for budgets
DROP POLICY IF EXISTS "Budgets are viewable by authenticated users" ON budgets;
CREATE POLICY "Budgets are viewable by tenant users"
  ON budgets FOR SELECT
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM tenant_users
      WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Budgets can be managed by authenticated users" ON budgets;
CREATE POLICY "Budgets can be managed by tenant users"
  ON budgets FOR ALL
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM tenant_users
      WHERE user_id = auth.uid()
    )
  );

-- Add helpful comments
COMMENT ON TABLE tenants IS 
  'Church organizations using the system';

COMMENT ON TABLE tenant_users IS 
  'Maps users to church organizations with their roles';

COMMENT ON TABLE invitations IS 
  'Manages invitations for new users to join church organizations';