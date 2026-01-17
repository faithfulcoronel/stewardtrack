-- =============================================================================
-- Migration: Add Financial Transaction Limits to Product Offerings
-- =============================================================================
-- This migration adds financial transaction limit columns to product_offerings table
-- to support tier-based restrictions on financial transactions.
--
-- New Columns:
-- - max_transactions_per_month: Maximum financial transactions allowed per month
--
-- Values:
-- - NULL = unlimited
-- - 0 = not available/disabled
-- - > 0 = specific limit
-- =============================================================================

BEGIN;

-- =============================================================================
-- STEP 1: Add new financial transaction limit column
-- =============================================================================

-- Max Financial Transactions per month
ALTER TABLE product_offerings
ADD COLUMN IF NOT EXISTS max_transactions_per_month integer DEFAULT NULL;

COMMENT ON COLUMN product_offerings.max_transactions_per_month IS 'Maximum financial transactions allowed per month. NULL = unlimited, 0 = not available.';

-- =============================================================================
-- STEP 2: Update existing offerings with default transaction limits
-- =============================================================================
-- Based on tier structure:
-- Essential (Free): 50 transactions/month
-- Premium: 200 transactions/month
-- Professional: 1000 transactions/month
-- Enterprise: Unlimited

-- Essential tier offerings
UPDATE product_offerings
SET max_transactions_per_month = 50
WHERE tier = 'essential' AND deleted_at IS NULL;

-- Premium tier offerings
UPDATE product_offerings
SET max_transactions_per_month = 200
WHERE tier = 'premium' AND deleted_at IS NULL;

-- Professional tier offerings
UPDATE product_offerings
SET max_transactions_per_month = 1000
WHERE tier = 'professional' AND deleted_at IS NULL;

-- Enterprise tier offerings (unlimited = NULL)
UPDATE product_offerings
SET max_transactions_per_month = NULL
WHERE tier = 'enterprise' AND deleted_at IS NULL;

-- =============================================================================
-- STEP 3: Update table comment
-- =============================================================================

COMMENT ON TABLE product_offerings IS
'Product offerings with multi-currency pricing and tier limits.

Tier Limits (Philippine Market - Hybrid Pricing Model):
- Essential (Free): 50 members, 0 SMS, 100 emails, 100MB storage, 2 admin users, 50 transactions/month
- Premium: 150 members, 50 SMS/month, 500 emails/month, 500MB storage, 5 admin users, 200 transactions/month
- Professional: 500 members, 200 SMS/month, 2000 emails/month, 2GB storage, 15 admin users, 1000 transactions/month
- Enterprise: Unlimited on all quotas

NULL values indicate unlimited, 0 indicates feature not available.

See product_offering_prices table for currency-specific pricing.';

COMMIT;
