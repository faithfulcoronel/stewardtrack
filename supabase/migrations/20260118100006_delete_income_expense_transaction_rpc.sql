-- =============================================================================
-- Migration: Delete Income/Expense Transaction RPC Function
-- =============================================================================
-- Deletes a single income/expense transaction with its GL entries and header
-- =============================================================================

BEGIN;

-- Drop existing function if exists
DROP FUNCTION IF EXISTS delete_income_expense_transaction(UUID, UUID);

CREATE OR REPLACE FUNCTION delete_income_expense_transaction(
  p_tenant_id UUID,
  p_transaction_id UUID
)
RETURNS TABLE (
  header_id UUID,
  success BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_mapping RECORD;
  v_header RECORD;
BEGIN
  -- =========================================================================
  -- STEP 1: Get mapping
  -- =========================================================================
  SELECT
    m.id AS mapping_id,
    m.transaction_header_id,
    m.debit_transaction_id,
    m.credit_transaction_id
  INTO v_mapping
  FROM income_expense_transaction_mappings m
  WHERE m.transaction_id = p_transaction_id
    AND m.tenant_id = p_tenant_id
  LIMIT 1;

  IF v_mapping IS NULL THEN
    RETURN QUERY SELECT NULL::UUID, FALSE;
    RETURN;
  END IF;

  -- =========================================================================
  -- STEP 2: Validate header not posted
  -- =========================================================================
  SELECT h.id, h.status
  INTO v_header
  FROM financial_transaction_headers h
  WHERE h.id = v_mapping.transaction_header_id
    AND h.tenant_id = p_tenant_id;

  IF v_header.status IN ('posted', 'voided') THEN
    RETURN QUERY SELECT v_mapping.transaction_header_id, FALSE;
    RETURN;
  END IF;

  -- =========================================================================
  -- STEP 3: Delete in order: GL entries -> IE -> mapping -> header
  -- =========================================================================
  -- Delete GL entries
  IF v_mapping.debit_transaction_id IS NOT NULL THEN
    DELETE FROM financial_transactions
    WHERE id = v_mapping.debit_transaction_id AND tenant_id = p_tenant_id;
  END IF;

  IF v_mapping.credit_transaction_id IS NOT NULL THEN
    DELETE FROM financial_transactions
    WHERE id = v_mapping.credit_transaction_id AND tenant_id = p_tenant_id;
  END IF;

  -- Delete IE transaction
  DELETE FROM income_expense_transactions
  WHERE id = p_transaction_id AND tenant_id = p_tenant_id;

  -- Delete mapping
  DELETE FROM income_expense_transaction_mappings
  WHERE id = v_mapping.mapping_id AND tenant_id = p_tenant_id;

  -- Delete header
  DELETE FROM financial_transaction_headers
  WHERE id = v_mapping.transaction_header_id AND tenant_id = p_tenant_id;

  RETURN QUERY SELECT v_mapping.transaction_header_id, TRUE;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION delete_income_expense_transaction(UUID, UUID) TO authenticated;

COMMENT ON FUNCTION delete_income_expense_transaction IS
  'Deletes a single income/expense transaction with its GL entries, mapping, and header atomically.';

COMMIT;
