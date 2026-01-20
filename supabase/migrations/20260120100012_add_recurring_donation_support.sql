-- Migration: Add recurring donation support enhancements
-- Description: Adds recurring status tracking, charge history, and failure handling
-- Date: 2026-01-20

-- ============================================================================
-- 1. ADD RECURRING STATUS TO DONATIONS TABLE
-- ============================================================================

-- Add recurring_status column for tracking subscription state
ALTER TABLE donations
ADD COLUMN IF NOT EXISTS recurring_status VARCHAR(20) DEFAULT 'active'
    CHECK (recurring_status IS NULL OR recurring_status IN ('active', 'paused', 'cancelled', 'completed'));

-- Add recurring_paused_at and recurring_cancelled_at for audit
ALTER TABLE donations
ADD COLUMN IF NOT EXISTS recurring_paused_at TIMESTAMPTZ;

ALTER TABLE donations
ADD COLUMN IF NOT EXISTS recurring_cancelled_at TIMESTAMPTZ;

-- Add recurring_failure_count for retry tracking
ALTER TABLE donations
ADD COLUMN IF NOT EXISTS recurring_failure_count INTEGER DEFAULT 0;

-- Add recurring_last_charge_at for tracking
ALTER TABLE donations
ADD COLUMN IF NOT EXISTS recurring_last_charge_at TIMESTAMPTZ;

-- Add index for recurring status queries
CREATE INDEX IF NOT EXISTS idx_donations_recurring_status
ON donations(tenant_id, is_recurring, recurring_status, recurring_next_date)
WHERE is_recurring = TRUE;

-- ============================================================================
-- 2. CREATE RECURRING_CHARGE_HISTORY TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS recurring_charge_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

    -- Parent recurring donation reference
    recurring_donation_id UUID NOT NULL REFERENCES donations(id) ON DELETE CASCADE,

    -- Child donation created (if successful)
    child_donation_id UUID REFERENCES donations(id),

    -- Charge details
    attempt_number INTEGER NOT NULL DEFAULT 1,
    scheduled_date DATE NOT NULL,
    attempted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Amount charged (may differ from original if fees change)
    amount DECIMAL(15, 2) NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'PHP',

    -- Status
    status VARCHAR(20) NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'processing', 'succeeded', 'failed', 'skipped')),

    -- Xendit references
    xendit_payment_request_id VARCHAR(100),
    xendit_payment_id VARCHAR(100),

    -- Error tracking
    error_code VARCHAR(100),
    error_message TEXT,

    -- Retry scheduling
    retry_scheduled_at TIMESTAMPTZ,
    max_retries INTEGER DEFAULT 3,

    -- Audit
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_recurring_charge_history_tenant
ON recurring_charge_history(tenant_id);

CREATE INDEX idx_recurring_charge_history_recurring_donation
ON recurring_charge_history(recurring_donation_id);

CREATE INDEX idx_recurring_charge_history_child_donation
ON recurring_charge_history(child_donation_id);

CREATE INDEX idx_recurring_charge_history_status
ON recurring_charge_history(status);

CREATE INDEX idx_recurring_charge_history_scheduled
ON recurring_charge_history(scheduled_date, status);

CREATE INDEX idx_recurring_charge_history_retry
ON recurring_charge_history(retry_scheduled_at)
WHERE status = 'failed' AND retry_scheduled_at IS NOT NULL;

-- RLS
ALTER TABLE recurring_charge_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role has full access to recurring_charge_history"
    ON recurring_charge_history FOR ALL
    USING (auth.role() = 'service_role');

CREATE POLICY "Tenants can view own charge history"
    ON recurring_charge_history FOR SELECT
    USING (tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()));

-- ============================================================================
-- 3. CREATE TRIGGER FOR UPDATED_AT
-- ============================================================================

CREATE TRIGGER trigger_recurring_charge_history_updated_at
    BEFORE UPDATE ON recurring_charge_history
    FOR EACH ROW
    EXECUTE FUNCTION update_donations_updated_at();

-- ============================================================================
-- 4. CREATE FUNCTION TO GET DUE RECURRING DONATIONS
-- ============================================================================

