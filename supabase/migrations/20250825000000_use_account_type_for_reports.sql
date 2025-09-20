-- Adjust financial report functions to classify income/expenses based on
-- account_type instead of the deprecated financial_transactions.type column

-- Budget vs Actual
DROP FUNCTION IF EXISTS report_budget_vs_actual(uuid, date, date);
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
      CASE WHEN coa.account_type = 'expense' THEN ft.debit
           WHEN coa.account_type = 'revenue' THEN -ft.credit
           ELSE 0 END
    ),0) AS actual_amount,
    b.amount - COALESCE(SUM(
      CASE WHEN coa.account_type = 'expense' THEN ft.debit
           WHEN coa.account_type = 'revenue' THEN -ft.credit
           ELSE 0 END
    ),0) AS variance
  FROM budgets b
  LEFT JOIN financial_transactions ft ON ft.budget_id = b.id
    AND ft.date BETWEEN p_start_date AND p_end_date
    AND ft.deleted_at IS NULL
  LEFT JOIN chart_of_accounts coa ON ft.account_id = coa.id
  WHERE b.tenant_id = p_tenant_id
  GROUP BY b.id, b.name, b.amount
  ORDER BY b.name;
END;
$$;

GRANT EXECUTE ON FUNCTION report_budget_vs_actual(uuid, date, date) TO authenticated;
COMMENT ON FUNCTION report_budget_vs_actual(uuid, date, date) IS
  'Compares budgeted amounts to actual transactions for the tenant';

