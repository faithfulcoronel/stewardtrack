-- Add billing_cycle column to tenants table
ALTER TABLE tenants
ADD COLUMN IF NOT EXISTS billing_cycle text NOT NULL DEFAULT 'monthly'
CHECK (billing_cycle IN ('monthly', 'annual'));

-- Add comment explaining billing cycle field
COMMENT ON COLUMN tenants.billing_cycle IS 
  'The tenant''s billing cycle: monthly or annual';

-- Drop existing function
DROP FUNCTION IF EXISTS update_tenant_subscription(text);

-- Create improved function to update tenant subscription with billing cycle
CREATE OR REPLACE FUNCTION update_tenant_subscription(
  p_subscription_tier text,
  p_billing_cycle text DEFAULT 'monthly'
)
RETURNS jsonb
SECURITY DEFINER
SET search_path = public, auth
LANGUAGE plpgsql
AS $$
DECLARE
  v_tenant_id uuid;
  v_current_tier text;
  v_result jsonb;
BEGIN
  -- Get current tenant ID
  SELECT t.id, t.subscription_tier 
  INTO v_tenant_id, v_current_tier
  FROM tenants t
  JOIN tenant_users tu ON t.id = tu.tenant_id
  WHERE tu.user_id = auth.uid()
  AND tu.admin_role IN ('super_admin', 'tenant_admin')
  LIMIT 1;

  -- Check if user has permission
  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  -- Validate subscription tier
  IF p_subscription_tier NOT IN ('free', 'basic', 'advanced', 'premium', 'enterprise') THEN
    RAISE EXCEPTION 'Invalid subscription tier';
  END IF;

  -- Validate billing cycle
  IF p_billing_cycle NOT IN ('monthly', 'annual') THEN
    RAISE EXCEPTION 'Invalid billing cycle';
  END IF;

  -- Update subscription
  UPDATE tenants
  SET 
    subscription_tier = p_subscription_tier,
    subscription_status = 'active',
    billing_cycle = p_billing_cycle,
    subscription_end_date = CASE 
      WHEN p_subscription_tier = 'free' THEN NULL
      WHEN p_billing_cycle = 'annual' THEN now() + interval '1 year'
      ELSE now() + interval '1 month'
    END,
    updated_at = now()
  WHERE id = v_tenant_id
  RETURNING jsonb_build_object(
    'id', id,
    'subscription_tier', subscription_tier,
    'subscription_status', subscription_status,
    'billing_cycle', billing_cycle,
    'subscription_end_date', subscription_end_date,
    'updated_at', updated_at
  ) INTO v_result;

  RETURN v_result;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION update_tenant_subscription(text, text) TO authenticated;

-- Add helpful comment
COMMENT ON FUNCTION update_tenant_subscription IS
  'Updates tenant subscription tier and billing cycle with proper validation and permission checks';