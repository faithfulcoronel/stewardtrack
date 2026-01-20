-- ================================================================================
-- XENPLATFORM INTEGRATION FOR MULTI-TENANT DONATION DISBURSEMENTS
-- ================================================================================
--
-- This migration adds support for Xendit XenPlatform "Owned Sub-accounts".
-- Each church tenant gets a dedicated Xendit sub-account for:
-- - Isolated donation balances
-- - Direct bank payouts from sub-account
-- - Platform fee collection
--
-- Key Changes:
-- 1. Add xendit_sub_account_id to tenants table
-- 2. Add payout configuration fields to financial_sources
-- 3. Ensure only one donation destination per tenant
-- ================================================================================

-- ============================================================================
-- 1. ADD XENDIT SUB-ACCOUNT FIELDS TO TENANTS TABLE
-- ============================================================================

ALTER TABLE tenants
ADD COLUMN IF NOT EXISTS xendit_sub_account_id text,
ADD COLUMN IF NOT EXISTS xendit_sub_account_status text DEFAULT 'pending';

COMMENT ON COLUMN tenants.xendit_sub_account_id IS 'Xendit XenPlatform Owned Sub-account ID for donation collection and payouts';
COMMENT ON COLUMN tenants.xendit_sub_account_status IS 'Status of the Xendit sub-account: pending, active, suspended';

-- Index for efficient lookups by sub-account ID
CREATE INDEX IF NOT EXISTS idx_tenants_xendit_sub_account
ON tenants(xendit_sub_account_id) WHERE xendit_sub_account_id IS NOT NULL;

-- ============================================================================
-- 2. ADD PAYOUT CONFIGURATION FIELDS TO FINANCIAL_SOURCES TABLE
-- ============================================================================

-- Flag to mark which financial source is the donation payout destination
ALTER TABLE financial_sources
ADD COLUMN IF NOT EXISTS is_donation_destination boolean DEFAULT false;

-- Bank account details for payouts (managed by tenant, used for Xendit API)
ALTER TABLE financial_sources
ADD COLUMN IF NOT EXISTS bank_account_holder_name text,
ADD COLUMN IF NOT EXISTS bank_account_number_encrypted text,  -- Encrypted using tenant encryption key
ADD COLUMN IF NOT EXISTS xendit_channel_code text;  -- e.g., PH_BDO, PH_BPI, PH_MBTC

COMMENT ON COLUMN financial_sources.is_donation_destination IS 'Flag indicating this source receives donation disbursements/payouts';
COMMENT ON COLUMN financial_sources.bank_account_holder_name IS 'Bank account holder name for payout (matches bank records)';
COMMENT ON COLUMN financial_sources.bank_account_number_encrypted IS 'Bank account number encrypted using tenant encryption key';
COMMENT ON COLUMN financial_sources.xendit_channel_code IS 'Xendit payout channel code (e.g., PH_BDO, PH_BPI, PH_MBTC)';

-- ============================================================================
-- 3. ENSURE ONLY ONE DONATION DESTINATION PER TENANT
-- ============================================================================

-- This constraint ensures that a tenant can only have one financial source
-- marked as the donation destination (where payouts are sent)
CREATE UNIQUE INDEX IF NOT EXISTS idx_financial_sources_donation_destination
ON financial_sources (tenant_id)
WHERE is_donation_destination = true AND deleted_at IS NULL;

-- ============================================================================
-- 4. UPDATE RLS POLICIES (if needed)
-- ============================================================================

-- The existing RLS policies on tenants and financial_sources should already
-- handle tenant isolation. No additional policies needed since:
-- - tenants table: Users can only see their own tenant
-- - financial_sources: Already filtered by tenant_id
