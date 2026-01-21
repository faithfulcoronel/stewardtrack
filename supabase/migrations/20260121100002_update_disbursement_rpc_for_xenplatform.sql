-- ================================================================================
-- UPDATE DISBURSEMENT RPC FUNCTIONS FOR XENPLATFORM
-- ================================================================================
--
-- This migration updates the get_payout_enabled_sources function to use
-- XenPlatform fields instead of the legacy xendit_payout_channel_id field.
--
-- Changes:
-- - Query for is_donation_destination = true
-- - Query for xendit_channel_code IS NOT NULL
-- - Return xendit_channel_code, bank_account_holder_name instead of old fields
-- ================================================================================

-- Drop the existing function first (required when changing return type)
DROP FUNCTION IF EXISTS get_payout_enabled_sources(UUID);

-- Recreate the get_payout_enabled_sources function for XenPlatform
CREATE OR REPLACE FUNCTION get_payout_enabled_sources(p_tenant_id UUID)
RETURNS TABLE (
  id UUID,
  name TEXT,
  xendit_payout_channel_id TEXT,
  xendit_payout_channel_type TEXT,
  xendit_channel_code TEXT,
  bank_account_holder_name TEXT,
  is_donation_destination BOOLEAN,
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
    fs.xendit_payout_channel_id,  -- Legacy field (kept for compatibility)
    fs.xendit_payout_channel_type,  -- Legacy field (kept for compatibility)
    fs.xendit_channel_code,  -- XenPlatform: bank channel code
    fs.bank_account_holder_name,  -- XenPlatform: account holder name
    fs.is_donation_destination,  -- XenPlatform: donation destination flag
    fs.disbursement_schedule,
    fs.disbursement_minimum_amount,
    fs.last_disbursement_at
  FROM financial_sources fs
  WHERE fs.tenant_id = p_tenant_id
    AND (
      -- XenPlatform approach: donation destination with channel code
      (fs.is_donation_destination = true AND fs.xendit_channel_code IS NOT NULL)
      OR
      -- Legacy approach: xendit_payout_channel_id set (for backward compatibility)
      fs.xendit_payout_channel_id IS NOT NULL
    )
    AND fs.is_active = true
    AND fs.deleted_at IS NULL
    AND fs.source_type IN ('bank', 'wallet');  -- Only bank accounts and wallets can receive payouts
END;
$$;

COMMENT ON FUNCTION get_payout_enabled_sources IS 'Get financial sources configured for payouts. Supports both XenPlatform (is_donation_destination + xendit_channel_code) and legacy (xendit_payout_channel_id) approaches.';
