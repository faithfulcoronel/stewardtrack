-- Add default tracking columns and RLS to income_expense_transaction_mappings
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'income_expense_transaction_mappings'
      AND column_name = 'tenant_id'
  ) THEN
    ALTER TABLE income_expense_transaction_mappings
      ADD COLUMN tenant_id uuid REFERENCES tenants(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'income_expense_transaction_mappings'
      AND column_name = 'created_by'
  ) THEN
    ALTER TABLE income_expense_transaction_mappings
      ADD COLUMN created_by uuid REFERENCES auth.users(id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'income_expense_transaction_mappings'
      AND column_name = 'updated_by'
  ) THEN
    ALTER TABLE income_expense_transaction_mappings
      ADD COLUMN updated_by uuid REFERENCES auth.users(id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'income_expense_transaction_mappings'
      AND column_name = 'deleted_at'
  ) THEN
    ALTER TABLE income_expense_transaction_mappings
      ADD COLUMN deleted_at timestamptz;
  END IF;
END $$;

-- Create indexes if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE tablename = 'income_expense_transaction_mappings'
      AND indexname = 'idx_ietm_tenant_id'
  ) THEN
    CREATE INDEX idx_ietm_tenant_id
      ON income_expense_transaction_mappings(tenant_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE tablename = 'income_expense_transaction_mappings'
      AND indexname = 'idx_ietm_deleted_at'
  ) THEN
    CREATE INDEX idx_ietm_deleted_at
      ON income_expense_transaction_mappings(deleted_at);
  END IF;
END $$;

-- Enable RLS
ALTER TABLE income_expense_transaction_mappings ENABLE ROW LEVEL SECURITY;

-- Basic policies
DROP POLICY IF EXISTS "IETM view" ON income_expense_transaction_mappings;
CREATE POLICY "IETM view"
  ON income_expense_transaction_mappings
  FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "IETM manage" ON income_expense_transaction_mappings;
CREATE POLICY "IETM manage"
  ON income_expense_transaction_mappings
  FOR ALL TO authenticated
  USING (true);

-- updated_at trigger
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'update_income_expense_transaction_mappings_updated_at'
  ) THEN
    CREATE TRIGGER update_income_expense_transaction_mappings_updated_at
    BEFORE UPDATE ON income_expense_transaction_mappings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  END IF;
END $$;

COMMENT ON TABLE income_expense_transaction_mappings IS 'Mapping from income/expense transactions to double-entry transactions with tenant tracking.';
