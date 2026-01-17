-- =============================================================================
-- Migration: Drop trial_upgrade_offering_id from Product Offerings
-- =============================================================================
-- This migration removes the trial_upgrade_offering_id column as the upgrade
-- path will be determined automatically by matching tier and billing cycle
-- instead of being explicitly configured.
-- =============================================================================

BEGIN;

-- =============================================================================
-- STEP 1: Drop the index
-- =============================================================================

DROP INDEX IF EXISTS idx_product_offerings_trial_upgrade;

-- =============================================================================
-- STEP 2: Drop the foreign key constraint
-- =============================================================================

ALTER TABLE product_offerings
DROP CONSTRAINT IF EXISTS fk_trial_upgrade_offering;

-- =============================================================================
-- STEP 3: Drop the column
-- =============================================================================

ALTER TABLE product_offerings
DROP COLUMN IF EXISTS trial_upgrade_offering_id;

COMMIT;
