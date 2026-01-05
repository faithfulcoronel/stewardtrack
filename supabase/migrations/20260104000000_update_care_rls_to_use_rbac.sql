-- Migration: Update Care-related RLS policies to use RBAC permissions
-- This replaces hardcoded 'admin'/'owner' role checks with permission-based access control

-- ============================================================================
-- STEP 1: Create helper functions for permission checking in RLS policies
-- ============================================================================

-- Function to check if the current user has a permission for a specific tenant
-- This is needed because RLS policies need to check permissions in the context of the row's tenant_id
CREATE OR REPLACE FUNCTION user_has_permission_for_tenant(
  p_tenant_id uuid,
  p_permission_code text
)
RETURNS boolean
SECURITY DEFINER
SET search_path = public
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

COMMENT ON FUNCTION user_has_permission_for_tenant(uuid, text) IS 'Checks if the current user has a specific permission for a given tenant. Used in RLS policies.';
GRANT EXECUTE ON FUNCTION user_has_permission_for_tenant(uuid, text) TO authenticated;

-- Function to check if user has ANY of the specified permissions for a tenant
CREATE OR REPLACE FUNCTION user_has_any_permission_for_tenant(
  p_tenant_id uuid,
  p_permission_codes text[]
)
RETURNS boolean
SECURITY DEFINER
SET search_path = public
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

COMMENT ON FUNCTION user_has_any_permission_for_tenant(uuid, text[]) IS 'Checks if the current user has any of the specified permissions for a given tenant. Used in RLS policies.';
GRANT EXECUTE ON FUNCTION user_has_any_permission_for_tenant(uuid, text[]) TO authenticated;

-- ============================================================================
-- STEP 2: Add missing feature catalog entries for serving and giving
-- These features exist in member_serving_assignments and member_giving_profiles
-- but don't have dedicated feature catalog entries yet.
-- ============================================================================

-- Add serving feature to catalog if not exists
INSERT INTO feature_catalog (code, name, category, description, tier, is_active, phase)
VALUES ('serving.core', 'Volunteer Serving', 'management', 'Manage volunteer serving assignments and schedules', 'professional', true, 'ga')
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  description = EXCLUDED.description,
  tier = EXCLUDED.tier,
  is_active = EXCLUDED.is_active,
  phase = EXCLUDED.phase,
  deleted_at = NULL,
  updated_at = now();

-- Add giving feature to catalog if not exists
INSERT INTO feature_catalog (code, name, category, description, tier, is_active, phase)
VALUES ('giving.profiles', 'Giving Profiles', 'management', 'Member giving profile management and insights', 'professional', true, 'ga')
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  description = EXCLUDED.description,
  tier = EXCLUDED.tier,
  is_active = EXCLUDED.is_active,
  phase = EXCLUDED.phase,
  deleted_at = NULL,
  updated_at = now();

-- ============================================================================
-- STEP 3: Add feature_permissions entries for serving and giving
-- These link permission codes to features (no need to insert into permissions table)
-- ============================================================================

-- Helper function to insert feature permissions
CREATE OR REPLACE FUNCTION temp_insert_feature_permission(
  p_feature_code text,
  p_permission_code text,
  p_display_name text,
  p_description text,
  p_is_required boolean DEFAULT true,
  p_display_order integer DEFAULT 0
)
RETURNS void AS $$
DECLARE
  v_feature_id uuid;
  v_category text;
  v_action text;
BEGIN
  -- Get feature ID
  SELECT id INTO v_feature_id
  FROM feature_catalog
  WHERE code = p_feature_code AND deleted_at IS NULL;

  IF v_feature_id IS NULL THEN
    RAISE NOTICE 'Feature not found: %', p_feature_code;
    RETURN;
  END IF;

  -- Extract category and action from permission code
  v_category := split_part(p_permission_code, ':', 1);
  v_action := split_part(p_permission_code, ':', 2);

  -- Insert permission
  INSERT INTO feature_permissions (
    feature_id, permission_code, display_name, description,
    category, action, is_required, display_order
  )
  VALUES (
    v_feature_id, p_permission_code, p_display_name, p_description,
    v_category, v_action, p_is_required, p_display_order
  )
  ON CONFLICT (feature_id, permission_code) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    description = EXCLUDED.description,
    category = EXCLUDED.category,
    action = EXCLUDED.action,
    is_required = EXCLUDED.is_required,
    display_order = EXCLUDED.display_order,
    updated_at = now();
END;
$$ LANGUAGE plpgsql;

