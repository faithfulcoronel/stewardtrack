-- =====================================================
-- Standardize RLS Policies to Tenant-Only
-- =====================================================
--
-- This migration simplifies RLS policies across Care, Goals, and Families
-- modules to match the Notebooks pattern (tenant-only checks).
--
-- Architectural decision: Permission checks are enforced at the application
-- layer, not at the database level. This ensures:
-- 1. Consistent architecture across all modules
-- 2. Easier maintenance (permission changes don't require migrations)
-- 3. Better performance (simpler RLS checks)
-- 4. Clear separation of concerns (RLS = tenant isolation, App = authorization)
--
-- Modules updated:
-- - Care: member_care_plans, membership_stage_history, member_serving_assignments,
--         member_discipleship_plans, member_discipleship_milestones, member_giving_profiles,
--         member_tags, member_timeline_events, membership_center
-- - Goals: goal_categories, goals, objectives, key_results, key_result_progress_updates
-- - Families: families, family_members, family_relationships
-- =====================================================

BEGIN;

-- =====================================================
-- CARE MODULE: member_care_plans
-- =====================================================
DROP POLICY IF EXISTS "Care plans are viewable by users with care:view permission" ON member_care_plans;
DROP POLICY IF EXISTS "Care plans can be created by users with care:create permission" ON member_care_plans;
DROP POLICY IF EXISTS "Care plans can be updated by users with care:edit permission" ON member_care_plans;
DROP POLICY IF EXISTS "Care plans can be deleted by users with care:delete permission" ON member_care_plans;

CREATE POLICY care_plans_select_policy ON member_care_plans
  FOR SELECT TO authenticated
  USING (
    deleted_at IS NULL
    AND user_belongs_to_tenant(auth.uid(), tenant_id)
  );

CREATE POLICY care_plans_insert_policy ON member_care_plans
  FOR INSERT TO authenticated
  WITH CHECK (
    user_belongs_to_tenant(auth.uid(), tenant_id)
  );

CREATE POLICY care_plans_update_policy ON member_care_plans
  FOR UPDATE TO authenticated
  USING (
    deleted_at IS NULL
    AND user_belongs_to_tenant(auth.uid(), tenant_id)
  );

CREATE POLICY care_plans_delete_policy ON member_care_plans
  FOR DELETE TO authenticated
  USING (
    user_belongs_to_tenant(auth.uid(), tenant_id)
  );

-- =====================================================
-- CARE MODULE: membership_stage_history
-- =====================================================
DROP POLICY IF EXISTS "Stage history is viewable by users with members:view permission" ON membership_stage_history;
DROP POLICY IF EXISTS "Stage history can be managed by users with members:edit permission" ON membership_stage_history;

CREATE POLICY stage_history_select_policy ON membership_stage_history
  FOR SELECT TO authenticated
  USING (
    user_belongs_to_tenant(auth.uid(), tenant_id)
  );

CREATE POLICY stage_history_insert_policy ON membership_stage_history
  FOR INSERT TO authenticated
  WITH CHECK (
    user_belongs_to_tenant(auth.uid(), tenant_id)
  );

CREATE POLICY stage_history_update_policy ON membership_stage_history
  FOR UPDATE TO authenticated
  USING (
    user_belongs_to_tenant(auth.uid(), tenant_id)
  );

CREATE POLICY stage_history_delete_policy ON membership_stage_history
  FOR DELETE TO authenticated
  USING (
    user_belongs_to_tenant(auth.uid(), tenant_id)
  );

-- =====================================================
-- CARE MODULE: member_serving_assignments
-- =====================================================
DROP POLICY IF EXISTS "Serving assignments are viewable by users with serving:view permission" ON member_serving_assignments;
DROP POLICY IF EXISTS "Serving assignments can be created by users with serving:create permission" ON member_serving_assignments;
DROP POLICY IF EXISTS "Serving assignments can be updated by users with serving:edit permission" ON member_serving_assignments;
DROP POLICY IF EXISTS "Serving assignments can be deleted by users with serving:delete permission" ON member_serving_assignments;

CREATE POLICY serving_assignments_select_policy ON member_serving_assignments
  FOR SELECT TO authenticated
  USING (
    deleted_at IS NULL
    AND user_belongs_to_tenant(auth.uid(), tenant_id)
  );

CREATE POLICY serving_assignments_insert_policy ON member_serving_assignments
  FOR INSERT TO authenticated
  WITH CHECK (
    user_belongs_to_tenant(auth.uid(), tenant_id)
  );

CREATE POLICY serving_assignments_update_policy ON member_serving_assignments
  FOR UPDATE TO authenticated
  USING (
    deleted_at IS NULL
    AND user_belongs_to_tenant(auth.uid(), tenant_id)
  );

CREATE POLICY serving_assignments_delete_policy ON member_serving_assignments
  FOR DELETE TO authenticated
  USING (
    user_belongs_to_tenant(auth.uid(), tenant_id)
  );

-- =====================================================
-- CARE MODULE: member_discipleship_plans
-- =====================================================
DROP POLICY IF EXISTS "Discipleship plans are viewable by users with discipleship:view permission" ON member_discipleship_plans;
DROP POLICY IF EXISTS "Discipleship plans can be created by users with discipleship:create permission" ON member_discipleship_plans;
DROP POLICY IF EXISTS "Discipleship plans can be updated by users with discipleship:edit permission" ON member_discipleship_plans;
DROP POLICY IF EXISTS "Discipleship plans can be deleted by users with discipleship:delete permission" ON member_discipleship_plans;

CREATE POLICY discipleship_plans_select_policy ON member_discipleship_plans
  FOR SELECT TO authenticated
  USING (
    deleted_at IS NULL
    AND user_belongs_to_tenant(auth.uid(), tenant_id)
  );

CREATE POLICY discipleship_plans_insert_policy ON member_discipleship_plans
  FOR INSERT TO authenticated
  WITH CHECK (
    user_belongs_to_tenant(auth.uid(), tenant_id)
  );

CREATE POLICY discipleship_plans_update_policy ON member_discipleship_plans
  FOR UPDATE TO authenticated
  USING (
    deleted_at IS NULL
    AND user_belongs_to_tenant(auth.uid(), tenant_id)
  );

CREATE POLICY discipleship_plans_delete_policy ON member_discipleship_plans
  FOR DELETE TO authenticated
  USING (
    user_belongs_to_tenant(auth.uid(), tenant_id)
  );

-- =====================================================
-- CARE MODULE: member_discipleship_milestones
-- =====================================================
DROP POLICY IF EXISTS "Discipleship milestones are viewable by users with discipleship:view permission" ON member_discipleship_milestones;
DROP POLICY IF EXISTS "Discipleship milestones can be managed by users with discipleship:edit permission" ON member_discipleship_milestones;

CREATE POLICY discipleship_milestones_select_policy ON member_discipleship_milestones
  FOR SELECT TO authenticated
  USING (
    deleted_at IS NULL
    AND user_belongs_to_tenant(auth.uid(), tenant_id)
  );

CREATE POLICY discipleship_milestones_insert_policy ON member_discipleship_milestones
  FOR INSERT TO authenticated
  WITH CHECK (
    user_belongs_to_tenant(auth.uid(), tenant_id)
  );

CREATE POLICY discipleship_milestones_update_policy ON member_discipleship_milestones
  FOR UPDATE TO authenticated
  USING (
    deleted_at IS NULL
    AND user_belongs_to_tenant(auth.uid(), tenant_id)
  );

CREATE POLICY discipleship_milestones_delete_policy ON member_discipleship_milestones
  FOR DELETE TO authenticated
  USING (
    user_belongs_to_tenant(auth.uid(), tenant_id)
  );

-- =====================================================
-- CARE MODULE: member_giving_profiles
-- =====================================================
DROP POLICY IF EXISTS "Giving profiles are viewable by users with giving:view permission" ON member_giving_profiles;
DROP POLICY IF EXISTS "Giving profiles can be managed by users with giving:edit permission" ON member_giving_profiles;

CREATE POLICY giving_profiles_select_policy ON member_giving_profiles
  FOR SELECT TO authenticated
  USING (
    deleted_at IS NULL
    AND user_belongs_to_tenant(auth.uid(), tenant_id)
  );

CREATE POLICY giving_profiles_insert_policy ON member_giving_profiles
  FOR INSERT TO authenticated
  WITH CHECK (
    user_belongs_to_tenant(auth.uid(), tenant_id)
  );

CREATE POLICY giving_profiles_update_policy ON member_giving_profiles
  FOR UPDATE TO authenticated
  USING (
    deleted_at IS NULL
    AND user_belongs_to_tenant(auth.uid(), tenant_id)
  );

CREATE POLICY giving_profiles_delete_policy ON member_giving_profiles
  FOR DELETE TO authenticated
  USING (
    user_belongs_to_tenant(auth.uid(), tenant_id)
  );

-- =====================================================
-- CARE MODULE: member_tags
-- =====================================================
DROP POLICY IF EXISTS "Member tags are viewable by users with members:view permission" ON member_tags;
DROP POLICY IF EXISTS "Member tags can be managed by users with members:edit permission" ON member_tags;

CREATE POLICY member_tags_select_policy ON member_tags
  FOR SELECT TO authenticated
  USING (
    deleted_at IS NULL
    AND user_belongs_to_tenant(auth.uid(), tenant_id)
  );

CREATE POLICY member_tags_insert_policy ON member_tags
  FOR INSERT TO authenticated
  WITH CHECK (
    user_belongs_to_tenant(auth.uid(), tenant_id)
  );

CREATE POLICY member_tags_update_policy ON member_tags
  FOR UPDATE TO authenticated
  USING (
    deleted_at IS NULL
    AND user_belongs_to_tenant(auth.uid(), tenant_id)
  );

CREATE POLICY member_tags_delete_policy ON member_tags
  FOR DELETE TO authenticated
  USING (
    user_belongs_to_tenant(auth.uid(), tenant_id)
  );

-- =====================================================
-- CARE MODULE: member_timeline_events
-- =====================================================
DROP POLICY IF EXISTS "Timeline events are viewable by users with members:view permission" ON member_timeline_events;
DROP POLICY IF EXISTS "Timeline events can be managed by users with members:edit permission" ON member_timeline_events;

CREATE POLICY timeline_events_select_policy ON member_timeline_events
  FOR SELECT TO authenticated
  USING (
    deleted_at IS NULL
    AND user_belongs_to_tenant(auth.uid(), tenant_id)
  );

CREATE POLICY timeline_events_insert_policy ON member_timeline_events
  FOR INSERT TO authenticated
  WITH CHECK (
    user_belongs_to_tenant(auth.uid(), tenant_id)
  );

CREATE POLICY timeline_events_update_policy ON member_timeline_events
  FOR UPDATE TO authenticated
  USING (
    deleted_at IS NULL
    AND user_belongs_to_tenant(auth.uid(), tenant_id)
  );

CREATE POLICY timeline_events_delete_policy ON member_timeline_events
  FOR DELETE TO authenticated
  USING (
    user_belongs_to_tenant(auth.uid(), tenant_id)
  );

-- =====================================================
-- CARE MODULE: membership_center
-- =====================================================
DROP POLICY IF EXISTS "Membership centers are viewable by users with members:view permission" ON membership_center;
DROP POLICY IF EXISTS "Membership centers can be managed by users with settings:edit permission" ON membership_center;

CREATE POLICY membership_center_select_policy ON membership_center
  FOR SELECT TO authenticated
  USING (
    deleted_at IS NULL
    AND user_belongs_to_tenant(auth.uid(), tenant_id)
  );

CREATE POLICY membership_center_insert_policy ON membership_center
  FOR INSERT TO authenticated
  WITH CHECK (
    user_belongs_to_tenant(auth.uid(), tenant_id)
  );

CREATE POLICY membership_center_update_policy ON membership_center
  FOR UPDATE TO authenticated
  USING (
    deleted_at IS NULL
    AND user_belongs_to_tenant(auth.uid(), tenant_id)
  );

CREATE POLICY membership_center_delete_policy ON membership_center
  FOR DELETE TO authenticated
  USING (
    user_belongs_to_tenant(auth.uid(), tenant_id)
  );

-- =====================================================
-- GOALS MODULE: goal_categories
-- =====================================================
DROP POLICY IF EXISTS "goal_categories_select" ON goal_categories;
DROP POLICY IF EXISTS "goal_categories_insert" ON goal_categories;
DROP POLICY IF EXISTS "goal_categories_update" ON goal_categories;
DROP POLICY IF EXISTS "goal_categories_delete" ON goal_categories;

CREATE POLICY goal_categories_select_policy ON goal_categories
  FOR SELECT TO authenticated
  USING (
    deleted_at IS NULL
    AND user_belongs_to_tenant(auth.uid(), tenant_id)
  );

CREATE POLICY goal_categories_insert_policy ON goal_categories
  FOR INSERT TO authenticated
  WITH CHECK (
    user_belongs_to_tenant(auth.uid(), tenant_id)
  );

CREATE POLICY goal_categories_update_policy ON goal_categories
  FOR UPDATE TO authenticated
  USING (
    deleted_at IS NULL
    AND user_belongs_to_tenant(auth.uid(), tenant_id)
  );

CREATE POLICY goal_categories_delete_policy ON goal_categories
  FOR DELETE TO authenticated
  USING (
    user_belongs_to_tenant(auth.uid(), tenant_id)
  );

-- =====================================================
-- GOALS MODULE: goals
-- =====================================================
DROP POLICY IF EXISTS "goals_select" ON goals;
DROP POLICY IF EXISTS "goals_insert" ON goals;
DROP POLICY IF EXISTS "goals_update" ON goals;
DROP POLICY IF EXISTS "goals_delete" ON goals;

CREATE POLICY goals_select_policy ON goals
  FOR SELECT TO authenticated
  USING (
    deleted_at IS NULL
    AND user_belongs_to_tenant(auth.uid(), tenant_id)
  );

CREATE POLICY goals_insert_policy ON goals
  FOR INSERT TO authenticated
  WITH CHECK (
    user_belongs_to_tenant(auth.uid(), tenant_id)
  );

CREATE POLICY goals_update_policy ON goals
  FOR UPDATE TO authenticated
  USING (
    deleted_at IS NULL
    AND user_belongs_to_tenant(auth.uid(), tenant_id)
  );

CREATE POLICY goals_delete_policy ON goals
  FOR DELETE TO authenticated
  USING (
    user_belongs_to_tenant(auth.uid(), tenant_id)
  );

-- =====================================================
-- GOALS MODULE: objectives
-- =====================================================
DROP POLICY IF EXISTS "objectives_select" ON objectives;
DROP POLICY IF EXISTS "objectives_insert" ON objectives;
DROP POLICY IF EXISTS "objectives_update" ON objectives;
DROP POLICY IF EXISTS "objectives_delete" ON objectives;

CREATE POLICY objectives_select_policy ON objectives
  FOR SELECT TO authenticated
  USING (
    deleted_at IS NULL
    AND user_belongs_to_tenant(auth.uid(), tenant_id)
  );

CREATE POLICY objectives_insert_policy ON objectives
  FOR INSERT TO authenticated
  WITH CHECK (
    user_belongs_to_tenant(auth.uid(), tenant_id)
  );

CREATE POLICY objectives_update_policy ON objectives
  FOR UPDATE TO authenticated
  USING (
    deleted_at IS NULL
    AND user_belongs_to_tenant(auth.uid(), tenant_id)
  );

CREATE POLICY objectives_delete_policy ON objectives
  FOR DELETE TO authenticated
  USING (
    user_belongs_to_tenant(auth.uid(), tenant_id)
  );

-- =====================================================
-- GOALS MODULE: key_results
-- =====================================================
DROP POLICY IF EXISTS "key_results_select" ON key_results;
DROP POLICY IF EXISTS "key_results_insert" ON key_results;
DROP POLICY IF EXISTS "key_results_update" ON key_results;
DROP POLICY IF EXISTS "key_results_delete" ON key_results;

CREATE POLICY key_results_select_policy ON key_results
  FOR SELECT TO authenticated
  USING (
    deleted_at IS NULL
    AND user_belongs_to_tenant(auth.uid(), tenant_id)
  );

CREATE POLICY key_results_insert_policy ON key_results
  FOR INSERT TO authenticated
  WITH CHECK (
    user_belongs_to_tenant(auth.uid(), tenant_id)
  );

CREATE POLICY key_results_update_policy ON key_results
  FOR UPDATE TO authenticated
  USING (
    deleted_at IS NULL
    AND user_belongs_to_tenant(auth.uid(), tenant_id)
  );

CREATE POLICY key_results_delete_policy ON key_results
  FOR DELETE TO authenticated
  USING (
    user_belongs_to_tenant(auth.uid(), tenant_id)
  );

-- =====================================================
-- GOALS MODULE: key_result_progress_updates
-- =====================================================
DROP POLICY IF EXISTS "progress_updates_select" ON key_result_progress_updates;
DROP POLICY IF EXISTS "progress_updates_insert" ON key_result_progress_updates;

CREATE POLICY progress_updates_select_policy ON key_result_progress_updates
  FOR SELECT TO authenticated
  USING (
    user_belongs_to_tenant(auth.uid(), tenant_id)
  );

CREATE POLICY progress_updates_insert_policy ON key_result_progress_updates
  FOR INSERT TO authenticated
  WITH CHECK (
    user_belongs_to_tenant(auth.uid(), tenant_id)
  );

CREATE POLICY progress_updates_update_policy ON key_result_progress_updates
  FOR UPDATE TO authenticated
  USING (
    user_belongs_to_tenant(auth.uid(), tenant_id)
  );

CREATE POLICY progress_updates_delete_policy ON key_result_progress_updates
  FOR DELETE TO authenticated
  USING (
    user_belongs_to_tenant(auth.uid(), tenant_id)
  );

-- =====================================================
-- FAMILIES MODULE: families
-- =====================================================
DROP POLICY IF EXISTS "Families viewable by users with members:view permission" ON families;
DROP POLICY IF EXISTS "Families can be created by users with members:create permission" ON families;
DROP POLICY IF EXISTS "Families can be updated by users with members:edit permission" ON families;
DROP POLICY IF EXISTS "Families can be deleted by users with members:delete permission" ON families;

CREATE POLICY families_select_policy ON families
  FOR SELECT TO authenticated
  USING (
    deleted_at IS NULL
    AND user_belongs_to_tenant(auth.uid(), tenant_id)
  );

CREATE POLICY families_insert_policy ON families
  FOR INSERT TO authenticated
  WITH CHECK (
    user_belongs_to_tenant(auth.uid(), tenant_id)
  );

CREATE POLICY families_update_policy ON families
  FOR UPDATE TO authenticated
  USING (
    deleted_at IS NULL
    AND user_belongs_to_tenant(auth.uid(), tenant_id)
  );

CREATE POLICY families_delete_policy ON families
  FOR DELETE TO authenticated
  USING (
    user_belongs_to_tenant(auth.uid(), tenant_id)
  );

-- =====================================================
-- FAMILIES MODULE: family_members
-- =====================================================
DROP POLICY IF EXISTS "Family members viewable by users with members:view permission" ON family_members;
DROP POLICY IF EXISTS "Family members can be created by users with members:create permission" ON family_members;
DROP POLICY IF EXISTS "Family members can be updated by users with members:edit permission" ON family_members;
DROP POLICY IF EXISTS "Family members can be deleted by users with members:delete permission" ON family_members;

CREATE POLICY family_members_select_policy ON family_members
  FOR SELECT TO authenticated
  USING (
    is_active = true
    AND user_belongs_to_tenant(auth.uid(), tenant_id)
  );

CREATE POLICY family_members_insert_policy ON family_members
  FOR INSERT TO authenticated
  WITH CHECK (
    user_belongs_to_tenant(auth.uid(), tenant_id)
  );

CREATE POLICY family_members_update_policy ON family_members
  FOR UPDATE TO authenticated
  USING (
    user_belongs_to_tenant(auth.uid(), tenant_id)
  );

CREATE POLICY family_members_delete_policy ON family_members
  FOR DELETE TO authenticated
  USING (
    user_belongs_to_tenant(auth.uid(), tenant_id)
  );

-- =====================================================
-- FAMILIES MODULE: family_relationships
-- =====================================================
DROP POLICY IF EXISTS "Family relationships viewable by users with members:view permission" ON family_relationships;
DROP POLICY IF EXISTS "Family relationships can be created by users with members:create permission" ON family_relationships;
DROP POLICY IF EXISTS "Family relationships can be updated by users with members:edit permission" ON family_relationships;
DROP POLICY IF EXISTS "Family relationships can be deleted by users with members:delete permission" ON family_relationships;

CREATE POLICY family_relationships_select_policy ON family_relationships
  FOR SELECT TO authenticated
  USING (
    user_belongs_to_tenant(auth.uid(), tenant_id)
  );

CREATE POLICY family_relationships_insert_policy ON family_relationships
  FOR INSERT TO authenticated
  WITH CHECK (
    user_belongs_to_tenant(auth.uid(), tenant_id)
  );

CREATE POLICY family_relationships_update_policy ON family_relationships
  FOR UPDATE TO authenticated
  USING (
    user_belongs_to_tenant(auth.uid(), tenant_id)
  );

CREATE POLICY family_relationships_delete_policy ON family_relationships
  FOR DELETE TO authenticated
  USING (
    user_belongs_to_tenant(auth.uid(), tenant_id)
  );

COMMIT;

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Standardized RLS policies to tenant-only for Care, Goals, and Families modules';
  RAISE NOTICE 'Permission checks now enforced at application layer, not database layer';
END $$;
