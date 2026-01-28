-- =============================================================================
-- Migration: Separate Purchased AI Credits from Monthly Allocation
-- =============================================================================
-- Description: Purchased AI credits should NOT reset at end of billing period.
--              Monthly allocated credits reset, but purchased credits carry over.
-- Date: 2026-01-28
-- Author: Claude Code
-- =============================================================================

BEGIN;

-- =============================================================================
-- Step 1: Add columns for purchased credits tracking
-- =============================================================================
ALTER TABLE tenant_usage
ADD COLUMN IF NOT EXISTS purchased_ai_credits INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS purchased_ai_credits_used INTEGER NOT NULL DEFAULT 0;

COMMENT ON COLUMN tenant_usage.purchased_ai_credits IS 'Total purchased AI credits balance (does not reset monthly)';
COMMENT ON COLUMN tenant_usage.purchased_ai_credits_used IS 'Purchased AI credits consumed (does not reset monthly)';
COMMENT ON COLUMN tenant_usage.ai_credits_used_this_month IS 'Monthly allocated AI credits used (resets at billing period)';

-- =============================================================================
-- Step 2: Create function to add purchased credits
-- =============================================================================
CREATE OR REPLACE FUNCTION add_purchased_ai_credits(
  p_tenant_id UUID,
  p_credits INTEGER
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Ensure tenant has a usage record
  INSERT INTO tenant_usage (tenant_id)
  VALUES (p_tenant_id)
  ON CONFLICT (tenant_id) DO NOTHING;

  -- Add purchased credits
  UPDATE tenant_usage
  SET purchased_ai_credits = purchased_ai_credits + p_credits
  WHERE tenant_id = p_tenant_id;
END;
$$;

-- =============================================================================
-- Step 3: Create function to consume AI credits (monthly first, then purchased)
-- =============================================================================
CREATE OR REPLACE FUNCTION consume_ai_credits(
  p_tenant_id UUID,
  p_credits_to_use INTEGER
)
RETURNS TABLE(
  success BOOLEAN,
  monthly_used INTEGER,
  purchased_used INTEGER,
  error_message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_monthly_limit INTEGER;
  v_monthly_used INTEGER;
  v_monthly_available INTEGER;
  v_purchased_available INTEGER;
  v_use_from_monthly INTEGER;
  v_use_from_purchased INTEGER;
BEGIN
  -- Get current usage and limits
  SELECT
    tu.ai_credits_used_this_month,
    COALESCE(po.max_ai_credits_per_month, 0),
    tu.purchased_ai_credits - tu.purchased_ai_credits_used
  INTO v_monthly_used, v_monthly_limit, v_purchased_available
  FROM tenant_usage tu
  LEFT JOIN tenants t ON t.id = tu.tenant_id
  LEFT JOIN product_offerings po ON po.id = t.subscription_offering_id
  WHERE tu.tenant_id = p_tenant_id;

  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, 0, 0, 'Tenant usage record not found'::TEXT;
    RETURN;
  END IF;

  -- Calculate available monthly credits
  v_monthly_available := GREATEST(v_monthly_limit - v_monthly_used, 0);

  -- Determine how much to take from each pool
  IF v_monthly_available >= p_credits_to_use THEN
    -- All from monthly
    v_use_from_monthly := p_credits_to_use;
    v_use_from_purchased := 0;
  ELSIF v_monthly_available + v_purchased_available >= p_credits_to_use THEN
    -- Some from monthly, rest from purchased
    v_use_from_monthly := v_monthly_available;
    v_use_from_purchased := p_credits_to_use - v_monthly_available;
  ELSE
    -- Not enough credits
    RETURN QUERY SELECT FALSE, 0, 0,
      format('Insufficient AI credits. Need %s, have %s monthly + %s purchased',
        p_credits_to_use, v_monthly_available, v_purchased_available)::TEXT;
    RETURN;
  END IF;

  -- Update usage
  UPDATE tenant_usage
  SET
    ai_credits_used_this_month = ai_credits_used_this_month + v_use_from_monthly,
    purchased_ai_credits_used = purchased_ai_credits_used + v_use_from_purchased
  WHERE tenant_id = p_tenant_id;

  RETURN QUERY SELECT TRUE, v_use_from_monthly, v_use_from_purchased, NULL::TEXT;
END;
$$;

-- =============================================================================
-- Step 4: Update reset function to NOT reset purchased credits
-- =============================================================================
CREATE OR REPLACE FUNCTION reset_monthly_usage_counters()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  -- Reset only monthly counters, NOT purchased credits
  UPDATE tenant_usage
  SET
    sms_sent_this_month = 0,
    emails_sent_this_month = 0,
    transactions_this_month = 0,
    ai_credits_used_this_month = 0,  -- Monthly allocation resets
    -- purchased_ai_credits_used does NOT reset
    month_start_date = CURRENT_DATE,
    last_reset_at = NOW()
  WHERE month_start_date < date_trunc('month', CURRENT_DATE)::DATE
     OR month_start_date IS NULL;

  GET DIAGNOSTICS v_count = ROW_COUNT;

  RETURN v_count;
END;
$$;

-- =============================================================================
-- Step 5: Create view for AI credit status
-- =============================================================================
CREATE OR REPLACE VIEW tenant_ai_credit_status AS
SELECT
  tu.tenant_id,
  COALESCE(po.max_ai_credits_per_month, 0) AS monthly_allocation,
  tu.ai_credits_used_this_month AS monthly_used,
  GREATEST(COALESCE(po.max_ai_credits_per_month, 0) - tu.ai_credits_used_this_month, 0) AS monthly_available,
  tu.purchased_ai_credits AS purchased_total,
  tu.purchased_ai_credits_used AS purchased_used,
  tu.purchased_ai_credits - tu.purchased_ai_credits_used AS purchased_available,
  -- Total available (monthly + purchased)
  GREATEST(COALESCE(po.max_ai_credits_per_month, 0) - tu.ai_credits_used_this_month, 0)
    + (tu.purchased_ai_credits - tu.purchased_ai_credits_used) AS total_available
FROM tenant_usage tu
LEFT JOIN tenants t ON t.id = tu.tenant_id
LEFT JOIN product_offerings po ON po.id = t.subscription_offering_id;

-- =============================================================================
-- Step 6: Update get_tenant_usage_summary to include purchased credits
-- =============================================================================
-- Drop existing function first (changing return type requires drop)
DROP FUNCTION IF EXISTS get_tenant_usage_summary(UUID);

CREATE OR REPLACE FUNCTION get_tenant_usage_summary(p_tenant_id UUID)
RETURNS TABLE(
  quota_type TEXT,
  current_usage BIGINT,
  quota_limit BIGINT,
  is_unlimited BOOLEAN,
  resets_monthly BOOLEAN,
  purchased_balance BIGINT,
  purchased_used BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    q.quota_type,
    q.current_usage,
    q.quota_limit,
    q.quota_limit IS NULL AS is_unlimited,
    q.resets_monthly,
    q.purchased_balance,
    q.purchased_used
  FROM (
    -- Members (cumulative, does not reset)
    SELECT
      'members'::TEXT AS quota_type,
      tu.current_members::BIGINT AS current_usage,
      po.max_members::BIGINT AS quota_limit,
      FALSE AS resets_monthly,
      0::BIGINT AS purchased_balance,
      0::BIGINT AS purchased_used
    FROM tenant_usage tu
    LEFT JOIN tenants t ON t.id = tu.tenant_id
    LEFT JOIN product_offerings po ON po.id = t.subscription_offering_id
    WHERE tu.tenant_id = p_tenant_id

    UNION ALL

    -- Admin Users (cumulative, does not reset)
    SELECT
      'admin_users'::TEXT,
      tu.current_admin_users::BIGINT,
      po.max_admin_users::BIGINT,
      FALSE,
      0::BIGINT,
      0::BIGINT
    FROM tenant_usage tu
    LEFT JOIN tenants t ON t.id = tu.tenant_id
    LEFT JOIN product_offerings po ON po.id = t.subscription_offering_id
    WHERE tu.tenant_id = p_tenant_id

    UNION ALL

    -- Storage (cumulative, does not reset)
    SELECT
      'storage_bytes'::TEXT,
      tu.current_storage_bytes::BIGINT,
      (po.max_storage_gb * 1024 * 1024 * 1024)::BIGINT,
      FALSE,
      0::BIGINT,
      0::BIGINT
    FROM tenant_usage tu
    LEFT JOIN tenants t ON t.id = tu.tenant_id
    LEFT JOIN product_offerings po ON po.id = t.subscription_offering_id
    WHERE tu.tenant_id = p_tenant_id

    UNION ALL

    -- SMS (monthly, resets)
    SELECT
      'sms'::TEXT,
      tu.sms_sent_this_month::BIGINT,
      po.max_sms_per_month::BIGINT,
      TRUE,
      0::BIGINT,
      0::BIGINT
    FROM tenant_usage tu
    LEFT JOIN tenants t ON t.id = tu.tenant_id
    LEFT JOIN product_offerings po ON po.id = t.subscription_offering_id
    WHERE tu.tenant_id = p_tenant_id

    UNION ALL

    -- Emails (monthly, resets)
    SELECT
      'emails'::TEXT,
      tu.emails_sent_this_month::BIGINT,
      po.max_emails_per_month::BIGINT,
      TRUE,
      0::BIGINT,
      0::BIGINT
    FROM tenant_usage tu
    LEFT JOIN tenants t ON t.id = tu.tenant_id
    LEFT JOIN product_offerings po ON po.id = t.subscription_offering_id
    WHERE tu.tenant_id = p_tenant_id

    UNION ALL

    -- Transactions (monthly, resets)
    SELECT
      'transactions'::TEXT,
      tu.transactions_this_month::BIGINT,
      po.max_transactions_per_month::BIGINT,
      TRUE,
      0::BIGINT,
      0::BIGINT
    FROM tenant_usage tu
    LEFT JOIN tenants t ON t.id = tu.tenant_id
    LEFT JOIN product_offerings po ON po.id = t.subscription_offering_id
    WHERE tu.tenant_id = p_tenant_id

    UNION ALL

    -- AI Credits (monthly allocation resets, purchased does not)
    SELECT
      'ai_credits'::TEXT,
      tu.ai_credits_used_this_month::BIGINT AS current_usage,
      po.max_ai_credits_per_month::BIGINT AS quota_limit,
      TRUE AS resets_monthly,
      (tu.purchased_ai_credits - tu.purchased_ai_credits_used)::BIGINT AS purchased_balance,
      tu.purchased_ai_credits_used::BIGINT AS purchased_used
    FROM tenant_usage tu
    LEFT JOIN tenants t ON t.id = tu.tenant_id
    LEFT JOIN product_offerings po ON po.id = t.subscription_offering_id
    WHERE tu.tenant_id = p_tenant_id
  ) q;
END;
$$;

-- Success confirmation
DO $$
BEGIN
  RAISE NOTICE 'Successfully separated purchased AI credits from monthly allocation';
END $$;

COMMIT;
