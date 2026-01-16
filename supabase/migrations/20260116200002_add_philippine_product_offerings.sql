-- =============================================================================
-- Migration: Add Philippine Market Product Offerings
-- =============================================================================
-- This migration adds new product offerings specifically designed for the
-- Philippine church market with Filipino tier names and PHP-focused pricing.
--
-- Tiers (Filipino naming):
-- - Mananampalataya (Believer) - Free tier for small churches (< 50 members)
-- - Lingkod (Servant) - Premium tier for growing churches (50-150 members)
-- - Katiwala (Steward) - Professional tier for established churches (150-500 members)
-- - Tagapangasiwa (Overseer) - Enterprise tier for large churches (500+ members)
--
-- Pricing Strategy (Philippine Market):
-- - Mananampalataya: FREE forever
-- - Lingkod: PHP 499/month, PHP 4,790/year (20% discount)
-- - Katiwala: PHP 1,299/month, PHP 12,470/year (20% discount)
-- - Tagapangasiwa: PHP 2,999/month, PHP 28,790/year (20% discount)
--
-- Multi-currency support: PHP, USD, SGD, MYR, IDR, THB, VND
-- =============================================================================

BEGIN;

-- =============================================================================
-- STEP 1: Create Philippine Market Product Offerings
-- =============================================================================

-- Mananampalataya (Believer) - Free Forever
INSERT INTO product_offerings (
  code, name, description, offering_type, tier, billing_cycle,
  max_users, max_tenants, max_members, max_sms_per_month, max_emails_per_month,
  max_storage_mb, max_admin_users, is_active, is_featured, sort_order, metadata
) VALUES (
  'ph-mananampalataya-free',
  'Mananampalataya',
  'Free forever! Basic church management for small congregations (up to 50 members). Includes member directory, household management, event planning, groups, in-app notifications, and basic financial management.',
  'subscription',
  'essential',
  'monthly',
  10,
  1,
  50,      -- max_members
  0,       -- max_sms_per_month (disabled)
  100,     -- max_emails_per_month
  100,     -- max_storage_mb
  2,       -- max_admin_users
  true,
  false,
  1000,
  '{
    "market": "PH",
    "locale": "fil-PH",
    "tier_name_en": "Believer",
    "tier_name_fil": "Mananampalataya",
    "target_size": "< 50 members",
    "support_level": "community",
    "pricing": {
      "is_free": true,
      "tagline": "Libre Habambuhay",
      "tagline_en": "Free Forever"
    }
  }'::jsonb
)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  max_members = EXCLUDED.max_members,
  max_sms_per_month = EXCLUDED.max_sms_per_month,
  max_emails_per_month = EXCLUDED.max_emails_per_month,
  max_storage_mb = EXCLUDED.max_storage_mb,
  max_admin_users = EXCLUDED.max_admin_users,
  metadata = EXCLUDED.metadata,
  updated_at = now();

-- Lingkod (Servant) - Monthly
INSERT INTO product_offerings (
  code, name, description, offering_type, tier, billing_cycle,
  max_users, max_tenants, max_members, max_sms_per_month, max_emails_per_month,
  max_storage_mb, max_admin_users, is_active, is_featured, sort_order, metadata
) VALUES (
  'ph-lingkod-monthly',
  'Lingkod',
  'Extended features for growing churches. Adds care plans, discipleship pathways, member portal invitations, event registration with attendance tracking, push notifications, and advance financial management.',
  'subscription',
  'premium',
  'monthly',
  25,
  1,
  150,     -- max_members
  50,      -- max_sms_per_month
  500,     -- max_emails_per_month
  500,     -- max_storage_mb
  5,       -- max_admin_users
  true,
  false,
  1100,
  '{
    "market": "PH",
    "locale": "fil-PH",
    "tier_name_en": "Servant",
    "tier_name_fil": "Lingkod",
    "target_size": "50-150 members",
    "support_level": "email",
    "pricing": {
      "is_free": false,
      "tagline": "Pinakasikat",
      "tagline_en": "Most Popular",
      "php_monthly": 499
    }
  }'::jsonb
)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  max_members = EXCLUDED.max_members,
  max_sms_per_month = EXCLUDED.max_sms_per_month,
  max_emails_per_month = EXCLUDED.max_emails_per_month,
  max_storage_mb = EXCLUDED.max_storage_mb,
  max_admin_users = EXCLUDED.max_admin_users,
  metadata = EXCLUDED.metadata,
  updated_at = now();

