-- =============================================================================
-- Migration: Delete Income/Expense Batch RPC Function
-- =============================================================================
-- Deletes an entire batch (header) with all its transactions and GL entries
-- =============================================================================

BEGIN;

-- Drop existing function if exists
DROP FUNCTION IF EXISTS delete_income_expense_batch(UUID, UUID);

CREATE OR REPLACE FUNCTION delete_income_expense_batch(
  p_tenant_id UUID,
  p_header_id UUID
)
RETURNS TABLE (
  lines_deleted INTEGER,
  gl_entries_deleted INTEGER,
  success BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_header RECORD;
  v_mapping RECORD;
  v_lines_deleted INTEGER := 0;
  v_gl_entries_deleted INTEGER := 0;
BEGIN
  -- =========================================================================
  -- STEP 1: Validate ownership and status
  -- =========================================================================
  SELECT h.id, h.status
  INTO v_header
  FROM financial_transaction_headers h
  WHERE h.id = p_header_id
    AND h.tenant_id = p_tenant_id;

  IF v_header IS NULL THEN
    RETURN QUERY SELECT 0, 0, FALSE;
    RETURN;
  END IF;

  IF v_header.status IN ('posted', 'voided') THEN
    RETURN QUERY SELECT 0, 0, FALSE;
    RETURN;
  END IF;

  -- =========================================================================
  -- STEP 2: Delete all GL entries via mapping lookup
  -- =========================================================================
  FOR v_mapping IN
    SELECT
      m.id AS mapping_id,
      m.transaction_id,
      m.debit_transaction_id,
      m.credit_transaction_id
    FROM income_expense_transaction_mappings m
    WHERE m.transaction_header_id = p_header_id
      AND m.tenant_id = p_tenant_id
  LOOP
    -- Delete GL entries
    IF v_mapping.debit_transaction_id IS NOT NULL THEN
      DELETE FROM financial_transactions
      WHERE id = v_mapping.debit_transaction_id AND tenant_id = p_tenant_id;
      v_gl_entries_deleted := v_gl_entries_deleted + 1;
    END IF;

    IF v_mapping.credit_transaction_id IS NOT NULL THEN
      DELETE FROM financial_transactions
      WHERE id = v_mapping.credit_transaction_id AND tenant_id = p_tenant_id;
      v_gl_entries_deleted := v_gl_entries_deleted + 1;
    END IF;

    -- Delete IE transaction
    DELETE FROM income_expense_transactions
    WHERE id = v_mapping.transaction_id AND tenant_id = p_tenant_id;

    -- Delete mapping
    DELETE FROM income_expense_transaction_mappings
    WHERE id = v_mapping.mapping_id AND tenant_id = p_tenant_id;

    v_lines_deleted := v_lines_deleted + 1;
  END LOOP;

  -- =========================================================================
  -- STEP 3: Delete header
  -- =========================================================================
  DELETE FROM financial_transaction_headers
  WHERE id = p_header_id AND tenant_id = p_tenant_id;

  RETURN QUERY SELECT v_lines_deleted, v_gl_entries_deleted, TRUE;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION delete_income_expense_batch(UUID, UUID) TO authenticated;

COMMENT ON FUNCTION delete_income_expense_batch IS
  'Deletes an entire batch (header) with all its transactions and GL entries atomically.';

COMMIT;
