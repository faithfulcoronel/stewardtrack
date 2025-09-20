-- Filter out soft-deleted transaction headers in finance monthly stats
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
      iet.transaction_type AS type,
      COALESCE(c.name, 'Uncategorized') AS category_name,
      SUM(iet.amount) AS total
    FROM income_expense_transactions iet
    JOIN income_expense_transaction_mappings m ON m.transaction_id = iet.id
    JOIN financial_transaction_headers h ON h.id = m.transaction_header_id
    LEFT JOIN categories c ON c.id = iet.category_id
    WHERE h.transaction_date BETWEEN p_start_date AND p_end_date
      AND iet.deleted_at IS NULL
      AND h.deleted_at IS NULL
    GROUP BY h.tenant_id, iet.transaction_type, c.name
  )
  SELECT
    SUM(CASE WHEN type = 'income' THEN total ELSE 0 END) AS monthly_income,
    SUM(CASE WHEN type = 'expense' THEN total ELSE 0 END) AS monthly_expenses,
    COALESCE(
      (SELECT COUNT(*)::integer FROM budgets b
         WHERE b.tenant_id = tx.tenant_id
           AND p_end_date BETWEEN b.start_date AND b.end_date),
      0
    ) AS active_budgets,
    jsonb_object_agg(category_name, total) FILTER (WHERE type = 'income') AS income_by_category,
    jsonb_object_agg(category_name, total) FILTER (WHERE type = 'expense') AS expenses_by_category
  FROM tx
  WHERE tenant_id = p_tenant_id
  GROUP BY tenant_id;
END;
$$;

GRANT EXECUTE ON FUNCTION finance_monthly_stats(uuid, date, date) TO authenticated;
COMMENT ON FUNCTION finance_monthly_stats(uuid, date, date) IS
  'Aggregated financial statistics for a tenant within a date range';
