-- Fiscal year management and opening balances

-- opening_balance_source enum
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'opening_balance_source'
  ) THEN
    CREATE TYPE opening_balance_source AS ENUM ('manual','rollover');
  END IF;
END$$;

-- fiscal_years table
CREATE TABLE IF NOT EXISTS fiscal_years (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name text NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','closed')),
  closed_at timestamptz,
  closed_by uuid REFERENCES auth.users(id),
  created_by uuid REFERENCES auth.users(id),
  updated_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  deleted_at timestamptz,
  UNIQUE(tenant_id,name)
);

CREATE INDEX IF NOT EXISTS fiscal_years_tenant_id_idx ON fiscal_years(tenant_id);
CREATE INDEX IF NOT EXISTS fiscal_years_deleted_at_idx ON fiscal_years(deleted_at);

ALTER TABLE fiscal_years ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Fiscal years are viewable within tenant" ON fiscal_years
  FOR SELECT TO authenticated
  USING (check_tenant_access(tenant_id) AND deleted_at IS NULL);
CREATE POLICY "Fiscal years can be managed within tenant" ON fiscal_years
  FOR ALL TO authenticated
  USING (check_tenant_access(tenant_id) AND deleted_at IS NULL)
  WITH CHECK (check_tenant_access(tenant_id));

-- fiscal_periods table
CREATE TABLE IF NOT EXISTS fiscal_periods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fiscal_year_id uuid REFERENCES fiscal_years(id) ON DELETE CASCADE,
  name text NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','closed')),
  closed_at timestamptz,
  closed_by uuid REFERENCES auth.users(id),
  created_by uuid REFERENCES auth.users(id),
  updated_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  deleted_at timestamptz,
  UNIQUE(fiscal_year_id,name)
);

CREATE INDEX IF NOT EXISTS fiscal_periods_year_id_idx ON fiscal_periods(fiscal_year_id);
CREATE INDEX IF NOT EXISTS fiscal_periods_status_idx ON fiscal_periods(status);
CREATE INDEX IF NOT EXISTS fiscal_periods_deleted_at_idx ON fiscal_periods(deleted_at);

ALTER TABLE fiscal_periods ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Fiscal periods are viewable within tenant" ON fiscal_periods
  FOR SELECT TO authenticated
  USING (check_tenant_access((SELECT tenant_id FROM fiscal_years fy WHERE fy.id = fiscal_periods.fiscal_year_id)) AND deleted_at IS NULL);
CREATE POLICY "Fiscal periods can be managed within tenant" ON fiscal_periods
  FOR ALL TO authenticated
  USING (check_tenant_access((SELECT tenant_id FROM fiscal_years fy WHERE fy.id = fiscal_periods.fiscal_year_id)) AND deleted_at IS NULL)
  WITH CHECK (check_tenant_access((SELECT tenant_id FROM fiscal_years fy WHERE fy.id = fiscal_periods.fiscal_year_id)));

-- fund_opening_balances staging table
CREATE TABLE IF NOT EXISTS fund_opening_balances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  fiscal_year_id uuid NOT NULL REFERENCES fiscal_years(id) ON DELETE CASCADE,
  fund_id uuid NOT NULL REFERENCES funds(id),
  amount numeric(12,2) NOT NULL CHECK (amount >= 0),
  source opening_balance_source DEFAULT 'manual',
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','posted')),
  posted_at timestamptz,
  posted_by uuid REFERENCES auth.users(id),
  created_by uuid REFERENCES auth.users(id),
  updated_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  deleted_at timestamptz
);

CREATE INDEX IF NOT EXISTS fund_opening_balances_tenant_id_idx ON fund_opening_balances(tenant_id);
CREATE INDEX IF NOT EXISTS fund_opening_balances_fiscal_year_id_idx ON fund_opening_balances(fiscal_year_id);
CREATE INDEX IF NOT EXISTS fund_opening_balances_status_idx ON fund_opening_balances(status);
CREATE INDEX IF NOT EXISTS fund_opening_balances_deleted_at_idx ON fund_opening_balances(deleted_at);

ALTER TABLE fund_opening_balances ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Fund opening balances are viewable within tenant" ON fund_opening_balances
  FOR SELECT TO authenticated
  USING (check_tenant_access(tenant_id) AND deleted_at IS NULL);
CREATE POLICY "Fund opening balances can be managed within tenant" ON fund_opening_balances
  FOR ALL TO authenticated
  USING (check_tenant_access(tenant_id) AND deleted_at IS NULL)
  WITH CHECK (check_tenant_access(tenant_id));

-- Trigger function to generate monthly periods for a fiscal year
CREATE OR REPLACE FUNCTION create_monthly_fiscal_periods(p_year_id uuid, p_user_id uuid)
RETURNS void AS $$
DECLARE
  v_year fiscal_years;
  v_start date;
  v_end date;
  v_name text;
BEGIN
  SELECT * INTO v_year FROM fiscal_years WHERE id = p_year_id;
  IF v_year.id IS NULL THEN
    RAISE EXCEPTION 'Fiscal year not found';
  END IF;
  v_start := date_trunc('month', v_year.start_date);
  WHILE v_start <= v_year.end_date LOOP
    v_end := (v_start + interval '1 month - 1 day')::date;
    IF v_end > v_year.end_date THEN
      v_end := v_year.end_date;
    END IF;
    v_name := to_char(v_start, 'Mon YYYY');
    INSERT INTO fiscal_periods (fiscal_year_id,name,start_date,end_date,created_by,updated_by)
    VALUES (p_year_id,v_name,v_start,v_end,p_user_id,p_user_id);
    v_start := (v_start + interval '1 month')::date;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION create_fiscal_periods_for_new_year()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM create_monthly_fiscal_periods(NEW.id, NEW.created_by);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS create_fiscal_periods_trigger ON fiscal_years;
