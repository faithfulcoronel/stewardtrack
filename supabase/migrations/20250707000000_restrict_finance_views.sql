-- Restrict finance views to the current tenant

-- Monthly income and expense trends
DROP VIEW IF EXISTS finance_monthly_trends CASCADE;
CREATE VIEW finance_monthly_trends AS
WITH monthly AS (
  SELECT
    tenant_id,
    date_trunc('month', date)::date AS month,
    SUM(CASE WHEN type = 'income' THEN credit ELSE 0 END) AS income,
    SUM(CASE WHEN type = 'expense' THEN debit ELSE 0 END) AS expenses
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
WHERE tenant_id = (
  SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()
)
ORDER BY month;

COMMENT ON VIEW finance_monthly_trends IS 'Monthly income and expense totals with percentage change from the previous month for each tenant';

-- Aggregated monthly stats
DROP VIEW IF EXISTS finance_monthly_stats CASCADE;
CREATE VIEW finance_monthly_stats AS
WITH tx AS (
  SELECT
    ft.tenant_id,
    ft.type AS type,
    COALESCE(c.name, 'Uncategorized') AS category_name,
    SUM(
      CASE
        WHEN ft.type = 'income' THEN ft.credit
        WHEN ft.type = 'expense' THEN ft.debit
        ELSE 0
      END
    ) AS total
  FROM financial_transactions ft
  LEFT JOIN categories c ON c.id = ft.category_id
  WHERE date_trunc('month', ft.date) = date_trunc('month', CURRENT_DATE)
  GROUP BY ft.tenant_id, ft.type, c.name
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
WHERE tenant_id = (
  SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()
)
GROUP BY tenant_id;

COMMENT ON VIEW finance_monthly_stats IS 'Aggregated financial statistics for the current month per tenant';

-- Fund balances view
DROP VIEW IF EXISTS fund_balances_view CASCADE;
CREATE VIEW fund_balances_view AS
SELECT
  f.tenant_id,
  f.id,
  f.name,
  COALESCE(
    SUM(
      CASE
        WHEN t.type = 'income' THEN t.credit
        WHEN t.type = 'expense' THEN -t.debit
        ELSE COALESCE(t.credit,0) - COALESCE(t.debit,0)
      END
    ),
    0
  ) AS balance
FROM funds f
LEFT JOIN financial_transactions t ON t.fund_id = f.id
WHERE f.tenant_id = (
  SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()
)
GROUP BY f.tenant_id, f.id, f.name;

COMMENT ON VIEW fund_balances_view IS 'Current running balance for each fund';