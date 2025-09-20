-- Offering batches table and link to financial_transactions

-- Create offering_batches table
CREATE TABLE IF NOT EXISTS offering_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  service_description text,
  batch_date date NOT NULL,
  total_amount numeric(12,2) DEFAULT 0,
  created_by uuid REFERENCES auth.users(id),
  updated_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  deleted_at timestamptz
);

-- Indexes
CREATE INDEX IF NOT EXISTS offering_batches_tenant_id_idx ON offering_batches(tenant_id);
CREATE INDEX IF NOT EXISTS offering_batches_batch_date_idx ON offering_batches(batch_date);
CREATE INDEX IF NOT EXISTS offering_batches_deleted_at_idx ON offering_batches(deleted_at);

-- Enable Row Level Security
ALTER TABLE offering_batches ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Offering batches are viewable by tenant users" ON offering_batches
  FOR SELECT TO authenticated
  USING (
    tenant_id = get_current_tenant_id() AND deleted_at IS NULL
  );

CREATE POLICY "Offering batches can be managed by tenant admins" ON offering_batches
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM tenant_users tu
      WHERE tu.tenant_id = offering_batches.tenant_id
        AND tu.user_id = auth.uid()
        AND tu.admin_role IN ('super_admin','tenant_admin')
    ) AND deleted_at IS NULL
  );

-- updated_at trigger
CREATE TRIGGER update_offering_batches_updated_at
BEFORE UPDATE ON offering_batches
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

COMMENT ON TABLE offering_batches IS 'Groups of income offerings collected in a service';

-- Add batch_id column to financial_transactions
ALTER TABLE financial_transactions
  ADD COLUMN IF NOT EXISTS batch_id uuid REFERENCES offering_batches(id);

CREATE INDEX IF NOT EXISTS financial_transactions_batch_id_idx ON financial_transactions(batch_id);

COMMENT ON COLUMN financial_transactions.batch_id IS 'Reference to the offering batch for this transaction';

-- Function to refresh total_amount for a batch
CREATE OR REPLACE FUNCTION refresh_offering_batch_total(p_batch_id uuid)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE offering_batches b
  SET total_amount = COALESCE(
    (SELECT SUM(ft.amount) FROM financial_transactions ft
      WHERE ft.batch_id = p_batch_id AND ft.tenant_id = b.tenant_id), 0)
  WHERE b.id = p_batch_id;
END;
$$;

GRANT EXECUTE ON FUNCTION refresh_offering_batch_total(uuid) TO authenticated;

COMMENT ON FUNCTION refresh_offering_batch_total(uuid) IS
  'Recalculates the total amount for the specified offering batch';

-- Trigger function to refresh totals when transactions change
CREATE OR REPLACE FUNCTION handle_offering_batch_change()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP IN ('INSERT','UPDATE') AND NEW.batch_id IS NOT NULL THEN
    PERFORM refresh_offering_batch_total(NEW.batch_id);
  END IF;
  IF TG_OP IN ('UPDATE','DELETE') AND OLD.batch_id IS NOT NULL AND (TG_OP <> 'UPDATE' OR OLD.batch_id <> NEW.batch_id) THEN
    PERFORM refresh_offering_batch_total(OLD.batch_id);
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER offering_batch_change_insert
AFTER INSERT ON financial_transactions
FOR EACH ROW EXECUTE FUNCTION handle_offering_batch_change();

CREATE TRIGGER offering_batch_change_update
AFTER UPDATE ON financial_transactions
FOR EACH ROW EXECUTE FUNCTION handle_offering_batch_change();

CREATE TRIGGER offering_batch_change_delete
AFTER DELETE ON financial_transactions
FOR EACH ROW EXECUTE FUNCTION handle_offering_batch_change();
