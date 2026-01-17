-- =============================================================================
-- Migration: Add Trial Offering Fields to Product Offerings
-- =============================================================================
-- This migration adds fields to support trial offerings:
-- - trial_days: Number of days for the trial period
-- - trial_upgrade_offering_id: The product offering to upgrade to after trial ends
--
-- When offering_type = 'trial':
-- - trial_days specifies how long the trial lasts
-- - trial_upgrade_offering_id specifies which paid offering the user upgrades to
-- =============================================================================

BEGIN;

-- =============================================================================
-- STEP 1: Add trial_days column
-- =============================================================================

ALTER TABLE product_offerings
ADD COLUMN IF NOT EXISTS trial_days integer DEFAULT NULL;

COMMENT ON COLUMN product_offerings.trial_days IS 'Number of days for trial period. Only applicable when offering_type = trial.';

-- =============================================================================
-- STEP 2: Add trial_upgrade_offering_id column (self-referencing foreign key)
-- =============================================================================

ALTER TABLE product_offerings
ADD COLUMN IF NOT EXISTS trial_upgrade_offering_id uuid DEFAULT NULL;

-- Add foreign key constraint
ALTER TABLE product_offerings
ADD CONSTRAINT fk_trial_upgrade_offering
FOREIGN KEY (trial_upgrade_offering_id)
REFERENCES product_offerings(id)
ON DELETE SET NULL;

COMMENT ON COLUMN product_offerings.trial_upgrade_offering_id IS 'The product offering to upgrade to after trial ends. Only applicable when offering_type = trial.';

-- =============================================================================
-- STEP 3: Add index for trial_upgrade_offering_id
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_product_offerings_trial_upgrade
ON product_offerings(trial_upgrade_offering_id)
WHERE trial_upgrade_offering_id IS NOT NULL;

-- =============================================================================
-- STEP 4: Update offering_type check constraint to include 'trial'
-- =============================================================================

-- First, drop the existing constraint if it exists
ALTER TABLE product_offerings
DROP CONSTRAINT IF EXISTS product_offerings_offering_type_check;

-- Add the updated constraint including 'trial'
ALTER TABLE product_offerings
ADD CONSTRAINT product_offerings_offering_type_check
CHECK (offering_type IN ('subscription', 'one_time', 'one-time', 'usage_based', 'tiered', 'trial', 'custom', 'enterprise'));

COMMIT;
