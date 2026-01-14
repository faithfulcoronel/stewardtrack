-- =============================================================================
-- Period-End Balance Snapshots for Large Data Performance
-- =============================================================================
-- Strategy: Store closing balances when fiscal periods close.
-- Future queries only need to:
--   1. Get the last closed period's ending balance (instant lookup)
--   2. Add transactions from current open period (small scan)
-- =============================================================================

-- Period-end balance snapshots by account
CREATE TABLE IF NOT EXISTS period_end_balances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  fiscal_year_id uuid NOT NULL REFERENCES fiscal_years(id) ON DELETE CASCADE,
  fiscal_period_id uuid REFERENCES fiscal_periods(id) ON DELETE CASCADE,
  account_id uuid NOT NULL REFERENCES chart_of_accounts(id) ON DELETE CASCADE,

  -- Balance data
  debit_balance numeric(14,2) NOT NULL DEFAULT 0,
  credit_balance numeric(14,2) NOT NULL DEFAULT 0,
  net_balance numeric(14,2) NOT NULL DEFAULT 0,

  -- Period info (denormalized for query performance)
  period_end_date date NOT NULL,
  period_name text,

  -- Metadata
  snapshot_type text NOT NULL DEFAULT 'period_close'
    CHECK (snapshot_type IN ('period_close', 'year_close', 'manual')),
  captured_at timestamptz NOT NULL DEFAULT now(),
  captured_by uuid REFERENCES auth.users(id),

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),

  -- Unique constraint: one snapshot per account per period
  UNIQUE(tenant_id, fiscal_period_id, account_id)
);

-- Indexes for fast lookups
CREATE INDEX idx_peb_tenant_period ON period_end_balances(tenant_id, period_end_date DESC);
CREATE INDEX idx_peb_tenant_account ON period_end_balances(tenant_id, account_id, period_end_date DESC);
CREATE INDEX idx_peb_fiscal_year ON period_end_balances(fiscal_year_id);

-- Fund balance snapshots (for fund accounting)
CREATE TABLE IF NOT EXISTS fund_period_balances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  fiscal_year_id uuid NOT NULL REFERENCES fiscal_years(id) ON DELETE CASCADE,
  fiscal_period_id uuid REFERENCES fiscal_periods(id) ON DELETE CASCADE,
  fund_id uuid NOT NULL REFERENCES funds(id) ON DELETE CASCADE,

  -- Balance data
  opening_balance numeric(14,2) NOT NULL DEFAULT 0,
  total_income numeric(14,2) NOT NULL DEFAULT 0,
  total_expenses numeric(14,2) NOT NULL DEFAULT 0,
  net_change numeric(14,2) NOT NULL DEFAULT 0,
  closing_balance numeric(14,2) NOT NULL DEFAULT 0,

  -- Period info
  period_end_date date NOT NULL,
  period_name text,

  -- Metadata
  snapshot_type text NOT NULL DEFAULT 'period_close',
  captured_at timestamptz NOT NULL DEFAULT now(),

  created_at timestamptz DEFAULT now(),

  UNIQUE(tenant_id, fiscal_period_id, fund_id)
);

CREATE INDEX idx_fpb_tenant_period ON fund_period_balances(tenant_id, period_end_date DESC);
CREATE INDEX idx_fpb_tenant_fund ON fund_period_balances(tenant_id, fund_id, period_end_date DESC);

-- Financial source (bank/cash) balance snapshots
CREATE TABLE IF NOT EXISTS source_period_balances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  fiscal_year_id uuid NOT NULL REFERENCES fiscal_years(id) ON DELETE CASCADE,
  fiscal_period_id uuid REFERENCES fiscal_periods(id) ON DELETE CASCADE,
  source_id uuid NOT NULL REFERENCES financial_sources(id) ON DELETE CASCADE,

  -- Balance data
  opening_balance numeric(14,2) NOT NULL DEFAULT 0,
  total_deposits numeric(14,2) NOT NULL DEFAULT 0,
  total_withdrawals numeric(14,2) NOT NULL DEFAULT 0,
  net_change numeric(14,2) NOT NULL DEFAULT 0,
  closing_balance numeric(14,2) NOT NULL DEFAULT 0,

  -- Period info
  period_end_date date NOT NULL,
  period_name text,

  -- Metadata
  snapshot_type text NOT NULL DEFAULT 'period_close',
  captured_at timestamptz NOT NULL DEFAULT now(),

  created_at timestamptz DEFAULT now(),

  UNIQUE(tenant_id, fiscal_period_id, source_id)
);

