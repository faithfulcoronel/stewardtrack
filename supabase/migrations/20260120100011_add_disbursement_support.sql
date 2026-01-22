-- ================================================================================
-- DISBURSEMENT SUPPORT MIGRATION
-- ================================================================================
--
-- This migration adds support for automated disbursements (payouts) to tenant
-- bank accounts via Xendit. The design follows these principles:
--
-- 1. StewardTrack does NOT store bank account details
-- 2. Tenants set up bank accounts in Xendit Dashboard
-- 3. StewardTrack stores only Xendit payout channel references
-- 4. Disbursements are tracked for audit and reconciliation
--
-- ================================================================================

-- Add Xendit payout channel ID to financial_sources
-- This links a financial source (type='bank') to a Xendit-managed payout destination
ALTER TABLE financial_sources
ADD COLUMN IF NOT EXISTS xendit_payout_channel_id TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS xendit_payout_channel_type TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS disbursement_schedule TEXT DEFAULT 'manual' CHECK (disbursement_schedule IN ('manual', 'daily', 'weekly', 'monthly')),
ADD COLUMN IF NOT EXISTS disbursement_minimum_amount DECIMAL(15, 2) DEFAULT 1000.00,
ADD COLUMN IF NOT EXISTS last_disbursement_at TIMESTAMPTZ DEFAULT NULL;

-- Create index for finding payout-enabled sources
CREATE INDEX IF NOT EXISTS idx_financial_sources_xendit_payout
ON financial_sources(tenant_id, xendit_payout_channel_id)
WHERE xendit_payout_channel_id IS NOT NULL AND deleted_at IS NULL;

-- Create disbursement status enum type
DO $$ BEGIN
  CREATE TYPE disbursement_status AS ENUM (
    'pending',      -- Created, awaiting processing
    'processing',   -- Sent to Xendit
    'succeeded',    -- Payout completed
    'failed',       -- Payout failed
    'cancelled'     -- Manually cancelled
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Create disbursements table
CREATE TABLE IF NOT EXISTS disbursements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  -- Financial source (payout destination)
  financial_source_id UUID NOT NULL REFERENCES financial_sources(id),

  -- Payout details
  amount DECIMAL(15, 2) NOT NULL CHECK (amount > 0),
  currency TEXT NOT NULL DEFAULT 'PHP',

  -- Xendit reference (not bank details!)
  xendit_disbursement_id TEXT DEFAULT NULL,
  xendit_payout_channel_id TEXT NOT NULL,
  xendit_payout_channel_type TEXT DEFAULT NULL,

  -- Status tracking
  status disbursement_status NOT NULL DEFAULT 'pending',
  status_message TEXT DEFAULT NULL,

  -- Processing period (donations included in this payout)
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,

  -- Breakdown
  gross_amount DECIMAL(15, 2) NOT NULL,      -- Total donation amount before fees
  xendit_fees_total DECIMAL(15, 2) NOT NULL DEFAULT 0,
  platform_fees_total DECIMAL(15, 2) NOT NULL DEFAULT 0,
  adjustments DECIMAL(15, 2) NOT NULL DEFAULT 0,  -- Refunds, chargebacks, etc.
  net_amount DECIMAL(15, 2) NOT NULL,        -- Final payout amount

  -- Donation count
  donations_count INTEGER NOT NULL DEFAULT 0,

  -- Processing timestamps
  scheduled_at TIMESTAMPTZ DEFAULT NULL,
  processed_at TIMESTAMPTZ DEFAULT NULL,
  completed_at TIMESTAMPTZ DEFAULT NULL,
  failed_at TIMESTAMPTZ DEFAULT NULL,

  -- Error tracking
  error_code TEXT DEFAULT NULL,
  error_message TEXT DEFAULT NULL,
  retry_count INTEGER NOT NULL DEFAULT 0,

  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  created_by UUID REFERENCES auth.users(id),
  triggered_by TEXT DEFAULT 'system' CHECK (triggered_by IN ('system', 'manual', 'cron'))
);

-- Create indexes for disbursements
CREATE INDEX IF NOT EXISTS idx_disbursements_tenant_id
ON disbursements(tenant_id);

