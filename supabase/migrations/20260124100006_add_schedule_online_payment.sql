-- =============================================================================
-- Migration: Add Online Payment Support for Schedule Registrations
-- =============================================================================
-- This migration adds support for accepting online payments during event
-- registration, integrated with the existing Xendit payment system.
--
-- Changes:
-- 1. Add payment configuration columns to ministry_schedules
-- 2. Add payment tracking columns to schedule_registrations
-- 3. Add indexes for payment queries
-- =============================================================================

BEGIN;

-- =============================================================================
-- STEP 1: Add payment configuration to ministry_schedules
-- =============================================================================
-- These columns configure whether a schedule accepts online payment and the fee amount

ALTER TABLE public.ministry_schedules
ADD COLUMN IF NOT EXISTS accept_online_payment BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS registration_fee_amount DECIMAL(12, 2) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS registration_fee_currency TEXT DEFAULT 'PHP',
ADD COLUMN IF NOT EXISTS early_registration_fee_amount DECIMAL(12, 2) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS early_registration_deadline DATE DEFAULT NULL;

-- Add check constraint: payment amount must be positive if accepting payments
ALTER TABLE public.ministry_schedules
ADD CONSTRAINT chk_registration_fee_valid
CHECK (
  (accept_online_payment = FALSE) OR
  (accept_online_payment = TRUE AND registration_fee_amount IS NOT NULL AND registration_fee_amount > 0)
);

-- Add check constraint: early registration fee must be less than regular fee
ALTER TABLE public.ministry_schedules
ADD CONSTRAINT chk_early_registration_fee_valid
CHECK (
  (early_registration_fee_amount IS NULL) OR
  (early_registration_fee_amount > 0 AND early_registration_fee_amount < registration_fee_amount)
);

-- Add check constraint: early registration deadline required if early fee is set
ALTER TABLE public.ministry_schedules
ADD CONSTRAINT chk_early_registration_deadline_required
CHECK (
  (early_registration_fee_amount IS NULL AND early_registration_deadline IS NULL) OR
  (early_registration_fee_amount IS NOT NULL AND early_registration_deadline IS NOT NULL)
);

COMMENT ON COLUMN public.ministry_schedules.accept_online_payment IS 'Whether to accept online payment during registration. Only applicable when registration_required is true.';
COMMENT ON COLUMN public.ministry_schedules.registration_fee_amount IS 'Regular registration fee amount. Required when accept_online_payment is true.';
COMMENT ON COLUMN public.ministry_schedules.registration_fee_currency IS 'Currency for the registration fee. Defaults to PHP.';
COMMENT ON COLUMN public.ministry_schedules.early_registration_fee_amount IS 'Discounted fee for early bird registrations. Must be less than regular fee.';
COMMENT ON COLUMN public.ministry_schedules.early_registration_deadline IS 'Last date for early bird pricing. After this date, regular fee applies.';

-- =============================================================================
-- STEP 2: Add payment tracking to schedule_registrations
-- =============================================================================
-- These columns track the payment status and details for each registration

ALTER TABLE public.schedule_registrations
ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'not_required',
ADD COLUMN IF NOT EXISTS payment_amount DECIMAL(12, 2) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS xendit_fee DECIMAL(12, 2) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS platform_fee DECIMAL(12, 2) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS total_charged DECIMAL(12, 2) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS payment_currency TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS xendit_payment_request_id TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS xendit_payment_id TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS external_id TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS payment_method_type TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ DEFAULT NULL,
ADD COLUMN IF NOT EXISTS payment_url TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS payment_expires_at TIMESTAMPTZ DEFAULT NULL;

-- Add check constraint for payment status
ALTER TABLE public.schedule_registrations
ADD CONSTRAINT chk_payment_status_valid
CHECK (payment_status IN ('not_required', 'pending', 'paid', 'failed', 'expired', 'refunded', 'waived'));

COMMENT ON COLUMN public.schedule_registrations.payment_status IS 'Payment status: not_required, pending, paid, failed, expired, refunded, waived';
COMMENT ON COLUMN public.schedule_registrations.payment_amount IS 'Base registration fee amount';
COMMENT ON COLUMN public.schedule_registrations.xendit_fee IS 'Xendit processing fee';
COMMENT ON COLUMN public.schedule_registrations.platform_fee IS 'Platform fee';
COMMENT ON COLUMN public.schedule_registrations.total_charged IS 'Total amount charged including all fees';
COMMENT ON COLUMN public.schedule_registrations.payment_currency IS 'Currency of the payment';
COMMENT ON COLUMN public.schedule_registrations.xendit_payment_request_id IS 'Xendit Payment Request ID';
COMMENT ON COLUMN public.schedule_registrations.xendit_payment_id IS 'Xendit Payment ID after successful payment';
COMMENT ON COLUMN public.schedule_registrations.external_id IS 'External reference ID for Xendit';
COMMENT ON COLUMN public.schedule_registrations.payment_method_type IS 'Payment method used: card, ewallet, bank_transfer, etc.';
COMMENT ON COLUMN public.schedule_registrations.paid_at IS 'Timestamp when payment was completed';
COMMENT ON COLUMN public.schedule_registrations.payment_url IS 'URL for completing the payment';
COMMENT ON COLUMN public.schedule_registrations.payment_expires_at IS 'When the payment link expires';

-- =============================================================================
-- STEP 3: Add indexes for payment queries
-- =============================================================================

-- Index for finding registrations by payment status
CREATE INDEX IF NOT EXISTS idx_schedule_registrations_payment_status
ON public.schedule_registrations(tenant_id, payment_status)
WHERE payment_status IN ('pending', 'paid');

-- Index for finding registrations by Xendit IDs
CREATE INDEX IF NOT EXISTS idx_schedule_registrations_xendit_payment
ON public.schedule_registrations(xendit_payment_request_id)
WHERE xendit_payment_request_id IS NOT NULL;

-- Index for finding registrations by external ID
CREATE INDEX IF NOT EXISTS idx_schedule_registrations_external_id
ON public.schedule_registrations(external_id)
WHERE external_id IS NOT NULL;

-- Index for schedules that accept payment
CREATE INDEX IF NOT EXISTS idx_ministry_schedules_payment
ON public.ministry_schedules(tenant_id, accept_online_payment)
WHERE accept_online_payment = TRUE;

-- =============================================================================
-- STEP 4: Update existing registrations
-- =============================================================================
-- Set payment_status to 'not_required' for all existing registrations
-- (they were created before payment support was added)

UPDATE public.schedule_registrations
SET payment_status = 'not_required'
WHERE payment_status IS NULL;

COMMIT;

-- Success confirmation
DO $$
BEGIN
  RAISE NOTICE 'Migration completed: Added online payment support for schedule registrations';
END $$;
