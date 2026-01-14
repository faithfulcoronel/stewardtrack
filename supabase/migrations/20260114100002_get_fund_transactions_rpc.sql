-- =============================================================================
-- Migration: Add fund transaction RPC functions
-- =============================================================================
-- Provides transaction history and balance for funds using income_expense_transactions
-- =============================================================================

BEGIN;

-- Get transactions for a specific fund with category details
DROP FUNCTION IF EXISTS get_fund_transactions(uuid, uuid);

CREATE OR REPLACE FUNCTION get_fund_transactions(
  p_fund_id UUID,
  p_tenant_id UUID
)
RETURNS TABLE (
  id UUID,
  transaction_date DATE,
  transaction_type TEXT,
  amount NUMERIC(12, 2),
  description TEXT,
  reference TEXT,
  category_id UUID,
  category_name TEXT,
  category_code TEXT,
  source_id UUID,
  source_name TEXT,
  header_id UUID,
  line INTEGER,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    iet.id,
    iet.transaction_date,
    iet.transaction_type::TEXT,
    iet.amount,
    iet.description,
    iet.reference,
    iet.category_id,
    c.name AS category_name,
    c.code AS category_code,
    iet.source_id,
    fs.name AS source_name,
    iet.header_id,
    iet.line,
    iet.created_at
  FROM income_expense_transactions iet
  LEFT JOIN categories c ON c.id = iet.category_id
  LEFT JOIN financial_sources fs ON fs.id = iet.source_id
  WHERE iet.fund_id = p_fund_id
    AND iet.tenant_id = p_tenant_id
    AND iet.deleted_at IS NULL
  ORDER BY iet.transaction_date DESC, iet.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_fund_transactions(UUID, UUID) IS
  'Returns all income/expense transactions for a given fund with category and source details';

-- Get balance summary for a specific fund
DROP FUNCTION IF EXISTS get_fund_balance(uuid, uuid);

CREATE OR REPLACE FUNCTION get_fund_balance(
  p_fund_id UUID,
  p_tenant_id UUID
)
RETURNS TABLE (
  total_income NUMERIC(12, 2),
  total_expense NUMERIC(12, 2),
  balance NUMERIC(12, 2),
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
    ), 0) AS balance,
    COUNT(*)::BIGINT AS transaction_count
  FROM income_expense_transactions iet
  WHERE iet.fund_id = p_fund_id
    AND iet.tenant_id = p_tenant_id
    AND iet.deleted_at IS NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_fund_balance(UUID, UUID) IS
  'Returns the balance summary for a fund (total income, expenses, and net balance)';

-- Get total balance across all funds for a tenant
DROP FUNCTION IF EXISTS get_all_funds_balance(uuid);

CREATE OR REPLACE FUNCTION get_all_funds_balance(
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
    AND iet.fund_id IS NOT NULL
    AND iet.deleted_at IS NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_all_funds_balance(UUID) IS
  'Returns the total balance across all funds for a tenant';

COMMIT;
