-- =============================================================================
-- Migration: Add max_ai_credits_per_month to product_offerings
-- =============================================================================
-- Description: Adds the max_ai_credits_per_month column to product_offerings
-- to support AI credits quota limits for licensing tiers.
-- NULL = unlimited, 0 = not available
-- =============================================================================

-- Add max_ai_credits_per_month column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'product_offerings'
    AND column_name = 'max_ai_credits_per_month'
  ) THEN
    ALTER TABLE product_offerings
    ADD COLUMN max_ai_credits_per_month INTEGER DEFAULT NULL;

    COMMENT ON COLUMN product_offerings.max_ai_credits_per_month IS
      'Monthly AI credits limit. NULL = unlimited, 0 = not available';
  END IF;
END $$;

-- Success confirmation
DO $$
BEGIN
  RAISE NOTICE 'Migration completed: max_ai_credits_per_month column added to product_offerings';
END $$;
