-- Add chart_of_account_id column to categories
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'categories'
      AND column_name = 'chart_of_account_id'
  ) THEN
    ALTER TABLE categories
      ADD COLUMN chart_of_account_id uuid REFERENCES chart_of_accounts(id);
  END IF;
END $$;

-- Create index for the new column
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE tablename = 'categories'
      AND indexname = 'categories_chart_account_idx'
  ) THEN
    CREATE INDEX categories_chart_account_idx
      ON categories(chart_of_account_id);
  END IF;
END $$;

COMMENT ON COLUMN categories.chart_of_account_id IS
  'Optional chart of account linked to this category';