-- Lingkod (Servant) - Annual (20% discount)
INSERT INTO product_offerings (
  code, name, description, offering_type, tier, billing_cycle,
  max_users, max_tenants, max_members, max_sms_per_month, max_emails_per_month,
  max_storage_mb, max_admin_users, is_active, is_featured, sort_order, metadata
) VALUES (
  'ph-lingkod-annual',
  'Lingkod',
  'Extended features for growing churches. Adds care plans, discipleship pathways, member portal invitations, event registration with attendance tracking, push notifications, and advance financial management.',
  'subscription',
  'premium',
  'annual',
  25,
  1,
  150,     -- max_members
  50,      -- max_sms_per_month
  500,     -- max_emails_per_month
  500,     -- max_storage_mb
  5,       -- max_admin_users
  true,
  true,
  1110,
  '{
    "market": "PH",
    "locale": "fil-PH",
    "tier_name_en": "Servant",
    "tier_name_fil": "Lingkod",
    "target_size": "50-150 members",
    "support_level": "email",
    "pricing": {
      "is_free": false,
      "tagline": "Pinakamahusay na Halaga",
      "tagline_en": "Best Value",
      "php_monthly": 499,
      "php_annual": 4790,
      "php_monthly_equivalent": 399.17,
      "php_original_annual": 5988,
      "savings_percent": 20,
      "savings_months": 2.4,
      "savings_amount_php": 1198
    },
    "badge": "Save 20%"
  }'::jsonb
)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  max_members = EXCLUDED.max_members,
  max_sms_per_month = EXCLUDED.max_sms_per_month,
  max_emails_per_month = EXCLUDED.max_emails_per_month,
  max_storage_mb = EXCLUDED.max_storage_mb,
  max_admin_users = EXCLUDED.max_admin_users,
  metadata = EXCLUDED.metadata,
  updated_at = now();

-- Katiwala (Steward) - Monthly
INSERT INTO product_offerings (
  code, name, description, offering_type, tier, billing_cycle,
  max_users, max_tenants, max_members, max_sms_per_month, max_emails_per_month,
  max_storage_mb, max_admin_users, is_active, is_featured, sort_order, metadata
) VALUES (
  'ph-katiwala-monthly',
  'Katiwala',
  'Full-featured solution for medium-sized churches. Includes complete financial management with budgets, SMS notifications, volunteer serving management, and advance access control administration.',
  'subscription',
  'professional',
  'monthly',
  50,
  1,
  500,     -- max_members
  200,     -- max_sms_per_month
  2000,    -- max_emails_per_month
  2048,    -- max_storage_mb (2GB)
  15,      -- max_admin_users
  true,
  false,
  1200,
  '{
    "market": "PH",
    "locale": "fil-PH",
    "tier_name_en": "Steward",
    "tier_name_fil": "Katiwala",
    "target_size": "150-500 members",
    "support_level": "priority_email",
    "pricing": {
      "is_free": false,
      "tagline": "Full Featured",
      "tagline_en": "Full Featured",
      "php_monthly": 1299
    }
  }'::jsonb
)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  max_members = EXCLUDED.max_members,
  max_sms_per_month = EXCLUDED.max_sms_per_month,
  max_emails_per_month = EXCLUDED.max_emails_per_month,
  max_storage_mb = EXCLUDED.max_storage_mb,
  max_admin_users = EXCLUDED.max_admin_users,
  metadata = EXCLUDED.metadata,
  updated_at = now();

