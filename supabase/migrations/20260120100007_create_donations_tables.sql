-- Migration: Create donations and related tables for online giving
-- Description: Sets up the core tables for Xendit donation integration

-- ============================================================================
-- 1. CAMPAIGNS TABLE (Optional giving campaigns)
-- ============================================================================

CREATE TABLE IF NOT EXISTS campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

    -- Campaign Details
    name VARCHAR(200) NOT NULL,
    description TEXT,
    goal_amount DECIMAL(15, 2),
    fund_id UUID REFERENCES funds(id),

    -- Timeline
    start_date DATE NOT NULL,
    end_date DATE,

    -- Status
    status VARCHAR(20) NOT NULL DEFAULT 'draft'
        CHECK (status IN ('draft', 'active', 'completed', 'cancelled')),

    -- Progress (calculated/updated)
    total_raised DECIMAL(15, 2) DEFAULT 0,
    donor_count INTEGER DEFAULT 0,

    -- Audit
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    deleted_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX idx_campaigns_tenant ON campaigns(tenant_id);
CREATE INDEX idx_campaigns_status ON campaigns(status);
CREATE INDEX idx_campaigns_fund ON campaigns(fund_id);
CREATE INDEX idx_campaigns_dates ON campaigns(start_date, end_date);

-- RLS
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role has full access to campaigns"
    ON campaigns FOR ALL
    USING (auth.role() = 'service_role');

CREATE POLICY "Tenants can view own campaigns"
    ON campaigns FOR SELECT
    USING (tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()));

CREATE POLICY "Tenants can manage own campaigns"
    ON campaigns FOR ALL
    USING (tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()));

-- ============================================================================
-- 2. DONATIONS TABLE (Individual donation records)
-- ============================================================================

CREATE TABLE IF NOT EXISTS donations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

    -- Donor Information (references, not raw data)
    member_id UUID REFERENCES members(id),
    xendit_customer_id VARCHAR(100),

    -- Donor PII (encrypted using existing EncryptionService)
    donor_name_encrypted TEXT,
    donor_email_encrypted TEXT,
    donor_phone_encrypted TEXT,

    -- Donation Details
    amount DECIMAL(15, 2) NOT NULL CHECK (amount > 0),
    currency VARCHAR(3) NOT NULL DEFAULT 'PHP',
    category_id UUID REFERENCES categories(id),
    fund_id UUID REFERENCES funds(id),
    campaign_id UUID REFERENCES campaigns(id),

    -- Payment Information (Xendit references only - NO sensitive data)
    xendit_payment_request_id VARCHAR(100),
    xendit_payment_id VARCHAR(100),
    payment_method_type VARCHAR(50),
    payment_channel VARCHAR(50),
    payment_method_masked VARCHAR(20),

    -- Status
    status VARCHAR(20) NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'paid', 'failed', 'refunded', 'expired', 'cancelled')),
    paid_at TIMESTAMPTZ,

    -- Refund tracking
    refunded_at TIMESTAMPTZ,
    refund_reason TEXT,

    -- Recurring Donation Setup
    is_recurring BOOLEAN DEFAULT FALSE,
    recurring_frequency VARCHAR(20)
        CHECK (recurring_frequency IS NULL OR recurring_frequency IN ('weekly', 'monthly', 'quarterly', 'annually')),
    recurring_payment_token_id VARCHAR(100),
    recurring_next_date DATE,
    recurring_end_date DATE,
    recurring_parent_id UUID REFERENCES donations(id),

    -- Financial Transaction Link (for accounting integration)
    financial_transaction_header_id UUID REFERENCES financial_transaction_headers(id),

    -- Metadata
    notes TEXT,
    anonymous BOOLEAN DEFAULT FALSE,
    source VARCHAR(50) DEFAULT 'online'
        CHECK (source IN ('online', 'kiosk', 'import', 'manual', 'recurring')),

    -- Audit
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    deleted_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX idx_donations_tenant ON donations(tenant_id);
CREATE INDEX idx_donations_member ON donations(member_id);
CREATE INDEX idx_donations_category ON donations(category_id);
CREATE INDEX idx_donations_fund ON donations(fund_id);
CREATE INDEX idx_donations_campaign ON donations(campaign_id);
CREATE INDEX idx_donations_status ON donations(status);
CREATE INDEX idx_donations_paid_at ON donations(paid_at);
CREATE INDEX idx_donations_xendit_payment ON donations(xendit_payment_id);
CREATE INDEX idx_donations_xendit_customer ON donations(xendit_customer_id);
CREATE INDEX idx_donations_financial_header ON donations(financial_transaction_header_id);
CREATE INDEX idx_donations_recurring_parent ON donations(recurring_parent_id);
CREATE INDEX idx_donations_recurring_next ON donations(recurring_next_date) WHERE is_recurring = TRUE;

