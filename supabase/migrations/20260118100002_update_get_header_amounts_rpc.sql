-- Update RPC function to also return category_name and source_name
-- This provides all the data needed for the transaction list in one efficient call

-- Drop the existing function first since we're changing the return type
DROP FUNCTION IF EXISTS get_header_amounts(UUID, UUID[]);

CREATE OR REPLACE FUNCTION get_header_amounts(
  p_tenant_id UUID,
  p_header_ids UUID[] DEFAULT NULL
)
RETURNS TABLE (
  header_id UUID,
  transaction_type TEXT,
  total_amount NUMERIC,
  line_count BIGINT,
  category_name TEXT,
  source_name TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH ranked_transactions AS (
    SELECT
      iet.header_id,
      iet.transaction_type::TEXT AS transaction_type,
      iet.amount,
      c.name AS category_name,
      fs.name AS source_name,
      ROW_NUMBER() OVER (PARTITION BY iet.header_id, iet.transaction_type ORDER BY iet.line ASC NULLS LAST, iet.created_at ASC) AS rn
    FROM income_expense_transactions iet
    LEFT JOIN categories c ON c.id = iet.category_id
    LEFT JOIN financial_sources fs ON fs.id = iet.source_id
    WHERE iet.tenant_id = p_tenant_id
      AND iet.deleted_at IS NULL
      AND (p_header_ids IS NULL OR iet.header_id = ANY(p_header_ids))
  )
  SELECT
    rt.header_id,
    rt.transaction_type,
    COALESCE(SUM(rt.amount), 0) AS total_amount,
    COUNT(*)::BIGINT AS line_count,
    MAX(CASE WHEN rt.rn = 1 THEN rt.category_name END) AS category_name,
    MAX(CASE WHEN rt.rn = 1 THEN rt.source_name END) AS source_name
  FROM ranked_transactions rt
  GROUP BY rt.header_id, rt.transaction_type
  ORDER BY rt.header_id;
END;
$$;

COMMENT ON FUNCTION get_header_amounts IS 'Returns transaction amounts, category, and source grouped by header_id from income_expense_transactions table. Used for efficient list display.';
