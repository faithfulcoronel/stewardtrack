-- Accounting report and hierarchy functions

-- Drop existing functions if they exist
DROP FUNCTION IF EXISTS generate_trial_balance(date);
DROP FUNCTION IF EXISTS generate_income_statement(date, date);
DROP FUNCTION IF EXISTS generate_balance_sheet(date);
DROP FUNCTION IF EXISTS get_account_balance(uuid, date);
DROP FUNCTION IF EXISTS get_chart_of_accounts_hierarchy();

-- Function: generate_trial_balance
CREATE OR REPLACE FUNCTION generate_trial_balance(p_end_date date)
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
STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT
    a.id,
    a.code,
    a.name,
    a.account_type,
    COALESCE(SUM(ft.debit), 0) AS debit_balance,
    COALESCE(SUM(ft.credit), 0) AS credit_balance
  FROM chart_of_accounts a
  LEFT JOIN financial_transactions ft
    ON ft.account_id = a.id
    AND ft.tenant_id = a.tenant_id
    AND ft.date <= p_end_date
  WHERE a.tenant_id = get_user_tenant_id()
  GROUP BY a.id, a.code, a.name, a.account_type;
END;
$$;

-- Function: generate_income_statement
CREATE OR REPLACE FUNCTION generate_income_statement(p_start_date date, p_end_date date)
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
STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT
    a.id,
    a.code,
    a.name,
    a.account_type,
    SUM(
      CASE
        WHEN a.account_type = 'revenue' THEN COALESCE(ft.credit,0) - COALESCE(ft.debit,0)
        WHEN a.account_type = 'expense' THEN COALESCE(ft.debit,0) - COALESCE(ft.credit,0)
        ELSE 0
      END
    ) AS amount
  FROM chart_of_accounts a
  LEFT JOIN financial_transactions ft
    ON ft.account_id = a.id
    AND ft.tenant_id = a.tenant_id
    AND ft.date BETWEEN p_start_date AND p_end_date
  WHERE a.tenant_id = get_user_tenant_id()
    AND a.account_type IN ('revenue','expense')
  GROUP BY a.id, a.code, a.name, a.account_type;
END;
$$;

-- Function: generate_balance_sheet
CREATE OR REPLACE FUNCTION generate_balance_sheet(p_end_date date)
RETURNS TABLE (
  account_id uuid,
  account_code text,
  account_name text,
  account_type text,
  balance numeric
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT
    a.id,
    a.code,
    a.name,
    a.account_type,
    SUM(
      CASE
        WHEN a.account_type = 'asset' THEN COALESCE(ft.debit,0) - COALESCE(ft.credit,0)
        WHEN a.account_type IN ('liability','equity') THEN COALESCE(ft.credit,0) - COALESCE(ft.debit,0)
        ELSE 0
      END
    ) AS balance
  FROM chart_of_accounts a
  LEFT JOIN financial_transactions ft
    ON ft.account_id = a.id
    AND ft.tenant_id = a.tenant_id
    AND ft.date <= p_end_date
  WHERE a.tenant_id = get_user_tenant_id()
    AND a.account_type IN ('asset','liability','equity')
  GROUP BY a.id, a.code, a.name, a.account_type;
END;
$$;

-- Function: get_account_balance
CREATE OR REPLACE FUNCTION get_account_balance(p_account_id uuid, p_end_date date)
RETURNS numeric
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_balance numeric;
BEGIN
  SELECT COALESCE(SUM(
      CASE
        WHEN a.account_type = 'asset' THEN COALESCE(ft.debit,0) - COALESCE(ft.credit,0)
        WHEN a.account_type IN ('liability','equity') THEN COALESCE(ft.credit,0) - COALESCE(ft.debit,0)
        ELSE COALESCE(ft.debit,0) - COALESCE(ft.credit,0)
      END
    ), 0)
  INTO v_balance
  FROM financial_transactions ft
  JOIN chart_of_accounts a ON ft.account_id = a.id
  WHERE a.id = p_account_id
    AND a.tenant_id = get_user_tenant_id()
    AND ft.date <= p_end_date;

  RETURN v_balance;
END;
$$;

-- Function: get_chart_of_accounts_hierarchy
CREATE OR REPLACE FUNCTION get_chart_of_accounts_hierarchy()
RETURNS jsonb
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  result jsonb;
BEGIN
  WITH RECURSIVE accounts AS (
    SELECT
      id,
      parent_id,
      code,
      name,
      account_type,
      tenant_id,
      jsonb_build_object(
        'id', id,
        'code', code,
        'name', name,
        'account_type', account_type
      ) AS data
    FROM chart_of_accounts
    WHERE tenant_id = get_user_tenant_id()
  ),
  tree AS (
    SELECT a.id, a.parent_id, a.data
    FROM accounts a
    WHERE NOT EXISTS (SELECT 1 FROM accounts b WHERE b.parent_id = a.id)
    UNION ALL
    SELECT p.id,
           p.parent_id,
           jsonb_set(
             p.data,
             '{children}',
             COALESCE(jsonb_agg(c.data) FILTER (WHERE c.id IS NOT NULL), '[]'::jsonb)
           )
    FROM accounts p
    JOIN tree c ON c.parent_id = p.id
    GROUP BY p.id, p.parent_id, p.data
  )
  SELECT jsonb_agg(data) INTO result
  FROM tree
  WHERE parent_id IS NULL;

  RETURN COALESCE(result, '[]'::jsonb);
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION generate_trial_balance(date) TO authenticated;
GRANT EXECUTE ON FUNCTION generate_income_statement(date, date) TO authenticated;
GRANT EXECUTE ON FUNCTION generate_balance_sheet(date) TO authenticated;
GRANT EXECUTE ON FUNCTION get_account_balance(uuid, date) TO authenticated;
GRANT EXECUTE ON FUNCTION get_chart_of_accounts_hierarchy() TO authenticated;

-- Add helpful comments
COMMENT ON FUNCTION generate_trial_balance(date) IS
  'Summarizes debit and credit balances by account up to the specified end date.';
COMMENT ON FUNCTION generate_income_statement(date, date) IS
  'Generates revenue and expense totals between the given dates.';
COMMENT ON FUNCTION generate_balance_sheet(date) IS
  'Returns asset, liability, and equity balances as of the specified date.';
COMMENT ON FUNCTION get_account_balance(uuid, date) IS
  'Calculates the running balance for a single account up to a given date.';
COMMENT ON FUNCTION get_chart_of_accounts_hierarchy() IS
  'Returns a hierarchical JSON structure of the chart of accounts for the current tenant.';
