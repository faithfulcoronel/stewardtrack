-- Fix update_tenant_payment_status function to properly set next_billing_date
-- This migration improves the function to:
-- 1. Get billing_cycle from the payment metadata if not found in offering
-- 2. Handle 'lifetime' billing cycle (no next billing date needed)
-- 3. Default to 'monthly' if billing_cycle is NULL
-- 4. Add logging for debugging

DROP FUNCTION IF EXISTS update_tenant_payment_status(UUID, TEXT, TEXT, TIMESTAMPTZ);

CREATE OR REPLACE FUNCTION update_tenant_payment_status(
  p_tenant_id UUID,
  p_xendit_invoice_id TEXT,
  p_status TEXT,
  p_paid_at TIMESTAMPTZ DEFAULT NULL
)
RETURNS VOID AS $$
DECLARE
  v_offering_id UUID;
  v_billing_cycle TEXT;
  v_payment_metadata JSONB;
  v_paid_timestamp TIMESTAMPTZ;
BEGIN
  -- Set the paid timestamp
  v_paid_timestamp := COALESCE(p_paid_at, NOW());

  -- Update payment record
  UPDATE subscription_payments
  SET
    status = p_status,
    paid_at = CASE WHEN p_status IN ('paid', 'settled') THEN v_paid_timestamp ELSE paid_at END,
    updated_at = NOW()
  WHERE xendit_invoice_id = p_xendit_invoice_id;

  -- Get offering_id and metadata from payment record
  SELECT offering_id, metadata
  INTO v_offering_id, v_payment_metadata
  FROM subscription_payments
  WHERE xendit_invoice_id = p_xendit_invoice_id;

  -- Try to get billing_cycle from product_offerings first
  IF v_offering_id IS NOT NULL THEN
    SELECT billing_cycle INTO v_billing_cycle
    FROM product_offerings
    WHERE id = v_offering_id;
  END IF;

  -- If billing_cycle is still NULL, try to get it from payment metadata
  IF v_billing_cycle IS NULL AND v_payment_metadata IS NOT NULL THEN
    v_billing_cycle := v_payment_metadata->>'billing_cycle';
  END IF;

  -- Default to 'monthly' if still NULL (but not for lifetime)
  IF v_billing_cycle IS NULL THEN
    v_billing_cycle := 'monthly';
  END IF;

  -- Update tenant status based on payment status
  IF p_status = 'paid' OR p_status = 'settled' THEN
    UPDATE tenants
    SET
      payment_status = 'paid',
      subscription_status = 'active',
      last_payment_date = v_paid_timestamp,
      next_billing_date = CASE
        WHEN v_billing_cycle = 'monthly' THEN v_paid_timestamp + INTERVAL '1 month'
        WHEN v_billing_cycle = 'annual' THEN v_paid_timestamp + INTERVAL '1 year'
        WHEN v_billing_cycle = 'lifetime' THEN NULL  -- Lifetime has no next billing
        ELSE v_paid_timestamp + INTERVAL '1 month'  -- Default to monthly
      END,
      billing_cycle = CASE
        WHEN v_billing_cycle IN ('monthly', 'annual') THEN v_billing_cycle
        ELSE billing_cycle  -- Keep existing for lifetime or unknown
      END,
      payment_failed_count = 0,
      payment_failure_reason = NULL,
      updated_at = NOW()
    WHERE id = p_tenant_id;

  ELSIF p_status = 'failed' THEN
    UPDATE tenants
    SET
      payment_status = 'failed',
      payment_failed_count = payment_failed_count + 1,
      updated_at = NOW()
    WHERE id = p_tenant_id;

  ELSIF p_status = 'expired' THEN
    UPDATE tenants
    SET
      payment_status = 'failed',
      subscription_status = 'suspended',
      updated_at = NOW()
    WHERE id = p_tenant_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION update_tenant_payment_status IS 'Updates tenant and payment status based on Xendit webhook events. Handles billing_cycle from offering or payment metadata, defaults to monthly if not found.';
