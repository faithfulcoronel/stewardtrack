-- =====================================================================================
-- MIGRATION: Drop Menu Items Tables
-- =====================================================================================
-- This migration removes menu_items and related tables.
--
-- Background:
-- - WRONG APPROACH: menu_items table (database-driven navigation)
-- - CORRECT APPROACH: Static metadata XML files with navigation elements
-- - Menus/navigation must be defined in metadata XML, NOT stored in database
--
-- Tables to Drop:
-- 1. menu_permissions - Menu permission mappings
-- 2. role_menu_items - Role-based menu item assignments
-- 3. menu_items - Dynamic menu item definitions
--
-- Architecture Principle:
-- All navigation, menus, and UI structure must be defined in static metadata XML files
-- under metadata/authoring/blueprints/, not stored in database tables.
-- =====================================================================================

-- =====================================================================================
-- STEP 1: Drop relationship tables first
-- =====================================================================================

DROP TABLE IF EXISTS menu_permissions CASCADE;
DROP TABLE IF EXISTS role_menu_items CASCADE;

-- =====================================================================================
-- STEP 2: Drop main menu_items table
-- =====================================================================================

DROP TABLE IF EXISTS menu_items CASCADE;

-- =====================================================================================
-- VERIFICATION: Static Metadata Navigation
-- =====================================================================================
-- Navigation is now controlled via:
-- 1. metadata/authoring/blueprints/**/*.xml - Page definitions with navigation
-- 2. Metadata XML elements can define menu items, sidebars, etc.
-- 3. featureCode attribute - License check (tenant-level)
-- 4. requiredPermissions attribute - Permission check (user-level)
-- 5. RBAC allow/deny attributes - Role check
-- =====================================================================================
