-- Add designated_funds table and link to financial_transactions

-- Create designated_funds table
CREATE TABLE IF NOT EXISTS designated_funds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name text NOT NULL,
  code text NOT NULL,
  description text,
  is_active boolean DEFAULT true,
  created_by uuid REFERENCES auth.users(id),
  updated_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  deleted_at timestamptz,
  UNIQUE (tenant_id, code)
);

-- Indexes
CREATE INDEX IF NOT EXISTS designated_funds_tenant_id_idx ON designated_funds(tenant_id);
CREATE INDEX IF NOT EXISTS designated_funds_deleted_at_idx ON designated_funds(deleted_at);

-- Enable Row Level Security
ALTER TABLE designated_funds ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Designated funds are viewable by tenant users" ON designated_funds
  FOR SELECT TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()
    ) AND deleted_at IS NULL
  );

CREATE POLICY "Designated funds can be managed by tenant admins" ON designated_funds
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM tenant_users tu
      WHERE tu.tenant_id = designated_funds.tenant_id
        AND tu.user_id = auth.uid()
        AND tu.admin_role IN ('super_admin','tenant_admin')
    ) AND deleted_at IS NULL
  );

-- updated_at trigger
CREATE TRIGGER update_designated_funds_updated_at
BEFORE UPDATE ON designated_funds
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

COMMENT ON TABLE designated_funds IS 'Funds designated for specific purposes';

-- Add fund_id column to financial_transactions
ALTER TABLE financial_transactions
  ADD COLUMN IF NOT EXISTS fund_id uuid REFERENCES designated_funds(id);

CREATE INDEX IF NOT EXISTS financial_transactions_fund_id_idx ON financial_transactions(fund_id);

COMMENT ON COLUMN financial_transactions.fund_id IS 'Reference to the designated fund for this transaction';

-- Seed a default General fund for existing tenants
INSERT INTO designated_funds (tenant_id, name, code)
SELECT id, 'General Fund', 'GENERAL'
FROM tenants
ON CONFLICT DO NOTHING;
