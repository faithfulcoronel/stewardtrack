-- =============================================================================
-- Migration: Add Goals & Objectives Core Feature
-- =============================================================================
-- This migration adds the goals.core feature to the feature catalog and
-- sets up the associated permissions for the Goals & Objectives OKR tracking
-- system.
--
-- Feature: goals.core
-- Tier: Essential (available to ALL license tiers)
-- Category: management
--
-- Permissions:
-- - goals:view - View staff-level goals and objectives
-- - goals:view_leadership - View leadership-level goals
-- - goals:view_all - View all goals including private
-- - goals:create - Create new goals
-- - goals:edit - Edit existing goals
-- - goals:delete - Delete goals
-- - objectives:manage - Create, edit, and delete objectives
-- - key_results:manage - Create, edit, and delete key results
-- - key_results:record_progress - Record progress updates on key results
-- =============================================================================

BEGIN;

-- =============================================================================
-- STEP 1: Add goals.core feature to feature_catalog
-- =============================================================================

INSERT INTO feature_catalog (code, name, category, description, tier, is_active, phase)
VALUES (
  'goals.core',
  'Goals & Objectives',
  'management',
  'Strategic goal setting with OKR tracking, customizable categories, progress updates, and calendar integration',
  'essential',
  true,
  'ga'
)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  description = EXCLUDED.description,
  tier = EXCLUDED.tier,
  is_active = EXCLUDED.is_active,
  deleted_at = NULL,
  updated_at = now();

-- =============================================================================
-- STEP 2: Add goals.core permissions to feature_permissions
-- =============================================================================

-- Helper function to insert permissions for a feature (if not exists)
CREATE OR REPLACE FUNCTION insert_goals_feature_permission(
  p_feature_code text,
  p_permission_code text,
  p_display_name text,
  p_description text,
  p_is_required boolean DEFAULT true,
  p_display_order integer DEFAULT 0
)
RETURNS void AS $$
DECLARE
  v_feature_id uuid;
  v_category text;
  v_action text;
BEGIN
  -- Get feature ID
  SELECT id INTO v_feature_id
  FROM feature_catalog
  WHERE code = p_feature_code AND deleted_at IS NULL;

  IF v_feature_id IS NULL THEN
    RAISE NOTICE 'Feature not found: %', p_feature_code;
    RETURN;
  END IF;

  -- Extract category and action from permission code
  v_category := split_part(p_permission_code, ':', 1);
  v_action := split_part(p_permission_code, ':', 2);

  -- Insert permission
  INSERT INTO feature_permissions (
    feature_id, permission_code, display_name, description,
    category, action, is_required, display_order
  )
  VALUES (
    v_feature_id, p_permission_code, p_display_name, p_description,
    v_category, v_action, p_is_required, p_display_order
  )
  ON CONFLICT (feature_id, permission_code) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    description = EXCLUDED.description,
    category = EXCLUDED.category,
    action = EXCLUDED.action,
    is_required = EXCLUDED.is_required,
    display_order = EXCLUDED.display_order,
    updated_at = now();
END;
$$ LANGUAGE plpgsql;

-- Goals permissions
SELECT insert_goals_feature_permission('goals.core', 'goals:view', 'View Goals', 'View staff-level goals and objectives', true, 1);
SELECT insert_goals_feature_permission('goals.core', 'goals:view_leadership', 'View Leadership Goals', 'View leadership-level goals', false, 2);
SELECT insert_goals_feature_permission('goals.core', 'goals:view_all', 'View All Goals', 'View all goals including private', false, 3);
SELECT insert_goals_feature_permission('goals.core', 'goals:create', 'Create Goals', 'Create new goals', true, 4);
SELECT insert_goals_feature_permission('goals.core', 'goals:edit', 'Edit Goals', 'Edit existing goals', true, 5);
SELECT insert_goals_feature_permission('goals.core', 'goals:delete', 'Delete Goals', 'Delete goals', false, 6);

