-- =============================================================================
-- Migration: Fix user_has_permission_for_tenant to handle NULL tenant_id
-- =============================================================================
-- Description: The user_has_permission_for_tenant function was failing when
-- role_permissions.tenant_id is NULL (for system-wide roles like tenant_admin).
-- The JOIN condition "ur.tenant_id = rp.tenant_id" fails with NULL values.
--
-- Fix: Change the JOIN to allow NULL tenant_id in role_permissions, which
-- indicates the permission applies to all tenants.
--
-- Issue: Function returns false even when user has the required role and
-- permission, because role_permissions.tenant_id is NULL for system roles.
--
-- Solution: Use (rp.tenant_id = ur.tenant_id OR rp.tenant_id IS NULL)
-- =============================================================================

BEGIN;

-- =============================================================================
-- STEP 1: Fix user_has_permission_for_tenant function
-- =============================================================================
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
    JOIN role_permissions rp ON ur.role_id = rp.role_id
      AND (rp.tenant_id = ur.tenant_id OR rp.tenant_id IS NULL)
    JOIN permissions p ON rp.permission_id = p.id
    WHERE ur.user_id = auth.uid()
      AND ur.tenant_id = p_tenant_id
      AND p.code = p_permission_code
  );
END;
$$;

COMMENT ON FUNCTION user_has_permission_for_tenant(uuid, text) IS
  'Checks if the current user has a specific permission for a given tenant. '
  'Used in RLS policies. Uses row_security=off to avoid nested RLS issues. '
  'Supports NULL tenant_id in role_permissions for system-wide permissions.';

-- =============================================================================
-- STEP 2: Fix user_has_any_permission_for_tenant function
-- =============================================================================
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
    JOIN role_permissions rp ON ur.role_id = rp.role_id
      AND (rp.tenant_id = ur.tenant_id OR rp.tenant_id IS NULL)
    JOIN permissions p ON rp.permission_id = p.id
    WHERE ur.user_id = auth.uid()
      AND ur.tenant_id = p_tenant_id
      AND p.code = ANY(p_permission_codes)
  );
END;
$$;

COMMENT ON FUNCTION user_has_any_permission_for_tenant(uuid, text[]) IS
  'Checks if the current user has ANY of the specified permissions for a tenant. '
  'Used in RLS policies. Uses row_security=off to avoid nested RLS issues. '
  'Supports NULL tenant_id in role_permissions for system-wide permissions.';

-- =============================================================================
-- STEP 3: Success message
-- =============================================================================
DO $$
BEGIN
  RAISE NOTICE 'Fixed user_has_permission_for_tenant to handle NULL tenant_id in role_permissions';
END $$;

COMMIT;
