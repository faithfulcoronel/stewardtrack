-- =============================================================================
-- Migration: Reset Product Offerings with Multi-Currency Pricing
-- =============================================================================
-- This migration:
-- 1. Deletes all existing product offerings and related data
-- 2. Creates new offerings for all tiers (Essential, Premium, Professional, Enterprise)
-- 3. Includes free access (Essential) and free trial options
-- 4. Creates both monthly and annual billing cycles
-- 5. Sets STARTUP-FRIENDLY competitive pricing with clear savings/discounts
--
-- STARTUP PRICING STRATEGY (aggressive to gain market share):
-- - Essential: Free forever (0)
-- - Premium: ~$9/month, ~$79/year (34% savings = 4 months free!)
-- - Professional: ~$19/month, ~$159/year (30% savings = 3.6 months free!)
-- - Enterprise: ~$39/month, ~$349/year (25% savings = 3 months free!)
--
-- Each offering includes metadata with:
-- - monthly_equivalent: What the annual price equals per month
-- - savings_percent: Percentage saved with annual billing
-- - savings_months: How many months free with annual billing
-- - original_annual_price: What 12x monthly would cost (for strikethrough display)
--
-- Free Trial: 14 days of Professional tier features
-- =============================================================================

BEGIN;

-- =============================================================================
-- STEP 1: Clean up existing data (cascade will handle related records)
-- =============================================================================

-- Delete subscription_payments first (references product_offerings via FK)
-- This is necessary because some existing payments reference old offerings
DELETE FROM subscription_payments WHERE offering_id IN (SELECT id FROM product_offerings);

-- Delete prices first (no cascade from offerings)
DELETE FROM product_offering_prices WHERE offering_id IN (SELECT id FROM product_offerings);

-- Delete offering bundles
DELETE FROM product_offering_bundles WHERE offering_id IN (SELECT id FROM product_offerings);

-- Delete offering features
DELETE FROM product_offering_features WHERE offering_id IN (SELECT id FROM product_offerings);

-- Delete the offerings themselves
DELETE FROM product_offerings;

-- Update the tier check constraint to include our new tier values
ALTER TABLE product_offerings DROP CONSTRAINT IF EXISTS product_offerings_tier_check;
ALTER TABLE product_offerings ADD CONSTRAINT product_offerings_tier_check
  CHECK (tier IN ('essential', 'premium', 'professional', 'enterprise', 'custom', 'starter'));

-- =============================================================================
-- STEP 2: Create Product Offerings
-- =============================================================================

-- Essential (Free Forever) - Basic church management
INSERT INTO product_offerings (
  code, name, description, offering_type, tier, billing_cycle,
  max_users, max_tenants, is_active, is_featured, sort_order, metadata
) VALUES (
  'essential-free',
  'Essential',
  'Free forever! Basic church management for small congregations (under 50 members). Includes member directory, basic attendance tracking, and simple donation recording.',
  'subscription',
  'essential',
  'monthly',
  10,
  1,
  true,
  false,
  100,
  '{
    "target_size": "< 50 members",
    "support_level": "community",
    "pricing": {
      "is_free": true,
      "tagline": "Free Forever"
    }
  }'::jsonb
);

-- Premium Monthly ($9/month - startup friendly!)
INSERT INTO product_offerings (
  code, name, description, offering_type, tier, billing_cycle,
  max_users, max_tenants, is_active, is_featured, sort_order, metadata
) VALUES (
  'premium-monthly',
  'Premium',
  'Extended features for growing churches. Includes groups management, event scheduling, volunteer coordination, and email communications.',
  'subscription',
  'premium',
  'monthly',
  25,
  1,
  true,
  false,
  200,
  '{
    "target_size": "50-150 members",
    "support_level": "email",
    "pricing": {
      "is_free": false,
      "tagline": "Most Popular",
      "usd_monthly": 9
    }
  }'::jsonb
);

