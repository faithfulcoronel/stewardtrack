-- Fix fiscal periods trigger to bypass RLS
-- The trigger function needs SECURITY DEFINER to insert fiscal periods
-- when a new fiscal year is created

-- Recreate the function with SECURITY DEFINER
CREATE OR REPLACE FUNCTION create_monthly_fiscal_periods(p_year_id uuid, p_user_id uuid)
RETURNS void AS $$
DECLARE
  v_year fiscal_years;
  v_start date;
  v_end date;
  v_name text;
BEGIN
  SELECT * INTO v_year FROM fiscal_years WHERE id = p_year_id;
  IF v_year.id IS NULL THEN
    RAISE EXCEPTION 'Fiscal year not found';
  END IF;
  v_start := date_trunc('month', v_year.start_date);
  WHILE v_start <= v_year.end_date LOOP
    v_end := (v_start + interval '1 month - 1 day')::date;
    IF v_end > v_year.end_date THEN
      v_end := v_year.end_date;
    END IF;
    v_name := to_char(v_start, 'Mon YYYY');
    INSERT INTO fiscal_periods (fiscal_year_id, name, start_date, end_date, created_by, updated_by)
    VALUES (p_year_id, v_name, v_start, v_end, p_user_id, p_user_id);
    v_start := (v_start + interval '1 month')::date;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger function with SECURITY DEFINER
CREATE OR REPLACE FUNCTION create_fiscal_periods_for_new_year()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM create_monthly_fiscal_periods(NEW.id, NEW.created_by);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION create_monthly_fiscal_periods(uuid, uuid) TO authenticated;

-- Add a function to manually generate periods for existing fiscal years
-- that don't have periods (useful for fixing existing data)
CREATE OR REPLACE FUNCTION generate_missing_fiscal_periods()
RETURNS TABLE(fiscal_year_id uuid, fiscal_year_name text, periods_created int) AS $$
DECLARE
  v_year RECORD;
  v_count int;
BEGIN
  FOR v_year IN
    SELECT fy.id, fy.name, fy.created_by
    FROM fiscal_years fy
    WHERE fy.deleted_at IS NULL
      AND NOT EXISTS (
        SELECT 1 FROM fiscal_periods fp
        WHERE fp.fiscal_year_id = fy.id
          AND fp.deleted_at IS NULL
      )
  LOOP
    v_count := 0;
    PERFORM create_monthly_fiscal_periods(v_year.id, v_year.created_by);
    SELECT COUNT(*) INTO v_count
    FROM fiscal_periods fp
    WHERE fp.fiscal_year_id = v_year.id
      AND fp.deleted_at IS NULL;

    fiscal_year_id := v_year.id;
    fiscal_year_name := v_year.name;
    periods_created := v_count;
    RETURN NEXT;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION generate_missing_fiscal_periods() TO authenticated;

-- Generate periods for any existing fiscal years that are missing them
SELECT * FROM generate_missing_fiscal_periods();
