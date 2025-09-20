-- Create income_transactions table to track income entries
CREATE TABLE IF NOT EXISTS income_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  transaction_date date NOT NULL,
  amount numeric(12,2) NOT NULL CHECK (amount >= 0),
  description text NOT NULL,
  reference text,
  member_id uuid REFERENCES members(id),
  category_id uuid REFERENCES categories(id),
  fund_id uuid REFERENCES funds(id),
  source_id uuid REFERENCES financial_sources(id),
  account_id uuid REFERENCES accounts(id),
  created_by uuid REFERENCES auth.users(id),
  updated_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  deleted_at timestamptz
);

-- Indexes for faster queries
CREATE INDEX IF NOT EXISTS income_transactions_tenant_id_idx ON income_transactions(tenant_id);
CREATE INDEX IF NOT EXISTS income_transactions_transaction_date_idx ON income_transactions(transaction_date);
CREATE INDEX IF NOT EXISTS income_transactions_member_id_idx ON income_transactions(member_id);
CREATE INDEX IF NOT EXISTS income_transactions_category_id_idx ON income_transactions(category_id);
CREATE INDEX IF NOT EXISTS income_transactions_fund_id_idx ON income_transactions(fund_id);
CREATE INDEX IF NOT EXISTS income_transactions_source_id_idx ON income_transactions(source_id);
CREATE INDEX IF NOT EXISTS income_transactions_account_id_idx ON income_transactions(account_id);
CREATE INDEX IF NOT EXISTS income_transactions_deleted_at_idx ON income_transactions(deleted_at);

-- Enable RLS
ALTER TABLE income_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Income transactions are viewable by tenant users" ON income_transactions
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Income transactions can be managed by tenant users" ON income_transactions
  FOR ALL TO authenticated
  USING (true);

-- updated_at trigger
CREATE TRIGGER update_income_transactions_updated_at
BEFORE UPDATE ON income_transactions
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

COMMENT ON TABLE income_transactions IS 'Simplified record of income transactions';
