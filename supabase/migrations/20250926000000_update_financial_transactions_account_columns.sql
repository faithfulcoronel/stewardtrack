-- NOTE: This migration is irreversible because dropping member_id removes existing data.

-- Ensure account links exist on financial transactions before removing member references
UPDATE financial_transactions ft
SET accounts_account_id = a.id
FROM accounts a
WHERE ft.accounts_account_id IS NULL
  AND ft.member_id = a.member_id
  AND ft.tenant_id = a.tenant_id
  AND a.deleted_at IS NULL;

-- Drop dependent functions so they can be recreated without financial_transactions.member_id
DROP FUNCTION IF EXISTS refresh_member_giving_profile(uuid, uuid, date, uuid);
DROP FUNCTION IF EXISTS process_member_giving_profile_transaction(text, jsonb, jsonb);
DROP FUNCTION IF EXISTS process_member_giving_transaction(text, jsonb, jsonb);
DROP FUNCTION IF EXISTS report_trial_balance(uuid, date);
DROP FUNCTION IF EXISTS report_general_ledger(uuid, date, date, uuid);
DROP FUNCTION IF EXISTS report_journal(uuid, date, date);
DROP FUNCTION IF EXISTS report_income_statement(uuid, date, date);
DROP FUNCTION IF EXISTS report_budget_vs_actual(uuid, date, date);
DROP FUNCTION IF EXISTS report_fund_summary(uuid, date, date);
DROP FUNCTION IF EXISTS report_member_giving_summary(uuid, date, date, uuid);
DROP FUNCTION IF EXISTS report_offering_summary(uuid, date, date);
DROP FUNCTION IF EXISTS report_category_financial(uuid, date, date, uuid);
DROP FUNCTION IF EXISTS report_cash_flow_summary(uuid, date, date);
DROP FUNCTION IF EXISTS report_church_financial_statement(uuid, date, date);
DROP FUNCTION IF EXISTS get_member_statement(date, date, uuid[], integer, integer);
DROP FUNCTION IF EXISTS finance_monthly_stats(uuid, date, date);
DROP VIEW IF EXISTS finance_monthly_trends CASCADE;
DROP VIEW IF EXISTS fund_balances_view CASCADE;

-- Drop the legacy member reference
ALTER TABLE financial_transactions
  DROP COLUMN IF EXISTS member_id;

-- Rename chart of account reference to coa_id first to avoid conflicts
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'financial_transactions'
      AND column_name = 'account_id'
  ) THEN
    ALTER TABLE financial_transactions
      RENAME COLUMN account_id TO coa_id;
  END IF;
END$$;

-- Rename accounts reference to account_id
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'financial_transactions'
      AND column_name = 'accounts_account_id'
  ) THEN
    ALTER TABLE financial_transactions
      RENAME COLUMN accounts_account_id TO account_id;
  END IF;
END$$;

-- Align index names with the new columns
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_class WHERE relname = 'financial_transactions_account_id_idx'
  ) THEN
    ALTER INDEX financial_transactions_account_id_idx
      RENAME TO financial_transactions_coa_id_idx;
  END IF;
END$$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_class WHERE relname = 'financial_transactions_accounts_account_id_idx'
  ) THEN
    ALTER INDEX financial_transactions_accounts_account_id_idx
      RENAME TO financial_transactions_account_id_idx;
  END IF;
END$$;

-- Rename foreign key constraints if they exist
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_schema = 'public'
      AND table_name = 'financial_transactions'
      AND constraint_name = 'financial_transactions_account_id_fkey'
  ) THEN
    ALTER TABLE financial_transactions
      RENAME CONSTRAINT financial_transactions_account_id_fkey
      TO financial_transactions_coa_id_fkey;
  END IF;
END$$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_schema = 'public'
      AND table_name = 'financial_transactions'
      AND constraint_name = 'financial_transactions_accounts_account_id_fkey'
  ) THEN
    ALTER TABLE financial_transactions
      RENAME CONSTRAINT financial_transactions_accounts_account_id_fkey
      TO financial_transactions_account_id_fkey;
  END IF;
END$$;

-- Refresh column comments so documentation matches the new names
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'financial_transactions'
      AND column_name = 'coa_id'
  ) THEN
    COMMENT ON COLUMN financial_transactions.coa_id IS 'Reference to the chart of accounts';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'financial_transactions'
      AND column_name = 'account_id'
  ) THEN
    COMMENT ON COLUMN financial_transactions.account_id IS 'Reference to the accounts';
  END IF;
END$$;

-- Recreate refresh_member_giving_profile to rely on header member references
CREATE OR REPLACE FUNCTION refresh_member_giving_profile(
  p_member_id uuid,
  p_tenant_id uuid,
  p_reference_date date DEFAULT current_date,
  p_user_id uuid DEFAULT NULL
) RETURNS member_giving_profiles
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_year integer := date_part('year', COALESCE(p_reference_date, current_date))::integer;
  v_now timestamptz := now();
  v_user_id uuid := COALESCE(p_user_id, auth.uid());
  v_ytd_amount numeric(12,2);
  v_last_amount numeric(12,2);
  v_last_date date;
  v_last_fund text;
  v_last_source text;
  v_profile member_giving_profiles%ROWTYPE;
