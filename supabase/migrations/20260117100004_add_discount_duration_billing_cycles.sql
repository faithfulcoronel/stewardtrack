-- =============================================================================
-- Migration: Add Duration Billing Cycles to Discounts
-- =============================================================================
-- Adds support for discounts that apply for a limited number of billing cycles.
-- For example: "20% off for first 3 months" or "50% off for first year"
--
-- This allows super admins to configure promotional discounts that only apply
-- to the first N billing periods after signup.
-- =============================================================================

BEGIN;

-- =============================================================================
-- STEP 1: Add duration_billing_cycles column to discounts table
-- =============================================================================
-- NULL means the discount applies to ALL billing cycles (current behavior)
-- A positive integer means the discount only applies to the first N billing cycles

ALTER TABLE discounts
ADD COLUMN IF NOT EXISTS duration_billing_cycles INTEGER DEFAULT NULL;

-- Add check constraint to ensure positive value
ALTER TABLE discounts
ADD CONSTRAINT discounts_duration_billing_cycles_positive
CHECK (duration_billing_cycles IS NULL OR duration_billing_cycles > 0);

-- Add comment
COMMENT ON COLUMN discounts.duration_billing_cycles IS
'Number of billing cycles the discount applies to. NULL means unlimited/forever.
For example: 3 means the discount applies to the first 3 billing cycles only.
This is useful for "first 3 months 20% off" type promotions.';

-- =============================================================================
-- STEP 2: Update validate_discount_code function to return duration info
-- =============================================================================
DROP FUNCTION IF EXISTS validate_discount_code(VARCHAR, UUID, UUID, DECIMAL, VARCHAR);