-- Premium Annual ($79/year = $6.58/month - Save 34%!)
INSERT INTO product_offerings (
  code, name, description, offering_type, tier, billing_cycle,
  max_users, max_tenants, is_active, is_featured, sort_order, metadata
) VALUES (
  'premium-annual',
  'Premium',
  'Extended features for growing churches. Includes groups management, event scheduling, volunteer coordination, and email communications.',
  'subscription',
  'premium',
  'annual',
  25,
  1,
  true,
  true,
  210,
  '{
    "target_size": "50-150 members",
    "support_level": "email",
    "pricing": {
      "is_free": false,
      "tagline": "Best Value",
      "usd_monthly": 9,
      "usd_annual": 79,
      "usd_monthly_equivalent": 6.58,
      "usd_original_annual": 108,
      "savings_percent": 27,
      "savings_months": 3.2,
      "savings_amount_usd": 29
    },
    "badge": "Save 27%"
  }'::jsonb
);

-- Professional Monthly ($19/month)
INSERT INTO product_offerings (
  code, name, description, offering_type, tier, billing_cycle,
  max_users, max_tenants, is_active, is_featured, sort_order, metadata
) VALUES (
  'professional-monthly',
  'Professional',
  'Full-featured solution for medium-sized churches. Includes advanced reporting, financial management, facility scheduling, SMS notifications, and custom branding.',
  'subscription',
  'professional',
  'monthly',
  50,
  1,
  true,
  false,
  300,
  '{
    "target_size": "150-300 members",
    "support_level": "priority_email",
    "pricing": {
      "is_free": false,
      "tagline": "Full Featured",
      "usd_monthly": 19
    }
  }'::jsonb
);

-- Professional Annual ($159/year = $13.25/month - Save 30%!)
INSERT INTO product_offerings (
  code, name, description, offering_type, tier, billing_cycle,
  max_users, max_tenants, is_active, is_featured, sort_order, metadata
) VALUES (
  'professional-annual',
  'Professional',
  'Full-featured solution for medium-sized churches. Includes advanced reporting, financial management, facility scheduling, SMS notifications, and custom branding.',
  'subscription',
  'professional',
  'annual',
  50,
  1,
  true,
  true,
  310,
  '{
    "target_size": "150-300 members",
    "support_level": "priority_email",
    "pricing": {
      "is_free": false,
      "tagline": "Best Value",
      "usd_monthly": 19,
      "usd_annual": 159,
      "usd_monthly_equivalent": 13.25,
      "usd_original_annual": 228,
      "savings_percent": 30,
      "savings_months": 3.6,
      "savings_amount_usd": 69
    },
    "badge": "Save 30%"
  }'::jsonb
);

-- Enterprise Monthly ($39/month)
INSERT INTO product_offerings (
  code, name, description, offering_type, tier, billing_cycle,
  max_users, max_tenants, is_active, is_featured, sort_order, metadata
) VALUES (
  'enterprise-monthly',
  'Enterprise',
  'Complete solution for large churches and multi-campus organizations. Includes unlimited users, multi-campus support, API access, dedicated support, and custom integrations.',
  'subscription',
  'enterprise',
  'monthly',
  NULL, -- Unlimited
  5,
  true,
  false,
  400,
  '{
    "target_size": "300+ members",
    "support_level": "dedicated",
    "features": ["multi-campus", "api-access", "custom-integrations", "unlimited-users"],
    "pricing": {
      "is_free": false,
      "tagline": "Unlimited Power",
      "usd_monthly": 39
    }
  }'::jsonb
);

-- Enterprise Annual ($349/year = $29.08/month - Save 25%!)
INSERT INTO product_offerings (
  code, name, description, offering_type, tier, billing_cycle,
  max_users, max_tenants, is_active, is_featured, sort_order, metadata
) VALUES (
  'enterprise-annual',
  'Enterprise',
  'Complete solution for large churches and multi-campus organizations. Includes unlimited users, multi-campus support, API access, dedicated support, and custom integrations.',
  'subscription',
  'enterprise',
  'annual',
  NULL, -- Unlimited
  5,
  true,
  true,
  410,
  '{
    "target_size": "300+ members",
    "support_level": "dedicated",
    "features": ["multi-campus", "api-access", "custom-integrations", "unlimited-users"],
    "pricing": {
      "is_free": false,
      "tagline": "Best Value",
      "usd_monthly": 39,
      "usd_annual": 349,
      "usd_monthly_equivalent": 29.08,
      "usd_original_annual": 468,
      "savings_percent": 25,
      "savings_months": 3,
      "savings_amount_usd": 119
    },
    "badge": "Save 25%"
  }'::jsonb
);