-- serving.core permissions
SELECT temp_insert_feature_permission('serving.core', 'serving:view', 'View Serving', 'View volunteer serving assignments', true, 1);
SELECT temp_insert_feature_permission('serving.core', 'serving:create', 'Create Serving', 'Create serving assignments', true, 2);
SELECT temp_insert_feature_permission('serving.core', 'serving:edit', 'Edit Serving', 'Modify serving assignments', true, 3);
SELECT temp_insert_feature_permission('serving.core', 'serving:delete', 'Delete Serving', 'Remove serving assignments', false, 4);

-- giving.profiles permissions
SELECT temp_insert_feature_permission('giving.profiles', 'giving:view', 'View Giving', 'View member giving profiles', true, 1);
SELECT temp_insert_feature_permission('giving.profiles', 'giving:edit', 'Edit Giving', 'Modify giving profiles', true, 2);

-- Clean up temp function
DROP FUNCTION temp_insert_feature_permission(text, text, text, text, boolean, integer);

-- ============================================================================
-- STEP 4: Seed permission role templates for new permissions
-- ============================================================================

-- Create helper function for inserting permission role templates
CREATE OR REPLACE FUNCTION temp_insert_role_template(
  p_permission_code text,
  p_role_key text,
  p_is_recommended boolean DEFAULT true,
  p_reason text DEFAULT NULL
)
RETURNS void AS $$
DECLARE
  v_permission_id uuid;
BEGIN
  -- Get permission ID from feature_permissions
  SELECT fp.id INTO v_permission_id
  FROM feature_permissions fp
  JOIN feature_catalog fc ON fp.feature_id = fc.id
  WHERE fp.permission_code = p_permission_code
    AND fc.deleted_at IS NULL
  LIMIT 1;

  IF v_permission_id IS NULL THEN
    RAISE NOTICE 'Permission not found: %', p_permission_code;
    RETURN;
  END IF;

  -- Insert template
  INSERT INTO permission_role_templates (
    feature_permission_id, role_key, is_recommended, reason
  )
  VALUES (v_permission_id, p_role_key, p_is_recommended, p_reason)
  ON CONFLICT (feature_permission_id, role_key) DO UPDATE SET
    is_recommended = EXCLUDED.is_recommended,
    reason = EXCLUDED.reason,
    updated_at = now();
END;
$$ LANGUAGE plpgsql;

-- serving permissions - Admin and staff can manage, volunteers can view
SELECT temp_insert_role_template('serving:view', 'tenant_admin', true, 'Full access to serving');
SELECT temp_insert_role_template('serving:view', 'staff', true, 'Staff can view serving schedules');
SELECT temp_insert_role_template('serving:view', 'volunteer', true, 'Volunteers can view schedules');
SELECT temp_insert_role_template('serving:create', 'tenant_admin', true, 'Can create serving assignments');
SELECT temp_insert_role_template('serving:create', 'staff', true, 'Staff can create assignments');
SELECT temp_insert_role_template('serving:edit', 'tenant_admin', true, 'Can edit serving assignments');
SELECT temp_insert_role_template('serving:edit', 'staff', true, 'Staff can edit assignments');
SELECT temp_insert_role_template('serving:delete', 'tenant_admin', true, 'Only admins can delete serving records');

-- giving permissions - Admin and finance roles
SELECT temp_insert_role_template('giving:view', 'tenant_admin', true, 'Full access to giving');
SELECT temp_insert_role_template('giving:view', 'staff', true, 'Staff can view giving profiles');
SELECT temp_insert_role_template('giving:edit', 'tenant_admin', true, 'Can edit giving profiles');
SELECT temp_insert_role_template('giving:edit', 'staff', false, 'Staff may edit giving with permission');

-- Clean up helper function
DROP FUNCTION temp_insert_role_template(text, text, boolean, text);

-- ============================================================================
-- STEP 4: UPDATE member_care_plans RLS POLICIES
-- ============================================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Care plans are viewable by tenant users" ON member_care_plans;
DROP POLICY IF EXISTS "Care plans can be managed by tenant admins" ON member_care_plans;

-- Create new permission-based policies
CREATE POLICY "Care plans are viewable by users with care:view permission" ON member_care_plans
  FOR SELECT TO authenticated
  USING (
    deleted_at IS NULL
    AND user_has_permission_for_tenant(tenant_id, 'care:view')
  );

CREATE POLICY "Care plans can be created by users with care:create permission" ON member_care_plans
  FOR INSERT TO authenticated
  WITH CHECK (
    user_has_permission_for_tenant(tenant_id, 'care:create')
  );