CREATE OR REPLACE FUNCTION validate_discount_code(
  p_code VARCHAR,
  p_offering_id UUID,
  p_tenant_id UUID,
  p_amount DECIMAL,
  p_currency VARCHAR
)
RETURNS TABLE (
  is_valid BOOLEAN,
  discount_id UUID,
  discount_name VARCHAR,
  discount_type VARCHAR,
  calculation_type VARCHAR,
  discount_value DECIMAL,
  discount_amount DECIMAL,
  final_amount DECIMAL,
  duration_billing_cycles INTEGER,
  error_message VARCHAR
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_discount RECORD;
  v_offering RECORD;
  v_tenant_redemptions INTEGER;
  v_discount_amount DECIMAL;
  v_final_amount DECIMAL;
BEGIN
  -- Find the discount
  SELECT * INTO v_discount
  FROM discounts d
  WHERE d.code = UPPER(p_code)
    AND d.is_active = true
    AND d.deleted_at IS NULL
    AND d.starts_at <= NOW()
    AND (d.ends_at IS NULL OR d.ends_at > NOW());

  IF NOT FOUND THEN
    RETURN QUERY SELECT
      false, NULL::UUID, NULL::VARCHAR, NULL::VARCHAR, NULL::VARCHAR,
      NULL::DECIMAL, NULL::DECIMAL, NULL::DECIMAL, NULL::INTEGER,
      'Invalid or expired discount code'::VARCHAR;
    RETURN;
  END IF;

  -- Check max uses
  IF v_discount.max_uses IS NOT NULL AND v_discount.current_uses >= v_discount.max_uses THEN
    RETURN QUERY SELECT
      false, NULL::UUID, NULL::VARCHAR, NULL::VARCHAR, NULL::VARCHAR,
      NULL::DECIMAL, NULL::DECIMAL, NULL::DECIMAL, NULL::INTEGER,
      'Discount code has reached maximum uses'::VARCHAR;
    RETURN;
  END IF;

  -- Check per-tenant limit
  SELECT COUNT(*) INTO v_tenant_redemptions
  FROM discount_redemptions dr
  WHERE dr.discount_id = v_discount.id AND dr.tenant_id = p_tenant_id;

  IF v_tenant_redemptions >= v_discount.max_uses_per_tenant THEN
    RETURN QUERY SELECT
      false, NULL::UUID, NULL::VARCHAR, NULL::VARCHAR, NULL::VARCHAR,
      NULL::DECIMAL, NULL::DECIMAL, NULL::DECIMAL, NULL::INTEGER,
      'You have already used this discount code'::VARCHAR;
    RETURN;
  END IF;

  -- Get offering details
  SELECT * INTO v_offering
  FROM product_offerings po
  WHERE po.id = p_offering_id AND po.is_active = true AND po.deleted_at IS NULL;

  IF NOT FOUND THEN
    RETURN QUERY SELECT
      false, NULL::UUID, NULL::VARCHAR, NULL::VARCHAR, NULL::VARCHAR,
      NULL::DECIMAL, NULL::DECIMAL, NULL::DECIMAL, NULL::INTEGER,
      'Invalid offering'::VARCHAR;
    RETURN;
  END IF;

  -- Check targeting scope
  IF v_discount.target_scope = 'tier' THEN
    IF NOT (v_offering.tier = ANY(v_discount.target_tiers)) THEN
      RETURN QUERY SELECT
        false, NULL::UUID, NULL::VARCHAR, NULL::VARCHAR, NULL::VARCHAR,
        NULL::DECIMAL, NULL::DECIMAL, NULL::DECIMAL, NULL::INTEGER,
        'This discount code is not valid for the selected plan'::VARCHAR;
      RETURN;
    END IF;
  ELSIF v_discount.target_scope = 'offering' THEN
    IF NOT (p_offering_id = ANY(v_discount.target_offering_ids)) THEN
      RETURN QUERY SELECT
        false, NULL::UUID, NULL::VARCHAR, NULL::VARCHAR, NULL::VARCHAR,
        NULL::DECIMAL, NULL::DECIMAL, NULL::DECIMAL, NULL::INTEGER,
        'This discount code is not valid for the selected plan'::VARCHAR;
      RETURN;
    END IF;
  END IF;

  -- Check billing cycle
  IF v_offering.billing_cycle IS NOT NULL THEN
    IF NOT (v_offering.billing_cycle = ANY(v_discount.applicable_billing_cycles)) THEN
      RETURN QUERY SELECT
        false, NULL::UUID, NULL::VARCHAR, NULL::VARCHAR, NULL::VARCHAR,
        NULL::DECIMAL, NULL::DECIMAL, NULL::DECIMAL, NULL::INTEGER,
        'This discount code is not valid for the selected billing cycle'::VARCHAR;
      RETURN;
    END IF;
  END IF;

  -- Check minimum amount
  IF v_discount.min_amount IS NOT NULL AND p_amount < v_discount.min_amount THEN
    RETURN QUERY SELECT
      false, NULL::UUID, NULL::VARCHAR, NULL::VARCHAR, NULL::VARCHAR,
      NULL::DECIMAL, NULL::DECIMAL, NULL::DECIMAL, NULL::INTEGER,
      ('Minimum purchase of ' || v_discount.min_amount || ' required')::VARCHAR;
    RETURN;
  END IF;

  -- Calculate discount
  IF v_discount.calculation_type = 'percentage' THEN
    v_discount_amount := ROUND(p_amount * (v_discount.discount_value / 100), 2);
  ELSE
    -- For fixed amount, need to handle currency conversion if different
    IF v_discount.discount_currency = p_currency THEN
      v_discount_amount := v_discount.discount_value;
    ELSE
      -- For simplicity, reject if currencies don't match
      RETURN QUERY SELECT
        false, NULL::UUID, NULL::VARCHAR, NULL::VARCHAR, NULL::VARCHAR,
        NULL::DECIMAL, NULL::DECIMAL, NULL::DECIMAL, NULL::INTEGER,
        'This discount is not available in your currency'::VARCHAR;
      RETURN;
    END IF;
  END IF;

  -- Ensure discount doesn't exceed price
  IF v_discount_amount > p_amount THEN
    v_discount_amount := p_amount;
  END IF;

  v_final_amount := p_amount - v_discount_amount;

  RETURN QUERY SELECT
    true,
    v_discount.id,
    v_discount.name::VARCHAR,
    v_discount.discount_type::VARCHAR,
    v_discount.calculation_type::VARCHAR,
    v_discount.discount_value,
    v_discount_amount,
    v_final_amount,
    v_discount.duration_billing_cycles,
    NULL::VARCHAR;
END;
$$;

-- =============================================================================
-- STEP 3: Update get_active_discounts_for_offering to return duration info
-- =============================================================================
DROP FUNCTION IF EXISTS get_active_discounts_for_offering(UUID, VARCHAR);

CREATE OR REPLACE FUNCTION get_active_discounts_for_offering(
  p_offering_id UUID,
  p_currency VARCHAR DEFAULT 'USD'
)
RETURNS TABLE (
  discount_id UUID,
  discount_name VARCHAR,
  discount_type VARCHAR,
  calculation_type VARCHAR,
  discount_value DECIMAL,
  badge_text VARCHAR,
  banner_text VARCHAR,
  ends_at TIMESTAMPTZ,
  duration_billing_cycles INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_offering RECORD;
BEGIN
  -- Get offering details
  SELECT * INTO v_offering
  FROM product_offerings po
  WHERE po.id = p_offering_id AND po.is_active = true AND po.deleted_at IS NULL;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    d.id,
    d.name::VARCHAR,
    d.discount_type::VARCHAR,
    d.calculation_type::VARCHAR,
    d.discount_value,
    d.badge_text::VARCHAR,
    d.banner_text::VARCHAR,
    d.ends_at,
    d.duration_billing_cycles
  FROM discounts d
  WHERE d.discount_type = 'automatic'
    AND d.is_active = true
    AND d.deleted_at IS NULL
    AND d.starts_at <= NOW()
    AND (d.ends_at IS NULL OR d.ends_at > NOW())
    AND (
      d.target_scope = 'global'
      OR (d.target_scope = 'tier' AND v_offering.tier = ANY(d.target_tiers))
      OR (d.target_scope = 'offering' AND p_offering_id = ANY(d.target_offering_ids))
    )
    AND (
      v_offering.billing_cycle IS NULL
      OR v_offering.billing_cycle = ANY(d.applicable_billing_cycles)
    )
    AND (
      d.calculation_type = 'percentage'
      OR d.discount_currency = p_currency
    )
  ORDER BY
    -- Prioritize offering-specific > tier-specific > global
    CASE d.target_scope
      WHEN 'offering' THEN 1
      WHEN 'tier' THEN 2
      ELSE 3
    END,
    -- Then by discount value (higher first)
    d.discount_value DESC;
END;
$$;

-- =============================================================================
-- STEP 4: Add index for duration_billing_cycles queries
-- =============================================================================
CREATE INDEX IF NOT EXISTS idx_discounts_duration ON discounts(duration_billing_cycles)
WHERE deleted_at IS NULL AND is_active = true;

COMMIT;
