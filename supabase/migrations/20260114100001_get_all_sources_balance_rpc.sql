-- =============================================================================
-- Migration: Add get_all_sources_balance RPC function
-- =============================================================================
-- Calculates total balance across all financial sources for a tenant
-- =============================================================================

BEGIN;

DROP FUNCTION IF EXISTS get_all_sources_balance(uuid);

CREATE OR REPLACE FUNCTION get_all_sources_balance(
  p_tenant_id UUID
)
RETURNS TABLE (
  total_income NUMERIC(12, 2),
  total_expense NUMERIC(12, 2),
  total_balance NUMERIC(12, 2),
  transaction_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(SUM(CASE WHEN iet.transaction_type IN ('income', 'refund', 'opening_balance', 'fund_rollover') THEN iet.amount ELSE 0 END), 0) AS total_income,
    COALESCE(SUM(CASE WHEN iet.transaction_type IN ('expense', 'adjustment', 'allocation', 'closing_entry') THEN iet.amount ELSE 0 END), 0) AS total_expense,
    COALESCE(SUM(
      CASE
        WHEN iet.transaction_type IN ('income', 'refund', 'opening_balance', 'fund_rollover') THEN iet.amount
        WHEN iet.transaction_type IN ('expense', 'adjustment', 'allocation', 'closing_entry') THEN -iet.amount
        ELSE 0
      END
    ), 0) AS total_balance,
    COUNT(*)::BIGINT AS transaction_count
  FROM income_expense_transactions iet
  WHERE iet.tenant_id = p_tenant_id
    AND iet.source_id IS NOT NULL
    AND iet.deleted_at IS NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_all_sources_balance(UUID) IS
  'Returns the total balance across all financial sources for a tenant';

COMMIT;