-- Katiwala (Steward) - Annual (20% discount)
INSERT INTO product_offerings (
  code, name, description, offering_type, tier, billing_cycle,
  max_users, max_tenants, max_members, max_sms_per_month, max_emails_per_month,
  max_storage_mb, max_admin_users, is_active, is_featured, sort_order, metadata
) VALUES (
  'ph-katiwala-annual',
  'Katiwala',
  'Full-featured solution for medium-sized churches. Includes complete financial management with budgets, SMS notifications, volunteer serving management, and advance access control administration.',
  'subscription',
  'professional',
  'annual',
  50,
  1,
  500,     -- max_members
  200,     -- max_sms_per_month
  2000,    -- max_emails_per_month
  2048,    -- max_storage_mb (2GB)
  15,      -- max_admin_users
  true,
  true,
  1210,
  '{
    "market": "PH",
    "locale": "fil-PH",
    "tier_name_en": "Steward",
    "tier_name_fil": "Katiwala",
    "target_size": "150-500 members",
    "support_level": "priority_email",
    "pricing": {
      "is_free": false,
      "tagline": "Best Value",
      "tagline_en": "Best Value",
      "php_monthly": 1299,
      "php_annual": 12470,
      "php_monthly_equivalent": 1039.17,
      "php_original_annual": 15588,
      "savings_percent": 20,
      "savings_months": 2.4,
      "savings_amount_php": 3118
    },
    "badge": "Save 20%"
  }'::jsonb
)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  max_members = EXCLUDED.max_members,
  max_sms_per_month = EXCLUDED.max_sms_per_month,
  max_emails_per_month = EXCLUDED.max_emails_per_month,
  max_storage_mb = EXCLUDED.max_storage_mb,
  max_admin_users = EXCLUDED.max_admin_users,
  metadata = EXCLUDED.metadata,
  updated_at = now();

-- Tagapangasiwa (Overseer) - Monthly
INSERT INTO product_offerings (
  code, name, description, offering_type, tier, billing_cycle,
  max_users, max_tenants, max_members, max_sms_per_month, max_emails_per_month,
  max_storage_mb, max_admin_users, is_active, is_featured, sort_order, metadata
) VALUES (
  'ph-tagapangasiwa-monthly',
  'Tagapangasiwa',
  'Complete solution for large churches. Includes unlimited members, multi-role support, advanced reporting, integrations, custom branding, and dedicated support.',
  'subscription',
  'enterprise',
  'monthly',
  NULL,    -- unlimited users
  1,
  NULL,    -- unlimited members
  500,     -- max_sms_per_month
  3000,    -- max_emails_per_month
  5000,    -- max_storage_mb (5GB)
  NULL,    -- unlimited admin users
  true,
  false,
  1300,
  '{
    "market": "PH",
    "locale": "fil-PH",
    "tier_name_en": "Overseer",
    "tier_name_fil": "Tagapangasiwa",
    "target_size": "500+ members",
    "support_level": "dedicated",
    "features": ["api-access", "custom-integrations", "unlimited-users", "dedicated-support"],
    "pricing": {
      "is_free": false,
      "tagline": "Unlimited Power",
      "tagline_en": "Unlimited Power",
      "php_monthly": 2999
    }
  }'::jsonb
)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  max_members = EXCLUDED.max_members,
  max_sms_per_month = EXCLUDED.max_sms_per_month,
  max_emails_per_month = EXCLUDED.max_emails_per_month,
  max_storage_mb = EXCLUDED.max_storage_mb,
  max_admin_users = EXCLUDED.max_admin_users,
  metadata = EXCLUDED.metadata,
  updated_at = now();

-- Tagapangasiwa (Overseer) - Annual (20% discount)
INSERT INTO product_offerings (
  code, name, description, offering_type, tier, billing_cycle,
  max_users, max_tenants, max_members, max_sms_per_month, max_emails_per_month,
  max_storage_mb, max_admin_users, is_active, is_featured, sort_order, metadata
) VALUES (
  'ph-tagapangasiwa-annual',
  'Tagapangasiwa',
  'Complete solution for large churches. Includes unlimited members, multi-role support, advanced reporting, integrations, custom branding, and dedicated support.',
  'subscription',
  'enterprise',
  'annual',
  NULL,    -- unlimited users
  1,
  NULL,    -- unlimited members
  500,     -- max_sms_per_month
  3000,    -- max_emails_per_month
  5000,    -- max_storage_mb (5GB)
  NULL,    -- unlimited admin users
  true,
  true,
  1310,
  '{
    "market": "PH",
    "locale": "fil-PH",
    "tier_name_en": "Overseer",
    "tier_name_fil": "Tagapangasiwa",
    "target_size": "500+ members",
    "support_level": "dedicated",
    "features": ["api-access", "custom-integrations", "unlimited-users", "dedicated-support"],
    "pricing": {
      "is_free": false,
      "tagline": "Best Value",
      "tagline_en": "Best Value",
      "php_monthly": 2999,
      "php_annual": 28790,
      "php_monthly_equivalent": 2399.17,
      "php_original_annual": 35988,
      "savings_percent": 20,
      "savings_months": 2.4,
      "savings_amount_php": 7198
    },
    "badge": "Save 20%"
  }'::jsonb
)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  max_members = EXCLUDED.max_members,
  max_sms_per_month = EXCLUDED.max_sms_per_month,
  max_emails_per_month = EXCLUDED.max_emails_per_month,
  max_storage_mb = EXCLUDED.max_storage_mb,
  max_admin_users = EXCLUDED.max_admin_users,
  metadata = EXCLUDED.metadata,
  updated_at = now();

