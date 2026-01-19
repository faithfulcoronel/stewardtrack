-- =============================================================================
-- Migration: Fix Update Income/Expense Line RPC - Cast type to enum
-- =============================================================================
-- Fixes the type column updates to cast text to financial_transaction_type enum
-- =============================================================================

BEGIN;

DROP FUNCTION IF EXISTS update_income_expense_line(UUID, UUID, JSONB, JSONB, UUID);

CREATE OR REPLACE FUNCTION update_income_expense_line(
  p_tenant_id UUID,
  p_transaction_id UUID,
  p_header_update JSONB DEFAULT NULL,
  p_line_data JSONB DEFAULT NULL,
  p_updated_by UUID DEFAULT NULL
)
RETURNS TABLE (
  header_id UUID,
  action_taken TEXT,
  success BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_mapping RECORD;
  v_header RECORD;
  v_is_deleted BOOLEAN;
  v_is_dirty BOOLEAN;
  v_transaction_type TEXT;
  v_amount NUMERIC;
  v_line_description TEXT;
  v_category_id UUID;
  v_fund_id UUID;
  v_source_id UUID;
  v_account_id UUID;
  v_batch_id UUID;
  v_line_number INTEGER;
  v_source_coa_id UUID;
  v_category_coa_id UUID;
  v_fund_coa_id UUID;
  v_transaction_date DATE;
  v_effective_updated_by UUID;
BEGIN
  -- Use provided updated_by or get current user from auth context
  v_effective_updated_by := COALESCE(p_updated_by, auth.uid());

  -- =========================================================================
  -- STEP 1: Fetch mapping by transaction_id
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
    RETURN QUERY SELECT NULL::UUID, 'not_found'::TEXT, FALSE;
    RETURN;
  END IF;

  -- =========================================================================
  -- STEP 2: Validate header not posted/voided
  -- =========================================================================
  SELECT h.id, h.status, h.transaction_date
  INTO v_header
  FROM financial_transaction_headers h
  WHERE h.id = v_mapping.transaction_header_id
    AND h.tenant_id = p_tenant_id;

  IF v_header.status IN ('posted', 'voided') THEN
    RETURN QUERY SELECT v_mapping.transaction_header_id, 'header_locked'::TEXT, FALSE;
    RETURN;
  END IF;

  v_transaction_date := v_header.transaction_date;

  -- =========================================================================
  -- STEP 3: Update header if p_header_update provided
  -- =========================================================================
  IF p_header_update IS NOT NULL AND p_header_update != '{}'::JSONB THEN
    UPDATE financial_transaction_headers
    SET
      transaction_date = COALESCE((p_header_update->>'transaction_date')::DATE, transaction_date),
      description = COALESCE(p_header_update->>'description', description),
      reference = COALESCE(p_header_update->>'reference', reference),
      status = COALESCE(p_header_update->>'status', status),
      updated_by = v_effective_updated_by,
      updated_at = NOW()
    WHERE id = v_mapping.transaction_header_id
      AND tenant_id = p_tenant_id;

    v_transaction_date := COALESCE((p_header_update->>'transaction_date')::DATE, v_transaction_date);
  END IF;

  -- Check if line data provided
  IF p_line_data IS NULL OR p_line_data = '{}'::JSONB THEN
    RETURN QUERY SELECT v_mapping.transaction_header_id, 'header_updated'::TEXT, TRUE;
    RETURN;
  END IF;

  -- Extract line data flags
  v_is_deleted := COALESCE((p_line_data->>'isDeleted')::BOOLEAN, FALSE);
  v_is_dirty := COALESCE((p_line_data->>'isDirty')::BOOLEAN, FALSE);

  -- =========================================================================
  -- STEP 4: Handle isDeleted - Delete GL entries + IE + mapping
  -- =========================================================================
  IF v_is_deleted THEN
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

    RETURN QUERY SELECT v_mapping.transaction_header_id, 'deleted'::TEXT, TRUE;
    RETURN;
  END IF;

  -- =========================================================================
  -- STEP 5: Handle isDirty - Update GL entries + IE transaction
  -- =========================================================================
  IF v_is_dirty THEN
    -- Extract line data
    v_transaction_type := COALESCE(p_line_data->>'transaction_type', 'expense');
    v_amount := COALESCE((p_line_data->>'amount')::NUMERIC, 0);
    v_line_description := NULLIF(TRIM(p_line_data->>'description'), '');
    v_category_id := NULLIF(p_line_data->>'category_id', '')::UUID;
    v_fund_id := NULLIF(p_line_data->>'fund_id', '')::UUID;
    v_source_id := NULLIF(p_line_data->>'source_id', '')::UUID;
    v_account_id := NULLIF(p_line_data->>'account_id', '')::UUID;
    v_batch_id := NULLIF(p_line_data->>'batch_id', '')::UUID;
    v_line_number := (p_line_data->>'line')::INTEGER;

    -- Resolve COA IDs
    SELECT c.chart_of_account_id INTO v_category_coa_id
    FROM categories c
    WHERE c.id = v_category_id AND c.tenant_id = p_tenant_id;

    SELECT fs.coa_id INTO v_source_coa_id
    FROM financial_sources fs
    WHERE fs.id = v_source_id AND fs.tenant_id = p_tenant_id;

    SELECT f.coa_id INTO v_fund_coa_id
    FROM funds f
    WHERE f.id = v_fund_id AND f.tenant_id = p_tenant_id;

    -- Update GL entries based on transaction type (with type cast to enum)
    IF v_transaction_type = 'income' THEN
      -- Income: Debit source_coa_id, Credit category_coa_id
      IF v_mapping.debit_transaction_id IS NOT NULL THEN
        UPDATE financial_transactions
        SET
          type = v_transaction_type::financial_transaction_type,
          account_id = v_account_id,
          fund_id = v_fund_id,
          source_id = v_source_id,
          category_id = v_category_id,
          coa_id = v_source_coa_id,
          date = v_transaction_date,
          description = v_line_description,
          debit = v_amount,
          credit = 0,
          batch_id = v_batch_id,
          updated_at = NOW()
        WHERE id = v_mapping.debit_transaction_id AND tenant_id = p_tenant_id;
      END IF;

      IF v_mapping.credit_transaction_id IS NOT NULL THEN
        UPDATE financial_transactions
        SET
          type = v_transaction_type::financial_transaction_type,
          account_id = v_account_id,
          fund_id = v_fund_id,
          source_id = v_source_id,
          category_id = v_category_id,
          coa_id = v_category_coa_id,
          date = v_transaction_date,
          description = v_line_description,
          debit = 0,
          credit = v_amount,
          batch_id = v_batch_id,
          updated_at = NOW()
        WHERE id = v_mapping.credit_transaction_id AND tenant_id = p_tenant_id;
      END IF;

    ELSIF v_transaction_type = 'opening_balance' THEN
      -- Opening balance: Debit source_coa_id, Credit fund_coa_id
      IF v_mapping.debit_transaction_id IS NOT NULL THEN
        UPDATE financial_transactions
        SET
          type = v_transaction_type::financial_transaction_type,
          account_id = v_account_id,
          fund_id = v_fund_id,
          source_id = v_source_id,
          category_id = v_category_id,
          coa_id = v_source_coa_id,
          date = v_transaction_date,
          description = v_line_description,
          debit = v_amount,
          credit = 0,
          batch_id = v_batch_id,
          updated_at = NOW()
        WHERE id = v_mapping.debit_transaction_id AND tenant_id = p_tenant_id;
      END IF;

      IF v_mapping.credit_transaction_id IS NOT NULL THEN
        UPDATE financial_transactions
        SET
          type = v_transaction_type::financial_transaction_type,
          account_id = v_account_id,
          fund_id = v_fund_id,
          source_id = v_source_id,
          category_id = v_category_id,
          coa_id = v_fund_coa_id,
          date = v_transaction_date,
          description = v_line_description,
          debit = 0,
          credit = v_amount,
          batch_id = v_batch_id,
          updated_at = NOW()
        WHERE id = v_mapping.credit_transaction_id AND tenant_id = p_tenant_id;
      END IF;

    ELSE
      -- Expense (default): Debit category_coa_id, Credit source_coa_id
      IF v_mapping.debit_transaction_id IS NOT NULL THEN
        UPDATE financial_transactions
        SET
          type = v_transaction_type::financial_transaction_type,
          account_id = v_account_id,
          fund_id = v_fund_id,
          source_id = v_source_id,
          category_id = v_category_id,
          coa_id = v_category_coa_id,
          date = v_transaction_date,
          description = v_line_description,
          debit = v_amount,
          credit = 0,
          batch_id = v_batch_id,
          updated_at = NOW()
        WHERE id = v_mapping.debit_transaction_id AND tenant_id = p_tenant_id;
      END IF;

      IF v_mapping.credit_transaction_id IS NOT NULL THEN
        UPDATE financial_transactions
        SET
          type = v_transaction_type::financial_transaction_type,
          account_id = v_account_id,
          fund_id = v_fund_id,
          source_id = v_source_id,
          category_id = v_category_id,
          coa_id = v_source_coa_id,
          date = v_transaction_date,
          description = v_line_description,
          debit = 0,
          credit = v_amount,
          batch_id = v_batch_id,
          updated_at = NOW()
        WHERE id = v_mapping.credit_transaction_id AND tenant_id = p_tenant_id;
      END IF;
    END IF;

    -- Update IE transaction (with type cast to enum)
    UPDATE income_expense_transactions
    SET
      transaction_type = v_transaction_type::financial_transaction_type,
      transaction_date = v_transaction_date,
      amount = v_amount,
      description = v_line_description,
      category_id = v_category_id,
      fund_id = v_fund_id,
      source_id = v_source_id,
      account_id = v_account_id,
      line = v_line_number,
      updated_by = v_effective_updated_by,
      updated_at = NOW()
    WHERE id = p_transaction_id AND tenant_id = p_tenant_id;

    RETURN QUERY SELECT v_mapping.transaction_header_id, 'updated'::TEXT, TRUE;
    RETURN;
  END IF;

  -- No action taken (neither dirty nor deleted)
  RETURN QUERY SELECT v_mapping.transaction_header_id, 'no_action'::TEXT, TRUE;
END;
$$;

GRANT EXECUTE ON FUNCTION update_income_expense_line(UUID, UUID, JSONB, JSONB, UUID) TO authenticated;

COMMENT ON FUNCTION update_income_expense_line IS
  'Updates a single income/expense transaction line with its GL entries. '
  'Supports isDirty (update) and isDeleted (delete) flags. '
  'Casts transaction type to financial_transaction_type enum.';

COMMIT;
