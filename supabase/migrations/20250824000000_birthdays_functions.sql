-- Update birthday functions and add monthly lookup
DROP FUNCTION IF EXISTS get_current_month_birthdays();

CREATE OR REPLACE FUNCTION get_current_month_birthdays()
RETURNS TABLE (
  id uuid,
  first_name text,
  last_name text,
  birthday date,
  profile_picture_url text
)
SECURITY DEFINER
SET search_path = public, auth
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  current_tenant_id uuid;
BEGIN
  SELECT t.id INTO current_tenant_id
  FROM tenants t
  JOIN tenant_users tu ON t.id = tu.tenant_id
  WHERE tu.user_id = auth.uid()
  LIMIT 1;

  IF current_tenant_id IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    m.id,
    m.first_name,
    m.last_name,
    m.birthday,
    m.profile_picture_url
  FROM members m
  WHERE
    m.tenant_id = current_tenant_id
    AND m.deleted_at IS NULL
    AND m.birthday IS NOT NULL
    AND date_part('month', m.birthday) = date_part('month', CURRENT_DATE)
  ORDER BY date_part('day', m.birthday);
END;
$$;

GRANT EXECUTE ON FUNCTION get_current_month_birthdays() TO authenticated;

COMMENT ON FUNCTION get_current_month_birthdays() IS
  'Returns all members with birthdays in the current month for the current tenant, ordered by day of month';

CREATE OR REPLACE FUNCTION get_birthdays_for_month(p_month integer)
RETURNS TABLE (
  id uuid,
  first_name text,
  last_name text,
  birthday date,
  profile_picture_url text
)
SECURITY DEFINER
SET search_path = public, auth
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  current_tenant_id uuid;
BEGIN
  SELECT t.id INTO current_tenant_id
  FROM tenants t
  JOIN tenant_users tu ON t.id = tu.tenant_id
  WHERE tu.user_id = auth.uid()
  LIMIT 1;

  IF current_tenant_id IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    m.id,
    m.first_name,
    m.last_name,
    m.birthday,
    m.profile_picture_url
  FROM members m
  WHERE
    m.tenant_id = current_tenant_id
    AND m.deleted_at IS NULL
    AND m.birthday IS NOT NULL
    AND date_part('month', m.birthday) = p_month
  ORDER BY date_part('day', m.birthday);
END;
$$;

GRANT EXECUTE ON FUNCTION get_birthdays_for_month(integer) TO authenticated;

COMMENT ON FUNCTION get_birthdays_for_month(integer) IS
  'Returns all members with birthdays in the specified month for the current tenant, ordered by day of month';
