-- =====================================================
-- Fix Member Reports RPC Functions
-- Update to use membership_status_id join instead of
-- deprecated 'status' column
-- =====================================================

-- =====================================================
-- 1. GET MEMBERSHIP OVERVIEW METRICS
-- Returns key metrics: total members, active, new this month, etc.
-- =====================================================
CREATE OR REPLACE FUNCTION get_membership_overview_metrics(p_tenant_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result JSON;
  v_total_members INT;
  v_active_members INT;
  v_inactive_members INT;
  v_visitors INT;
  v_new_this_month INT;
  v_new_this_year INT;
  v_total_families INT;
  v_avg_family_size NUMERIC;
BEGIN
  -- Total members (excluding soft-deleted)
  SELECT COUNT(*) INTO v_total_members
  FROM members
  WHERE tenant_id = p_tenant_id AND deleted_at IS NULL;

  -- Active members (join with membership_status)
  SELECT COUNT(*) INTO v_active_members
  FROM members m
  LEFT JOIN membership_status ms ON m.membership_status_id = ms.id
  WHERE m.tenant_id = p_tenant_id
    AND m.deleted_at IS NULL
    AND (ms.code = 'active' OR m.membership_status_id IS NULL);

  -- Inactive members
  SELECT COUNT(*) INTO v_inactive_members
  FROM members m
  JOIN membership_status ms ON m.membership_status_id = ms.id
  WHERE m.tenant_id = p_tenant_id
    AND m.deleted_at IS NULL
    AND ms.code IN ('inactive', 'withdrawn', 'removed');

  -- Visitors
  SELECT COUNT(*) INTO v_visitors
  FROM members m
  JOIN membership_status ms ON m.membership_status_id = ms.id
  WHERE m.tenant_id = p_tenant_id
    AND m.deleted_at IS NULL
    AND ms.code = 'visitor';

  -- New members this month
  SELECT COUNT(*) INTO v_new_this_month
  FROM members
  WHERE tenant_id = p_tenant_id
    AND deleted_at IS NULL
    AND created_at >= DATE_TRUNC('month', CURRENT_DATE);

  -- New members this year
  SELECT COUNT(*) INTO v_new_this_year
  FROM members
  WHERE tenant_id = p_tenant_id
    AND deleted_at IS NULL
    AND created_at >= DATE_TRUNC('year', CURRENT_DATE);

  -- Total families
  SELECT COUNT(*) INTO v_total_families
  FROM families
  WHERE tenant_id = p_tenant_id AND deleted_at IS NULL;

  -- Average family size
  SELECT AVG(member_count)::NUMERIC(10,1) INTO v_avg_family_size
  FROM (
    SELECT fm.family_id, COUNT(*) as member_count
    FROM family_members fm
    WHERE fm.tenant_id = p_tenant_id
      AND fm.is_active = true
    GROUP BY fm.family_id
  ) family_sizes;

  v_result := json_build_object(
    'totalMembers', COALESCE(v_total_members, 0),
    'activeMembers', COALESCE(v_active_members, 0),
    'inactiveMembers', COALESCE(v_inactive_members, 0),
    'visitors', COALESCE(v_visitors, 0),
    'newThisMonth', COALESCE(v_new_this_month, 0),
    'newThisYear', COALESCE(v_new_this_year, 0),
    'totalFamilies', COALESCE(v_total_families, 0),
    'avgFamilySize', COALESCE(v_avg_family_size, 0)
  );

  RETURN v_result;
END;
$$;

-- =====================================================
-- 2. GET MEMBERSHIP STATUS BREAKDOWN
-- Returns count of members by status
-- =====================================================
CREATE OR REPLACE FUNCTION get_membership_status_breakdown(p_tenant_id UUID)
RETURNS TABLE (
  status TEXT,
  count BIGINT,
  percentage NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_total_members BIGINT;
BEGIN
  SELECT COUNT(*) INTO v_total_members
  FROM members
  WHERE tenant_id = p_tenant_id AND deleted_at IS NULL;

  RETURN QUERY
  SELECT
    COALESCE(ms.name, 'Active') as status,
    COUNT(*) as count,
    CASE
      WHEN v_total_members > 0 THEN ROUND((COUNT(*)::NUMERIC / v_total_members::NUMERIC) * 100, 1)
      ELSE 0
    END as percentage
  FROM members m
  LEFT JOIN membership_status ms ON m.membership_status_id = ms.id
  WHERE m.tenant_id = p_tenant_id AND m.deleted_at IS NULL
  GROUP BY COALESCE(ms.name, 'Active')
  ORDER BY COUNT(*) DESC;
END;
$$;

-- =====================================================
-- 3. GET MEMBERSHIP TYPE BREAKDOWN
-- Returns count of members by membership type
-- =====================================================
CREATE OR REPLACE FUNCTION get_membership_type_breakdown(p_tenant_id UUID)
RETURNS TABLE (
  membership_type TEXT,
  count BIGINT,
  percentage NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_total_members BIGINT;
BEGIN
  SELECT COUNT(*) INTO v_total_members
  FROM members
  WHERE tenant_id = p_tenant_id AND deleted_at IS NULL;

  RETURN QUERY
  SELECT
    COALESCE(mt.name, 'Non-Member') as membership_type,
    COUNT(*) as count,
    CASE
      WHEN v_total_members > 0 THEN ROUND((COUNT(*)::NUMERIC / v_total_members::NUMERIC) * 100, 1)
      ELSE 0
    END as percentage
  FROM members m
  LEFT JOIN membership_type mt ON m.membership_type_id = mt.id
  WHERE m.tenant_id = p_tenant_id AND m.deleted_at IS NULL
  GROUP BY COALESCE(mt.name, 'Non-Member')
  ORDER BY COUNT(*) DESC;
END;
$$;

-- =====================================================
-- 4. GET MEMBERSHIP GROWTH TREND
-- Returns monthly member count for the past 12 months
-- =====================================================
CREATE OR REPLACE FUNCTION get_membership_growth_trend(p_tenant_id UUID, p_months INT DEFAULT 12)
RETURNS TABLE (
  month_date DATE,
  month_label TEXT,
  total_members BIGINT,
  new_members BIGINT,
  departed_members BIGINT,
  net_growth BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH month_series AS (
    SELECT
      DATE_TRUNC('month', CURRENT_DATE - (n || ' months')::INTERVAL)::DATE as month_start,
      TO_CHAR(DATE_TRUNC('month', CURRENT_DATE - (n || ' months')::INTERVAL), 'Mon YYYY') as month_label
    FROM generate_series(0, p_months - 1) n
    ORDER BY month_start
  ),
  monthly_stats AS (
    SELECT
      DATE_TRUNC('month', m.created_at)::DATE as month_start,
      COUNT(*) as new_count
    FROM members m
    WHERE m.tenant_id = p_tenant_id
      AND m.deleted_at IS NULL
      AND m.created_at >= CURRENT_DATE - (p_months || ' months')::INTERVAL
    GROUP BY DATE_TRUNC('month', m.created_at)::DATE
  ),
  monthly_departures AS (
    SELECT
      DATE_TRUNC('month', m.updated_at)::DATE as month_start,
      COUNT(*) as departed_count
    FROM members m
    JOIN membership_status ms ON m.membership_status_id = ms.id
    WHERE m.tenant_id = p_tenant_id
      AND ms.code IN ('withdrawn', 'removed')
      AND m.updated_at >= CURRENT_DATE - (p_months || ' months')::INTERVAL
    GROUP BY DATE_TRUNC('month', m.updated_at)::DATE
  )
  SELECT
    ms.month_start as month_date,
    ms.month_label,
    (
      SELECT COUNT(*)
      FROM members m
      WHERE m.tenant_id = p_tenant_id
        AND m.deleted_at IS NULL
        AND m.created_at <= ms.month_start + INTERVAL '1 month' - INTERVAL '1 day'
        AND (m.updated_at IS NULL OR m.updated_at <= ms.month_start + INTERVAL '1 month' - INTERVAL '1 day')
    ) as total_members,
    COALESCE(mstats.new_count, 0) as new_members,
    COALESCE(md.departed_count, 0) as departed_members,
    COALESCE(mstats.new_count, 0) - COALESCE(md.departed_count, 0) as net_growth
  FROM month_series ms
  LEFT JOIN monthly_stats mstats ON ms.month_start = mstats.month_start
  LEFT JOIN monthly_departures md ON ms.month_start = md.month_start
  ORDER BY ms.month_start;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_membership_overview_metrics(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_membership_status_breakdown(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_membership_type_breakdown(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_membership_growth_trend(UUID, INT) TO authenticated;

-- Add comments
COMMENT ON FUNCTION get_membership_overview_metrics IS 'Returns comprehensive membership overview metrics for leadership reports (uses membership_status_id join)';
COMMENT ON FUNCTION get_membership_status_breakdown IS 'Returns member count distribution by status (uses membership_status table)';
COMMENT ON FUNCTION get_membership_type_breakdown IS 'Returns member count distribution by membership type (uses membership_type table)';
COMMENT ON FUNCTION get_membership_growth_trend IS 'Returns monthly membership growth trend for specified number of months (uses membership_status_id join)';