CREATE INDEX idx_spb_tenant_period ON source_period_balances(tenant_id, period_end_date DESC);
CREATE INDEX idx_spb_tenant_source ON source_period_balances(tenant_id, source_id, period_end_date DESC);

-- Category summary snapshots (for income/expense reporting)
CREATE TABLE IF NOT EXISTS category_period_summaries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  fiscal_year_id uuid NOT NULL REFERENCES fiscal_years(id) ON DELETE CASCADE,
  fiscal_period_id uuid REFERENCES fiscal_periods(id) ON DELETE CASCADE,
  category_id uuid NOT NULL,
  category_type text NOT NULL CHECK (category_type IN ('income', 'expense')),

  -- Summary data
  transaction_count int NOT NULL DEFAULT 0,
  total_amount numeric(14,2) NOT NULL DEFAULT 0,
  budget_amount numeric(14,2) DEFAULT 0,
  variance numeric(14,2) DEFAULT 0,

  -- Period info
  period_end_date date NOT NULL,
  period_name text,

  captured_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz DEFAULT now(),

  UNIQUE(tenant_id, fiscal_period_id, category_id)
);

CREATE INDEX idx_cps_tenant_period ON category_period_summaries(tenant_id, period_end_date DESC);
CREATE INDEX idx_cps_tenant_category ON category_period_summaries(tenant_id, category_id, period_end_date DESC);

-- RLS policies
ALTER TABLE period_end_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE fund_period_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE source_period_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE category_period_summaries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Period end balances viewable by tenant" ON period_end_balances
  FOR SELECT TO authenticated
  USING (check_tenant_access(tenant_id));

CREATE POLICY "Period end balances manageable by tenant" ON period_end_balances
  FOR ALL TO authenticated
  USING (check_tenant_access(tenant_id))
  WITH CHECK (check_tenant_access(tenant_id));

CREATE POLICY "Fund period balances viewable by tenant" ON fund_period_balances
  FOR SELECT TO authenticated
  USING (check_tenant_access(tenant_id));

CREATE POLICY "Fund period balances manageable by tenant" ON fund_period_balances
  FOR ALL TO authenticated
  USING (check_tenant_access(tenant_id))
  WITH CHECK (check_tenant_access(tenant_id));

CREATE POLICY "Source period balances viewable by tenant" ON source_period_balances
  FOR SELECT TO authenticated
  USING (check_tenant_access(tenant_id));

CREATE POLICY "Source period balances manageable by tenant" ON source_period_balances
  FOR ALL TO authenticated
  USING (check_tenant_access(tenant_id))
  WITH CHECK (check_tenant_access(tenant_id));

CREATE POLICY "Category summaries viewable by tenant" ON category_period_summaries
  FOR SELECT TO authenticated
  USING (check_tenant_access(tenant_id));

CREATE POLICY "Category summaries manageable by tenant" ON category_period_summaries
  FOR ALL TO authenticated
  USING (check_tenant_access(tenant_id))
  WITH CHECK (check_tenant_access(tenant_id));

-- =============================================================================
-- Function: Capture period-end balances when a fiscal period closes
-- =============================================================================
CREATE OR REPLACE FUNCTION capture_period_end_balances(
  p_tenant_id uuid,
  p_fiscal_period_id uuid,
  p_user_id uuid DEFAULT NULL
)
RETURNS TABLE(accounts_captured int, funds_captured int, sources_captured int, categories_captured int) AS $$
DECLARE
  v_period fiscal_periods;
  v_accounts_count int := 0;
  v_funds_count int := 0;
  v_sources_count int := 0;
  v_categories_count int := 0;
