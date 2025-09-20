-- Add code column to funds table
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'funds'
      AND column_name = 'code'
  ) THEN
    ALTER TABLE funds ADD COLUMN code text;
  END IF;
END $$;

-- Add unique constraint on tenant_id and code
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'funds_tenant_id_code_unique'
  ) THEN
    ALTER TABLE funds
    ADD CONSTRAINT funds_tenant_id_code_unique UNIQUE (tenant_id, code);
  END IF;
END $$;

COMMENT ON COLUMN funds.code IS
  'Short unique identifier for the fund';
