-- RPC function to get transaction amounts grouped by header_id
-- This efficiently returns the total amount and transaction type for each header
-- Used by the transaction list page to display amounts without N+1 queries

CREATE OR REPLACE FUNCTION get_header_amounts(
  p_tenant_id UUID,
  p_header_ids UUID[] DEFAULT NULL
)
RETURNS TABLE (
  header_id UUID,
  transaction_type TEXT,
  total_amount NUMERIC,
  line_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    iet.header_id,
    iet.transaction_type::TEXT,
    COALESCE(SUM(iet.amount), 0) AS total_amount,
    COUNT(*)::BIGINT AS line_count
  FROM income_expense_transactions iet
  WHERE iet.tenant_id = p_tenant_id
    AND iet.deleted_at IS NULL
    AND (p_header_ids IS NULL OR iet.header_id = ANY(p_header_ids))
  GROUP BY iet.header_id, iet.transaction_type
  ORDER BY iet.header_id;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_header_amounts(UUID, UUID[]) TO authenticated;

COMMENT ON FUNCTION get_header_amounts IS 'Returns transaction amounts grouped by header_id from income_expense_transactions table. Used for efficient list display.';