-- Free Trial for Philippine Market
INSERT INTO product_offerings (
  code, name, description, offering_type, tier, billing_cycle,
  max_users, max_tenants, max_members, max_sms_per_month, max_emails_per_month,
  max_storage_mb, max_admin_users, is_active, is_featured, sort_order, metadata
) VALUES (
  'ph-katiwala-trial',
  'Libreng Pagsubok',
  'Try StewardTrack Katiwala free for 14 days. Full access to all Professional features including financial management, SMS, volunteer serving, and more.',
  'trial',
  'professional',
  NULL,
  50,
  1,
  500,     -- Same as Katiwala
  200,
  2000,
  2048,
  15,
  true,
  true,
  950,
  '{
    "market": "PH",
    "locale": "fil-PH",
    "trial_days": 14,
    "no_credit_card": true,
    "converts_to": "ph-katiwala-monthly",
    "pricing": {
      "is_free": true,
      "tagline": "Walang Credit Card na Kailangan",
      "tagline_en": "No Credit Card Required"
    }
  }'::jsonb
)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  max_members = EXCLUDED.max_members,
  max_sms_per_month = EXCLUDED.max_sms_per_month,
  max_emails_per_month = EXCLUDED.max_emails_per_month,
  max_storage_mb = EXCLUDED.max_storage_mb,
  max_admin_users = EXCLUDED.max_admin_users,
  metadata = EXCLUDED.metadata,
  updated_at = now();

-- =============================================================================
-- STEP 2: Create Multi-Currency Pricing for Philippine Offerings
-- =============================================================================
-- Using direct inserts per currency to avoid CROSS JOIN issues
-- Pricing based on Philippine market research with SEA regional currencies
-- =============================================================================

-- MANANAMPALATAYA (Free) - PHP and USD
INSERT INTO product_offering_prices (offering_id, currency, price, is_active)
SELECT po.id, 'PHP', 0, true
FROM product_offerings po WHERE po.code = 'ph-mananampalataya-free'
ON CONFLICT DO NOTHING;

INSERT INTO product_offering_prices (offering_id, currency, price, is_active)
SELECT po.id, 'USD', 0, true
FROM product_offerings po WHERE po.code = 'ph-mananampalataya-free'
ON CONFLICT DO NOTHING;

-- FREE TRIAL - PHP and USD
INSERT INTO product_offering_prices (offering_id, currency, price, is_active)
SELECT po.id, 'PHP', 0, true
FROM product_offerings po WHERE po.code = 'ph-katiwala-trial'
ON CONFLICT DO NOTHING;

INSERT INTO product_offering_prices (offering_id, currency, price, is_active)
SELECT po.id, 'USD', 0, true
FROM product_offerings po WHERE po.code = 'ph-katiwala-trial'
ON CONFLICT DO NOTHING;

-- LINGKOD MONTHLY - PHP ₱499, USD $9, SEA currencies
INSERT INTO product_offering_prices (offering_id, currency, price, is_active)
SELECT po.id, 'PHP', 499, true FROM product_offerings po WHERE po.code = 'ph-lingkod-monthly'
ON CONFLICT DO NOTHING;
INSERT INTO product_offering_prices (offering_id, currency, price, is_active)
SELECT po.id, 'USD', 9, true FROM product_offerings po WHERE po.code = 'ph-lingkod-monthly'
ON CONFLICT DO NOTHING;
INSERT INTO product_offering_prices (offering_id, currency, price, is_active)
SELECT po.id, 'SGD', 12, true FROM product_offerings po WHERE po.code = 'ph-lingkod-monthly'
ON CONFLICT DO NOTHING;
INSERT INTO product_offering_prices (offering_id, currency, price, is_active)
SELECT po.id, 'MYR', 39, true FROM product_offerings po WHERE po.code = 'ph-lingkod-monthly'
ON CONFLICT DO NOTHING;
INSERT INTO product_offering_prices (offering_id, currency, price, is_active)
SELECT po.id, 'IDR', 139000, true FROM product_offerings po WHERE po.code = 'ph-lingkod-monthly'
ON CONFLICT DO NOTHING;
INSERT INTO product_offering_prices (offering_id, currency, price, is_active)
SELECT po.id, 'THB', 319, true FROM product_offerings po WHERE po.code = 'ph-lingkod-monthly'
ON CONFLICT DO NOTHING;
INSERT INTO product_offering_prices (offering_id, currency, price, is_active)
SELECT po.id, 'VND', 219000, true FROM product_offerings po WHERE po.code = 'ph-lingkod-monthly'
ON CONFLICT DO NOTHING;

