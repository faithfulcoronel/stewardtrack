-- =====================================================================================
-- MIGRATION: Revamp Role Personas for Permission Templates
-- =====================================================================================
-- Replaces the generic 4-role model (tenant_admin, staff, volunteer, member) with
-- a comprehensive 11-role church-specific persona system.
--
-- New Role Personas:
--   1. tenant_admin     - Full administrative control
--   2. senior_pastor    - Primary spiritual leader
--   3. associate_pastor - Pastoral staff member
--   4. ministry_leader  - Department or group leader
--   5. treasurer        - Creates financial transactions (Maker)
--   6. auditor          - Approves transactions & budgets (Checker)
--   7. secretary        - Administrative support
--   8. deacon_elder     - Board oversight & budget approval
--   9. volunteer        - Task-specific access
--  10. member           - Self-service access
--  11. visitor          - Public information only
--
-- Key Design Decisions:
--   - Finance uses Maker-Checker pattern (Treasurer creates, Auditor approves)
--   - Deacon/Elder has budget approval for governance
--   - Pastoral roles separated from finance roles
--   - Visitor role for first-time guests
--
-- Version: 1.1
-- Date: January 2026
-- =====================================================================================

BEGIN;

-- =====================================================================================
-- STEP 1: Backup existing templates (for rollback if needed)
-- =====================================================================================
-- Note: Templates are suggestions, not enforced. Existing tenant configurations
-- are stored in role_permissions table and will NOT be affected.

-- Log current count
DO $$
DECLARE
  v_count integer;
BEGIN
  SELECT COUNT(*) INTO v_count FROM permission_role_templates;
  RAISE NOTICE 'Existing permission_role_templates count: %', v_count;
END $$;

-- =====================================================================================
-- STEP 2: Delete existing templates (clean slate approach)
-- =====================================================================================
DELETE FROM permission_role_templates;

