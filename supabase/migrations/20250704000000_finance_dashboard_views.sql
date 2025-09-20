-- Views and RLS for finance dashboard metrics

-- Monthly income and expense totals with percentage change compared to previous month
DROP VIEW IF EXISTS finance_monthly_trends CASCADE;
CREATE VIEW finance_monthly_trends AS
WITH monthly AS (
  SELECT
    tenant_id,
    date_trunc('month', date)::date AS month,
    SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) AS income,
    SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) AS expenses
  FROM financial_transactions
  GROUP BY tenant_id, date_trunc('month', date)
)
SELECT
  tenant_id,
  to_char(month, 'YYYY-MM') AS month,
  income,
  expenses,
  ROUND(
    CASE
      WHEN LAG(income) OVER (PARTITION BY tenant_id ORDER BY month) IS NULL OR LAG(income) OVER (PARTITION BY tenant_id ORDER BY month) = 0 THEN NULL
      ELSE ((income - LAG(income) OVER (PARTITION BY tenant_id ORDER BY month)) / LAG(income) OVER (PARTITION BY tenant_id ORDER BY month) * 100)
    END,
    2
  ) AS percentage_change
FROM monthly
ORDER BY month;

COMMENT ON VIEW finance_monthly_trends IS 'Monthly income and expense totals with percentage change from the previous month for each tenant';

-- Current month stats: income, expenses, active budgets and category totals
DROP VIEW IF EXISTS finance_monthly_stats CASCADE;
CREATE VIEW finance_monthly_stats AS
WITH tx AS (
  SELECT
    ft.tenant_id,
    ft.transaction_type AS type,
    coalesce(c.name, 'Uncategorized') AS category_name,
    SUM(ft.amount) AS total
  FROM income_expense_transactions ft
  LEFT JOIN categories c ON c.id = ft.category_id
  WHERE date_trunc('month', ft.transaction_date) = date_trunc('month', CURRENT_DATE)
    AND ft.deleted_at IS NULL
  GROUP BY ft.tenant_id, ft.transaction_type, c.name
)
SELECT
  tenant_id,
  SUM(CASE WHEN type = 'income' THEN total ELSE 0 END) AS monthly_income,
  SUM(CASE WHEN type = 'expense' THEN total ELSE 0 END) AS monthly_expenses,
  COALESCE(
    (SELECT COUNT(*) FROM budgets b
      WHERE b.tenant_id = tx.tenant_id
        AND CURRENT_DATE BETWEEN b.start_date AND b.end_date),
    0
  ) AS active_budgets,
  jsonb_object_agg(category_name, total) FILTER (WHERE type = 'income') AS income_by_category,
  jsonb_object_agg(category_name, total) FILTER (WHERE type = 'expense') AS expenses_by_category
FROM tx
GROUP BY tenant_id;

COMMENT ON VIEW finance_monthly_stats IS 'Aggregated financial statistics for the current month per tenant';

-- Fund balances
DROP VIEW IF EXISTS fund_balances_view CASCADE;
CREATE VIEW fund_balances_view AS
SELECT
  f.tenant_id,
  f.id,
  f.name,
  COALESCE(
    SUM(CASE WHEN t.transaction_type = 'income' THEN t.amount ELSE -t.amount END),
    0
  ) AS balance
FROM funds f
LEFT JOIN income_expense_transactions t ON t.fund_id = f.id AND t.deleted_at IS NULL
GROUP BY f.tenant_id, f.id, f.name;

COMMENT ON VIEW fund_balances_view IS 'Current running balance for each fund';