-- Objectives permissions
SELECT insert_goals_feature_permission('goals.core', 'objectives:manage', 'Manage Objectives', 'Create, edit, and delete objectives', true, 7);

-- Key Results permissions
SELECT insert_goals_feature_permission('goals.core', 'key_results:manage', 'Manage Key Results', 'Create, edit, and delete key results', true, 8);
SELECT insert_goals_feature_permission('goals.core', 'key_results:record_progress', 'Record Progress', 'Record progress updates on key results', true, 9);

-- Clean up helper function
DROP FUNCTION IF EXISTS insert_goals_feature_permission(text, text, text, text, boolean, integer);

-- =============================================================================
-- STEP 3: Link feature to product offerings
-- =============================================================================
-- Since goals.core is an 'essential' tier feature, it will be automatically
-- included in all product offerings through the existing tier-based feature
-- assignment logic in 20260103050000_reset_product_offerings_with_multi_currency.sql
--
-- The assignment happens via:
-- INSERT INTO product_offering_features (offering_id, feature_id, is_required)
-- SELECT po.id, fc.id, true
-- FROM product_offerings po
-- CROSS JOIN feature_catalog fc
-- WHERE po.tier = 'essential'
--   AND fc.tier = 'essential'
--   AND fc.deleted_at IS NULL
--   AND fc.is_active = true
--
-- We need to manually add this new feature to all existing product offerings
-- =============================================================================

-- Add goals.core to all Essential tier offerings (gets essential features)
INSERT INTO product_offering_features (offering_id, feature_id, is_required)
SELECT po.id, fc.id, true
FROM product_offerings po
CROSS JOIN feature_catalog fc
WHERE po.tier = 'essential'
  AND fc.code = 'goals.core'
  AND fc.deleted_at IS NULL
  AND fc.is_active = true
ON CONFLICT DO NOTHING;

-- Add goals.core to all Premium tier offerings (gets essential + premium features)
INSERT INTO product_offering_features (offering_id, feature_id, is_required)
SELECT po.id, fc.id, true
FROM product_offerings po
CROSS JOIN feature_catalog fc
WHERE po.tier = 'premium'
  AND fc.code = 'goals.core'
  AND fc.deleted_at IS NULL
  AND fc.is_active = true
ON CONFLICT DO NOTHING;

-- Add goals.core to all Professional tier offerings (gets essential + premium + professional features)
INSERT INTO product_offering_features (offering_id, feature_id, is_required)
SELECT po.id, fc.id, true
FROM product_offerings po
CROSS JOIN feature_catalog fc
WHERE po.tier = 'professional'
  AND fc.code = 'goals.core'
  AND fc.deleted_at IS NULL
  AND fc.is_active = true
ON CONFLICT DO NOTHING;

-- Add goals.core to all Enterprise tier offerings (gets ALL features)
INSERT INTO product_offering_features (offering_id, feature_id, is_required)
SELECT po.id, fc.id, true
FROM product_offerings po
CROSS JOIN feature_catalog fc
WHERE po.tier = 'enterprise'
  AND fc.code = 'goals.core'
  AND fc.deleted_at IS NULL
  AND fc.is_active = true
ON CONFLICT DO NOTHING;

-- =============================================================================
-- STEP 4: Grant feature to existing tenants with active licenses
-- =============================================================================
-- Grant the goals.core feature to all tenants that have an active license
-- This ensures existing customers get access to the new feature immediately
-- Uses feature_id (UUID) and grant_source as per tenant_feature_grants schema
-- =============================================================================

INSERT INTO tenant_feature_grants (tenant_id, feature_id, grant_source, starts_at)
SELECT DISTINCT
  t.id,
  fc.id,
  'direct',
  CURRENT_DATE
FROM tenants t
CROSS JOIN feature_catalog fc
WHERE fc.code = 'goals.core'
  AND fc.deleted_at IS NULL
  AND t.deleted_at IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM tenant_feature_grants tfg
    WHERE tfg.tenant_id = t.id
      AND tfg.feature_id = fc.id
  )
ON CONFLICT DO NOTHING;

COMMIT;