-- Fund Summary
DROP FUNCTION IF EXISTS report_fund_summary(uuid, date, date);
CREATE OR REPLACE FUNCTION report_fund_summary(
  p_tenant_id uuid,
  p_start_date date,
  p_end_date date
)
RETURNS TABLE (
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
    f.name,
    COALESCE(SUM(CASE WHEN coa.account_type = 'revenue' THEN ft.credit END),0) AS income,
    COALESCE(SUM(CASE WHEN coa.account_type = 'expense' THEN ft.debit END),0) AS expenses,
    COALESCE(SUM(CASE WHEN coa.account_type = 'revenue' THEN ft.credit ELSE -ft.debit END),0) AS net_change
  FROM funds f
  LEFT JOIN financial_transactions ft ON ft.fund_id = f.id
    AND ft.date BETWEEN p_start_date AND p_end_date
    AND ft.deleted_at IS NULL
  LEFT JOIN chart_of_accounts coa ON ft.account_id = coa.id
  WHERE f.tenant_id = p_tenant_id
  GROUP BY f.name
  ORDER BY f.name;
END;
$$;

GRANT EXECUTE ON FUNCTION report_fund_summary(uuid, date, date) TO authenticated;
COMMENT ON FUNCTION report_fund_summary(uuid, date, date) IS
  'Summary of income and expenses by fund for a tenant';

-- Member Giving Summary
DROP FUNCTION IF EXISTS report_member_giving_summary(uuid, date, date, uuid);
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
    AND ft.deleted_at IS NULL
  LEFT JOIN chart_of_accounts coa ON ft.account_id = coa.id
  WHERE m.tenant_id = p_tenant_id
    AND (p_member_id IS NULL OR m.id = p_member_id)
    AND coa.account_type = 'revenue'
  GROUP BY m.id, m.first_name, m.last_name
  ORDER BY m.last_name, m.first_name;
END;
$$;

GRANT EXECUTE ON FUNCTION report_member_giving_summary(uuid, date, date, uuid) TO authenticated;
COMMENT ON FUNCTION report_member_giving_summary(uuid, date, date, uuid) IS
  'Aggregated member giving totals for a tenant';

-- Offering Summary
DROP FUNCTION IF EXISTS report_offering_summary(uuid, date, date);
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
  LEFT JOIN chart_of_accounts coa ON ft.account_id = coa.id
  WHERE ft.tenant_id = p_tenant_id
    AND ft.date BETWEEN p_start_date AND p_end_date
    AND ft.deleted_at IS NULL
    AND coa.account_type = 'revenue'
  GROUP BY c.name
  ORDER BY c.name;
END;
$$;

GRANT EXECUTE ON FUNCTION report_offering_summary(uuid, date, date) TO authenticated;
COMMENT ON FUNCTION report_offering_summary(uuid, date, date) IS
  'Summarizes offerings by category for a tenant';

-- Category Financial Report
DROP FUNCTION IF EXISTS report_category_financial(uuid, date, date, uuid);
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
    COALESCE(SUM(CASE WHEN coa.account_type = 'revenue' THEN ft.credit END),0) AS income,
    COALESCE(SUM(CASE WHEN coa.account_type = 'expense' THEN ft.debit END),0) AS expenses
  FROM categories c
  LEFT JOIN financial_transactions ft ON ft.category_id = c.id
    AND ft.date BETWEEN p_start_date AND p_end_date
    AND ft.deleted_at IS NULL
  LEFT JOIN chart_of_accounts coa ON ft.account_id = coa.id
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
DROP FUNCTION IF EXISTS report_cash_flow_summary(uuid, date, date);
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
    SUM(CASE WHEN coa.account_type = 'revenue' THEN ft.credit ELSE 0 END) AS inflow,
    SUM(CASE WHEN coa.account_type = 'expense' THEN ft.debit ELSE 0 END) AS outflow,
    SUM(CASE WHEN coa.account_type = 'revenue' THEN ft.credit ELSE -ft.debit END) AS net_change
  FROM financial_transactions ft
  LEFT JOIN chart_of_accounts coa ON ft.account_id = coa.id
  WHERE ft.tenant_id = p_tenant_id
    AND ft.date BETWEEN p_start_date AND p_end_date
    AND ft.deleted_at IS NULL
  GROUP BY date_trunc('month', ft.date)
  ORDER BY month;
END;
$$;

GRANT EXECUTE ON FUNCTION report_cash_flow_summary(uuid, date, date) TO authenticated;
COMMENT ON FUNCTION report_cash_flow_summary(uuid, date, date) IS
  'Monthly cash inflow and outflow totals for a tenant';

-- Church Financial Statement
DROP FUNCTION IF EXISTS report_church_financial_statement(uuid, date, date);
CREATE OR REPLACE FUNCTION report_church_financial_statement(
  p_tenant_id uuid,
  p_start_date date,
  p_end_date date
)
RETURNS jsonb
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  result jsonb;
BEGIN
  IF NOT check_tenant_access(p_tenant_id) THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  WITH opening AS (
    SELECT COALESCE(SUM(
      CASE
        WHEN coa.account_type = 'revenue' THEN credit
        WHEN coa.account_type = 'expense' THEN -debit
        ELSE COALESCE(credit,0) - COALESCE(debit,0)
      END
    ),0) AS balance
    FROM financial_transactions ft
    LEFT JOIN chart_of_accounts coa ON ft.account_id = coa.id
    WHERE ft.tenant_id = p_tenant_id
      AND ft.date < p_start_date
      AND ft.deleted_at IS NULL
  ),
  period AS (
    SELECT
      COALESCE(SUM(CASE WHEN coa.account_type = 'revenue' THEN credit END),0) AS income,
      COALESCE(SUM(CASE WHEN coa.account_type = 'expense' THEN debit END),0) AS expenses
    FROM financial_transactions ft
    LEFT JOIN chart_of_accounts coa ON ft.account_id = coa.id
    WHERE ft.tenant_id = p_tenant_id
      AND ft.date BETWEEN p_start_date AND p_end_date
      AND ft.deleted_at IS NULL
  ),
  fund_data AS (
    SELECT
      f.name AS fund_name,
      COALESCE(SUM(CASE WHEN ft.date < p_start_date THEN
        CASE WHEN coa.account_type = 'revenue' THEN ft.credit ELSE -ft.debit END
      END),0) AS opening_balance,
      COALESCE(SUM(CASE WHEN ft.date BETWEEN p_start_date AND p_end_date AND coa.account_type = 'revenue' THEN ft.credit END),0) AS income,
      COALESCE(SUM(CASE WHEN ft.date BETWEEN p_start_date AND p_end_date AND coa.account_type = 'expense' THEN ft.debit END),0) AS expenses
    FROM funds f
    LEFT JOIN financial_transactions ft ON ft.fund_id = f.id AND ft.tenant_id = f.tenant_id
      AND ft.deleted_at IS NULL
    LEFT JOIN chart_of_accounts coa ON ft.account_id = coa.id
    WHERE f.tenant_id = p_tenant_id
    GROUP BY f.name
  ),
  income_cat AS (
    SELECT
      a.name AS account_name,
      COALESCE(c.name, 'Uncategorized') AS category_name,
      SUM(ft.credit) AS amount
    FROM financial_transactions ft
    JOIN chart_of_accounts a ON ft.account_id = a.id
    LEFT JOIN categories c ON ft.category_id = c.id
    WHERE ft.tenant_id = p_tenant_id
      AND a.account_type = 'revenue'
      AND ft.date BETWEEN p_start_date AND p_end_date
      AND ft.deleted_at IS NULL
    GROUP BY a.name, COALESCE(c.name, 'Uncategorized')
  ),
  income_tot AS (
    SELECT
      account_name,
      SUM(amount) AS subtotal,
      jsonb_agg(jsonb_build_object('category_name', category_name, 'amount', amount) ORDER BY category_name) AS categories
    FROM income_cat
    GROUP BY account_name
  ),
  expense_cat AS (
    SELECT
      a.name AS account_name,
      COALESCE(c.name, 'Uncategorized') AS category_name,
      SUM(ft.debit) AS amount
    FROM financial_transactions ft
    JOIN chart_of_accounts a ON ft.account_id = a.id
    LEFT JOIN categories c ON ft.category_id = c.id
    WHERE ft.tenant_id = p_tenant_id
      AND a.account_type = 'expense'
      AND ft.date BETWEEN p_start_date AND p_end_date
      AND ft.deleted_at IS NULL
    GROUP BY a.name, COALESCE(c.name, 'Uncategorized')
  ),
  expense_tot AS (
    SELECT
      account_name,
      SUM(amount) AS subtotal,
      jsonb_agg(jsonb_build_object('category_name', category_name, 'amount', amount) ORDER BY category_name) AS categories
    FROM expense_cat
    GROUP BY account_name
  ),
  member_cat AS (
    SELECT
      m.first_name || ' ' || m.last_name AS member_name,
      COALESCE(c.name, 'Uncategorized') AS category_name,
      SUM(ft.credit) AS amount
    FROM financial_transactions ft
    JOIN accounts acc ON acc.id = ft.accounts_account_id
    JOIN members m ON m.id = acc.member_id
    LEFT JOIN categories c ON ft.category_id = c.id
    LEFT JOIN chart_of_accounts a ON ft.account_id = a.id
    WHERE ft.tenant_id = p_tenant_id
      AND a.account_type = 'revenue'
      AND ft.date BETWEEN p_start_date AND p_end_date
      AND ft.deleted_at IS NULL
    GROUP BY member_name, COALESCE(c.name, 'Uncategorized')
  ),
  member_tot AS (
    SELECT
      member_name,
      SUM(amount) AS total,
      jsonb_agg(jsonb_build_object('category_name', category_name, 'amount', amount) ORDER BY category_name) AS categories
    FROM member_cat
    GROUP BY member_name
  )
  SELECT jsonb_build_object(
    'summary', jsonb_build_object(
      'opening_balance', (SELECT balance FROM opening),
      'total_income', (SELECT income FROM period),
      'total_expenses', (SELECT expenses FROM period),
      'net_result', (SELECT income - expenses FROM period),
      'ending_balance', (SELECT (SELECT balance FROM opening) + income - expenses FROM period)
    ),
    'funds', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'fund_name', fund_name,
        'opening_balance', opening_balance,
        'income', income,
        'expenses', expenses,
        'ending_balance', opening_balance + income - expenses
      ) ORDER BY fund_name), '[]'::jsonb)
      FROM fund_data
    ),
    'income', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'account_name', account_name,
        'categories', categories,
        'subtotal', subtotal
      ) ORDER BY account_name), '[]'::jsonb)
      FROM income_tot
    ),
    'expenses', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'account_name', account_name,
        'categories', categories,
        'subtotal', subtotal
      ) ORDER BY account_name), '[]'::jsonb)
      FROM expense_tot
    ),
    'memberGiving', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'member_name', member_name,
        'categories', categories,
        'total', total
      ) ORDER BY member_name), '[]'::jsonb)
      FROM member_tot
    ),
    'remarks', NULL
  ) INTO result;

  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION report_church_financial_statement(uuid, date, date) TO authenticated;
