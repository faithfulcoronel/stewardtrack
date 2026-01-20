-- =============================================================================
-- Migration: Update Income/Expense Batch RPC for All Transaction Types
-- =============================================================================
-- Updates the create_income_expense_batch and update_income_expense_batch
-- RPC functions to handle all 11 transaction types with proper double-entry
-- accounting patterns:
--
-- Transaction Types:
-- - income: DR Asset (source), CR Revenue (category)
-- - expense: DR Expense (category), CR Asset (source)
-- - transfer: DR Asset (destination), CR Asset (source)
-- - fund_rollover: DR Equity (source fund), CR Equity (destination fund)
-- - adjustment: DR/CR based on category type
-- - reclass: DR To COA, CR From COA
-- - refund: DR Revenue (category), CR Asset (source)
-- - opening_balance: DR Asset (source), CR Equity (fund)
-- - closing_entry: Period-end closing
-- - reversal: Opposite of original transaction
-- - allocation: DR destination fund, CR source fund
-- =============================================================================

BEGIN;

-- =============================================================================
-- STEP 1: Drop existing function (with all signatures to ensure clean replacement)
-- =============================================================================
DROP FUNCTION IF EXISTS create_income_expense_batch(UUID, DATE, TEXT, JSONB, TEXT, UUID, TEXT, UUID);
DROP FUNCTION IF EXISTS create_income_expense_batch(UUID, DATE, TEXT, JSONB, TEXT, UUID, TEXT, UUID, UUID, UUID, UUID, TEXT);