-- Free Trial (14 days of Professional features)
INSERT INTO product_offerings (
  code, name, description, offering_type, tier, billing_cycle,
  max_users, max_tenants, is_active, is_featured, sort_order, metadata
) VALUES (
  'professional-trial',
  'Free Trial',
  'Try StewardTrack Professional free for 14 days. Full access to all Professional features with no credit card required.',
  'trial',
  'professional',
  NULL,
  50,
  1,
  true,
  true,
  50,
  '{
    "trial_days": 14,
    "no_credit_card": true,
    "converts_to": "professional-monthly",
    "pricing": {
      "is_free": true,
      "tagline": "No Credit Card Required"
    }
  }'::jsonb
);

-- =============================================================================
-- STEP 3: Create Multi-Currency Pricing
-- =============================================================================
-- STARTUP-FRIENDLY pricing based on purchasing power parity
-- Base: USD pricing, converted to local currencies
--
-- Monthly prices (USD equivalent):
-- - Essential: $0 (Free Forever)
-- - Premium: $9/month
-- - Professional: $19/month
-- - Enterprise: $39/month
--
-- Annual prices with SIGNIFICANT discounts to encourage commitment:
-- - Premium: $79/year (Save 27% = ~$29 savings)
-- - Professional: $159/year (Save 30% = ~$69 savings)
-- - Enterprise: $349/year (Save 25% = ~$119 savings)
-- =============================================================================

-- Helper function to insert prices for an offering
-- We'll insert prices directly using offering codes

-- ESSENTIAL (Free) - All currencies at 0
INSERT INTO product_offering_prices (offering_id, currency, price, is_active)
SELECT po.id, sc.code, 0, true
FROM product_offerings po
CROSS JOIN supported_currencies sc
WHERE po.code = 'essential-free'
  AND sc.is_active = true;

-- PREMIUM MONTHLY pricing ($9 USD equivalent - startup friendly!)
INSERT INTO product_offering_prices (offering_id, currency, price, is_active)
SELECT po.id, 'PHP', 499, true FROM product_offerings po WHERE po.code = 'premium-monthly';
INSERT INTO product_offering_prices (offering_id, currency, price, is_active)
SELECT po.id, 'IDR', 139000, true FROM product_offerings po WHERE po.code = 'premium-monthly';
INSERT INTO product_offering_prices (offering_id, currency, price, is_active)
SELECT po.id, 'SGD', 12, true FROM product_offerings po WHERE po.code = 'premium-monthly';
INSERT INTO product_offering_prices (offering_id, currency, price, is_active)
SELECT po.id, 'MYR', 39, true FROM product_offerings po WHERE po.code = 'premium-monthly';
INSERT INTO product_offering_prices (offering_id, currency, price, is_active)
SELECT po.id, 'THB', 319, true FROM product_offerings po WHERE po.code = 'premium-monthly';
INSERT INTO product_offering_prices (offering_id, currency, price, is_active)
SELECT po.id, 'VND', 219000, true FROM product_offerings po WHERE po.code = 'premium-monthly';
INSERT INTO product_offering_prices (offering_id, currency, price, is_active)
SELECT po.id, 'USD', 9, true FROM product_offerings po WHERE po.code = 'premium-monthly';
INSERT INTO product_offering_prices (offering_id, currency, price, is_active)
SELECT po.id, 'EUR', 8, true FROM product_offerings po WHERE po.code = 'premium-monthly';
INSERT INTO product_offering_prices (offering_id, currency, price, is_active)
SELECT po.id, 'GBP', 7, true FROM product_offerings po WHERE po.code = 'premium-monthly';
INSERT INTO product_offering_prices (offering_id, currency, price, is_active)
SELECT po.id, 'AUD', 14, true FROM product_offerings po WHERE po.code = 'premium-monthly';
INSERT INTO product_offering_prices (offering_id, currency, price, is_active)
SELECT po.id, 'JPY', 1350, true FROM product_offerings po WHERE po.code = 'premium-monthly';
INSERT INTO product_offering_prices (offering_id, currency, price, is_active)
SELECT po.id, 'KRW', 11900, true FROM product_offerings po WHERE po.code = 'premium-monthly';
INSERT INTO product_offering_prices (offering_id, currency, price, is_active)
SELECT po.id, 'HKD', 69, true FROM product_offerings po WHERE po.code = 'premium-monthly';
INSERT INTO product_offering_prices (offering_id, currency, price, is_active)
SELECT po.id, 'TWD', 279, true FROM product_offerings po WHERE po.code = 'premium-monthly';
INSERT INTO product_offering_prices (offering_id, currency, price, is_active)
SELECT po.id, 'INR', 749, true FROM product_offerings po WHERE po.code = 'premium-monthly';
INSERT INTO product_offering_prices (offering_id, currency, price, is_active)
SELECT po.id, 'CAD', 12, true FROM product_offerings po WHERE po.code = 'premium-monthly';
INSERT INTO product_offering_prices (offering_id, currency, price, is_active)
SELECT po.id, 'NZD', 15, true FROM product_offerings po WHERE po.code = 'premium-monthly';
INSERT INTO product_offering_prices (offering_id, currency, price, is_active)
SELECT po.id, 'CHF', 8, true FROM product_offerings po WHERE po.code = 'premium-monthly';

