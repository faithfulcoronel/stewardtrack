-- Create function to get enum values by category
CREATE OR REPLACE FUNCTION get_enum_values_by_category(p_category text)
RETURNS TABLE (
  value text,
  label text,
  category_name text
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  CASE p_category
    WHEN 'membership_type' THEN
      RETURN QUERY
      SELECT 
        e.enumlabel as value,
        initcap(replace(e.enumlabel, '_', ' ')) as label,
        'membership_type' as category_name
      FROM pg_type t
      JOIN pg_enum e ON t.oid = e.enumtypid
      WHERE t.typname = 'membership_type'
      ORDER BY e.enumsortorder;
      
    WHEN 'member_status' THEN
      RETURN QUERY
      SELECT 
        e.enumlabel as value,
        initcap(replace(e.enumlabel, '_', ' ')) as label,
        'member_status' as category_name
      FROM pg_type t
      JOIN pg_enum e ON t.oid = e.enumtypid
      WHERE t.typname = 'member_status'
      ORDER BY e.enumsortorder;
      
    WHEN 'transaction_type' THEN
      RETURN QUERY
      SELECT 
        e.enumlabel as value,
        initcap(replace(e.enumlabel, '_', ' ')) as label,
        'transaction_type' as category_name
      FROM pg_type t
      JOIN pg_enum e ON t.oid = e.enumtypid
      WHERE t.typname = 'financial_transaction_type'
      ORDER BY e.enumsortorder;
      
    WHEN 'transaction_category' THEN
      RETURN QUERY
      SELECT 
        e.enumlabel as value,
        initcap(replace(e.enumlabel, '_', ' ')) as label,
        'transaction_category' as category_name
      FROM pg_type t
      JOIN pg_enum e ON t.oid = e.enumtypid
      WHERE t.typname = 'financial_transaction_category'
      ORDER BY e.enumsortorder;
      
    ELSE
      RAISE EXCEPTION 'Invalid category: %', p_category;
  END CASE;
END;
$$;

-- Create function to get tenant statistics
CREATE OR REPLACE FUNCTION get_tenant_statistics(p_tenant_id uuid)
RETURNS jsonb
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  result jsonb;
BEGIN
  -- Check if user has access to tenant
  IF NOT EXISTS (
    SELECT 1 FROM tenant_users
    WHERE tenant_users.tenant_id = p_tenant_id
    AND tenant_users.user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  WITH stats AS (
    SELECT
      COUNT(DISTINCT m.id) as total_members,
      COUNT(DISTINCT CASE WHEN m.status = 'active' THEN m.id END) as active_members,
      COUNT(DISTINCT CASE WHEN m.deleted_at IS NOT NULL THEN m.id END) as deleted_members,
      COUNT(DISTINCT ft.id) as total_transactions,
      COALESCE(SUM(CASE WHEN ft.type = 'income' THEN ft.amount ELSE 0 END), 0) as total_income,
      COALESCE(SUM(CASE WHEN ft.type = 'expense' THEN ft.amount ELSE 0 END), 0) as total_expenses,
      COUNT(DISTINCT b.id) as total_budgets,
      COUNT(DISTINCT CASE 
        WHEN b.start_date <= CURRENT_DATE AND b.end_date >= CURRENT_DATE 
        THEN b.id 
      END) as active_budgets
    FROM tenants t
    LEFT JOIN members m ON m.tenant_id = t.id
    LEFT JOIN financial_transactions ft ON ft.tenant_id = t.id
    LEFT JOIN budgets b ON b.tenant_id = t.id
    WHERE t.id = p_tenant_id
  )
  SELECT jsonb_build_object(
    'members', jsonb_build_object(
      'total', total_members,
      'active', active_members,
      'deleted', deleted_members
    ),
    'transactions', jsonb_build_object(
      'total', total_transactions,
      'income', total_income,
      'expenses', total_expenses,
      'balance', total_income - total_expenses
    ),
    'budgets', jsonb_build_object(
      'total', total_budgets,
      'active', active_budgets
    )
  ) INTO result
  FROM stats;

  RETURN result;
END;
$$;

-- Create function to check tenant subscription status
CREATE OR REPLACE FUNCTION check_tenant_subscription(p_tenant_id uuid)
RETURNS jsonb
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  tenant_data tenants%ROWTYPE;
  result jsonb;
BEGIN
  -- Check if user has access to tenant
  IF NOT EXISTS (
    SELECT 1 FROM tenant_users
    WHERE tenant_users.tenant_id = p_tenant_id
    AND tenant_users.user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  -- Get tenant data
  SELECT * INTO tenant_data
  FROM tenants
  WHERE id = p_tenant_id;

  -- Build result
  SELECT jsonb_build_object(
    'status', tenant_data.subscription_status,
    'tier', tenant_data.subscription_tier,
    'expires_at', tenant_data.subscription_end_date,
    'is_active', 
      tenant_data.subscription_status = 'active' AND
      (tenant_data.subscription_end_date IS NULL OR 
       tenant_data.subscription_end_date > now()),
    'days_remaining',
      CASE 
        WHEN tenant_data.subscription_end_date IS NULL THEN NULL
        ELSE EXTRACT(DAY FROM tenant_data.subscription_end_date - now())::integer
      END
  ) INTO result;

  RETURN result;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_enum_values_by_category(text) TO authenticated;
GRANT EXECUTE ON FUNCTION get_tenant_statistics(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION check_tenant_subscription(uuid) TO authenticated;

-- Add helpful comments
COMMENT ON FUNCTION get_enum_values_by_category(text) IS
  'Returns formatted enum values for a specific category with proper labels';

COMMENT ON FUNCTION get_tenant_statistics(uuid) IS
  'Returns comprehensive statistics for a tenant including members, transactions, and budgets';

COMMENT ON FUNCTION check_tenant_subscription(uuid) IS
  'Checks and returns the subscription status for a tenant';