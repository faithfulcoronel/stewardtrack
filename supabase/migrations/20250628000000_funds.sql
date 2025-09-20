-- Add funds table with type and enforce non negative balances

-- Create enum for fund type
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'fund_type'
  ) THEN
    CREATE TYPE fund_type AS ENUM ('restricted', 'unrestricted');
  END IF;
END$$;

-- Create funds table
CREATE TABLE IF NOT EXISTS funds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name text NOT NULL,
  type fund_type NOT NULL DEFAULT 'unrestricted',
  created_by uuid REFERENCES auth.users(id),
  updated_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  deleted_at timestamptz
);

CREATE INDEX IF NOT EXISTS funds_tenant_id_idx ON funds(tenant_id);
CREATE INDEX IF NOT EXISTS funds_deleted_at_idx ON funds(deleted_at);

ALTER TABLE funds ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Funds are viewable by tenant users" ON funds
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Funds can be managed by tenant admins" ON funds
  FOR ALL TO authenticated
  USING (true);

CREATE TRIGGER update_funds_updated_at
BEFORE UPDATE ON funds
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Modify financial_transactions.fund_id to reference funds
ALTER TABLE financial_transactions
  ADD COLUMN IF NOT EXISTS fund_id uuid;

ALTER TABLE financial_transactions
  DROP CONSTRAINT IF EXISTS financial_transactions_fund_id_fkey,
  ADD CONSTRAINT financial_transactions_fund_id_fkey FOREIGN KEY (fund_id)
    REFERENCES funds(id);

CREATE INDEX IF NOT EXISTS financial_transactions_fund_id_idx ON financial_transactions(fund_id);

-- Function to check fund balance does not go negative for restricted funds
CREATE OR REPLACE FUNCTION check_fund_balance()
RETURNS TRIGGER AS $$
DECLARE
  v_type fund_type;
  v_balance numeric;
BEGIN
  IF NEW.fund_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT type INTO v_type FROM funds WHERE id = NEW.fund_id;
  IF v_type = 'restricted' THEN
    SELECT COALESCE(SUM(
      CASE
        WHEN type = 'income' THEN amount
        WHEN type = 'expense' THEN -amount
        ELSE COALESCE(debit,0) - COALESCE(credit,0)
      END
    ),0) INTO v_balance
    FROM financial_transactions
    WHERE fund_id = NEW.fund_id
      AND (id <> NEW.id OR TG_OP = 'INSERT');

    v_balance := v_balance + COALESCE(
      CASE
        WHEN NEW.type = 'income' THEN NEW.amount
        WHEN NEW.type = 'expense' THEN -NEW.amount
        ELSE COALESCE(NEW.debit,0) - COALESCE(NEW.credit,0)
      END,0);

    IF v_balance < 0 THEN
      RAISE EXCEPTION 'Restricted fund cannot have negative balance';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS check_fund_balance_trigger ON financial_transactions;
CREATE TRIGGER check_fund_balance_trigger
BEFORE INSERT OR UPDATE ON financial_transactions
FOR EACH ROW EXECUTE FUNCTION check_fund_balance();

-- Update member statement function to reference funds
DROP FUNCTION IF EXISTS get_member_statement(date, date);
CREATE OR REPLACE FUNCTION get_member_statement(p_start_date date, p_end_date date)
RETURNS TABLE (
  member_id uuid,
  first_name text,
  last_name text,
  fund_id uuid,
  fund_name text,
  total_amount numeric
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  RETURN QUERY
    SELECT
      m.id,
      m.first_name,
      m.last_name,
      f.id AS fund_id,
      f.name AS fund_name,
      SUM(ft.amount) AS total_amount
    FROM members m
    JOIN financial_transactions ft ON ft.member_id = m.id
    LEFT JOIN funds f ON ft.fund_id = f.id
    WHERE m.tenant_id = get_user_tenant_id()
      AND ft.tenant_id = m.tenant_id
      AND ft.date BETWEEN p_start_date AND p_end_date
      AND (SELECT code FROM categories WHERE id = m.status_category_id) IN ('active','donor')
      AND ft.type = 'income'
    GROUP BY m.id, m.first_name, m.last_name, f.id, f.name
    HAVING SUM(ft.amount) <> 0
    ORDER BY m.last_name, m.first_name, f.name;
END;
$$;

GRANT EXECUTE ON FUNCTION get_member_statement(date, date) TO authenticated;
