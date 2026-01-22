-- =====================================================
-- Member Reports RPC Functions
-- Comprehensive data aggregation for leadership reports
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

  -- Active members
  SELECT COUNT(*) INTO v_active_members
  FROM members
  WHERE tenant_id = p_tenant_id
    AND deleted_at IS NULL
    AND (status = 'active' OR status IS NULL);

  -- Inactive members
  SELECT COUNT(*) INTO v_inactive_members
  FROM members
  WHERE tenant_id = p_tenant_id
    AND deleted_at IS NULL
    AND status IN ('inactive', 'withdrawn', 'removed');

  -- Visitors
  SELECT COUNT(*) INTO v_visitors
  FROM members
  WHERE tenant_id = p_tenant_id
    AND deleted_at IS NULL
    AND status = 'visitor';

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
    COALESCE(m.status, 'active') as status,
    COUNT(*) as count,
    CASE
      WHEN v_total_members > 0 THEN ROUND((COUNT(*)::NUMERIC / v_total_members::NUMERIC) * 100, 1)
      ELSE 0
    END as percentage
  FROM members m
  WHERE m.tenant_id = p_tenant_id AND m.deleted_at IS NULL
  GROUP BY COALESCE(m.status, 'active')
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
    COALESCE(m.membership_type, 'non_member') as membership_type,
    COUNT(*) as count,
    CASE
      WHEN v_total_members > 0 THEN ROUND((COUNT(*)::NUMERIC / v_total_members::NUMERIC) * 100, 1)
      ELSE 0
    END as percentage
  FROM members m
  WHERE m.tenant_id = p_tenant_id AND m.deleted_at IS NULL
  GROUP BY COALESCE(m.membership_type, 'non_member')
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
    WHERE m.tenant_id = p_tenant_id
      AND m.status IN ('withdrawn', 'removed')
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