CREATE INDEX IF NOT EXISTS idx_disbursements_status
ON disbursements(tenant_id, status);

CREATE INDEX IF NOT EXISTS idx_disbursements_period
ON disbursements(tenant_id, period_start, period_end);

CREATE INDEX IF NOT EXISTS idx_disbursements_xendit_id
ON disbursements(xendit_disbursement_id)
WHERE xendit_disbursement_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_disbursements_scheduled
ON disbursements(scheduled_at)
WHERE status = 'pending' AND scheduled_at IS NOT NULL;

-- Create disbursement_donations junction table
-- Links which donations are included in each disbursement
CREATE TABLE IF NOT EXISTS disbursement_donations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  disbursement_id UUID NOT NULL REFERENCES disbursements(id) ON DELETE CASCADE,
  donation_id UUID NOT NULL REFERENCES donations(id),

  -- Amount breakdown for this donation
  donation_amount DECIMAL(15, 2) NOT NULL,
  xendit_fee DECIMAL(15, 2) NOT NULL DEFAULT 0,
  platform_fee DECIMAL(15, 2) NOT NULL DEFAULT 0,
  net_amount DECIMAL(15, 2) NOT NULL,

  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  CONSTRAINT uq_disbursement_donation UNIQUE (disbursement_id, donation_id)
);

CREATE INDEX IF NOT EXISTS idx_disbursement_donations_disbursement
ON disbursement_donations(disbursement_id);

CREATE INDEX IF NOT EXISTS idx_disbursement_donations_donation
ON disbursement_donations(donation_id);

-- Add disbursement_id to donations for quick lookup
ALTER TABLE donations
ADD COLUMN IF NOT EXISTS disbursement_id UUID REFERENCES disbursements(id) DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_donations_disbursement
ON donations(disbursement_id)
WHERE disbursement_id IS NOT NULL;

-- Enable RLS on new tables
ALTER TABLE disbursements ENABLE ROW LEVEL SECURITY;
ALTER TABLE disbursement_donations ENABLE ROW LEVEL SECURITY;

