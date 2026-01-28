-- =============================================================================
-- Migration: Quota Management Functions
-- =============================================================================
-- Description: Creates functions for quota checking, incrementing, and summary
--              retrieval. These functions power the quota enforcement system.
-- Date: 2026-01-28
-- Author: Claude Code
-- =============================================================================

BEGIN;

-- =============================================================================
-- Function: check_quota_allowed
-- Purpose: Check if an operation is within quota limits
-- Returns: BOOLEAN (true if allowed, false if would exceed quota)
-- =============================================================================
CREATE OR REPLACE FUNCTION check_quota_allowed(
  p_tenant_id UUID,
  p_quota_type TEXT,
  p_increment INTEGER DEFAULT 1
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_value INTEGER;
  v_limit_value INTEGER;
  v_license_id UUID;
  v_offering_id UUID;
BEGIN
  -- Get tenant's active license and offering
  SELECT l.id, l.offering_id INTO v_license_id, v_offering_id
  FROM licenses l
  WHERE l.tenant_id = p_tenant_id
    AND l.status = 'active'
    AND (l.expires_at IS NULL OR l.expires_at > NOW())
  ORDER BY l.created_at DESC
  LIMIT 1;

  -- If no active license, deny by default
  IF v_offering_id IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Ensure tenant has a usage record
  INSERT INTO tenant_usage (tenant_id)
  VALUES (p_tenant_id)
  ON CONFLICT (tenant_id) DO NOTHING;

  -- Get current usage and limit based on quota type
  CASE p_quota_type
    WHEN 'members' THEN
      SELECT tu.current_members, po.max_members
      INTO v_current_value, v_limit_value
      FROM tenant_usage tu
      JOIN product_offerings po ON po.id = v_offering_id
      WHERE tu.tenant_id = p_tenant_id;

    WHEN 'admin_users' THEN
      SELECT tu.current_admin_users, po.max_admin_users
      INTO v_current_value, v_limit_value
      FROM tenant_usage tu
      JOIN product_offerings po ON po.id = v_offering_id
      WHERE tu.tenant_id = p_tenant_id;

    WHEN 'storage_mb' THEN
      SELECT (tu.current_storage_bytes / 1048576)::INTEGER, po.max_storage_mb
      INTO v_current_value, v_limit_value
      FROM tenant_usage tu
      JOIN product_offerings po ON po.id = v_offering_id
      WHERE tu.tenant_id = p_tenant_id;

    WHEN 'sms' THEN
      SELECT tu.sms_sent_this_month, po.max_sms_per_month
      INTO v_current_value, v_limit_value
      FROM tenant_usage tu
      JOIN product_offerings po ON po.id = v_offering_id
      WHERE tu.tenant_id = p_tenant_id;

    WHEN 'emails' THEN
      SELECT tu.emails_sent_this_month, po.max_emails_per_month
      INTO v_current_value, v_limit_value
      FROM tenant_usage tu
      JOIN product_offerings po ON po.id = v_offering_id
      WHERE tu.tenant_id = p_tenant_id;

    WHEN 'transactions' THEN
      SELECT tu.transactions_this_month, po.max_transactions_per_month
      INTO v_current_value, v_limit_value
      FROM tenant_usage tu
      JOIN product_offerings po ON po.id = v_offering_id
      WHERE tu.tenant_id = p_tenant_id;

    WHEN 'ai_credits' THEN
      SELECT tu.ai_credits_used_this_month, po.max_ai_credits_per_month
      INTO v_current_value, v_limit_value
      FROM tenant_usage tu
      JOIN product_offerings po ON po.id = v_offering_id
      WHERE tu.tenant_id = p_tenant_id;

    ELSE
      -- Unknown quota type
      RETURN FALSE;
  END CASE;

  -- NULL limit means unlimited
  IF v_limit_value IS NULL THEN
    RETURN TRUE;
  END IF;

  -- 0 limit means feature not available
  IF v_limit_value = 0 THEN
    RETURN FALSE;
  END IF;

  -- Check if increment would exceed limit
  RETURN (COALESCE(v_current_value, 0) + p_increment) <= v_limit_value;
END;
$$;

-- =============================================================================
-- Function: increment_usage
-- Purpose: Atomically increment a usage counter
-- Returns: INTEGER (new value after increment)
-- =============================================================================
CREATE OR REPLACE FUNCTION increment_usage(
  p_tenant_id UUID,
  p_quota_type TEXT,
  p_amount INTEGER DEFAULT 1
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_new_value INTEGER;
BEGIN
  -- Ensure tenant has a usage record
  INSERT INTO tenant_usage (tenant_id)
  VALUES (p_tenant_id)
  ON CONFLICT (tenant_id) DO NOTHING;

  -- Increment based on quota type
  CASE p_quota_type
    WHEN 'members' THEN
      UPDATE tenant_usage
      SET current_members = current_members + p_amount
      WHERE tenant_id = p_tenant_id
      RETURNING current_members INTO v_new_value;

    WHEN 'admin_users' THEN
      UPDATE tenant_usage
      SET current_admin_users = current_admin_users + p_amount
      WHERE tenant_id = p_tenant_id
      RETURNING current_admin_users INTO v_new_value;

    WHEN 'storage_bytes' THEN
      UPDATE tenant_usage
      SET current_storage_bytes = current_storage_bytes + p_amount
      WHERE tenant_id = p_tenant_id
      RETURNING current_storage_bytes::INTEGER INTO v_new_value;

    WHEN 'sms' THEN
      UPDATE tenant_usage
      SET sms_sent_this_month = sms_sent_this_month + p_amount
      WHERE tenant_id = p_tenant_id
      RETURNING sms_sent_this_month INTO v_new_value;

    WHEN 'emails' THEN
      UPDATE tenant_usage
      SET emails_sent_this_month = emails_sent_this_month + p_amount
      WHERE tenant_id = p_tenant_id
      RETURNING emails_sent_this_month INTO v_new_value;

    WHEN 'transactions' THEN
      UPDATE tenant_usage
      SET transactions_this_month = transactions_this_month + p_amount
      WHERE tenant_id = p_tenant_id
      RETURNING transactions_this_month INTO v_new_value;

    WHEN 'ai_credits' THEN
      UPDATE tenant_usage
      SET ai_credits_used_this_month = ai_credits_used_this_month + p_amount
      WHERE tenant_id = p_tenant_id
      RETURNING ai_credits_used_this_month INTO v_new_value;

    ELSE
      RAISE EXCEPTION 'Unknown quota type: %', p_quota_type;
  END CASE;

  RETURN v_new_value;
END;
$$;

-- =============================================================================
-- Function: get_tenant_usage_summary
-- Purpose: Get complete usage summary with limits and percentages
-- Returns: JSON object with all quota information
-- =============================================================================
CREATE OR REPLACE FUNCTION get_tenant_usage_summary(p_tenant_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result JSONB;
  v_offering_id UUID;
  v_offering_name TEXT;
  v_offering_tier TEXT;
BEGIN
  -- Ensure tenant has a usage record
  INSERT INTO tenant_usage (tenant_id)
  VALUES (p_tenant_id)
  ON CONFLICT (tenant_id) DO NOTHING;

  -- Get tenant's active offering
  SELECT l.offering_id, po.name, po.tier
  INTO v_offering_id, v_offering_name, v_offering_tier
  FROM licenses l
  JOIN product_offerings po ON po.id = l.offering_id
  WHERE l.tenant_id = p_tenant_id
    AND l.status = 'active'
    AND (l.expires_at IS NULL OR l.expires_at > NOW())
  ORDER BY l.created_at DESC
  LIMIT 1;

  -- Build usage summary
  SELECT jsonb_build_object(
    'offering', jsonb_build_object(
      'id', v_offering_id,
      'name', COALESCE(v_offering_name, 'No Active Plan'),
      'tier', COALESCE(v_offering_tier, 'none')
    ),
    'quotas', jsonb_build_object(
      'members', jsonb_build_object(
        'current', tu.current_members,
        'limit', po.max_members,
        'unlimited', po.max_members IS NULL,
        'unavailable', po.max_members = 0,
        'percentage', CASE
          WHEN po.max_members IS NULL THEN 0
          WHEN po.max_members = 0 THEN 100
          ELSE LEAST(100, ROUND((tu.current_members::NUMERIC / po.max_members) * 100))
        END
      ),
      'admin_users', jsonb_build_object(
        'current', tu.current_admin_users,
        'limit', po.max_admin_users,
        'unlimited', po.max_admin_users IS NULL,
        'unavailable', po.max_admin_users = 0,
        'percentage', CASE
          WHEN po.max_admin_users IS NULL THEN 0
          WHEN po.max_admin_users = 0 THEN 100
          ELSE LEAST(100, ROUND((tu.current_admin_users::NUMERIC / po.max_admin_users) * 100))
        END
      ),
      'storage_mb', jsonb_build_object(
        'current', ROUND(tu.current_storage_bytes / 1048576.0, 2),
        'limit', po.max_storage_mb,
        'unlimited', po.max_storage_mb IS NULL,
        'unavailable', po.max_storage_mb = 0,
        'percentage', CASE
          WHEN po.max_storage_mb IS NULL THEN 0
          WHEN po.max_storage_mb = 0 THEN 100
          ELSE LEAST(100, ROUND(((tu.current_storage_bytes / 1048576.0) / po.max_storage_mb) * 100))
        END
      ),
      'sms', jsonb_build_object(
        'current', tu.sms_sent_this_month,
        'limit', po.max_sms_per_month,
        'unlimited', po.max_sms_per_month IS NULL,
        'unavailable', po.max_sms_per_month = 0,
        'percentage', CASE
          WHEN po.max_sms_per_month IS NULL THEN 0
          WHEN po.max_sms_per_month = 0 THEN 100
          ELSE LEAST(100, ROUND((tu.sms_sent_this_month::NUMERIC / po.max_sms_per_month) * 100))
        END,
        'resets_monthly', true
      ),
      'emails', jsonb_build_object(
        'current', tu.emails_sent_this_month,
        'limit', po.max_emails_per_month,
        'unlimited', po.max_emails_per_month IS NULL,
        'unavailable', po.max_emails_per_month = 0,
        'percentage', CASE
          WHEN po.max_emails_per_month IS NULL THEN 0
          WHEN po.max_emails_per_month = 0 THEN 100
          ELSE LEAST(100, ROUND((tu.emails_sent_this_month::NUMERIC / po.max_emails_per_month) * 100))
        END,
        'resets_monthly', true
      ),
      'transactions', jsonb_build_object(
        'current', tu.transactions_this_month,
        'limit', po.max_transactions_per_month,
        'unlimited', po.max_transactions_per_month IS NULL,
        'unavailable', po.max_transactions_per_month = 0,
        'percentage', CASE
          WHEN po.max_transactions_per_month IS NULL THEN 0
          WHEN po.max_transactions_per_month = 0 THEN 100
          ELSE LEAST(100, ROUND((tu.transactions_this_month::NUMERIC / po.max_transactions_per_month) * 100))
        END,
        'resets_monthly', true
      ),
      'ai_credits', jsonb_build_object(
        'current', tu.ai_credits_used_this_month,
        'limit', po.max_ai_credits_per_month,
        'unlimited', po.max_ai_credits_per_month IS NULL,
        'unavailable', po.max_ai_credits_per_month = 0,
        'percentage', CASE
          WHEN po.max_ai_credits_per_month IS NULL THEN 0
          WHEN po.max_ai_credits_per_month = 0 THEN 100
          ELSE LEAST(100, ROUND((tu.ai_credits_used_this_month::NUMERIC / po.max_ai_credits_per_month) * 100))
        END,
        'resets_monthly', true
      )
    ),
    'billing_period', jsonb_build_object(
      'month_start', tu.month_start_date,
      'last_reset', tu.last_reset_at
    ),
    'warnings', (
      SELECT jsonb_agg(warning)
      FROM (
        SELECT 'members' AS warning WHERE po.max_members IS NOT NULL AND po.max_members > 0 AND tu.current_members >= po.max_members * 0.8
        UNION ALL
        SELECT 'admin_users' WHERE po.max_admin_users IS NOT NULL AND po.max_admin_users > 0 AND tu.current_admin_users >= po.max_admin_users * 0.8
        UNION ALL
        SELECT 'storage_mb' WHERE po.max_storage_mb IS NOT NULL AND po.max_storage_mb > 0 AND tu.current_storage_bytes >= (po.max_storage_mb * 1048576 * 0.8)
        UNION ALL
        SELECT 'sms' WHERE po.max_sms_per_month IS NOT NULL AND po.max_sms_per_month > 0 AND tu.sms_sent_this_month >= po.max_sms_per_month * 0.8
        UNION ALL
        SELECT 'emails' WHERE po.max_emails_per_month IS NOT NULL AND po.max_emails_per_month > 0 AND tu.emails_sent_this_month >= po.max_emails_per_month * 0.8
        UNION ALL
        SELECT 'transactions' WHERE po.max_transactions_per_month IS NOT NULL AND po.max_transactions_per_month > 0 AND tu.transactions_this_month >= po.max_transactions_per_month * 0.8
        UNION ALL
        SELECT 'ai_credits' WHERE po.max_ai_credits_per_month IS NOT NULL AND po.max_ai_credits_per_month > 0 AND tu.ai_credits_used_this_month >= po.max_ai_credits_per_month * 0.8
      ) warnings
    )
  ) INTO v_result
  FROM tenant_usage tu
  LEFT JOIN product_offerings po ON po.id = v_offering_id
  WHERE tu.tenant_id = p_tenant_id;

  -- Return empty object if no data found
  RETURN COALESCE(v_result, jsonb_build_object(
    'offering', jsonb_build_object('id', NULL, 'name', 'No Active Plan', 'tier', 'none'),
    'quotas', jsonb_build_object(),
    'billing_period', jsonb_build_object(),
    'warnings', '[]'::jsonb
  ));
END;
$$;

-- =============================================================================
-- Function: reset_monthly_usage_counters
-- Purpose: Reset monthly counters for all tenants (for cron job)
-- Returns: INTEGER (number of tenants reset)
-- =============================================================================
CREATE OR REPLACE FUNCTION reset_monthly_usage_counters()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count INTEGER;
  v_current_month_start DATE;
BEGIN
  v_current_month_start := date_trunc('month', CURRENT_DATE)::DATE;

  -- Reset counters for tenants whose month_start_date is before current month
  UPDATE tenant_usage
  SET
    sms_sent_this_month = 0,
    emails_sent_this_month = 0,
    transactions_this_month = 0,
    ai_credits_used_this_month = 0,
    month_start_date = v_current_month_start,
    last_reset_at = NOW()
  WHERE month_start_date < v_current_month_start;

  GET DIAGNOSTICS v_count = ROW_COUNT;

  RETURN v_count;
END;
$$;

-- =============================================================================
-- Function: sync_tenant_usage_counts
-- Purpose: Synchronize usage counts from source tables (for data integrity)
-- =============================================================================
CREATE OR REPLACE FUNCTION sync_tenant_usage_counts(p_tenant_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_member_count INTEGER;
  v_admin_count INTEGER;
  v_storage_bytes BIGINT;
BEGIN
  -- Ensure tenant has a usage record
  INSERT INTO tenant_usage (tenant_id)
  VALUES (p_tenant_id)
  ON CONFLICT (tenant_id) DO NOTHING;

  -- Count all members for tenant (regardless of status)
  SELECT COUNT(*)::INTEGER INTO v_member_count
  FROM members
  WHERE tenant_id = p_tenant_id
    AND deleted_at IS NULL;

  -- Count admin users (users with admin roles)
  -- Note: user_roles uses hard deletes, not soft deletes
  SELECT COUNT(DISTINCT ur.user_id)::INTEGER INTO v_admin_count
  FROM user_roles ur
  JOIN roles r ON r.id = ur.role_id
  WHERE ur.tenant_id = p_tenant_id
    AND r.code IN ('tenant_admin', 'staff', 'admin');

  -- Calculate storage from media/files (if table exists)
  BEGIN
    SELECT COALESCE(SUM(file_size), 0)::BIGINT INTO v_storage_bytes
    FROM media
    WHERE tenant_id = p_tenant_id
      AND deleted_at IS NULL;
  EXCEPTION WHEN undefined_table THEN
    v_storage_bytes := 0;
  END;

  -- Update usage record
  UPDATE tenant_usage
  SET
    current_members = COALESCE(v_member_count, 0),
    current_admin_users = COALESCE(v_admin_count, 0),
    current_storage_bytes = COALESCE(v_storage_bytes, 0)
  WHERE tenant_id = p_tenant_id;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION check_quota_allowed TO authenticated;
GRANT EXECUTE ON FUNCTION increment_usage TO authenticated;
GRANT EXECUTE ON FUNCTION get_tenant_usage_summary TO authenticated;
GRANT EXECUTE ON FUNCTION reset_monthly_usage_counters TO service_role;
GRANT EXECUTE ON FUNCTION sync_tenant_usage_counts TO authenticated;

-- Success confirmation
DO $$
BEGIN
  RAISE NOTICE 'Successfully created quota management functions';
END $$;

COMMIT;
