-- Migration: Remove rbac_surface_bindings Table and Feature Catalog Surface Columns
-- Purpose: Complete the metadata_surfaces elimination by removing the remaining binding table
-- Date: 2025-12-19
--
-- This migration removes:
-- 1. rbac_surface_bindings table (entire table)
-- 2. surface_id, surface_type, module columns from feature_catalog
--
-- After this migration, all surface-related infrastructure is completely eliminated.

BEGIN;

-- ============================================================================
-- STEP 1: Drop rbac_surface_bindings table entirely
-- ============================================================================

-- First drop any dependent views or functions
DROP VIEW IF EXISTS v_user_role_surface_access CASCADE;
DROP FUNCTION IF EXISTS get_user_surface_bindings(uuid, uuid) CASCADE;

-- Drop the entire rbac_surface_bindings table
DROP TABLE IF EXISTS rbac_surface_bindings CASCADE;

-- ============================================================================
-- STEP 2: Remove surface-related columns from feature_catalog
-- ============================================================================

-- Drop indexes first
DROP INDEX IF EXISTS feature_catalog_surface_id_unique_idx;
DROP INDEX IF EXISTS feature_catalog_surface_id_idx;
DROP INDEX IF EXISTS feature_catalog_module_idx;

-- Remove the columns
ALTER TABLE feature_catalog
  DROP COLUMN IF EXISTS surface_id CASCADE,
  DROP COLUMN IF EXISTS surface_type CASCADE,
  DROP COLUMN IF EXISTS module CASCADE;

-- ============================================================================
-- STEP 3: Verify migration success
-- ============================================================================

DO $$
DECLARE
  v_rbac_surface_bindings_exists boolean;
  v_surface_id_exists boolean;
  v_surface_type_exists boolean;
  v_module_exists boolean;
BEGIN
  -- Check if table was dropped
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'rbac_surface_bindings'
  ) INTO v_rbac_surface_bindings_exists;

  -- Check if columns were removed
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'feature_catalog' AND column_name = 'surface_id'
  ) INTO v_surface_id_exists;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'feature_catalog' AND column_name = 'surface_type'
  ) INTO v_surface_type_exists;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'feature_catalog' AND column_name = 'module'
  ) INTO v_module_exists;

  -- Log verification results
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Migration Verification:';
  RAISE NOTICE '  - rbac_surface_bindings table dropped: %', NOT v_rbac_surface_bindings_exists;
  RAISE NOTICE '  - surface_id column removed: %', NOT v_surface_id_exists;
  RAISE NOTICE '  - surface_type column removed: %', NOT v_surface_type_exists;
  RAISE NOTICE '  - module column removed: %', NOT v_module_exists;
  RAISE NOTICE '========================================';

  -- Ensure critical changes succeeded
  IF v_rbac_surface_bindings_exists THEN
    RAISE EXCEPTION 'Migration failed: rbac_surface_bindings table still exists';
  END IF;

  IF v_surface_id_exists OR v_surface_type_exists OR v_module_exists THEN
    RAISE EXCEPTION 'Migration failed: Surface columns still exist in feature_catalog';
  END IF;
END $$;

COMMIT;