-- =============================================================================
-- STEP 2: Create updated create_income_expense_batch function
-- =============================================================================
CREATE OR REPLACE FUNCTION create_income_expense_batch(
  p_tenant_id UUID,
  p_transaction_date DATE,
  p_description TEXT,
  p_lines JSONB,  -- Array of line objects (required, before optional params)
  p_reference TEXT DEFAULT NULL,
  p_source_id UUID DEFAULT NULL,
  p_status TEXT DEFAULT 'draft',
  p_created_by UUID DEFAULT NULL,
  -- Extended transaction type parameters
  p_destination_source_id UUID DEFAULT NULL,  -- For transfer transactions
  p_destination_fund_id UUID DEFAULT NULL,    -- For fund_rollover/allocation transactions
  p_reference_transaction_id UUID DEFAULT NULL, -- For reversal transactions
  p_adjustment_reason TEXT DEFAULT NULL       -- For adjustment transactions
)
RETURNS TABLE (
  header_id UUID,
  header_transaction_number TEXT,
  header_status TEXT,
  lines_created INTEGER,
  gl_entries_created INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_header_id UUID;
  v_transaction_number TEXT;
  v_line JSONB;
  v_line_index INTEGER := 0;
  v_lines_created INTEGER := 0;
  v_gl_entries_created INTEGER := 0;
  v_debit_tx_id UUID;
  v_credit_tx_id UUID;
  v_ie_tx_id UUID;
  v_source_coa_id UUID;
  v_category_coa_id UUID;
  v_fund_coa_id UUID;
  v_dest_source_coa_id UUID;
  v_dest_fund_coa_id UUID;
  v_from_coa_id UUID;
  v_to_coa_id UUID;
  v_transaction_type TEXT;
  v_amount NUMERIC;
  v_line_description TEXT;
  v_category_id UUID;
  v_fund_id UUID;
  v_source_id_line UUID;
  v_account_id UUID;
  v_batch_id UUID;
  v_line_number INTEGER;
  -- COA lookups
  v_category_coa_map JSONB := '{}';
  v_source_coa_map JSONB := '{}';
  v_fund_coa_map JSONB := '{}';
  v_coa_record RECORD;
BEGIN
  -- =========================================================================
  -- STEP 1: Create header as 'draft' first
  -- =========================================================================
  INSERT INTO financial_transaction_headers (
    tenant_id,
    transaction_date,
    description,
    reference,
    source_id,
    status,
    created_by,
    reference_transaction_id,
    adjustment_reason
  )
  VALUES (
    p_tenant_id,
    p_transaction_date,
    p_description,
    p_reference,
    p_source_id,
    'draft', -- Always start as draft
    p_created_by,
    p_reference_transaction_id,
    p_adjustment_reason
  )
  RETURNING id, transaction_number INTO v_header_id, v_transaction_number;

  -- =========================================================================
  -- STEP 2: Batch-resolve COA IDs for all categories, sources, and funds
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

  -- Build source COA map (includes both line sources and header sources)
  FOR v_coa_record IN
    SELECT fs.id, fs.coa_id
    FROM financial_sources fs
    WHERE fs.tenant_id = p_tenant_id
      AND fs.id IN (
        SELECT DISTINCT (line->>'source_id')::UUID
        FROM jsonb_array_elements(p_lines) AS line
        WHERE line->>'source_id' IS NOT NULL
          AND line->>'source_id' != ''
        UNION
        SELECT p_destination_source_id WHERE p_destination_source_id IS NOT NULL
      )
  LOOP
    v_source_coa_map := v_source_coa_map || jsonb_build_object(v_coa_record.id::TEXT, v_coa_record.coa_id);
  END LOOP;

  -- Build fund COA map (includes both line funds and destination fund)
  FOR v_coa_record IN
    SELECT f.id, f.coa_id
    FROM funds f
    WHERE f.tenant_id = p_tenant_id
      AND f.id IN (
        SELECT DISTINCT (line->>'fund_id')::UUID
        FROM jsonb_array_elements(p_lines) AS line
        WHERE line->>'fund_id' IS NOT NULL
          AND line->>'fund_id' != ''
        UNION
        SELECT p_destination_fund_id WHERE p_destination_fund_id IS NOT NULL
      )
  LOOP
    v_fund_coa_map := v_fund_coa_map || jsonb_build_object(v_coa_record.id::TEXT, v_coa_record.coa_id);
  END LOOP;

  -- Get destination source COA if provided
  IF p_destination_source_id IS NOT NULL THEN
    v_dest_source_coa_id := (v_source_coa_map->>p_destination_source_id::TEXT)::UUID;
  END IF;

  -- Get destination fund COA if provided
  IF p_destination_fund_id IS NOT NULL THEN
    v_dest_fund_coa_id := (v_fund_coa_map->>p_destination_fund_id::TEXT)::UUID;
  END IF;

  -- =========================================================================
  -- STEP 3: Process each line
  -- =========================================================================
  FOR v_line IN SELECT * FROM jsonb_array_elements(p_lines)
  LOOP
    v_line_index := v_line_index + 1;

    -- Extract line data
    v_transaction_type := v_line->>'transaction_type';
    v_amount := (v_line->>'amount')::NUMERIC;
    v_line_description := COALESCE(NULLIF(TRIM(v_line->>'description'), ''), p_description);
    v_category_id := NULLIF(v_line->>'category_id', '')::UUID;
    v_fund_id := NULLIF(v_line->>'fund_id', '')::UUID;
    v_source_id_line := NULLIF(v_line->>'source_id', '')::UUID;
    v_account_id := NULLIF(v_line->>'account_id', '')::UUID;
    v_batch_id := NULLIF(v_line->>'batch_id', '')::UUID;
    v_line_number := COALESCE((v_line->>'line')::INTEGER, v_line_index);

    -- Get line-level COA IDs for reclass
    v_from_coa_id := NULLIF(v_line->>'from_coa_id', '')::UUID;
    v_to_coa_id := NULLIF(v_line->>'to_coa_id', '')::UUID;

    -- Resolve COA IDs from maps
    v_category_coa_id := (v_category_coa_map->>COALESCE(v_category_id::TEXT, ''))::UUID;
    v_source_coa_id := (v_source_coa_map->>COALESCE(v_source_id_line::TEXT, ''))::UUID;
    v_fund_coa_id := (v_fund_coa_map->>COALESCE(v_fund_id::TEXT, ''))::UUID;

    -- =========================================================================
    -- STEP 3a: Create GL entries based on transaction type
    -- =========================================================================

    -- INCOME: DR Asset (source), CR Revenue (category)
    IF v_transaction_type = 'income' THEN
      -- Create debit entry (Asset increase)
      INSERT INTO financial_transactions (
        tenant_id, type, account_id, fund_id, source_id, category_id,
        coa_id, date, description, debit, credit, batch_id, header_id
      )
      VALUES (
        p_tenant_id, v_transaction_type, v_account_id, v_fund_id, v_source_id_line, v_category_id,
        v_source_coa_id, p_transaction_date, v_line_description, v_amount, 0, v_batch_id, v_header_id
      )
      RETURNING id INTO v_debit_tx_id;

      -- Create credit entry (Revenue increase)
      INSERT INTO financial_transactions (
        tenant_id, type, account_id, fund_id, source_id, category_id,
        coa_id, date, description, debit, credit, batch_id, header_id
      )
      VALUES (
        p_tenant_id, v_transaction_type, v_account_id, v_fund_id, v_source_id_line, v_category_id,
        v_category_coa_id, p_transaction_date, v_line_description, 0, v_amount, v_batch_id, v_header_id
      )
      RETURNING id INTO v_credit_tx_id;

      v_gl_entries_created := v_gl_entries_created + 2;

    -- OPENING_BALANCE: DR Asset (source), CR Equity (fund)
    ELSIF v_transaction_type = 'opening_balance' THEN
      -- Create debit entry (Asset)
      INSERT INTO financial_transactions (
        tenant_id, type, account_id, fund_id, source_id, category_id,
        coa_id, date, description, debit, credit, batch_id, header_id
      )
      VALUES (
        p_tenant_id, v_transaction_type, v_account_id, v_fund_id, v_source_id_line, v_category_id,
        v_source_coa_id, p_transaction_date, v_line_description, v_amount, 0, v_batch_id, v_header_id
      )
      RETURNING id INTO v_debit_tx_id;

      -- Create credit entry (Fund equity)
      INSERT INTO financial_transactions (
        tenant_id, type, account_id, fund_id, source_id, category_id,
        coa_id, date, description, debit, credit, batch_id, header_id
      )
      VALUES (
        p_tenant_id, v_transaction_type, v_account_id, v_fund_id, v_source_id_line, v_category_id,
        v_fund_coa_id, p_transaction_date, v_line_description, 0, v_amount, v_batch_id, v_header_id
      )
      RETURNING id INTO v_credit_tx_id;

      v_gl_entries_created := v_gl_entries_created + 2;

    -- TRANSFER: DR Asset (destination source), CR Asset (source)
    ELSIF v_transaction_type = 'transfer' THEN
      -- Create debit entry (Destination source asset increase)
      INSERT INTO financial_transactions (
        tenant_id, type, account_id, fund_id, source_id, category_id,
        coa_id, date, description, debit, credit, batch_id, header_id
      )
      VALUES (
        p_tenant_id, v_transaction_type, v_account_id, v_fund_id, p_destination_source_id, v_category_id,
        v_dest_source_coa_id, p_transaction_date, v_line_description, v_amount, 0, v_batch_id, v_header_id
      )
      RETURNING id INTO v_debit_tx_id;

      -- Create credit entry (Source asset decrease)
      INSERT INTO financial_transactions (
        tenant_id, type, account_id, fund_id, source_id, category_id,
        coa_id, date, description, debit, credit, batch_id, header_id
      )
      VALUES (
        p_tenant_id, v_transaction_type, v_account_id, v_fund_id, v_source_id_line, v_category_id,
        v_source_coa_id, p_transaction_date, v_line_description, 0, v_amount, v_batch_id, v_header_id
      )
      RETURNING id INTO v_credit_tx_id;

      v_gl_entries_created := v_gl_entries_created + 2;

    -- FUND_ROLLOVER: DR Equity (source fund), CR Equity (destination fund)
    ELSIF v_transaction_type = 'fund_rollover' THEN
      -- Create debit entry (Source fund equity decrease)
      INSERT INTO financial_transactions (
        tenant_id, type, account_id, fund_id, source_id, category_id,
        coa_id, date, description, debit, credit, batch_id, header_id
      )
      VALUES (
        p_tenant_id, v_transaction_type, v_account_id, v_fund_id, v_source_id_line, v_category_id,
        v_fund_coa_id, p_transaction_date, v_line_description, v_amount, 0, v_batch_id, v_header_id
      )
      RETURNING id INTO v_debit_tx_id;

      -- Create credit entry (Destination fund equity increase)
      INSERT INTO financial_transactions (
        tenant_id, type, account_id, fund_id, source_id, category_id,
        coa_id, date, description, debit, credit, batch_id, header_id
      )
      VALUES (
        p_tenant_id, v_transaction_type, v_account_id, p_destination_fund_id, v_source_id_line, v_category_id,
        v_dest_fund_coa_id, p_transaction_date, v_line_description, 0, v_amount, v_batch_id, v_header_id
      )
      RETURNING id INTO v_credit_tx_id;

      v_gl_entries_created := v_gl_entries_created + 2;

    -- REFUND: DR Revenue (category), CR Asset (source) - opposite of income
    ELSIF v_transaction_type = 'refund' THEN
      -- Create debit entry (Revenue decrease)
      INSERT INTO financial_transactions (
        tenant_id, type, account_id, fund_id, source_id, category_id,
        coa_id, date, description, debit, credit, batch_id, header_id
      )
      VALUES (
        p_tenant_id, v_transaction_type, v_account_id, v_fund_id, v_source_id_line, v_category_id,
        v_category_coa_id, p_transaction_date, v_line_description, v_amount, 0, v_batch_id, v_header_id
      )
      RETURNING id INTO v_debit_tx_id;

      -- Create credit entry (Asset decrease)
      INSERT INTO financial_transactions (
        tenant_id, type, account_id, fund_id, source_id, category_id,
        coa_id, date, description, debit, credit, batch_id, header_id
      )
      VALUES (
        p_tenant_id, v_transaction_type, v_account_id, v_fund_id, v_source_id_line, v_category_id,
        v_source_coa_id, p_transaction_date, v_line_description, 0, v_amount, v_batch_id, v_header_id
      )
      RETURNING id INTO v_credit_tx_id;

      v_gl_entries_created := v_gl_entries_created + 2;

    -- RECLASS: DR To COA, CR From COA
    ELSIF v_transaction_type = 'reclass' THEN
      -- Create debit entry (New account)
      INSERT INTO financial_transactions (
        tenant_id, type, account_id, fund_id, source_id, category_id,
        coa_id, date, description, debit, credit, batch_id, header_id
      )
      VALUES (
        p_tenant_id, v_transaction_type, v_account_id, v_fund_id, v_source_id_line, v_category_id,
        v_to_coa_id, p_transaction_date, v_line_description, v_amount, 0, v_batch_id, v_header_id
      )
      RETURNING id INTO v_debit_tx_id;

      -- Create credit entry (Old account)
      INSERT INTO financial_transactions (
        tenant_id, type, account_id, fund_id, source_id, category_id,
        coa_id, date, description, debit, credit, batch_id, header_id
      )
      VALUES (
        p_tenant_id, v_transaction_type, v_account_id, v_fund_id, v_source_id_line, v_category_id,
        v_from_coa_id, p_transaction_date, v_line_description, 0, v_amount, v_batch_id, v_header_id
      )
      RETURNING id INTO v_credit_tx_id;

      v_gl_entries_created := v_gl_entries_created + 2;

    -- ALLOCATION: DR Destination fund/expense, CR Source fund/expense
    ELSIF v_transaction_type = 'allocation' THEN
      -- Create debit entry (Destination fund)
      INSERT INTO financial_transactions (
        tenant_id, type, account_id, fund_id, source_id, category_id,
        coa_id, date, description, debit, credit, batch_id, header_id
      )
      VALUES (
        p_tenant_id, v_transaction_type, v_account_id, p_destination_fund_id, v_source_id_line, v_category_id,
        v_dest_fund_coa_id, p_transaction_date, v_line_description, v_amount, 0, v_batch_id, v_header_id
      )
      RETURNING id INTO v_debit_tx_id;

      -- Create credit entry (Source fund)
      INSERT INTO financial_transactions (
        tenant_id, type, account_id, fund_id, source_id, category_id,
        coa_id, date, description, debit, credit, batch_id, header_id
      )
      VALUES (
        p_tenant_id, v_transaction_type, v_account_id, v_fund_id, v_source_id_line, v_category_id,
        v_fund_coa_id, p_transaction_date, v_line_description, 0, v_amount, v_batch_id, v_header_id
      )
      RETURNING id INTO v_credit_tx_id;

      v_gl_entries_created := v_gl_entries_created + 2;

    -- ADJUSTMENT, REVERSAL, CLOSING_ENTRY, EXPENSE (and default)
    -- These all follow expense pattern: DR category, CR source
    ELSE
      -- Create debit entry (Expense/category)
      INSERT INTO financial_transactions (
        tenant_id, type, account_id, fund_id, source_id, category_id,
        coa_id, date, description, debit, credit, batch_id, header_id
      )
      VALUES (
        p_tenant_id, v_transaction_type, v_account_id, v_fund_id, v_source_id_line, v_category_id,
        v_category_coa_id, p_transaction_date, v_line_description, v_amount, 0, v_batch_id, v_header_id
      )
      RETURNING id INTO v_debit_tx_id;

      -- Create credit entry (Asset/source)
      INSERT INTO financial_transactions (
        tenant_id, type, account_id, fund_id, source_id, category_id,
        coa_id, date, description, debit, credit, batch_id, header_id
      )
      VALUES (
        p_tenant_id, v_transaction_type, v_account_id, v_fund_id, v_source_id_line, v_category_id,
        v_source_coa_id, p_transaction_date, v_line_description, 0, v_amount, v_batch_id, v_header_id
      )
      RETURNING id INTO v_credit_tx_id;

      v_gl_entries_created := v_gl_entries_created + 2;
    END IF;

    -- =========================================================================
    -- STEP 3b: Create income_expense_transaction record
    -- =========================================================================
    INSERT INTO income_expense_transactions (
      tenant_id,
      transaction_type,
      transaction_date,
      amount,
      description,
      reference,
      category_id,
      fund_id,
      source_id,
      account_id,
      header_id,
      line,
      destination_source_id,
      destination_fund_id,
      from_coa_id,
      to_coa_id,
      created_by
    )
    VALUES (
      p_tenant_id,
      v_transaction_type,
      p_transaction_date,
      v_amount,
      v_line_description,
      p_reference,
      v_category_id,
      v_fund_id,
      v_source_id_line,
      v_account_id,
      v_header_id,
      v_line_number,
      p_destination_source_id,
      p_destination_fund_id,
      v_from_coa_id,
      v_to_coa_id,
      p_created_by
    )
    RETURNING id INTO v_ie_tx_id;

    -- =========================================================================
    -- STEP 3c: Create mapping record
    -- =========================================================================
    INSERT INTO income_expense_transaction_mappings (
      tenant_id,
      transaction_id,
      transaction_header_id,
      debit_transaction_id,
      credit_transaction_id
    )
    VALUES (
      p_tenant_id,
      v_ie_tx_id,
      v_header_id,
      v_debit_tx_id,
      v_credit_tx_id
    );

    v_lines_created := v_lines_created + 1;
  END LOOP;

  -- =========================================================================
  -- STEP 4: Update to final status if 'posted'
  -- =========================================================================
  IF p_status = 'posted' THEN
    UPDATE financial_transaction_headers
    SET status = 'posted', updated_at = NOW()
    WHERE id = v_header_id;
  END IF;

  -- Return result
  RETURN QUERY
  SELECT
    v_header_id AS header_id,
    v_transaction_number AS header_transaction_number,
    CASE WHEN p_status = 'posted' THEN 'posted' ELSE 'draft' END AS header_status,
    v_lines_created AS lines_created,
    v_gl_entries_created AS gl_entries_created;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION create_income_expense_batch(UUID, DATE, TEXT, JSONB, TEXT, UUID, TEXT, UUID, UUID, UUID, UUID, TEXT) TO authenticated;

COMMENT ON FUNCTION create_income_expense_batch IS
  'Creates a batch of income/expense transactions with GL entries atomically. '
  'Supports all 11 transaction types: income, expense, transfer, adjustment, '
  'closing_entry, fund_rollover, reversal, allocation, reclass, refund, opening_balance.';

-- =============================================================================
-- STEP 3: Update update_income_expense_batch function
-- =============================================================================
DROP FUNCTION IF EXISTS update_income_expense_batch(UUID, UUID, JSONB, JSONB, UUID);
DROP FUNCTION IF EXISTS update_income_expense_batch(UUID, UUID, JSONB, JSONB, UUID, UUID, UUID, UUID, TEXT);

CREATE OR REPLACE FUNCTION update_income_expense_batch(
  p_tenant_id UUID,
  p_header_id UUID,
  p_header_update JSONB DEFAULT NULL,
  p_lines JSONB DEFAULT NULL,
  p_updated_by UUID DEFAULT NULL,
  -- Extended transaction type parameters
  p_destination_source_id UUID DEFAULT NULL,
  p_destination_fund_id UUID DEFAULT NULL,
  p_reference_transaction_id UUID DEFAULT NULL,
  p_adjustment_reason TEXT DEFAULT NULL
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
  v_line JSONB;
  v_line_id UUID;
  v_lines_added INTEGER := 0;
  v_lines_updated INTEGER := 0;
  v_lines_deleted INTEGER := 0;
  v_gl_entries_affected INTEGER := 0;
  v_debit_tx_id UUID;
  v_credit_tx_id UUID;
  v_ie_tx_id UUID;
  v_source_coa_id UUID;
  v_category_coa_id UUID;
  v_fund_coa_id UUID;
  v_dest_source_coa_id UUID;
  v_dest_fund_coa_id UUID;
  v_from_coa_id UUID;
  v_to_coa_id UUID;
  v_transaction_type TEXT;
  v_amount NUMERIC;
  v_line_description TEXT;
  v_category_id UUID;
  v_fund_id UUID;
  v_source_id_line UUID;
  v_account_id UUID;
  v_batch_id UUID;
  v_line_number INTEGER;
  v_is_dirty BOOLEAN;
  v_is_deleted BOOLEAN;
  v_transaction_date DATE;
  v_header_description TEXT;
  v_header_reference TEXT;
  -- COA lookups
  v_category_coa_map JSONB := '{}';
  v_source_coa_map JSONB := '{}';
  v_fund_coa_map JSONB := '{}';
  v_coa_record RECORD;
BEGIN
  -- =========================================================================
  -- STEP 1: Get header data for lines
  -- =========================================================================
  SELECT transaction_date, description, reference
  INTO v_transaction_date, v_header_description, v_header_reference
  FROM financial_transaction_headers
  WHERE id = p_header_id AND tenant_id = p_tenant_id;

  IF v_transaction_date IS NULL THEN
    RAISE EXCEPTION 'Header not found: %', p_header_id;
  END IF;

  -- =========================================================================
  -- STEP 2: Update header if provided
  -- =========================================================================
  IF p_header_update IS NOT NULL THEN
    UPDATE financial_transaction_headers
    SET
      transaction_date = COALESCE((p_header_update->>'transaction_date')::DATE, transaction_date),
      description = COALESCE(p_header_update->>'description', description),
      reference = COALESCE(p_header_update->>'reference', reference),
      status = COALESCE(p_header_update->>'status', status),
      reference_transaction_id = COALESCE(p_reference_transaction_id, reference_transaction_id),
      adjustment_reason = COALESCE(p_adjustment_reason, adjustment_reason),
      updated_at = NOW()
    WHERE id = p_header_id AND tenant_id = p_tenant_id;

    -- Update local variables with new values
    v_transaction_date := COALESCE((p_header_update->>'transaction_date')::DATE, v_transaction_date);
    v_header_description := COALESCE(p_header_update->>'description', v_header_description);
    v_header_reference := COALESCE(p_header_update->>'reference', v_header_reference);
  END IF;

  -- Exit early if no lines to process
  IF p_lines IS NULL OR jsonb_array_length(p_lines) = 0 THEN
    RETURN QUERY SELECT p_header_id, v_lines_added, v_lines_updated, v_lines_deleted, v_gl_entries_affected;
    RETURN;
  END IF;

  -- =========================================================================
  -- STEP 3: Batch-resolve COA IDs
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
        UNION
        SELECT p_destination_source_id WHERE p_destination_source_id IS NOT NULL
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
        UNION
        SELECT p_destination_fund_id WHERE p_destination_fund_id IS NOT NULL
      )
  LOOP
    v_fund_coa_map := v_fund_coa_map || jsonb_build_object(v_coa_record.id::TEXT, v_coa_record.coa_id);
  END LOOP;

  -- Get destination COA IDs
  IF p_destination_source_id IS NOT NULL THEN
    v_dest_source_coa_id := (v_source_coa_map->>p_destination_source_id::TEXT)::UUID;
  END IF;

  IF p_destination_fund_id IS NOT NULL THEN
    v_dest_fund_coa_id := (v_fund_coa_map->>p_destination_fund_id::TEXT)::UUID;
  END IF;

  -- =========================================================================
  -- STEP 4: Process each line
  -- =========================================================================
  FOR v_line IN SELECT * FROM jsonb_array_elements(p_lines)
  LOOP
    v_line_id := NULLIF(v_line->>'id', '')::UUID;
    v_is_dirty := COALESCE((v_line->>'isDirty')::BOOLEAN, FALSE);
    v_is_deleted := COALESCE((v_line->>'isDeleted')::BOOLEAN, FALSE);

    -- Extract line data
    v_transaction_type := v_line->>'transaction_type';
    v_amount := (v_line->>'amount')::NUMERIC;
    v_line_description := COALESCE(NULLIF(TRIM(v_line->>'description'), ''), v_header_description);
    v_category_id := NULLIF(v_line->>'category_id', '')::UUID;
    v_fund_id := NULLIF(v_line->>'fund_id', '')::UUID;
    v_source_id_line := NULLIF(v_line->>'source_id', '')::UUID;
    v_account_id := NULLIF(v_line->>'account_id', '')::UUID;
    v_batch_id := NULLIF(v_line->>'batch_id', '')::UUID;
    v_line_number := (v_line->>'line')::INTEGER;
    v_from_coa_id := NULLIF(v_line->>'from_coa_id', '')::UUID;
    v_to_coa_id := NULLIF(v_line->>'to_coa_id', '')::UUID;

    -- Resolve COA IDs from maps
    v_category_coa_id := (v_category_coa_map->>COALESCE(v_category_id::TEXT, ''))::UUID;
    v_source_coa_id := (v_source_coa_map->>COALESCE(v_source_id_line::TEXT, ''))::UUID;
    v_fund_coa_id := (v_fund_coa_map->>COALESCE(v_fund_id::TEXT, ''))::UUID;

    -- =========================================================================
    -- HANDLE DELETE
    -- =========================================================================
    IF v_is_deleted AND v_line_id IS NOT NULL THEN
      -- Delete GL entries via mapping
      DELETE FROM financial_transactions
      WHERE id IN (
        SELECT debit_transaction_id FROM income_expense_transaction_mappings WHERE transaction_id = v_line_id
        UNION
        SELECT credit_transaction_id FROM income_expense_transaction_mappings WHERE transaction_id = v_line_id
      );
      v_gl_entries_affected := v_gl_entries_affected + 2;

      -- Delete mapping
      DELETE FROM income_expense_transaction_mappings WHERE transaction_id = v_line_id;

      -- Delete line
      DELETE FROM income_expense_transactions WHERE id = v_line_id;
      v_lines_deleted := v_lines_deleted + 1;

    -- =========================================================================
    -- HANDLE UPDATE
    -- =========================================================================
    ELSIF v_is_dirty AND v_line_id IS NOT NULL THEN
      -- Update income_expense_transaction
      UPDATE income_expense_transactions
      SET
        transaction_type = v_transaction_type,
        amount = v_amount,
        description = v_line_description,
        category_id = v_category_id,
        fund_id = v_fund_id,
        source_id = v_source_id_line,
        account_id = v_account_id,
        destination_source_id = p_destination_source_id,
        destination_fund_id = p_destination_fund_id,
        from_coa_id = v_from_coa_id,
        to_coa_id = v_to_coa_id,
        updated_at = NOW()
      WHERE id = v_line_id;

      -- Get mapping for GL updates
      SELECT debit_transaction_id, credit_transaction_id
      INTO v_debit_tx_id, v_credit_tx_id
      FROM income_expense_transaction_mappings
      WHERE transaction_id = v_line_id;

      -- Update GL entries based on transaction type
      IF v_transaction_type = 'income' THEN
        UPDATE financial_transactions SET coa_id = v_source_coa_id, debit = v_amount, credit = 0, description = v_line_description WHERE id = v_debit_tx_id;
        UPDATE financial_transactions SET coa_id = v_category_coa_id, debit = 0, credit = v_amount, description = v_line_description WHERE id = v_credit_tx_id;
      ELSIF v_transaction_type = 'opening_balance' THEN
        UPDATE financial_transactions SET coa_id = v_source_coa_id, debit = v_amount, credit = 0, description = v_line_description WHERE id = v_debit_tx_id;
        UPDATE financial_transactions SET coa_id = v_fund_coa_id, debit = 0, credit = v_amount, description = v_line_description WHERE id = v_credit_tx_id;
      ELSIF v_transaction_type = 'transfer' THEN
        UPDATE financial_transactions SET coa_id = v_dest_source_coa_id, debit = v_amount, credit = 0, description = v_line_description WHERE id = v_debit_tx_id;
        UPDATE financial_transactions SET coa_id = v_source_coa_id, debit = 0, credit = v_amount, description = v_line_description WHERE id = v_credit_tx_id;
      ELSIF v_transaction_type = 'fund_rollover' THEN
        UPDATE financial_transactions SET coa_id = v_fund_coa_id, debit = v_amount, credit = 0, description = v_line_description WHERE id = v_debit_tx_id;
        UPDATE financial_transactions SET coa_id = v_dest_fund_coa_id, debit = 0, credit = v_amount, description = v_line_description WHERE id = v_credit_tx_id;
      ELSIF v_transaction_type = 'refund' THEN
        UPDATE financial_transactions SET coa_id = v_category_coa_id, debit = v_amount, credit = 0, description = v_line_description WHERE id = v_debit_tx_id;
        UPDATE financial_transactions SET coa_id = v_source_coa_id, debit = 0, credit = v_amount, description = v_line_description WHERE id = v_credit_tx_id;
      ELSIF v_transaction_type = 'reclass' THEN
        UPDATE financial_transactions SET coa_id = v_to_coa_id, debit = v_amount, credit = 0, description = v_line_description WHERE id = v_debit_tx_id;
        UPDATE financial_transactions SET coa_id = v_from_coa_id, debit = 0, credit = v_amount, description = v_line_description WHERE id = v_credit_tx_id;
      ELSIF v_transaction_type = 'allocation' THEN
        UPDATE financial_transactions SET coa_id = v_dest_fund_coa_id, debit = v_amount, credit = 0, description = v_line_description WHERE id = v_debit_tx_id;
        UPDATE financial_transactions SET coa_id = v_fund_coa_id, debit = 0, credit = v_amount, description = v_line_description WHERE id = v_credit_tx_id;
      ELSE
        -- expense, adjustment, reversal, closing_entry
        UPDATE financial_transactions SET coa_id = v_category_coa_id, debit = v_amount, credit = 0, description = v_line_description WHERE id = v_debit_tx_id;
        UPDATE financial_transactions SET coa_id = v_source_coa_id, debit = 0, credit = v_amount, description = v_line_description WHERE id = v_credit_tx_id;
      END IF;

      v_lines_updated := v_lines_updated + 1;
      v_gl_entries_affected := v_gl_entries_affected + 2;

    -- =========================================================================
    -- HANDLE NEW LINE (no id or not dirty existing line)
    -- =========================================================================
    ELSIF v_line_id IS NULL THEN
      -- Create GL entries based on transaction type (same logic as create)
      IF v_transaction_type = 'income' THEN
        INSERT INTO financial_transactions (tenant_id, type, account_id, fund_id, source_id, category_id, coa_id, date, description, debit, credit, batch_id, header_id)
        VALUES (p_tenant_id, v_transaction_type, v_account_id, v_fund_id, v_source_id_line, v_category_id, v_source_coa_id, v_transaction_date, v_line_description, v_amount, 0, v_batch_id, p_header_id)
        RETURNING id INTO v_debit_tx_id;
        INSERT INTO financial_transactions (tenant_id, type, account_id, fund_id, source_id, category_id, coa_id, date, description, debit, credit, batch_id, header_id)
        VALUES (p_tenant_id, v_transaction_type, v_account_id, v_fund_id, v_source_id_line, v_category_id, v_category_coa_id, v_transaction_date, v_line_description, 0, v_amount, v_batch_id, p_header_id)
        RETURNING id INTO v_credit_tx_id;
      ELSIF v_transaction_type = 'opening_balance' THEN
        INSERT INTO financial_transactions (tenant_id, type, account_id, fund_id, source_id, category_id, coa_id, date, description, debit, credit, batch_id, header_id)
        VALUES (p_tenant_id, v_transaction_type, v_account_id, v_fund_id, v_source_id_line, v_category_id, v_source_coa_id, v_transaction_date, v_line_description, v_amount, 0, v_batch_id, p_header_id)
        RETURNING id INTO v_debit_tx_id;
        INSERT INTO financial_transactions (tenant_id, type, account_id, fund_id, source_id, category_id, coa_id, date, description, debit, credit, batch_id, header_id)
        VALUES (p_tenant_id, v_transaction_type, v_account_id, v_fund_id, v_source_id_line, v_category_id, v_fund_coa_id, v_transaction_date, v_line_description, 0, v_amount, v_batch_id, p_header_id)
        RETURNING id INTO v_credit_tx_id;
      ELSIF v_transaction_type = 'transfer' THEN
        INSERT INTO financial_transactions (tenant_id, type, account_id, fund_id, source_id, category_id, coa_id, date, description, debit, credit, batch_id, header_id)
        VALUES (p_tenant_id, v_transaction_type, v_account_id, v_fund_id, p_destination_source_id, v_category_id, v_dest_source_coa_id, v_transaction_date, v_line_description, v_amount, 0, v_batch_id, p_header_id)
        RETURNING id INTO v_debit_tx_id;
        INSERT INTO financial_transactions (tenant_id, type, account_id, fund_id, source_id, category_id, coa_id, date, description, debit, credit, batch_id, header_id)
        VALUES (p_tenant_id, v_transaction_type, v_account_id, v_fund_id, v_source_id_line, v_category_id, v_source_coa_id, v_transaction_date, v_line_description, 0, v_amount, v_batch_id, p_header_id)
        RETURNING id INTO v_credit_tx_id;
      ELSIF v_transaction_type = 'fund_rollover' THEN
        INSERT INTO financial_transactions (tenant_id, type, account_id, fund_id, source_id, category_id, coa_id, date, description, debit, credit, batch_id, header_id)
        VALUES (p_tenant_id, v_transaction_type, v_account_id, v_fund_id, v_source_id_line, v_category_id, v_fund_coa_id, v_transaction_date, v_line_description, v_amount, 0, v_batch_id, p_header_id)
        RETURNING id INTO v_debit_tx_id;
        INSERT INTO financial_transactions (tenant_id, type, account_id, fund_id, source_id, category_id, coa_id, date, description, debit, credit, batch_id, header_id)
        VALUES (p_tenant_id, v_transaction_type, v_account_id, p_destination_fund_id, v_source_id_line, v_category_id, v_dest_fund_coa_id, v_transaction_date, v_line_description, 0, v_amount, v_batch_id, p_header_id)
        RETURNING id INTO v_credit_tx_id;
      ELSIF v_transaction_type = 'refund' THEN
        INSERT INTO financial_transactions (tenant_id, type, account_id, fund_id, source_id, category_id, coa_id, date, description, debit, credit, batch_id, header_id)
        VALUES (p_tenant_id, v_transaction_type, v_account_id, v_fund_id, v_source_id_line, v_category_id, v_category_coa_id, v_transaction_date, v_line_description, v_amount, 0, v_batch_id, p_header_id)
        RETURNING id INTO v_debit_tx_id;
        INSERT INTO financial_transactions (tenant_id, type, account_id, fund_id, source_id, category_id, coa_id, date, description, debit, credit, batch_id, header_id)
        VALUES (p_tenant_id, v_transaction_type, v_account_id, v_fund_id, v_source_id_line, v_category_id, v_source_coa_id, v_transaction_date, v_line_description, 0, v_amount, v_batch_id, p_header_id)
        RETURNING id INTO v_credit_tx_id;
      ELSIF v_transaction_type = 'reclass' THEN
        INSERT INTO financial_transactions (tenant_id, type, account_id, fund_id, source_id, category_id, coa_id, date, description, debit, credit, batch_id, header_id)
        VALUES (p_tenant_id, v_transaction_type, v_account_id, v_fund_id, v_source_id_line, v_category_id, v_to_coa_id, v_transaction_date, v_line_description, v_amount, 0, v_batch_id, p_header_id)
        RETURNING id INTO v_debit_tx_id;
        INSERT INTO financial_transactions (tenant_id, type, account_id, fund_id, source_id, category_id, coa_id, date, description, debit, credit, batch_id, header_id)
        VALUES (p_tenant_id, v_transaction_type, v_account_id, v_fund_id, v_source_id_line, v_category_id, v_from_coa_id, v_transaction_date, v_line_description, 0, v_amount, v_batch_id, p_header_id)
        RETURNING id INTO v_credit_tx_id;
      ELSIF v_transaction_type = 'allocation' THEN
        INSERT INTO financial_transactions (tenant_id, type, account_id, fund_id, source_id, category_id, coa_id, date, description, debit, credit, batch_id, header_id)
        VALUES (p_tenant_id, v_transaction_type, v_account_id, p_destination_fund_id, v_source_id_line, v_category_id, v_dest_fund_coa_id, v_transaction_date, v_line_description, v_amount, 0, v_batch_id, p_header_id)
        RETURNING id INTO v_debit_tx_id;
        INSERT INTO financial_transactions (tenant_id, type, account_id, fund_id, source_id, category_id, coa_id, date, description, debit, credit, batch_id, header_id)
        VALUES (p_tenant_id, v_transaction_type, v_account_id, v_fund_id, v_source_id_line, v_category_id, v_fund_coa_id, v_transaction_date, v_line_description, 0, v_amount, v_batch_id, p_header_id)
        RETURNING id INTO v_credit_tx_id;
      ELSE
        -- expense, adjustment, reversal, closing_entry
        INSERT INTO financial_transactions (tenant_id, type, account_id, fund_id, source_id, category_id, coa_id, date, description, debit, credit, batch_id, header_id)
        VALUES (p_tenant_id, v_transaction_type, v_account_id, v_fund_id, v_source_id_line, v_category_id, v_category_coa_id, v_transaction_date, v_line_description, v_amount, 0, v_batch_id, p_header_id)
        RETURNING id INTO v_debit_tx_id;
        INSERT INTO financial_transactions (tenant_id, type, account_id, fund_id, source_id, category_id, coa_id, date, description, debit, credit, batch_id, header_id)
        VALUES (p_tenant_id, v_transaction_type, v_account_id, v_fund_id, v_source_id_line, v_category_id, v_source_coa_id, v_transaction_date, v_line_description, 0, v_amount, v_batch_id, p_header_id)
        RETURNING id INTO v_credit_tx_id;
      END IF;

      -- Create income_expense_transaction
      INSERT INTO income_expense_transactions (
        tenant_id, transaction_type, transaction_date, amount, description, reference,
        category_id, fund_id, source_id, account_id, header_id, line,
        destination_source_id, destination_fund_id, from_coa_id, to_coa_id, created_by
      )
      VALUES (
        p_tenant_id, v_transaction_type, v_transaction_date, v_amount, v_line_description, v_header_reference,
        v_category_id, v_fund_id, v_source_id_line, v_account_id, p_header_id, v_line_number,
        p_destination_source_id, p_destination_fund_id, v_from_coa_id, v_to_coa_id, p_updated_by
      )
      RETURNING id INTO v_ie_tx_id;

      -- Create mapping
      INSERT INTO income_expense_transaction_mappings (tenant_id, transaction_id, transaction_header_id, debit_transaction_id, credit_transaction_id)
      VALUES (p_tenant_id, v_ie_tx_id, p_header_id, v_debit_tx_id, v_credit_tx_id);

      v_lines_added := v_lines_added + 1;
      v_gl_entries_affected := v_gl_entries_affected + 2;
    END IF;
  END LOOP;

  -- Return result
  RETURN QUERY
  SELECT p_header_id, v_lines_added, v_lines_updated, v_lines_deleted, v_gl_entries_affected;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION update_income_expense_batch(UUID, UUID, JSONB, JSONB, UUID, UUID, UUID, UUID, TEXT) TO authenticated;

COMMENT ON FUNCTION update_income_expense_batch IS
  'Updates a batch of income/expense transactions with GL entries atomically. '
  'Supports all 11 transaction types with proper double-entry accounting patterns.';

-- =============================================================================
-- Success confirmation
-- =============================================================================
DO $$
BEGIN
  RAISE NOTICE 'Migration completed: Updated income/expense batch RPC functions for all transaction types';
END $$;

COMMIT;