CREATE OR REPLACE FUNCTION get_recurring_donations_due(
    p_tenant_id UUID,
    p_process_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
    id UUID,
    tenant_id UUID,
    member_id UUID,
    amount DECIMAL(15, 2),
    currency VARCHAR(3),
    category_id UUID,
    fund_id UUID,
    campaign_id UUID,
    recurring_frequency VARCHAR(20),
    recurring_payment_token_id VARCHAR(100),
    recurring_next_date DATE,
    recurring_end_date DATE,
    recurring_failure_count INTEGER,
    xendit_customer_id VARCHAR(100),
    donor_name_encrypted TEXT,
    donor_email_encrypted TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        d.id,
        d.tenant_id,
        d.member_id,
        d.amount,
        d.currency,
        d.category_id,
        d.fund_id,
        d.campaign_id,
        d.recurring_frequency,
        d.recurring_payment_token_id,
        d.recurring_next_date,
        d.recurring_end_date,
        d.recurring_failure_count,
        d.xendit_customer_id,
        d.donor_name_encrypted,
        d.donor_email_encrypted
    FROM donations d
    WHERE d.tenant_id = p_tenant_id
        AND d.is_recurring = TRUE
        AND d.recurring_status = 'active'
        AND d.status = 'paid'  -- Only charge from successfully paid parent donations
        AND d.recurring_next_date <= p_process_date
        AND d.recurring_payment_token_id IS NOT NULL
        AND (d.recurring_end_date IS NULL OR d.recurring_end_date >= p_process_date)
        AND d.deleted_at IS NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 5. CREATE FUNCTION TO CALCULATE NEXT CHARGE DATE
-- ============================================================================

CREATE OR REPLACE FUNCTION calculate_next_recurring_date(
    p_current_date DATE,
    p_frequency VARCHAR(20)
)
RETURNS DATE AS $$
BEGIN
    CASE p_frequency
        WHEN 'weekly' THEN
            RETURN p_current_date + INTERVAL '7 days';
        WHEN 'monthly' THEN
            RETURN p_current_date + INTERVAL '1 month';
        WHEN 'quarterly' THEN
            RETURN p_current_date + INTERVAL '3 months';
        WHEN 'annually' THEN
            RETURN p_current_date + INTERVAL '1 year';
        ELSE
            RETURN p_current_date + INTERVAL '1 month'; -- Default to monthly
    END CASE;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================================================
-- 6. CREATE FUNCTION TO UPDATE RECURRING DONATION AFTER CHARGE
-- ============================================================================

CREATE OR REPLACE FUNCTION update_recurring_donation_after_charge(
    p_donation_id UUID,
    p_success BOOLEAN,
    p_child_donation_id UUID DEFAULT NULL
)
RETURNS VOID AS $$
DECLARE
    v_frequency VARCHAR(20);
    v_current_next_date DATE;
    v_new_next_date DATE;
    v_failure_count INTEGER;
BEGIN
    -- Get current values
    SELECT recurring_frequency, recurring_next_date, COALESCE(recurring_failure_count, 0)
    INTO v_frequency, v_current_next_date, v_failure_count
    FROM donations
    WHERE id = p_donation_id;

    IF p_success THEN
        -- Calculate next charge date
        v_new_next_date := calculate_next_recurring_date(v_current_next_date, v_frequency);

        -- Update donation with new next date and reset failure count
        UPDATE donations
        SET
            recurring_next_date = v_new_next_date,
            recurring_failure_count = 0,
            recurring_last_charge_at = NOW(),
            updated_at = NOW()
        WHERE id = p_donation_id;
    ELSE
        -- Increment failure count
        UPDATE donations
        SET
            recurring_failure_count = v_failure_count + 1,
            updated_at = NOW()
        WHERE id = p_donation_id;

        -- If too many failures (3+), pause the recurring donation
        IF v_failure_count + 1 >= 3 THEN
            UPDATE donations
            SET
                recurring_status = 'paused',
                recurring_paused_at = NOW()
            WHERE id = p_donation_id;
        END IF;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 7. COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE recurring_charge_history IS 'Tracks all charge attempts for recurring donations';
COMMENT ON COLUMN donations.recurring_status IS 'Status of recurring subscription: active, paused, cancelled, completed';
COMMENT ON COLUMN donations.recurring_failure_count IS 'Number of consecutive failed charge attempts';
COMMENT ON COLUMN donations.recurring_last_charge_at IS 'When the last successful charge was processed';
COMMENT ON FUNCTION get_recurring_donations_due IS 'Returns all recurring donations due for charging on given date';
COMMENT ON FUNCTION calculate_next_recurring_date IS 'Calculates the next charge date based on frequency';
COMMENT ON FUNCTION update_recurring_donation_after_charge IS 'Updates recurring donation state after a charge attempt';

-- ============================================================================
-- 8. SUCCESS CONFIRMATION
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE 'Migration completed: Recurring donation support added successfully';
END $$;
