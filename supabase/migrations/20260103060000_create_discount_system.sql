-- =============================================================================
-- Migration: Create Discount System
-- =============================================================================
-- This migration creates a comprehensive discount system supporting:
-- 1. Coupon/Promo codes (user-entered at checkout)
-- 2. Time-limited automatic offers (e.g., Black Friday, Launch specials)
-- 3. Percentage and fixed amount discounts
-- 4. Flexible targeting (global, per-tier, per-offering)
-- =============================================================================

BEGIN;

-- =============================================================================
-- STEP 1: Create Discounts Table
-- =============================================================================

CREATE TABLE IF NOT EXISTS discounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Discount identification
  code VARCHAR(50) UNIQUE, -- NULL for automatic discounts, unique code for promo codes
  name VARCHAR(255) NOT NULL,
  description TEXT,

  -- Discount type
  discount_type VARCHAR(20) NOT NULL CHECK (discount_type IN ('coupon', 'automatic')),

  -- Discount calculation
  calculation_type VARCHAR(20) NOT NULL CHECK (calculation_type IN ('percentage', 'fixed_amount')),
  discount_value DECIMAL(10, 2) NOT NULL CHECK (discount_value > 0),

  -- For fixed amount discounts, specify the currency
  discount_currency VARCHAR(3), -- Required for fixed_amount, e.g., 'USD', 'PHP'

  -- Validity period
  starts_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ends_at TIMESTAMPTZ, -- NULL means no end date

  -- Usage limits
  max_uses INTEGER, -- NULL means unlimited
  max_uses_per_tenant INTEGER DEFAULT 1, -- How many times a single tenant can use
  current_uses INTEGER NOT NULL DEFAULT 0,

  -- Targeting scope
  target_scope VARCHAR(20) NOT NULL DEFAULT 'global' CHECK (target_scope IN ('global', 'tier', 'offering')),
  target_tiers TEXT[], -- Array of tier codes if target_scope = 'tier'
  target_offering_ids UUID[], -- Array of offering IDs if target_scope = 'offering'

  -- Restrictions
  min_amount DECIMAL(10, 2), -- Minimum purchase amount to apply
  first_purchase_only BOOLEAN NOT NULL DEFAULT false,
  new_tenant_only BOOLEAN NOT NULL DEFAULT false, -- Only for tenants created after discount creation

  -- Billing cycle restrictions
  applicable_billing_cycles TEXT[] DEFAULT ARRAY['monthly', 'annual']::TEXT[],

  -- Status
  is_active BOOLEAN NOT NULL DEFAULT true,

  -- Display settings for automatic discounts
  show_banner BOOLEAN NOT NULL DEFAULT false, -- Show promotional banner
  banner_text VARCHAR(500),
  badge_text VARCHAR(50), -- e.g., "20% OFF", "LAUNCH SPECIAL"

  -- Metadata for extensibility
  metadata JSONB DEFAULT '{}'::jsonb,

  -- Audit fields
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- =============================================================================
-- STEP 2: Create Discount Redemptions Table
-- =============================================================================

CREATE TABLE IF NOT EXISTS discount_redemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  discount_id UUID NOT NULL REFERENCES discounts(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  offering_id UUID NOT NULL REFERENCES product_offerings(id),

  -- Redemption details
  original_price DECIMAL(10, 2) NOT NULL,
  discount_amount DECIMAL(10, 2) NOT NULL,
  final_price DECIMAL(10, 2) NOT NULL,
  currency VARCHAR(3) NOT NULL,

  -- Payment reference
  payment_id UUID, -- Reference to subscription_payments if applicable

  -- Audit fields
  redeemed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  redeemed_by UUID REFERENCES auth.users(id),

  -- Composite unique to prevent duplicate redemptions in same transaction
  UNIQUE(discount_id, tenant_id, offering_id, redeemed_at)
);

-- =============================================================================
-- STEP 3: Create Indexes
-- =============================================================================

