-- Add tenant_id column to fiscal_periods and update policies

-- Add column if not exists
ALTER TABLE fiscal_periods
  ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES tenants(id) ON DELETE CASCADE;

-- Populate tenant_id for existing rows
UPDATE fiscal_periods fp
SET tenant_id = fy.tenant_id
FROM fiscal_years fy
WHERE fp.fiscal_year_id = fy.id
  AND fp.tenant_id IS NULL;

-- Make tenant_id not null
ALTER TABLE fiscal_periods
  ALTER COLUMN tenant_id SET NOT NULL;

-- Create index on tenant_id
CREATE INDEX IF NOT EXISTS fiscal_periods_tenant_id_idx
  ON fiscal_periods(tenant_id);

-- Update RLS policies
DROP POLICY IF EXISTS "Fiscal periods are viewable within tenant" ON fiscal_periods;
CREATE POLICY "Fiscal periods are viewable within tenant" ON fiscal_periods
  FOR SELECT TO authenticated
  USING (check_tenant_access(tenant_id) AND deleted_at IS NULL);

DROP POLICY IF EXISTS "Fiscal periods can be managed within tenant" ON fiscal_periods;
CREATE POLICY "Fiscal periods can be managed within tenant" ON fiscal_periods
  FOR ALL TO authenticated
  USING (check_tenant_access(tenant_id) AND deleted_at IS NULL)
  WITH CHECK (check_tenant_access(tenant_id));

-- Update create_monthly_fiscal_periods function to include tenant_id
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
$$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION create_monthly_fiscal_periods(uuid, uuid) TO authenticated;
