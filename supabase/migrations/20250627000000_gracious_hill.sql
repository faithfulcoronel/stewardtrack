-- Aggregate member transactions for contribution statements

-- Drop function if exists to allow re-run
DROP FUNCTION IF EXISTS get_member_statement(date, date);

-- Function to aggregate income transactions by member and fund
CREATE OR REPLACE FUNCTION get_member_statement(p_start_date date, p_end_date date)
RETURNS TABLE (
  member_id uuid,
  first_name text,
  last_name text,
  fund_id uuid,
  fund_name text,
  total_amount numeric
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  RETURN QUERY
    SELECT
      m.id,
      m.first_name,
      m.last_name,
      f.id AS fund_id,
      f.name AS fund_name,
      SUM(ft.amount) AS total_amount
    FROM members m
    JOIN financial_transactions ft ON ft.member_id = m.id
    LEFT JOIN designated_funds f ON ft.fund_id = f.id
    WHERE m.tenant_id = get_user_tenant_id()
      AND ft.tenant_id = m.tenant_id
      AND ft.date BETWEEN p_start_date AND p_end_date
      AND (SELECT code FROM categories WHERE id = m.status_category_id) IN ('active','donor')
      AND ft.type = 'income'
    GROUP BY m.id, m.first_name, m.last_name, f.id, f.name
    HAVING SUM(ft.amount) <> 0
    ORDER BY m.last_name, m.first_name, f.name;
END;
$$;

GRANT EXECUTE ON FUNCTION get_member_statement(date, date) TO authenticated;

COMMENT ON FUNCTION get_member_statement(date, date) IS
  'Aggregates income transactions by member and fund for active or donor members within a date range.';
