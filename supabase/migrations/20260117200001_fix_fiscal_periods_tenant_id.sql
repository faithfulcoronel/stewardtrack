-- Fix fiscal periods trigger to include tenant_id
-- The previous migration (20260115100000) accidentally removed tenant_id
-- from the INSERT statement when adding SECURITY DEFINER

-- Recreate the function with both SECURITY DEFINER and tenant_id
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
    INSERT INTO fiscal_periods (
      fiscal_year_id,
      tenant_id,
      name,
      start_date,
      end_date,
      created_by,
      updated_by
    ) VALUES (
      p_year_id,
      v_year.tenant_id,
      v_name,
      v_start,
      v_end,
      p_user_id,
      p_user_id
    );
    v_start := (v_start + interval '1 month')::date;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION create_monthly_fiscal_periods(uuid, uuid) TO authenticated;
