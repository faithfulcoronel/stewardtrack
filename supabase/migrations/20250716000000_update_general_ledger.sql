-- Update general ledger report to return account details
DROP FUNCTION IF EXISTS report_general_ledger(uuid, date, date, uuid);

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
  JOIN chart_of_accounts coa ON ft.account_id = coa.id
  WHERE ft.tenant_id = p_tenant_id
    AND ft.date BETWEEN p_start_date AND p_end_date
    AND (p_account_id IS NULL OR ft.account_id = p_account_id)
  ORDER BY ft.date, ft.id;
END;
$$;

GRANT EXECUTE ON FUNCTION report_general_ledger(uuid, date, date, uuid) TO authenticated;
COMMENT ON FUNCTION report_general_ledger(uuid, date, date, uuid) IS
  'Detailed ledger entries for a tenant within a date range';
