-- Email Verification: Create pending_registrations table
-- This table stores registration data until email is verified

CREATE TABLE pending_registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  verification_token TEXT NOT NULL UNIQUE,
  token_expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '24 hours'),
  token_used_at TIMESTAMPTZ,

  -- Registration data
  email TEXT NOT NULL,
  church_name TEXT NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  offering_id UUID NOT NULL,
  denomination TEXT,
  contact_number TEXT,
  address TEXT,

  -- Offering type flags (for redirect logic after verification)
  is_trial BOOLEAN DEFAULT FALSE,
  is_free BOOLEAN DEFAULT FALSE,
  price_is_zero BOOLEAN DEFAULT FALSE,

  -- Coupon/discount data (for checkout after verification)
  coupon_code TEXT,
  coupon_discount_id TEXT,
  coupon_discount_amount DECIMAL(10, 2),
  coupon_discounted_price DECIMAL(10, 2),
  coupon_duration_billing_cycles INTEGER,

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT pending_registrations_token_unique UNIQUE (verification_token)
);

-- Index for fast token lookups (only unused tokens)
CREATE INDEX idx_pending_registrations_token
  ON pending_registrations(verification_token) WHERE token_used_at IS NULL;

-- Index for looking up by user_id
CREATE INDEX idx_pending_registrations_user_id
  ON pending_registrations(user_id);

-- Index for looking up by email
CREATE INDEX idx_pending_registrations_email
  ON pending_registrations(email);

-- Enable Row Level Security
ALTER TABLE pending_registrations ENABLE ROW LEVEL SECURITY;

-- Only service role can access this table (for security)
CREATE POLICY "Service role full access" ON pending_registrations
  FOR ALL USING (auth.role() = 'service_role');

-- Add comment for documentation
COMMENT ON TABLE pending_registrations IS 'Stores registration data until email is verified. Records are deleted after successful verification or expiry cleanup.';
