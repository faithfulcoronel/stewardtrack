-- Add fund_id column to categories for default fund reference
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'categories'
      AND column_name = 'fund_id'
  ) THEN
    ALTER TABLE categories
      ADD COLUMN fund_id uuid REFERENCES funds(id);
  END IF;
END $$;

-- Create index for fund_id
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE tablename = 'categories'
      AND indexname = 'categories_fund_id_idx'
  ) THEN
    CREATE INDEX categories_fund_id_idx ON categories(fund_id);
  END IF;
END $$;

COMMENT ON COLUMN categories.fund_id IS 'Default fund linked to this category';
