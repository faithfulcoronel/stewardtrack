-- Add RPC to fetch unmapped financial transaction headers
DROP FUNCTION IF EXISTS get_unmapped_headers(uuid);

CREATE OR REPLACE FUNCTION get_unmapped_headers(
  p_tenant_id uuid
)
RETURNS SETOF financial_transaction_headers
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  IF NOT check_tenant_access(p_tenant_id) THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  RETURN QUERY
  SELECT DISTINCT fth.*
  FROM financial_transaction_headers fth
  LEFT JOIN income_expense_transaction_mappings ietm
    ON fth.id = ietm.transaction_header_id
  WHERE ietm.transaction_header_id IS NULL
    AND fth.tenant_id = p_tenant_id
    AND fth.deleted_at IS NULL;
END;
$$;

GRANT EXECUTE ON FUNCTION get_unmapped_headers(uuid) TO authenticated;

COMMENT ON FUNCTION get_unmapped_headers(uuid) IS
  'Returns transaction headers with no income/expense mapping for the given tenant.';