BEGIN
  -- Get period details
  SELECT * INTO v_period FROM fiscal_periods WHERE id = p_fiscal_period_id;
  IF v_period.id IS NULL THEN
    RAISE EXCEPTION 'Fiscal period not found';
  END IF;

  -- Capture account balances
  INSERT INTO period_end_balances (
    tenant_id, fiscal_year_id, fiscal_period_id, account_id,
    debit_balance, credit_balance, net_balance,
    period_end_date, period_name, snapshot_type, captured_by
  )
  SELECT
    p_tenant_id,
    v_period.fiscal_year_id,
    p_fiscal_period_id,
    coa.id,
    COALESCE(SUM(ft.debit), 0),
    COALESCE(SUM(ft.credit), 0),
    COALESCE(SUM(ft.debit), 0) - COALESCE(SUM(ft.credit), 0),
    v_period.end_date,
    v_period.name,
    'period_close',
    p_user_id
  FROM chart_of_accounts coa
  LEFT JOIN financial_transactions ft ON ft.coa_id = coa.id
    AND ft.tenant_id = p_tenant_id
    AND ft.date <= v_period.end_date
    AND ft.deleted_at IS NULL
  WHERE coa.tenant_id = p_tenant_id
    AND coa.deleted_at IS NULL
  GROUP BY coa.id
  ON CONFLICT (tenant_id, fiscal_period_id, account_id)
  DO UPDATE SET
    debit_balance = EXCLUDED.debit_balance,
    credit_balance = EXCLUDED.credit_balance,
    net_balance = EXCLUDED.net_balance,
    captured_at = now(),
    captured_by = p_user_id,
    updated_at = now();

  GET DIAGNOSTICS v_accounts_count = ROW_COUNT;

  -- Capture fund balances
  INSERT INTO fund_period_balances (
    tenant_id, fiscal_year_id, fiscal_period_id, fund_id,
    opening_balance, total_income, total_expenses, net_change, closing_balance,
    period_end_date, period_name, snapshot_type
  )
  SELECT
    p_tenant_id,
    v_period.fiscal_year_id,
    p_fiscal_period_id,
    f.id,
    0, -- Opening balance would come from previous period snapshot
    COALESCE(SUM(CASE WHEN ft.type = 'income' THEN ft.debit ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN ft.type = 'expense' THEN ft.debit ELSE 0 END), 0),
    COALESCE(SUM(ft.debit - ft.credit), 0),
    COALESCE(SUM(ft.debit - ft.credit), 0)
  FROM funds f
  LEFT JOIN financial_transactions ft ON ft.fund_id = f.id
    AND ft.tenant_id = p_tenant_id
    AND ft.date <= v_period.end_date
    AND ft.deleted_at IS NULL
  WHERE f.tenant_id = p_tenant_id
    AND f.deleted_at IS NULL
  GROUP BY f.id
  ON CONFLICT (tenant_id, fiscal_period_id, fund_id)
  DO UPDATE SET
    total_income = EXCLUDED.total_income,
    total_expenses = EXCLUDED.total_expenses,
    net_change = EXCLUDED.net_change,
    closing_balance = EXCLUDED.closing_balance,
    captured_at = now();

  GET DIAGNOSTICS v_funds_count = ROW_COUNT;

  -- Capture source (bank/cash) balances
  INSERT INTO source_period_balances (
    tenant_id, fiscal_year_id, fiscal_period_id, source_id,
    opening_balance, total_deposits, total_withdrawals, net_change, closing_balance,
    period_end_date, period_name, snapshot_type
  )
  SELECT
    p_tenant_id,
    v_period.fiscal_year_id,
    p_fiscal_period_id,
    fs.id,
    0, -- Opening balance would come from previous period snapshot
    COALESCE(SUM(CASE WHEN ft.debit > 0 THEN ft.debit ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN ft.credit > 0 THEN ft.credit ELSE 0 END), 0),
    COALESCE(SUM(ft.debit - ft.credit), 0),
    COALESCE(SUM(ft.debit - ft.credit), 0)
  FROM financial_sources fs
  LEFT JOIN financial_transactions ft ON ft.source_id = fs.id
    AND ft.tenant_id = p_tenant_id
    AND ft.date <= v_period.end_date
    AND ft.deleted_at IS NULL
  WHERE fs.tenant_id = p_tenant_id
    AND fs.deleted_at IS NULL
  GROUP BY fs.id
  ON CONFLICT (tenant_id, fiscal_period_id, source_id)
  DO UPDATE SET
    total_deposits = EXCLUDED.total_deposits,
    total_withdrawals = EXCLUDED.total_withdrawals,
    net_change = EXCLUDED.net_change,
    closing_balance = EXCLUDED.closing_balance,
    captured_at = now();

  GET DIAGNOSTICS v_sources_count = ROW_COUNT;

  -- Capture category summaries (for income/expense categories)
  INSERT INTO category_period_summaries (
    tenant_id, fiscal_year_id, fiscal_period_id, category_id, category_type,
    transaction_count, total_amount,
    period_end_date, period_name
  )
  SELECT
    p_tenant_id,
    v_period.fiscal_year_id,
    p_fiscal_period_id,
    iet.category_id,
    iet.type,
    COUNT(*),
    COALESCE(SUM(iet.amount), 0),
    v_period.end_date,
    v_period.name
  FROM income_expense_transactions iet
  WHERE iet.tenant_id = p_tenant_id
    AND iet.transaction_date <= v_period.end_date
    AND iet.deleted_at IS NULL
    AND iet.category_id IS NOT NULL
  GROUP BY iet.category_id, iet.type
  ON CONFLICT (tenant_id, fiscal_period_id, category_id)
  DO UPDATE SET
    transaction_count = EXCLUDED.transaction_count,
    total_amount = EXCLUDED.total_amount,
    captured_at = now();

  GET DIAGNOSTICS v_categories_count = ROW_COUNT;

  accounts_captured := v_accounts_count;
  funds_captured := v_funds_count;
  sources_captured := v_sources_count;
  categories_captured := v_categories_count;
  RETURN NEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- Function: Optimized trial balance using snapshots
