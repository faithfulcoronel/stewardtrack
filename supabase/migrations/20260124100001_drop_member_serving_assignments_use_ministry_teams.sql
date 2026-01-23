-- =====================================================
-- Drop member_serving_assignments table (unused)
-- Update get_engagement_metrics to use ministry_teams instead
-- =====================================================

-- =====================================================
-- UPDATE GET_ENGAGEMENT_METRICS RPC FUNCTION
-- Now uses ministry_teams table instead of member_serving_assignments
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

  -- Serving stats - now using ministry_teams table
  SELECT COUNT(DISTINCT member_id) INTO v_members_serving
  FROM ministry_teams
  WHERE tenant_id = p_tenant_id
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

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_engagement_metrics(UUID) TO authenticated;

-- Update comment
COMMENT ON FUNCTION get_engagement_metrics IS 'Returns engagement metrics for care, discipleship, and serving (uses ministry_teams for serving count)';

-- =====================================================
-- DROP member_serving_assignments TABLE
-- This table was never used - ministry_teams is the correct table
-- =====================================================
DROP TABLE IF EXISTS member_serving_assignments CASCADE;

-- Success confirmation
DO $$
BEGIN
  RAISE NOTICE 'Dropped member_serving_assignments table';
  RAISE NOTICE 'Updated get_engagement_metrics to use ministry_teams';
END $$;