CREATE TRIGGER create_fiscal_periods_trigger
AFTER INSERT ON fiscal_years
FOR EACH ROW EXECUTE FUNCTION create_fiscal_periods_for_new_year();

-- Log open/close events
CREATE OR REPLACE FUNCTION log_fiscal_year_change()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.status <> OLD.status THEN
    PERFORM record_audit_log(NEW.status, 'fiscal_year', NEW.id::text, jsonb_build_object('from', OLD.status, 'to', NEW.status));
  ELSIF TG_OP = 'INSERT' THEN
    PERFORM record_audit_log('open', 'fiscal_year', NEW.id::text, jsonb_build_object('status', NEW.status));
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS log_fiscal_year_change_trigger ON fiscal_years;
CREATE TRIGGER log_fiscal_year_change_trigger
AFTER INSERT OR UPDATE ON fiscal_years
FOR EACH ROW EXECUTE FUNCTION log_fiscal_year_change();

-- Enforce fiscal year open for transactions
CREATE OR REPLACE FUNCTION enforce_fiscal_year_open()
RETURNS TRIGGER AS $$
DECLARE
  v_date date;
  v_year fiscal_years;
BEGIN
  IF TG_TABLE_NAME = 'financial_transaction_headers' THEN
    v_date := NEW.transaction_date;
  ELSE
    v_date := NEW.date;
  END IF;

  SELECT * INTO v_year
  FROM fiscal_years fy
  WHERE fy.tenant_id = NEW.tenant_id
    AND v_date BETWEEN fy.start_date AND fy.end_date
  LIMIT 1;

  IF v_year.id IS NULL THEN
    RAISE EXCEPTION 'No fiscal year defined for date %', v_date;
  END IF;

  IF v_year.status = 'closed' THEN
    RAISE EXCEPTION 'Fiscal year % is closed', v_year.name;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS enforce_fiscal_year_open_header ON financial_transaction_headers;
CREATE TRIGGER enforce_fiscal_year_open_header
BEFORE INSERT OR UPDATE ON financial_transaction_headers
FOR EACH ROW EXECUTE FUNCTION enforce_fiscal_year_open();

DROP TRIGGER IF EXISTS enforce_fiscal_year_open_tx ON financial_transactions;
CREATE TRIGGER enforce_fiscal_year_open_tx
BEFORE INSERT OR UPDATE ON financial_transactions
FOR EACH ROW EXECUTE FUNCTION enforce_fiscal_year_open();

-- Post fund opening balances
CREATE OR REPLACE FUNCTION post_fund_opening_balances(p_fiscal_year_id uuid, p_user_id uuid)
RETURNS void AS $$
DECLARE
  v_row RECORD;
  v_year fiscal_years;
  v_equity uuid;
  v_cash uuid;
  v_header uuid;
  v_number text;
BEGIN
  SELECT * INTO v_year FROM fiscal_years WHERE id = p_fiscal_year_id;
  IF v_year.id IS NULL THEN
    RAISE EXCEPTION 'Fiscal year not found';
  END IF;

  SELECT id INTO v_equity FROM chart_of_accounts
    WHERE tenant_id = v_year.tenant_id AND code = '3100' LIMIT 1;
  SELECT id INTO v_cash FROM chart_of_accounts
    WHERE tenant_id = v_year.tenant_id AND code = '1101' LIMIT 1;

  FOR v_row IN
    SELECT * FROM fund_opening_balances
    WHERE fiscal_year_id = p_fiscal_year_id
      AND status = 'pending' AND deleted_at IS NULL
  LOOP
    v_number := 'OB-'||to_char(now(),'YYYYMMDDHH24MISS');
    INSERT INTO financial_transaction_headers (
      transaction_number, transaction_date, description, tenant_id,
      status, posted_at, posted_by, created_by, updated_by
    ) VALUES (
      v_number, v_year.start_date, 'Opening Balance', v_row.tenant_id,
      'posted', now(), p_user_id, p_user_id, p_user_id
    ) RETURNING id INTO v_header;

    INSERT INTO financial_transactions (
      tenant_id, type, amount, description, date, header_id,
      account_id, fund_id, debit, credit, created_by, updated_by
    ) VALUES (
      v_row.tenant_id, 'income', v_row.amount, 'Opening Balance', v_year.start_date,
      v_header, v_cash, v_row.fund_id, v_row.amount, 0, p_user_id, p_user_id
    );

    INSERT INTO financial_transactions (
      tenant_id, type, amount, description, date, header_id,
      account_id, fund_id, debit, credit, created_by, updated_by
    ) VALUES (
      v_row.tenant_id, 'income', v_row.amount, 'Opening Balance', v_year.start_date,
      v_header, v_equity, v_row.fund_id, 0, v_row.amount, p_user_id, p_user_id
    );

    UPDATE fund_opening_balances
    SET status = 'posted', posted_at = now(), posted_by = p_user_id,
        updated_at = now(), updated_by = p_user_id
    WHERE id = v_row.id;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION create_monthly_fiscal_periods(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION post_fund_opening_balances(uuid, uuid) TO authenticated;
