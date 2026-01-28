-- =============================================================================
-- Migration: Create Tenant Usage Table for Quota Tracking
-- =============================================================================
-- Description: Creates tenant_usage table to track resource consumption against
--              product offering limits. Supports both cumulative and monthly
--              quota tracking.
-- Date: 2026-01-28
-- Author: Claude Code
-- =============================================================================

BEGIN;

-- Create tenant_usage table
CREATE TABLE IF NOT EXISTS tenant_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  -- Cumulative resource counters (not reset monthly)
  current_members INTEGER NOT NULL DEFAULT 0,
  current_admin_users INTEGER NOT NULL DEFAULT 0,
  current_storage_bytes BIGINT NOT NULL DEFAULT 0,

  -- Monthly usage counters (reset at start of billing period)
  sms_sent_this_month INTEGER NOT NULL DEFAULT 0,
  emails_sent_this_month INTEGER NOT NULL DEFAULT 0,
  transactions_this_month INTEGER NOT NULL DEFAULT 0,
  ai_credits_used_this_month INTEGER NOT NULL DEFAULT 0,

  -- Monthly tracking metadata
  month_start_date DATE NOT NULL DEFAULT date_trunc('month', CURRENT_DATE)::DATE,
  last_reset_at TIMESTAMPTZ,

  -- Audit columns
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Ensure one usage record per tenant
  CONSTRAINT tenant_usage_tenant_unique UNIQUE (tenant_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_tenant_usage_tenant_id ON tenant_usage(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_usage_month_start ON tenant_usage(month_start_date);

-- Enable Row Level Security
ALTER TABLE tenant_usage ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Tenant isolation for SELECT
CREATE POLICY "tenant_usage_select_policy" ON tenant_usage
  FOR SELECT
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM tenant_users
      WHERE user_id = auth.uid()
    )
  );

-- RLS Policy: Tenant isolation for INSERT
CREATE POLICY "tenant_usage_insert_policy" ON tenant_usage
  FOR INSERT
  TO authenticated
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM tenant_users
      WHERE user_id = auth.uid()
    )
  );

-- RLS Policy: Tenant isolation for UPDATE
CREATE POLICY "tenant_usage_update_policy" ON tenant_usage
  FOR UPDATE
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM tenant_users
      WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM tenant_users
      WHERE user_id = auth.uid()
    )
  );

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_tenant_usage_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tenant_usage_updated_at_trigger
  BEFORE UPDATE ON tenant_usage
  FOR EACH ROW
  EXECUTE FUNCTION update_tenant_usage_timestamp();

-- Add table comment
COMMENT ON TABLE tenant_usage IS 'Tracks resource consumption per tenant for quota enforcement against product offering limits';
COMMENT ON COLUMN tenant_usage.current_members IS 'Current count of active church members';
COMMENT ON COLUMN tenant_usage.current_admin_users IS 'Current count of admin/staff users with elevated roles';
COMMENT ON COLUMN tenant_usage.current_storage_bytes IS 'Total storage used in bytes';
COMMENT ON COLUMN tenant_usage.sms_sent_this_month IS 'SMS messages sent in current billing month';
COMMENT ON COLUMN tenant_usage.emails_sent_this_month IS 'Emails sent in current billing month';
COMMENT ON COLUMN tenant_usage.transactions_this_month IS 'Financial transactions created in current billing month';
COMMENT ON COLUMN tenant_usage.ai_credits_used_this_month IS 'AI credits consumed in current billing month';
COMMENT ON COLUMN tenant_usage.month_start_date IS 'Start date of current billing month for monthly counter resets';
COMMENT ON COLUMN tenant_usage.last_reset_at IS 'Timestamp of last monthly counter reset';

-- Success confirmation
DO $$
BEGIN
  RAISE NOTICE 'Successfully created tenant_usage table with RLS policies';
END $$;

COMMIT;