-- Discounts indexes
CREATE INDEX IF NOT EXISTS idx_discounts_code ON discounts(code) WHERE code IS NOT NULL AND deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_discounts_type ON discounts(discount_type) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_discounts_active ON discounts(is_active) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_discounts_dates ON discounts(starts_at, ends_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_discounts_scope ON discounts(target_scope) WHERE deleted_at IS NULL;

-- Redemptions indexes
CREATE INDEX IF NOT EXISTS idx_discount_redemptions_discount ON discount_redemptions(discount_id);
CREATE INDEX IF NOT EXISTS idx_discount_redemptions_tenant ON discount_redemptions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_discount_redemptions_date ON discount_redemptions(redeemed_at);

-- =============================================================================
-- STEP 4: Create RLS Policies
-- =============================================================================

ALTER TABLE discounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE discount_redemptions ENABLE ROW LEVEL SECURITY;

-- Discounts policies
-- Anyone can view active, non-deleted discounts (for public pricing page)
CREATE POLICY "discounts_select_active" ON discounts
  FOR SELECT
  USING (is_active = true AND deleted_at IS NULL);

-- Super admins can manage all discounts
CREATE POLICY "discounts_super_admin_all" ON discounts
  FOR ALL
  USING (is_super_admin());

-- Redemptions policies
-- Tenants can view their own redemptions
CREATE POLICY "redemptions_tenant_select" ON discount_redemptions
  FOR SELECT
  USING (
    tenant_id IN (
      SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()
    )
  );

-- System can insert redemptions (via service role)
CREATE POLICY "redemptions_insert" ON discount_redemptions
  FOR INSERT
  WITH CHECK (true);

-- Super admins can view all redemptions
CREATE POLICY "redemptions_super_admin_select" ON discount_redemptions
  FOR SELECT
  USING (is_super_admin());

-- =============================================================================
-- STEP 5: Create Helper Functions
-- =============================================================================

-- Function to validate and apply a discount code
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
      NULL::DECIMAL, NULL::DECIMAL, NULL::DECIMAL,
      'Invalid or expired discount code'::VARCHAR;
    RETURN;
  END IF;

  -- Check max uses
  IF v_discount.max_uses IS NOT NULL AND v_discount.current_uses >= v_discount.max_uses THEN
    RETURN QUERY SELECT
      false, NULL::UUID, NULL::VARCHAR, NULL::VARCHAR, NULL::VARCHAR,
      NULL::DECIMAL, NULL::DECIMAL, NULL::DECIMAL,
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
      NULL::DECIMAL, NULL::DECIMAL, NULL::DECIMAL,
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
      NULL::DECIMAL, NULL::DECIMAL, NULL::DECIMAL,
      'Invalid offering'::VARCHAR;
    RETURN;
  END IF;

  -- Check targeting scope
  IF v_discount.target_scope = 'tier' THEN
    IF NOT (v_offering.tier = ANY(v_discount.target_tiers)) THEN
      RETURN QUERY SELECT
        false, NULL::UUID, NULL::VARCHAR, NULL::VARCHAR, NULL::VARCHAR,
        NULL::DECIMAL, NULL::DECIMAL, NULL::DECIMAL,
        'This discount code is not valid for the selected plan'::VARCHAR;
      RETURN;
    END IF;
  ELSIF v_discount.target_scope = 'offering' THEN
    IF NOT (p_offering_id = ANY(v_discount.target_offering_ids)) THEN
      RETURN QUERY SELECT
        false, NULL::UUID, NULL::VARCHAR, NULL::VARCHAR, NULL::VARCHAR,
        NULL::DECIMAL, NULL::DECIMAL, NULL::DECIMAL,
        'This discount code is not valid for the selected plan'::VARCHAR;
      RETURN;
    END IF;
  END IF;

  -- Check billing cycle
  IF v_offering.billing_cycle IS NOT NULL THEN
    IF NOT (v_offering.billing_cycle = ANY(v_discount.applicable_billing_cycles)) THEN
      RETURN QUERY SELECT
        false, NULL::UUID, NULL::VARCHAR, NULL::VARCHAR, NULL::VARCHAR,
        NULL::DECIMAL, NULL::DECIMAL, NULL::DECIMAL,
        'This discount code is not valid for the selected billing cycle'::VARCHAR;
      RETURN;
    END IF;
  END IF;

  -- Check minimum amount
  IF v_discount.min_amount IS NOT NULL AND p_amount < v_discount.min_amount THEN
    RETURN QUERY SELECT
      false, NULL::UUID, NULL::VARCHAR, NULL::VARCHAR, NULL::VARCHAR,
      NULL::DECIMAL, NULL::DECIMAL, NULL::DECIMAL,
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
      -- In production, you'd want currency conversion
      RETURN QUERY SELECT
        false, NULL::UUID, NULL::VARCHAR, NULL::VARCHAR, NULL::VARCHAR,
        NULL::DECIMAL, NULL::DECIMAL, NULL::DECIMAL,
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
    NULL::VARCHAR;
END;
$$;

-- Function to get active automatic discounts for an offering
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
  ends_at TIMESTAMPTZ
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
    d.ends_at
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

-- Function to redeem a discount
CREATE OR REPLACE FUNCTION redeem_discount(
  p_discount_id UUID,
  p_tenant_id UUID,
  p_offering_id UUID,
  p_original_price DECIMAL,
  p_discount_amount DECIMAL,
  p_final_price DECIMAL,
  p_currency VARCHAR,
  p_payment_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_redemption_id UUID;
BEGIN
  -- Insert redemption
  INSERT INTO discount_redemptions (
    discount_id, tenant_id, offering_id,
    original_price, discount_amount, final_price, currency,
    payment_id, redeemed_by
  ) VALUES (
    p_discount_id, p_tenant_id, p_offering_id,
    p_original_price, p_discount_amount, p_final_price, p_currency,
    p_payment_id, auth.uid()
  )
  RETURNING id INTO v_redemption_id;

  -- Increment usage count
  UPDATE discounts
  SET current_uses = current_uses + 1,
      updated_at = NOW()
  WHERE id = p_discount_id;

  RETURN v_redemption_id;
END;
$$;

-- =============================================================================
-- STEP 6: Create Sample Discounts
-- =============================================================================

-- Launch discount: 20% off first year for all annual plans
INSERT INTO discounts (
  code, name, description, discount_type, calculation_type, discount_value,
  starts_at, ends_at, max_uses, target_scope, applicable_billing_cycles,
  first_purchase_only, show_banner, banner_text, badge_text, metadata
) VALUES (
  'LAUNCH20',
  'Launch Discount',
  'Get 20% off your first year! Limited time offer for new subscribers.',
  'coupon',
  'percentage',
  20,
  NOW(),
  NOW() + INTERVAL '90 days',
  1000,
  'global',
  ARRAY['annual']::TEXT[],
  true,
  false,
  NULL,
  '20% OFF',
  '{"campaign": "launch", "source": "initial_migration"}'::jsonb
);

-- Early adopter: 30% off premium/professional annual
INSERT INTO discounts (
  code, name, description, discount_type, calculation_type, discount_value,
  starts_at, ends_at, max_uses, target_scope, target_tiers, applicable_billing_cycles,
  first_purchase_only, show_banner, banner_text, badge_text, metadata
) VALUES (
  'EARLYBIRD30',
  'Early Bird Special',
  'Early bird gets 30% off Premium or Professional annual plans!',
  'coupon',
  'percentage',
  30,
  NOW(),
  NOW() + INTERVAL '60 days',
  500,
  'tier',
  ARRAY['premium', 'professional']::TEXT[],
  ARRAY['annual']::TEXT[],
  true,
  false,
  NULL,
  '30% OFF',
  '{"campaign": "early_adopter", "source": "initial_migration"}'::jsonb
);

-- Automatic launch promo (no code needed)
INSERT INTO discounts (
  code, name, description, discount_type, calculation_type, discount_value,
  starts_at, ends_at, target_scope, applicable_billing_cycles,
  show_banner, banner_text, badge_text, metadata
) VALUES (
  NULL,
  'Launch Week Special',
  'Automatic 15% off all annual plans during launch week!',
  'automatic',
  'percentage',
  15,
  NOW(),
  NOW() + INTERVAL '7 days',
  'global',
  ARRAY['annual']::TEXT[],
  true,
  '🚀 Launch Week Special: 15% OFF all annual plans! Ends soon.',
  'LAUNCH SPECIAL',
  '{"campaign": "launch_week", "source": "initial_migration"}'::jsonb
);

-- =============================================================================
-- STEP 7: Add Table Comments
-- =============================================================================

COMMENT ON TABLE discounts IS
'Discount system for product offerings.

Discount Types:
- coupon: User-entered promo codes at checkout
- automatic: Time-limited offers applied automatically

Calculation Types:
- percentage: Discount as percentage off (e.g., 20% off)
- fixed_amount: Fixed currency amount off (e.g., $10 off)

Target Scopes:
- global: Applies to all offerings
- tier: Applies to specific tiers (essential, premium, professional, enterprise)
- offering: Applies to specific offering IDs

Usage:
- Coupons: Users enter code at checkout, validated via validate_discount_code()
- Automatic: Applied automatically via get_active_discounts_for_offering()
- Both: Recorded in discount_redemptions when used';

COMMENT ON TABLE discount_redemptions IS
'Tracks discount usage for analytics and preventing duplicate redemptions.';

COMMIT;