-- LINGKOD ANNUAL - PHP ₱4,790 (20% discount)
INSERT INTO product_offering_prices (offering_id, currency, price, is_active)
SELECT po.id, 'PHP', 4790, true FROM product_offerings po WHERE po.code = 'ph-lingkod-annual'
ON CONFLICT DO NOTHING;
INSERT INTO product_offering_prices (offering_id, currency, price, is_active)
SELECT po.id, 'USD', 86, true FROM product_offerings po WHERE po.code = 'ph-lingkod-annual'
ON CONFLICT DO NOTHING;
INSERT INTO product_offering_prices (offering_id, currency, price, is_active)
SELECT po.id, 'SGD', 115, true FROM product_offerings po WHERE po.code = 'ph-lingkod-annual'
ON CONFLICT DO NOTHING;
INSERT INTO product_offering_prices (offering_id, currency, price, is_active)
SELECT po.id, 'MYR', 375, true FROM product_offerings po WHERE po.code = 'ph-lingkod-annual'
ON CONFLICT DO NOTHING;
INSERT INTO product_offering_prices (offering_id, currency, price, is_active)
SELECT po.id, 'IDR', 1335000, true FROM product_offerings po WHERE po.code = 'ph-lingkod-annual'
ON CONFLICT DO NOTHING;
INSERT INTO product_offering_prices (offering_id, currency, price, is_active)
SELECT po.id, 'THB', 3063, true FROM product_offerings po WHERE po.code = 'ph-lingkod-annual'
ON CONFLICT DO NOTHING;
INSERT INTO product_offering_prices (offering_id, currency, price, is_active)
SELECT po.id, 'VND', 2102000, true FROM product_offerings po WHERE po.code = 'ph-lingkod-annual'
ON CONFLICT DO NOTHING;

-- KATIWALA MONTHLY - PHP ₱1,299, USD $23
INSERT INTO product_offering_prices (offering_id, currency, price, is_active)
SELECT po.id, 'PHP', 1299, true FROM product_offerings po WHERE po.code = 'ph-katiwala-monthly'
ON CONFLICT DO NOTHING;
INSERT INTO product_offering_prices (offering_id, currency, price, is_active)
SELECT po.id, 'USD', 23, true FROM product_offerings po WHERE po.code = 'ph-katiwala-monthly'
ON CONFLICT DO NOTHING;
INSERT INTO product_offering_prices (offering_id, currency, price, is_active)
SELECT po.id, 'SGD', 31, true FROM product_offerings po WHERE po.code = 'ph-katiwala-monthly'
ON CONFLICT DO NOTHING;
INSERT INTO product_offering_prices (offering_id, currency, price, is_active)
SELECT po.id, 'MYR', 102, true FROM product_offerings po WHERE po.code = 'ph-katiwala-monthly'
ON CONFLICT DO NOTHING;
INSERT INTO product_offering_prices (offering_id, currency, price, is_active)
SELECT po.id, 'IDR', 362000, true FROM product_offerings po WHERE po.code = 'ph-katiwala-monthly'
ON CONFLICT DO NOTHING;
INSERT INTO product_offering_prices (offering_id, currency, price, is_active)
SELECT po.id, 'THB', 831, true FROM product_offerings po WHERE po.code = 'ph-katiwala-monthly'
ON CONFLICT DO NOTHING;
INSERT INTO product_offering_prices (offering_id, currency, price, is_active)
SELECT po.id, 'VND', 570000, true FROM product_offerings po WHERE po.code = 'ph-katiwala-monthly'
ON CONFLICT DO NOTHING;

