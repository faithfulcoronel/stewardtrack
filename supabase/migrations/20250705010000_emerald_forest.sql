-- Update finance_monthly_trends view for double-entry accounting
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
ORDER BY month;

COMMENT ON VIEW finance_monthly_trends IS 'Monthly income and expense totals with percentage change from the previous month for each tenant';

ALTER TABLE financial_transactions DROP COLUMN IF EXISTS amount;
