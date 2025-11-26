/**
 * Remove Additional Bundle Tables - RBAC Simplification Completion
 *
 * This migration completes the bundle removal by dropping two additional
 * bundle-related tables that were identified:
 * - role_bundles
 * - bundle_permissions
 *
 * These are separate from the permission_bundles/permission_bundle_permissions
 * tables removed in the previous migration.
 *
 * Date: 2025-10-22
 * Author: System Simplification Initiative
 */

-- ============================================================================
-- Drop additional bundle-related tables
-- ============================================================================

-- Drop the additional bundle tables if they exist
DROP TABLE IF EXISTS role_bundles CASCADE;
DROP TABLE IF EXISTS bundle_permissions CASCADE;

-- ============================================================================
-- Success confirmation
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE 'Additional bundle tables (role_bundles, bundle_permissions) removal complete.';
END $$;
