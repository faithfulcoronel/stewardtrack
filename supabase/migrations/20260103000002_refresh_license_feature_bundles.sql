-- =====================================================================================
-- MIGRATION: Refresh License Feature Bundles
-- =====================================================================================
-- Deletes all existing bundle items and recreates bundles with updated feature codes.
-- This migration aligns the bundles with the new feature catalog codes
-- (e.g., members.core, households.core, etc.)
--
-- Bundles are organized by:
-- - Core Foundation: Essential tier features for all deployments
-- - Member Management: Member and household related features
-- - Financial Management: Finance related features
-- - RBAC & Security: Role-based access control features
-- - Communication Tools: Notification and messaging features
-- - Advanced Reporting: Enterprise reporting features
-- - Multi-Campus: Delegation and multi-campus features
-- =====================================================================================

BEGIN;

-- =====================================================================================
-- STEP 1: Delete all existing bundle items
-- =====================================================================================
DELETE FROM license_feature_bundle_items;

-- =====================================================================================
-- STEP 2: Soft-delete existing bundles and recreate them
-- =====================================================================================
UPDATE license_feature_bundles
SET deleted_at = now(),
    updated_at = now()
WHERE deleted_at IS NULL;

-- =====================================================================================
-- STEP 3: Insert new bundles (or reactivate if code matches)
-- =====================================================================================

-- Core Foundation Bundle
INSERT INTO license_feature_bundles (code, name, description, bundle_type, category, is_system, sort_order, is_active)
VALUES (
  'core-foundation',
  'Core Foundation',
  'Essential platform features available to all tiers. Includes member management, households, events, notifications, and basic reporting.',
  'core',
  'core',
  true,
  1,
  true
)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  bundle_type = EXCLUDED.bundle_type,
  category = EXCLUDED.category,
  is_system = EXCLUDED.is_system,
  sort_order = EXCLUDED.sort_order,
  is_active = EXCLUDED.is_active,
  deleted_at = NULL,
  updated_at = now();

-- Member Management Bundle
INSERT INTO license_feature_bundles (code, name, description, bundle_type, category, is_system, sort_order, is_active)
VALUES (
  'member-management',
  'Member Management',
  'Complete member lifecycle management including profiles, households, care plans, and discipleship pathways.',
  'module',
  'members',
  true,
  2,
  true
)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  bundle_type = EXCLUDED.bundle_type,
  category = EXCLUDED.category,
  is_system = EXCLUDED.is_system,
  sort_order = EXCLUDED.sort_order,
  is_active = EXCLUDED.is_active,
  deleted_at = NULL,
  updated_at = now();

-- Financial Management Bundle
INSERT INTO license_feature_bundles (code, name, description, bundle_type, category, is_system, sort_order, is_active)
VALUES (
  'financial-management',
  'Financial Management',
  'Comprehensive church financial tracking including transactions, budgets, and financial reporting.',
  'module',
  'finance',
  true,
  3,
  true
)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  bundle_type = EXCLUDED.bundle_type,
  category = EXCLUDED.category,
  is_system = EXCLUDED.is_system,
  sort_order = EXCLUDED.sort_order,
  is_active = EXCLUDED.is_active,
  deleted_at = NULL,
  updated_at = now();

-- RBAC & Security Bundle
INSERT INTO license_feature_bundles (code, name, description, bundle_type, category, is_system, sort_order, is_active)
VALUES (
  'rbac-security',
  'RBAC & Security',
  'Advanced role-based access control including role management, multi-role support, delegation, and audit trails.',
  'module',
  'security',
  true,
  4,
  true
)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  bundle_type = EXCLUDED.bundle_type,
  category = EXCLUDED.category,
  is_system = EXCLUDED.is_system,
  sort_order = EXCLUDED.sort_order,
  is_active = EXCLUDED.is_active,
  deleted_at = NULL,
  updated_at = now();

-- Communication Tools Bundle
INSERT INTO license_feature_bundles (code, name, description, bundle_type, category, is_system, sort_order, is_active)
VALUES (
  'communication-tools',
  'Communication Tools',
  'Member communication features including in-app notifications, push notifications, email, and SMS.',
  'add-on',
  'notification',
  true,
  5,
  true
)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  bundle_type = EXCLUDED.bundle_type,
  category = EXCLUDED.category,
  is_system = EXCLUDED.is_system,
  sort_order = EXCLUDED.sort_order,
  is_active = EXCLUDED.is_active,
  deleted_at = NULL,
  updated_at = now();

