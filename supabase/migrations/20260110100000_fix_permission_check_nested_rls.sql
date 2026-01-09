-- Migration: Fix nested RLS issue in user_has_permission_for_tenant function
--
-- Issue: When user_has_permission_for_tenant is called from within an RLS policy
-- (e.g., family_members UPDATE policy), the nested queries to user_roles,
-- role_permissions, and permissions tables are also subject to RLS.
-- This causes the permission check to fail even when the user has the permission.
--
-- Solution: Update the function to bypass RLS when querying permission tables.
-- This is safe because:
-- 1. The function already uses SECURITY DEFINER
-- 2. The function only returns a boolean (true/false), no sensitive data
-- 3. The function is specifically designed for RLS policy use
--
-- Date: 2026-01-10

BEGIN;

-- ============================================================================
-- STEP 1: Recreate the function with RLS bypass
-- ============================================================================
CREATE OR REPLACE FUNCTION user_has_permission_for_tenant(
  p_tenant_id uuid,
  p_permission_code text
)
RETURNS boolean
SECURITY DEFINER
SET search_path = public
SET row_security = off  -- Bypass RLS for nested queries
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM user_roles ur
    JOIN role_permissions rp ON ur.role_id = rp.role_id AND ur.tenant_id = rp.tenant_id
    JOIN permissions p ON rp.permission_id = p.id
    WHERE ur.user_id = auth.uid()
      AND ur.tenant_id = p_tenant_id
      AND p.code = p_permission_code
  );
END;
$$;

COMMENT ON FUNCTION user_has_permission_for_tenant(uuid, text) IS
  'Checks if the current user has a specific permission for a given tenant. '
  'Used in RLS policies. Uses row_security=off to avoid nested RLS issues.';

-- Ensure authenticated users can execute this function
GRANT EXECUTE ON FUNCTION user_has_permission_for_tenant(uuid, text) TO authenticated;

-- ============================================================================
-- STEP 2: Also fix the user_has_any_permission_for_tenant function
-- ============================================================================
CREATE OR REPLACE FUNCTION user_has_any_permission_for_tenant(
  p_tenant_id uuid,
  p_permission_codes text[]
)
RETURNS boolean
SECURITY DEFINER
SET search_path = public
SET row_security = off  -- Bypass RLS for nested queries
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM user_roles ur
    JOIN role_permissions rp ON ur.role_id = rp.role_id AND ur.tenant_id = rp.tenant_id
    JOIN permissions p ON rp.permission_id = p.id
    WHERE ur.user_id = auth.uid()
      AND ur.tenant_id = p_tenant_id
      AND p.code = ANY(p_permission_codes)
  );
END;
$$;

COMMENT ON FUNCTION user_has_any_permission_for_tenant(uuid, text[]) IS
  'Checks if the current user has ANY of the specified permissions for a tenant. '
  'Used in RLS policies. Uses row_security=off to avoid nested RLS issues.';

-- Ensure authenticated users can execute this function
GRANT EXECUTE ON FUNCTION user_has_any_permission_for_tenant(uuid, text[]) TO authenticated;

-- ============================================================================
-- Success message
-- ============================================================================
DO $$
BEGIN
  RAISE NOTICE 'Fixed nested RLS issue in permission check functions';
END $$;

COMMIT;
