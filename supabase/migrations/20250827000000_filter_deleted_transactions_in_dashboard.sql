-- Update finance_monthly_trends view to exclude soft-deleted transactions
DROP VIEW IF EXISTS finance_monthly_trends CASCADE;
CREATE VIEW finance_monthly_trends AS
WITH categorized AS (
  SELECT
    ft.tenant_id,
    date_trunc('month', ft.date)::date AS month,
    coa.account_type,
    SUM(ft.debit) AS total_debit,
    SUM(ft.credit) AS total_credit
  FROM financial_transactions ft
  JOIN chart_of_accounts coa ON ft.account_id = coa.id
  WHERE ft.deleted_at IS NULL
  GROUP BY ft.tenant_id, date_trunc('month', ft.date), coa.account_type
),
monthly_summary AS (
  SELECT
    tenant_id,
    month,
    SUM(CASE WHEN account_type = 'revenue' THEN total_credit ELSE 0 END) AS income,
    SUM(CASE WHEN account_type = 'expense' THEN total_debit ELSE 0 END) AS expenses
  FROM categorized
  GROUP BY tenant_id, month
),
with_lag AS (
  SELECT
    *,
    LAG(income) OVER (PARTITION BY tenant_id ORDER BY month) AS previous_income
  FROM monthly_summary
)
SELECT
  tenant_id,
  to_char(month, 'YYYY-MM') AS month,
  income,
  expenses,
  ROUND(
    CASE
      WHEN previous_income IS NULL OR previous_income = 0 THEN NULL
      ELSE (income - previous_income) / previous_income * 100
    END,
    2
  ) AS percentage_change
FROM with_lag
WHERE tenant_id = (
  SELECT tenant_id
  FROM tenant_users
  WHERE user_id = auth.uid()
)
ORDER BY month;
