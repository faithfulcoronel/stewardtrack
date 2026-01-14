-- Enhanced Trial Balance Report Function
-- Supports viewing by category, source, or fund with period-by-period breakdown

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS report_trial_balance_by_period(uuid, uuid, text);

-- Create the enhanced trial balance function
CREATE OR REPLACE FUNCTION report_trial_balance_by_period(
  p_tenant_id uuid,
  p_fiscal_year_id uuid,
  p_view_by text DEFAULT 'category' -- 'category' | 'source' | 'fund'
)
RETURNS TABLE (
  id uuid,
  code text,
  name text,
  group_type text,
  period_data jsonb,
  total_debit numeric(14,2),
  total_credit numeric(14,2)
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_fiscal_year record;
BEGIN
  -- Validate view_by parameter
  IF p_view_by NOT IN ('category', 'source', 'fund') THEN
    RAISE EXCEPTION 'Invalid view_by parameter: %. Must be category, source, or fund', p_view_by;
  END IF;

  -- Get fiscal year details
  SELECT fy.id, fy.start_date, fy.end_date
  INTO v_fiscal_year
  FROM fiscal_years fy
  WHERE fy.id = p_fiscal_year_id
    AND fy.tenant_id = p_tenant_id
    AND fy.deleted_at IS NULL;

  IF v_fiscal_year IS NULL THEN
    RAISE EXCEPTION 'Fiscal year not found or access denied';
  END IF;

  -- Return based on view_by type
  IF p_view_by = 'category' THEN
    RETURN QUERY
    WITH periods AS (
      SELECT fp.id AS period_id, fp.name AS period_name, fp.start_date, fp.end_date
      FROM fiscal_periods fp
      WHERE fp.fiscal_year_id = p_fiscal_year_id
        AND fp.tenant_id = p_tenant_id
        AND fp.deleted_at IS NULL
      ORDER BY fp.start_date
    ),
    category_period_totals AS (
      SELECT
        c.id AS category_id,
        c.code AS category_code,
        c.name AS category_name,
        c.type AS category_type,
        p.period_id,
        p.period_name,
        -- For expense categories, transaction_type in (expense, adjustment, allocation, closing_entry) are debits
        -- For income categories, transaction_type in (income, refund, opening_balance, fund_rollover) are credits
        COALESCE(SUM(CASE
          WHEN c.type = 'expense_transaction' AND iet.transaction_type IN ('expense', 'adjustment', 'allocation', 'closing_entry')
          THEN iet.amount
          ELSE 0
        END), 0) AS debit,
        COALESCE(SUM(CASE
          WHEN c.type = 'income_transaction' AND iet.transaction_type IN ('income', 'refund', 'opening_balance', 'fund_rollover')
          THEN iet.amount
          ELSE 0
        END), 0) AS credit
      FROM categories c
      CROSS JOIN periods p
      LEFT JOIN income_expense_transactions iet
        ON iet.category_id = c.id
        AND iet.tenant_id = p_tenant_id
        AND iet.transaction_date BETWEEN p.start_date AND p.end_date
        AND iet.deleted_at IS NULL
      WHERE c.tenant_id = p_tenant_id
        AND c.type IN ('income_transaction', 'expense_transaction')
        AND c.deleted_at IS NULL
      GROUP BY c.id, c.code, c.name, c.type, p.period_id, p.period_name, p.start_date
      ORDER BY c.code, p.start_date
    )
    SELECT
      cpt.category_id AS id,
      cpt.category_code AS code,
      cpt.category_name AS name,
      cpt.category_type AS group_type,
      jsonb_agg(
        jsonb_build_object(
          'period_id', cpt.period_id,
          'period_name', cpt.period_name,
          'debit', cpt.debit,
          'credit', cpt.credit
        ) ORDER BY cpt.period_name
      ) AS period_data,
      SUM(cpt.debit)::numeric(14,2) AS total_debit,
      SUM(cpt.credit)::numeric(14,2) AS total_credit
    FROM category_period_totals cpt
    GROUP BY cpt.category_id, cpt.category_code, cpt.category_name, cpt.category_type
    HAVING SUM(cpt.debit) > 0 OR SUM(cpt.credit) > 0
    ORDER BY cpt.category_type DESC, cpt.category_code;

  ELSIF p_view_by = 'source' THEN
    RETURN QUERY
    WITH periods AS (
      SELECT fp.id AS period_id, fp.name AS period_name, fp.start_date, fp.end_date
      FROM fiscal_periods fp
      WHERE fp.fiscal_year_id = p_fiscal_year_id
        AND fp.tenant_id = p_tenant_id
        AND fp.deleted_at IS NULL
      ORDER BY fp.start_date
    ),
    source_period_totals AS (
      SELECT
        fs.id AS source_id,
        fs.code AS source_code,
        fs.name AS source_name,
        fs.type AS source_type,
        p.period_id,
        p.period_name,
        -- Debits are withdrawals (expenses from source)
        COALESCE(SUM(CASE WHEN ft.entry_type = 'debit' THEN ft.amount ELSE 0 END), 0) AS debit,
        -- Credits are deposits (income to source)
        COALESCE(SUM(CASE WHEN ft.entry_type = 'credit' THEN ft.amount ELSE 0 END), 0) AS credit
      FROM financial_sources fs
      CROSS JOIN periods p
      LEFT JOIN financial_transactions ft
        ON ft.source_id = fs.id
        AND ft.tenant_id = p_tenant_id
        AND ft.deleted_at IS NULL
      LEFT JOIN financial_transaction_headers fth
        ON ft.header_id = fth.id
        AND fth.transaction_date BETWEEN p.start_date AND p.end_date
        AND fth.deleted_at IS NULL
      WHERE fs.tenant_id = p_tenant_id
        AND fs.deleted_at IS NULL
      GROUP BY fs.id, fs.code, fs.name, fs.type, p.period_id, p.period_name, p.start_date
      ORDER BY fs.code, p.start_date
    )
    SELECT
      spt.source_id AS id,
      spt.source_code AS code,
      spt.source_name AS name,
      spt.source_type AS group_type,
      jsonb_agg(
        jsonb_build_object(
          'period_id', spt.period_id,
          'period_name', spt.period_name,
          'debit', spt.debit,
          'credit', spt.credit
        ) ORDER BY spt.period_name
      ) AS period_data,
      SUM(spt.debit)::numeric(14,2) AS total_debit,
      SUM(spt.credit)::numeric(14,2) AS total_credit
    FROM source_period_totals spt
    GROUP BY spt.source_id, spt.source_code, spt.source_name, spt.source_type
    HAVING SUM(spt.debit) > 0 OR SUM(spt.credit) > 0
    ORDER BY spt.source_type, spt.source_code;

  ELSIF p_view_by = 'fund' THEN
    RETURN QUERY
    WITH periods AS (
      SELECT fp.id AS period_id, fp.name AS period_name, fp.start_date, fp.end_date
      FROM fiscal_periods fp
      WHERE fp.fiscal_year_id = p_fiscal_year_id
        AND fp.tenant_id = p_tenant_id
        AND fp.deleted_at IS NULL
      ORDER BY fp.start_date
    ),
    fund_period_totals AS (
      SELECT
        f.id AS fund_id,
        f.code AS fund_code,
        f.name AS fund_name,
        f.type AS fund_type,
        p.period_id,
        p.period_name,
        -- Debits are outflows from fund
        COALESCE(SUM(CASE WHEN ft.entry_type = 'debit' THEN ft.amount ELSE 0 END), 0) AS debit,
        -- Credits are inflows to fund
        COALESCE(SUM(CASE WHEN ft.entry_type = 'credit' THEN ft.amount ELSE 0 END), 0) AS credit
      FROM funds f
      CROSS JOIN periods p
      LEFT JOIN financial_transactions ft
        ON ft.fund_id = f.id
        AND ft.tenant_id = p_tenant_id
        AND ft.deleted_at IS NULL
      LEFT JOIN financial_transaction_headers fth
        ON ft.header_id = fth.id
        AND fth.transaction_date BETWEEN p.start_date AND p.end_date
        AND fth.deleted_at IS NULL
      WHERE f.tenant_id = p_tenant_id
        AND f.deleted_at IS NULL
      GROUP BY f.id, f.code, f.name, f.type, p.period_id, p.period_name, p.start_date
      ORDER BY f.code, p.start_date
    )
    SELECT
      fpt.fund_id AS id,
      fpt.fund_code AS code,
      fpt.fund_name AS name,
      fpt.fund_type AS group_type,
      jsonb_agg(
        jsonb_build_object(
          'period_id', fpt.period_id,
          'period_name', fpt.period_name,
          'debit', fpt.debit,
          'credit', fpt.credit
        ) ORDER BY fpt.period_name
      ) AS period_data,
      SUM(fpt.debit)::numeric(14,2) AS total_debit,
      SUM(fpt.credit)::numeric(14,2) AS total_credit
    FROM fund_period_totals fpt
    GROUP BY fpt.fund_id, fpt.fund_code, fpt.fund_name, fpt.fund_type
    HAVING SUM(fpt.debit) > 0 OR SUM(fpt.credit) > 0
    ORDER BY fpt.fund_type, fpt.fund_code;

  END IF;
END;
$$;

-- Helper function to get fiscal periods for a fiscal year (for UI)
CREATE OR REPLACE FUNCTION get_fiscal_year_periods(
  p_tenant_id uuid,
  p_fiscal_year_id uuid
)
RETURNS TABLE (
  period_id uuid,
  period_name text,
  start_date date,
  end_date date,
  status text
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT
    fp.id AS period_id,
    fp.name AS period_name,
    fp.start_date,
    fp.end_date,
    fp.status
  FROM fiscal_periods fp
  WHERE fp.fiscal_year_id = p_fiscal_year_id
    AND fp.tenant_id = p_tenant_id
    AND fp.deleted_at IS NULL
  ORDER BY fp.start_date;
$$;

-- Comments
COMMENT ON FUNCTION report_trial_balance_by_period(uuid, uuid, text) IS
  'Enhanced trial balance report showing period-by-period breakdown. Supports viewing by category, source, or fund.';

COMMENT ON FUNCTION get_fiscal_year_periods(uuid, uuid) IS
  'Returns all fiscal periods for a given fiscal year, ordered by start date.';
