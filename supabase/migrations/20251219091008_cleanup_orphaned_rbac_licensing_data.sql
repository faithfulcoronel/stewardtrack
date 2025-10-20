-- Migration: Cleanup Orphaned RBAC and Licensing Data
-- Purpose: Prepare for automatic permission deployment from licensed features
-- Date: 2025-12-19
-- Note: This is a SAFE migration - only adds columns and updates existing data

-- ============================================================================
-- STEP 1: Add source columns to permissions table (if not exists)
-- ============================================================================

DO $$
BEGIN
  -- Add source column
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'permissions'
      AND column_name = 'source'
  ) THEN
    ALTER TABLE permissions ADD COLUMN source text DEFAULT 'manual';
    COMMENT ON COLUMN permissions.source IS 'Source of permission: "license_feature" for auto-deployed, "manual" for custom, "system" for built-in';
  END IF;

  -- Add source_reference column
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'permissions'
      AND column_name = 'source_reference'
  ) THEN
    ALTER TABLE permissions ADD COLUMN source_reference text;
    COMMENT ON COLUMN permissions.source_reference IS 'For license_feature source: UUID of feature_catalog entry. For manual: NULL or custom reference.';
  END IF;
END $$;

-- ============================================================================
-- STEP 2: Add metadata_key column to roles table (if not exists)
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'roles'
      AND column_name = 'metadata_key'
  ) THEN
    ALTER TABLE roles ADD COLUMN metadata_key text;
    COMMENT ON COLUMN roles.metadata_key IS 'Links tenant role to system role template (e.g., role_tenant_admin, role_staff)';

    -- Create index for faster lookups
    CREATE INDEX idx_roles_metadata_key ON roles(tenant_id, metadata_key) WHERE metadata_key IS NOT NULL;
  END IF;
END $$;

-- ============================================================================
-- STEP 3: Add is_system column to roles table (if not exists)
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'roles'
      AND column_name = 'is_system'
  ) THEN
    ALTER TABLE roles ADD COLUMN is_system boolean DEFAULT false NOT NULL;
    COMMENT ON COLUMN roles.is_system IS 'True for default roles created during tenant registration (cannot be deleted)';

    -- Create index
    CREATE INDEX idx_roles_is_system ON roles(tenant_id, is_system) WHERE is_system = true;
  END IF;
END $$;

-- ============================================================================
-- STEP 4: Update existing default roles with metadata_key
-- ============================================================================

-- Update tenant_admin roles
UPDATE roles
SET
  metadata_key = 'role_tenant_admin',
  is_system = true
WHERE LOWER(name) IN ('tenant administrator', 'tenant admin', 'administrator')
  AND tenant_id IS NOT NULL
  AND metadata_key IS NULL;

-- Update staff roles
UPDATE roles
SET
  metadata_key = 'role_staff',
  is_system = true
WHERE LOWER(name) IN ('staff', 'church staff', 'staff member')
  AND tenant_id IS NOT NULL
  AND metadata_key IS NULL;

-- Update volunteer roles
UPDATE roles
SET
  metadata_key = 'role_volunteer',
  is_system = true
WHERE LOWER(name) IN ('volunteer', 'volunteers')
  AND tenant_id IS NOT NULL
  AND metadata_key IS NULL;

-- Update member roles
UPDATE roles
SET
  metadata_key = 'role_member',
  is_system = true
WHERE LOWER(name) IN ('member', 'members', 'church member')
  AND tenant_id IS NOT NULL
  AND metadata_key IS NULL;

-- ============================================================================
-- STEP 5: Clean up invalid data before adding foreign key constraint
-- ============================================================================

-- Archive features with invalid surface_id for reference
CREATE TABLE IF NOT EXISTS archived_invalid_feature_surfaces (
  archived_at timestamptz DEFAULT now(),
  feature_id uuid,
  feature_code text,
  feature_name text,
  invalid_surface_id text,
  reason text
);

-- Archive features that reference non-existent surfaces
INSERT INTO archived_invalid_feature_surfaces (feature_id, feature_code, feature_name, invalid_surface_id, reason)
SELECT
  id,
  code,
  name,
  surface_id,
  'Surface ID does not exist in metadata_surfaces table'
FROM feature_catalog
WHERE surface_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM metadata_surfaces ms
    WHERE ms.id = feature_catalog.surface_id
  );

-- Set surface_id to NULL for features with invalid references
-- This allows us to add the foreign key constraint safely
UPDATE feature_catalog
SET surface_id = NULL
WHERE surface_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM metadata_surfaces ms
    WHERE ms.id = feature_catalog.surface_id
  );

-- ============================================================================
-- STEP 6: Add foreign key constraint on feature_catalog.surface_id
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_feature_catalog_surface_id'
  ) THEN
    -- Add foreign key constraint (now safe after cleanup)
    ALTER TABLE feature_catalog
      ADD CONSTRAINT fk_feature_catalog_surface_id
      FOREIGN KEY (surface_id)
      REFERENCES metadata_surfaces(id)
      ON DELETE SET NULL;

    RAISE NOTICE 'Added foreign key constraint fk_feature_catalog_surface_id';
  END IF;
END $$;

-- ============================================================================
-- STEP 7: Create performance indexes
-- ============================================================================

-- Index for permission source lookups
CREATE INDEX IF NOT EXISTS idx_permissions_source_ref
  ON permissions(tenant_id, source, source_reference)
  WHERE source = 'license_feature';

-- Index for feature catalog surface lookups
CREATE INDEX IF NOT EXISTS idx_feature_catalog_surface
  ON feature_catalog(surface_id)
  WHERE surface_id IS NOT NULL;

-- Note: Skipping index on rbac_surface_bindings as the column structure may vary
-- Add manually if needed based on your actual table schema

-- ============================================================================
-- VERIFICATION QUERIES (for manual checking)
-- ============================================================================

-- Run these queries after migration to verify:

-- 1. Check new columns exist
-- SELECT column_name, data_type, column_default
-- FROM information_schema.columns
-- WHERE table_name = 'permissions'
--   AND column_name IN ('source', 'source_reference');

-- 2. Check roles have metadata_key
-- SELECT metadata_key, is_system, COUNT(*)
-- FROM roles
-- WHERE tenant_id IS NOT NULL
-- GROUP BY metadata_key, is_system
-- ORDER BY metadata_key;

-- Expected output: Should see role_tenant_admin, role_staff, role_volunteer, role_member

-- 3. Check indexes were created
-- SELECT indexname
-- FROM pg_indexes
-- WHERE tablename IN ('roles', 'permissions', 'rbac_surface_bindings', 'feature_catalog')
--   AND indexname LIKE 'idx_%'
-- ORDER BY tablename, indexname;
