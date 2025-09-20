-- Add description column to funds
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'funds'
      AND column_name = 'description'
  ) THEN
    ALTER TABLE funds ADD COLUMN description text;
  END IF;
END $$;

COMMENT ON COLUMN funds.description IS
  'Optional description of the fund';