BEGIN
  -- Sum posted, non-voided credit activity for the requested year
  SELECT COALESCE(SUM(ft.credit), 0)
  INTO v_ytd_amount
  FROM financial_transactions ft
  JOIN financial_transaction_headers h ON h.id = ft.header_id
  JOIN accounts a ON a.id = ft.account_id
  WHERE a.member_id = p_member_id
    AND ft.tenant_id = p_tenant_id
    AND h.tenant_id = p_tenant_id
    AND a.tenant_id = p_tenant_id
    AND ft.deleted_at IS NULL
    AND h.deleted_at IS NULL
    AND a.deleted_at IS NULL
    AND h.status <> 'voided'
    AND ft.credit > 0
    AND date_part('year', ft.date) = v_year;

  -- Capture the most recent credit entry for last gift insights
  SELECT ft.credit,
         ft.date,
         f.name,
         s.name
  INTO v_last_amount,
       v_last_date,
       v_last_fund,
       v_last_source
  FROM financial_transactions ft
  JOIN financial_transaction_headers h ON h.id = ft.header_id
  JOIN accounts a ON a.id = ft.account_id
  LEFT JOIN funds f ON f.id = ft.fund_id
  LEFT JOIN financial_sources s ON s.id = ft.source_id
  WHERE a.member_id = p_member_id
    AND ft.tenant_id = p_tenant_id
    AND h.tenant_id = p_tenant_id
    AND a.tenant_id = p_tenant_id
    AND ft.deleted_at IS NULL
    AND h.deleted_at IS NULL
    AND a.deleted_at IS NULL
    AND h.status <> 'voided'
    AND ft.credit > 0
  ORDER BY ft.date DESC, ft.created_at DESC
  LIMIT 1;

  INSERT INTO member_giving_profiles (
    tenant_id,
    member_id,
    ytd_year,
    ytd_amount,
    last_gift_amount,
    last_gift_at,
    last_gift_fund,
    last_gift_source,
    created_at,
    created_by,
    updated_at,
    updated_by
  ) VALUES (
    p_tenant_id,
    p_member_id,
    v_year,
    v_ytd_amount,
    v_last_amount,
    v_last_date,
    v_last_fund,
    v_last_source,
    v_now,
    v_user_id,
    v_now,
    v_user_id
  )
  ON CONFLICT (member_id, ytd_year) WHERE deleted_at IS NULL
  DO UPDATE SET
    ytd_amount = EXCLUDED.ytd_amount,
    last_gift_amount = EXCLUDED.last_gift_amount,
    last_gift_at = EXCLUDED.last_gift_at,
    last_gift_fund = EXCLUDED.last_gift_fund,
    last_gift_source = EXCLUDED.last_gift_source,
    updated_at = v_now,
    updated_by = v_user_id
  RETURNING * INTO v_profile;

  UPDATE members
  SET giving_last_gift_amount = v_profile.last_gift_amount,
      giving_last_gift_at = v_profile.last_gift_at,
      giving_last_gift_fund = v_profile.last_gift_fund,
      giving_recurring_amount = COALESCE(v_profile.recurring_amount, giving_recurring_amount),
      giving_recurring_frequency = COALESCE(v_profile.recurring_frequency, giving_recurring_frequency),
      giving_recurring_method = COALESCE(v_profile.recurring_method, giving_recurring_method),
      giving_pledge_amount = COALESCE(v_profile.pledge_amount, giving_pledge_amount),
      giving_pledge_campaign = COALESCE(v_profile.pledge_campaign, giving_pledge_campaign)
  WHERE id = p_member_id
    AND tenant_id = p_tenant_id
    AND deleted_at IS NULL;

  RETURN v_profile;
END;
$$;

COMMENT ON FUNCTION refresh_member_giving_profile(uuid, uuid, date, uuid) IS 'Recalculates YTD totals and last gift details for a member giving profile based on posted ledger activity.';

GRANT EXECUTE ON FUNCTION refresh_member_giving_profile(uuid, uuid, date, uuid) TO authenticated;

-- Recreate process_member_giving_transaction to use account-based member references and new column names
CREATE OR REPLACE FUNCTION process_member_giving_transaction(
  p_operation text,
  p_transaction jsonb,
  p_profile jsonb DEFAULT '{}'::jsonb
) RETURNS jsonb
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_operation text := lower(trim(p_operation));
  v_now timestamptz := now();
  v_user_id uuid := COALESCE((p_transaction->>'user_id')::uuid, auth.uid());
  v_tenant_id uuid;
  v_member_id uuid;
  v_header_id uuid;
  v_transaction_date date;
  v_description text;
  v_reference text;
  v_income_account_id uuid;
  v_cash_account_id uuid;
  v_category_id uuid;
  v_fund_id uuid;
  v_source_id uuid;
  v_amount numeric(12,2);
  v_transaction_number text;
  v_member_first text;
  v_member_last text;
  v_member_label text;
  v_existing_header financial_transaction_headers%ROWTYPE;
  v_existing_member_id uuid;
  v_existing_member_account_id uuid;
  v_member_account_id uuid;
  v_credit_row financial_transactions%ROWTYPE;
  v_debit_row financial_transactions%ROWTYPE;
  v_profile_row member_giving_profiles%ROWTYPE;
  v_result jsonb;
  v_reference_date date;
