-- Add updated_at and updated_by columns to error_logs table if they do not exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'error_logs' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE error_logs ADD COLUMN updated_at timestamptz DEFAULT now();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'error_logs' AND column_name = 'updated_by'
  ) THEN
    ALTER TABLE error_logs ADD COLUMN updated_by uuid REFERENCES auth.users(id);
  END IF;
END $$;

-- Create updated_at trigger for error_logs if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'update_error_logs_updated_at'
  ) THEN
    CREATE TRIGGER update_error_logs_updated_at
    BEFORE UPDATE ON error_logs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  END IF;
END $$;

COMMENT ON TABLE error_logs IS 'Stores detailed error information for diagnostics with tenant isolation';