CREATE POLICY "Care plans can be updated by users with care:edit permission" ON member_care_plans
  FOR UPDATE TO authenticated
  USING (
    deleted_at IS NULL
    AND user_has_permission_for_tenant(tenant_id, 'care:edit')
  )
  WITH CHECK (
    user_has_permission_for_tenant(tenant_id, 'care:edit')
  );

CREATE POLICY "Care plans can be deleted by users with care:delete permission" ON member_care_plans
  FOR DELETE TO authenticated
  USING (
    user_has_permission_for_tenant(tenant_id, 'care:delete')
  );

-- ============================================================================
-- STEP 5: UPDATE membership_stage_history RLS POLICIES
-- ============================================================================

DROP POLICY IF EXISTS "Stage history is viewable by tenant users" ON membership_stage_history;
DROP POLICY IF EXISTS "Stage history entries can be managed by tenant admins" ON membership_stage_history;

CREATE POLICY "Stage history is viewable by users with members:view permission" ON membership_stage_history
  FOR SELECT TO authenticated
  USING (
    user_has_permission_for_tenant(tenant_id, 'members:view')
  );

CREATE POLICY "Stage history can be managed by users with members:edit permission" ON membership_stage_history
  FOR ALL TO authenticated
  USING (
    user_has_permission_for_tenant(tenant_id, 'members:edit')
  )
  WITH CHECK (
    user_has_permission_for_tenant(tenant_id, 'members:edit')
  );

-- ============================================================================
-- STEP 6: UPDATE member_serving_assignments RLS POLICIES
-- ============================================================================

DROP POLICY IF EXISTS "Serving assignments are viewable by tenant users" ON member_serving_assignments;
DROP POLICY IF EXISTS "Serving assignments can be managed by tenant admins" ON member_serving_assignments;

CREATE POLICY "Serving assignments are viewable by users with serving:view permission" ON member_serving_assignments
  FOR SELECT TO authenticated
  USING (
    deleted_at IS NULL
    AND user_has_permission_for_tenant(tenant_id, 'serving:view')
  );

CREATE POLICY "Serving assignments can be created by users with serving:create permission" ON member_serving_assignments
  FOR INSERT TO authenticated
  WITH CHECK (
    user_has_permission_for_tenant(tenant_id, 'serving:create')
  );

CREATE POLICY "Serving assignments can be updated by users with serving:edit permission" ON member_serving_assignments
  FOR UPDATE TO authenticated
  USING (
    deleted_at IS NULL
    AND user_has_permission_for_tenant(tenant_id, 'serving:edit')
  )
  WITH CHECK (
    user_has_permission_for_tenant(tenant_id, 'serving:edit')
  );

CREATE POLICY "Serving assignments can be deleted by users with serving:delete permission" ON member_serving_assignments
  FOR DELETE TO authenticated
  USING (
    user_has_permission_for_tenant(tenant_id, 'serving:delete')
  );

-- ============================================================================
-- STEP 7: UPDATE member_discipleship_plans RLS POLICIES
-- ============================================================================

DROP POLICY IF EXISTS "Discipleship plans are viewable by tenant users" ON member_discipleship_plans;
DROP POLICY IF EXISTS "Discipleship plans can be managed by tenant admins" ON member_discipleship_plans;

CREATE POLICY "Discipleship plans are viewable by users with discipleship:view permission" ON member_discipleship_plans
  FOR SELECT TO authenticated
  USING (
    deleted_at IS NULL
    AND user_has_permission_for_tenant(tenant_id, 'discipleship:view')
  );

CREATE POLICY "Discipleship plans can be created by users with discipleship:create permission" ON member_discipleship_plans
  FOR INSERT TO authenticated
  WITH CHECK (
    user_has_permission_for_tenant(tenant_id, 'discipleship:create')
  );

CREATE POLICY "Discipleship plans can be updated by users with discipleship:edit permission" ON member_discipleship_plans
  FOR UPDATE TO authenticated
  USING (
    deleted_at IS NULL
    AND user_has_permission_for_tenant(tenant_id, 'discipleship:edit')
  )
  WITH CHECK (
    user_has_permission_for_tenant(tenant_id, 'discipleship:edit')
  );

CREATE POLICY "Discipleship plans can be deleted by users with discipleship:delete permission" ON member_discipleship_plans
  FOR DELETE TO authenticated
  USING (
    user_has_permission_for_tenant(tenant_id, 'discipleship:delete')
  );

-- ============================================================================
-- STEP 8: UPDATE member_discipleship_milestones RLS POLICIES
-- ============================================================================