BEGIN
  IF v_operation NOT IN ('create', 'update', 'delete') THEN
    RAISE EXCEPTION 'Unsupported operation: %', p_operation;
  END IF;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authenticated user context is required';
  END IF;

  IF v_operation = 'create' THEN
    v_tenant_id := (p_transaction->>'tenant_id')::uuid;
    v_member_id := (p_transaction->>'member_id')::uuid;

    IF v_tenant_id IS NULL THEN
      RAISE EXCEPTION 'tenant_id is required for create operations';
    END IF;

    IF v_member_id IS NULL THEN
      RAISE EXCEPTION 'member_id is required for create operations';
    END IF;
  ELSE
    v_header_id := (p_transaction->>'header_id')::uuid;
    IF v_header_id IS NULL THEN
      RAISE EXCEPTION 'header_id is required for % operations', v_operation;
    END IF;

    SELECT *
    INTO v_existing_header
    FROM financial_transaction_headers h
    WHERE h.id = v_header_id
      AND h.deleted_at IS NULL
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Financial transaction header % not found', v_header_id;
    END IF;

    IF v_existing_header.status = 'voided' AND v_operation <> 'delete' THEN
      RAISE EXCEPTION 'Cannot update voided financial transaction header %', v_header_id;
    END IF;

    v_tenant_id := v_existing_header.tenant_id;

    SELECT a.member_id, ft.account_id
    INTO v_existing_member_id, v_existing_member_account_id
    FROM financial_transactions ft
    JOIN accounts a ON a.id = ft.account_id
    WHERE ft.header_id = v_header_id
      AND ft.credit > 0
      AND ft.deleted_at IS NULL
      AND a.deleted_at IS NULL
    ORDER BY ft.date DESC, ft.created_at DESC
    LIMIT 1;

    v_member_id := COALESCE((p_transaction->>'member_id')::uuid, v_existing_member_id);

    IF v_member_id IS NULL THEN
      RAISE EXCEPTION 'member_id could not be resolved for header %', v_header_id;
    END IF;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM tenant_users tu
    WHERE tu.tenant_id = v_tenant_id
      AND tu.user_id = v_user_id
  ) THEN
    RAISE EXCEPTION 'User % is not authorized for tenant %', v_user_id, v_tenant_id;
  END IF;

  SELECT m.first_name, m.last_name
  INTO v_member_first, v_member_last
  FROM members m
  WHERE m.id = v_member_id
    AND m.tenant_id = v_tenant_id
    AND m.deleted_at IS NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Member % is not active for tenant %', v_member_id, v_tenant_id;
  END IF;

  v_member_label := trim(both ' ' FROM COALESCE(v_member_first, '') || ' ' || COALESCE(v_member_last, ''));

  v_amount := CASE
    WHEN p_transaction ? 'amount' THEN NULLIF(p_transaction->>'amount', '')::numeric(12,2)
    ELSE NULL
  END;

  v_transaction_date := CASE
    WHEN p_transaction ? 'transaction_date' THEN NULLIF(p_transaction->>'transaction_date', '')::date
    ELSE NULL
  END;

  v_description := NULLIF(p_transaction->>'description', '');
  v_reference := NULLIF(p_transaction->>'reference', '');
  v_income_account_id := CASE WHEN p_transaction ? 'income_account_id' THEN (p_transaction->>'income_account_id')::uuid ELSE NULL END;
  v_cash_account_id := CASE WHEN p_transaction ? 'cash_account_id' THEN (p_transaction->>'cash_account_id')::uuid ELSE NULL END;
  v_category_id := CASE WHEN p_transaction ? 'category_id' THEN (p_transaction->>'category_id')::uuid ELSE NULL END;
  v_fund_id := CASE WHEN p_transaction ? 'fund_id' THEN (p_transaction->>'fund_id')::uuid ELSE NULL END;
  v_source_id := CASE WHEN p_transaction ? 'source_id' THEN (p_transaction->>'source_id')::uuid ELSE NULL END;

  IF v_operation <> 'create' THEN
    SELECT *
    INTO v_credit_row
    FROM financial_transactions
    WHERE header_id = v_header_id
      AND credit > 0
      AND deleted_at IS NULL
    ORDER BY created_at
    LIMIT 1;

    SELECT *
    INTO v_debit_row
    FROM financial_transactions
    WHERE header_id = v_header_id
      AND debit > 0
      AND deleted_at IS NULL
    ORDER BY created_at
    LIMIT 1;

    IF v_existing_member_account_id IS NULL THEN
      v_existing_member_account_id := v_credit_row.account_id;
    END IF;

    IF v_credit_row.id IS NULL OR v_debit_row.id IS NULL THEN
      RAISE EXCEPTION 'Ledger entries for header % are incomplete', v_header_id;
    END IF;

    IF v_amount IS NULL THEN
      v_amount := COALESCE(v_credit_row.credit, v_debit_row.debit);
    END IF;

    v_transaction_date := COALESCE(v_transaction_date, v_credit_row.date, v_existing_header.transaction_date, current_date);
    v_description := COALESCE(v_description, v_existing_header.description, CASE WHEN v_member_label <> '' THEN 'Giving - ' || v_member_label ELSE 'Giving entry' END);
    v_reference := COALESCE(v_reference, v_existing_header.reference);
    v_income_account_id := COALESCE(v_income_account_id, v_credit_row.coa_id);
    v_cash_account_id := COALESCE(v_cash_account_id, v_debit_row.coa_id);
    v_category_id := COALESCE(v_category_id, v_credit_row.category_id);
    v_fund_id := COALESCE(v_fund_id, v_credit_row.fund_id);
    v_source_id := COALESCE(v_source_id, v_existing_header.source_id);
  ELSE
    IF v_amount IS NULL OR v_amount <= 0 THEN
      RAISE EXCEPTION 'amount must be a positive value for giving transactions';
    END IF;

    v_transaction_date := COALESCE(v_transaction_date, current_date);
    v_description := COALESCE(v_description, CASE WHEN v_member_label <> '' THEN 'Giving - ' || v_member_label ELSE 'Giving entry' END);

    IF v_income_account_id IS NULL THEN
      RAISE EXCEPTION 'income_account_id is required for create operations';
    END IF;
    IF v_cash_account_id IS NULL THEN
      RAISE EXCEPTION 'cash_account_id is required for create operations';
    END IF;
    IF v_category_id IS NULL THEN
      RAISE EXCEPTION 'category_id is required for create operations';
    END IF;
  END IF;

  IF v_operation <> 'delete' THEN
    SELECT id
    INTO v_member_account_id
    FROM accounts
    WHERE member_id = v_member_id
      AND tenant_id = v_tenant_id
      AND deleted_at IS NULL
    ORDER BY created_at
    LIMIT 1;

    IF v_member_account_id IS NULL THEN
      IF v_existing_member_account_id IS NOT NULL
         AND v_member_id IS NOT DISTINCT FROM v_existing_member_id THEN
        v_member_account_id := v_existing_member_account_id;
      END IF;
    END IF;

    IF v_member_account_id IS NULL THEN
      RAISE EXCEPTION 'Account not found for member % in tenant %', v_member_id, v_tenant_id;
    END IF;
  END IF;

  IF v_operation = 'create' THEN
    v_transaction_number := generate_transaction_number(v_tenant_id, v_transaction_date, 'income', v_member_id);

    INSERT INTO financial_transaction_headers (
      transaction_number,
      transaction_date,
      description,
      reference,
      source_id,
      status,
      tenant_id,
      created_by,
      updated_by,
      created_at,
      updated_at,
      posted_at,
      posted_by
    ) VALUES (
      v_transaction_number,
      v_transaction_date,
      v_description,
      v_reference,
      v_source_id,
      'posted',
      v_tenant_id,
      v_user_id,
      v_user_id,
      v_now,
      v_now,
      v_now,
      v_user_id
    )
    RETURNING * INTO v_existing_header;

    v_header_id := v_existing_header.id;

    INSERT INTO financial_transactions (
      type,
      description,
      date,
      category_id,
      fund_id,
      tenant_id,
      created_at,
      updated_at,
      created_by,
      updated_by,
      header_id,
      account_id,
      coa_id,
      debit,
      credit,
      source_id
    ) VALUES (
      'income',
      v_description,
      v_transaction_date,
      v_category_id,
      v_fund_id,
      v_tenant_id,
      v_now,
      v_now,
      v_user_id,
      v_user_id,
      v_header_id,
      v_member_account_id,
      v_cash_account_id,
      v_amount,
      0,
      v_source_id
    )
    RETURNING * INTO v_debit_row;

    INSERT INTO financial_transactions (
      type,
      description,
      date,
      category_id,
      fund_id,
      tenant_id,
      created_at,
      updated_at,
      created_by,
      updated_by,
      header_id,
      account_id,
      coa_id,
      debit,
      credit,
      source_id
    ) VALUES (
      'income',
      v_description,
      v_transaction_date,
      v_category_id,
      v_fund_id,
      v_tenant_id,
      v_now,
      v_now,
      v_user_id,
      v_user_id,
      v_header_id,
      v_member_account_id,
      v_income_account_id,
      0,
      v_amount,
      v_source_id
    )
    RETURNING * INTO v_credit_row;
  ELSIF v_operation = 'update' THEN
    UPDATE financial_transaction_headers
    SET transaction_date = v_transaction_date,
        description = v_description,
        reference = v_reference,
        source_id = v_source_id,
        updated_at = v_now,
        updated_by = v_user_id
    WHERE id = v_header_id;

    IF v_existing_header.status = 'draft' THEN
      UPDATE financial_transaction_headers
      SET status = 'posted',
          posted_at = COALESCE(v_existing_header.posted_at, v_now),
          posted_by = COALESCE(v_existing_header.posted_by, v_user_id)
      WHERE id = v_header_id;
    END IF;

    UPDATE financial_transactions
    SET description = v_description,
        date = v_transaction_date,
        category_id = v_category_id,
        fund_id = v_fund_id,
        account_id = v_member_account_id,
        coa_id = v_income_account_id,
        debit = 0,
        credit = v_amount,
        source_id = v_source_id,
        updated_at = v_now,
        updated_by = v_user_id
    WHERE id = v_credit_row.id;

    UPDATE financial_transactions
    SET description = v_description,
        date = v_transaction_date,
        category_id = v_category_id,
        fund_id = v_fund_id,
        account_id = v_member_account_id,
        coa_id = v_cash_account_id,
        debit = v_amount,
        credit = 0,
        source_id = v_source_id,
        updated_at = v_now,
        updated_by = v_user_id
    WHERE id = v_debit_row.id;
  ELSE
    IF v_existing_header.status <> 'voided' THEN
      UPDATE financial_transaction_headers
      SET status = 'voided',
          voided_at = v_now,
          voided_by = v_user_id,
          updated_at = v_now,
          updated_by = v_user_id
      WHERE id = v_header_id;
    END IF;

    UPDATE financial_transactions
    SET deleted_at = v_now,
        updated_at = v_now,
        updated_by = v_user_id
    WHERE header_id = v_header_id
      AND deleted_at IS NULL;

    v_transaction_date := COALESCE(v_transaction_date, v_existing_header.transaction_date, current_date);
  END IF;

  IF v_operation IN ('create', 'update') THEN
    PERFORM is_transaction_balanced(v_header_id);
  END IF;

  v_reference_date := COALESCE(v_transaction_date, current_date);
  v_profile_row := refresh_member_giving_profile(v_member_id, v_tenant_id, v_reference_date, v_user_id);

  IF p_profile ?| ARRAY['recurring_amount','recurring_frequency','recurring_method','recurring_status','pledge_amount','pledge_campaign','pledge_start_date','pledge_end_date','data_source'] THEN
    UPDATE member_giving_profiles
    SET recurring_amount = CASE WHEN p_profile ? 'recurring_amount' THEN NULLIF(p_profile->>'recurring_amount', '')::numeric(12,2) ELSE recurring_amount END,
        recurring_frequency = CASE WHEN p_profile ? 'recurring_frequency' THEN NULLIF(p_profile->>'recurring_frequency', '') ELSE recurring_frequency END,
        recurring_method = CASE WHEN p_profile ? 'recurring_method' THEN NULLIF(p_profile->>'recurring_method', '') ELSE recurring_method END,
        recurring_status = CASE WHEN p_profile ? 'recurring_status' THEN NULLIF(p_profile->>'recurring_status', '') ELSE recurring_status END,
        pledge_amount = CASE WHEN p_profile ? 'pledge_amount' THEN NULLIF(p_profile->>'pledge_amount', '')::numeric(12,2) ELSE pledge_amount END,
        pledge_campaign = CASE WHEN p_profile ? 'pledge_campaign' THEN NULLIF(p_profile->>'pledge_campaign', '') ELSE pledge_campaign END,
        pledge_start_date = CASE WHEN p_profile ? 'pledge_start_date' THEN NULLIF(p_profile->>'pledge_start_date', '')::date ELSE pledge_start_date END,
        pledge_end_date = CASE WHEN p_profile ? 'pledge_end_date' THEN NULLIF(p_profile->>'pledge_end_date', '')::date ELSE pledge_end_date END,
        data_source = CASE WHEN p_profile ? 'data_source' THEN NULLIF(p_profile->>'data_source', '') ELSE data_source END,
        updated_at = v_now,
        updated_by = v_user_id
    WHERE id = v_profile_row.id
    RETURNING * INTO v_profile_row;
  END IF;

  UPDATE members
  SET giving_recurring_amount = v_profile_row.recurring_amount,
      giving_recurring_frequency = v_profile_row.recurring_frequency,
      giving_recurring_method = v_profile_row.recurring_method,
      giving_pledge_amount = v_profile_row.pledge_amount,
      giving_pledge_campaign = v_profile_row.pledge_campaign
  WHERE id = v_member_id
    AND tenant_id = v_tenant_id
    AND deleted_at IS NULL;

  v_result := jsonb_build_object(
    'header_id', v_header_id,
    'profile_id', v_profile_row.id,
    'member_id', v_member_id,
    'tenant_id', v_tenant_id
  );

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION process_member_giving_transaction(text, jsonb, jsonb) TO authenticated;

