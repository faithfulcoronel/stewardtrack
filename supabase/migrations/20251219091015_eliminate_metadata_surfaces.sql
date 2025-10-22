-- Migration: Eliminate Metadata Surfaces Layer
-- Purpose: Remove metadata_surfaces abstraction and simplify to direct feature-based access control
-- Date: 2025-12-19
--
-- This migration removes 4 tables that add unnecessary complexity:
-- 1. metadata_surfaces
-- 2. rbac_surface_bindings (columns referencing metadata_surfaces)
-- 3. surface_license_bindings (via ALTER on rbac_surface_bindings)
-- 4. metadata_pages (legacy table)
--
-- After this migration, access control will use: Features → Permissions → Roles (3-layer)
-- Instead of: Features → Surfaces → Surface Bindings → Bundles → Permissions → Roles (6-layer)

BEGIN;

-- ============================================================================
-- STEP 1: Drop dependent views and functions
-- ============================================================================

-- Drop views that depend on metadata_surfaces
DROP VIEW IF EXISTS v_effective_surface_access CASCADE;

-- Drop functions that reference surface tables
DROP FUNCTION IF EXISTS can_access_surface(uuid, uuid, text) CASCADE;
DROP FUNCTION IF EXISTS get_user_licensed_metadata_pages(uuid, uuid) CASCADE;
DROP FUNCTION IF EXISTS get_user_licensed_menu_items(uuid, uuid) CASCADE;
DROP FUNCTION IF EXISTS get_user_menu_with_metadata(uuid, uuid) CASCADE;
DROP FUNCTION IF EXISTS can_access_metadata_page(text, uuid, uuid) CASCADE;
DROP FUNCTION IF EXISTS register_metadata_page(text, uuid, text, text, text, text, text, text[], text[]) CASCADE;

-- ============================================================================
-- STEP 2: Remove foreign key constraints that reference metadata_surfaces
-- ============================================================================

-- Remove surface_id column from rbac_surface_bindings (added in migration 20251219091014)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'rbac_surface_bindings'
      AND column_name = 'surface_id'
  ) THEN
    -- Drop the index first
    DROP INDEX IF EXISTS idx_rbac_surface_bindings_surface_id;

    -- Drop the column (this also removes the foreign key constraint)
    ALTER TABLE rbac_surface_bindings DROP COLUMN surface_id;

    RAISE NOTICE 'Removed surface_id column from rbac_surface_bindings';
  END IF;
END $$;

-- Remove license-related columns from metadata_surfaces and rbac_surface_bindings
-- (added in migration 20251218001010)
DO $$
BEGIN
  -- Remove columns from metadata_surfaces
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'metadata_surfaces') THEN
    ALTER TABLE metadata_surfaces DROP COLUMN IF EXISTS required_license_bundle_id CASCADE;
    ALTER TABLE metadata_surfaces DROP COLUMN IF EXISTS required_features CASCADE;
    ALTER TABLE metadata_surfaces DROP COLUMN IF EXISTS license_tier_min CASCADE;

    DROP INDEX IF EXISTS metadata_surfaces_required_license_bundle_idx;

    RAISE NOTICE 'Removed license columns from metadata_surfaces';
  END IF;

  -- Remove columns from rbac_surface_bindings
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'rbac_surface_bindings') THEN
    ALTER TABLE rbac_surface_bindings DROP COLUMN IF EXISTS required_license_bundle_id CASCADE;
    ALTER TABLE rbac_surface_bindings DROP COLUMN IF EXISTS enforces_license CASCADE;

    DROP INDEX IF EXISTS rbac_surface_bindings_required_license_bundle_idx;

    RAISE NOTICE 'Removed license columns from rbac_surface_bindings';
  END IF;
END $$;

-- ============================================================================
-- STEP 3: Drop metadata_surfaces table
-- ============================================================================

DROP TABLE IF EXISTS metadata_surfaces CASCADE;

-- ============================================================================
-- STEP 4: Drop metadata_pages table (legacy)
-- ============================================================================

DROP TABLE IF EXISTS metadata_pages CASCADE;

-- ============================================================================
-- STEP 5: Clean up rbac_surface_bindings metadata_blueprint_id references
-- ============================================================================

