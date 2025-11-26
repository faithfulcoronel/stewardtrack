/**
 * Remove Permission Bundles - RBAC Simplification
 *
 * This migration eliminates the permission bundle layer from the RBAC system,
 * simplifying it from a 3-layer to a 2-layer architecture:
 *
 * BEFORE: Features → Permissions → Bundles → Roles
 * AFTER:  Features → Permissions → Roles
 *
 * Note: These tables may not exist if bundle functionality was never implemented in the database.
 * This migration safely attempts to drop them if they exist.
 *
 * Date: 2025-10-22
 * Author: System Simplification Initiative
 */

-- ============================================================================
-- Drop bundle-related tables if they exist
-- ============================================================================

-- Drop tables in correct order (foreign keys first)
-- Using CASCADE to remove any dependent objects
-- Using IF EXISTS to safely handle case where tables were never created

-- Drop the association tables first (foreign keys)
DROP TABLE IF EXISTS role_bundle_assignments CASCADE;
DROP TABLE IF EXISTS permission_bundle_permissions CASCADE;
DROP TABLE IF EXISTS role_bundles CASCADE;
DROP TABLE IF EXISTS bundle_permissions CASCADE;

-- Drop the main bundle table
DROP TABLE IF EXISTS permission_bundles CASCADE;

-- ============================================================================
-- Success confirmation
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE 'Permission bundle tables removal complete. RBAC architecture simplified to 2-layer model.';
END $$;
