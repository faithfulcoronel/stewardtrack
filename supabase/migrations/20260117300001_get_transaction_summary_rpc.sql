-- Migration: Create RPC function for transaction summary
-- Purpose: Efficient calculation of income/expense totals by status for dashboard display

CREATE OR REPLACE FUNCTION get_transaction_summary(
  p_tenant_id UUID,
  p_start_date DATE DEFAULT NULL,
  p_end_date DATE DEFAULT NULL
)
RETURNS TABLE (
  status TEXT,
  transaction_type TEXT,
  total_amount NUMERIC,
  transaction_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    fth.status::TEXT,
    iet.transaction_type::TEXT,
    COALESCE(SUM(iet.amount), 0) as total_amount,
    COUNT(DISTINCT fth.id) as transaction_count
  FROM financial_transaction_headers fth
  INNER JOIN income_expense_transactions iet ON iet.header_id = fth.id
  WHERE fth.tenant_id = p_tenant_id
    AND (p_start_date IS NULL OR fth.transaction_date >= p_start_date)
    AND (p_end_date IS NULL OR fth.transaction_date <= p_end_date)
  GROUP BY fth.status, iet.transaction_type
  ORDER BY fth.status, iet.transaction_type;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_transaction_summary(UUID, DATE, DATE) TO authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION get_transaction_summary IS 'Returns transaction totals grouped by status and type for dashboard display. Supports date range filtering for MTD/YTD calculations.';
