-- =============================================================================
-- Migration: Add get_source_transactions RPC function
-- =============================================================================
-- Provides a comprehensive view of income/expense transactions for a financial
-- source, including category information for user-friendly display.
-- =============================================================================

BEGIN;

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS get_source_transactions(uuid, uuid);

-- Create RPC function to get transactions for a source with category details
CREATE OR REPLACE FUNCTION get_source_transactions(
  p_source_id UUID,
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
  fund_id UUID,
  fund_name TEXT,
  fund_code TEXT,
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
    iet.fund_id,
    f.name AS fund_name,
    f.code AS fund_code,
    iet.header_id,
    iet.line,
    iet.created_at
  FROM income_expense_transactions iet
  LEFT JOIN categories c ON c.id = iet.category_id
  LEFT JOIN funds f ON f.id = iet.fund_id
  WHERE iet.source_id = p_source_id
    AND iet.tenant_id = p_tenant_id
    AND iet.deleted_at IS NULL
  ORDER BY iet.transaction_date DESC, iet.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comment for documentation
COMMENT ON FUNCTION get_source_transactions(UUID, UUID) IS
  'Returns all income/expense transactions for a given financial source with category and fund details';

-- Create function to get source balance summary
DROP FUNCTION IF EXISTS get_source_balance(uuid, uuid);

CREATE OR REPLACE FUNCTION get_source_balance(
  p_source_id UUID,
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
    COALESCE(SUM(CASE WHEN iet.transaction_type IN ('income', 'refund') THEN iet.amount ELSE 0 END), 0) AS total_income,
    COALESCE(SUM(CASE WHEN iet.transaction_type IN ('expense', 'adjustment', 'allocation') THEN iet.amount ELSE 0 END), 0) AS total_expense,
    COALESCE(SUM(
      CASE
        WHEN iet.transaction_type IN ('income', 'refund', 'opening_balance', 'fund_rollover') THEN iet.amount
        WHEN iet.transaction_type IN ('expense', 'adjustment', 'allocation', 'closing_entry') THEN -iet.amount
        ELSE 0
      END
    ), 0) AS balance,
    COUNT(*)::BIGINT AS transaction_count
  FROM income_expense_transactions iet
  WHERE iet.source_id = p_source_id
    AND iet.tenant_id = p_tenant_id
    AND iet.deleted_at IS NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_source_balance(UUID, UUID) IS
  'Returns the balance summary for a financial source (total income, expenses, and net balance)';

COMMIT;

DO $$
BEGIN
  RAISE NOTICE 'RPC functions get_source_transactions and get_source_balance created successfully';
END $$;
