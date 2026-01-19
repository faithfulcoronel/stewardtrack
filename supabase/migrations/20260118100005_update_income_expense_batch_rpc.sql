-- =============================================================================
-- Migration: Update Income/Expense Batch RPC Function
-- =============================================================================
-- Updates a batch of income/expense transactions with GL entries atomically
-- Handles add/update/delete in a single call via isDirty/isDeleted flags
-- =============================================================================

BEGIN;

-- Drop existing function if exists
DROP FUNCTION IF EXISTS update_income_expense_batch(UUID, UUID, JSONB, JSONB, UUID);

CREATE OR REPLACE FUNCTION update_income_expense_batch(
  p_tenant_id UUID,
  p_header_id UUID,
  p_header_update JSONB DEFAULT NULL,
  p_lines JSONB DEFAULT NULL,
  p_updated_by UUID DEFAULT NULL
)
RETURNS TABLE (
  header_id UUID,
  lines_added INTEGER,
  lines_updated INTEGER,
  lines_deleted INTEGER,
  gl_entries_affected INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_header RECORD;
  v_transaction_date DATE;
  v_description TEXT;
  v_reference TEXT;
  v_line JSONB;
  v_lines_added INTEGER := 0;
  v_lines_updated INTEGER := 0;
  v_lines_deleted INTEGER := 0;
  v_gl_entries_affected INTEGER := 0;
  v_mapping RECORD;
  v_line_id UUID;
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
  v_line_index INTEGER := 0;
  v_source_coa_id UUID;
  v_category_coa_id UUID;
  v_fund_coa_id UUID;
  v_debit_tx_id UUID;
  v_credit_tx_id UUID;
  v_ie_tx_id UUID;
  -- COA lookup maps
  v_category_coa_map JSONB := '{}';
  v_source_coa_map JSONB := '{}';
  v_fund_coa_map JSONB := '{}';
  v_coa_record RECORD;
  -- Existing mappings
  v_existing_mappings JSONB := '{}';
BEGIN
  -- =========================================================================
  -- STEP 1: Validate header status
  -- =========================================================================
  SELECT h.id, h.status, h.transaction_date, h.description, h.reference
  INTO v_header
  FROM financial_transaction_headers h
  WHERE h.id = p_header_id
    AND h.tenant_id = p_tenant_id;

  IF v_header IS NULL THEN
    RETURN QUERY SELECT NULL::UUID, 0, 0, 0, 0;
    RETURN;
  END IF;

  IF v_header.status IN ('posted', 'voided') THEN
    RETURN QUERY SELECT p_header_id, 0, 0, 0, 0;
    RETURN;
  END IF;

  v_transaction_date := v_header.transaction_date;
  v_description := v_header.description;
  v_reference := v_header.reference;

  -- =========================================================================
  -- STEP 2: Update header if p_header_update provided
  -- =========================================================================
  IF p_header_update IS NOT NULL AND p_header_update != '{}'::JSONB THEN
    UPDATE financial_transaction_headers
    SET
      transaction_date = COALESCE((p_header_update->>'transaction_date')::DATE, transaction_date),
      description = COALESCE(p_header_update->>'description', description),
      reference = COALESCE(p_header_update->>'reference', reference),
      status = COALESCE(p_header_update->>'status', status),
      updated_by = p_updated_by,
      updated_at = NOW()
    WHERE id = p_header_id
      AND tenant_id = p_tenant_id;

    v_transaction_date := COALESCE((p_header_update->>'transaction_date')::DATE, v_transaction_date);
    v_description := COALESCE(p_header_update->>'description', v_description);
    v_reference := COALESCE(p_header_update->>'reference', v_reference);
  END IF;

  -- Exit early if no lines to process
  IF p_lines IS NULL OR jsonb_array_length(p_lines) = 0 THEN
    RETURN QUERY SELECT p_header_id, 0, 0, 0, 0;
    RETURN;
  END IF;

  -- =========================================================================
  -- STEP 3: Build existing mappings map
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
    v_existing_mappings := v_existing_mappings || jsonb_build_object(
      v_mapping.transaction_id::TEXT,
      jsonb_build_object(
        'mapping_id', v_mapping.mapping_id,
        'debit_transaction_id', v_mapping.debit_transaction_id,
        'credit_transaction_id', v_mapping.credit_transaction_id
      )
    );
  END LOOP;

  -- =========================================================================
  -- STEP 4: Batch-resolve COA IDs
  -- =========================================================================
  -- Build category COA map
  FOR v_coa_record IN
    SELECT c.id, c.chart_of_account_id
    FROM categories c
    WHERE c.tenant_id = p_tenant_id
      AND c.id IN (
        SELECT DISTINCT (line->>'category_id')::UUID
        FROM jsonb_array_elements(p_lines) AS line
        WHERE line->>'category_id' IS NOT NULL
          AND line->>'category_id' != ''
      )
  LOOP
    v_category_coa_map := v_category_coa_map || jsonb_build_object(v_coa_record.id::TEXT, v_coa_record.chart_of_account_id);
  END LOOP;

  -- Build source COA map
  FOR v_coa_record IN
    SELECT fs.id, fs.coa_id
    FROM financial_sources fs
    WHERE fs.tenant_id = p_tenant_id
      AND fs.id IN (
        SELECT DISTINCT (line->>'source_id')::UUID
        FROM jsonb_array_elements(p_lines) AS line
        WHERE line->>'source_id' IS NOT NULL
          AND line->>'source_id' != ''
      )
  LOOP
    v_source_coa_map := v_source_coa_map || jsonb_build_object(v_coa_record.id::TEXT, v_coa_record.coa_id);
  END LOOP;

  -- Build fund COA map
  FOR v_coa_record IN
    SELECT f.id, f.coa_id
    FROM funds f
    WHERE f.tenant_id = p_tenant_id
      AND f.id IN (
        SELECT DISTINCT (line->>'fund_id')::UUID
        FROM jsonb_array_elements(p_lines) AS line
        WHERE line->>'fund_id' IS NOT NULL
          AND line->>'fund_id' != ''
      )
  LOOP
    v_fund_coa_map := v_fund_coa_map || jsonb_build_object(v_coa_record.id::TEXT, v_coa_record.coa_id);
  END LOOP;

  -- =========================================================================
  -- STEP 5: Three-pass processing
  -- =========================================================================

  -- -------------------------------------------------------------------------
  -- PASS 1: Delete marked lines + orphaned mappings
  -- -------------------------------------------------------------------------
  FOR v_line IN SELECT * FROM jsonb_array_elements(p_lines)
  LOOP
    v_line_id := NULLIF(v_line->>'id', '')::UUID;
    v_is_deleted := COALESCE((v_line->>'isDeleted')::BOOLEAN, FALSE);

    IF v_is_deleted AND v_line_id IS NOT NULL THEN
      -- Get mapping for this line
      IF v_existing_mappings ? v_line_id::TEXT THEN
        v_debit_tx_id := (v_existing_mappings->v_line_id::TEXT->>'debit_transaction_id')::UUID;
        v_credit_tx_id := (v_existing_mappings->v_line_id::TEXT->>'credit_transaction_id')::UUID;

        -- Delete GL entries
        IF v_debit_tx_id IS NOT NULL THEN
          DELETE FROM financial_transactions WHERE id = v_debit_tx_id AND tenant_id = p_tenant_id;
          v_gl_entries_affected := v_gl_entries_affected + 1;
        END IF;

        IF v_credit_tx_id IS NOT NULL THEN
          DELETE FROM financial_transactions WHERE id = v_credit_tx_id AND tenant_id = p_tenant_id;
          v_gl_entries_affected := v_gl_entries_affected + 1;
        END IF;

        -- Delete IE transaction
        DELETE FROM income_expense_transactions WHERE id = v_line_id AND tenant_id = p_tenant_id;

        -- Delete mapping
        DELETE FROM income_expense_transaction_mappings
        WHERE id = (v_existing_mappings->v_line_id::TEXT->>'mapping_id')::UUID
          AND tenant_id = p_tenant_id;

        v_lines_deleted := v_lines_deleted + 1;
      END IF;
    END IF;
  END LOOP;

  -- Also delete mappings for lines that are no longer in the batch
  FOR v_mapping IN
    SELECT
      m.id AS mapping_id,
      m.transaction_id,
      m.debit_transaction_id,
      m.credit_transaction_id
    FROM income_expense_transaction_mappings m
    WHERE m.transaction_header_id = p_header_id
      AND m.tenant_id = p_tenant_id
      AND m.transaction_id NOT IN (
        SELECT (line->>'id')::UUID
        FROM jsonb_array_elements(p_lines) AS line
        WHERE line->>'id' IS NOT NULL AND line->>'id' != ''
      )
  LOOP
    -- Delete GL entries
    IF v_mapping.debit_transaction_id IS NOT NULL THEN
      DELETE FROM financial_transactions WHERE id = v_mapping.debit_transaction_id AND tenant_id = p_tenant_id;
      v_gl_entries_affected := v_gl_entries_affected + 1;
    END IF;

    IF v_mapping.credit_transaction_id IS NOT NULL THEN
      DELETE FROM financial_transactions WHERE id = v_mapping.credit_transaction_id AND tenant_id = p_tenant_id;
      v_gl_entries_affected := v_gl_entries_affected + 1;
    END IF;

    -- Delete IE transaction
    DELETE FROM income_expense_transactions WHERE id = v_mapping.transaction_id AND tenant_id = p_tenant_id;

    -- Delete mapping
    DELETE FROM income_expense_transaction_mappings WHERE id = v_mapping.mapping_id AND tenant_id = p_tenant_id;

    v_lines_deleted := v_lines_deleted + 1;
  END LOOP;

  -- -------------------------------------------------------------------------
  -- PASS 2 & 3: Update dirty existing lines + Insert new lines
  -- -------------------------------------------------------------------------
  FOR v_line IN SELECT * FROM jsonb_array_elements(p_lines)
  LOOP
    v_line_index := v_line_index + 1;
    v_line_id := NULLIF(v_line->>'id', '')::UUID;
    v_is_deleted := COALESCE((v_line->>'isDeleted')::BOOLEAN, FALSE);
    v_is_dirty := COALESCE((v_line->>'isDirty')::BOOLEAN, FALSE);

    -- Skip deleted lines (already handled)
    IF v_is_deleted THEN
      CONTINUE;
    END IF;

    -- Extract line data
    v_transaction_type := COALESCE(v_line->>'transaction_type', 'expense');
    v_amount := COALESCE((v_line->>'amount')::NUMERIC, 0);
    v_line_description := COALESCE(NULLIF(TRIM(v_line->>'description'), ''), v_description);
    v_category_id := NULLIF(v_line->>'category_id', '')::UUID;
    v_fund_id := NULLIF(v_line->>'fund_id', '')::UUID;
    v_source_id := NULLIF(v_line->>'source_id', '')::UUID;
    v_account_id := NULLIF(v_line->>'account_id', '')::UUID;
    v_batch_id := NULLIF(v_line->>'batch_id', '')::UUID;
    v_line_number := COALESCE((v_line->>'line')::INTEGER, v_line_index);

    -- Resolve COA IDs
    v_category_coa_id := (v_category_coa_map->>COALESCE(v_category_id::TEXT, ''))::UUID;
    v_source_coa_id := (v_source_coa_map->>COALESCE(v_source_id::TEXT, ''))::UUID;
    v_fund_coa_id := (v_fund_coa_map->>COALESCE(v_fund_id::TEXT, ''))::UUID;

    -- Check if this is an existing line
    IF v_line_id IS NOT NULL AND v_existing_mappings ? v_line_id::TEXT THEN
      -- -----------------------------------------------------------------------
      -- PASS 2: Update dirty existing lines
      -- -----------------------------------------------------------------------
      IF v_is_dirty THEN
        v_debit_tx_id := (v_existing_mappings->v_line_id::TEXT->>'debit_transaction_id')::UUID;
        v_credit_tx_id := (v_existing_mappings->v_line_id::TEXT->>'credit_transaction_id')::UUID;

        -- Update GL entries based on transaction type
        IF v_transaction_type = 'income' THEN
          -- Income: Debit source, Credit category
          IF v_debit_tx_id IS NOT NULL THEN
            UPDATE financial_transactions
            SET type = v_transaction_type, account_id = v_account_id, fund_id = v_fund_id,
                source_id = v_source_id, category_id = v_category_id, coa_id = v_source_coa_id,
                date = v_transaction_date, description = v_line_description,
                debit = v_amount, credit = 0, batch_id = v_batch_id, updated_at = NOW()
            WHERE id = v_debit_tx_id AND tenant_id = p_tenant_id;
          END IF;
          IF v_credit_tx_id IS NOT NULL THEN
            UPDATE financial_transactions
            SET type = v_transaction_type, account_id = v_account_id, fund_id = v_fund_id,
                source_id = v_source_id, category_id = v_category_id, coa_id = v_category_coa_id,
                date = v_transaction_date, description = v_line_description,
                debit = 0, credit = v_amount, batch_id = v_batch_id, updated_at = NOW()
            WHERE id = v_credit_tx_id AND tenant_id = p_tenant_id;
          END IF;
        ELSIF v_transaction_type = 'opening_balance' THEN
          -- Opening balance: Debit source, Credit fund
          IF v_debit_tx_id IS NOT NULL THEN
            UPDATE financial_transactions
            SET type = v_transaction_type, account_id = v_account_id, fund_id = v_fund_id,
                source_id = v_source_id, category_id = v_category_id, coa_id = v_source_coa_id,
                date = v_transaction_date, description = v_line_description,
                debit = v_amount, credit = 0, batch_id = v_batch_id, updated_at = NOW()
            WHERE id = v_debit_tx_id AND tenant_id = p_tenant_id;
          END IF;
          IF v_credit_tx_id IS NOT NULL THEN
            UPDATE financial_transactions
            SET type = v_transaction_type, account_id = v_account_id, fund_id = v_fund_id,
                source_id = v_source_id, category_id = v_category_id, coa_id = v_fund_coa_id,
                date = v_transaction_date, description = v_line_description,
                debit = 0, credit = v_amount, batch_id = v_batch_id, updated_at = NOW()
            WHERE id = v_credit_tx_id AND tenant_id = p_tenant_id;
          END IF;
        ELSE
          -- Expense: Debit category, Credit source
          IF v_debit_tx_id IS NOT NULL THEN
            UPDATE financial_transactions
            SET type = v_transaction_type, account_id = v_account_id, fund_id = v_fund_id,
                source_id = v_source_id, category_id = v_category_id, coa_id = v_category_coa_id,
                date = v_transaction_date, description = v_line_description,
                debit = v_amount, credit = 0, batch_id = v_batch_id, updated_at = NOW()
            WHERE id = v_debit_tx_id AND tenant_id = p_tenant_id;
          END IF;
          IF v_credit_tx_id IS NOT NULL THEN
            UPDATE financial_transactions
            SET type = v_transaction_type, account_id = v_account_id, fund_id = v_fund_id,
                source_id = v_source_id, category_id = v_category_id, coa_id = v_source_coa_id,
                date = v_transaction_date, description = v_line_description,
                debit = 0, credit = v_amount, batch_id = v_batch_id, updated_at = NOW()
            WHERE id = v_credit_tx_id AND tenant_id = p_tenant_id;
          END IF;
        END IF;

        v_gl_entries_affected := v_gl_entries_affected + 2;

        -- Update IE transaction
        UPDATE income_expense_transactions
        SET transaction_type = v_transaction_type, transaction_date = v_transaction_date,
            amount = v_amount, description = v_line_description, category_id = v_category_id,
            fund_id = v_fund_id, source_id = v_source_id, account_id = v_account_id,
            line = v_line_number, updated_by = p_updated_by, updated_at = NOW()
        WHERE id = v_line_id AND tenant_id = p_tenant_id;

        v_lines_updated := v_lines_updated + 1;
      END IF;
    ELSE
      -- -----------------------------------------------------------------------
      -- PASS 3: Insert new lines
      -- -----------------------------------------------------------------------
      -- Create GL entries based on transaction type
      IF v_transaction_type = 'income' THEN
        -- Income: Debit source, Credit category
        INSERT INTO financial_transactions (tenant_id, type, account_id, fund_id, source_id, category_id,
          coa_id, date, description, debit, credit, batch_id, header_id)
        VALUES (p_tenant_id, v_transaction_type, v_account_id, v_fund_id, v_source_id, v_category_id,
          v_source_coa_id, v_transaction_date, v_line_description, v_amount, 0, v_batch_id, p_header_id)
        RETURNING id INTO v_debit_tx_id;

        INSERT INTO financial_transactions (tenant_id, type, account_id, fund_id, source_id, category_id,
          coa_id, date, description, debit, credit, batch_id, header_id)
        VALUES (p_tenant_id, v_transaction_type, v_account_id, v_fund_id, v_source_id, v_category_id,
          v_category_coa_id, v_transaction_date, v_line_description, 0, v_amount, v_batch_id, p_header_id)
        RETURNING id INTO v_credit_tx_id;

      ELSIF v_transaction_type = 'opening_balance' THEN
        -- Opening balance: Debit source, Credit fund
        INSERT INTO financial_transactions (tenant_id, type, account_id, fund_id, source_id, category_id,
          coa_id, date, description, debit, credit, batch_id, header_id)
        VALUES (p_tenant_id, v_transaction_type, v_account_id, v_fund_id, v_source_id, v_category_id,
          v_source_coa_id, v_transaction_date, v_line_description, v_amount, 0, v_batch_id, p_header_id)
        RETURNING id INTO v_debit_tx_id;

        INSERT INTO financial_transactions (tenant_id, type, account_id, fund_id, source_id, category_id,
          coa_id, date, description, debit, credit, batch_id, header_id)
        VALUES (p_tenant_id, v_transaction_type, v_account_id, v_fund_id, v_source_id, v_category_id,
          v_fund_coa_id, v_transaction_date, v_line_description, 0, v_amount, v_batch_id, p_header_id)
        RETURNING id INTO v_credit_tx_id;

      ELSE
        -- Expense: Debit category, Credit source
        INSERT INTO financial_transactions (tenant_id, type, account_id, fund_id, source_id, category_id,
          coa_id, date, description, debit, credit, batch_id, header_id)
        VALUES (p_tenant_id, v_transaction_type, v_account_id, v_fund_id, v_source_id, v_category_id,
          v_category_coa_id, v_transaction_date, v_line_description, v_amount, 0, v_batch_id, p_header_id)
        RETURNING id INTO v_debit_tx_id;

        INSERT INTO financial_transactions (tenant_id, type, account_id, fund_id, source_id, category_id,
          coa_id, date, description, debit, credit, batch_id, header_id)
        VALUES (p_tenant_id, v_transaction_type, v_account_id, v_fund_id, v_source_id, v_category_id,
          v_source_coa_id, v_transaction_date, v_line_description, 0, v_amount, v_batch_id, p_header_id)
        RETURNING id INTO v_credit_tx_id;
      END IF;

      v_gl_entries_affected := v_gl_entries_affected + 2;

      -- Create IE transaction
      INSERT INTO income_expense_transactions (tenant_id, transaction_type, transaction_date, amount,
        description, reference, category_id, fund_id, source_id, account_id, header_id, line, created_by)
      VALUES (p_tenant_id, v_transaction_type, v_transaction_date, v_amount, v_line_description,
        v_reference, v_category_id, v_fund_id, v_source_id, v_account_id, p_header_id, v_line_number, p_updated_by)
      RETURNING id INTO v_ie_tx_id;

      -- Create mapping
      INSERT INTO income_expense_transaction_mappings (tenant_id, transaction_id, transaction_header_id,
        debit_transaction_id, credit_transaction_id)
      VALUES (p_tenant_id, v_ie_tx_id, p_header_id, v_debit_tx_id, v_credit_tx_id);

      v_lines_added := v_lines_added + 1;
    END IF;
  END LOOP;

  -- Return result
  RETURN QUERY
  SELECT
    p_header_id AS header_id,
    v_lines_added AS lines_added,
    v_lines_updated AS lines_updated,
    v_lines_deleted AS lines_deleted,
    v_gl_entries_affected AS gl_entries_affected;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION update_income_expense_batch(UUID, UUID, JSONB, JSONB, UUID) TO authenticated;

COMMENT ON FUNCTION update_income_expense_batch IS
  'Updates a batch of income/expense transactions with GL entries atomically. '
  'Handles add (new lines), update (isDirty), and delete (isDeleted) in a single call.';

COMMIT;