-- PREMIUM ANNUAL pricing ($79/year = Save 27%!)
INSERT INTO product_offering_prices (offering_id, currency, price, is_active)
SELECT po.id, 'PHP', 4390, true FROM product_offerings po WHERE po.code = 'premium-annual';
INSERT INTO product_offering_prices (offering_id, currency, price, is_active)
SELECT po.id, 'IDR', 1219000, true FROM product_offerings po WHERE po.code = 'premium-annual';
INSERT INTO product_offering_prices (offering_id, currency, price, is_active)
SELECT po.id, 'SGD', 105, true FROM product_offerings po WHERE po.code = 'premium-annual';
INSERT INTO product_offering_prices (offering_id, currency, price, is_active)
SELECT po.id, 'MYR', 339, true FROM product_offerings po WHERE po.code = 'premium-annual';
INSERT INTO product_offering_prices (offering_id, currency, price, is_active)
SELECT po.id, 'THB', 2790, true FROM product_offerings po WHERE po.code = 'premium-annual';
INSERT INTO product_offering_prices (offering_id, currency, price, is_active)
SELECT po.id, 'VND', 1920000, true FROM product_offerings po WHERE po.code = 'premium-annual';
INSERT INTO product_offering_prices (offering_id, currency, price, is_active)
SELECT po.id, 'USD', 79, true FROM product_offerings po WHERE po.code = 'premium-annual';
INSERT INTO product_offering_prices (offering_id, currency, price, is_active)
SELECT po.id, 'EUR', 69, true FROM product_offerings po WHERE po.code = 'premium-annual';
INSERT INTO product_offering_prices (offering_id, currency, price, is_active)
SELECT po.id, 'GBP', 59, true FROM product_offerings po WHERE po.code = 'premium-annual';
INSERT INTO product_offering_prices (offering_id, currency, price, is_active)
SELECT po.id, 'AUD', 119, true FROM product_offerings po WHERE po.code = 'premium-annual';
INSERT INTO product_offering_prices (offering_id, currency, price, is_active)
SELECT po.id, 'JPY', 11800, true FROM product_offerings po WHERE po.code = 'premium-annual';
INSERT INTO product_offering_prices (offering_id, currency, price, is_active)
SELECT po.id, 'KRW', 104900, true FROM product_offerings po WHERE po.code = 'premium-annual';
INSERT INTO product_offering_prices (offering_id, currency, price, is_active)
SELECT po.id, 'HKD', 609, true FROM product_offerings po WHERE po.code = 'premium-annual';
INSERT INTO product_offering_prices (offering_id, currency, price, is_active)
SELECT po.id, 'TWD', 2490, true FROM product_offerings po WHERE po.code = 'premium-annual';
INSERT INTO product_offering_prices (offering_id, currency, price, is_active)
SELECT po.id, 'INR', 6590, true FROM product_offerings po WHERE po.code = 'premium-annual';
INSERT INTO product_offering_prices (offering_id, currency, price, is_active)
SELECT po.id, 'CAD', 105, true FROM product_offerings po WHERE po.code = 'premium-annual';
INSERT INTO product_offering_prices (offering_id, currency, price, is_active)
SELECT po.id, 'NZD', 129, true FROM product_offerings po WHERE po.code = 'premium-annual';
INSERT INTO product_offering_prices (offering_id, currency, price, is_active)
SELECT po.id, 'CHF', 69, true FROM product_offerings po WHERE po.code = 'premium-annual';

