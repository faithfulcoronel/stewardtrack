-- =====================================================================================
-- MIGRATION: Fix ambiguous tenant_id reference in get_all_tenants_for_assignment
-- =====================================================================================
-- This migration fully qualifies tenant_id references to avoid ambiguity when
-- PostgREST expands the function with additional scope.
-- =====================================================================================
CREATE OR REPLACE FUNCTION get_all_tenants_for_assignment()
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
LANGUAGE sql
STABLE
AS $$
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
    SELECT MAX(la_inner.assigned_at) AS last_assigned
    FROM license_assignments la_inner
    WHERE la_inner.tenant_id = t.id
  ) la ON TRUE
  ORDER BY t.name;
$$;

COMMENT ON FUNCTION get_all_tenants_for_assignment IS 'Returns all tenants with current license status for assignment interface';
