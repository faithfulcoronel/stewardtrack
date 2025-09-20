-- Create audit_logs table
CREATE TABLE IF NOT EXISTS audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES tenants(id) ON DELETE CASCADE,
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id text NOT NULL,
  changes jsonb NOT NULL DEFAULT '{}'::jsonb,
  performed_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Audit logs are viewable by tenant users"
  ON audit_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM tenant_users
      WHERE tenant_users.tenant_id = audit_logs.tenant_id
      AND tenant_users.user_id = auth.uid()
    )
  );

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_audit_logs_tenant_id ON audit_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity_type ON audit_logs(entity_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);

-- Create function to record audit log
CREATE OR REPLACE FUNCTION record_audit_log(
  p_action text,
  p_entity_type text,
  p_entity_id text,
  p_changes jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
SECURITY DEFINER
SET search_path = public, auth
LANGUAGE plpgsql
AS $$
DECLARE
  v_tenant_id uuid;
  v_log_id uuid;
BEGIN
  -- Get current tenant ID
  SELECT tenant_id INTO v_tenant_id
  FROM tenant_users
  WHERE user_id = auth.uid()
  LIMIT 1;

  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'No tenant context found';
  END IF;

  -- Insert audit log
  INSERT INTO audit_logs (
    tenant_id,
    action,
    entity_type,
    entity_id,
    changes,
    performed_by
  )
  VALUES (
    v_tenant_id,
    p_action,
    p_entity_type,
    p_entity_id,
    p_changes,
    auth.uid()
  )
  RETURNING id INTO v_log_id;

  RETURN v_log_id;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION record_audit_log(text, text, text, jsonb) TO authenticated;

-- Add helpful comments
COMMENT ON TABLE audit_logs IS 'Stores audit trail of all important actions in the system';
COMMENT ON FUNCTION record_audit_log IS 'Records an audit log entry with proper tenant isolation';