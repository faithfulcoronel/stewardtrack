-- =============================================================================
-- Migration: Fix Product Offerings Data
-- =============================================================================
-- This migration fixes the product offerings data:
-- 1. Updates offering_type check constraint to include 'free'
-- 2. Ensures all prices are properly inserted
-- 3. Updates offering_type field for all offerings
-- 4. Updates billing_cycle field for all offerings
-- 5. Ensures only one featured offering per billing cycle per tier
-- =============================================================================

BEGIN;

-- =============================================================================
-- STEP 0: Update offering_type check constraint to include 'free'
-- =============================================================================
ALTER TABLE product_offerings DROP CONSTRAINT IF EXISTS product_offerings_offering_type_check;
ALTER TABLE product_offerings ADD CONSTRAINT product_offerings_offering_type_check
  CHECK (offering_type IN ('subscription', 'one-time', 'trial', 'enterprise', 'free'));

-- =============================================================================
-- STEP 1: Verify and fix product_offering_prices
-- =============================================================================
-- First, delete any existing prices to avoid duplicates
DELETE FROM product_offering_prices;

-- Re-insert all prices directly without relying on supported_currencies table

-- ESSENTIAL (Free) - PHP price only (main currency)
INSERT INTO product_offering_prices (offering_id, currency, price, is_active)
SELECT po.id, 'PHP', 0, true
FROM product_offerings po WHERE po.code = 'essential-free'
ON CONFLICT DO NOTHING;

-- FREE TRIAL - PHP price only (main currency)
INSERT INTO product_offering_prices (offering_id, currency, price, is_active)
SELECT po.id, 'PHP', 0, true
FROM product_offerings po WHERE po.code = 'professional-trial'
ON CONFLICT DO NOTHING;

-- PREMIUM MONTHLY pricing
INSERT INTO product_offering_prices (offering_id, currency, price, is_active)
SELECT po.id, 'PHP', 499, true FROM product_offerings po WHERE po.code = 'premium-monthly'
ON CONFLICT DO NOTHING;
INSERT INTO product_offering_prices (offering_id, currency, price, is_active)
SELECT po.id, 'USD', 9, true FROM product_offerings po WHERE po.code = 'premium-monthly'
ON CONFLICT DO NOTHING;

-- PREMIUM ANNUAL pricing
INSERT INTO product_offering_prices (offering_id, currency, price, is_active)
SELECT po.id, 'PHP', 4390, true FROM product_offerings po WHERE po.code = 'premium-annual'
ON CONFLICT DO NOTHING;
INSERT INTO product_offering_prices (offering_id, currency, price, is_active)
SELECT po.id, 'USD', 79, true FROM product_offerings po WHERE po.code = 'premium-annual'
ON CONFLICT DO NOTHING;

-- PROFESSIONAL MONTHLY pricing
INSERT INTO product_offering_prices (offering_id, currency, price, is_active)
SELECT po.id, 'PHP', 1090, true FROM product_offerings po WHERE po.code = 'professional-monthly'
ON CONFLICT DO NOTHING;
INSERT INTO product_offering_prices (offering_id, currency, price, is_active)
SELECT po.id, 'USD', 19, true FROM product_offerings po WHERE po.code = 'professional-monthly'
ON CONFLICT DO NOTHING;

-- PROFESSIONAL ANNUAL pricing
INSERT INTO product_offering_prices (offering_id, currency, price, is_active)
SELECT po.id, 'PHP', 8990, true FROM product_offerings po WHERE po.code = 'professional-annual'
ON CONFLICT DO NOTHING;
INSERT INTO product_offering_prices (offering_id, currency, price, is_active)
SELECT po.id, 'USD', 159, true FROM product_offerings po WHERE po.code = 'professional-annual'
ON CONFLICT DO NOTHING;

-- ENTERPRISE MONTHLY pricing
INSERT INTO product_offering_prices (offering_id, currency, price, is_active)
SELECT po.id, 'PHP', 2190, true FROM product_offerings po WHERE po.code = 'enterprise-monthly'
ON CONFLICT DO NOTHING;
INSERT INTO product_offering_prices (offering_id, currency, price, is_active)
SELECT po.id, 'USD', 39, true FROM product_offerings po WHERE po.code = 'enterprise-monthly'
ON CONFLICT DO NOTHING;

-- ENTERPRISE ANNUAL pricing
INSERT INTO product_offering_prices (offering_id, currency, price, is_active)
SELECT po.id, 'PHP', 19490, true FROM product_offerings po WHERE po.code = 'enterprise-annual'
ON CONFLICT DO NOTHING;
INSERT INTO product_offering_prices (offering_id, currency, price, is_active)
SELECT po.id, 'USD', 349, true FROM product_offerings po WHERE po.code = 'enterprise-annual'
ON CONFLICT DO NOTHING;

-- =============================================================================
-- STEP 2: Update offering_type for all offerings
-- =============================================================================
-- subscription: Regular paid subscriptions (monthly/annual)
-- trial: Free trial offerings
-- free: Free forever offerings

UPDATE product_offerings SET offering_type = 'free' WHERE code = 'essential-free';
UPDATE product_offerings SET offering_type = 'trial' WHERE code = 'professional-trial';
UPDATE product_offerings SET offering_type = 'subscription' WHERE code IN (
  'premium-monthly', 'premium-annual',
  'professional-monthly', 'professional-annual',
  'enterprise-monthly', 'enterprise-annual'
);

-- =============================================================================
-- STEP 3: Update billing_cycle for all offerings
-- =============================================================================
-- Ensure billing_cycle is correctly set for all offerings

UPDATE product_offerings SET billing_cycle = 'monthly' WHERE code IN (
  'essential-free',
  'premium-monthly',
  'professional-monthly',
  'enterprise-monthly'
);

UPDATE product_offerings SET billing_cycle = 'annual' WHERE code IN (
  'premium-annual',
  'professional-annual',
  'enterprise-annual'
);

-- Trial has no billing cycle (null)
UPDATE product_offerings SET billing_cycle = NULL WHERE code = 'professional-trial';

-- =============================================================================
-- STEP 4: Update is_featured to ensure only one featured per tier/billing_cycle
-- =============================================================================
-- Strategy: Feature the annual plans (better value for users)
-- Unfeatured: monthly plans, free tier, trial

-- First, unfeatured all
UPDATE product_offerings SET is_featured = false;

-- Featured: Annual plans only (one per tier)
UPDATE product_offerings SET is_featured = true WHERE code IN (
  'premium-annual',
  'professional-annual',
  'enterprise-annual'
);

-- =============================================================================
-- STEP 5: Update sort_order for proper display
-- =============================================================================
-- Order: Trial first, then Essential, Premium, Professional, Enterprise
-- Within each tier: Monthly before Annual

UPDATE product_offerings SET sort_order = 10 WHERE code = 'professional-trial';
UPDATE product_offerings SET sort_order = 100 WHERE code = 'essential-free';
UPDATE product_offerings SET sort_order = 200 WHERE code = 'premium-monthly';
UPDATE product_offerings SET sort_order = 210 WHERE code = 'premium-annual';
UPDATE product_offerings SET sort_order = 300 WHERE code = 'professional-monthly';
UPDATE product_offerings SET sort_order = 310 WHERE code = 'professional-annual';
UPDATE product_offerings SET sort_order = 400 WHERE code = 'enterprise-monthly';
UPDATE product_offerings SET sort_order = 410 WHERE code = 'enterprise-annual';

COMMIT;
