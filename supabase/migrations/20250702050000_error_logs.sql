-- Create error_logs table for capturing application errors
CREATE TABLE IF NOT EXISTS error_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES tenants(id) ON DELETE CASCADE,
  message text NOT NULL,
  stack text,
  context jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_error_logs_tenant_id ON error_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_error_logs_created_at ON error_logs(created_at);

-- Enable RLS
ALTER TABLE error_logs ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to view and insert error logs
DROP POLICY IF EXISTS "Error logs policy" ON error_logs;
CREATE POLICY "Error logs policy"
  ON error_logs FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- RPC function for convenience
CREATE OR REPLACE FUNCTION record_error_log(
  p_message text,
  p_stack text DEFAULT NULL,
  p_context jsonb DEFAULT '{}'::jsonb
) RETURNS uuid
SECURITY DEFINER
SET search_path = public, auth
LANGUAGE plpgsql
AS $$
DECLARE
  v_tenant_id uuid;
  v_log_id uuid;
BEGIN
  SELECT tenant_id INTO v_tenant_id
  FROM tenant_users
  WHERE user_id = auth.uid()
  LIMIT 1;

  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'No tenant context found';
  END IF;

  INSERT INTO error_logs (
    tenant_id,
    message,
    stack,
    context,
    created_by
  ) VALUES (
    v_tenant_id,
    p_message,
    p_stack,
    p_context,
    auth.uid()
  ) RETURNING id INTO v_log_id;

  RETURN v_log_id;
END;
$$;

GRANT EXECUTE ON FUNCTION record_error_log(text, text, jsonb) TO authenticated;

COMMENT ON TABLE error_logs IS 'Stores detailed error information for diagnostics';
COMMENT ON FUNCTION record_error_log IS 'Records an application error with tenant isolation';
