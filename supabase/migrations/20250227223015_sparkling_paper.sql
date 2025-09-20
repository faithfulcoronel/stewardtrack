-- Create function to get audit logs with user info
CREATE OR REPLACE FUNCTION get_audit_logs(
  p_start_date date,
  p_end_date date,
  p_action text DEFAULT NULL,
  p_entity_type text DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  action text,
  entity_type text,
  entity_id text,
  changes jsonb,
  created_at timestamptz,
  performed_by uuid,
  user_email text,
  user_metadata jsonb
)
SECURITY DEFINER
SET search_path = public, auth
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  -- Get current tenant ID
  RETURN QUERY
  SELECT 
    al.id,
    al.action,
    al.entity_type,
    al.entity_id,
    al.changes,
    al.created_at,
    al.performed_by,
    u.email as user_email,
    u.raw_user_meta_data as user_metadata
  FROM audit_logs al
  JOIN tenant_users tu ON al.tenant_id = tu.tenant_id
  LEFT JOIN auth.users u ON al.performed_by = u.id
  WHERE tu.user_id = auth.uid()
  AND al.created_at >= p_start_date
  AND al.created_at <= p_end_date
  AND (p_action IS NULL OR al.action = p_action)
  AND (p_entity_type IS NULL OR al.entity_type = p_entity_type)
  ORDER BY al.created_at DESC;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_audit_logs(date, date, text, text) TO authenticated;

-- Add helpful comment
COMMENT ON FUNCTION get_audit_logs IS
  'Returns audit logs with user information for the current tenant with optional filtering';