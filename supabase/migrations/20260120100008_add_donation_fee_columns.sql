-- Migration: Add fee columns to donations table
-- Description: Adds columns to track Xendit transaction fees and StewardTrack platform fees
-- The donor bears all fees so the church receives the exact declared donation amount

-- ============================================================================
-- 1. ADD FEE COLUMNS TO DONATIONS TABLE
-- ============================================================================

ALTER TABLE donations
ADD COLUMN IF NOT EXISTS xendit_fee DECIMAL(15, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS platform_fee DECIMAL(15, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_charged DECIMAL(15, 2);

-- Add comments for documentation
COMMENT ON COLUMN donations.xendit_fee IS 'Xendit transaction fee charged to donor';
COMMENT ON COLUMN donations.platform_fee IS 'StewardTrack platform fee charged to donor';
COMMENT ON COLUMN donations.total_charged IS 'Total amount charged to donor (amount + xendit_fee + platform_fee)';

-- ============================================================================
-- 2. CREATE DONATION FEE CONFIG TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS donation_fee_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

    -- Platform fee configuration
    platform_fee_type VARCHAR(20) NOT NULL DEFAULT 'percentage'
        CHECK (platform_fee_type IN ('percentage', 'fixed', 'hybrid')),
    platform_fee_percentage DECIMAL(5, 2) DEFAULT 2.50,  -- Default 2.5%
    platform_fee_fixed DECIMAL(15, 2) DEFAULT 0,
    platform_fee_min DECIMAL(15, 2) DEFAULT 0,
    platform_fee_max DECIMAL(15, 2),  -- NULL means no cap

    -- Xendit fee pass-through (reference rates, actual fees from Xendit API)
    xendit_card_fee_percentage DECIMAL(5, 2) DEFAULT 2.90,
    xendit_card_fee_fixed DECIMAL(15, 2) DEFAULT 0,
    xendit_ewallet_fee_percentage DECIMAL(5, 2) DEFAULT 2.00,
    xendit_ewallet_fee_fixed DECIMAL(15, 2) DEFAULT 0,
    xendit_bank_fee_fixed DECIMAL(15, 2) DEFAULT 25.00,
    xendit_direct_debit_fee_percentage DECIMAL(5, 2) DEFAULT 1.50,
    xendit_direct_debit_fee_fixed DECIMAL(15, 2) DEFAULT 15.00,

    -- Display settings
    show_fee_breakdown BOOLEAN DEFAULT TRUE,
    allow_donor_fee_coverage BOOLEAN DEFAULT TRUE,  -- Let donor optionally NOT cover fees

    -- Status
    is_active BOOLEAN DEFAULT TRUE,

    -- Audit
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id),

    -- Constraints
    CONSTRAINT unique_tenant_fee_config UNIQUE (tenant_id)
);

-- Indexes
CREATE INDEX idx_donation_fee_configs_tenant ON donation_fee_configs(tenant_id);

-- RLS
ALTER TABLE donation_fee_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role has full access to donation_fee_configs"
    ON donation_fee_configs FOR ALL
    USING (auth.role() = 'service_role');

CREATE POLICY "Tenants can view own fee configs"
    ON donation_fee_configs FOR SELECT
    USING (tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()));

CREATE POLICY "Tenants can manage own fee configs"
    ON donation_fee_configs FOR ALL
    USING (tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()));

-- Trigger for updated_at
CREATE TRIGGER trigger_donation_fee_configs_updated_at
    BEFORE UPDATE ON donation_fee_configs
    FOR EACH ROW
    EXECUTE FUNCTION update_donations_updated_at();

-- ============================================================================
-- 3. CALCULATE TOTAL_CHARGED FOR EXISTING DONATIONS
-- ============================================================================

-- Update existing donations to calculate total_charged
UPDATE donations
SET total_charged = amount + COALESCE(xendit_fee, 0) + COALESCE(platform_fee, 0)
WHERE total_charged IS NULL;

-- ============================================================================
-- 4. ADD COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE donation_fee_configs IS 'Fee configuration for online donations per tenant';
COMMENT ON COLUMN donation_fee_configs.platform_fee_type IS 'How platform fee is calculated: percentage, fixed, or hybrid (percentage + fixed)';
COMMENT ON COLUMN donation_fee_configs.platform_fee_percentage IS 'Platform fee as percentage (e.g., 2.50 = 2.5%)';
COMMENT ON COLUMN donation_fee_configs.platform_fee_fixed IS 'Fixed platform fee amount';
COMMENT ON COLUMN donation_fee_configs.platform_fee_min IS 'Minimum platform fee (floor)';
COMMENT ON COLUMN donation_fee_configs.platform_fee_max IS 'Maximum platform fee (cap), NULL for no cap';
COMMENT ON COLUMN donation_fee_configs.xendit_card_fee_percentage IS 'Reference Xendit card fee percentage (actual from API)';
COMMENT ON COLUMN donation_fee_configs.show_fee_breakdown IS 'Whether to show detailed fee breakdown to donors';
COMMENT ON COLUMN donation_fee_configs.allow_donor_fee_coverage IS 'Allow donors to choose not to cover fees (church absorbs)';
