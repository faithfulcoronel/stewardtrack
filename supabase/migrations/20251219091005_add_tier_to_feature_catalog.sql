-- =====================================================================================
-- MIGRATION: Add Tier Column to Feature Catalog
-- =====================================================================================
-- Adds tier column to feature_catalog to support license tier requirements
-- =====================================================================================

BEGIN;

-- Add tier column to feature_catalog if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'feature_catalog' AND column_name = 'tier'
  ) THEN
    ALTER TABLE feature_catalog
      ADD COLUMN tier text CHECK (tier IN (
        'essential', 'professional', 'enterprise', 'premium'
      ));
  END IF;
END $$;

-- Add index for filtering by tier (if not exists)
CREATE INDEX IF NOT EXISTS feature_catalog_tier_idx
  ON feature_catalog(tier)
  WHERE tier IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN feature_catalog.tier IS
  'License tier required for this feature: essential, professional, enterprise, or premium';

COMMIT;
