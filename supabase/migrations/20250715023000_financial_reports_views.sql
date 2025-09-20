-- Tenant scoped financial report views
-- Creates helper functions to generate financial reports
-- Each function validates tenant access using check_tenant_access
-- and returns data filtered for that tenant only

-- Trial Balance
CREATE OR REPLACE FUNCTION report_trial_balance(
  p_tenant_id uuid,
  p_end_date date
)
RETURNS TABLE (
  account_id uuid,
  account_code text,
  account_name text,
  account_type text,
  debit_balance numeric,
  credit_balance numeric
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  IF NOT check_tenant_access(p_tenant_id) THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  RETURN QUERY
  SELECT
    a.id,
    a.code,
    a.name,
    a.account_type,
    COALESCE(SUM(ft.debit),0) AS debit_balance,
    COALESCE(SUM(ft.credit),0) AS credit_balance
  FROM chart_of_accounts a
  LEFT JOIN financial_transactions ft
    ON ft.account_id = a.id
    AND ft.tenant_id = a.tenant_id
    AND ft.date <= p_end_date
  WHERE a.tenant_id = p_tenant_id
  GROUP BY a.id, a.code, a.name, a.account_type
  ORDER BY a.code;
END;
$$;

GRANT EXECUTE ON FUNCTION report_trial_balance(uuid, date) TO authenticated;
COMMENT ON FUNCTION report_trial_balance(uuid, date) IS
  'Trial balance by account as of the given date for the tenant';

-- General Ledger
CREATE OR REPLACE FUNCTION report_general_ledger(
  p_tenant_id uuid,
  p_start_date date,
  p_end_date date,
  p_account_id uuid DEFAULT NULL
)
RETURNS TABLE (
  entry_date date,
  account_id uuid,
  description text,
  debit numeric,
  credit numeric,
  running_balance numeric
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  IF NOT check_tenant_access(p_tenant_id) THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  RETURN QUERY
  SELECT
    ft.date,
    ft.account_id,
    ft.description,
    ft.debit,
    ft.credit,
    SUM(ft.debit - ft.credit) OVER (ORDER BY ft.date, ft.id) AS running_balance
  FROM financial_transactions ft
  WHERE ft.tenant_id = p_tenant_id
    AND ft.date BETWEEN p_start_date AND p_end_date
    AND (p_account_id IS NULL OR ft.account_id = p_account_id)
  ORDER BY ft.date, ft.id;
END;
$$;

GRANT EXECUTE ON FUNCTION report_general_ledger(uuid, date, date, uuid) TO authenticated;
COMMENT ON FUNCTION report_general_ledger(uuid, date, date, uuid) IS
  'Detailed ledger entries for a tenant within a date range';

-- Journal Report
CREATE OR REPLACE FUNCTION report_journal(
  p_tenant_id uuid,
  p_start_date date,
  p_end_date date
)
RETURNS TABLE (
  entry_date date,
  account_code text,
  account_name text,
  description text,
  debit numeric,
  credit numeric
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  IF NOT check_tenant_access(p_tenant_id) THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  RETURN QUERY
  SELECT
    ft.date,
    coa.code,
    coa.name,
    ft.description,
    ft.debit,
    ft.credit
  FROM financial_transactions ft
  JOIN chart_of_accounts coa ON ft.account_id = coa.id
  WHERE ft.tenant_id = p_tenant_id
    AND ft.date BETWEEN p_start_date AND p_end_date
  ORDER BY ft.date, ft.id;
END;
$$;

GRANT EXECUTE ON FUNCTION report_journal(uuid, date, date) TO authenticated;
COMMENT ON FUNCTION report_journal(uuid, date, date) IS
  'Journal style listing of financial transactions for a tenant';

-- Income Statement
CREATE OR REPLACE FUNCTION report_income_statement(
  p_tenant_id uuid,
  p_start_date date,
  p_end_date date
)
RETURNS TABLE (
  account_id uuid,
  account_code text,
  account_name text,
  account_type text,
  amount numeric
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  IF NOT check_tenant_access(p_tenant_id) THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  RETURN QUERY
  SELECT
    a.id,
    a.code,
    a.name,
    a.account_type,
    SUM(CASE WHEN a.account_type = 'revenue'
             THEN ft.credit - ft.debit
             ELSE ft.debit - ft.credit END) AS amount
  FROM chart_of_accounts a
  LEFT JOIN financial_transactions ft ON ft.account_id = a.id
    AND ft.tenant_id = a.tenant_id
    AND ft.date BETWEEN p_start_date AND p_end_date
  WHERE a.tenant_id = p_tenant_id
    AND a.account_type IN ('revenue','expense')
  GROUP BY a.id, a.code, a.name, a.account_type
  ORDER BY a.code;
END;
$$;

GRANT EXECUTE ON FUNCTION report_income_statement(uuid, date, date) TO authenticated;
COMMENT ON FUNCTION report_income_statement(uuid, date, date) IS
  'Income statement totals for the tenant';

-- Budget vs Actual
CREATE OR REPLACE FUNCTION report_budget_vs_actual(
  p_tenant_id uuid,
  p_start_date date,
  p_end_date date
)
RETURNS TABLE (
  budget_id uuid,
  budget_name text,
  budget_amount numeric,
  actual_amount numeric,
  variance numeric
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  IF NOT check_tenant_access(p_tenant_id) THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  RETURN QUERY
  SELECT
    b.id,
    b.name,
    b.amount,
    COALESCE(SUM(
      CASE WHEN ft.type = 'expense' THEN ft.debit
           WHEN ft.type = 'income' THEN -ft.credit
           ELSE 0 END
    ),0) AS actual_amount,
    b.amount - COALESCE(SUM(
      CASE WHEN ft.type = 'expense' THEN ft.debit
           WHEN ft.type = 'income' THEN -ft.credit
           ELSE 0 END
    ),0) AS variance
  FROM budgets b
  LEFT JOIN financial_transactions ft ON ft.budget_id = b.id
    AND ft.date BETWEEN p_start_date AND p_end_date
  WHERE b.tenant_id = p_tenant_id
  GROUP BY b.id, b.name, b.amount
  ORDER BY b.name;
END;
$$;

GRANT EXECUTE ON FUNCTION report_budget_vs_actual(uuid, date, date) TO authenticated;
COMMENT ON FUNCTION report_budget_vs_actual(uuid, date, date) IS
  'Compares budgeted amounts to actual transactions for the tenant';

-- Fund Summary
CREATE OR REPLACE FUNCTION report_fund_summary(
  p_tenant_id uuid,
  p_start_date date,
  p_end_date date
)
RETURNS TABLE (
  fund_id uuid,
  fund_name text,
  income numeric,
  expenses numeric,
  net_change numeric
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  IF NOT check_tenant_access(p_tenant_id) THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  RETURN QUERY
  SELECT
    f.id,
    f.name,
    COALESCE(SUM(CASE WHEN ft.type = 'income' THEN ft.credit END),0) AS income,
    COALESCE(SUM(CASE WHEN ft.type = 'expense' THEN ft.debit END),0) AS expenses,
    COALESCE(SUM(CASE WHEN ft.type = 'income' THEN ft.credit ELSE -ft.debit END),0) AS net_change
  FROM funds f
  LEFT JOIN financial_transactions ft ON ft.fund_id = f.id
    AND ft.date BETWEEN p_start_date AND p_end_date
  WHERE f.tenant_id = p_tenant_id
  GROUP BY f.id, f.name
  ORDER BY f.name;
END;
$$;

GRANT EXECUTE ON FUNCTION report_fund_summary(uuid, date, date) TO authenticated;
COMMENT ON FUNCTION report_fund_summary(uuid, date, date) IS
  'Summary of income and expenses by fund for a tenant';

-- Member Giving Summary
CREATE OR REPLACE FUNCTION report_member_giving_summary(
  p_tenant_id uuid,
  p_start_date date,
  p_end_date date,
  p_member_id uuid DEFAULT NULL
)
RETURNS TABLE (
  member_id uuid,
  first_name text,
  last_name text,
  total_amount numeric
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  IF NOT check_tenant_access(p_tenant_id) THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  RETURN QUERY
  SELECT
    m.id,
    m.first_name,
    m.last_name,
    SUM(ft.credit) AS total_amount
  FROM members m
  LEFT JOIN accounts a
    ON a.member_id = m.id
    AND a.deleted_at IS NULL
  LEFT JOIN financial_transactions ft
    ON ft.accounts_account_id = a.id
    AND ft.date BETWEEN p_start_date AND p_end_date
    AND ft.type = 'income'
  WHERE m.tenant_id = p_tenant_id
    AND (p_member_id IS NULL OR m.id = p_member_id)
  GROUP BY m.id, m.first_name, m.last_name
  ORDER BY m.last_name, m.first_name;
END;
$$;

GRANT EXECUTE ON FUNCTION report_member_giving_summary(uuid, date, date, uuid) TO authenticated;
COMMENT ON FUNCTION report_member_giving_summary(uuid, date, date, uuid) IS
  'Aggregated member giving totals for a tenant';

-- Giving Statement
CREATE OR REPLACE FUNCTION report_giving_statement(
  p_tenant_id uuid,
  p_start_date date,
  p_end_date date,
  p_member_id uuid
)
RETURNS TABLE (
  entry_date date,
  fund_name text,
  amount numeric,
  description text
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  IF NOT check_tenant_access(p_tenant_id) THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  RETURN QUERY
  SELECT
    ft.date,
    f.name,
    ft.credit,
    ft.description
  FROM accounts a
  JOIN members m ON a.member_id = m.id
  JOIN financial_transactions ft ON ft.accounts_account_id = a.id
  LEFT JOIN funds f ON ft.fund_id = f.id
  WHERE m.tenant_id = p_tenant_id
    AND m.id = p_member_id
    AND ft.date BETWEEN p_start_date AND p_end_date
    AND ft.type = 'income'
  ORDER BY ft.date;
END;
$$;

GRANT EXECUTE ON FUNCTION report_giving_statement(uuid, date, date, uuid) TO authenticated;
COMMENT ON FUNCTION report_giving_statement(uuid, date, date, uuid) IS
  'Detailed giving history for a member within a date range';

-- Offering Summary
CREATE OR REPLACE FUNCTION report_offering_summary(
  p_tenant_id uuid,
  p_start_date date,
  p_end_date date
)
RETURNS TABLE (
  category_name text,
  total_amount numeric
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  IF NOT check_tenant_access(p_tenant_id) THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  RETURN QUERY
  SELECT
    c.name,
    SUM(ft.credit) AS total_amount
  FROM financial_transactions ft
  LEFT JOIN categories c ON ft.category_id = c.id
  WHERE ft.tenant_id = p_tenant_id
    AND ft.date BETWEEN p_start_date AND p_end_date
    AND ft.type = 'income'
  GROUP BY c.name
  ORDER BY c.name;
END;
$$;

GRANT EXECUTE ON FUNCTION report_offering_summary(uuid, date, date) TO authenticated;
COMMENT ON FUNCTION report_offering_summary(uuid, date, date) IS
  'Summarizes offerings by category for a tenant';

-- Category Financial Report
CREATE OR REPLACE FUNCTION report_category_financial(
  p_tenant_id uuid,
  p_start_date date,
  p_end_date date,
  p_category_id uuid DEFAULT NULL
)
RETURNS TABLE (
  category_name text,
  income numeric,
  expenses numeric
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  IF NOT check_tenant_access(p_tenant_id) THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  RETURN QUERY
  SELECT
    c.name,
    COALESCE(SUM(CASE WHEN ft.type = 'income' THEN ft.credit END),0) AS income,
    COALESCE(SUM(CASE WHEN ft.type = 'expense' THEN ft.debit END),0) AS expenses
  FROM categories c
  LEFT JOIN financial_transactions ft ON ft.category_id = c.id
    AND ft.date BETWEEN p_start_date AND p_end_date
  WHERE c.tenant_id = p_tenant_id
    AND (p_category_id IS NULL OR c.id = p_category_id)
  GROUP BY c.name
  ORDER BY c.name;
END;
$$;

GRANT EXECUTE ON FUNCTION report_category_financial(uuid, date, date, uuid) TO authenticated;
COMMENT ON FUNCTION report_category_financial(uuid, date, date, uuid) IS
  'Aggregated income and expenses by category for a tenant';

-- Cash Flow Summary
CREATE OR REPLACE FUNCTION report_cash_flow_summary(
  p_tenant_id uuid,
  p_start_date date,
  p_end_date date
)
RETURNS TABLE (
  month text,
  inflow numeric,
  outflow numeric,
  net_change numeric
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  IF NOT check_tenant_access(p_tenant_id) THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  RETURN QUERY
  SELECT
    to_char(date_trunc('month', ft.date), 'YYYY-MM') AS month,
    SUM(CASE WHEN ft.type = 'income' THEN ft.credit ELSE 0 END) AS inflow,
    SUM(CASE WHEN ft.type = 'expense' THEN ft.debit ELSE 0 END) AS outflow,
    SUM(CASE WHEN ft.type = 'income' THEN ft.credit ELSE -ft.debit END) AS net_change
  FROM financial_transactions ft
  WHERE ft.tenant_id = p_tenant_id
    AND ft.date BETWEEN p_start_date AND p_end_date
  GROUP BY date_trunc('month', ft.date)
  ORDER BY month;
END;
$$;

GRANT EXECUTE ON FUNCTION report_cash_flow_summary(uuid, date, date) TO authenticated;
COMMENT ON FUNCTION report_cash_flow_summary(uuid, date, date) IS
  'Monthly cash inflow and outflow totals for a tenant';
