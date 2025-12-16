-- =====================================================================================
-- MIGRATION: Drop Legacy Licensing Tables
-- =====================================================================================
-- This migration drops obsolete licensing tables that have been replaced by the
-- product_offerings and license_feature_bundles architecture.
--
-- Tables being dropped:
-- 1. feature_packages - Legacy licensing packages (replaced by product_offerings)
-- 2. feature_package_items - Junction for feature_packages
--
-- NOTE: The following tables are KEPT and actively used:
-- - license_feature_bundles (reusable feature groupings for licensing)
-- - product_offering_bundles (junction for bundles in offerings)
-- - delegation_permissions (granular delegation model - still in use)
-- =====================================================================================

BEGIN;

-- =====================================================================================
-- Drop feature_packages tables (replaced by product_offerings architecture)
-- =====================================================================================
-- feature_packages was a legacy approach to grouping features.
-- The new architecture uses:
-- - product_offerings (purchasable SKUs)
-- - license_feature_bundles (reusable feature groupings)
-- - product_offering_bundles (junction table)
-- - product_offering_features (direct feature assignments)

-- =====================================================================================
-- Clean up any orphaned grants BEFORE dropping tables
-- =====================================================================================
-- Update tenant_feature_grants to set package_id to NULL for any grants that reference
-- feature_packages (since we're dropping that table)

-- Note: We're keeping the rows but nullifying the package_id reference
-- The grant_source field already indicates how the feature was granted
UPDATE tenant_feature_grants
SET package_id = NULL,
    updated_at = now()
WHERE package_id IS NOT NULL
  AND grant_source = 'package';

-- =====================================================================================
-- Now drop the tables
-- =====================================================================================

-- Drop junction table first (has foreign keys)
DROP TABLE IF EXISTS feature_package_items CASCADE;

-- Drop main table
DROP TABLE IF EXISTS feature_packages CASCADE;


-- =====================================================================================
-- Documentation Updates
-- =====================================================================================

COMMENT ON TABLE tenant_feature_grants IS
  'Active feature grants per tenant. grant_source indicates how the feature was granted: direct (manual via product_offerings), trial, or comp. Legacy package grants have been migrated to direct grants.';

COMMENT ON COLUMN tenant_feature_grants.package_id IS
  'DEPRECATED: Previously referenced feature_packages. Now nullable. New grants should use grant_source=direct and link via product_offerings → product_offering_features.';

COMMENT ON COLUMN tenant_feature_grants.grant_source IS
  'How the feature was granted: direct (via product_offerings), trial (trial period), comp (complimentary). Legacy "package" grants have been migrated to "direct".';


-- =====================================================================================
-- Verify Current Architecture
-- =====================================================================================
-- The current licensing architecture consists of:
--
-- PRODUCT LAYER:
-- - product_offerings (purchasable SKUs with tiers/pricing)
-- - product_offering_features (direct feature assignments to offerings)
-- - product_offering_bundles (bundle assignments to offerings)
--
-- FEATURE LAYER:
-- - feature_catalog (all available features)
-- - license_feature_bundles (reusable feature groupings)
-- - license_feature_bundle_items (features in bundles)
-- - feature_permissions (required permissions per feature)
--
-- TENANT LAYER:
-- - tenant_feature_grants (active feature access per tenant)
-- - license_assignments (history of offering assignments)
--
-- RBAC LAYER:
-- - permissions (granular permission definitions)
-- - role_permissions (direct role → permission mapping, NO bundles)
-- =====================================================================================

COMMIT;