-- Advanced Reporting Bundle
INSERT INTO license_feature_bundles (code, name, description, bundle_type, category, is_system, sort_order, is_active)
VALUES (
  'advanced-reporting',
  'Advanced Reporting',
  'Enhanced analytics and custom report generation with scheduling capabilities.',
  'add-on',
  'reporting',
  true,
  6,
  true
)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  bundle_type = EXCLUDED.bundle_type,
  category = EXCLUDED.category,
  is_system = EXCLUDED.is_system,
  sort_order = EXCLUDED.sort_order,
  is_active = EXCLUDED.is_active,
  deleted_at = NULL,
  updated_at = now();

-- Multi-Campus Management Bundle
INSERT INTO license_feature_bundles (code, name, description, bundle_type, category, is_system, sort_order, is_active)
VALUES (
  'multi-campus',
  'Multi-Campus Management',
  'Features for managing multiple campuses including role delegation, scoped permissions, and campus-specific configurations.',
  'add-on',
  'security',
  true,
  7,
  true
)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  bundle_type = EXCLUDED.bundle_type,
  category = EXCLUDED.category,
  is_system = EXCLUDED.is_system,
  sort_order = EXCLUDED.sort_order,
  is_active = EXCLUDED.is_active,
  deleted_at = NULL,
  updated_at = now();

-- Integration Tools Bundle (New)
INSERT INTO license_feature_bundles (code, name, description, bundle_type, category, is_system, sort_order, is_active)
VALUES (
  'integration-tools',
  'Integration Tools',
  'External system integrations including API access, webhooks, and third-party service connections.',
  'add-on',
  'integration',
  true,
  8,
  true
)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  bundle_type = EXCLUDED.bundle_type,
  category = EXCLUDED.category,
  is_system = EXCLUDED.is_system,
  sort_order = EXCLUDED.sort_order,
  is_active = EXCLUDED.is_active,
  deleted_at = NULL,
  updated_at = now();

-- =====================================================================================
-- STEP 4: Map features to bundles using new feature codes
-- =====================================================================================

-- Core Foundation Bundle - Essential tier features
INSERT INTO license_feature_bundle_items (bundle_id, feature_id, is_required, display_order)
SELECT
  lfb.id,
  fc.id,
  true,
  ROW_NUMBER() OVER (ORDER BY fc.code)::integer
FROM license_feature_bundles lfb
CROSS JOIN feature_catalog fc
WHERE lfb.code = 'core-foundation'
  AND lfb.deleted_at IS NULL
  AND fc.deleted_at IS NULL
  AND fc.code IN (
    'members.core',
    'households.core',
    'groups.core',
    'events.core',
    'finance.core',
    'notifications.core',
    'integrations.email',
    'rbac.core',
    'settings.core',
    'dashboard.core',
    'reports.core'
  )
ON CONFLICT (bundle_id, feature_id) DO NOTHING;

-- Member Management Bundle
INSERT INTO license_feature_bundle_items (bundle_id, feature_id, is_required, display_order)
SELECT
  lfb.id,
  fc.id,
  CASE
    WHEN fc.code IN ('members.core', 'households.core') THEN true
    ELSE false
  END,
  ROW_NUMBER() OVER (ORDER BY fc.code)::integer
FROM license_feature_bundles lfb
CROSS JOIN feature_catalog fc
WHERE lfb.code = 'member-management'
  AND lfb.deleted_at IS NULL
  AND fc.deleted_at IS NULL
  AND fc.code IN (
    'members.core',
    'households.core',
    'members.invitations',
    'members.export',
    'members.bulk',
    'care.plans',
    'discipleship.plans'
  )
ON CONFLICT (bundle_id, feature_id) DO NOTHING;

-- Financial Management Bundle
INSERT INTO license_feature_bundle_items (bundle_id, feature_id, is_required, display_order)
SELECT
  lfb.id,
  fc.id,
  CASE
    WHEN fc.code = 'finance.core' THEN true
    ELSE false
  END,
  ROW_NUMBER() OVER (ORDER BY fc.code)::integer
FROM license_feature_bundles lfb
CROSS JOIN feature_catalog fc
WHERE lfb.code = 'financial-management'
  AND lfb.deleted_at IS NULL
  AND fc.deleted_at IS NULL
  AND fc.code IN (
    'finance.core',
    'finance.management',
    'finance.budgets'
  )
ON CONFLICT (bundle_id, feature_id) DO NOTHING;

-- RBAC & Security Bundle
INSERT INTO license_feature_bundle_items (bundle_id, feature_id, is_required, display_order)
SELECT
  lfb.id,
  fc.id,
  CASE
    WHEN fc.code = 'rbac.core' THEN true
    ELSE false
  END,
  ROW_NUMBER() OVER (ORDER BY fc.code)::integer