-- PROFESSIONAL MONTHLY pricing ($19 USD equivalent)
INSERT INTO product_offering_prices (offering_id, currency, price, is_active)
SELECT po.id, 'PHP', 1090, true FROM product_offerings po WHERE po.code = 'professional-monthly';
INSERT INTO product_offering_prices (offering_id, currency, price, is_active)
SELECT po.id, 'IDR', 299000, true FROM product_offerings po WHERE po.code = 'professional-monthly';
INSERT INTO product_offering_prices (offering_id, currency, price, is_active)
SELECT po.id, 'SGD', 25, true FROM product_offerings po WHERE po.code = 'professional-monthly';
INSERT INTO product_offering_prices (offering_id, currency, price, is_active)
SELECT po.id, 'MYR', 85, true FROM product_offerings po WHERE po.code = 'professional-monthly';
INSERT INTO product_offering_prices (offering_id, currency, price, is_active)
SELECT po.id, 'THB', 679, true FROM product_offerings po WHERE po.code = 'professional-monthly';
INSERT INTO product_offering_prices (offering_id, currency, price, is_active)
SELECT po.id, 'VND', 469000, true FROM product_offerings po WHERE po.code = 'professional-monthly';
INSERT INTO product_offering_prices (offering_id, currency, price, is_active)
SELECT po.id, 'USD', 19, true FROM product_offerings po WHERE po.code = 'professional-monthly';
INSERT INTO product_offering_prices (offering_id, currency, price, is_active)
SELECT po.id, 'EUR', 17, true FROM product_offerings po WHERE po.code = 'professional-monthly';
INSERT INTO product_offering_prices (offering_id, currency, price, is_active)
SELECT po.id, 'GBP', 15, true FROM product_offerings po WHERE po.code = 'professional-monthly';
INSERT INTO product_offering_prices (offering_id, currency, price, is_active)
SELECT po.id, 'AUD', 29, true FROM product_offerings po WHERE po.code = 'professional-monthly';
INSERT INTO product_offering_prices (offering_id, currency, price, is_active)
SELECT po.id, 'JPY', 2850, true FROM product_offerings po WHERE po.code = 'professional-monthly';
INSERT INTO product_offering_prices (offering_id, currency, price, is_active)
SELECT po.id, 'KRW', 25900, true FROM product_offerings po WHERE po.code = 'professional-monthly';
INSERT INTO product_offering_prices (offering_id, currency, price, is_active)
SELECT po.id, 'HKD', 149, true FROM product_offerings po WHERE po.code = 'professional-monthly';
INSERT INTO product_offering_prices (offering_id, currency, price, is_active)
SELECT po.id, 'TWD', 599, true FROM product_offerings po WHERE po.code = 'professional-monthly';
INSERT INTO product_offering_prices (offering_id, currency, price, is_active)
SELECT po.id, 'INR', 1590, true FROM product_offerings po WHERE po.code = 'professional-monthly';
INSERT INTO product_offering_prices (offering_id, currency, price, is_active)
SELECT po.id, 'CAD', 25, true FROM product_offerings po WHERE po.code = 'professional-monthly';
INSERT INTO product_offering_prices (offering_id, currency, price, is_active)
SELECT po.id, 'NZD', 32, true FROM product_offerings po WHERE po.code = 'professional-monthly';
INSERT INTO product_offering_prices (offering_id, currency, price, is_active)
SELECT po.id, 'CHF', 17, true FROM product_offerings po WHERE po.code = 'professional-monthly';