-- KATIWALA ANNUAL - PHP ₱12,470 (20% discount)
INSERT INTO product_offering_prices (offering_id, currency, price, is_active)
SELECT po.id, 'PHP', 12470, true FROM product_offerings po WHERE po.code = 'ph-katiwala-annual'
ON CONFLICT DO NOTHING;
INSERT INTO product_offering_prices (offering_id, currency, price, is_active)
SELECT po.id, 'USD', 221, true FROM product_offerings po WHERE po.code = 'ph-katiwala-annual'
ON CONFLICT DO NOTHING;
INSERT INTO product_offering_prices (offering_id, currency, price, is_active)
SELECT po.id, 'SGD', 298, true FROM product_offerings po WHERE po.code = 'ph-katiwala-annual'
ON CONFLICT DO NOTHING;
INSERT INTO product_offering_prices (offering_id, currency, price, is_active)
SELECT po.id, 'MYR', 979, true FROM product_offerings po WHERE po.code = 'ph-katiwala-annual'
ON CONFLICT DO NOTHING;
INSERT INTO product_offering_prices (offering_id, currency, price, is_active)
SELECT po.id, 'IDR', 3475000, true FROM product_offerings po WHERE po.code = 'ph-katiwala-annual'
ON CONFLICT DO NOTHING;
INSERT INTO product_offering_prices (offering_id, currency, price, is_active)
SELECT po.id, 'THB', 7978, true FROM product_offerings po WHERE po.code = 'ph-katiwala-annual'
ON CONFLICT DO NOTHING;
INSERT INTO product_offering_prices (offering_id, currency, price, is_active)
SELECT po.id, 'VND', 5472000, true FROM product_offerings po WHERE po.code = 'ph-katiwala-annual'
ON CONFLICT DO NOTHING;

-- TAGAPANGASIWA MONTHLY - PHP ₱2,999, USD $53
INSERT INTO product_offering_prices (offering_id, currency, price, is_active)
SELECT po.id, 'PHP', 2999, true FROM product_offerings po WHERE po.code = 'ph-tagapangasiwa-monthly'
ON CONFLICT DO NOTHING;
INSERT INTO product_offering_prices (offering_id, currency, price, is_active)
SELECT po.id, 'USD', 53, true FROM product_offerings po WHERE po.code = 'ph-tagapangasiwa-monthly'
ON CONFLICT DO NOTHING;
INSERT INTO product_offering_prices (offering_id, currency, price, is_active)
SELECT po.id, 'SGD', 72, true FROM product_offerings po WHERE po.code = 'ph-tagapangasiwa-monthly'
ON CONFLICT DO NOTHING;
INSERT INTO product_offering_prices (offering_id, currency, price, is_active)
SELECT po.id, 'MYR', 236, true FROM product_offerings po WHERE po.code = 'ph-tagapangasiwa-monthly'
ON CONFLICT DO NOTHING;
INSERT INTO product_offering_prices (offering_id, currency, price, is_active)
SELECT po.id, 'IDR', 836000, true FROM product_offerings po WHERE po.code = 'ph-tagapangasiwa-monthly'
ON CONFLICT DO NOTHING;
INSERT INTO product_offering_prices (offering_id, currency, price, is_active)
SELECT po.id, 'THB', 1919, true FROM product_offerings po WHERE po.code = 'ph-tagapangasiwa-monthly'
ON CONFLICT DO NOTHING;
INSERT INTO product_offering_prices (offering_id, currency, price, is_active)
SELECT po.id, 'VND', 1316000, true FROM product_offerings po WHERE po.code = 'ph-tagapangasiwa-monthly'
ON CONFLICT DO NOTHING;

-- TAGAPANGASIWA ANNUAL - PHP ₱28,790 (20% discount)
INSERT INTO product_offering_prices (offering_id, currency, price, is_active)
SELECT po.id, 'PHP', 28790, true FROM product_offerings po WHERE po.code = 'ph-tagapangasiwa-annual'
ON CONFLICT DO NOTHING;
INSERT INTO product_offering_prices (offering_id, currency, price, is_active)
SELECT po.id, 'USD', 509, true FROM product_offerings po WHERE po.code = 'ph-tagapangasiwa-annual'
ON CONFLICT DO NOTHING;
INSERT INTO product_offering_prices (offering_id, currency, price, is_active)
SELECT po.id, 'SGD', 691, true FROM product_offerings po WHERE po.code = 'ph-tagapangasiwa-annual'
ON CONFLICT DO NOTHING;
INSERT INTO product_offering_prices (offering_id, currency, price, is_active)
SELECT po.id, 'MYR', 2266, true FROM product_offerings po WHERE po.code = 'ph-tagapangasiwa-annual'
ON CONFLICT DO NOTHING;
INSERT INTO product_offering_prices (offering_id, currency, price, is_active)
SELECT po.id, 'IDR', 8026000, true FROM product_offerings po WHERE po.code = 'ph-tagapangasiwa-annual'
ON CONFLICT DO NOTHING;
INSERT INTO product_offering_prices (offering_id, currency, price, is_active)
SELECT po.id, 'THB', 18422, true FROM product_offerings po WHERE po.code = 'ph-tagapangasiwa-annual'
ON CONFLICT DO NOTHING;
INSERT INTO product_offering_prices (offering_id, currency, price, is_active)
SELECT po.id, 'VND', 12634000, true FROM product_offerings po WHERE po.code = 'ph-tagapangasiwa-annual'
ON CONFLICT DO NOTHING;

