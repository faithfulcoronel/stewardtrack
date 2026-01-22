-- =============================================================================
-- Migration: Trial Balance from Income/Expense Transactions
-- =============================================================================
-- Creates an RPC function that generates a trial balance style report from
-- the income_expense_transactions table using categories as the account structure.
-- This is for simplified income/expense tracking (not full double-entry bookkeeping).
-- =============================================================================

BEGIN;

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS report_trial_balance_simple(uuid, date);

-- Create RPC function to get trial balance from income_expense_transactions
-- Uses categories as the "accounts" with income categories as credits
-- and expense categories as debits
CREATE OR REPLACE FUNCTION report_trial_balance_simple(
  p_tenant_id UUID,
  p_end_date DATE
)
RETURNS TABLE (
  account_id UUID,
  account_code TEXT,
  account_name TEXT,
  account_type TEXT,
  debit_balance NUMERIC,
  credit_balance NUMERIC
) AS $$
BEGIN
  -- Check tenant access
  IF NOT check_tenant_access(p_tenant_id) THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  RETURN QUERY
  SELECT
    c.id AS account_id,
    COALESCE(c.code, '') AS account_code,
    c.name AS account_name,
    c.category_type::TEXT AS account_type,
    -- Expenses are debits
    COALESCE(SUM(
      CASE WHEN iet.transaction_type IN ('expense', 'adjustment', 'allocation', 'closing_entry')
           THEN iet.amount
           ELSE 0
      END
    ), 0) AS debit_balance,
    -- Income is credits
    COALESCE(SUM(
      CASE WHEN iet.transaction_type IN ('income', 'refund', 'opening_balance', 'fund_rollover')
           THEN iet.amount
           ELSE 0
      END
    ), 0) AS credit_balance
  FROM categories c
  LEFT JOIN income_expense_transactions iet
    ON iet.category_id = c.id
    AND iet.tenant_id = c.tenant_id
    AND iet.transaction_date <= p_end_date
    AND iet.deleted_at IS NULL
  WHERE c.tenant_id = p_tenant_id
    AND c.deleted_at IS NULL
  GROUP BY c.id, c.code, c.name, c.category_type
  ORDER BY c.category_type, c.code, c.name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION report_trial_balance_simple(UUID, DATE) TO authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION report_trial_balance_simple(UUID, DATE) IS
  'Trial balance style report from income_expense_transactions using categories as accounts. Income categories show credits, expense categories show debits.';

COMMIT;

DO $$
BEGIN
  RAISE NOTICE 'RPC function report_trial_balance_simple created successfully';
END $$;
