-- =============================================================================
-- Migration: Fix Income/Expense Batch RPC - Add Transaction Number Generation
-- =============================================================================
-- Adds transaction_number generation logic to the create_income_expense_batch
-- RPC function. The original version didn't generate transaction numbers,
-- causing NOT NULL constraint violations.
-- =============================================================================

BEGIN;

-- Drop existing function
DROP FUNCTION IF EXISTS create_income_expense_batch(UUID, DATE, TEXT, JSONB, TEXT, UUID, TEXT, UUID);

CREATE OR REPLACE FUNCTION create_income_expense_batch(
  p_tenant_id UUID,
  p_transaction_date DATE,
  p_description TEXT,
  p_lines JSONB,  -- Array of line objects (required, before optional params)
  p_reference TEXT DEFAULT NULL,
  p_source_id UUID DEFAULT NULL,
  p_status TEXT DEFAULT 'draft',
  p_created_by UUID DEFAULT NULL
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
  -- Transaction number generation
  v_prefix TEXT;
  v_year TEXT;
  v_month TEXT;
  v_sequence INTEGER;
  v_last_number TEXT;
BEGIN
  -- =========================================================================
  -- STEP 1: Generate transaction number
  -- =========================================================================
  -- Determine prefix based on status
  v_prefix := CASE p_status
    WHEN 'draft' THEN 'DFT'
    WHEN 'submitted' THEN 'SUB'
    WHEN 'approved' THEN 'APR'
    WHEN 'posted' THEN 'TRX'
    ELSE 'DFT'
  END;

  -- Extract year and month from transaction date
  v_year := TO_CHAR(p_transaction_date, 'YYYY');
  v_month := TO_CHAR(p_transaction_date, 'MM');

  -- Get current sequence for this month
  SELECT transaction_number INTO v_last_number
  FROM financial_transaction_headers
  WHERE tenant_id = p_tenant_id
    AND transaction_number ILIKE v_prefix || '-' || v_year || v_month || '-%'
  ORDER BY transaction_number DESC
  LIMIT 1;

  IF v_last_number IS NOT NULL THEN
    v_sequence := COALESCE(
      NULLIF(SPLIT_PART(v_last_number, '-', 3), '')::INTEGER,
      0
    ) + 1;
  ELSE
    v_sequence := 1;
  END IF;

  v_transaction_number := v_prefix || '-' || v_year || v_month || '-' || LPAD(v_sequence::TEXT, 4, '0');

  -- =========================================================================
  -- STEP 2: Create header with generated transaction number
  -- =========================================================================
  INSERT INTO financial_transaction_headers (
    tenant_id,
    transaction_number,
    transaction_date,
    description,
    reference,
    source_id,
    status,
    created_by
  )
  VALUES (
    p_tenant_id,
    v_transaction_number,
    p_transaction_date,
    p_description,
    p_reference,
    p_source_id,
    'draft', -- Always start as draft
    p_created_by
  )
  RETURNING id INTO v_header_id;

  -- =========================================================================
  -- STEP 3: Batch-resolve COA IDs for all categories, sources, and funds
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
  -- STEP 4: Process each line
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

    -- Resolve COA IDs from maps
    v_category_coa_id := (v_category_coa_map->>COALESCE(v_category_id::TEXT, ''))::UUID;
    v_source_coa_id := (v_source_coa_map->>COALESCE(v_source_id_line::TEXT, ''))::UUID;
    v_fund_coa_id := (v_fund_coa_map->>COALESCE(v_fund_id::TEXT, ''))::UUID;

    -- =========================================================================
    -- STEP 4a: Create GL entries based on transaction type
    -- =========================================================================
    IF v_transaction_type = 'income' THEN
      -- Income: Debit source_coa_id (asset), Credit category_coa_id (revenue)
      -- Create debit entry
      INSERT INTO financial_transactions (
        tenant_id, type, account_id, fund_id, source_id, category_id,
        coa_id, date, description, debit, credit, batch_id, header_id
      )
      VALUES (
        p_tenant_id, v_transaction_type, v_account_id, v_fund_id, v_source_id_line, v_category_id,
        v_source_coa_id, p_transaction_date, v_line_description, v_amount, 0, v_batch_id, v_header_id
      )
      RETURNING id INTO v_debit_tx_id;

      -- Create credit entry
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

    ELSIF v_transaction_type = 'opening_balance' THEN
      -- Opening balance: Debit source_coa_id (asset), Credit fund_coa_id (equity)
      -- Create debit entry
      INSERT INTO financial_transactions (
        tenant_id, type, account_id, fund_id, source_id, category_id,
        coa_id, date, description, debit, credit, batch_id, header_id
      )
      VALUES (
        p_tenant_id, v_transaction_type, v_account_id, v_fund_id, v_source_id_line, v_category_id,
        v_source_coa_id, p_transaction_date, v_line_description, v_amount, 0, v_batch_id, v_header_id
      )
      RETURNING id INTO v_debit_tx_id;

      -- Create credit entry
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

    ELSE
      -- Expense (default): Debit category_coa_id (expense), Credit source_coa_id (asset)
      -- Create debit entry
      INSERT INTO financial_transactions (
        tenant_id, type, account_id, fund_id, source_id, category_id,
        coa_id, date, description, debit, credit, batch_id, header_id
      )
      VALUES (
        p_tenant_id, v_transaction_type, v_account_id, v_fund_id, v_source_id_line, v_category_id,
        v_category_coa_id, p_transaction_date, v_line_description, v_amount, 0, v_batch_id, v_header_id
      )
      RETURNING id INTO v_debit_tx_id;

      -- Create credit entry
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
    -- STEP 4b: Create income_expense_transaction record
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
      p_created_by
    )
    RETURNING id INTO v_ie_tx_id;

    -- =========================================================================
    -- STEP 4c: Create mapping record
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
  -- STEP 5: Update to final status if 'posted'
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
GRANT EXECUTE ON FUNCTION create_income_expense_batch(UUID, DATE, TEXT, JSONB, TEXT, UUID, TEXT, UUID) TO authenticated;

COMMENT ON FUNCTION create_income_expense_batch IS
  'Creates a batch of income/expense transactions with GL entries atomically. '
  'Generates transaction numbers in the format PREFIX-YYYYMM-SEQUENCE. '
  'Replaces ~200+ sequential database calls with a single RPC call for batch processing.';

COMMIT;
