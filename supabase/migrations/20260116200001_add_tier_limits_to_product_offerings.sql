-- =============================================================================
-- Migration: Add Tier Limits to Product Offerings
-- =============================================================================
-- This migration adds quota/tier limit columns to product_offerings table
-- to support the hybrid pricing model for the Philippine market.
--
-- New Columns:
-- - max_members: Maximum church members allowed (replaces max_users conceptually)
-- - max_sms_per_month: Monthly SMS credits limit
-- - max_emails_per_month: Monthly email limit
-- - max_storage_mb: Storage limit in megabytes
-- - max_admin_users: Maximum admin users allowed
--
-- Values:
-- - NULL = unlimited
-- - 0 = not available/disabled
-- - > 0 = specific limit
-- =============================================================================

BEGIN;

-- =============================================================================
-- STEP 1: Add new tier limit columns
-- =============================================================================

-- Max Members (church members, not system users)
ALTER TABLE product_offerings
ADD COLUMN IF NOT EXISTS max_members integer DEFAULT NULL;

COMMENT ON COLUMN product_offerings.max_members IS 'Maximum church members allowed. NULL = unlimited, 0 = not available.';

-- Max SMS per month
ALTER TABLE product_offerings
ADD COLUMN IF NOT EXISTS max_sms_per_month integer DEFAULT NULL;

COMMENT ON COLUMN product_offerings.max_sms_per_month IS 'Monthly SMS credits limit. NULL = unlimited, 0 = not available.';

-- Max Emails per month
ALTER TABLE product_offerings
ADD COLUMN IF NOT EXISTS max_emails_per_month integer DEFAULT NULL;

COMMENT ON COLUMN product_offerings.max_emails_per_month IS 'Monthly email limit. NULL = unlimited, 0 = not available.';

-- Max Storage in MB
ALTER TABLE product_offerings
ADD COLUMN IF NOT EXISTS max_storage_mb integer DEFAULT NULL;

COMMENT ON COLUMN product_offerings.max_storage_mb IS 'Storage limit in megabytes. NULL = unlimited, 0 = not available.';

-- Max Admin Users
ALTER TABLE product_offerings
ADD COLUMN IF NOT EXISTS max_admin_users integer DEFAULT NULL;

COMMENT ON COLUMN product_offerings.max_admin_users IS 'Maximum admin/staff users allowed. NULL = unlimited, 0 = not available.';

-- =============================================================================
-- STEP 2: Update existing offerings with default tier limits
-- =============================================================================
-- Based on the Philippine market hybrid pricing model:
-- Essential (Free): 50 members, 0 SMS, 100 emails, 100MB, 2 admins
-- Premium: 150 members, 50 SMS, 500 emails, 500MB, 5 admins
-- Professional: 500 members, 200 SMS, 2000 emails, 2GB, 15 admins
-- Enterprise: Unlimited

-- Essential tier offerings
UPDATE product_offerings
SET
  max_members = 50,
  max_sms_per_month = 0,
  max_emails_per_month = 100,
  max_storage_mb = 100,
  max_admin_users = 2
WHERE tier = 'essential' AND deleted_at IS NULL;

-- Premium tier offerings
UPDATE product_offerings
SET
  max_members = 150,
  max_sms_per_month = 50,
  max_emails_per_month = 500,
  max_storage_mb = 500,
  max_admin_users = 5
WHERE tier = 'premium' AND deleted_at IS NULL;

-- Professional tier offerings
UPDATE product_offerings
SET
  max_members = 500,
  max_sms_per_month = 200,
  max_emails_per_month = 2000,
  max_storage_mb = 2048,
  max_admin_users = 15
WHERE tier = 'professional' AND deleted_at IS NULL;

-- Enterprise tier offerings (unlimited = NULL)
UPDATE product_offerings
SET
  max_members = NULL,
  max_sms_per_month = NULL,
  max_emails_per_month = NULL,
  max_storage_mb = NULL,
  max_admin_users = NULL
WHERE tier = 'enterprise' AND deleted_at IS NULL;

-- =============================================================================
-- STEP 3: Add indexes for tier limit queries
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_product_offerings_max_members
ON product_offerings(max_members)
WHERE deleted_at IS NULL;

-- =============================================================================
-- STEP 4: Update table comment
-- =============================================================================

COMMENT ON TABLE product_offerings IS
'Product offerings with multi-currency pricing and tier limits.

Tier Limits (Philippine Market - Hybrid Pricing Model):
- Essential (Free): 50 members, 0 SMS, 100 emails, 100MB storage, 2 admin users
- Premium: 150 members, 50 SMS/month, 500 emails/month, 500MB storage, 5 admin users
- Professional: 500 members, 200 SMS/month, 2000 emails/month, 2GB storage, 15 admin users
- Enterprise: Unlimited on all quotas

NULL values indicate unlimited, 0 indicates feature not available.

See product_offering_prices table for currency-specific pricing.';

COMMIT;
