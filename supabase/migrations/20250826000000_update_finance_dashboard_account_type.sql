-- Update finance dashboard views/functions to classify income and expenses
-- based on chart_of_accounts.account_type instead of financial_transactions.type

-- Finance Monthly Stats
DROP FUNCTION IF EXISTS finance_monthly_stats(uuid, date, date);
CREATE OR REPLACE FUNCTION finance_monthly_stats(
  p_tenant_id uuid,
  p_start_date date,
  p_end_date date
)
RETURNS TABLE (
  monthly_income numeric,
  monthly_expenses numeric,
  active_budgets integer,
  income_by_category jsonb,
  expenses_by_category jsonb
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
  WITH tx AS (
    SELECT
      h.tenant_id,
      coa.account_type,
      COALESCE(c.name, 'Uncategorized') AS category_name,
      SUM(
        CASE
          WHEN coa.account_type = 'revenue' THEN ft.credit
          WHEN coa.account_type = 'expense' THEN ft.debit
          ELSE 0
        END
      ) AS total
    FROM financial_transactions ft
    JOIN financial_transaction_headers h ON h.id = ft.header_id
    LEFT JOIN categories c ON c.id = ft.category_id
    LEFT JOIN chart_of_accounts coa ON ft.account_id = coa.id
    WHERE h.transaction_date BETWEEN p_start_date AND p_end_date
      AND ft.deleted_at IS NULL
    GROUP BY h.tenant_id, coa.account_type, c.name
  )
  SELECT
    SUM(CASE WHEN account_type = 'revenue' THEN total ELSE 0 END) AS monthly_income,
    SUM(CASE WHEN account_type = 'expense' THEN total ELSE 0 END) AS monthly_expenses,
    COALESCE(
      (SELECT COUNT(*)::integer FROM budgets b
         WHERE b.tenant_id = tx.tenant_id
           AND p_end_date BETWEEN b.start_date AND b.end_date),
      0
    ) AS active_budgets,
    jsonb_object_agg(category_name, total) FILTER (WHERE account_type = 'revenue') AS income_by_category,
    jsonb_object_agg(category_name, total) FILTER (WHERE account_type = 'expense') AS expenses_by_category
  FROM tx
  WHERE tenant_id = p_tenant_id
  GROUP BY tenant_id;
END;
$$;

GRANT EXECUTE ON FUNCTION finance_monthly_stats(uuid, date, date) TO authenticated;
COMMENT ON FUNCTION finance_monthly_stats(uuid, date, date) IS
  'Aggregated financial statistics using account_type for income and expenses';

-- Fund Balances View
DROP VIEW IF EXISTS fund_balances_view CASCADE;
CREATE VIEW fund_balances_view AS
SELECT
  f.tenant_id,
  f.id,
  f.name,
  COALESCE(
    SUM(
      CASE
        WHEN coa.account_type = 'revenue' THEN t.credit
        WHEN coa.account_type = 'expense' THEN -t.debit
        ELSE COALESCE(t.credit,0) - COALESCE(t.debit,0)
      END
    ),
    0
  ) AS balance
FROM funds f
LEFT JOIN financial_transactions t ON t.fund_id = f.id AND t.deleted_at IS NULL
LEFT JOIN chart_of_accounts coa ON t.account_id = coa.id
GROUP BY f.tenant_id, f.id, f.name;

COMMENT ON VIEW fund_balances_view IS 'Current running balance for each fund using account_type';
