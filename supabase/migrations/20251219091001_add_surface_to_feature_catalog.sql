-- =====================================================================================
-- MIGRATION: Add Surface Association to Feature Catalog
-- =====================================================================================
-- Adds surface_id, surface_type, and module columns to feature_catalog
-- to enable Product Owners to associate features with metadata surfaces
--
-- Part of: Feature Creation with Surface ID & Permission Definition
-- Phase: 1 (Foundation)
-- =====================================================================================

BEGIN;

-- Add new columns to feature_catalog
ALTER TABLE feature_catalog
  ADD COLUMN surface_id text,
  ADD COLUMN surface_type text CHECK (surface_type IN (
    'page', 'dashboard', 'wizard', 'manager', 'console', 'audit', 'overlay'
  )),
  ADD COLUMN module text;

-- Add unique constraint on surface_id (surfaces must be unique system-wide)
CREATE UNIQUE INDEX feature_catalog_surface_id_unique_idx
  ON feature_catalog(surface_id)
  WHERE surface_id IS NOT NULL;

-- Add indexes for performance
CREATE INDEX feature_catalog_surface_id_idx
  ON feature_catalog(surface_id)
  WHERE surface_id IS NOT NULL;

CREATE INDEX feature_catalog_module_idx
  ON feature_catalog(module)
  WHERE module IS NOT NULL;

-- Add comments for documentation
COMMENT ON COLUMN feature_catalog.surface_id IS
  'Associated metadata surface ID (e.g., admin/members/directory). Must be unique across system. Format: {module}/{feature-name}';

COMMENT ON COLUMN feature_catalog.surface_type IS
  'Type of UI surface: page, dashboard, wizard, manager, console, audit, or overlay. Indicates how the feature is presented in the UI.';

COMMENT ON COLUMN feature_catalog.module IS
  'Module grouping for organization (e.g., admin-members, admin-finance). Used to group related features together.';

COMMIT;