-- PROFESSIONAL ANNUAL pricing ($159/year = Save 30%!)
INSERT INTO product_offering_prices (offering_id, currency, price, is_active)
SELECT po.id, 'PHP', 8990, true FROM product_offerings po WHERE po.code = 'professional-annual';
INSERT INTO product_offering_prices (offering_id, currency, price, is_active)
SELECT po.id, 'IDR', 2490000, true FROM product_offerings po WHERE po.code = 'professional-annual';
INSERT INTO product_offering_prices (offering_id, currency, price, is_active)
SELECT po.id, 'SGD', 209, true FROM product_offerings po WHERE po.code = 'professional-annual';
INSERT INTO product_offering_prices (offering_id, currency, price, is_active)
SELECT po.id, 'MYR', 709, true FROM product_offerings po WHERE po.code = 'professional-annual';
INSERT INTO product_offering_prices (offering_id, currency, price, is_active)
SELECT po.id, 'THB', 5690, true FROM product_offerings po WHERE po.code = 'professional-annual';
INSERT INTO product_offering_prices (offering_id, currency, price, is_active)
SELECT po.id, 'VND', 3890000, true FROM product_offerings po WHERE po.code = 'professional-annual';
INSERT INTO product_offering_prices (offering_id, currency, price, is_active)
SELECT po.id, 'USD', 159, true FROM product_offerings po WHERE po.code = 'professional-annual';
INSERT INTO product_offering_prices (offering_id, currency, price, is_active)
SELECT po.id, 'EUR', 139, true FROM product_offerings po WHERE po.code = 'professional-annual';
INSERT INTO product_offering_prices (offering_id, currency, price, is_active)
SELECT po.id, 'GBP', 119, true FROM product_offerings po WHERE po.code = 'professional-annual';
INSERT INTO product_offering_prices (offering_id, currency, price, is_active)
SELECT po.id, 'AUD', 239, true FROM product_offerings po WHERE po.code = 'professional-annual';
INSERT INTO product_offering_prices (offering_id, currency, price, is_active)
SELECT po.id, 'JPY', 23900, true FROM product_offerings po WHERE po.code = 'professional-annual';
INSERT INTO product_offering_prices (offering_id, currency, price, is_active)
SELECT po.id, 'KRW', 215900, true FROM product_offerings po WHERE po.code = 'professional-annual';
INSERT INTO product_offering_prices (offering_id, currency, price, is_active)
SELECT po.id, 'HKD', 1239, true FROM product_offerings po WHERE po.code = 'professional-annual';
INSERT INTO product_offering_prices (offering_id, currency, price, is_active)
SELECT po.id, 'TWD', 4990, true FROM product_offerings po WHERE po.code = 'professional-annual';
INSERT INTO product_offering_prices (offering_id, currency, price, is_active)
SELECT po.id, 'INR', 13290, true FROM product_offerings po WHERE po.code = 'professional-annual';
INSERT INTO product_offering_prices (offering_id, currency, price, is_active)
SELECT po.id, 'CAD', 209, true FROM product_offerings po WHERE po.code = 'professional-annual';
INSERT INTO product_offering_prices (offering_id, currency, price, is_active)
SELECT po.id, 'NZD', 269, true FROM product_offerings po WHERE po.code = 'professional-annual';
INSERT INTO product_offering_prices (offering_id, currency, price, is_active)
SELECT po.id, 'CHF', 139, true FROM product_offerings po WHERE po.code = 'professional-annual';

-- ENTERPRISE MONTHLY pricing ($39 USD equivalent)
INSERT INTO product_offering_prices (offering_id, currency, price, is_active)
SELECT po.id, 'PHP', 2190, true FROM product_offerings po WHERE po.code = 'enterprise-monthly';
INSERT INTO product_offering_prices (offering_id, currency, price, is_active)
SELECT po.id, 'IDR', 609000, true FROM product_offerings po WHERE po.code = 'enterprise-monthly';
INSERT INTO product_offering_prices (offering_id, currency, price, is_active)
SELECT po.id, 'SGD', 52, true FROM product_offerings po WHERE po.code = 'enterprise-monthly';
INSERT INTO product_offering_prices (offering_id, currency, price, is_active)
SELECT po.id, 'MYR', 175, true FROM product_offerings po WHERE po.code = 'enterprise-monthly';
INSERT INTO product_offering_prices (offering_id, currency, price, is_active)
SELECT po.id, 'THB', 1390, true FROM product_offerings po WHERE po.code = 'enterprise-monthly';
INSERT INTO product_offering_prices (offering_id, currency, price, is_active)
SELECT po.id, 'VND', 959000, true FROM product_offerings po WHERE po.code = 'enterprise-monthly';
INSERT INTO product_offering_prices (offering_id, currency, price, is_active)
SELECT po.id, 'USD', 39, true FROM product_offerings po WHERE po.code = 'enterprise-monthly';
INSERT INTO product_offering_prices (offering_id, currency, price, is_active)
SELECT po.id, 'EUR', 35, true FROM product_offerings po WHERE po.code = 'enterprise-monthly';
INSERT INTO product_offering_prices (offering_id, currency, price, is_active)
SELECT po.id, 'GBP', 31, true FROM product_offerings po WHERE po.code = 'enterprise-monthly';
INSERT INTO product_offering_prices (offering_id, currency, price, is_active)
SELECT po.id, 'AUD', 59, true FROM product_offerings po WHERE po.code = 'enterprise-monthly';
INSERT INTO product_offering_prices (offering_id, currency, price, is_active)
SELECT po.id, 'JPY', 5850, true FROM product_offerings po WHERE po.code = 'enterprise-monthly';
INSERT INTO product_offering_prices (offering_id, currency, price, is_active)
SELECT po.id, 'KRW', 52900, true FROM product_offerings po WHERE po.code = 'enterprise-monthly';
INSERT INTO product_offering_prices (offering_id, currency, price, is_active)
SELECT po.id, 'HKD', 305, true FROM product_offerings po WHERE po.code = 'enterprise-monthly';
INSERT INTO product_offering_prices (offering_id, currency, price, is_active)
SELECT po.id, 'TWD', 1229, true FROM product_offerings po WHERE po.code = 'enterprise-monthly';
INSERT INTO product_offering_prices (offering_id, currency, price, is_active)
SELECT po.id, 'INR', 3290, true FROM product_offerings po WHERE po.code = 'enterprise-monthly';
INSERT INTO product_offering_prices (offering_id, currency, price, is_active)
SELECT po.id, 'CAD', 52, true FROM product_offerings po WHERE po.code = 'enterprise-monthly';
INSERT INTO product_offering_prices (offering_id, currency, price, is_active)
SELECT po.id, 'NZD', 65, true FROM product_offerings po WHERE po.code = 'enterprise-monthly';
INSERT INTO product_offering_prices (offering_id, currency, price, is_active)
SELECT po.id, 'CHF', 35, true FROM product_offerings po WHERE po.code = 'enterprise-monthly';

