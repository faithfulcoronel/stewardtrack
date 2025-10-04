-- =====================================================================================
-- MIGRATION: Fix RLS for License Assignment Function
-- =====================================================================================
-- This migration updates the get_all_tenants_for_assignment function to run with
-- SECURITY DEFINER privileges, allowing super_admins to access all tenants for
-- license assignment without being blocked by RLS policies.
--
-- The function will check internally that the caller is a super_admin before
-- returning data, maintaining security while allowing the needed functionality.
-- =====================================================================================

-- Drop the existing function
DROP FUNCTION IF EXISTS get_all_tenants_for_assignment();

-- Recreate with SECURITY DEFINER and admin role check
CREATE FUNCTION get_all_tenants_for_assignment()
RETURNS TABLE (
  tenant_id uuid,
  tenant_name text,
  tenant_subdomain text,
  tenant_status text,
  subscription_tier text,
  subscription_status text,
  current_offering_id uuid,
  current_offering_name text,
  current_offering_tier text,
  feature_count bigint,
  last_assignment_date timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  -- Only allow super_admins to view all tenants
  IF get_user_admin_role() != 'super_admin' THEN
    RAISE EXCEPTION 'Access denied. Only super admins can view all tenants for license assignment.';
  END IF;

  -- Return all tenants with their license information
  RETURN QUERY
  SELECT
    t.id AS tenant_id,
    t.name AS tenant_name,
    t.subdomain AS tenant_subdomain,
    t.status AS tenant_status,
    t.subscription_tier,
    t.subscription_status,
    po.id AS current_offering_id,
    po.name AS current_offering_name,
    po.tier AS current_offering_tier,
    COALESCE(fc.feature_count, 0) AS feature_count,
    la.last_assigned AS last_assignment_date
  FROM tenants t
  LEFT JOIN product_offerings po ON po.id = t.subscription_offering_id
  LEFT JOIN LATERAL (
    SELECT COUNT(*) AS feature_count
    FROM tenant_feature_grants tfg
    WHERE tfg.tenant_id = t.id
      AND (tfg.starts_at IS NULL OR tfg.starts_at <= CURRENT_DATE)
      AND (tfg.expires_at IS NULL OR tfg.expires_at >= CURRENT_DATE)
  ) fc ON TRUE
  LEFT JOIN LATERAL (
    SELECT MAX(la_subquery.assigned_at) AS last_assigned
    FROM license_assignments la_subquery
    WHERE la_subquery.tenant_id = t.id
  ) la ON TRUE
  ORDER BY t.name;
END;
$$;

COMMENT ON FUNCTION get_all_tenants_for_assignment IS 'Returns all tenants with current license status for assignment interface. Only accessible by super_admins.';

-- Grant execute permission to authenticated users (function will check role internally)
GRANT EXECUTE ON FUNCTION get_all_tenants_for_assignment() TO authenticated;

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';