FROM license_feature_bundles lfb
CROSS JOIN feature_catalog fc
WHERE lfb.code = 'rbac-security'
  AND lfb.deleted_at IS NULL
  AND fc.deleted_at IS NULL
  AND fc.code IN (
    'rbac.core',
    'rbac.management',
    'rbac.multi_role',
    'rbac.delegation',
    'rbac.audit_export'
  )
ON CONFLICT (bundle_id, feature_id) DO NOTHING;

-- Communication Tools Bundle
INSERT INTO license_feature_bundle_items (bundle_id, feature_id, is_required, display_order)
SELECT
  lfb.id,
  fc.id,
  CASE
    WHEN fc.code = 'notifications.core' THEN true
    ELSE false
  END,
  ROW_NUMBER() OVER (ORDER BY fc.code)::integer
FROM license_feature_bundles lfb
CROSS JOIN feature_catalog fc
WHERE lfb.code = 'communication-tools'
  AND lfb.deleted_at IS NULL
  AND fc.deleted_at IS NULL
  AND fc.code IN (
    'notifications.core',
    'notifications.push',
    'notifications.scheduled',
    'integrations.email',
    'integrations.email_advanced',
    'integrations.sms'
  )
ON CONFLICT (bundle_id, feature_id) DO NOTHING;

-- Advanced Reporting Bundle
INSERT INTO license_feature_bundle_items (bundle_id, feature_id, is_required, display_order)
SELECT
  lfb.id,
  fc.id,
  CASE
    WHEN fc.code = 'reports.core' THEN true
    ELSE false
  END,
  ROW_NUMBER() OVER (ORDER BY fc.code)::integer
FROM license_feature_bundles lfb
CROSS JOIN feature_catalog fc
WHERE lfb.code = 'advanced-reporting'
  AND lfb.deleted_at IS NULL
  AND fc.deleted_at IS NULL
  AND fc.code IN (
    'reports.core',
    'reports.advanced'
  )
ON CONFLICT (bundle_id, feature_id) DO NOTHING;

-- Multi-Campus Management Bundle
INSERT INTO license_feature_bundle_items (bundle_id, feature_id, is_required, display_order)
SELECT
  lfb.id,
  fc.id,
  true,
  ROW_NUMBER() OVER (ORDER BY fc.code)::integer
FROM license_feature_bundles lfb
CROSS JOIN feature_catalog fc
WHERE lfb.code = 'multi-campus'
  AND lfb.deleted_at IS NULL
  AND fc.deleted_at IS NULL
  AND fc.code IN (
    'rbac.delegation',
    'rbac.multi_role'
  )
ON CONFLICT (bundle_id, feature_id) DO NOTHING;

-- Integration Tools Bundle
INSERT INTO license_feature_bundle_items (bundle_id, feature_id, is_required, display_order)
SELECT
  lfb.id,
  fc.id,
  CASE
    WHEN fc.code = 'integrations.email' THEN true
    ELSE false
  END,
  ROW_NUMBER() OVER (ORDER BY fc.code)::integer
FROM license_feature_bundles lfb
CROSS JOIN feature_catalog fc
WHERE lfb.code = 'integration-tools'
  AND lfb.deleted_at IS NULL
  AND fc.deleted_at IS NULL
  AND fc.code IN (
    'integrations.email',
    'integrations.email_advanced',
    'integrations.sms',
    'integrations.api'
  )
ON CONFLICT (bundle_id, feature_id) DO NOTHING;

-- =====================================================================================
-- STEP 5: Add events-related features to appropriate bundles
-- =====================================================================================

-- Add events features to Core Foundation
INSERT INTO license_feature_bundle_items (bundle_id, feature_id, is_required, display_order)
SELECT
  lfb.id,
  fc.id,
  false,
  100 + ROW_NUMBER() OVER (ORDER BY fc.code)::integer
FROM license_feature_bundles lfb
CROSS JOIN feature_catalog fc
WHERE lfb.code = 'core-foundation'
  AND lfb.deleted_at IS NULL
  AND fc.deleted_at IS NULL
  AND fc.code IN ('events.registration')
ON CONFLICT (bundle_id, feature_id) DO NOTHING;

-- =====================================================================================
-- STEP 6: Update bundle metadata with feature counts
-- =====================================================================================

UPDATE license_feature_bundles lfb
SET metadata = jsonb_build_object(
  'feature_count', (
    SELECT COUNT(*)
    FROM license_feature_bundle_items lfbi
    WHERE lfbi.bundle_id = lfb.id
  ),
  'required_feature_count', (
    SELECT COUNT(*)
    FROM license_feature_bundle_items lfbi
    WHERE lfbi.bundle_id = lfb.id AND lfbi.is_required = true
  ),
  'last_refreshed', now()
),
updated_at = now()
WHERE deleted_at IS NULL;

COMMIT;
