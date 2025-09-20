-- Update fund summary report to remove fund_id column
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
    COALESCE(SUM(CASE WHEN ft.type = 'income' THEN ft.credit END),0) AS income,
    COALESCE(SUM(CASE WHEN ft.type = 'expense' THEN ft.debit END),0) AS expenses,
    COALESCE(SUM(CASE WHEN ft.type = 'income' THEN ft.credit ELSE -ft.debit END),0) AS net_change
  FROM funds f
  LEFT JOIN financial_transactions ft ON ft.fund_id = f.id
    AND ft.date BETWEEN p_start_date AND p_end_date
  WHERE f.tenant_id = p_tenant_id
  GROUP BY f.name
  ORDER BY f.name;
END;
$$;

GRANT EXECUTE ON FUNCTION report_fund_summary(uuid, date, date) TO authenticated;
COMMENT ON FUNCTION report_fund_summary(uuid, date, date) IS
  'Summary of income and expenses by fund for a tenant';
