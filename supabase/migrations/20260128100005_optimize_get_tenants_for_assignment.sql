-- =============================================================================
-- Migration: Optimize get_all_tenants_for_assignment RPC
-- =============================================================================
-- Description: Optimizes the query to avoid statement timeouts by using
-- more efficient aggregation patterns instead of multiple LATERAL joins.
-- =============================================================================

-- Drop the existing function first
DROP FUNCTION IF EXISTS get_all_tenants_for_assignment();

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
  last_assignment_date timestamptz,
  user_count bigint,
  member_count bigint,
  created_at timestamptz,
  last_activity timestamptz,
  tenant_logo_url text
)
LANGUAGE sql
STABLE
AS $$
  WITH
  user_counts AS (
    SELECT tenant_id, COUNT(*) AS cnt
    FROM tenant_users
    GROUP BY tenant_id
  ),
  member_counts AS (
    SELECT tenant_id, COUNT(*) AS cnt
    FROM members
    WHERE deleted_at IS NULL
    GROUP BY tenant_id
  ),
  feature_counts AS (
    SELECT tenant_id, COUNT(*) AS cnt
    FROM tenant_feature_grants
    WHERE (starts_at IS NULL OR starts_at <= CURRENT_DATE)
      AND (expires_at IS NULL OR expires_at >= CURRENT_DATE)
    GROUP BY tenant_id
  ),
  last_assignments AS (
    SELECT tenant_id, MAX(assigned_at) AS last_assigned
    FROM license_assignments
    GROUP BY tenant_id
  ),
  tenant_stats AS (
    SELECT
      t.id,
      COALESCE(uc.cnt, 0) AS user_count,
      COALESCE(mc.cnt, 0) AS member_count,
      COALESCE(fc.cnt, 0) AS feature_count,
      la.last_assigned AS last_assignment_date,
      t.updated_at AS last_activity
    FROM tenants t
    LEFT JOIN user_counts uc ON uc.tenant_id = t.id
    LEFT JOIN member_counts mc ON mc.tenant_id = t.id
    LEFT JOIN feature_counts fc ON fc.tenant_id = t.id
    LEFT JOIN last_assignments la ON la.tenant_id = t.id
    WHERE t.deleted_at IS NULL
  )
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
    COALESCE(ts.feature_count, 0) AS feature_count,
    ts.last_assignment_date,
    COALESCE(ts.user_count, 0) AS user_count,
    COALESCE(ts.member_count, 0) AS member_count,
    t.created_at,
    ts.last_activity,
    t.logo_url AS tenant_logo_url
  FROM tenants t
  LEFT JOIN product_offerings po ON po.id = t.subscription_offering_id
  LEFT JOIN tenant_stats ts ON ts.id = t.id
  WHERE t.deleted_at IS NULL
  ORDER BY t.name;
$$;

-- Add indexes for better performance (if not already exist)
CREATE INDEX IF NOT EXISTS idx_tenant_users_tenant_id ON tenant_users(tenant_id);
CREATE INDEX IF NOT EXISTS idx_members_tenant_id ON members(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_feature_grants_tenant_id ON tenant_feature_grants(tenant_id);
CREATE INDEX IF NOT EXISTS idx_license_assignments_tenant_id ON license_assignments(tenant_id);

COMMENT ON FUNCTION get_all_tenants_for_assignment IS
  'Returns all tenants with current license status, user counts, member counts,
   activity information, and logo URL for the assignment and management interface.
   Optimized with CTE for better performance.';
