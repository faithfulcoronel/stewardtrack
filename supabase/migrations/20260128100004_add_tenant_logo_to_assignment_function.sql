-- =============================================================================
-- Migration: Add tenant_logo_url to get_all_tenants_for_assignment RPC
-- =============================================================================
-- Description: Adds tenant_logo_url field to support displaying tenant logos
-- in the License Assignments AG Grid.
-- =============================================================================

-- Drop the existing function first to allow changing the return type
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
  -- New field for tenant logo
  tenant_logo_url text
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
    la.last_assigned AS last_assignment_date,
    COALESCE(uc.user_count, 0) AS user_count,
    COALESCE(mc.member_count, 0) AS member_count,
    t.created_at AS created_at,
    activity.last_activity AS last_activity,
    -- New field: tenant logo URL
    t.logo_url AS tenant_logo_url
  FROM tenants t
  LEFT JOIN product_offerings po ON po.id = t.subscription_offering_id
  -- Feature count subquery
  LEFT JOIN LATERAL (
    SELECT COUNT(*) AS feature_count
    FROM tenant_feature_grants tfg
    WHERE tfg.tenant_id = t.id
      AND (tfg.starts_at IS NULL OR tfg.starts_at <= CURRENT_DATE)
      AND (tfg.expires_at IS NULL OR tfg.expires_at >= CURRENT_DATE)
  ) fc ON TRUE
  -- Last assignment date subquery
  LEFT JOIN LATERAL (
    SELECT MAX(la_inner.assigned_at) AS last_assigned
    FROM license_assignments la_inner
    WHERE la_inner.tenant_id = t.id
  ) la ON TRUE
  -- User count subquery
  LEFT JOIN LATERAL (
    SELECT COUNT(*) AS user_count
    FROM tenant_users tu
    WHERE tu.tenant_id = t.id
  ) uc ON TRUE
  -- Member count subquery
  LEFT JOIN LATERAL (
    SELECT COUNT(*) AS member_count
    FROM members m
    WHERE m.tenant_id = t.id
      AND m.deleted_at IS NULL
  ) mc ON TRUE
  -- Last activity subquery (most recent of various activity timestamps)
  LEFT JOIN LATERAL (
    SELECT GREATEST(
      t.updated_at,
      -- Most recent user activity
      (SELECT MAX(tu.created_at) FROM tenant_users tu WHERE tu.tenant_id = t.id),
      -- Most recent member activity
      (SELECT MAX(COALESCE(m.updated_at, m.created_at)) FROM members m WHERE m.tenant_id = t.id),
      -- Most recent donation
      (SELECT MAX(d.created_at) FROM donations d WHERE d.tenant_id = t.id),
      -- Most recent audit log
      (SELECT MAX(al.created_at) FROM audit_logs al WHERE al.tenant_id = t.id)
    ) AS last_activity
  ) activity ON TRUE
  WHERE t.deleted_at IS NULL
  ORDER BY t.name;
$$;

COMMENT ON FUNCTION get_all_tenants_for_assignment IS
  'Returns all tenants with current license status, user counts, member counts,
   activity information, and logo URL for the assignment and management interface';