-- RLS
ALTER TABLE donations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role has full access to donations"
    ON donations FOR ALL
    USING (auth.role() = 'service_role');

CREATE POLICY "Tenants can view own donations"
    ON donations FOR SELECT
    USING (tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()));

CREATE POLICY "Tenants can insert own donations"
    ON donations FOR INSERT
    WITH CHECK (tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()));

CREATE POLICY "Tenants can update own donations"
    ON donations FOR UPDATE
    USING (tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()));

-- ============================================================================
-- 3. DONOR_PAYMENT_METHODS TABLE (Saved payment method tokens)
-- ============================================================================

CREATE TABLE IF NOT EXISTS donor_payment_methods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    member_id UUID REFERENCES members(id),
    xendit_customer_id VARCHAR(100) NOT NULL,

    -- Xendit Token References (NO actual payment data stored here)
    xendit_payment_token_id VARCHAR(100),
    xendit_linked_account_token_id VARCHAR(100),
    xendit_payment_method_id VARCHAR(100),

    -- Display Information (masked, for UI only)
    payment_type VARCHAR(50) NOT NULL
        CHECK (payment_type IN ('card', 'ewallet', 'bank_transfer', 'direct_debit')),
    channel_code VARCHAR(50),
    display_name VARCHAR(100),
    masked_account VARCHAR(20),

    -- Preferences
    is_default BOOLEAN DEFAULT FALSE,
    nickname VARCHAR(50),

    -- Status
    status VARCHAR(20) DEFAULT 'active'
        CHECK (status IN ('active', 'expired', 'revoked')),
    expires_at TIMESTAMPTZ,

    -- Audit
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,

    -- Constraints
    CONSTRAINT unique_payment_token UNIQUE (xendit_payment_token_id),
    CONSTRAINT unique_linked_account_token UNIQUE (xendit_linked_account_token_id)
);

-- Indexes
CREATE INDEX idx_donor_payment_methods_tenant ON donor_payment_methods(tenant_id);
CREATE INDEX idx_donor_payment_methods_member ON donor_payment_methods(member_id);
CREATE INDEX idx_donor_payment_methods_customer ON donor_payment_methods(xendit_customer_id);
CREATE INDEX idx_donor_payment_methods_status ON donor_payment_methods(status);

-- RLS
ALTER TABLE donor_payment_methods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role has full access to donor_payment_methods"
    ON donor_payment_methods FOR ALL
    USING (auth.role() = 'service_role');

CREATE POLICY "Tenants can view own payment methods"
    ON donor_payment_methods FOR SELECT
    USING (tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()));

CREATE POLICY "Tenants can manage own payment methods"
    ON donor_payment_methods FOR ALL
    USING (tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()));

-- ============================================================================
-- 4. DONATION_WEBHOOKS TABLE (Webhook event audit log)
-- ============================================================================

CREATE TABLE IF NOT EXISTS donation_webhooks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id),

    -- Webhook Details
    xendit_webhook_id VARCHAR(100) NOT NULL,
    event_type VARCHAR(100) NOT NULL,

    -- Related Records
    donation_id UUID REFERENCES donations(id),
    xendit_payment_id VARCHAR(100),

    -- Payload (sanitized - no sensitive data)
    payload_sanitized JSONB,

    -- Processing
    status VARCHAR(20) DEFAULT 'received'
        CHECK (status IN ('received', 'processing', 'processed', 'failed', 'skipped')),
    processed_at TIMESTAMPTZ,
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,

    -- Audit
    received_at TIMESTAMPTZ DEFAULT NOW(),

    -- Constraints
    CONSTRAINT unique_webhook_id UNIQUE (xendit_webhook_id)
);