-- =============================================================================
CREATE OR REPLACE FUNCTION report_trial_balance_optimized(
  p_tenant_id uuid,
  p_end_date date
)
RETURNS TABLE(
  account_id uuid,
  account_code text,
  account_name text,
  account_type text,
  debit_balance numeric,
  credit_balance numeric
) AS $$
DECLARE
  v_last_snapshot_date date;
  v_last_period_id uuid;
BEGIN
  -- Find the most recent snapshot before or on the end date
  SELECT peb.period_end_date, peb.fiscal_period_id
  INTO v_last_snapshot_date, v_last_period_id
  FROM period_end_balances peb
  WHERE peb.tenant_id = p_tenant_id
    AND peb.period_end_date <= p_end_date
  ORDER BY peb.period_end_date DESC
  LIMIT 1;

  IF v_last_snapshot_date IS NOT NULL THEN
    -- Use snapshot + delta approach
    RETURN QUERY
    SELECT
      coa.id AS account_id,
      coa.code AS account_code,
      coa.name AS account_name,
      coa.account_type,
      -- Snapshot balance + transactions since snapshot
      COALESCE(peb.debit_balance, 0) + COALESCE(SUM(ft.debit), 0) AS debit_balance,
      COALESCE(peb.credit_balance, 0) + COALESCE(SUM(ft.credit), 0) AS credit_balance
    FROM chart_of_accounts coa
    LEFT JOIN period_end_balances peb ON peb.account_id = coa.id
      AND peb.tenant_id = p_tenant_id
      AND peb.fiscal_period_id = v_last_period_id
    LEFT JOIN financial_transactions ft ON ft.coa_id = coa.id
      AND ft.tenant_id = p_tenant_id
      AND ft.date > v_last_snapshot_date  -- Only transactions AFTER snapshot
      AND ft.date <= p_end_date
      AND ft.deleted_at IS NULL
    WHERE coa.tenant_id = p_tenant_id
      AND coa.deleted_at IS NULL
      AND coa.is_active = true
    GROUP BY coa.id, coa.code, coa.name, coa.account_type, peb.debit_balance, peb.credit_balance
    HAVING COALESCE(peb.debit_balance, 0) + COALESCE(SUM(ft.debit), 0) != 0
        OR COALESCE(peb.credit_balance, 0) + COALESCE(SUM(ft.credit), 0) != 0
    ORDER BY coa.code;
  ELSE
    -- No snapshot available, fall back to full scan (original behavior)
    RETURN QUERY
    SELECT
      coa.id AS account_id,
      coa.code AS account_code,
      coa.name AS account_name,
      coa.account_type,
      COALESCE(SUM(ft.debit), 0) AS debit_balance,
      COALESCE(SUM(ft.credit), 0) AS credit_balance
    FROM chart_of_accounts coa
    LEFT JOIN financial_transactions ft ON ft.coa_id = coa.id
      AND ft.tenant_id = p_tenant_id
      AND ft.date <= p_end_date
      AND ft.deleted_at IS NULL
    WHERE coa.tenant_id = p_tenant_id
      AND coa.deleted_at IS NULL
      AND coa.is_active = true
    GROUP BY coa.id, coa.code, coa.name, coa.account_type
    HAVING COALESCE(SUM(ft.debit), 0) != 0 OR COALESCE(SUM(ft.credit), 0) != 0
    ORDER BY coa.code;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- Trigger: Auto-capture balances when fiscal period closes