DROP POLICY IF EXISTS "Discipleship milestones are viewable by tenant users" ON member_discipleship_milestones;
DROP POLICY IF EXISTS "Discipleship milestones can be managed by tenant admins" ON member_discipleship_milestones;

CREATE POLICY "Discipleship milestones are viewable by users with discipleship:view permission" ON member_discipleship_milestones
  FOR SELECT TO authenticated
  USING (
    deleted_at IS NULL
    AND user_has_permission_for_tenant(tenant_id, 'discipleship:view')
  );

CREATE POLICY "Discipleship milestones can be managed by users with discipleship:edit permission" ON member_discipleship_milestones
  FOR ALL TO authenticated
  USING (
    deleted_at IS NULL
    AND user_has_permission_for_tenant(tenant_id, 'discipleship:edit')
  )
  WITH CHECK (
    user_has_permission_for_tenant(tenant_id, 'discipleship:edit')
  );

-- ============================================================================
-- STEP 9: UPDATE member_giving_profiles RLS POLICIES
-- ============================================================================

DROP POLICY IF EXISTS "Giving profiles are viewable by tenant users" ON member_giving_profiles;
DROP POLICY IF EXISTS "Giving profiles can be managed by tenant admins" ON member_giving_profiles;

CREATE POLICY "Giving profiles are viewable by users with giving:view permission" ON member_giving_profiles
  FOR SELECT TO authenticated
  USING (
    deleted_at IS NULL
    AND user_has_permission_for_tenant(tenant_id, 'giving:view')
  );

CREATE POLICY "Giving profiles can be managed by users with giving:edit permission" ON member_giving_profiles
  FOR ALL TO authenticated
  USING (
    deleted_at IS NULL
    AND user_has_permission_for_tenant(tenant_id, 'giving:edit')
  )
  WITH CHECK (
    user_has_permission_for_tenant(tenant_id, 'giving:edit')
  );

-- ============================================================================
-- STEP 10: UPDATE member_tags RLS POLICIES
-- ============================================================================

DROP POLICY IF EXISTS "Member tags are viewable by tenant users" ON member_tags;
DROP POLICY IF EXISTS "Member tags can be managed by tenant admins" ON member_tags;

CREATE POLICY "Member tags are viewable by users with members:view permission" ON member_tags
  FOR SELECT TO authenticated
  USING (
    deleted_at IS NULL
    AND user_has_permission_for_tenant(tenant_id, 'members:view')
  );

CREATE POLICY "Member tags can be managed by users with members:edit permission" ON member_tags
  FOR ALL TO authenticated
  USING (
    deleted_at IS NULL
    AND user_has_permission_for_tenant(tenant_id, 'members:edit')
  )
  WITH CHECK (
    user_has_permission_for_tenant(tenant_id, 'members:edit')
  );

-- ============================================================================
-- STEP 11: UPDATE member_timeline_events RLS POLICIES
-- ============================================================================

DROP POLICY IF EXISTS "Timeline events are viewable by tenant users" ON member_timeline_events;
DROP POLICY IF EXISTS "Timeline events can be managed by tenant admins" ON member_timeline_events;

CREATE POLICY "Timeline events are viewable by users with members:view permission" ON member_timeline_events
  FOR SELECT TO authenticated
  USING (
    deleted_at IS NULL
    AND user_has_permission_for_tenant(tenant_id, 'members:view')
  );

CREATE POLICY "Timeline events can be managed by users with members:edit permission" ON member_timeline_events
  FOR ALL TO authenticated
  USING (
    deleted_at IS NULL
    AND user_has_permission_for_tenant(tenant_id, 'members:edit')
  )
  WITH CHECK (
    user_has_permission_for_tenant(tenant_id, 'members:edit')
  );

-- ============================================================================
-- STEP 12: UPDATE membership_center RLS POLICIES
-- ============================================================================

DROP POLICY IF EXISTS "Membership centers are viewable by tenant users" ON membership_center;
DROP POLICY IF EXISTS "Membership centers can be managed by tenant admins" ON membership_center;

CREATE POLICY "Membership centers are viewable by users with members:view permission" ON membership_center
  FOR SELECT TO authenticated
  USING (
    deleted_at IS NULL
    AND user_has_permission_for_tenant(tenant_id, 'members:view')
  );

CREATE POLICY "Membership centers can be managed by users with settings:edit permission" ON membership_center
  FOR ALL TO authenticated
  USING (
    deleted_at IS NULL
    AND user_has_permission_for_tenant(tenant_id, 'settings:edit')
  )
  WITH CHECK (
    user_has_permission_for_tenant(tenant_id, 'settings:edit')
  );