-- The metadata_blueprint_id column in rbac_surface_bindings is no longer needed
-- since we're removing the surfaces abstraction layer
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'rbac_surface_bindings'
      AND column_name = 'metadata_blueprint_id'
  ) THEN
    -- Drop the index
    DROP INDEX IF EXISTS rbac_surface_bindings_metadata_blueprint_idx;

    -- Drop the column
    ALTER TABLE rbac_surface_bindings DROP COLUMN metadata_blueprint_id;

    RAISE NOTICE 'Removed metadata_blueprint_id from rbac_surface_bindings';
  END IF;
END $$;

-- Also remove metadata_page_id if it exists (legacy column)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'rbac_surface_bindings'
      AND column_name = 'metadata_page_id'
  ) THEN
    DROP INDEX IF EXISTS rbac_surface_bindings_metadata_page_id_idx;
    ALTER TABLE rbac_surface_bindings DROP COLUMN metadata_page_id;

    RAISE NOTICE 'Removed metadata_page_id from rbac_surface_bindings';
  END IF;
END $$;

-- ============================================================================
-- STEP 6: Clean up rbac_surface_bindings data and update constraints
-- ============================================================================

-- First, delete any rows that don't have a menu_item_id
-- These were bindings to metadata surfaces/pages which no longer exist
DELETE FROM rbac_surface_bindings WHERE menu_item_id IS NULL;

-- Now update the constraint
DO $$
BEGIN
  -- Drop old constraint if it exists
  ALTER TABLE rbac_surface_bindings DROP CONSTRAINT IF EXISTS rbac_surface_bindings_target_check;

  -- Add new constraint that only requires menu_item_id
  ALTER TABLE rbac_surface_bindings
    ADD CONSTRAINT rbac_surface_bindings_target_check
    CHECK (menu_item_id IS NOT NULL);

  RAISE NOTICE 'Updated rbac_surface_bindings target check constraint';
END $$;

-- ============================================================================
-- STEP 7: Clean up unique indexes that referenced metadata fields
-- ============================================================================

DROP INDEX IF EXISTS rbac_surface_bindings_role_unique_idx;
DROP INDEX IF EXISTS rbac_surface_bindings_bundle_unique_idx;

-- Create simpler unique indexes for role and bundle bindings
CREATE UNIQUE INDEX rbac_surface_bindings_role_unique_idx
  ON rbac_surface_bindings (tenant_id, role_id, menu_item_id)
  WHERE role_id IS NOT NULL;

CREATE UNIQUE INDEX rbac_surface_bindings_bundle_unique_idx
  ON rbac_surface_bindings (tenant_id, bundle_id, menu_item_id)
  WHERE bundle_id IS NOT NULL;

-- ============================================================================
-- STEP 8: Verify migration success
-- ============================================================================

DO $$
DECLARE
  v_metadata_surfaces_exists boolean;
  v_metadata_pages_exists boolean;
  v_surface_id_exists boolean;
  v_metadata_blueprint_id_exists boolean;
BEGIN
  -- Check if tables were dropped
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables WHERE table_name = 'metadata_surfaces'
  ) INTO v_metadata_surfaces_exists;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables WHERE table_name = 'metadata_pages'
  ) INTO v_metadata_pages_exists;

  -- Check if columns were removed
  SELECT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'rbac_surface_bindings' AND column_name = 'surface_id'
  ) INTO v_surface_id_exists;

  SELECT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'rbac_surface_bindings' AND column_name = 'metadata_blueprint_id'
  ) INTO v_metadata_blueprint_id_exists;

  -- Log verification results
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Migration Verification:';
  RAISE NOTICE '  - metadata_surfaces table dropped: %', NOT v_metadata_surfaces_exists;
  RAISE NOTICE '  - metadata_pages table dropped: %', NOT v_metadata_pages_exists;
  RAISE NOTICE '  - surface_id column removed: %', NOT v_surface_id_exists;
  RAISE NOTICE '  - metadata_blueprint_id column removed: %', NOT v_metadata_blueprint_id_exists;
  RAISE NOTICE '========================================';

  -- Ensure critical changes succeeded
  IF v_metadata_surfaces_exists OR v_metadata_pages_exists THEN
    RAISE EXCEPTION 'Migration failed: Surface tables still exist';
  END IF;
END $$;

COMMIT;