-- =============================================================================
CREATE OR REPLACE FUNCTION on_fiscal_period_close()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'closed' AND (OLD.status IS NULL OR OLD.status != 'closed') THEN
    -- Capture period-end balances
    PERFORM capture_period_end_balances(
      (SELECT tenant_id FROM fiscal_years WHERE id = NEW.fiscal_year_id),
      NEW.id,
      NEW.closed_by
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS capture_balances_on_period_close ON fiscal_periods;
CREATE TRIGGER capture_balances_on_period_close
AFTER UPDATE ON fiscal_periods
FOR EACH ROW EXECUTE FUNCTION on_fiscal_period_close();

-- =============================================================================
-- Add composite indexes for transaction table performance
-- Note: In production, consider creating these with CONCURRENTLY outside migration
-- =============================================================================
CREATE INDEX IF NOT EXISTS idx_ft_tenant_date_account
  ON financial_transactions(tenant_id, date, coa_id)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_ft_tenant_date_fund
  ON financial_transactions(tenant_id, date, fund_id)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_iet_tenant_date_category
  ON income_expense_transactions(tenant_id, transaction_date, category_id)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_fth_tenant_date
  ON financial_transaction_headers(tenant_id, transaction_date)
  WHERE deleted_at IS NULL;

-- Grant permissions
GRANT EXECUTE ON FUNCTION capture_period_end_balances(uuid, uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION report_trial_balance_optimized(uuid, date) TO authenticated;

COMMENT ON TABLE period_end_balances IS 'Stores account balances at period close for fast report queries';
COMMENT ON TABLE fund_period_balances IS 'Stores fund balances at period close for fund accounting reports';
COMMENT ON TABLE source_period_balances IS 'Stores financial source (bank/cash) balances at period close';
COMMENT ON TABLE category_period_summaries IS 'Stores category totals at period close for income/expense reports';
COMMENT ON FUNCTION capture_period_end_balances IS 'Captures all balance snapshots when a fiscal period closes';
COMMENT ON FUNCTION report_trial_balance_optimized IS 'Trial balance using snapshot + delta for large datasets';
