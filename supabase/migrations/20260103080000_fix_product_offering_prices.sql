-- =============================================================================
-- Migration: Fix Product Offering Prices
-- =============================================================================
-- This migration ensures all product offerings have correct prices inserted.
-- The previous migration may have failed silently due to constraint issues.
-- =============================================================================

BEGIN;

-- =============================================================================
-- STEP 1: Clear all existing prices and re-insert fresh
-- =============================================================================
DELETE FROM product_offering_prices;

-- =============================================================================
-- STEP 2: Insert prices for all offerings
-- =============================================================================

-- ESSENTIAL (Free) - PHP and USD
INSERT INTO product_offering_prices (offering_id, currency, price, is_active)
SELECT po.id, 'PHP', 0, true
FROM product_offerings po WHERE po.code = 'essential-free';

INSERT INTO product_offering_prices (offering_id, currency, price, is_active)
SELECT po.id, 'USD', 0, true
FROM product_offerings po WHERE po.code = 'essential-free';

-- FREE TRIAL - PHP and USD
INSERT INTO product_offering_prices (offering_id, currency, price, is_active)
SELECT po.id, 'PHP', 0, true
FROM product_offerings po WHERE po.code = 'professional-trial';

INSERT INTO product_offering_prices (offering_id, currency, price, is_active)
SELECT po.id, 'USD', 0, true
FROM product_offerings po WHERE po.code = 'professional-trial';

-- PREMIUM MONTHLY - PHP ₱499, USD $9
INSERT INTO product_offering_prices (offering_id, currency, price, is_active)
SELECT po.id, 'PHP', 499, true
FROM product_offerings po WHERE po.code = 'premium-monthly';

INSERT INTO product_offering_prices (offering_id, currency, price, is_active)
SELECT po.id, 'USD', 9, true
FROM product_offerings po WHERE po.code = 'premium-monthly';

-- PREMIUM ANNUAL - PHP ₱4,390, USD $79 (Save ~27%)
INSERT INTO product_offering_prices (offering_id, currency, price, is_active)
SELECT po.id, 'PHP', 4390, true
FROM product_offerings po WHERE po.code = 'premium-annual';

INSERT INTO product_offering_prices (offering_id, currency, price, is_active)
SELECT po.id, 'USD', 79, true
FROM product_offerings po WHERE po.code = 'premium-annual';

-- PROFESSIONAL MONTHLY - PHP ₱1,090, USD $19
INSERT INTO product_offering_prices (offering_id, currency, price, is_active)
SELECT po.id, 'PHP', 1090, true
FROM product_offerings po WHERE po.code = 'professional-monthly';

INSERT INTO product_offering_prices (offering_id, currency, price, is_active)
SELECT po.id, 'USD', 19, true
FROM product_offerings po WHERE po.code = 'professional-monthly';

-- PROFESSIONAL ANNUAL - PHP ₱8,990, USD $159 (Save ~30%)
INSERT INTO product_offering_prices (offering_id, currency, price, is_active)
SELECT po.id, 'PHP', 8990, true
FROM product_offerings po WHERE po.code = 'professional-annual';

INSERT INTO product_offering_prices (offering_id, currency, price, is_active)
SELECT po.id, 'USD', 159, true
FROM product_offerings po WHERE po.code = 'professional-annual';

-- ENTERPRISE MONTHLY - PHP ₱2,190, USD $39
INSERT INTO product_offering_prices (offering_id, currency, price, is_active)
SELECT po.id, 'PHP', 2190, true
FROM product_offerings po WHERE po.code = 'enterprise-monthly';

INSERT INTO product_offering_prices (offering_id, currency, price, is_active)
SELECT po.id, 'USD', 39, true
FROM product_offerings po WHERE po.code = 'enterprise-monthly';

-- ENTERPRISE ANNUAL - PHP ₱19,490, USD $349 (Save ~25%)
INSERT INTO product_offering_prices (offering_id, currency, price, is_active)
SELECT po.id, 'PHP', 19490, true
FROM product_offerings po WHERE po.code = 'enterprise-annual';

INSERT INTO product_offering_prices (offering_id, currency, price, is_active)
SELECT po.id, 'USD', 349, true
FROM product_offerings po WHERE po.code = 'enterprise-annual';

-- =============================================================================
-- STEP 3: Verify prices were inserted
-- =============================================================================
-- This query should show all offerings with their prices
DO $$
DECLARE
  price_count integer;
BEGIN
  SELECT COUNT(*) INTO price_count FROM product_offering_prices;
  IF price_count < 16 THEN
    RAISE EXCEPTION 'Expected at least 16 prices but only found %', price_count;
  END IF;
  RAISE NOTICE 'Successfully inserted % prices', price_count;
END $$;

COMMIT;