COMMENT ON FUNCTION process_member_giving_transaction(text, jsonb, jsonb) IS 'Processes member giving ledger activity with double-entry accounting and refreshes giving profile insights.';

-- Recreate the wrapper that returns the profile id
CREATE OR REPLACE FUNCTION process_member_giving_profile_transaction(
  p_operation text,
  p_profile jsonb,
  p_transaction jsonb DEFAULT '{}'::jsonb
) RETURNS uuid
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_result jsonb;
BEGIN
  v_result := process_member_giving_transaction(p_operation, p_transaction, p_profile);
  RETURN (v_result->>'profile_id')::uuid;
END;
$$;

GRANT EXECUTE ON FUNCTION process_member_giving_profile_transaction(text, jsonb, jsonb) TO authenticated;

COMMENT ON FUNCTION process_member_giving_profile_transaction(text, jsonb, jsonb) IS 'Deprecated wrapper that returns the member giving profile id after processing a giving transaction.';

-- Recreate financial report functions and views to use account_id and coa_id
CREATE OR REPLACE FUNCTION report_trial_balance(
  p_tenant_id uuid,
  p_end_date date
)
RETURNS TABLE (
  account_id uuid,
  account_code text,
  account_name text,
  account_type text,
  debit_balance numeric,
  credit_balance numeric
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  IF NOT check_tenant_access(p_tenant_id) THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  RETURN QUERY
  SELECT
    a.id,
    a.code,
    a.name,
    a.account_type,
    COALESCE(SUM(ft.debit),0) AS debit_balance,
    COALESCE(SUM(ft.credit),0) AS credit_balance
  FROM chart_of_accounts a
  LEFT JOIN financial_transactions ft
    ON ft.coa_id = a.id
    AND ft.tenant_id = a.tenant_id
    AND ft.date <= p_end_date
    AND ft.deleted_at IS NULL
  WHERE a.tenant_id = p_tenant_id
  GROUP BY a.id, a.code, a.name, a.account_type
  ORDER BY a.code;
END;
$$;

GRANT EXECUTE ON FUNCTION report_trial_balance(uuid, date) TO authenticated;
COMMENT ON FUNCTION report_trial_balance(uuid, date) IS
  'Trial balance by account as of the given date for the tenant';

CREATE OR REPLACE FUNCTION report_general_ledger(
  p_tenant_id uuid,
  p_start_date date,
  p_end_date date,
  p_account_id uuid DEFAULT NULL
)
RETURNS TABLE (
  entry_date date,
  account_code text,
  account_name text,
  description text,
  debit numeric,
  credit numeric,
  running_balance numeric
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  IF NOT check_tenant_access(p_tenant_id) THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  RETURN QUERY
  SELECT
    ft.date,
    coa.code,
    coa.name,
    ft.description,
    ft.debit,
    ft.credit,
    SUM(ft.debit - ft.credit) OVER (ORDER BY ft.date, ft.id) AS running_balance
  FROM financial_transactions ft
  JOIN chart_of_accounts coa ON ft.coa_id = coa.id
  WHERE ft.tenant_id = p_tenant_id
    AND ft.date BETWEEN p_start_date AND p_end_date
    AND ft.deleted_at IS NULL
    AND (p_account_id IS NULL OR ft.coa_id = p_account_id)
  ORDER BY ft.date, ft.id;
END;
$$;

GRANT EXECUTE ON FUNCTION report_general_ledger(uuid, date, date, uuid) TO authenticated;
COMMENT ON FUNCTION report_general_ledger(uuid, date, date, uuid) IS
  'Detailed ledger entries for a tenant within a date range';

CREATE OR REPLACE FUNCTION report_journal(
  p_tenant_id uuid,
  p_start_date date,
  p_end_date date
)
RETURNS TABLE (
  entry_date date,
  account_code text,
  account_name text,
  description text,
  debit numeric,
  credit numeric
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  IF NOT check_tenant_access(p_tenant_id) THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  RETURN QUERY
  SELECT
    ft.date,
    coa.code,
    coa.name,
    ft.description,
    ft.debit,
    ft.credit
  FROM financial_transactions ft
  JOIN chart_of_accounts coa ON ft.coa_id = coa.id
  WHERE ft.tenant_id = p_tenant_id
    AND ft.date BETWEEN p_start_date AND p_end_date
    AND ft.deleted_at IS NULL
  ORDER BY ft.date, ft.id;
END;
$$;

GRANT EXECUTE ON FUNCTION report_journal(uuid, date, date) TO authenticated;
COMMENT ON FUNCTION report_journal(uuid, date, date) IS
  'Journal style listing of financial transactions for a tenant';

CREATE OR REPLACE FUNCTION report_income_statement(
  p_tenant_id uuid,
  p_start_date date,
  p_end_date date
)
RETURNS TABLE (
  account_id uuid,
  account_code text,
  account_name text,
  account_type text,
  amount numeric
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  IF NOT check_tenant_access(p_tenant_id) THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  RETURN QUERY
  SELECT
    a.id,
    a.code,
    a.name,
    a.account_type,
    SUM(CASE WHEN a.account_type = 'revenue'
             THEN ft.credit - ft.debit
             ELSE ft.debit - ft.credit END) AS amount
  FROM chart_of_accounts a
  LEFT JOIN financial_transactions ft ON ft.coa_id = a.id
    AND ft.tenant_id = a.tenant_id
    AND ft.date BETWEEN p_start_date AND p_end_date
    AND ft.deleted_at IS NULL
  WHERE a.tenant_id = p_tenant_id
    AND a.account_type IN ('revenue','expense')
  GROUP BY a.id, a.code, a.name, a.account_type
  ORDER BY a.code;
END;
$$;

GRANT EXECUTE ON FUNCTION report_income_statement(uuid, date, date) TO authenticated;
COMMENT ON FUNCTION report_income_statement(uuid, date, date) IS
  'Income statement totals for the tenant';

CREATE OR REPLACE FUNCTION report_budget_vs_actual(
  p_tenant_id uuid,
  p_start_date date,
  p_end_date date
)
RETURNS TABLE (
  budget_id uuid,
  budget_name text,
  budget_amount numeric,
  actual_amount numeric,
  variance numeric
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  IF NOT check_tenant_access(p_tenant_id) THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  RETURN QUERY
  SELECT
    b.id,
    b.name,
    b.amount,
    COALESCE(SUM(
      CASE WHEN coa.account_type = 'expense' THEN ft.debit
           WHEN coa.account_type = 'revenue' THEN -ft.credit
           ELSE 0 END
    ),0) AS actual_amount,
    b.amount - COALESCE(SUM(
      CASE WHEN coa.account_type = 'expense' THEN ft.debit
           WHEN coa.account_type = 'revenue' THEN -ft.credit
           ELSE 0 END
    ),0) AS variance
  FROM budgets b
  LEFT JOIN financial_transactions ft ON ft.budget_id = b.id
    AND ft.date BETWEEN p_start_date AND p_end_date
    AND ft.deleted_at IS NULL
  LEFT JOIN chart_of_accounts coa ON ft.coa_id = coa.id
  WHERE b.tenant_id = p_tenant_id
  GROUP BY b.id, b.name, b.amount
  ORDER BY b.name;
END;
$$;

GRANT EXECUTE ON FUNCTION report_budget_vs_actual(uuid, date, date) TO authenticated;
COMMENT ON FUNCTION report_budget_vs_actual(uuid, date, date) IS
  'Compares budgeted amounts to actual transactions for the tenant';

CREATE OR REPLACE FUNCTION report_fund_summary(
  p_tenant_id uuid,
  p_start_date date,
  p_end_date date
)
RETURNS TABLE (
  fund_name text,
  income numeric,
  expenses numeric,
  net_change numeric
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  IF NOT check_tenant_access(p_tenant_id) THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  RETURN QUERY
  SELECT
    f.name,
    COALESCE(SUM(CASE WHEN coa.account_type = 'revenue' THEN ft.credit END),0) AS income,
    COALESCE(SUM(CASE WHEN coa.account_type = 'expense' THEN ft.debit END),0) AS expenses,
    COALESCE(SUM(CASE WHEN coa.account_type = 'revenue' THEN ft.credit ELSE -ft.debit END),0) AS net_change
  FROM funds f
  LEFT JOIN financial_transactions ft ON ft.fund_id = f.id
    AND ft.date BETWEEN p_start_date AND p_end_date
    AND ft.deleted_at IS NULL
  LEFT JOIN chart_of_accounts coa ON ft.coa_id = coa.id
  WHERE f.tenant_id = p_tenant_id
  GROUP BY f.name
  ORDER BY f.name;
END;
$$;

GRANT EXECUTE ON FUNCTION report_fund_summary(uuid, date, date) TO authenticated;
COMMENT ON FUNCTION report_fund_summary(uuid, date, date) IS
  'Summary of income and expenses by fund for a tenant';

CREATE OR REPLACE FUNCTION report_member_giving_summary(
  p_tenant_id uuid,
  p_start_date date,
  p_end_date date,
  p_member_id uuid DEFAULT NULL
)
RETURNS TABLE (
  member_id uuid,
  first_name text,
  last_name text,
  total_amount numeric
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  IF NOT check_tenant_access(p_tenant_id) THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  RETURN QUERY
  SELECT
    m.id,
    m.first_name,
    m.last_name,
    SUM(ft.credit) AS total_amount
  FROM members m
  LEFT JOIN accounts a
    ON a.member_id = m.id
    AND a.deleted_at IS NULL
  LEFT JOIN financial_transactions ft
    ON ft.account_id = a.id
    AND ft.date BETWEEN p_start_date AND p_end_date
    AND ft.deleted_at IS NULL
  LEFT JOIN chart_of_accounts coa ON ft.coa_id = coa.id
  WHERE m.tenant_id = p_tenant_id
    AND (p_member_id IS NULL OR m.id = p_member_id)
    AND coa.account_type = 'revenue'
  GROUP BY m.id, m.first_name, m.last_name
  ORDER BY m.last_name, m.first_name;
END;
$$;

GRANT EXECUTE ON FUNCTION report_member_giving_summary(uuid, date, date, uuid) TO authenticated;
COMMENT ON FUNCTION report_member_giving_summary(uuid, date, date, uuid) IS
  'Aggregated member giving totals for a tenant';

CREATE OR REPLACE FUNCTION report_offering_summary(
  p_tenant_id uuid,
  p_start_date date,
  p_end_date date
)
RETURNS TABLE (
  category_name text,
  total_amount numeric
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  IF NOT check_tenant_access(p_tenant_id) THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  RETURN QUERY
  SELECT
    c.name,
    SUM(ft.credit) AS total_amount
  FROM financial_transactions ft
  LEFT JOIN categories c ON ft.category_id = c.id
  LEFT JOIN chart_of_accounts coa ON ft.coa_id = coa.id
  WHERE ft.tenant_id = p_tenant_id
    AND ft.date BETWEEN p_start_date AND p_end_date
    AND ft.deleted_at IS NULL
    AND coa.account_type = 'revenue'
  GROUP BY c.name
  ORDER BY c.name;
END;
$$;

GRANT EXECUTE ON FUNCTION report_offering_summary(uuid, date, date) TO authenticated;
COMMENT ON FUNCTION report_offering_summary(uuid, date, date) IS
  'Summarizes offerings by category for a tenant';

CREATE OR REPLACE FUNCTION report_category_financial(
  p_tenant_id uuid,
  p_start_date date,
  p_end_date date,
  p_category_id uuid DEFAULT NULL
)
RETURNS TABLE (
  category_name text,
  income numeric,
  expenses numeric
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  IF NOT check_tenant_access(p_tenant_id) THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  RETURN QUERY
  SELECT
    c.name,
    COALESCE(SUM(CASE WHEN coa.account_type = 'revenue' THEN ft.credit END),0) AS income,
    COALESCE(SUM(CASE WHEN coa.account_type = 'expense' THEN ft.debit END),0) AS expenses
  FROM categories c
  LEFT JOIN financial_transactions ft ON ft.category_id = c.id
    AND ft.date BETWEEN p_start_date AND p_end_date
    AND ft.deleted_at IS NULL
  LEFT JOIN chart_of_accounts coa ON ft.coa_id = coa.id
  WHERE c.tenant_id = p_tenant_id
    AND (p_category_id IS NULL OR c.id = p_category_id)
  GROUP BY c.name
  ORDER BY c.name;
END;
$$;

GRANT EXECUTE ON FUNCTION report_category_financial(uuid, date, date, uuid) TO authenticated;
COMMENT ON FUNCTION report_category_financial(uuid, date, date, uuid) IS
  'Aggregated income and expenses by category for a tenant';

CREATE OR REPLACE FUNCTION report_cash_flow_summary(
  p_tenant_id uuid,
  p_start_date date,
  p_end_date date
)
RETURNS TABLE (
  month text,
  inflow numeric,
  outflow numeric,
  net_change numeric
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  IF NOT check_tenant_access(p_tenant_id) THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  RETURN QUERY
  SELECT
    to_char(date_trunc('month', ft.date), 'YYYY-MM') AS month,
    SUM(CASE WHEN coa.account_type = 'revenue' THEN ft.credit ELSE 0 END) AS inflow,
    SUM(CASE WHEN coa.account_type = 'expense' THEN ft.debit ELSE 0 END) AS outflow,
    SUM(CASE WHEN coa.account_type = 'revenue' THEN ft.credit ELSE -ft.debit END) AS net_change
  FROM financial_transactions ft
  LEFT JOIN chart_of_accounts coa ON ft.coa_id = coa.id
  WHERE ft.tenant_id = p_tenant_id
    AND ft.date BETWEEN p_start_date AND p_end_date
    AND ft.deleted_at IS NULL
  GROUP BY date_trunc('month', ft.date)
  ORDER BY month;
END;
$$;

GRANT EXECUTE ON FUNCTION report_cash_flow_summary(uuid, date, date) TO authenticated;
COMMENT ON FUNCTION report_cash_flow_summary(uuid, date, date) IS
  'Monthly cash inflow and outflow totals for a tenant';

CREATE OR REPLACE FUNCTION report_church_financial_statement(
  p_tenant_id uuid,
  p_start_date date,
  p_end_date date
)
RETURNS jsonb
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  result jsonb;
BEGIN
  IF NOT check_tenant_access(p_tenant_id) THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  WITH opening AS (
    SELECT COALESCE(SUM(
      CASE
        WHEN coa.account_type = 'revenue' THEN credit
        WHEN coa.account_type = 'expense' THEN -debit
        ELSE COALESCE(credit,0) - COALESCE(debit,0)
      END
    ),0) AS balance
    FROM financial_transactions ft
    JOIN financial_transaction_headers h
      ON h.id = ft.header_id
     AND h.deleted_at IS NULL
    LEFT JOIN chart_of_accounts coa ON ft.coa_id = coa.id
    WHERE ft.tenant_id = p_tenant_id
      AND ft.date < p_start_date
      AND ft.deleted_at IS NULL
  ),
  period AS (
    SELECT
      COALESCE(SUM(CASE WHEN coa.account_type = 'revenue' THEN credit END),0) AS income,
      COALESCE(SUM(CASE WHEN coa.account_type = 'expense' THEN debit END),0) AS expenses
    FROM financial_transactions ft
    JOIN financial_transaction_headers h
      ON h.id = ft.header_id
     AND h.deleted_at IS NULL
    LEFT JOIN chart_of_accounts coa ON ft.coa_id = coa.id
    WHERE ft.tenant_id = p_tenant_id
      AND ft.date BETWEEN p_start_date AND p_end_date
      AND ft.deleted_at IS NULL
  ),
  fund_data AS (
    SELECT
      f.name AS fund_name,
      COALESCE(SUM(CASE WHEN ft.date < p_start_date THEN
        CASE WHEN coa.account_type = 'revenue' THEN ft.credit ELSE -ft.debit END
      END),0) AS opening_balance,
      COALESCE(SUM(CASE WHEN ft.date BETWEEN p_start_date AND p_end_date AND coa.account_type = 'revenue' THEN ft.credit END),0) AS income,
      COALESCE(SUM(CASE WHEN ft.date BETWEEN p_start_date AND p_end_date AND coa.account_type = 'expense' THEN ft.debit END),0) AS expenses
    FROM funds f
    LEFT JOIN financial_transactions ft
      ON ft.fund_id = f.id
     AND ft.tenant_id = f.tenant_id
     AND ft.deleted_at IS NULL
    LEFT JOIN financial_transaction_headers h
      ON h.id = ft.header_id
     AND h.deleted_at IS NULL
    LEFT JOIN chart_of_accounts coa ON ft.coa_id = coa.id
    WHERE f.tenant_id = p_tenant_id
      AND (ft.id IS NULL OR h.id IS NOT NULL)
    GROUP BY f.name
  ),
  income_cat AS (
    SELECT
      a.name AS account_name,
      COALESCE(c.name, 'Uncategorized') AS category_name,
      SUM(ft.credit) AS amount
    FROM financial_transactions ft
    JOIN financial_transaction_headers h
      ON h.id = ft.header_id
     AND h.deleted_at IS NULL
    JOIN chart_of_accounts a ON ft.coa_id = a.id
    LEFT JOIN categories c ON ft.category_id = c.id
    WHERE ft.tenant_id = p_tenant_id
      AND a.account_type = 'revenue'
      AND ft.date BETWEEN p_start_date AND p_end_date
      AND ft.deleted_at IS NULL
    GROUP BY a.name, COALESCE(c.name, 'Uncategorized')
  ),
  income_tot AS (
    SELECT
      account_name,
      SUM(amount) AS subtotal,
      jsonb_agg(jsonb_build_object('category_name', category_name, 'amount', amount) ORDER BY category_name) AS categories
    FROM income_cat
    GROUP BY account_name
  ),
  expense_cat AS (
    SELECT
      a.name AS account_name,
      COALESCE(c.name, 'Uncategorized') AS category_name,
      SUM(ft.debit) AS amount
    FROM financial_transactions ft
    JOIN financial_transaction_headers h
      ON h.id = ft.header_id
     AND h.deleted_at IS NULL
    JOIN chart_of_accounts a ON ft.coa_id = a.id
    LEFT JOIN categories c ON ft.category_id = c.id
    WHERE ft.tenant_id = p_tenant_id
      AND a.account_type = 'expense'
      AND ft.date BETWEEN p_start_date AND p_end_date
      AND ft.deleted_at IS NULL
    GROUP BY a.name, COALESCE(c.name, 'Uncategorized')
  ),
  expense_tot AS (
    SELECT
      account_name,
      SUM(amount) AS subtotal,
      jsonb_agg(jsonb_build_object('category_name', category_name, 'amount', amount) ORDER BY category_name) AS categories
    FROM expense_cat
    GROUP BY account_name
  ),
  member_cat AS (
    SELECT
      m.first_name || ' ' || m.last_name AS member_name,
      COALESCE(c.name, 'Uncategorized') AS category_name,
      SUM(ft.credit) AS amount
    FROM financial_transactions ft
    JOIN financial_transaction_headers h
      ON h.id = ft.header_id
     AND h.deleted_at IS NULL
    JOIN accounts acc ON acc.id = ft.account_id
    JOIN members m ON m.id = acc.member_id
    LEFT JOIN categories c ON ft.category_id = c.id
    LEFT JOIN chart_of_accounts a ON ft.coa_id = a.id
    WHERE ft.tenant_id = p_tenant_id
      AND a.account_type = 'revenue'
      AND ft.date BETWEEN p_start_date AND p_end_date
      AND ft.deleted_at IS NULL
    GROUP BY member_name, COALESCE(c.name, 'Uncategorized')
  ),
  member_tot AS (
    SELECT
      member_name,
      SUM(amount) AS total,
      jsonb_agg(jsonb_build_object('category_name', category_name, 'amount', amount) ORDER BY category_name) AS categories
    FROM member_cat
    GROUP BY member_name
  )
  SELECT jsonb_build_object(
    'summary', jsonb_build_object(
      'opening_balance', (SELECT balance FROM opening),
      'total_income', (SELECT income FROM period),
      'total_expenses', (SELECT expenses FROM period),
      'net_result', (SELECT income - expenses FROM period),
      'ending_balance', (SELECT (SELECT balance FROM opening) + income - expenses FROM period)
    ),
    'funds', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'fund_name', fund_name,
        'opening_balance', opening_balance,
        'income', income,
        'expenses', expenses,
        'ending_balance', opening_balance + income - expenses
      ) ORDER BY fund_name), '[]'::jsonb)
      FROM fund_data
    ),
    'income', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'account_name', account_name,
        'categories', categories,
        'subtotal', subtotal
      ) ORDER BY account_name), '[]'::jsonb)
      FROM income_tot
    ),
    'expenses', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'account_name', account_name,
        'categories', categories,
        'subtotal', subtotal
      ) ORDER BY account_name), '[]'::jsonb)
      FROM expense_tot
    ),
    'memberGiving', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'member_name', member_name,
        'categories', categories,
        'total', total
      ) ORDER BY member_name), '[]'::jsonb)
      FROM member_tot
    ),
    'remarks', NULL
  ) INTO result;

  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION report_church_financial_statement(uuid, date, date) TO authenticated;