-- RLS policies for disbursements (tenant isolation)
DROP POLICY IF EXISTS "tenant_disbursements_select" ON disbursements;
CREATE POLICY "tenant_disbursements_select" ON disbursements
  FOR SELECT USING (
    tenant_id IN (
      SELECT tenant_id FROM tenant_users
      WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "tenant_disbursements_insert" ON disbursements;
CREATE POLICY "tenant_disbursements_insert" ON disbursements
  FOR INSERT WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM tenant_users
      WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "tenant_disbursements_update" ON disbursements;
CREATE POLICY "tenant_disbursements_update" ON disbursements
  FOR UPDATE USING (
    tenant_id IN (
      SELECT tenant_id FROM tenant_users
      WHERE user_id = auth.uid()
    )
  );

-- RLS policies for disbursement_donations
DROP POLICY IF EXISTS "tenant_disbursement_donations_select" ON disbursement_donations;
CREATE POLICY "tenant_disbursement_donations_select" ON disbursement_donations
  FOR SELECT USING (
    disbursement_id IN (
      SELECT id FROM disbursements
      WHERE tenant_id IN (
        SELECT tenant_id FROM tenant_users
        WHERE user_id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "tenant_disbursement_donations_insert" ON disbursement_donations;
CREATE POLICY "tenant_disbursement_donations_insert" ON disbursement_donations
  FOR INSERT WITH CHECK (
    disbursement_id IN (
      SELECT id FROM disbursements
      WHERE tenant_id IN (
        SELECT tenant_id FROM tenant_users
        WHERE user_id = auth.uid()
      )
    )
  );

-- Service role policies (for cron jobs)
DROP POLICY IF EXISTS "service_disbursements_all" ON disbursements;
CREATE POLICY "service_disbursements_all" ON disbursements
  FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "service_disbursement_donations_all" ON disbursement_donations;
CREATE POLICY "service_disbursement_donations_all" ON disbursement_donations
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Function to get donations ready for disbursement
CREATE OR REPLACE FUNCTION get_donations_for_disbursement(
  p_tenant_id UUID,
  p_period_start DATE,
  p_period_end DATE
)
RETURNS TABLE (
  donation_id UUID,
  amount DECIMAL(15, 2),
  xendit_fee DECIMAL(15, 2),
  platform_fee DECIMAL(15, 2),
  net_amount DECIMAL(15, 2),
  paid_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    d.id AS donation_id,
    d.amount,
    COALESCE(d.xendit_fee, 0) AS xendit_fee,
    COALESCE(d.platform_fee, 0) AS platform_fee,
    d.amount - COALESCE(d.xendit_fee, 0) - COALESCE(d.platform_fee, 0) AS net_amount,
    d.paid_at
  FROM donations d
  WHERE d.tenant_id = p_tenant_id
    AND d.status = 'paid'
    AND d.disbursement_id IS NULL  -- Not yet disbursed
    AND d.paid_at >= p_period_start::TIMESTAMPTZ
    AND d.paid_at < (p_period_end + INTERVAL '1 day')::TIMESTAMPTZ
  ORDER BY d.paid_at ASC;
END;
$$;

-- Function to get financial sources with payout enabled
CREATE OR REPLACE FUNCTION get_payout_enabled_sources(p_tenant_id UUID)
RETURNS TABLE (
  id UUID,
  name TEXT,
  xendit_payout_channel_id TEXT,
  xendit_payout_channel_type TEXT,
  disbursement_schedule TEXT,
  disbursement_minimum_amount DECIMAL(15, 2),
  last_disbursement_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    fs.id,
    fs.name,
    fs.xendit_payout_channel_id,
    fs.xendit_payout_channel_type,
    fs.disbursement_schedule,
    fs.disbursement_minimum_amount,
    fs.last_disbursement_at
  FROM financial_sources fs
  WHERE fs.tenant_id = p_tenant_id
    AND fs.xendit_payout_channel_id IS NOT NULL
    AND fs.is_active = true
    AND fs.deleted_at IS NULL
    AND fs.source_type IN ('bank', 'wallet');  -- Only bank accounts and wallets can receive payouts
END;
$$;

-- Function to update disbursement status
CREATE OR REPLACE FUNCTION update_disbursement_status(
  p_disbursement_id UUID,
  p_status disbursement_status,
  p_xendit_disbursement_id TEXT DEFAULT NULL,
  p_error_code TEXT DEFAULT NULL,
  p_error_message TEXT DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE disbursements
  SET
    status = p_status,
    xendit_disbursement_id = COALESCE(p_xendit_disbursement_id, xendit_disbursement_id),
    error_code = p_error_code,
    error_message = p_error_message,
    processed_at = CASE WHEN p_status = 'processing' THEN NOW() ELSE processed_at END,
    completed_at = CASE WHEN p_status = 'succeeded' THEN NOW() ELSE completed_at END,
    failed_at = CASE WHEN p_status = 'failed' THEN NOW() ELSE failed_at END,
    retry_count = CASE WHEN p_status = 'failed' THEN retry_count + 1 ELSE retry_count END,
    updated_at = NOW()
  WHERE id = p_disbursement_id;

  -- Update last_disbursement_at on financial_source if succeeded
  IF p_status = 'succeeded' THEN
    UPDATE financial_sources
    SET last_disbursement_at = NOW()
    WHERE id = (SELECT financial_source_id FROM disbursements WHERE id = p_disbursement_id);
  END IF;
END;
$$;

-- Add comments for documentation
COMMENT ON TABLE disbursements IS 'Tracks payout/disbursement requests to tenant bank accounts via Xendit';
COMMENT ON TABLE disbursement_donations IS 'Junction table linking donations included in each disbursement';
COMMENT ON COLUMN financial_sources.xendit_payout_channel_id IS 'Reference to Xendit-managed bank account (actual bank details stored in Xendit)';
COMMENT ON COLUMN financial_sources.disbursement_schedule IS 'How often to auto-disburse: manual, daily, weekly, monthly';
COMMENT ON COLUMN disbursements.xendit_disbursement_id IS 'Xendit API disbursement reference ID';
