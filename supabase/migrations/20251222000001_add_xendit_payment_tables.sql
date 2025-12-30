-- Add Xendit payment integration tables and fields
-- Migration: 20251222000001_add_xendit_payment_tables.sql

-- Add Xendit fields to tenants table
ALTER TABLE tenants
ADD COLUMN IF NOT EXISTS xendit_customer_id TEXT,
ADD COLUMN IF NOT EXISTS xendit_subscription_id TEXT,
ADD COLUMN IF NOT EXISTS xendit_payment_method_id TEXT,
ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS last_payment_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS next_billing_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS payment_failed_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS payment_failure_reason TEXT;

ALTER TABLE tenants
DROP CONSTRAINT IF EXISTS check_payment_status;

-- Add check constraint for payment_status
ALTER TABLE tenants
ADD CONSTRAINT check_payment_status
CHECK (payment_status IN ('pending', 'paid', 'failed', 'processing', 'refunded', 'cancelled'));

-- Create subscription_payments table
CREATE TABLE IF NOT EXISTS subscription_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  offering_id UUID REFERENCES product_offerings(id),

  -- Xendit payment details
  xendit_invoice_id TEXT UNIQUE,
  xendit_payment_id TEXT,
  external_id TEXT UNIQUE NOT NULL,

  -- Payment information
  amount DECIMAL(10, 2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'PHP',
  status TEXT NOT NULL DEFAULT 'pending',
  payment_method TEXT,
  payment_channel TEXT,

  -- Invoice details
  invoice_url TEXT,
  invoice_pdf_url TEXT,
  payer_email TEXT,

  -- Dates
  paid_at TIMESTAMPTZ,
  expired_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,

  -- Error handling
  failure_code TEXT,
  failure_reason TEXT,

  -- Metadata
  description TEXT,
  metadata JSONB,

  -- Audit
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index for faster lookups
DROP INDEX IF EXISTS idx_subscription_payments_tenant_id;
DROP INDEX IF EXISTS idx_subscription_payments_status;
DROP INDEX IF EXISTS idx_subscription_payments_xendit_invoice_id;
DROP INDEX IF EXISTS idx_subscription_payments_external_id;

CREATE INDEX idx_subscription_payments_tenant_id ON subscription_payments(tenant_id);
CREATE INDEX idx_subscription_payments_status ON subscription_payments(status);
CREATE INDEX idx_subscription_payments_xendit_invoice_id ON subscription_payments(xendit_invoice_id);
CREATE INDEX idx_subscription_payments_external_id ON subscription_payments(external_id);

-- Add check constraint for payment status
ALTER TABLE subscription_payments
DROP CONSTRAINT IF EXISTS check_subscription_payment_status;

ALTER TABLE subscription_payments
ADD CONSTRAINT check_subscription_payment_status
CHECK (status IN ('pending', 'paid', 'settled', 'expired', 'failed', 'refunded'));

-- Create payment_methods table
CREATE TABLE IF NOT EXISTS payment_methods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  -- Xendit payment method details
  xendit_payment_method_id TEXT UNIQUE,
  payment_method_type TEXT NOT NULL,

  -- Card details (for card payments)
  card_last_four TEXT,
  card_brand TEXT,
  card_expiry_month INTEGER,
  card_expiry_year INTEGER,

  -- E-wallet details (for e-wallet payments)
  ewallet_type TEXT,
  ewallet_account TEXT,

  -- Bank details (for direct debit)
  bank_code TEXT,
  bank_account_number_masked TEXT,

  -- Status
  is_default BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  status TEXT DEFAULT 'active',

  -- Metadata
  metadata JSONB,

  -- Audit
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index for faster lookups
DROP INDEX IF EXISTS idx_payment_methods_tenant_id;
DROP INDEX IF EXISTS idx_payment_methods_is_default;

CREATE INDEX idx_payment_methods_tenant_id ON payment_methods(tenant_id);
CREATE INDEX idx_payment_methods_is_default ON payment_methods(tenant_id, is_default) WHERE is_default = TRUE;

-- Add check constraint for payment method type
ALTER TABLE payment_methods
DROP CONSTRAINT IF EXISTS check_payment_method_type;

ALTER TABLE payment_methods
ADD CONSTRAINT check_payment_method_type
CHECK (payment_method_type IN ('card', 'ewallet', 'virtual_account', 'retail_outlet', 'qr_code', 'direct_debit'));

-- Create billing_events table (for webhook event logging)
CREATE TABLE IF NOT EXISTS billing_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Event details
  event_id TEXT UNIQUE NOT NULL,
  event_type TEXT NOT NULL,

  -- Related entities
  tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL,
  payment_id UUID REFERENCES subscription_payments(id) ON DELETE SET NULL,

  -- Xendit webhook data
  xendit_event_id TEXT,
  xendit_api_version TEXT,

  -- Event payload
  payload JSONB NOT NULL,

  -- Processing status
  processed BOOLEAN DEFAULT FALSE,
  processed_at TIMESTAMPTZ,
  processing_error TEXT,
  retry_count INTEGER DEFAULT 0,

  -- Audit
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for billing_events
DROP INDEX IF EXISTS idx_billing_events_event_type;
DROP INDEX IF EXISTS idx_billing_events_tenant_id;
DROP INDEX IF EXISTS idx_billing_events_processed;
DROP INDEX IF EXISTS idx_billing_events_xendit_event_id;

CREATE INDEX idx_billing_events_event_type ON billing_events(event_type);
CREATE INDEX idx_billing_events_tenant_id ON billing_events(tenant_id);
CREATE INDEX idx_billing_events_processed ON billing_events(processed);
CREATE INDEX idx_billing_events_xendit_event_id ON billing_events(xendit_event_id);

-- Create trigger for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_subscription_payments_updated_at
ON subscription_payments;

CREATE TRIGGER update_subscription_payments_updated_at
BEFORE UPDATE ON subscription_payments
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_payment_methods_updated_at
ON payment_methods;
CREATE TRIGGER update_payment_methods_updated_at
BEFORE UPDATE ON payment_methods
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_billing_events_updated_at
ON billing_events;

CREATE TRIGGER update_billing_events_updated_at
BEFORE UPDATE ON billing_events
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Add RLS policies for subscription_payments
ALTER TABLE subscription_payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their tenant's payments" ON subscription_payments;
CREATE POLICY "Users can view their tenant's payments"
ON subscription_payments
FOR SELECT
USING (
  tenant_id IN (
    SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Service role can manage all payments" ON subscription_payments;
CREATE POLICY "Service role can manage all payments"
ON subscription_payments
FOR ALL
USING (auth.jwt() ->> 'role' = 'service_role')
WITH CHECK (auth.jwt() ->> 'role' = 'service_role');

-- Add RLS policies for payment_methods
ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their tenant's payment methods" ON payment_methods;
CREATE POLICY "Users can view their tenant's payment methods"
ON payment_methods
FOR SELECT
USING (
  tenant_id IN (
    SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Tenant admins can manage payment methods" ON payment_methods;
CREATE POLICY "Tenant admins can manage payment methods"
ON payment_methods
FOR ALL
USING (
  tenant_id IN (
    SELECT tu.tenant_id
    FROM tenant_users tu
    JOIN user_roles ur ON tu.user_id = ur.user_id
    JOIN roles r ON ur.role_id = r.id
    WHERE tu.user_id = auth.uid()
    AND r.name = 'tenant_admin'
  )
)
WITH CHECK (
  tenant_id IN (
    SELECT tu.tenant_id
    FROM tenant_users tu
    JOIN user_roles ur ON tu.user_id = ur.user_id
    JOIN roles r ON ur.role_id = r.id
    WHERE tu.user_id = auth.uid()
    AND r.name = 'tenant_admin'
  )
);

-- Add RLS policies for billing_events
ALTER TABLE billing_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role can manage all billing events" ON billing_events;
CREATE POLICY "Service role can manage all billing events"
ON billing_events
FOR ALL
USING (auth.jwt() ->> 'role' = 'service_role')
WITH CHECK (auth.jwt() ->> 'role' = 'service_role');

DROP POLICY IF EXISTS "Tenant admins can view their billing events" ON billing_events;
CREATE POLICY "Tenant admins can view their billing events"
ON billing_events
FOR SELECT
USING (
  tenant_id IN (
    SELECT tu.tenant_id
    FROM tenant_users tu
    JOIN user_roles ur ON tu.user_id = ur.user_id
    JOIN roles r ON ur.role_id = r.id
    WHERE tu.user_id = auth.uid()
    AND r.name = 'tenant_admin'
  )
);

-- Create helper function to get tenant payment summary
DROP FUNCTION IF EXISTS get_tenant_payment_summary(UUID);
CREATE OR REPLACE FUNCTION get_tenant_payment_summary(p_tenant_id UUID)
RETURNS TABLE (
  total_paid DECIMAL,
  total_pending DECIMAL,
  total_failed DECIMAL,
  payment_count INTEGER,
  last_payment_date TIMESTAMPTZ,
  next_billing_date TIMESTAMPTZ,
  subscription_status TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(SUM(CASE WHEN sp.status = 'paid' THEN sp.amount ELSE 0 END), 0) as total_paid,
    COALESCE(SUM(CASE WHEN sp.status = 'pending' THEN sp.amount ELSE 0 END), 0) as total_pending,
    COALESCE(SUM(CASE WHEN sp.status = 'failed' THEN sp.amount ELSE 0 END), 0) as total_failed,
    COUNT(*)::INTEGER as payment_count,
    t.last_payment_date,
    t.next_billing_date,
    t.subscription_status
  FROM tenants t
  LEFT JOIN subscription_payments sp ON t.id = sp.tenant_id
  WHERE t.id = p_tenant_id
  GROUP BY t.id, t.last_payment_date, t.next_billing_date, t.subscription_status;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to update tenant payment status
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
BEGIN
  -- Update payment record
  UPDATE subscription_payments
  SET
    status = p_status,
    paid_at = COALESCE(p_paid_at, paid_at),
    updated_at = NOW()
  WHERE xendit_invoice_id = p_xendit_invoice_id;

  -- Get offering details
  SELECT offering_id INTO v_offering_id
  FROM subscription_payments
  WHERE xendit_invoice_id = p_xendit_invoice_id;

  IF v_offering_id IS NOT NULL THEN
    SELECT billing_cycle INTO v_billing_cycle
    FROM product_offerings
    WHERE id = v_offering_id;
  END IF;

  -- Update tenant status based on payment status
  IF p_status = 'paid' OR p_status = 'settled' THEN
    UPDATE tenants
    SET
      payment_status = 'paid',
      subscription_status = 'active',
      last_payment_date = COALESCE(p_paid_at, NOW()),
      next_billing_date = CASE
        WHEN v_billing_cycle = 'monthly' THEN COALESCE(p_paid_at, NOW()) + INTERVAL '1 month'
        WHEN v_billing_cycle = 'annual' THEN COALESCE(p_paid_at, NOW()) + INTERVAL '1 year'
        ELSE next_billing_date
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

-- Add comments for documentation
COMMENT ON TABLE subscription_payments IS 'Stores payment transaction history for tenant subscriptions via Xendit';
COMMENT ON TABLE payment_methods IS 'Stores saved payment methods for tenants (cards, e-wallets, bank accounts)';
COMMENT ON TABLE billing_events IS 'Logs all Xendit webhook events for audit and debugging';
COMMENT ON FUNCTION get_tenant_payment_summary IS 'Returns payment summary statistics for a tenant';
COMMENT ON FUNCTION update_tenant_payment_status IS 'Updates tenant and payment status based on Xendit webhook events';



-- Add policy for authenticated users to insert payments for their tenant
DROP POLICY IF EXISTS "Authenticated users can insert payments for their tenant" ON subscription_payments;
CREATE POLICY "Authenticated users can insert payments for their tenant"
ON subscription_payments
FOR INSERT
WITH CHECK (
  tenant_id IN (
    SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()
  )
);

-- Add policy for authenticated users to update their tenant's payments
DROP POLICY IF EXISTS "Authenticated users can update their tenant's payments" ON subscription_payments;
CREATE POLICY "Authenticated users can update their tenant's payments"
ON subscription_payments
FOR UPDATE
USING (
  tenant_id IN (
    SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()
  )
)
WITH CHECK (
  tenant_id IN (
    SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()
  )
);