-- Indexes
CREATE INDEX idx_donation_webhooks_tenant ON donation_webhooks(tenant_id);
CREATE INDEX idx_donation_webhooks_payment ON donation_webhooks(xendit_payment_id);
CREATE INDEX idx_donation_webhooks_donation ON donation_webhooks(donation_id);
CREATE INDEX idx_donation_webhooks_status ON donation_webhooks(status);
CREATE INDEX idx_donation_webhooks_event_type ON donation_webhooks(event_type);
CREATE INDEX idx_donation_webhooks_received ON donation_webhooks(received_at);

-- RLS
ALTER TABLE donation_webhooks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role has full access to donation_webhooks"
    ON donation_webhooks FOR ALL
    USING (auth.role() = 'service_role');

CREATE POLICY "Tenants can view own webhooks"
    ON donation_webhooks FOR SELECT
    USING (tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()));

-- ============================================================================
-- 5. TRIGGER FUNCTIONS
-- ============================================================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_donations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_donations_updated_at
    BEFORE UPDATE ON donations
    FOR EACH ROW
    EXECUTE FUNCTION update_donations_updated_at();

CREATE TRIGGER trigger_campaigns_updated_at
    BEFORE UPDATE ON campaigns
    FOR EACH ROW
    EXECUTE FUNCTION update_donations_updated_at();

CREATE TRIGGER trigger_donor_payment_methods_updated_at
    BEFORE UPDATE ON donor_payment_methods
    FOR EACH ROW
    EXECUTE FUNCTION update_donations_updated_at();

-- Update campaign totals when donation is paid
CREATE OR REPLACE FUNCTION update_campaign_totals()
RETURNS TRIGGER AS $$
BEGIN
    -- Only process if campaign_id is set and status changed to 'paid'
    IF NEW.campaign_id IS NOT NULL AND NEW.status = 'paid' AND (OLD.status IS NULL OR OLD.status != 'paid') THEN
        UPDATE campaigns
        SET
            total_raised = COALESCE(total_raised, 0) + NEW.amount,
            donor_count = COALESCE(donor_count, 0) + 1,
            updated_at = NOW()
        WHERE id = NEW.campaign_id;
    END IF;

    -- Handle refunds - decrease totals
    IF NEW.campaign_id IS NOT NULL AND NEW.status = 'refunded' AND OLD.status = 'paid' THEN
        UPDATE campaigns
        SET
            total_raised = GREATEST(0, COALESCE(total_raised, 0) - NEW.amount),
            donor_count = GREATEST(0, COALESCE(donor_count, 0) - 1),
            updated_at = NOW()
        WHERE id = NEW.campaign_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_campaign_totals
    AFTER INSERT OR UPDATE ON donations
    FOR EACH ROW
    EXECUTE FUNCTION update_campaign_totals();

-- ============================================================================
-- 6. COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE campaigns IS 'Giving campaigns with goals and tracking';
COMMENT ON TABLE donations IS 'Individual donation records from online giving';
COMMENT ON TABLE donor_payment_methods IS 'Saved payment method tokens (Xendit references only, no sensitive data)';
COMMENT ON TABLE donation_webhooks IS 'Audit log for Xendit webhook events';

COMMENT ON COLUMN donations.xendit_customer_id IS 'Xendit customer ID - actual customer data stored in Xendit';
COMMENT ON COLUMN donations.xendit_payment_id IS 'Xendit payment ID - for reference and refunds';
COMMENT ON COLUMN donations.payment_method_masked IS 'Masked display value like ****1234 - for UI only';
COMMENT ON COLUMN donations.donor_name_encrypted IS 'Encrypted using AES-256-GCM via EncryptionService';
COMMENT ON COLUMN donations.donor_email_encrypted IS 'Encrypted using AES-256-GCM via EncryptionService';
COMMENT ON COLUMN donations.financial_transaction_header_id IS 'Links to financial transaction for accounting';

COMMENT ON COLUMN donor_payment_methods.xendit_payment_token_id IS 'Xendit token - actual payment data stored in Xendit';
COMMENT ON COLUMN donor_payment_methods.masked_account IS 'Masked display value - for UI only, no sensitive data';
