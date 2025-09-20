-- Use tenant settings for Member Offering Summary membership filters
DROP FUNCTION IF EXISTS get_member_statement(date, date, uuid[], integer, integer);
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
DECLARE
  v_membership_type_id uuid;
  v_membership_status_id uuid;
BEGIN
  SELECT value::uuid INTO v_membership_type_id
  FROM settings
  WHERE key = 'reports.member_offering.membership_type'
    AND tenant_id = get_user_tenant_id()
    AND deleted_at IS NULL
  LIMIT 1;

  IF v_membership_type_id IS NULL THEN
    SELECT id INTO v_membership_type_id
    FROM membership_type
    WHERE tenant_id = get_user_tenant_id()
      AND LOWER(name) = 'member'
    LIMIT 1;
  END IF;

  SELECT value::uuid INTO v_membership_status_id
  FROM settings
  WHERE key = 'reports.member_offering.membership_status'
    AND tenant_id = get_user_tenant_id()
    AND deleted_at IS NULL
  LIMIT 1;

  IF v_membership_status_id IS NULL THEN
    SELECT id INTO v_membership_status_id
    FROM membership_status
    WHERE tenant_id = get_user_tenant_id()
      AND LOWER(name) = 'active'
    LIMIT 1;
  END IF;

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
    JOIN financial_transactions ft ON ft.accounts_account_id = a.id
      AND ft.deleted_at IS NULL
    LEFT JOIN categories c ON ft.category_id = c.id
    LEFT JOIN funds f ON ft.fund_id = f.id
    LEFT JOIN financial_sources fs ON ft.source_id = fs.id
    LEFT JOIN membership_status ms ON m.membership_status_id = ms.id
    LEFT JOIN membership_type mt ON m.membership_type_id = mt.id
    LEFT JOIN chart_of_accounts coa ON ft.account_id = coa.id
    WHERE m.tenant_id = get_user_tenant_id()
      AND ft.tenant_id = m.tenant_id
      AND ft.date BETWEEN p_start_date AND p_end_date
      AND (v_membership_type_id IS NULL OR m.membership_type_id = v_membership_type_id)
      AND (v_membership_status_id IS NULL OR m.membership_status_id = v_membership_status_id)
      AND coa.account_type = 'revenue'
      AND (p_member_ids IS NULL OR m.id = ANY(p_member_ids))
    ORDER BY ft.date, m.last_name, m.first_name
    LIMIT p_limit OFFSET COALESCE(p_offset, 0);
END;
$$;

GRANT EXECUTE ON FUNCTION get_member_statement(date, date, uuid[], integer, integer) TO authenticated;
COMMENT ON FUNCTION get_member_statement(date, date, uuid[], integer, integer) IS
  'Detailed giving transactions for active or donor members within a date range with optional pagination and member filtering.';
