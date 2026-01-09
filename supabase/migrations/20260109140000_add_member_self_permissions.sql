-- =============================================================================
-- Migration: Add Member Self-Service Feature
-- =============================================================================
-- This migration adds the members.self-service feature to the feature catalog
-- and sets up the associated permissions for member profile self-view and
-- self-edit capabilities.
--
-- Feature: members.self-service
-- Tier: Essential (available to ALL license tiers)
-- Category: members
--
-- Permissions:
-- - members:view_self - View own profile information
-- - members:edit_self - Edit limited fields on own profile
-- =============================================================================

BEGIN;

-- =============================================================================
-- STEP 1: Add members.self-service feature to feature_catalog
-- =============================================================================

INSERT INTO feature_catalog (code, name, category, description, tier, is_active, phase)
VALUES (
  'members.self-service',
  'Member Self-Service Portal',
  'members',
  'Allows members to view and update their own profile information with mobile-first card-based layout',
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
-- STEP 2: Add members.self-service permissions to feature_permissions
-- =============================================================================

-- Helper function to insert permissions for a feature (if not exists)
CREATE OR REPLACE FUNCTION insert_member_self_service_permission(
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

-- Member self-service permissions
SELECT insert_member_self_service_permission('members.self-service', 'members:view_self', 'View Own Profile', 'Member can view their own profile information', true, 1);
SELECT insert_member_self_service_permission('members.self-service', 'members:edit_self', 'Edit Own Profile', 'Member can edit limited fields on their own profile', true, 2);

-- Clean up helper function
DROP FUNCTION IF EXISTS insert_member_self_service_permission(text, text, text, text, boolean, integer);

-- =============================================================================
-- STEP 3: Link feature to product offerings
-- =============================================================================
-- Since members.self-service is an 'essential' tier feature, it should be
-- included in all product offerings through the existing tier-based feature
-- assignment logic.
--
-- We need to manually add this new feature to all existing product offerings
-- =============================================================================

-- Add members.self-service to all Essential tier offerings (gets essential features)
INSERT INTO product_offering_features (offering_id, feature_id, is_required)
SELECT po.id, fc.id, true
FROM product_offerings po
CROSS JOIN feature_catalog fc
WHERE po.tier = 'essential'
  AND fc.code = 'members.self-service'
  AND fc.deleted_at IS NULL
  AND fc.is_active = true
ON CONFLICT DO NOTHING;

-- Add members.self-service to all Premium tier offerings (gets essential + premium features)
INSERT INTO product_offering_features (offering_id, feature_id, is_required)
SELECT po.id, fc.id, true
FROM product_offerings po
CROSS JOIN feature_catalog fc
WHERE po.tier = 'premium'
  AND fc.code = 'members.self-service'
  AND fc.deleted_at IS NULL
  AND fc.is_active = true
ON CONFLICT DO NOTHING;

-- Add members.self-service to all Professional tier offerings (gets essential + premium + professional features)
INSERT INTO product_offering_features (offering_id, feature_id, is_required)
SELECT po.id, fc.id, true
FROM product_offerings po
CROSS JOIN feature_catalog fc
WHERE po.tier = 'professional'
  AND fc.code = 'members.self-service'
  AND fc.deleted_at IS NULL
  AND fc.is_active = true
ON CONFLICT DO NOTHING;

-- Add members.self-service to all Enterprise tier offerings (gets ALL features)
INSERT INTO product_offering_features (offering_id, feature_id, is_required)
SELECT po.id, fc.id, true
FROM product_offerings po
CROSS JOIN feature_catalog fc
WHERE po.tier = 'enterprise'
  AND fc.code = 'members.self-service'
  AND fc.deleted_at IS NULL
  AND fc.is_active = true
ON CONFLICT DO NOTHING;

-- =============================================================================
-- STEP 4: Add permission role templates
-- =============================================================================
-- These define the default permission assignments for each role template
-- All roles should have access to view and edit their own profile
-- Uses direct INSERT since the helper function was cleaned up in seed migration
-- =============================================================================

INSERT INTO permission_role_templates (feature_permission_id, role_key, is_recommended, reason)
SELECT
  fp.id,
  r.role_key,
  true,
  r.reason
FROM feature_permissions fp
JOIN feature_catalog fc ON fp.feature_id = fc.id
CROSS JOIN (
  VALUES
    ('members:view_self', 'member', 'Members can view their own profile'),
    ('members:view_self', 'volunteer', 'Volunteers can view their own profile'),
    ('members:view_self', 'staff', 'Staff can view their own profile'),
    ('members:view_self', 'tenant_admin', 'Admins can view their own profile'),
    ('members:edit_self', 'member', 'Members can update their own profile'),
    ('members:edit_self', 'volunteer', 'Volunteers can update their own profile'),
    ('members:edit_self', 'staff', 'Staff can update their own profile'),
    ('members:edit_self', 'tenant_admin', 'Admins can update their own profile')
) AS r(permission_code, role_key, reason)
WHERE fp.permission_code = r.permission_code
  AND fc.deleted_at IS NULL
ON CONFLICT (feature_permission_id, role_key) DO UPDATE SET
  is_recommended = EXCLUDED.is_recommended,
  reason = EXCLUDED.reason,
  updated_at = now();

-- =============================================================================
-- STEP 5: Grant feature to existing tenants with active licenses
-- =============================================================================
-- Grant the members.self-service feature to all tenants that have an active
-- license. This ensures existing customers get access to the new feature.
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
WHERE fc.code = 'members.self-service'
  AND fc.deleted_at IS NULL
  AND t.deleted_at IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM tenant_feature_grants tfg
    WHERE tfg.tenant_id = t.id
      AND tfg.feature_id = fc.id
  )
ON CONFLICT DO NOTHING;

COMMIT;
