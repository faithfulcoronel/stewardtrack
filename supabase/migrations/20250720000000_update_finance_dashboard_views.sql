-- Update finance dashboard views to pull monthly stats from transaction headers
-- Joins income/expense transactions through mapping tables so each row is
-- scoped by the financial transaction header's tenant and date.
-- Existing RLS policies on underlying tables continue to protect data access.

DROP VIEW IF EXISTS finance_monthly_stats CASCADE;
CREATE VIEW finance_monthly_stats AS
WITH tx AS (
  SELECT
    h.tenant_id,
    iet.transaction_type AS type,
    COALESCE(c.name, 'Uncategorized') AS category_name,
    SUM(iet.amount) AS total
  FROM income_expense_transactions iet
  JOIN income_expense_transaction_mappings m ON m.transaction_id = iet.id
  JOIN financial_transaction_headers h ON h.id = m.transaction_header_id
  LEFT JOIN categories c ON c.id = iet.category_id
  WHERE date_trunc('month', h.transaction_date) = date_trunc('month', CURRENT_DATE)
    AND iet.deleted_at IS NULL
  GROUP BY h.tenant_id, iet.transaction_type, c.name
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

COMMENT ON VIEW finance_monthly_stats IS 'Aggregated financial statistics for the current month per tenant via transaction headers';
