-- =============================================================================
-- Migration: Delete Old English Product Offerings and Migrate Tenants
-- =============================================================================
-- This migration:
-- 1. Migrates existing tenant subscriptions from old offerings to new Philippine offerings
-- 2. Deletes the old generic English offerings
--
-- Mapping (old → new):
-- - essential-free → ph-mananampalataya-free
-- - premium-monthly → ph-lingkod-monthly
-- - premium-annual → ph-lingkod-annual
-- - professional-monthly → ph-katiwala-monthly
-- - professional-annual → ph-katiwala-annual
-- - enterprise-monthly → ph-tagapangasiwa-monthly
-- - enterprise-annual → ph-tagapangasiwa-annual
-- - professional-trial → ph-katiwala-trial
-- =============================================================================

BEGIN;

-- =============================================================================
-- STEP 1: Migrate tenant subscription_offering_id to new Philippine offerings
-- =============================================================================

UPDATE tenants t
SET subscription_offering_id = new_po.id, updated_at = now()
FROM product_offerings old_po, product_offerings new_po
WHERE t.subscription_offering_id = old_po.id
  AND old_po.code = 'essential-free'
  AND new_po.code = 'ph-mananampalataya-free';

UPDATE tenants t
SET subscription_offering_id = new_po.id, updated_at = now()
FROM product_offerings old_po, product_offerings new_po
WHERE t.subscription_offering_id = old_po.id
  AND old_po.code = 'premium-monthly'
  AND new_po.code = 'ph-lingkod-monthly';

UPDATE tenants t
SET subscription_offering_id = new_po.id, updated_at = now()
FROM product_offerings old_po, product_offerings new_po
WHERE t.subscription_offering_id = old_po.id
  AND old_po.code = 'premium-annual'
  AND new_po.code = 'ph-lingkod-annual';

UPDATE tenants t
SET subscription_offering_id = new_po.id, updated_at = now()
FROM product_offerings old_po, product_offerings new_po
WHERE t.subscription_offering_id = old_po.id
  AND old_po.code = 'professional-monthly'
  AND new_po.code = 'ph-katiwala-monthly';

UPDATE tenants t
SET subscription_offering_id = new_po.id, updated_at = now()
FROM product_offerings old_po, product_offerings new_po
WHERE t.subscription_offering_id = old_po.id
  AND old_po.code = 'professional-annual'
  AND new_po.code = 'ph-katiwala-annual';

UPDATE tenants t
SET subscription_offering_id = new_po.id, updated_at = now()
FROM product_offerings old_po, product_offerings new_po
WHERE t.subscription_offering_id = old_po.id
  AND old_po.code = 'enterprise-monthly'
  AND new_po.code = 'ph-tagapangasiwa-monthly';

UPDATE tenants t
SET subscription_offering_id = new_po.id, updated_at = now()
FROM product_offerings old_po, product_offerings new_po
WHERE t.subscription_offering_id = old_po.id
  AND old_po.code = 'enterprise-annual'
  AND new_po.code = 'ph-tagapangasiwa-annual';

UPDATE tenants t
SET subscription_offering_id = new_po.id, updated_at = now()
FROM product_offerings old_po, product_offerings new_po
WHERE t.subscription_offering_id = old_po.id
  AND old_po.code = 'professional-trial'
  AND new_po.code = 'ph-katiwala-trial';

-- =============================================================================
-- STEP 2: Disable USER triggers by setting session_replication_role
-- This disables user-defined triggers but keeps system/constraint triggers
-- =============================================================================

SET session_replication_role = replica;

-- =============================================================================
-- STEP 3: Delete child records first (explicit delete for safety)
-- =============================================================================

-- Delete subscription_payments for old offerings (if any exist)
DELETE FROM subscription_payments
WHERE offering_id IN (
  SELECT id FROM product_offerings
  WHERE code IN (
    'essential-free',
    'premium-monthly',
    'premium-annual',
    'professional-monthly',
    'professional-annual',
    'enterprise-monthly',
    'enterprise-annual',
    'professional-trial'
  )
);

-- Delete prices for old offerings
DELETE FROM product_offering_prices
WHERE offering_id IN (
  SELECT id FROM product_offerings
  WHERE code IN (
    'essential-free',
    'premium-monthly',
    'premium-annual',
    'professional-monthly',
    'professional-annual',
    'enterprise-monthly',
    'enterprise-annual',
    'professional-trial'
  )
);

-- Delete offering bundles for old offerings
DELETE FROM product_offering_bundles
WHERE offering_id IN (
  SELECT id FROM product_offerings
  WHERE code IN (
    'essential-free',
    'premium-monthly',
    'premium-annual',
    'professional-monthly',
    'professional-annual',
    'enterprise-monthly',
    'enterprise-annual',
    'professional-trial'
  )
);

-- Delete offering features for old offerings
DELETE FROM product_offering_features
WHERE offering_id IN (
  SELECT id FROM product_offerings
  WHERE code IN (
    'essential-free',
    'premium-monthly',
    'premium-annual',
    'professional-monthly',
    'professional-annual',
    'enterprise-monthly',
    'enterprise-annual',
    'professional-trial'
  )
);

-- =============================================================================
-- STEP 4: Delete old product offerings (parent table)
-- =============================================================================

DELETE FROM product_offerings
WHERE code IN (
  'essential-free',
  'premium-monthly',
  'premium-annual',
  'professional-monthly',
  'professional-annual',
  'enterprise-monthly',
  'enterprise-annual',
  'professional-trial'
);

-- =============================================================================
-- STEP 5: Re-enable triggers
-- =============================================================================

SET session_replication_role = DEFAULT;

-- =============================================================================
-- STEP 6: Verify migration success
-- =============================================================================

DO $$
DECLARE
  old_count integer;
  ph_count integer;
  tenant_count integer;
BEGIN
  -- Check old offerings are deleted
  SELECT COUNT(*) INTO old_count
  FROM product_offerings
  WHERE code IN (
    'essential-free',
    'premium-monthly',
    'premium-annual',
    'professional-monthly',
    'professional-annual',
    'enterprise-monthly',
    'enterprise-annual',
    'professional-trial'
  );

  IF old_count > 0 THEN
    RAISE EXCEPTION 'Old offerings were not deleted. Found % remaining', old_count;
  END IF;

  -- Count active Philippine offerings
  SELECT COUNT(*) INTO ph_count
  FROM product_offerings
  WHERE code LIKE 'ph-%'
  AND is_active = true;

  -- Count tenants now using PH offerings
  SELECT COUNT(*) INTO tenant_count
  FROM tenants t
  JOIN product_offerings po ON t.subscription_offering_id = po.id
  WHERE po.code LIKE 'ph-%';

  RAISE NOTICE 'Migration successful: Deleted old offerings, % Philippine offerings active, % tenants migrated',
    ph_count, tenant_count;
END $$;

COMMIT;