COMMENT ON FUNCTION report_church_financial_statement(uuid, date, date) IS
  'Generates a church-wide financial statement summarizing income and expenses.';

-- Member Statement with filtering
DROP FUNCTION IF EXISTS get_member_statement(date, date, uuid[], integer, integer);
CREATE OR REPLACE FUNCTION get_member_statement(
  p_start_date date,
  p_end_date date,
  p_member_ids uuid[] DEFAULT NULL,
  p_limit integer DEFAULT NULL,
  p_offset integer DEFAULT NULL
)
RETURNS TABLE (
  entry_date date,
  member_id uuid,
  first_name text,
  last_name text,
  category_name text,
  fund_name text,
  source_name text,
  amount numeric
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  RETURN QUERY
    SELECT
      ft.date,
      m.id,
      m.first_name,
      m.last_name,
      c.name AS category_name,
      f.name AS fund_name,
      fs.name AS source_name,
      ft.credit
    FROM members m
    JOIN accounts a ON a.member_id = m.id AND a.deleted_at IS NULL
    JOIN financial_transactions ft ON ft.accounts_account_id = a.id
      AND ft.deleted_at IS NULL
    LEFT JOIN categories c ON ft.category_id = c.id
    LEFT JOIN funds f ON ft.fund_id = f.id
    LEFT JOIN financial_sources fs ON ft.source_id = fs.id
    LEFT JOIN membership_status ms ON m.membership_status_id = ms.id
    LEFT JOIN membership_type mt ON m.membership_type_id = mt.id
    LEFT JOIN chart_of_accounts coa ON ft.account_id = coa.id
    WHERE m.tenant_id = get_user_tenant_id()
      AND ft.tenant_id = m.tenant_id
      AND ft.date BETWEEN p_start_date AND p_end_date
      AND LOWER(mt.name) = 'member'
      AND LOWER(ms.name) = 'active'
      AND coa.account_type = 'revenue'
      AND (p_member_ids IS NULL OR m.id = ANY(p_member_ids))
    ORDER BY ft.date, m.last_name, m.first_name
    LIMIT p_limit OFFSET COALESCE(p_offset, 0);
END;
$$;

GRANT EXECUTE ON FUNCTION get_member_statement(date, date, uuid[], integer, integer) TO authenticated;
COMMENT ON FUNCTION get_member_statement(date, date, uuid[], integer, integer) IS
  'Detailed giving transactions for active or donor members within a date range with optional pagination and member filtering.';