-- ENTERPRISE ANNUAL pricing ($349/year = Save 25%!)
INSERT INTO product_offering_prices (offering_id, currency, price, is_active)
SELECT po.id, 'PHP', 19490, true FROM product_offerings po WHERE po.code = 'enterprise-annual';
INSERT INTO product_offering_prices (offering_id, currency, price, is_active)
SELECT po.id, 'IDR', 5390000, true FROM product_offerings po WHERE po.code = 'enterprise-annual';
INSERT INTO product_offering_prices (offering_id, currency, price, is_active)
SELECT po.id, 'SGD', 459, true FROM product_offerings po WHERE po.code = 'enterprise-annual';
INSERT INTO product_offering_prices (offering_id, currency, price, is_active)
SELECT po.id, 'MYR', 1549, true FROM product_offerings po WHERE po.code = 'enterprise-annual';
INSERT INTO product_offering_prices (offering_id, currency, price, is_active)
SELECT po.id, 'THB', 12290, true FROM product_offerings po WHERE po.code = 'enterprise-annual';
INSERT INTO product_offering_prices (offering_id, currency, price, is_active)
SELECT po.id, 'VND', 8490000, true FROM product_offerings po WHERE po.code = 'enterprise-annual';
INSERT INTO product_offering_prices (offering_id, currency, price, is_active)
SELECT po.id, 'USD', 349, true FROM product_offerings po WHERE po.code = 'enterprise-annual';
INSERT INTO product_offering_prices (offering_id, currency, price, is_active)
SELECT po.id, 'EUR', 309, true FROM product_offerings po WHERE po.code = 'enterprise-annual';
INSERT INTO product_offering_prices (offering_id, currency, price, is_active)
SELECT po.id, 'GBP', 269, true FROM product_offerings po WHERE po.code = 'enterprise-annual';
INSERT INTO product_offering_prices (offering_id, currency, price, is_active)
SELECT po.id, 'AUD', 529, true FROM product_offerings po WHERE po.code = 'enterprise-annual';
INSERT INTO product_offering_prices (offering_id, currency, price, is_active)
SELECT po.id, 'JPY', 51900, true FROM product_offerings po WHERE po.code = 'enterprise-annual';
INSERT INTO product_offering_prices (offering_id, currency, price, is_active)
SELECT po.id, 'KRW', 469000, true FROM product_offerings po WHERE po.code = 'enterprise-annual';
INSERT INTO product_offering_prices (offering_id, currency, price, is_active)
SELECT po.id, 'HKD', 2699, true FROM product_offerings po WHERE po.code = 'enterprise-annual';
INSERT INTO product_offering_prices (offering_id, currency, price, is_active)
SELECT po.id, 'TWD', 10890, true FROM product_offerings po WHERE po.code = 'enterprise-annual';
INSERT INTO product_offering_prices (offering_id, currency, price, is_active)
SELECT po.id, 'INR', 29190, true FROM product_offerings po WHERE po.code = 'enterprise-annual';
INSERT INTO product_offering_prices (offering_id, currency, price, is_active)
SELECT po.id, 'CAD', 459, true FROM product_offerings po WHERE po.code = 'enterprise-annual';
INSERT INTO product_offering_prices (offering_id, currency, price, is_active)
SELECT po.id, 'NZD', 579, true FROM product_offerings po WHERE po.code = 'enterprise-annual';
INSERT INTO product_offering_prices (offering_id, currency, price, is_active)
SELECT po.id, 'CHF', 309, true FROM product_offerings po WHERE po.code = 'enterprise-annual';

