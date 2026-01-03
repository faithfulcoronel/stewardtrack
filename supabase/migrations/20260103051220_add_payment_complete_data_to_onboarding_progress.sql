-- Migration: Add payment_data and complete_data columns to onboarding_progress
-- The onboarding wizard has 'payment' and 'complete' steps that need to store data

-- Add new data columns for payment and complete steps
ALTER TABLE onboarding_progress
ADD COLUMN IF NOT EXISTS payment_data jsonb DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS complete_data jsonb DEFAULT '{}'::jsonb;

-- Update the CHECK constraint to include 'payment' as a valid step
-- First drop the existing constraint
ALTER TABLE onboarding_progress
DROP CONSTRAINT IF EXISTS valid_step;

-- Add updated constraint with 'payment' step
ALTER TABLE onboarding_progress
ADD CONSTRAINT valid_step CHECK (
  current_step IN ('welcome', 'church-details', 'rbac-setup', 'feature-tour', 'payment', 'complete')
);

-- Add comments for documentation
COMMENT ON COLUMN onboarding_progress.payment_data IS 'Data collected during the payment step (billing preferences, payment method selection)';
COMMENT ON COLUMN onboarding_progress.complete_data IS 'Data collected during the completion step (final preferences, feedback)';