COMMENT ON FUNCTION report_church_financial_statement(uuid, date, date) IS
  'Generates a church-wide financial statement summarizing income and expenses.';

CREATE OR REPLACE FUNCTION get_member_statement(
  p_start_date date,
  p_end_date date,
  p_member_ids uuid[] DEFAULT NULL,
  p_limit integer DEFAULT NULL,
  p_offset integer DEFAULT NULL
)
RETURNS TABLE (
  entry_date date,
  member_id uuid,
  first_name text,
  last_name text,
  category_name text,
  fund_name text,
  source_name text,
  amount numeric
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  RETURN QUERY
    SELECT
      ft.date,
      m.id,
      m.first_name,
      m.last_name,
      c.name AS category_name,
      f.name AS fund_name,
      fs.name AS source_name,
      ft.credit
    FROM members m
    JOIN accounts a ON a.member_id = m.id AND a.deleted_at IS NULL
    JOIN financial_transactions ft ON ft.account_id = a.id
      AND ft.deleted_at IS NULL
    LEFT JOIN categories c ON ft.category_id = c.id
    LEFT JOIN funds f ON ft.fund_id = f.id
    LEFT JOIN financial_sources fs ON ft.source_id = fs.id
    LEFT JOIN membership_status ms ON m.membership_status_id = ms.id
    LEFT JOIN membership_type mt ON m.membership_type_id = mt.id
    LEFT JOIN chart_of_accounts coa ON ft.coa_id = coa.id
    WHERE m.tenant_id = get_user_tenant_id()
      AND ft.tenant_id = m.tenant_id
      AND ft.date BETWEEN p_start_date AND p_end_date
      AND (p_member_ids IS NULL OR m.id = ANY(p_member_ids))
      AND coa.account_type = 'revenue'
    ORDER BY ft.date, m.last_name, m.first_name
    LIMIT p_limit OFFSET COALESCE(p_offset, 0);
END;
$$;

GRANT EXECUTE ON FUNCTION get_member_statement(date, date, uuid[], integer, integer) TO authenticated;
COMMENT ON FUNCTION get_member_statement(date, date, uuid[], integer, integer) IS
  'Detailed giving transactions for active or donor members within a date range with optional pagination and member filtering.';

CREATE OR REPLACE FUNCTION finance_monthly_stats(
  p_tenant_id uuid,
  p_start_date date,
  p_end_date date
)
RETURNS TABLE (
  monthly_income numeric,
  monthly_expenses numeric,
  active_budgets integer,
  income_by_category jsonb,
  expenses_by_category jsonb
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  IF NOT check_tenant_access(p_tenant_id) THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  RETURN QUERY
  WITH tx AS (
    SELECT
      h.tenant_id,
      coa.account_type,
      COALESCE(c.name, 'Uncategorized') AS category_name,
      SUM(
        CASE
          WHEN coa.account_type = 'revenue' THEN ft.credit
          WHEN coa.account_type = 'expense' THEN ft.debit
          ELSE 0
        END
      ) AS total
    FROM financial_transactions ft
    JOIN financial_transaction_headers h
      ON h.id = ft.header_id
     AND h.deleted_at IS NULL
    LEFT JOIN categories c ON c.id = ft.category_id
    LEFT JOIN chart_of_accounts coa ON ft.coa_id = coa.id
    WHERE h.transaction_date BETWEEN p_start_date AND p_end_date
      AND ft.deleted_at IS NULL
    GROUP BY h.tenant_id, coa.account_type, c.name
  )
  SELECT
    SUM(CASE WHEN account_type = 'revenue' THEN total ELSE 0 END) AS monthly_income,
    SUM(CASE WHEN account_type = 'expense' THEN total ELSE 0 END) AS monthly_expenses,
    COALESCE(
      (SELECT COUNT(*)::integer FROM budgets b
         WHERE b.tenant_id = tx.tenant_id
           AND p_end_date BETWEEN b.start_date AND b.end_date),
      0
    ) AS active_budgets,
    jsonb_object_agg(category_name, total) FILTER (WHERE account_type = 'revenue') AS income_by_category,
    jsonb_object_agg(category_name, total) FILTER (WHERE account_type = 'expense') AS expenses_by_category
  FROM tx
  WHERE tenant_id = p_tenant_id
  GROUP BY tenant_id;
END;
$$;

GRANT EXECUTE ON FUNCTION finance_monthly_stats(uuid, date, date) TO authenticated;
COMMENT ON FUNCTION finance_monthly_stats(uuid, date, date) IS
  'Aggregated financial statistics using account_type for income and expenses';

CREATE VIEW fund_balances_view AS
SELECT
  f.tenant_id,
  f.id,
  f.name,
  COALESCE(
    SUM(
      CASE
        WHEN coa.account_type = 'revenue' THEN t.credit
        WHEN coa.account_type = 'expense' THEN -t.debit
        ELSE COALESCE(t.credit,0) - COALESCE(t.debit,0)
      END
    ),
    0
  ) AS balance
FROM funds f
LEFT JOIN financial_transactions t ON t.fund_id = f.id AND t.deleted_at IS NULL
LEFT JOIN chart_of_accounts coa ON t.coa_id = coa.id
GROUP BY f.tenant_id, f.id, f.name;

COMMENT ON VIEW fund_balances_view IS 'Current running balance for each fund using account_type';

CREATE VIEW finance_monthly_trends AS
WITH categorized AS (
  SELECT
    ft.tenant_id,
    date_trunc('month', ft.date)::date AS month,
    coa.account_type,
    SUM(ft.debit) AS total_debit,
    SUM(ft.credit) AS total_credit
  FROM financial_transactions ft
  JOIN financial_transaction_headers h
    ON ft.header_id = h.id
   AND h.deleted_at IS NULL
  JOIN chart_of_accounts coa ON ft.coa_id = coa.id
  WHERE ft.deleted_at IS NULL
  GROUP BY ft.tenant_id, date_trunc('month', ft.date), coa.account_type
),
monthly_summary AS (
  SELECT
    tenant_id,
    month,
    SUM(CASE WHEN account_type = 'revenue' THEN total_credit ELSE 0 END) AS income,
    SUM(CASE WHEN account_type = 'expense' THEN total_debit ELSE 0 END) AS expenses
  FROM categorized
  GROUP BY tenant_id, month
),
with_lag AS (
  SELECT
    *,
    LAG(income) OVER (PARTITION BY tenant_id ORDER BY month) AS previous_income
  FROM monthly_summary
)
SELECT
  tenant_id,
  to_char(month, 'YYYY-MM') AS month,
  income,
  expenses,
  ROUND(
    CASE
      WHEN previous_income IS NULL OR previous_income = 0 THEN NULL
      ELSE (income - previous_income) / previous_income * 100
    END,
    2
  ) AS percentage_change
FROM with_lag
WHERE tenant_id = (
  SELECT tenant_id
  FROM tenant_users
  WHERE user_id = auth.uid()
)
ORDER BY month;