-- FREE TRIAL - All currencies at 0
INSERT INTO product_offering_prices (offering_id, currency, price, is_active)
SELECT po.id, sc.code, 0, true
FROM product_offerings po
CROSS JOIN supported_currencies sc
WHERE po.code = 'professional-trial'
  AND sc.is_active = true;

-- =============================================================================
-- STEP 4: Assign Features to Product Offerings
-- =============================================================================
-- Feature assignment follows tier hierarchy:
-- - Essential: Gets all 'essential' tier features (core features)
-- - Premium: Gets 'essential' + 'premium' tier features
-- - Professional: Gets 'essential' + 'premium' + 'professional' tier features
-- - Enterprise: Gets ALL features (essential + premium + professional + enterprise)
-- =============================================================================

-- ESSENTIAL tier offerings get only essential features
INSERT INTO product_offering_features (offering_id, feature_id, is_required)
SELECT po.id, fc.id, true
FROM product_offerings po
CROSS JOIN feature_catalog fc
WHERE po.tier = 'essential'
  AND fc.tier = 'essential'
  AND fc.deleted_at IS NULL
  AND fc.is_active = true
ON CONFLICT DO NOTHING;

-- PREMIUM tier offerings get essential + premium features
INSERT INTO product_offering_features (offering_id, feature_id, is_required)
SELECT po.id, fc.id, true
FROM product_offerings po
CROSS JOIN feature_catalog fc
WHERE po.tier = 'premium'
  AND fc.tier IN ('essential', 'premium')
  AND fc.deleted_at IS NULL
  AND fc.is_active = true
ON CONFLICT DO NOTHING;

-- PROFESSIONAL tier offerings get essential + premium + professional features
INSERT INTO product_offering_features (offering_id, feature_id, is_required)
SELECT po.id, fc.id, true
FROM product_offerings po
CROSS JOIN feature_catalog fc
WHERE po.tier = 'professional'
  AND fc.tier IN ('essential', 'premium', 'professional')
  AND fc.deleted_at IS NULL
  AND fc.is_active = true
ON CONFLICT DO NOTHING;

-- ENTERPRISE tier offerings get ALL features
INSERT INTO product_offering_features (offering_id, feature_id, is_required)
SELECT po.id, fc.id, true
FROM product_offerings po
CROSS JOIN feature_catalog fc
WHERE po.tier = 'enterprise'
  AND fc.tier IN ('essential', 'premium', 'professional', 'enterprise')
  AND fc.deleted_at IS NULL
  AND fc.is_active = true
ON CONFLICT DO NOTHING;

-- =============================================================================
-- STEP 5: Add summary comment
-- =============================================================================

COMMENT ON TABLE product_offerings IS
'Product offerings with multi-currency pricing support.

Tiers (startup-friendly pricing):
- Essential (Free): Basic church management for small congregations (< 50 members)
- Premium ($9/month): Extended features for growing churches (50-150 members)
- Professional ($19/month): Full-featured solution for medium churches (150-300 members)
- Enterprise ($39/month): Complete solution for large/multi-campus organizations (300+ members)

Billing Cycles:
- Monthly: Pay-as-you-go flexibility
- Annual: Save 25-30% with annual billing
- Trial: 14-day free trial of Professional features

Features are assigned based on tier hierarchy:
- Essential offerings include core features only
- Premium offerings include Essential + Premium features
- Professional offerings include Essential + Premium + Professional features
- Enterprise offerings include ALL features

See product_offering_prices table for currency-specific pricing.';

COMMIT;
