-- Create function to get birthdays for current month
CREATE OR REPLACE FUNCTION get_current_month_birthdays()
RETURNS TABLE (
  id uuid,
  first_name text,
  last_name text,
  birthday date
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    m.id,
    m.first_name,
    m.last_name,
    m.birthday
  FROM members m
  WHERE 
    m.deleted_at IS NULL
    AND m.birthday IS NOT NULL
    AND date_part('month', m.birthday) = date_part('month', CURRENT_DATE)
  ORDER BY date_part('day', m.birthday);
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_current_month_birthdays() TO authenticated;

-- Add helpful comment
COMMENT ON FUNCTION get_current_month_birthdays() IS 
  'Returns all members with birthdays in the current month, ordered by day of month';