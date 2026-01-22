-- =============================================================================
-- Migration: Add category transaction RPC functions
-- =============================================================================
-- Provides transaction history and balance for categories using income_expense_transactions
-- =============================================================================

BEGIN;

-- Get transactions for a specific category with fund and source details
DROP FUNCTION IF EXISTS get_category_transactions(uuid, uuid);

CREATE OR REPLACE FUNCTION get_category_transactions(
  p_category_id UUID,
  p_tenant_id UUID
)
RETURNS TABLE (
  id UUID,
  transaction_date DATE,
  transaction_type TEXT,
  amount NUMERIC(12, 2),
  description TEXT,
  reference TEXT,
  fund_id UUID,
  fund_name TEXT,
  fund_code TEXT,
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
    iet.fund_id,
    f.name AS fund_name,
    f.code AS fund_code,
    iet.source_id,
    fs.name AS source_name,
    iet.header_id,
    iet.line,
    iet.created_at
  FROM income_expense_transactions iet
  LEFT JOIN funds f ON f.id = iet.fund_id
  LEFT JOIN financial_sources fs ON fs.id = iet.source_id
  WHERE iet.category_id = p_category_id
    AND iet.tenant_id = p_tenant_id
    AND iet.deleted_at IS NULL
  ORDER BY iet.transaction_date DESC, iet.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_category_transactions(UUID, UUID) IS
  'Returns all income/expense transactions for a given category with fund and source details';

-- Get balance summary for a specific category
DROP FUNCTION IF EXISTS get_category_balance(uuid, uuid);

CREATE OR REPLACE FUNCTION get_category_balance(
  p_category_id UUID,
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
  WHERE iet.category_id = p_category_id
    AND iet.tenant_id = p_tenant_id
    AND iet.deleted_at IS NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_category_balance(UUID, UUID) IS
  'Returns the balance summary for a category (total income, expenses, and net balance)';

-- Get total balance across all categories for a tenant
DROP FUNCTION IF EXISTS get_all_categories_balance(uuid);

CREATE OR REPLACE FUNCTION get_all_categories_balance(
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
    AND iet.category_id IS NOT NULL
    AND iet.deleted_at IS NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_all_categories_balance(UUID) IS
  'Returns the total balance across all categories for a tenant';

COMMIT;
