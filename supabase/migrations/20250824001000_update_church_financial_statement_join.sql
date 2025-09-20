-- Update member join in church financial statement
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
        WHEN type = 'income' THEN credit
        WHEN type = 'expense' THEN -debit
        ELSE COALESCE(credit,0) - COALESCE(debit,0)
      END
    ),0) AS balance
    FROM financial_transactions
    WHERE tenant_id = p_tenant_id
      AND date < p_start_date
      AND deleted_at IS NULL
  ),
  period AS (
    SELECT
      COALESCE(SUM(CASE WHEN type = 'income' THEN credit END),0) AS income,
      COALESCE(SUM(CASE WHEN type = 'expense' THEN debit END),0) AS expenses
    FROM financial_transactions
    WHERE tenant_id = p_tenant_id
      AND date BETWEEN p_start_date AND p_end_date
      AND deleted_at IS NULL
  ),
  fund_data AS (
    SELECT
      f.name AS fund_name,
      COALESCE(SUM(CASE WHEN ft.date < p_start_date THEN
        CASE WHEN ft.type = 'income' THEN ft.credit ELSE -ft.debit END
      END),0) AS opening_balance,
      COALESCE(SUM(CASE WHEN ft.date BETWEEN p_start_date AND p_end_date AND ft.type = 'income' THEN ft.credit END),0) AS income,
      COALESCE(SUM(CASE WHEN ft.date BETWEEN p_start_date AND p_end_date AND ft.type = 'expense' THEN ft.debit END),0) AS expenses
    FROM funds f
    LEFT JOIN financial_transactions ft ON ft.fund_id = f.id AND ft.tenant_id = f.tenant_id
      AND ft.deleted_at IS NULL
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
      AND ft.type = 'income'
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
      AND ft.type = 'expense'
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
    WHERE ft.tenant_id = p_tenant_id
      AND ft.type = 'income'
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