-- =====================================================
-- 5. GET FAMILY SIZE DISTRIBUTION
-- Returns count of families by size
-- =====================================================
CREATE OR REPLACE FUNCTION get_family_size_distribution(p_tenant_id UUID)
RETURNS TABLE (
  family_size TEXT,
  count BIGINT,
  percentage NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_total_families BIGINT;
BEGIN
  SELECT COUNT(*) INTO v_total_families
  FROM families
  WHERE tenant_id = p_tenant_id AND deleted_at IS NULL;

  RETURN QUERY
  WITH family_member_counts AS (
    SELECT
      fm.family_id,
      COUNT(*) as member_count
    FROM family_members fm
    WHERE fm.tenant_id = p_tenant_id AND fm.is_active = true
    GROUP BY fm.family_id
  )
  SELECT
    CASE
      WHEN fmc.member_count = 1 THEN '1 person'
      WHEN fmc.member_count = 2 THEN '2 people'
      WHEN fmc.member_count = 3 THEN '3 people'
      WHEN fmc.member_count = 4 THEN '4 people'
      WHEN fmc.member_count = 5 THEN '5 people'
      ELSE '6+ people'
    END as family_size,
    COUNT(*) as count,
    CASE
      WHEN v_total_families > 0 THEN ROUND((COUNT(*)::NUMERIC / v_total_families::NUMERIC) * 100, 1)
      ELSE 0
    END as percentage
  FROM family_member_counts fmc
  GROUP BY
    CASE
      WHEN fmc.member_count = 1 THEN '1 person'
      WHEN fmc.member_count = 2 THEN '2 people'
      WHEN fmc.member_count = 3 THEN '3 people'
      WHEN fmc.member_count = 4 THEN '4 people'
      WHEN fmc.member_count = 5 THEN '5 people'
      ELSE '6+ people'
    END,
    CASE
      WHEN fmc.member_count <= 5 THEN fmc.member_count
      ELSE 6
    END
  ORDER BY
    CASE
      WHEN fmc.member_count <= 5 THEN fmc.member_count
      ELSE 6
    END;
END;
$$;

-- =====================================================
-- 6. GET ENGAGEMENT METRICS
-- Returns care plans, discipleship plans, and serving stats
-- =====================================================
CREATE OR REPLACE FUNCTION get_engagement_metrics(p_tenant_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result JSON;
  v_total_care_plans INT;
  v_active_care_plans INT;
  v_total_discipleship_plans INT;
  v_active_discipleship_plans INT;
  v_members_with_care INT;
  v_members_with_discipleship INT;
  v_members_serving INT;
BEGIN
  -- Care plan stats
  SELECT COUNT(*) INTO v_total_care_plans
  FROM member_care_plans
  WHERE tenant_id = p_tenant_id AND deleted_at IS NULL;

  SELECT COUNT(*) INTO v_active_care_plans
  FROM member_care_plans
  WHERE tenant_id = p_tenant_id
    AND deleted_at IS NULL
    AND is_active = true;

  SELECT COUNT(DISTINCT member_id) INTO v_members_with_care
  FROM member_care_plans
  WHERE tenant_id = p_tenant_id
    AND deleted_at IS NULL
    AND is_active = true;

  -- Discipleship plan stats
  SELECT COUNT(*) INTO v_total_discipleship_plans
  FROM member_discipleship_plans
  WHERE tenant_id = p_tenant_id AND deleted_at IS NULL;

  SELECT COUNT(*) INTO v_active_discipleship_plans
  FROM member_discipleship_plans
  WHERE tenant_id = p_tenant_id
    AND deleted_at IS NULL
    AND status IN ('in_progress', 'not_started');

  SELECT COUNT(DISTINCT member_id) INTO v_members_with_discipleship
  FROM member_discipleship_plans
  WHERE tenant_id = p_tenant_id
    AND deleted_at IS NULL
    AND status IN ('in_progress', 'not_started');

  -- Serving stats
  SELECT COUNT(DISTINCT member_id) INTO v_members_serving
  FROM member_serving_assignments
  WHERE tenant_id = p_tenant_id
    AND deleted_at IS NULL
    AND status = 'active';

  v_result := json_build_object(
    'totalCarePlans', COALESCE(v_total_care_plans, 0),
    'activeCarePlans', COALESCE(v_active_care_plans, 0),
    'membersWithCare', COALESCE(v_members_with_care, 0),
    'totalDiscipleshipPlans', COALESCE(v_total_discipleship_plans, 0),
    'activeDiscipleshipPlans', COALESCE(v_active_discipleship_plans, 0),
    'membersWithDiscipleship', COALESCE(v_members_with_discipleship, 0),
    'membersServing', COALESCE(v_members_serving, 0)
  );

  RETURN v_result;
END;
$$;

-- =====================================================
-- 7. GET CARE PLAN PRIORITY BREAKDOWN
-- Returns count of care plans by priority
-- =====================================================
CREATE OR REPLACE FUNCTION get_care_plan_priority_breakdown(p_tenant_id UUID)
RETURNS TABLE (
  priority TEXT,
  count BIGINT,
  percentage NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_total_plans BIGINT;
BEGIN
  SELECT COUNT(*) INTO v_total_plans
  FROM member_care_plans
  WHERE tenant_id = p_tenant_id AND deleted_at IS NULL AND is_active = true;

  RETURN QUERY
  SELECT
    COALESCE(mcp.priority, 'normal') as priority,
    COUNT(*) as count,
    CASE
      WHEN v_total_plans > 0 THEN ROUND((COUNT(*)::NUMERIC / v_total_plans::NUMERIC) * 100, 1)
      ELSE 0
    END as percentage
  FROM member_care_plans mcp
  WHERE mcp.tenant_id = p_tenant_id
    AND mcp.deleted_at IS NULL
    AND mcp.is_active = true
  GROUP BY COALESCE(mcp.priority, 'normal')
  ORDER BY COUNT(*) DESC;
END;
$$;

-- =====================================================
-- 8. GET DISCIPLESHIP PATHWAY BREAKDOWN
-- Returns count of discipleship plans by pathway
-- =====================================================
CREATE OR REPLACE FUNCTION get_discipleship_pathway_breakdown(p_tenant_id UUID)
RETURNS TABLE (
  pathway TEXT,
  count BIGINT,
  percentage NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_total_plans BIGINT;
BEGIN
  SELECT COUNT(*) INTO v_total_plans
  FROM member_discipleship_plans
  WHERE tenant_id = p_tenant_id
    AND deleted_at IS NULL
    AND status IN ('in_progress', 'not_started');

  RETURN QUERY
  SELECT
    COALESCE(mdp.pathway, 'Unassigned') as pathway,
    COUNT(*) as count,
    CASE
      WHEN v_total_plans > 0 THEN ROUND((COUNT(*)::NUMERIC / v_total_plans::NUMERIC) * 100, 1)
      ELSE 0
    END as percentage
  FROM member_discipleship_plans mdp
  WHERE mdp.tenant_id = p_tenant_id
    AND mdp.deleted_at IS NULL
    AND mdp.status IN ('in_progress', 'not_started')
  GROUP BY COALESCE(mdp.pathway, 'Unassigned')
  ORDER BY COUNT(*) DESC;
END;
$$;

-- =====================================================
-- 9. GET MEMBERSHIP CENTER DISTRIBUTION
-- Returns count of members by center (for multi-site)
-- =====================================================
CREATE OR REPLACE FUNCTION get_membership_center_distribution(p_tenant_id UUID)
RETURNS TABLE (
  center_name TEXT,
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
    COALESCE(mc.name, 'Unassigned') as center_name,
    COUNT(m.id) as count,
    CASE
      WHEN v_total_members > 0 THEN ROUND((COUNT(m.id)::NUMERIC / v_total_members::NUMERIC) * 100, 1)
      ELSE 0
    END as percentage
  FROM members m
  LEFT JOIN membership_center mc ON m.membership_center_id = mc.id
  WHERE m.tenant_id = p_tenant_id AND m.deleted_at IS NULL
  GROUP BY COALESCE(mc.name, 'Unassigned')
  ORDER BY COUNT(m.id) DESC;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_membership_overview_metrics(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_membership_status_breakdown(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_membership_type_breakdown(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_membership_growth_trend(UUID, INT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_family_size_distribution(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_engagement_metrics(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_care_plan_priority_breakdown(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_discipleship_pathway_breakdown(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_membership_center_distribution(UUID) TO authenticated;

-- Add comments
COMMENT ON FUNCTION get_membership_overview_metrics IS 'Returns comprehensive membership overview metrics for leadership reports';
COMMENT ON FUNCTION get_membership_status_breakdown IS 'Returns member count distribution by status';
COMMENT ON FUNCTION get_membership_type_breakdown IS 'Returns member count distribution by membership type';
COMMENT ON FUNCTION get_membership_growth_trend IS 'Returns monthly membership growth trend for specified number of months';
COMMENT ON FUNCTION get_family_size_distribution IS 'Returns family count distribution by size';
COMMENT ON FUNCTION get_engagement_metrics IS 'Returns engagement metrics for care, discipleship, and serving';
COMMENT ON FUNCTION get_care_plan_priority_breakdown IS 'Returns care plan distribution by priority level';
COMMENT ON FUNCTION get_discipleship_pathway_breakdown IS 'Returns discipleship plan distribution by pathway';
COMMENT ON FUNCTION get_membership_center_distribution IS 'Returns member distribution across membership centers';