-- =====================================================================================
-- STEP 3: Create helper function for inserting templates
-- =====================================================================================
CREATE OR REPLACE FUNCTION insert_role_template(
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

-- =====================================================================================
-- STEP 4: Insert new role persona templates
-- =====================================================================================

-- -------------------------------------------------------------------------------------
-- MEMBERS MANAGEMENT (members.core)
-- -------------------------------------------------------------------------------------

-- members:view - Most roles can view members
SELECT insert_role_template('members:view', 'tenant_admin', true, 'Full access to member directory');
SELECT insert_role_template('members:view', 'senior_pastor', true, 'Pastoral oversight of congregation');
SELECT insert_role_template('members:view', 'associate_pastor', true, 'Ministry requires member access');
SELECT insert_role_template('members:view', 'ministry_leader', true, 'Needs to view group members');
SELECT insert_role_template('members:view', 'treasurer', true, 'Needs member info for contributions');
SELECT insert_role_template('members:view', 'auditor', true, 'Verification of member records');
SELECT insert_role_template('members:view', 'secretary', true, 'Administrative member management');
SELECT insert_role_template('members:view', 'deacon_elder', true, 'Pastoral care requires member access');
SELECT insert_role_template('members:view', 'volunteer', true, 'Basic directory access for ministry');

-- members:search - Similar to view
SELECT insert_role_template('members:search', 'tenant_admin', true, 'Full search capabilities');
SELECT insert_role_template('members:search', 'senior_pastor', true, 'Find members for pastoral care');
SELECT insert_role_template('members:search', 'associate_pastor', true, 'Search for ministry purposes');
SELECT insert_role_template('members:search', 'ministry_leader', true, 'Find group members');
SELECT insert_role_template('members:search', 'treasurer', true, 'Search for contribution records');
SELECT insert_role_template('members:search', 'auditor', true, 'Audit verification');
SELECT insert_role_template('members:search', 'secretary', true, 'Administrative searches');
SELECT insert_role_template('members:search', 'deacon_elder', true, 'Find members for care');
SELECT insert_role_template('members:search', 'volunteer', false, 'Optional - limited search');

-- members:create - Admin, pastors, secretary
SELECT insert_role_template('members:create', 'tenant_admin', true, 'Can add new members');
SELECT insert_role_template('members:create', 'senior_pastor', true, 'Can register new members');
SELECT insert_role_template('members:create', 'associate_pastor', false, 'Optional - may register members');
SELECT insert_role_template('members:create', 'secretary', true, 'Administrative member registration');

-- members:edit - Admin, pastors, secretary, treasurer (for giving)
SELECT insert_role_template('members:edit', 'tenant_admin', true, 'Can edit all member records');
SELECT insert_role_template('members:edit', 'senior_pastor', true, 'Can update member information');
SELECT insert_role_template('members:edit', 'associate_pastor', true, 'Can update assigned members');
SELECT insert_role_template('members:edit', 'treasurer', false, 'Optional - giving-related edits only');
SELECT insert_role_template('members:edit', 'secretary', true, 'Administrative member updates');

-- members:delete - Admin only, secretary optional
SELECT insert_role_template('members:delete', 'tenant_admin', true, 'Only admins can delete member records');
SELECT insert_role_template('members:delete', 'secretary', false, 'Optional - with admin approval');

-- members:view_self - Everyone
SELECT insert_role_template('members:view_self', 'tenant_admin', true, 'Can view own profile');
SELECT insert_role_template('members:view_self', 'senior_pastor', true, 'Can view own profile');
SELECT insert_role_template('members:view_self', 'associate_pastor', true, 'Can view own profile');
SELECT insert_role_template('members:view_self', 'ministry_leader', true, 'Can view own profile');
SELECT insert_role_template('members:view_self', 'treasurer', true, 'Can view own profile');
SELECT insert_role_template('members:view_self', 'auditor', true, 'Can view own profile');
SELECT insert_role_template('members:view_self', 'secretary', true, 'Can view own profile');
SELECT insert_role_template('members:view_self', 'deacon_elder', true, 'Can view own profile');
SELECT insert_role_template('members:view_self', 'volunteer', true, 'Can view own profile');
SELECT insert_role_template('members:view_self', 'member', true, 'Can view own profile');
SELECT insert_role_template('members:view_self', 'visitor', true, 'Can view own profile');

-- members:edit_self - Everyone
SELECT insert_role_template('members:edit_self', 'tenant_admin', true, 'Can edit own profile');
SELECT insert_role_template('members:edit_self', 'senior_pastor', true, 'Can edit own profile');
SELECT insert_role_template('members:edit_self', 'associate_pastor', true, 'Can edit own profile');
SELECT insert_role_template('members:edit_self', 'ministry_leader', true, 'Can edit own profile');
SELECT insert_role_template('members:edit_self', 'treasurer', true, 'Can edit own profile');
SELECT insert_role_template('members:edit_self', 'auditor', true, 'Can edit own profile');
SELECT insert_role_template('members:edit_self', 'secretary', true, 'Can edit own profile');
SELECT insert_role_template('members:edit_self', 'deacon_elder', true, 'Can edit own profile');
SELECT insert_role_template('members:edit_self', 'volunteer', true, 'Can edit own profile');
SELECT insert_role_template('members:edit_self', 'member', true, 'Can edit own profile');
SELECT insert_role_template('members:edit_self', 'visitor', true, 'Can edit own profile');

-- -------------------------------------------------------------------------------------
-- MEMBER INVITATIONS (members.invitations) - Premium
-- -------------------------------------------------------------------------------------

-- members:invite
SELECT insert_role_template('members:invite', 'tenant_admin', true, 'Can send portal invitations');
SELECT insert_role_template('members:invite', 'senior_pastor', true, 'Can invite new members');
SELECT insert_role_template('members:invite', 'associate_pastor', false, 'Optional - may invite members');
SELECT insert_role_template('members:invite', 'secretary', true, 'Administrative invitations');

-- members:invite_manage
SELECT insert_role_template('members:invite_manage', 'tenant_admin', true, 'Can manage all invitations');
SELECT insert_role_template('members:invite_manage', 'senior_pastor', true, 'Can view invitation status');
SELECT insert_role_template('members:invite_manage', 'secretary', true, 'Administrative invitation management');

-- -------------------------------------------------------------------------------------
-- MEMBER EXPORT (members.export) - Premium
-- -------------------------------------------------------------------------------------

-- members:export
SELECT insert_role_template('members:export', 'tenant_admin', true, 'Can export member data');
SELECT insert_role_template('members:export', 'senior_pastor', false, 'Optional - pastoral reports');
SELECT insert_role_template('members:export', 'treasurer', true, 'Export for financial records');
SELECT insert_role_template('members:export', 'auditor', true, 'Export for audit purposes');
SELECT insert_role_template('members:export', 'secretary', true, 'Administrative exports');

-- members:export_advanced
SELECT insert_role_template('members:export_advanced', 'tenant_admin', true, 'Can perform advanced exports');
SELECT insert_role_template('members:export_advanced', 'treasurer', true, 'Advanced financial exports');
SELECT insert_role_template('members:export_advanced', 'auditor', true, 'Advanced audit exports');
SELECT insert_role_template('members:export_advanced', 'secretary', false, 'Optional - advanced exports');

-- -------------------------------------------------------------------------------------
-- BULK MEMBER OPERATIONS (members.bulk) - Professional
-- -------------------------------------------------------------------------------------

-- members:bulk_update
SELECT insert_role_template('members:bulk_update', 'tenant_admin', true, 'Can perform bulk member updates');
SELECT insert_role_template('members:bulk_update', 'secretary', true, 'Administrative bulk operations');

-- members:bulk_import
SELECT insert_role_template('members:bulk_import', 'tenant_admin', true, 'Can import members from file');
SELECT insert_role_template('members:bulk_import', 'secretary', true, 'Administrative imports');

-- members:invite_bulk
SELECT insert_role_template('members:invite_bulk', 'tenant_admin', true, 'Can send bulk invitations');
SELECT insert_role_template('members:invite_bulk', 'senior_pastor', false, 'Optional - bulk invitations');
SELECT insert_role_template('members:invite_bulk', 'secretary', true, 'Administrative bulk invitations');

-- -------------------------------------------------------------------------------------
-- HOUSEHOLDS (households.core)
-- -------------------------------------------------------------------------------------

-- households:view
SELECT insert_role_template('households:view', 'tenant_admin', true, 'Full access to household records');
SELECT insert_role_template('households:view', 'senior_pastor', true, 'Pastoral oversight of families');
SELECT insert_role_template('households:view', 'associate_pastor', true, 'Ministry requires family info');
SELECT insert_role_template('households:view', 'ministry_leader', false, 'Optional - for family ministry');
SELECT insert_role_template('households:view', 'treasurer', false, 'Optional - contribution households');
SELECT insert_role_template('households:view', 'secretary', true, 'Administrative household management');
SELECT insert_role_template('households:view', 'deacon_elder', true, 'Pastoral care for families');

-- households:create
SELECT insert_role_template('households:create', 'tenant_admin', true, 'Can create new households');
SELECT insert_role_template('households:create', 'senior_pastor', true, 'Can create household records');
SELECT insert_role_template('households:create', 'secretary', true, 'Administrative household creation');

-- households:edit
SELECT insert_role_template('households:edit', 'tenant_admin', true, 'Can edit all household records');
SELECT insert_role_template('households:edit', 'senior_pastor', true, 'Can update household information');
SELECT insert_role_template('households:edit', 'associate_pastor', false, 'Optional - assigned families');
SELECT insert_role_template('households:edit', 'secretary', true, 'Administrative household updates');

-- households:delete
SELECT insert_role_template('households:delete', 'tenant_admin', true, 'Only admins can delete households');
SELECT insert_role_template('households:delete', 'secretary', false, 'Optional - with admin approval');

-- households:manage_members
SELECT insert_role_template('households:manage_members', 'tenant_admin', true, 'Can manage household membership');
SELECT insert_role_template('households:manage_members', 'senior_pastor', true, 'Can add/remove household members');
SELECT insert_role_template('households:manage_members', 'secretary', true, 'Administrative member management');

-- -------------------------------------------------------------------------------------
-- GROUPS (groups.core)
-- -------------------------------------------------------------------------------------

-- groups:view
SELECT insert_role_template('groups:view', 'tenant_admin', true, 'Full access to groups');
SELECT insert_role_template('groups:view', 'senior_pastor', true, 'Oversight of all groups');
SELECT insert_role_template('groups:view', 'associate_pastor', true, 'Ministry group access');
SELECT insert_role_template('groups:view', 'ministry_leader', true, 'View assigned groups');
SELECT insert_role_template('groups:view', 'secretary', true, 'Administrative group viewing');
SELECT insert_role_template('groups:view', 'deacon_elder', true, 'Governance oversight');
SELECT insert_role_template('groups:view', 'volunteer', true, 'View groups they serve in');
SELECT insert_role_template('groups:view', 'member', true, 'View available groups');
SELECT insert_role_template('groups:view', 'visitor', false, 'Optional - public groups only');

-- groups:create
SELECT insert_role_template('groups:create', 'tenant_admin', true, 'Can create new groups');
SELECT insert_role_template('groups:create', 'senior_pastor', true, 'Can create ministry groups');
SELECT insert_role_template('groups:create', 'associate_pastor', true, 'Can create groups in their area');
SELECT insert_role_template('groups:create', 'ministry_leader', false, 'Optional - create sub-groups');
SELECT insert_role_template('groups:create', 'secretary', true, 'Administrative group creation');

-- groups:edit
SELECT insert_role_template('groups:edit', 'tenant_admin', true, 'Can edit all groups');
SELECT insert_role_template('groups:edit', 'senior_pastor', true, 'Can update group information');
SELECT insert_role_template('groups:edit', 'associate_pastor', true, 'Can edit assigned groups');
SELECT insert_role_template('groups:edit', 'ministry_leader', true, 'Can edit their groups');
SELECT insert_role_template('groups:edit', 'secretary', true, 'Administrative group updates');

-- groups:delete
SELECT insert_role_template('groups:delete', 'tenant_admin', true, 'Only admins can delete groups');
SELECT insert_role_template('groups:delete', 'senior_pastor', true, 'Can remove inactive groups');
SELECT insert_role_template('groups:delete', 'secretary', false, 'Optional - with approval');

-- groups:members
SELECT insert_role_template('groups:members', 'tenant_admin', true, 'Can manage all group memberships');
SELECT insert_role_template('groups:members', 'senior_pastor', true, 'Can manage group members');
SELECT insert_role_template('groups:members', 'associate_pastor', true, 'Can manage assigned groups');
SELECT insert_role_template('groups:members', 'ministry_leader', true, 'Can manage their group members');
SELECT insert_role_template('groups:members', 'secretary', true, 'Administrative member management');
SELECT insert_role_template('groups:members', 'volunteer', false, 'Optional - assist with check-in');

-- -------------------------------------------------------------------------------------
-- EVENTS (events.core)
-- -------------------------------------------------------------------------------------

-- events:view
SELECT insert_role_template('events:view', 'tenant_admin', true, 'Full access to events');
SELECT insert_role_template('events:view', 'senior_pastor', true, 'View all church events');
SELECT insert_role_template('events:view', 'associate_pastor', true, 'View ministry events');
SELECT insert_role_template('events:view', 'ministry_leader', true, 'View relevant events');
SELECT insert_role_template('events:view', 'secretary', true, 'Administrative event viewing');
SELECT insert_role_template('events:view', 'deacon_elder', true, 'View church calendar');
SELECT insert_role_template('events:view', 'volunteer', true, 'View events they serve at');
SELECT insert_role_template('events:view', 'member', true, 'View church events');
SELECT insert_role_template('events:view', 'visitor', true, 'View public events');

-- events:create
SELECT insert_role_template('events:create', 'tenant_admin', true, 'Can create new events');
SELECT insert_role_template('events:create', 'senior_pastor', true, 'Can schedule events');
SELECT insert_role_template('events:create', 'associate_pastor', true, 'Can create ministry events');
SELECT insert_role_template('events:create', 'ministry_leader', true, 'Can create group events');
SELECT insert_role_template('events:create', 'secretary', true, 'Administrative event creation');

-- events:edit
SELECT insert_role_template('events:edit', 'tenant_admin', true, 'Can edit all events');
SELECT insert_role_template('events:edit', 'senior_pastor', true, 'Can update event details');
SELECT insert_role_template('events:edit', 'associate_pastor', true, 'Can edit ministry events');
SELECT insert_role_template('events:edit', 'ministry_leader', true, 'Can edit their events');
SELECT insert_role_template('events:edit', 'secretary', true, 'Administrative event updates');

-- events:delete
SELECT insert_role_template('events:delete', 'tenant_admin', true, 'Can delete events');
SELECT insert_role_template('events:delete', 'senior_pastor', true, 'Can remove events');
SELECT insert_role_template('events:delete', 'secretary', false, 'Optional - with approval');

-- events:publish
SELECT insert_role_template('events:publish', 'tenant_admin', true, 'Can publish events');
SELECT insert_role_template('events:publish', 'senior_pastor', true, 'Can make events public');
SELECT insert_role_template('events:publish', 'associate_pastor', true, 'Can publish ministry events');
SELECT insert_role_template('events:publish', 'ministry_leader', false, 'Optional - publish group events');
SELECT insert_role_template('events:publish', 'secretary', true, 'Administrative publishing');

-- -------------------------------------------------------------------------------------
-- EVENT REGISTRATION (events.registration) - Premium
-- -------------------------------------------------------------------------------------

-- events:registrations_view
SELECT insert_role_template('events:registrations_view', 'tenant_admin', true, 'Full access to registrations');
SELECT insert_role_template('events:registrations_view', 'senior_pastor', true, 'View all registrations');
SELECT insert_role_template('events:registrations_view', 'associate_pastor', true, 'View ministry registrations');
SELECT insert_role_template('events:registrations_view', 'ministry_leader', true, 'View event registrations');
SELECT insert_role_template('events:registrations_view', 'secretary', true, 'Administrative registration viewing');
SELECT insert_role_template('events:registrations_view', 'volunteer', true, 'Check-in volunteers');

-- events:registrations_manage
SELECT insert_role_template('events:registrations_manage', 'tenant_admin', true, 'Can approve/cancel registrations');
SELECT insert_role_template('events:registrations_manage', 'senior_pastor', true, 'Can manage registrations');
SELECT insert_role_template('events:registrations_manage', 'associate_pastor', true, 'Can manage ministry registrations');
SELECT insert_role_template('events:registrations_manage', 'ministry_leader', true, 'Can manage event sign-ups');
SELECT insert_role_template('events:registrations_manage', 'secretary', true, 'Administrative registration management');

-- events:attendance
SELECT insert_role_template('events:attendance', 'tenant_admin', true, 'Can record attendance');
SELECT insert_role_template('events:attendance', 'senior_pastor', true, 'Can track attendance');
SELECT insert_role_template('events:attendance', 'associate_pastor', true, 'Can record ministry attendance');
SELECT insert_role_template('events:attendance', 'ministry_leader', true, 'Can record group attendance');
SELECT insert_role_template('events:attendance', 'secretary', true, 'Administrative attendance tracking');
SELECT insert_role_template('events:attendance', 'volunteer', true, 'Check-in volunteers');

-- -------------------------------------------------------------------------------------
-- GOALS & OBJECTIVES (goals.core)
-- -------------------------------------------------------------------------------------

-- goals:view
SELECT insert_role_template('goals:view', 'tenant_admin', true, 'Full access to goals');
SELECT insert_role_template('goals:view', 'senior_pastor', true, 'View all church goals');
SELECT insert_role_template('goals:view', 'associate_pastor', true, 'View ministry goals');
SELECT insert_role_template('goals:view', 'ministry_leader', true, 'View assigned goals');
SELECT insert_role_template('goals:view', 'treasurer', false, 'Optional - financial goals');
SELECT insert_role_template('goals:view', 'secretary', true, 'Administrative goal viewing');
SELECT insert_role_template('goals:view', 'deacon_elder', true, 'Governance oversight');
SELECT insert_role_template('goals:view', 'member', true, 'View staff-level goals');

-- goals:view_leadership
SELECT insert_role_template('goals:view_leadership', 'tenant_admin', true, 'Can view leadership goals');
SELECT insert_role_template('goals:view_leadership', 'senior_pastor', true, 'Can view all leadership goals');
SELECT insert_role_template('goals:view_leadership', 'associate_pastor', false, 'Optional - leadership visibility');
SELECT insert_role_template('goals:view_leadership', 'deacon_elder', true, 'Board oversight of goals');

-- goals:view_all
SELECT insert_role_template('goals:view_all', 'tenant_admin', true, 'Can view all goals including private');
SELECT insert_role_template('goals:view_all', 'senior_pastor', true, 'Full goal visibility');

-- goals:create
SELECT insert_role_template('goals:create', 'tenant_admin', true, 'Can create goals');
SELECT insert_role_template('goals:create', 'senior_pastor', true, 'Can create church goals');
SELECT insert_role_template('goals:create', 'associate_pastor', true, 'Can create ministry goals');
SELECT insert_role_template('goals:create', 'ministry_leader', false, 'Optional - create group goals');

-- goals:edit
SELECT insert_role_template('goals:edit', 'tenant_admin', true, 'Can edit all goals');
SELECT insert_role_template('goals:edit', 'senior_pastor', true, 'Can edit church goals');
SELECT insert_role_template('goals:edit', 'associate_pastor', true, 'Can edit ministry goals');
SELECT insert_role_template('goals:edit', 'ministry_leader', false, 'Optional - edit assigned goals');

-- goals:delete
SELECT insert_role_template('goals:delete', 'tenant_admin', true, 'Can delete goals');
SELECT insert_role_template('goals:delete', 'senior_pastor', true, 'Can remove goals');

-- objectives:manage
SELECT insert_role_template('objectives:manage', 'tenant_admin', true, 'Can manage objectives');
SELECT insert_role_template('objectives:manage', 'senior_pastor', true, 'Can manage all objectives');
SELECT insert_role_template('objectives:manage', 'associate_pastor', true, 'Can manage ministry objectives');
SELECT insert_role_template('objectives:manage', 'ministry_leader', false, 'Optional - manage assigned objectives');

-- key_results:manage
SELECT insert_role_template('key_results:manage', 'tenant_admin', true, 'Can manage key results');
SELECT insert_role_template('key_results:manage', 'senior_pastor', true, 'Can manage all key results');
SELECT insert_role_template('key_results:manage', 'associate_pastor', true, 'Can manage ministry key results');
SELECT insert_role_template('key_results:manage', 'ministry_leader', false, 'Optional - manage assigned KRs');

-- key_results:record_progress
SELECT insert_role_template('key_results:record_progress', 'tenant_admin', true, 'Can record progress');
SELECT insert_role_template('key_results:record_progress', 'senior_pastor', true, 'Can update progress');
SELECT insert_role_template('key_results:record_progress', 'associate_pastor', true, 'Can record ministry progress');
SELECT insert_role_template('key_results:record_progress', 'ministry_leader', true, 'Can record assigned progress');

-- -------------------------------------------------------------------------------------
-- CARE PLANS (care.plans) - Premium
-- -------------------------------------------------------------------------------------

-- care:view
SELECT insert_role_template('care:view', 'tenant_admin', true, 'Full access to care plans');
SELECT insert_role_template('care:view', 'senior_pastor', true, 'Pastoral care oversight');
SELECT insert_role_template('care:view', 'associate_pastor', true, 'View assigned care plans');
SELECT insert_role_template('care:view', 'deacon_elder', true, 'Deacon care ministry');

-- care:create
SELECT insert_role_template('care:create', 'tenant_admin', true, 'Can create care plans');
SELECT insert_role_template('care:create', 'senior_pastor', true, 'Can initiate care plans');
SELECT insert_role_template('care:create', 'associate_pastor', true, 'Can create care plans');
SELECT insert_role_template('care:create', 'deacon_elder', false, 'Optional - deacon-initiated care');

-- care:edit
SELECT insert_role_template('care:edit', 'tenant_admin', true, 'Can edit all care plans');
SELECT insert_role_template('care:edit', 'senior_pastor', true, 'Can update care plans');
SELECT insert_role_template('care:edit', 'associate_pastor', true, 'Can edit assigned care plans');
SELECT insert_role_template('care:edit', 'deacon_elder', false, 'Optional - update assigned care');

-- care:delete
SELECT insert_role_template('care:delete', 'tenant_admin', true, 'Only admins can delete care plans');

-- care:assign
SELECT insert_role_template('care:assign', 'tenant_admin', true, 'Can assign caregivers');
SELECT insert_role_template('care:assign', 'senior_pastor', true, 'Can assign care responsibilities');
SELECT insert_role_template('care:assign', 'associate_pastor', true, 'Can assign within ministry');

-- care:complete
SELECT insert_role_template('care:complete', 'tenant_admin', true, 'Can mark care plans complete');
SELECT insert_role_template('care:complete', 'senior_pastor', true, 'Can close care plans');
SELECT insert_role_template('care:complete', 'associate_pastor', true, 'Can complete assigned care');
SELECT insert_role_template('care:complete', 'deacon_elder', true, 'Can complete deacon care');

-- -------------------------------------------------------------------------------------
-- DISCIPLESHIP (discipleship.plans) - Premium
-- -------------------------------------------------------------------------------------

-- discipleship:view
SELECT insert_role_template('discipleship:view', 'tenant_admin', true, 'Full access to discipleship');
SELECT insert_role_template('discipleship:view', 'senior_pastor', true, 'Discipleship oversight');
SELECT insert_role_template('discipleship:view', 'associate_pastor', true, 'View discipleship plans');
SELECT insert_role_template('discipleship:view', 'deacon_elder', false, 'Optional - discipleship involvement');

-- discipleship:create
SELECT insert_role_template('discipleship:create', 'tenant_admin', true, 'Can create discipleship plans');
SELECT insert_role_template('discipleship:create', 'senior_pastor', true, 'Can start discipleship journeys');
SELECT insert_role_template('discipleship:create', 'associate_pastor', true, 'Can create discipleship plans');

-- discipleship:edit
SELECT insert_role_template('discipleship:edit', 'tenant_admin', true, 'Can edit discipleship plans');
SELECT insert_role_template('discipleship:edit', 'senior_pastor', true, 'Can update plans');
SELECT insert_role_template('discipleship:edit', 'associate_pastor', true, 'Can edit assigned plans');

-- discipleship:delete
SELECT insert_role_template('discipleship:delete', 'tenant_admin', true, 'Only admins can delete discipleship records');

-- discipleship:assign
SELECT insert_role_template('discipleship:assign', 'tenant_admin', true, 'Can assign mentors');
SELECT insert_role_template('discipleship:assign', 'senior_pastor', true, 'Can match mentors and disciples');
SELECT insert_role_template('discipleship:assign', 'associate_pastor', true, 'Can assign within ministry');

-- discipleship:progress
SELECT insert_role_template('discipleship:progress', 'tenant_admin', true, 'Can update progress milestones');
SELECT insert_role_template('discipleship:progress', 'senior_pastor', true, 'Can track progress');
SELECT insert_role_template('discipleship:progress', 'associate_pastor', true, 'Can record progress');

-- -------------------------------------------------------------------------------------
-- FINANCE (finance.core + finance.management) - MAKER-CHECKER PATTERN
-- -------------------------------------------------------------------------------------

-- finance:view - Treasurer, Auditor, and limited others
SELECT insert_role_template('finance:view', 'tenant_admin', true, 'Full access to financial data');
SELECT insert_role_template('finance:view', 'senior_pastor', false, 'Optional - pastoral financial awareness');
SELECT insert_role_template('finance:view', 'treasurer', true, 'Operational financial access');
SELECT insert_role_template('finance:view', 'auditor', true, 'Audit requires full financial visibility');
SELECT insert_role_template('finance:view', 'deacon_elder', false, 'Optional - board financial oversight');

-- finance:view_summary - Broader access to summaries
SELECT insert_role_template('finance:view_summary', 'tenant_admin', true, 'Can view financial summaries');
SELECT insert_role_template('finance:view_summary', 'senior_pastor', true, 'Pastoral awareness of finances');
SELECT insert_role_template('finance:view_summary', 'treasurer', true, 'Operational summary access');
SELECT insert_role_template('finance:view_summary', 'auditor', true, 'Audit summary access');
SELECT insert_role_template('finance:view_summary', 'secretary', false, 'Optional - administrative awareness');
SELECT insert_role_template('finance:view_summary', 'deacon_elder', true, 'Board financial oversight');

-- finance:create - MAKER: Treasurer only (+ admin)
SELECT insert_role_template('finance:create', 'tenant_admin', true, 'Admin can create transactions');
SELECT insert_role_template('finance:create', 'treasurer', true, 'MAKER: Creates financial transactions');

-- finance:edit - MAKER: Treasurer only (+ admin)
SELECT insert_role_template('finance:edit', 'tenant_admin', true, 'Admin can edit transactions');
SELECT insert_role_template('finance:edit', 'treasurer', true, 'MAKER: Can modify transactions');

-- finance:delete - Very restricted
SELECT insert_role_template('finance:delete', 'tenant_admin', true, 'Admin can delete transactions');
SELECT insert_role_template('finance:delete', 'treasurer', false, 'Optional - with audit trail');

-- finance:approve - CHECKER: Auditor only (+ admin)
SELECT insert_role_template('finance:approve', 'tenant_admin', true, 'Admin can approve transactions');
SELECT insert_role_template('finance:approve', 'auditor', true, 'CHECKER: Approves transactions before posting');

-- -------------------------------------------------------------------------------------
-- BUDGETS (finance.budgets) - Professional - MAKER-CHECKER PATTERN
-- -------------------------------------------------------------------------------------

-- budgets:view
SELECT insert_role_template('budgets:view', 'tenant_admin', true, 'Full access to budgets');
SELECT insert_role_template('budgets:view', 'senior_pastor', false, 'Optional - pastoral budget awareness');
SELECT insert_role_template('budgets:view', 'treasurer', true, 'Operational budget access');
SELECT insert_role_template('budgets:view', 'auditor', true, 'Audit requires budget visibility');
SELECT insert_role_template('budgets:view', 'deacon_elder', false, 'Optional - board budget oversight');

-- budgets:create - MAKER: Treasurer only (+ admin)
SELECT insert_role_template('budgets:create', 'tenant_admin', true, 'Admin can create budgets');
SELECT insert_role_template('budgets:create', 'treasurer', true, 'MAKER: Creates budget allocations');

-- budgets:edit - MAKER: Treasurer only (+ admin)
SELECT insert_role_template('budgets:edit', 'tenant_admin', true, 'Admin can edit budgets');
SELECT insert_role_template('budgets:edit', 'treasurer', true, 'MAKER: Can modify budget allocations');

-- budgets:delete - Very restricted
SELECT insert_role_template('budgets:delete', 'tenant_admin', true, 'Admin can delete budgets');
SELECT insert_role_template('budgets:delete', 'treasurer', false, 'Optional - with audit trail');

-- budgets:approve - CHECKER: Auditor AND Deacon/Elder (governance)
SELECT insert_role_template('budgets:approve', 'tenant_admin', true, 'Admin can approve budgets');
SELECT insert_role_template('budgets:approve', 'auditor', true, 'CHECKER: Approves budget changes');
SELECT insert_role_template('budgets:approve', 'deacon_elder', true, 'GOVERNANCE: Board approves budgets');

-- -------------------------------------------------------------------------------------
-- GIVING PROFILES (giving.profiles) - Professional
-- -------------------------------------------------------------------------------------

-- giving:view
SELECT insert_role_template('giving:view', 'tenant_admin', true, 'Full access to giving profiles');
SELECT insert_role_template('giving:view', 'treasurer', true, 'Operational giving access');
SELECT insert_role_template('giving:view', 'auditor', true, 'Audit verification of giving');

-- giving:edit
SELECT insert_role_template('giving:edit', 'tenant_admin', true, 'Admin can edit giving profiles');
SELECT insert_role_template('giving:edit', 'treasurer', true, 'Can update giving information');

-- -------------------------------------------------------------------------------------
-- SERVING (serving.core) - Professional
-- -------------------------------------------------------------------------------------

-- serving:view
SELECT insert_role_template('serving:view', 'tenant_admin', true, 'Full access to serving');
SELECT insert_role_template('serving:view', 'senior_pastor', true, 'View all serving assignments');
SELECT insert_role_template('serving:view', 'associate_pastor', true, 'View ministry serving');
SELECT insert_role_template('serving:view', 'ministry_leader', true, 'View group serving');
SELECT insert_role_template('serving:view', 'secretary', true, 'Administrative serving viewing');
SELECT insert_role_template('serving:view', 'deacon_elder', false, 'Optional - serving oversight');
SELECT insert_role_template('serving:view', 'volunteer', true, 'View own serving schedule');
SELECT insert_role_template('serving:view', 'member', false, 'Optional - available opportunities');

-- serving:create
SELECT insert_role_template('serving:create', 'tenant_admin', true, 'Can create serving assignments');
SELECT insert_role_template('serving:create', 'senior_pastor', true, 'Can create assignments');
SELECT insert_role_template('serving:create', 'associate_pastor', true, 'Can create ministry assignments');
SELECT insert_role_template('serving:create', 'ministry_leader', true, 'Can create group assignments');
SELECT insert_role_template('serving:create', 'secretary', true, 'Administrative assignment creation');

-- serving:edit
SELECT insert_role_template('serving:edit', 'tenant_admin', true, 'Can edit serving assignments');
SELECT insert_role_template('serving:edit', 'senior_pastor', true, 'Can update assignments');
SELECT insert_role_template('serving:edit', 'associate_pastor', true, 'Can edit ministry assignments');
SELECT insert_role_template('serving:edit', 'ministry_leader', true, 'Can edit group assignments');
SELECT insert_role_template('serving:edit', 'secretary', true, 'Administrative assignment updates');

-- serving:delete
SELECT insert_role_template('serving:delete', 'tenant_admin', true, 'Can delete serving assignments');
SELECT insert_role_template('serving:delete', 'senior_pastor', true, 'Can remove assignments');
SELECT insert_role_template('serving:delete', 'secretary', false, 'Optional - with approval');

-- -------------------------------------------------------------------------------------
-- NOTIFICATIONS (notifications.core + push + scheduled)
-- -------------------------------------------------------------------------------------

-- notifications:view - Everyone
SELECT insert_role_template('notifications:view', 'tenant_admin', true, 'Can view all notifications');
SELECT insert_role_template('notifications:view', 'senior_pastor', true, 'Can view notifications');
SELECT insert_role_template('notifications:view', 'associate_pastor', true, 'Can view notifications');
SELECT insert_role_template('notifications:view', 'ministry_leader', true, 'Can view notifications');
SELECT insert_role_template('notifications:view', 'treasurer', true, 'Can view notifications');
SELECT insert_role_template('notifications:view', 'auditor', true, 'Can view notifications');
SELECT insert_role_template('notifications:view', 'secretary', true, 'Can view notifications');
SELECT insert_role_template('notifications:view', 'deacon_elder', true, 'Can view notifications');
SELECT insert_role_template('notifications:view', 'volunteer', true, 'Can view notifications');
SELECT insert_role_template('notifications:view', 'member', true, 'Can view notifications');
SELECT insert_role_template('notifications:view', 'visitor', true, 'Can view notifications');

-- notifications:manage - Everyone
SELECT insert_role_template('notifications:manage', 'tenant_admin', true, 'Can manage notifications');
SELECT insert_role_template('notifications:manage', 'senior_pastor', true, 'Can manage notifications');
SELECT insert_role_template('notifications:manage', 'associate_pastor', true, 'Can manage notifications');
SELECT insert_role_template('notifications:manage', 'ministry_leader', true, 'Can manage notifications');
SELECT insert_role_template('notifications:manage', 'treasurer', true, 'Can manage notifications');
SELECT insert_role_template('notifications:manage', 'auditor', true, 'Can manage notifications');
SELECT insert_role_template('notifications:manage', 'secretary', true, 'Can manage notifications');
SELECT insert_role_template('notifications:manage', 'deacon_elder', true, 'Can manage notifications');
SELECT insert_role_template('notifications:manage', 'volunteer', true, 'Can manage notifications');
SELECT insert_role_template('notifications:manage', 'member', true, 'Can manage notifications');
SELECT insert_role_template('notifications:manage', 'visitor', true, 'Can manage notifications');

-- notifications:preferences - Everyone
SELECT insert_role_template('notifications:preferences', 'tenant_admin', true, 'Can set preferences');
SELECT insert_role_template('notifications:preferences', 'senior_pastor', true, 'Can set preferences');
SELECT insert_role_template('notifications:preferences', 'associate_pastor', true, 'Can set preferences');
SELECT insert_role_template('notifications:preferences', 'ministry_leader', true, 'Can set preferences');
SELECT insert_role_template('notifications:preferences', 'treasurer', true, 'Can set preferences');
SELECT insert_role_template('notifications:preferences', 'auditor', true, 'Can set preferences');
SELECT insert_role_template('notifications:preferences', 'secretary', true, 'Can set preferences');
SELECT insert_role_template('notifications:preferences', 'deacon_elder', true, 'Can set preferences');
SELECT insert_role_template('notifications:preferences', 'volunteer', true, 'Can set preferences');
SELECT insert_role_template('notifications:preferences', 'member', true, 'Can set preferences');
SELECT insert_role_template('notifications:preferences', 'visitor', true, 'Can set preferences');

-- notifications:send - Leadership and admin roles
SELECT insert_role_template('notifications:send', 'tenant_admin', true, 'Can send notifications');
SELECT insert_role_template('notifications:send', 'senior_pastor', true, 'Can send notifications');
SELECT insert_role_template('notifications:send', 'associate_pastor', true, 'Can send ministry notifications');
SELECT insert_role_template('notifications:send', 'ministry_leader', true, 'Can send group notifications');
SELECT insert_role_template('notifications:send', 'secretary', true, 'Administrative notifications');

-- notifications:push_send - Premium
SELECT insert_role_template('notifications:push_send', 'tenant_admin', true, 'Can send push notifications');
SELECT insert_role_template('notifications:push_send', 'senior_pastor', true, 'Can send push notifications');
SELECT insert_role_template('notifications:push_send', 'associate_pastor', true, 'Can send ministry push');
SELECT insert_role_template('notifications:push_send', 'ministry_leader', false, 'Optional - group push');
SELECT insert_role_template('notifications:push_send', 'secretary', true, 'Administrative push notifications');

-- notifications:push_manage - Admin only
SELECT insert_role_template('notifications:push_manage', 'tenant_admin', true, 'Can manage device tokens');

-- notifications:schedule - Enterprise
SELECT insert_role_template('notifications:schedule', 'tenant_admin', true, 'Can schedule notifications');
SELECT insert_role_template('notifications:schedule', 'senior_pastor', true, 'Can schedule announcements');
SELECT insert_role_template('notifications:schedule', 'associate_pastor', false, 'Optional - schedule ministry notifications');
SELECT insert_role_template('notifications:schedule', 'secretary', true, 'Administrative scheduling');

-- notifications:bulk_send - Enterprise
SELECT insert_role_template('notifications:bulk_send', 'tenant_admin', true, 'Can send bulk notifications');
SELECT insert_role_template('notifications:bulk_send', 'senior_pastor', true, 'Can send to large groups');
SELECT insert_role_template('notifications:bulk_send', 'associate_pastor', false, 'Optional - bulk ministry notifications');
SELECT insert_role_template('notifications:bulk_send', 'secretary', true, 'Administrative bulk send');

-- -------------------------------------------------------------------------------------
-- INTEGRATIONS (email, sms, api)
-- -------------------------------------------------------------------------------------

-- integrations:email_view
SELECT insert_role_template('integrations:email_view', 'tenant_admin', true, 'Can view email configuration');
SELECT insert_role_template('integrations:email_view', 'secretary', false, 'Optional - administrative awareness');

-- integrations:email_send
SELECT insert_role_template('integrations:email_send', 'tenant_admin', true, 'Can send emails');
SELECT insert_role_template('integrations:email_send', 'senior_pastor', true, 'Can send pastoral emails');
SELECT insert_role_template('integrations:email_send', 'associate_pastor', true, 'Can send ministry emails');
SELECT insert_role_template('integrations:email_send', 'ministry_leader', false, 'Optional - group emails');
SELECT insert_role_template('integrations:email_send', 'secretary', true, 'Administrative emails');

-- integrations:email_configure - Admin only
SELECT insert_role_template('integrations:email_configure', 'tenant_admin', true, 'Can configure email provider');

-- integrations:email_test - Admin only
SELECT insert_role_template('integrations:email_test', 'tenant_admin', true, 'Can send test emails');

-- integrations:email_templates - Admin and secretary
SELECT insert_role_template('integrations:email_templates', 'tenant_admin', true, 'Can manage email templates');
SELECT insert_role_template('integrations:email_templates', 'secretary', false, 'Optional - template management');

-- integrations:sms_configure - Admin only
SELECT insert_role_template('integrations:sms_configure', 'tenant_admin', true, 'Can configure SMS provider');

-- integrations:sms_test - Admin only
SELECT insert_role_template('integrations:sms_test', 'tenant_admin', true, 'Can send test SMS');

-- integrations:sms_send
SELECT insert_role_template('integrations:sms_send', 'tenant_admin', true, 'Can send SMS to members');
SELECT insert_role_template('integrations:sms_send', 'senior_pastor', true, 'Can send pastoral SMS');
SELECT insert_role_template('integrations:sms_send', 'associate_pastor', false, 'Optional - ministry SMS');
SELECT insert_role_template('integrations:sms_send', 'secretary', true, 'Administrative SMS');

-- integrations:api_access - Admin only
SELECT insert_role_template('integrations:api_access', 'tenant_admin', true, 'Can use REST API');

-- integrations:webhook_configure - Admin only
SELECT insert_role_template('integrations:webhook_configure', 'tenant_admin', true, 'Can setup webhook endpoints');

-- integrations:webhook_test - Admin only
SELECT insert_role_template('integrations:webhook_test', 'tenant_admin', true, 'Can test webhook delivery');

-- -------------------------------------------------------------------------------------
-- RBAC & SECURITY
-- -------------------------------------------------------------------------------------

-- rbac:view
SELECT insert_role_template('rbac:view', 'tenant_admin', true, 'Can view RBAC settings');
SELECT insert_role_template('rbac:view', 'senior_pastor', true, 'Pastoral RBAC awareness');
SELECT insert_role_template('rbac:view', 'auditor', false, 'Optional - security audit');

-- rbac:roles_view
SELECT insert_role_template('rbac:roles_view', 'tenant_admin', true, 'Can view role definitions');
SELECT insert_role_template('rbac:roles_view', 'senior_pastor', false, 'Optional - role awareness');

-- rbac:users_view
SELECT insert_role_template('rbac:users_view', 'tenant_admin', true, 'Can view user role assignments');
SELECT insert_role_template('rbac:users_view', 'senior_pastor', false, 'Optional - staff awareness');

-- rbac:roles_create - Admin only
SELECT insert_role_template('rbac:roles_create', 'tenant_admin', true, 'Can create custom roles');

-- rbac:roles_edit - Admin only
SELECT insert_role_template('rbac:roles_edit', 'tenant_admin', true, 'Can modify role definitions');

-- rbac:roles_delete - Admin only
SELECT insert_role_template('rbac:roles_delete', 'tenant_admin', true, 'Can remove custom roles');

-- rbac:assign - Admin only
SELECT insert_role_template('rbac:assign', 'tenant_admin', true, 'Can assign roles to users');

-- rbac:revoke - Admin only
SELECT insert_role_template('rbac:revoke', 'tenant_admin', true, 'Can revoke user roles');

-- rbac:audit_view - Admin and Auditor
SELECT insert_role_template('rbac:audit_view', 'tenant_admin', true, 'Can view RBAC audit logs');
SELECT insert_role_template('rbac:audit_view', 'auditor', true, 'Security audit access');

-- rbac:audit_export - Admin and Auditor
SELECT insert_role_template('rbac:audit_export', 'tenant_admin', true, 'Can export audit logs');
SELECT insert_role_template('rbac:audit_export', 'auditor', true, 'Audit export for compliance');

-- rbac:delegate - Admin only
SELECT insert_role_template('rbac:delegate', 'tenant_admin', true, 'Can delegate roles to others');

-- rbac:delegate_revoke - Admin only
SELECT insert_role_template('rbac:delegate_revoke', 'tenant_admin', true, 'Can revoke delegated access');

-- rbac:delegate_view - Admin only
SELECT insert_role_template('rbac:delegate_view', 'tenant_admin', true, 'Can view active delegations');

-- rbac:multi_role_enable - Admin only
SELECT insert_role_template('rbac:multi_role_enable', 'tenant_admin', true, 'Can enable multi-role support');

-- rbac:multi_role_assign - Admin only
SELECT insert_role_template('rbac:multi_role_assign', 'tenant_admin', true, 'Can assign multiple roles');

-- rbac:multi_role_analyze - Admin only
SELECT insert_role_template('rbac:multi_role_analyze', 'tenant_admin', true, 'Can check for permission conflicts');

-- -------------------------------------------------------------------------------------
-- SETTINGS & DASHBOARD
-- -------------------------------------------------------------------------------------

-- settings:view
SELECT insert_role_template('settings:view', 'tenant_admin', true, 'Can view tenant settings');
SELECT insert_role_template('settings:view', 'senior_pastor', false, 'Optional - settings awareness');

-- settings:edit - Admin only
SELECT insert_role_template('settings:edit', 'tenant_admin', true, 'Can modify tenant settings');

-- dashboard:view - Most staff roles
SELECT insert_role_template('dashboard:view', 'tenant_admin', true, 'Full dashboard access');
SELECT insert_role_template('dashboard:view', 'senior_pastor', true, 'Pastoral dashboard');
SELECT insert_role_template('dashboard:view', 'associate_pastor', true, 'Ministry dashboard');
SELECT insert_role_template('dashboard:view', 'ministry_leader', true, 'Group dashboard');
SELECT insert_role_template('dashboard:view', 'treasurer', true, 'Finance dashboard');
SELECT insert_role_template('dashboard:view', 'auditor', true, 'Audit dashboard');
SELECT insert_role_template('dashboard:view', 'secretary', true, 'Administrative dashboard');
SELECT insert_role_template('dashboard:view', 'deacon_elder', true, 'Governance dashboard');

-- dashboard:widgets - Same as dashboard:view
SELECT insert_role_template('dashboard:widgets', 'tenant_admin', true, 'Can view all widgets');
SELECT insert_role_template('dashboard:widgets', 'senior_pastor', true, 'Pastoral widgets');
SELECT insert_role_template('dashboard:widgets', 'associate_pastor', true, 'Ministry widgets');
SELECT insert_role_template('dashboard:widgets', 'ministry_leader', true, 'Group widgets');
SELECT insert_role_template('dashboard:widgets', 'treasurer', true, 'Finance widgets');
SELECT insert_role_template('dashboard:widgets', 'auditor', true, 'Audit widgets');
SELECT insert_role_template('dashboard:widgets', 'secretary', true, 'Administrative widgets');
SELECT insert_role_template('dashboard:widgets', 'deacon_elder', true, 'Governance widgets');

-- -------------------------------------------------------------------------------------
-- REPORTS
-- -------------------------------------------------------------------------------------

-- reports:view
SELECT insert_role_template('reports:view', 'tenant_admin', true, 'Full access to reports');
SELECT insert_role_template('reports:view', 'senior_pastor', true, 'Pastoral reports');
SELECT insert_role_template('reports:view', 'associate_pastor', true, 'Ministry reports');
SELECT insert_role_template('reports:view', 'ministry_leader', false, 'Optional - group reports');
SELECT insert_role_template('reports:view', 'treasurer', true, 'Financial reports');
SELECT insert_role_template('reports:view', 'auditor', true, 'Audit reports');
SELECT insert_role_template('reports:view', 'secretary', true, 'Administrative reports');
SELECT insert_role_template('reports:view', 'deacon_elder', true, 'Governance reports');

-- reports:export_basic
SELECT insert_role_template('reports:export_basic', 'tenant_admin', true, 'Can export reports to CSV');
SELECT insert_role_template('reports:export_basic', 'senior_pastor', true, 'Pastoral exports');
SELECT insert_role_template('reports:export_basic', 'associate_pastor', false, 'Optional - ministry exports');
SELECT insert_role_template('reports:export_basic', 'treasurer', true, 'Financial exports');
SELECT insert_role_template('reports:export_basic', 'auditor', true, 'Audit exports');
SELECT insert_role_template('reports:export_basic', 'secretary', true, 'Administrative exports');

-- reports:generate
SELECT insert_role_template('reports:generate', 'tenant_admin', true, 'Can generate comprehensive reports');
SELECT insert_role_template('reports:generate', 'senior_pastor', false, 'Optional - custom reports');
SELECT insert_role_template('reports:generate', 'treasurer', true, 'Financial report generation');
SELECT insert_role_template('reports:generate', 'auditor', true, 'Audit report generation');
SELECT insert_role_template('reports:generate', 'secretary', false, 'Optional - administrative reports');

-- reports:export_advanced
SELECT insert_role_template('reports:export_advanced', 'tenant_admin', true, 'Can export to PDF/Excel');
SELECT insert_role_template('reports:export_advanced', 'treasurer', true, 'Advanced financial exports');
SELECT insert_role_template('reports:export_advanced', 'auditor', true, 'Advanced audit exports');

-- reports:schedule
SELECT insert_role_template('reports:schedule', 'tenant_admin', true, 'Can schedule automated reports');
SELECT insert_role_template('reports:schedule', 'treasurer', true, 'Schedule financial reports');

-- -------------------------------------------------------------------------------------
-- LIMITS (Enterprise)
-- -------------------------------------------------------------------------------------

-- limits:unlimited_members - Admin only
SELECT insert_role_template('limits:unlimited_members', 'tenant_admin', true, 'Unlimited member profiles enabled');

-- limits:unlimited_transactions - Admin only
SELECT insert_role_template('limits:unlimited_transactions', 'tenant_admin', true, 'Unlimited transactions enabled');

-- =====================================================================================
-- STEP 5: Cleanup helper function
-- =====================================================================================
DROP FUNCTION IF EXISTS insert_role_template(text, text, boolean, text);

-- =====================================================================================
-- STEP 6: Verify and log results
-- =====================================================================================
DO $$
DECLARE
  v_total_count integer;
  v_role_counts text;
BEGIN
  -- Total count
  SELECT COUNT(*) INTO v_total_count FROM permission_role_templates;

  -- Count by role
  SELECT string_agg(role_key || ': ' || cnt::text, ', ' ORDER BY role_key)
  INTO v_role_counts
  FROM (
    SELECT role_key, COUNT(*) as cnt
    FROM permission_role_templates
    GROUP BY role_key
  ) sub;

  RAISE NOTICE '=====================================================';
  RAISE NOTICE 'Role Persona Revamp Complete';
  RAISE NOTICE '=====================================================';
  RAISE NOTICE 'Total permission_role_templates created: %', v_total_count;
  RAISE NOTICE 'Templates by role: %', v_role_counts;
  RAISE NOTICE '=====================================================';
END $$;

-- =====================================================================================
-- STEP 7: Update sync_features_to_tenant_rpc with new role personas
-- =====================================================================================
-- Update the function to include proper names and descriptions for new role personas
CREATE OR REPLACE FUNCTION sync_features_to_tenant_rpc(p_tenant_id uuid)
RETURNS jsonb
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_permissions_created integer := 0;
  v_roles_created integer := 0;
  v_assignments_created integer := 0;
  v_result jsonb;
BEGIN
  -- ===== Step 1: Verify tenant exists =====
  IF NOT EXISTS (SELECT 1 FROM tenants WHERE id = p_tenant_id AND deleted_at IS NULL) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Tenant not found or deleted',
      'tenant_id', p_tenant_id
    );
  END IF;

  -- ===== Step 2: Batch insert all permissions from granted features =====
  WITH granted_feature_permissions AS (
    SELECT DISTINCT
      fp.permission_code,
      fp.display_name,
      fp.description,
      fp.category,
      fp.action
    FROM tenant_feature_grants tfg
    JOIN feature_permissions fp ON fp.feature_id = tfg.feature_id
    WHERE tfg.tenant_id = p_tenant_id
      AND (tfg.expires_at IS NULL OR tfg.expires_at > CURRENT_DATE)
  ),
  inserted_permissions AS (
    INSERT INTO permissions (tenant_id, code, name, description, module)
    SELECT
      p_tenant_id,
      gfp.permission_code,
      gfp.display_name,
      gfp.description,
      gfp.category
    FROM granted_feature_permissions gfp
    WHERE NOT EXISTS (
      SELECT 1 FROM permissions p
      WHERE p.tenant_id = p_tenant_id AND p.code = gfp.permission_code
    )
    ON CONFLICT DO NOTHING
    RETURNING 1
  )
  SELECT COUNT(*) INTO v_permissions_created FROM inserted_permissions;

  -- ===== Step 3: Batch create roles referenced in templates =====
  WITH needed_roles AS (
    SELECT DISTINCT
      CASE WHEN prt.role_key LIKE 'role_%' THEN prt.role_key ELSE 'role_' || prt.role_key END AS metadata_key,
      prt.role_key
    FROM permission_role_templates prt
    JOIN feature_permissions fp ON fp.id = prt.feature_permission_id
    JOIN tenant_feature_grants tfg ON tfg.feature_id = fp.feature_id
    WHERE tfg.tenant_id = p_tenant_id
      AND NOT EXISTS (
        SELECT 1 FROM roles r
        WHERE r.tenant_id = p_tenant_id
          AND r.metadata_key = CASE WHEN prt.role_key LIKE 'role_%' THEN prt.role_key ELSE 'role_' || prt.role_key END
          AND r.deleted_at IS NULL
      )
  ),
  inserted_roles AS (
    INSERT INTO roles (tenant_id, name, description, scope, metadata_key, is_delegatable)
    SELECT
      p_tenant_id,
      -- Role display names for new personas
      CASE nr.role_key
        WHEN 'tenant_admin' THEN 'Tenant Administrator'
        WHEN 'senior_pastor' THEN 'Senior Pastor'
        WHEN 'associate_pastor' THEN 'Associate Pastor'
        WHEN 'ministry_leader' THEN 'Ministry Leader'
        WHEN 'treasurer' THEN 'Treasurer'
        WHEN 'auditor' THEN 'Auditor'
        WHEN 'secretary' THEN 'Secretary'
        WHEN 'deacon_elder' THEN 'Deacon/Elder'
        WHEN 'volunteer' THEN 'Volunteer'
        WHEN 'member' THEN 'Member'
        WHEN 'visitor' THEN 'Visitor'
        -- Legacy roles for backwards compatibility
        WHEN 'staff' THEN 'Staff'
        WHEN 'finance_admin' THEN 'Finance Administrator'
        WHEN 'group_leader' THEN 'Group Leader'
        WHEN 'event_coordinator' THEN 'Event Coordinator'
        WHEN 'care_coordinator' THEN 'Care Coordinator'
        WHEN 'scheduler_admin' THEN 'Scheduler Administrator'
        ELSE INITCAP(REPLACE(nr.role_key, '_', ' '))
      END,
      -- Role descriptions for new personas
      CASE nr.role_key
        WHEN 'tenant_admin' THEN 'Full administrative control over all tenant resources'
        WHEN 'senior_pastor' THEN 'Primary spiritual leader with full operational access'
        WHEN 'associate_pastor' THEN 'Pastoral staff with comprehensive ministry access'
        WHEN 'ministry_leader' THEN 'Department or group leader with operational capabilities'
        WHEN 'treasurer' THEN 'Financial transaction creator (Maker role)'
        WHEN 'auditor' THEN 'Financial approver and oversight (Checker role)'
        WHEN 'secretary' THEN 'Administrative support for records and communications'
        WHEN 'deacon_elder' THEN 'Board oversight with budget approval authority'
        WHEN 'volunteer' THEN 'Task-specific access for service activities'
        WHEN 'member' THEN 'Self-service access for personal information'
        WHEN 'visitor' THEN 'Public information access only'
        -- Legacy descriptions
        WHEN 'staff' THEN 'Staff member with elevated access'
        WHEN 'finance_admin' THEN 'Finance management access'
        ELSE 'Auto-created role for ' || nr.role_key
      END,
      -- Scope assignment
      CASE nr.role_key
        WHEN 'tenant_admin' THEN 'tenant'
        WHEN 'ministry_leader' THEN 'delegated'
        WHEN 'group_leader' THEN 'delegated'
        ELSE 'tenant'
      END,
      nr.metadata_key,
      -- Delegatable roles
      CASE nr.role_key
        WHEN 'tenant_admin' THEN true
        WHEN 'senior_pastor' THEN true
        WHEN 'associate_pastor' THEN true
        WHEN 'ministry_leader' THEN true
        WHEN 'staff' THEN true
        ELSE false
      END
    FROM needed_roles nr
    ON CONFLICT (tenant_id, name) DO NOTHING
    RETURNING 1
  )
  SELECT COUNT(*) INTO v_roles_created FROM inserted_roles;

  -- ===== Step 4: Ensure tenant_admin exists (fallback) =====
  IF NOT EXISTS (
    SELECT 1 FROM roles WHERE tenant_id = p_tenant_id AND metadata_key = 'role_tenant_admin' AND deleted_at IS NULL
  ) THEN
    INSERT INTO roles (tenant_id, name, description, scope, metadata_key, is_delegatable)
    VALUES (p_tenant_id, 'Tenant Administrator', 'Full administrative control over all tenant resources', 'tenant', 'role_tenant_admin', true)
    ON CONFLICT (tenant_id, name) DO NOTHING;
    v_roles_created := v_roles_created + 1;
  END IF;

  -- ===== Step 5: Batch insert role-permission assignments =====
  WITH template_assignments AS (
    SELECT DISTINCT
      r.id AS role_id,
      p.id AS permission_id,
      p_tenant_id AS tenant_id
    FROM permission_role_templates prt
    JOIN feature_permissions fp ON fp.id = prt.feature_permission_id
    JOIN tenant_feature_grants tfg ON tfg.feature_id = fp.feature_id
    JOIN permissions p ON p.tenant_id = p_tenant_id AND p.code = fp.permission_code
    JOIN roles r ON r.tenant_id = p_tenant_id
      AND r.metadata_key = CASE WHEN prt.role_key LIKE 'role_%' THEN prt.role_key ELSE 'role_' || prt.role_key END
      AND r.deleted_at IS NULL
    WHERE tfg.tenant_id = p_tenant_id
      AND NOT EXISTS (
        SELECT 1 FROM role_permissions rp
        WHERE rp.role_id = r.id AND rp.permission_id = p.id AND rp.tenant_id = p_tenant_id
      )
  ),
  inserted_assignments AS (
    INSERT INTO role_permissions (role_id, permission_id, tenant_id)
    SELECT role_id, permission_id, tenant_id
    FROM template_assignments
    ON CONFLICT DO NOTHING
    RETURNING 1
  )
  SELECT COUNT(*) INTO v_assignments_created FROM inserted_assignments;

  -- ===== Step 6: Grant all permissions to tenant_admin =====
  WITH admin_role AS (
    SELECT id FROM roles
    WHERE tenant_id = p_tenant_id
      AND metadata_key = 'role_tenant_admin'
      AND deleted_at IS NULL
    LIMIT 1
  ),
  admin_assignments AS (
    INSERT INTO role_permissions (role_id, permission_id, tenant_id)
    SELECT ar.id, p.id, p_tenant_id
    FROM admin_role ar
    CROSS JOIN permissions p
    WHERE p.tenant_id = p_tenant_id
      AND NOT EXISTS (
        SELECT 1 FROM role_permissions rp
        WHERE rp.role_id = ar.id AND rp.permission_id = p.id
      )
    ON CONFLICT DO NOTHING
    RETURNING 1
  )
  SELECT v_assignments_created + COUNT(*) INTO v_assignments_created FROM admin_assignments;

  -- ===== Build result =====
  v_result := jsonb_build_object(
    'success', true,
    'tenant_id', p_tenant_id,
    'permissions_created', v_permissions_created,
    'roles_created', v_roles_created,
    'assignments_created', v_assignments_created
  );

  RETURN v_result;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION sync_features_to_tenant_rpc(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION sync_features_to_tenant_rpc(uuid) TO service_role;

COMMIT;
