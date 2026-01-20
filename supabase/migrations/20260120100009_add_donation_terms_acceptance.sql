-- Add terms acceptance tracking to donations table
-- Donors must accept terms and conditions before payment processing

-- Add terms acceptance columns
ALTER TABLE donations
ADD COLUMN IF NOT EXISTS terms_accepted BOOLEAN NOT NULL DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS terms_accepted_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS terms_version VARCHAR(20) DEFAULT 'v1.0';

-- Add index for auditing terms acceptance
CREATE INDEX IF NOT EXISTS idx_donations_terms_accepted
ON donations(terms_accepted, terms_accepted_at);

-- Add comment for documentation
COMMENT ON COLUMN donations.terms_accepted IS 'Whether donor accepted terms and conditions before payment';
COMMENT ON COLUMN donations.terms_accepted_at IS 'Timestamp when terms were accepted';
COMMENT ON COLUMN donations.terms_version IS 'Version of terms that were accepted for audit trail';

-- Create donation_terms table to store versions of terms
CREATE TABLE IF NOT EXISTS donation_terms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  version VARCHAR(20) NOT NULL,
  effective_date DATE NOT NULL,

  -- Terms content (can be customized per church)
  donation_understanding_text TEXT NOT NULL,
  fee_acknowledgment_text TEXT NOT NULL,
  data_privacy_text TEXT NOT NULL,
  refund_policy_text TEXT NOT NULL,

  -- Additional terms (optional)
  additional_terms_text TEXT,

  -- Status
  is_active BOOLEAN NOT NULL DEFAULT TRUE,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),

  CONSTRAINT unique_tenant_version UNIQUE(tenant_id, version)
);

-- Enable RLS on donation_terms
ALTER TABLE donation_terms ENABLE ROW LEVEL SECURITY;

-- RLS policies for donation_terms
CREATE POLICY "Tenants can view their own terms"
ON donation_terms
FOR SELECT
USING (
  tenant_id IN (
    SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Tenants can manage their own terms"
ON donation_terms
FOR ALL
USING (
  tenant_id IN (
    SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()
  )
);

-- Allow service role full access
CREATE POLICY "Service role full access to donation_terms"
ON donation_terms
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Insert default terms for existing tenants (can be customized later)
-- This uses a function to create defaults when a tenant first accesses donations
CREATE OR REPLACE FUNCTION ensure_donation_terms(p_tenant_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_terms_id UUID;
BEGIN
  -- Check if terms exist for tenant
  SELECT id INTO v_terms_id
  FROM donation_terms
  WHERE tenant_id = p_tenant_id AND is_active = TRUE
  ORDER BY effective_date DESC
  LIMIT 1;

  -- If no terms exist, create defaults
  IF v_terms_id IS NULL THEN
    INSERT INTO donation_terms (
      tenant_id,
      version,
      effective_date,
      donation_understanding_text,
      fee_acknowledgment_text,
      data_privacy_text,
      refund_policy_text
    ) VALUES (
      p_tenant_id,
      'v1.0',
      CURRENT_DATE,
      'I understand that I am making a voluntary donation. This donation is given freely and without expectation of goods or services in return.',
      'I acknowledge that transaction fees will be added to my donation. The church will receive the full donation amount.',
      'I consent to the collection and processing of my personal information for the purpose of processing this donation. My payment details are securely processed by our PCI-DSS compliant payment provider.',
      'I understand that donations are generally non-refundable. In exceptional circumstances, refund requests may be submitted within 14 days of the transaction and are subject to review.'
    )
    RETURNING id INTO v_terms_id;
  END IF;

  RETURN v_terms_id;
END;
$$;

-- Create index for terms lookup
CREATE INDEX IF NOT EXISTS idx_donation_terms_tenant_active
ON donation_terms(tenant_id, is_active, effective_date DESC);
