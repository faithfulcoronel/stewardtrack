-- =====================================================================================
-- MIGRATION: Drop Obsolete License and Metadata Tables
-- =====================================================================================
-- This migration removes obsolete database objects that should not exist.
--
-- Background:
-- - OLD SYSTEM (OBSOLETE): licenses → license_features tables
-- - NEW SYSTEM (CURRENT): tenants.subscription_offering_id → tenant_feature_grants
-- - Metadata is stored in XML files, NOT in database tables
--
-- Tables to Drop:
-- 1. licenses - Replaced by tenants.subscription_offering_id
-- 2. license_features - Replaced by tenant_feature_grants
-- 3. metadata_pages - Should never have existed (metadata is XML-based)
--
-- Functions to Drop:
-- 1. can_access_metadata_page - References metadata_pages
-- 2. get_user_menu_with_metadata - References metadata_pages
-- 3. register_metadata_page - Creates metadata_pages entries
-- 4. sync_metadata_pages_to_surface_bindings - Syncs metadata_pages
-- =====================================================================================

-- =====================================================================================
-- STEP 1: Drop obsolete functions
-- =====================================================================================

DROP FUNCTION IF EXISTS can_access_metadata_page(text, uuid, uuid);
DROP FUNCTION IF EXISTS get_user_menu_with_metadata(uuid, uuid);
DROP FUNCTION IF EXISTS register_metadata_page(text, uuid, text, text, text, text, text, text[], text[]);
DROP FUNCTION IF EXISTS sync_metadata_pages_to_surface_bindings();

-- =====================================================================================
-- STEP 2: Drop obsolete tables
-- =====================================================================================

-- Drop metadata_pages table (metadata is XML-based, not database-driven)
DROP TABLE IF EXISTS metadata_pages CASCADE;

-- Drop license_features table (replaced by tenant_feature_grants)
DROP TABLE IF EXISTS license_features CASCADE;

-- Drop licenses table (replaced by tenants.subscription_offering_id + tenant_feature_grants)
DROP TABLE IF EXISTS licenses CASCADE;

-- =====================================================================================
-- VERIFICATION: Current License System
-- =====================================================================================
-- The current system uses:
-- 1. tenants.subscription_offering_id → Links tenant to product offering
-- 2. product_offerings → Defines pricing plans
-- 3. product_offering_features → Maps offerings to features
-- 4. tenant_feature_grants → Active feature grants per tenant (date-ranged)
-- 5. feature_catalog → Catalog of all available features
--
-- Menu access is controlled via:
-- 1. menu_items.feature_code → Links menu item to required feature
-- 2. MenuAccessService checks tenant_feature_grants for active features
-- =====================================================================================