-- =============================================================================
-- STEP 3: Assign Features to Philippine Offerings
-- =============================================================================
-- Feature assignment follows tier hierarchy based on tier column

-- Essential tier (Mananampalataya)
INSERT INTO product_offering_features (offering_id, feature_id, is_required)
SELECT po.id, fc.id, true
FROM product_offerings po
CROSS JOIN feature_catalog fc
WHERE po.code = 'ph-mananampalataya-free'
  AND fc.tier = 'essential'
  AND fc.deleted_at IS NULL
  AND fc.is_active = true
ON CONFLICT DO NOTHING;

-- Premium tier (Lingkod)
INSERT INTO product_offering_features (offering_id, feature_id, is_required)
SELECT po.id, fc.id, true
FROM product_offerings po
CROSS JOIN feature_catalog fc
WHERE po.code IN ('ph-lingkod-monthly', 'ph-lingkod-annual')
  AND fc.tier IN ('essential', 'premium')
  AND fc.deleted_at IS NULL
  AND fc.is_active = true
ON CONFLICT DO NOTHING;

-- Professional tier (Katiwala + Trial)
INSERT INTO product_offering_features (offering_id, feature_id, is_required)
SELECT po.id, fc.id, true
FROM product_offerings po
CROSS JOIN feature_catalog fc
WHERE po.code IN ('ph-katiwala-monthly', 'ph-katiwala-annual', 'ph-katiwala-trial')
  AND fc.tier IN ('essential', 'premium', 'professional')
  AND fc.deleted_at IS NULL
  AND fc.is_active = true
ON CONFLICT DO NOTHING;

-- Enterprise tier (Tagapangasiwa) - gets ALL features
INSERT INTO product_offering_features (offering_id, feature_id, is_required)
SELECT po.id, fc.id, true
FROM product_offerings po
CROSS JOIN feature_catalog fc
WHERE po.code IN ('ph-tagapangasiwa-monthly', 'ph-tagapangasiwa-annual')
  AND fc.tier IN ('essential', 'premium', 'professional', 'enterprise')
  AND fc.deleted_at IS NULL
  AND fc.is_active = true
ON CONFLICT DO NOTHING;

-- =============================================================================
-- STEP 4: Verify migration success
-- =============================================================================
DO $$
DECLARE
  offering_count integer;
  price_count integer;
  feature_count integer;
BEGIN
  -- Check offerings were created
  SELECT COUNT(*) INTO offering_count
  FROM product_offerings
  WHERE code LIKE 'ph-%';

  IF offering_count < 8 THEN
    RAISE EXCEPTION 'Expected at least 8 Philippine offerings but only found %', offering_count;
  END IF;

  -- Check prices were created
  SELECT COUNT(*) INTO price_count
  FROM product_offering_prices pop
  JOIN product_offerings po ON pop.offering_id = po.id
  WHERE po.code LIKE 'ph-%';

  IF price_count < 46 THEN
    RAISE EXCEPTION 'Expected at least 46 prices for Philippine offerings but only found %', price_count;
  END IF;

  -- Check features were assigned
  SELECT COUNT(*) INTO feature_count
  FROM product_offering_features pof
  JOIN product_offerings po ON pof.offering_id = po.id
  WHERE po.code LIKE 'ph-%';

  IF feature_count < 8 THEN
    RAISE EXCEPTION 'Expected features to be assigned to Philippine offerings but found %', feature_count;
  END IF;

  RAISE NOTICE 'Philippine product offerings migration successful: % offerings, % prices, % feature assignments',
    offering_count, price_count, feature_count;
END $$;

COMMIT;
