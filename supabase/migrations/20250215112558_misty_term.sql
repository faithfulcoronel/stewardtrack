-- Drop existing function
DROP FUNCTION IF EXISTS get_current_month_birthdays();

-- Create improved function with tenant isolation
CREATE OR REPLACE FUNCTION get_current_month_birthdays()
RETURNS TABLE (
  id uuid,
  first_name text,
  last_name text,
  birthday date
)
SECURITY DEFINER
SET search_path = public, auth
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  current_tenant_id uuid;
BEGIN
  -- Get current tenant ID
  SELECT t.id INTO current_tenant_id
  FROM tenants t
  JOIN tenant_users tu ON t.id = tu.tenant_id
  WHERE tu.user_id = auth.uid()
  LIMIT 1;

  -- Return if no tenant found
  IF current_tenant_id IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT 
    m.id,
    m.first_name,
    m.last_name,
    m.birthday
  FROM members m
  WHERE 
    m.tenant_id = current_tenant_id
    AND m.deleted_at IS NULL
    AND m.birthday IS NOT NULL
    AND date_part('month', m.birthday) = date_part('month', CURRENT_DATE)
  ORDER BY date_part('day', m.birthday);
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_current_month_birthdays() TO authenticated;

-- Add helpful comment
COMMENT ON FUNCTION get_current_month_birthdays() IS 
  'Returns all members with birthdays in the current month for the current tenant, ordered by day of month';