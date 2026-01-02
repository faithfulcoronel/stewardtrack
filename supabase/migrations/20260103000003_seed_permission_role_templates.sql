-- =====================================================================================
-- MIGRATION: Seed Permission Role Templates
-- =====================================================================================
-- Assigns default role templates to all feature permissions.
-- This provides sensible defaults for which roles should have which permissions
-- when a tenant licenses a feature.
--
-- Role Keys:
--   - tenant_admin: Full administrative access to all features
--   - staff: Church staff with elevated permissions for daily operations
--   - volunteer: Limited access for volunteers helping with specific tasks
--   - member: Basic member access for self-service operations
--
-- Permission Assignment Strategy:
--   - tenant_admin: Gets ALL permissions (full control)
--   - staff: Gets most view/create/edit permissions (operational access)
--   - volunteer: Gets view permissions and limited operational access
--   - member: Gets self-service view permissions only
-- =====================================================================================

BEGIN;

-- =====================================================================================
-- STEP 1: Delete existing permission role templates (clean slate)
-- =====================================================================================
DELETE FROM permission_role_templates;

-- =====================================================================================
-- STEP 2: Helper function to insert role templates for a permission
-- =====================================================================================
CREATE OR REPLACE FUNCTION insert_permission_role_template(
  p_permission_code text,
  p_role_key text,
  p_is_recommended boolean DEFAULT true,
  p_reason text DEFAULT NULL
)
RETURNS void AS $$
DECLARE
  v_permission_id uuid;
BEGIN
  -- Get permission ID
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
-- CORE FEATURES - MEMBERS.CORE
-- =====================================================================================

-- members:view - All roles can view members
SELECT insert_permission_role_template('members:view', 'tenant_admin', true, 'Full access to member directory');
SELECT insert_permission_role_template('members:view', 'staff', true, 'Staff need to view member information');
SELECT insert_permission_role_template('members:view', 'volunteer', true, 'Volunteers may need to look up members');
SELECT insert_permission_role_template('members:view', 'member', true, 'Members can view the directory');

-- members:search - All roles can search members
SELECT insert_permission_role_template('members:search', 'tenant_admin', true, 'Full search capabilities');
SELECT insert_permission_role_template('members:search', 'staff', true, 'Staff need to search members');
SELECT insert_permission_role_template('members:search', 'volunteer', true, 'Volunteers may need to search members');
SELECT insert_permission_role_template('members:search', 'member', true, 'Members can search the directory');

-- members:create - Admin and staff can create members
SELECT insert_permission_role_template('members:create', 'tenant_admin', true, 'Can add new members');
SELECT insert_permission_role_template('members:create', 'staff', true, 'Staff can register new members');

-- members:edit - Admin and staff can edit members
SELECT insert_permission_role_template('members:edit', 'tenant_admin', true, 'Can edit all member records');
SELECT insert_permission_role_template('members:edit', 'staff', true, 'Staff can update member information');

-- members:delete - Only admin can delete members
SELECT insert_permission_role_template('members:delete', 'tenant_admin', true, 'Only admins can delete member records');

-- =====================================================================================
-- CORE FEATURES - HOUSEHOLDS.CORE
-- =====================================================================================

-- households:view - Admin, staff, volunteers can view
SELECT insert_permission_role_template('households:view', 'tenant_admin', true, 'Full access to household records');
SELECT insert_permission_role_template('households:view', 'staff', true, 'Staff need to view household information');
SELECT insert_permission_role_template('households:view', 'volunteer', true, 'Volunteers may need household info for ministry');

-- households:create - Admin and staff can create
SELECT insert_permission_role_template('households:create', 'tenant_admin', true, 'Can create new households');
SELECT insert_permission_role_template('households:create', 'staff', true, 'Staff can create household records');

-- households:edit - Admin and staff can edit
SELECT insert_permission_role_template('households:edit', 'tenant_admin', true, 'Can edit all household records');
SELECT insert_permission_role_template('households:edit', 'staff', true, 'Staff can update household information');

-- households:delete - Only admin can delete
SELECT insert_permission_role_template('households:delete', 'tenant_admin', true, 'Only admins can delete households');

-- households:manage_members - Admin and staff can manage household members
SELECT insert_permission_role_template('households:manage_members', 'tenant_admin', true, 'Can manage household membership');
SELECT insert_permission_role_template('households:manage_members', 'staff', true, 'Staff can add/remove household members');

-- =====================================================================================
-- CORE FEATURES - GROUPS.CORE
-- =====================================================================================

-- groups:view - All roles can view groups
SELECT insert_permission_role_template('groups:view', 'tenant_admin', true, 'Full access to groups');
SELECT insert_permission_role_template('groups:view', 'staff', true, 'Staff need to view groups');
SELECT insert_permission_role_template('groups:view', 'volunteer', true, 'Volunteers lead groups');
SELECT insert_permission_role_template('groups:view', 'member', true, 'Members can see available groups');

-- groups:create - Admin and staff can create groups
SELECT insert_permission_role_template('groups:create', 'tenant_admin', true, 'Can create new groups');
SELECT insert_permission_role_template('groups:create', 'staff', true, 'Staff can create ministry groups');

-- groups:edit - Admin, staff, and volunteer leaders can edit
SELECT insert_permission_role_template('groups:edit', 'tenant_admin', true, 'Can edit all groups');
SELECT insert_permission_role_template('groups:edit', 'staff', true, 'Staff can update group information');
SELECT insert_permission_role_template('groups:edit', 'volunteer', false, 'Volunteers may edit groups they lead');

-- groups:delete - Only admin can delete
SELECT insert_permission_role_template('groups:delete', 'tenant_admin', true, 'Only admins can delete groups');

-- groups:members - Admin, staff, volunteers can manage group members
SELECT insert_permission_role_template('groups:members', 'tenant_admin', true, 'Can manage all group memberships');
SELECT insert_permission_role_template('groups:members', 'staff', true, 'Staff can manage group members');
SELECT insert_permission_role_template('groups:members', 'volunteer', true, 'Volunteers manage their group members');

-- =====================================================================================
-- CORE FEATURES - EVENTS.CORE
-- =====================================================================================

-- events:view - All roles can view events
SELECT insert_permission_role_template('events:view', 'tenant_admin', true, 'Full access to events');
SELECT insert_permission_role_template('events:view', 'staff', true, 'Staff need to view events');
SELECT insert_permission_role_template('events:view', 'volunteer', true, 'Volunteers help with events');
SELECT insert_permission_role_template('events:view', 'member', true, 'Members can see church events');

-- events:create - Admin and staff can create events
SELECT insert_permission_role_template('events:create', 'tenant_admin', true, 'Can create new events');
SELECT insert_permission_role_template('events:create', 'staff', true, 'Staff can schedule events');

-- events:edit - Admin and staff can edit events
SELECT insert_permission_role_template('events:edit', 'tenant_admin', true, 'Can edit all events');
SELECT insert_permission_role_template('events:edit', 'staff', true, 'Staff can update event details');

-- events:delete - Only admin can delete
SELECT insert_permission_role_template('events:delete', 'tenant_admin', true, 'Only admins can delete events');

-- events:publish - Admin and staff can publish events
SELECT insert_permission_role_template('events:publish', 'tenant_admin', true, 'Can publish events');
SELECT insert_permission_role_template('events:publish', 'staff', true, 'Staff can make events public');

-- =====================================================================================
-- CORE FEATURES - FINANCE.CORE
-- =====================================================================================

-- finance:view - Admin and staff can view finances
SELECT insert_permission_role_template('finance:view', 'tenant_admin', true, 'Full access to financial data');
SELECT insert_permission_role_template('finance:view', 'staff', false, 'Staff may view finances if authorized');

-- finance:view_summary - Admin, staff, and authorized volunteers can see summaries
SELECT insert_permission_role_template('finance:view_summary', 'tenant_admin', true, 'Can view financial summaries');
SELECT insert_permission_role_template('finance:view_summary', 'staff', true, 'Staff can view financial overviews');

-- =====================================================================================
-- CORE FEATURES - NOTIFICATIONS.CORE
-- =====================================================================================

-- notifications:view - All roles can view their notifications
SELECT insert_permission_role_template('notifications:view', 'tenant_admin', true, 'Can view all notifications');
SELECT insert_permission_role_template('notifications:view', 'staff', true, 'Staff receive notifications');
SELECT insert_permission_role_template('notifications:view', 'volunteer', true, 'Volunteers receive notifications');
SELECT insert_permission_role_template('notifications:view', 'member', true, 'Members receive notifications');

-- notifications:manage - All roles can manage their own notifications
SELECT insert_permission_role_template('notifications:manage', 'tenant_admin', true, 'Can manage notifications');
SELECT insert_permission_role_template('notifications:manage', 'staff', true, 'Staff can manage notifications');
SELECT insert_permission_role_template('notifications:manage', 'volunteer', true, 'Volunteers can manage notifications');
SELECT insert_permission_role_template('notifications:manage', 'member', true, 'Members can manage notifications');

-- notifications:preferences - All roles can set preferences
SELECT insert_permission_role_template('notifications:preferences', 'tenant_admin', true, 'Can set notification preferences');
SELECT insert_permission_role_template('notifications:preferences', 'staff', true, 'Staff can set preferences');
SELECT insert_permission_role_template('notifications:preferences', 'volunteer', true, 'Volunteers can set preferences');
SELECT insert_permission_role_template('notifications:preferences', 'member', true, 'Members can set preferences');

-- notifications:send - Admin and staff can send notifications
SELECT insert_permission_role_template('notifications:send', 'tenant_admin', true, 'Can send notifications to users');
SELECT insert_permission_role_template('notifications:send', 'staff', true, 'Staff can send announcements');

-- =====================================================================================
-- CORE FEATURES - INTEGRATIONS.EMAIL
-- =====================================================================================

-- integrations:email_view - Admin can view email settings
SELECT insert_permission_role_template('integrations:email_view', 'tenant_admin', true, 'Can view email configuration');

-- integrations:email_send - Admin and staff can send emails
SELECT insert_permission_role_template('integrations:email_send', 'tenant_admin', true, 'Can send emails');
SELECT insert_permission_role_template('integrations:email_send', 'staff', true, 'Staff can send member emails');

-- =====================================================================================
-- CORE FEATURES - RBAC.CORE
-- =====================================================================================

-- rbac:view - Admin can view RBAC configuration
SELECT insert_permission_role_template('rbac:view', 'tenant_admin', true, 'Can view RBAC settings');

-- rbac:roles_view - Admin can view roles
SELECT insert_permission_role_template('rbac:roles_view', 'tenant_admin', true, 'Can view role definitions');

-- rbac:users_view - Admin can view user roles
SELECT insert_permission_role_template('rbac:users_view', 'tenant_admin', true, 'Can view user role assignments');

-- =====================================================================================
-- CORE FEATURES - SETTINGS.CORE
-- =====================================================================================

-- settings:view - Admin can view settings
SELECT insert_permission_role_template('settings:view', 'tenant_admin', true, 'Can view tenant settings');

-- settings:edit - Admin can edit settings
SELECT insert_permission_role_template('settings:edit', 'tenant_admin', true, 'Can modify tenant settings');

-- =====================================================================================
-- CORE FEATURES - DASHBOARD.CORE
-- =====================================================================================

-- dashboard:view - Admin and staff can view dashboard
SELECT insert_permission_role_template('dashboard:view', 'tenant_admin', true, 'Full dashboard access');
SELECT insert_permission_role_template('dashboard:view', 'staff', true, 'Staff dashboard access');

-- dashboard:widgets - Admin and staff can view widgets
SELECT insert_permission_role_template('dashboard:widgets', 'tenant_admin', true, 'Can view all dashboard widgets');
SELECT insert_permission_role_template('dashboard:widgets', 'staff', true, 'Staff can view assigned widgets');

-- =====================================================================================
-- CORE FEATURES - REPORTS.CORE
-- =====================================================================================

-- reports:view - Admin and staff can view basic reports
SELECT insert_permission_role_template('reports:view', 'tenant_admin', true, 'Full access to reports');
SELECT insert_permission_role_template('reports:view', 'staff', true, 'Staff can view assigned reports');

-- reports:export_basic - Admin and staff can export
SELECT insert_permission_role_template('reports:export_basic', 'tenant_admin', true, 'Can export reports to CSV');
SELECT insert_permission_role_template('reports:export_basic', 'staff', true, 'Staff can export data');

-- =====================================================================================
-- PREMIUM FEATURES - MEMBERS.INVITATIONS
-- =====================================================================================

-- members:invite - Admin and staff can invite members
SELECT insert_permission_role_template('members:invite', 'tenant_admin', true, 'Can send portal invitations');
SELECT insert_permission_role_template('members:invite', 'staff', true, 'Staff can invite members');

-- members:invite_manage - Admin and staff can manage invitations
SELECT insert_permission_role_template('members:invite_manage', 'tenant_admin', true, 'Can manage all invitations');
SELECT insert_permission_role_template('members:invite_manage', 'staff', true, 'Staff can view invitation status');

-- =====================================================================================
-- PREMIUM FEATURES - MEMBERS.EXPORT
-- =====================================================================================

-- members:export - Admin and staff can export
SELECT insert_permission_role_template('members:export', 'tenant_admin', true, 'Can export member data');
SELECT insert_permission_role_template('members:export', 'staff', true, 'Staff can export member lists');

-- members:export_advanced - Only admin for advanced export
SELECT insert_permission_role_template('members:export_advanced', 'tenant_admin', true, 'Can perform advanced exports');

-- =====================================================================================
-- PREMIUM FEATURES - CARE.PLANS
-- =====================================================================================

-- care:view - Admin, staff, and pastoral volunteers can view
SELECT insert_permission_role_template('care:view', 'tenant_admin', true, 'Full access to care plans');
SELECT insert_permission_role_template('care:view', 'staff', true, 'Staff involved in pastoral care');
SELECT insert_permission_role_template('care:view', 'volunteer', false, 'Pastoral care volunteers');

-- care:create - Admin and staff can create care plans
SELECT insert_permission_role_template('care:create', 'tenant_admin', true, 'Can create care plans');
SELECT insert_permission_role_template('care:create', 'staff', true, 'Staff can initiate care plans');

-- care:edit - Admin and staff can edit
SELECT insert_permission_role_template('care:edit', 'tenant_admin', true, 'Can edit all care plans');
SELECT insert_permission_role_template('care:edit', 'staff', true, 'Staff can update care plan progress');

-- care:delete - Only admin can delete
SELECT insert_permission_role_template('care:delete', 'tenant_admin', true, 'Only admins can delete care plans');

-- care:assign - Admin and staff can assign caregivers
SELECT insert_permission_role_template('care:assign', 'tenant_admin', true, 'Can assign care plan responsibilities');
SELECT insert_permission_role_template('care:assign', 'staff', true, 'Staff can assign caregivers');

-- care:complete - Admin, staff, and assigned volunteers can complete
SELECT insert_permission_role_template('care:complete', 'tenant_admin', true, 'Can mark care plans complete');
SELECT insert_permission_role_template('care:complete', 'staff', true, 'Staff can close care plans');
SELECT insert_permission_role_template('care:complete', 'volunteer', false, 'Assigned volunteers can complete tasks');

-- =====================================================================================
-- PREMIUM FEATURES - DISCIPLESHIP.PLANS
-- =====================================================================================

-- discipleship:view - Admin, staff, and mentors can view
SELECT insert_permission_role_template('discipleship:view', 'tenant_admin', true, 'Full access to discipleship');
SELECT insert_permission_role_template('discipleship:view', 'staff', true, 'Staff involved in discipleship');
SELECT insert_permission_role_template('discipleship:view', 'volunteer', false, 'Mentors and discipleship leaders');

-- discipleship:create - Admin and staff can create
SELECT insert_permission_role_template('discipleship:create', 'tenant_admin', true, 'Can create discipleship plans');
SELECT insert_permission_role_template('discipleship:create', 'staff', true, 'Staff can start discipleship journeys');

-- discipleship:edit - Admin and staff can edit
SELECT insert_permission_role_template('discipleship:edit', 'tenant_admin', true, 'Can edit discipleship plans');
SELECT insert_permission_role_template('discipleship:edit', 'staff', true, 'Staff can update plans');

-- discipleship:delete - Only admin can delete
SELECT insert_permission_role_template('discipleship:delete', 'tenant_admin', true, 'Only admins can delete discipleship records');

-- discipleship:assign - Admin and staff can assign mentors
SELECT insert_permission_role_template('discipleship:assign', 'tenant_admin', true, 'Can assign mentors');
SELECT insert_permission_role_template('discipleship:assign', 'staff', true, 'Staff can match mentors and disciples');

-- discipleship:progress - Admin, staff, and mentors can track progress
SELECT insert_permission_role_template('discipleship:progress', 'tenant_admin', true, 'Can update progress milestones');
SELECT insert_permission_role_template('discipleship:progress', 'staff', true, 'Staff can track progress');
SELECT insert_permission_role_template('discipleship:progress', 'volunteer', false, 'Mentors update their disciples progress');

-- =====================================================================================
-- PREMIUM FEATURES - EVENTS.REGISTRATION
-- =====================================================================================

-- events:registrations_view - Admin, staff, volunteers can view
SELECT insert_permission_role_template('events:registrations_view', 'tenant_admin', true, 'Full access to registrations');
SELECT insert_permission_role_template('events:registrations_view', 'staff', true, 'Staff need registration lists');
SELECT insert_permission_role_template('events:registrations_view', 'volunteer', true, 'Event volunteers need attendee info');

-- events:registrations_manage - Admin and staff can manage
SELECT insert_permission_role_template('events:registrations_manage', 'tenant_admin', true, 'Can approve/cancel registrations');
SELECT insert_permission_role_template('events:registrations_manage', 'staff', true, 'Staff can manage event sign-ups');

-- events:attendance - Admin, staff, and event volunteers can track
SELECT insert_permission_role_template('events:attendance', 'tenant_admin', true, 'Can record attendance');
SELECT insert_permission_role_template('events:attendance', 'staff', true, 'Staff track event attendance');
SELECT insert_permission_role_template('events:attendance', 'volunteer', true, 'Event volunteers check in attendees');

-- =====================================================================================
-- PREMIUM FEATURES - NOTIFICATIONS.PUSH
-- =====================================================================================

-- notifications:push_send - Admin and staff can send push notifications
SELECT insert_permission_role_template('notifications:push_send', 'tenant_admin', true, 'Can send push notifications');
SELECT insert_permission_role_template('notifications:push_send', 'staff', true, 'Staff can send urgent alerts');

-- notifications:push_manage - Admin can manage device tokens
SELECT insert_permission_role_template('notifications:push_manage', 'tenant_admin', true, 'Can manage registered devices');

-- =====================================================================================
-- PROFESSIONAL FEATURES - FINANCE.MANAGEMENT
-- =====================================================================================

-- finance:create - Admin and finance staff can create transactions
SELECT insert_permission_role_template('finance:create', 'tenant_admin', true, 'Can create financial transactions');
SELECT insert_permission_role_template('finance:create', 'staff', false, 'Finance staff can record transactions');

-- finance:edit - Admin and finance staff can edit
SELECT insert_permission_role_template('finance:edit', 'tenant_admin', true, 'Can edit financial records');
SELECT insert_permission_role_template('finance:edit', 'staff', false, 'Finance staff can modify transactions');

-- finance:delete - Only admin can delete
SELECT insert_permission_role_template('finance:delete', 'tenant_admin', true, 'Only admins can delete financial records');

-- finance:approve - Admin can approve transactions
SELECT insert_permission_role_template('finance:approve', 'tenant_admin', true, 'Can approve pending transactions');

-- =====================================================================================
-- PROFESSIONAL FEATURES - FINANCE.BUDGETS
-- =====================================================================================

-- budgets:view - Admin and staff can view budgets
SELECT insert_permission_role_template('budgets:view', 'tenant_admin', true, 'Full access to budgets');
SELECT insert_permission_role_template('budgets:view', 'staff', false, 'Finance staff can view budgets');

-- budgets:create - Only admin can create budgets
SELECT insert_permission_role_template('budgets:create', 'tenant_admin', true, 'Can create budget allocations');

-- budgets:edit - Only admin can edit budgets
SELECT insert_permission_role_template('budgets:edit', 'tenant_admin', true, 'Can modify budget allocations');

-- budgets:delete - Only admin can delete budgets
SELECT insert_permission_role_template('budgets:delete', 'tenant_admin', true, 'Only admins can delete budgets');

-- budgets:approve - Only admin can approve budgets
SELECT insert_permission_role_template('budgets:approve', 'tenant_admin', true, 'Can approve budget changes');

-- =====================================================================================
-- PROFESSIONAL FEATURES - INTEGRATIONS.SMS
-- =====================================================================================

-- integrations:sms_configure - Only admin can configure SMS
SELECT insert_permission_role_template('integrations:sms_configure', 'tenant_admin', true, 'Can configure SMS provider');

-- integrations:sms_test - Admin can test SMS
SELECT insert_permission_role_template('integrations:sms_test', 'tenant_admin', true, 'Can send test SMS messages');

-- integrations:sms_send - Admin and staff can send SMS
SELECT insert_permission_role_template('integrations:sms_send', 'tenant_admin', true, 'Can send SMS to members');
SELECT insert_permission_role_template('integrations:sms_send', 'staff', true, 'Staff can send SMS messages');

-- =====================================================================================
-- PROFESSIONAL FEATURES - INTEGRATIONS.EMAIL_ADVANCED
-- =====================================================================================

-- integrations:email_configure - Only admin can configure email provider
SELECT insert_permission_role_template('integrations:email_configure', 'tenant_admin', true, 'Can configure custom email provider');

-- integrations:email_test - Admin can test email
SELECT insert_permission_role_template('integrations:email_test', 'tenant_admin', true, 'Can send test emails');

-- integrations:email_templates - Admin can manage templates
SELECT insert_permission_role_template('integrations:email_templates', 'tenant_admin', true, 'Can manage email templates');

-- =====================================================================================
-- PROFESSIONAL FEATURES - RBAC.MANAGEMENT
-- =====================================================================================

-- rbac:roles_create - Only admin can create roles
SELECT insert_permission_role_template('rbac:roles_create', 'tenant_admin', true, 'Can create custom roles');

-- rbac:roles_edit - Only admin can edit roles
SELECT insert_permission_role_template('rbac:roles_edit', 'tenant_admin', true, 'Can modify role definitions');

-- rbac:roles_delete - Only admin can delete roles
SELECT insert_permission_role_template('rbac:roles_delete', 'tenant_admin', true, 'Can remove custom roles');

-- rbac:assign - Only admin can assign roles to users
SELECT insert_permission_role_template('rbac:assign', 'tenant_admin', true, 'Can assign roles to users');

-- rbac:revoke - Only admin can revoke roles
SELECT insert_permission_role_template('rbac:revoke', 'tenant_admin', true, 'Can revoke user roles');

-- rbac:audit_view - Only admin can view audit trail
SELECT insert_permission_role_template('rbac:audit_view', 'tenant_admin', true, 'Can view RBAC audit logs');

-- =====================================================================================
-- PROFESSIONAL FEATURES - MEMBERS.BULK
-- =====================================================================================

-- members:bulk_update - Admin and staff can bulk update
SELECT insert_permission_role_template('members:bulk_update', 'tenant_admin', true, 'Can perform bulk member updates');
SELECT insert_permission_role_template('members:bulk_update', 'staff', false, 'Staff may perform bulk operations');

-- members:bulk_import - Admin can bulk import
SELECT insert_permission_role_template('members:bulk_import', 'tenant_admin', true, 'Can import members from file');

-- members:invite_bulk - Admin and staff can send bulk invitations
SELECT insert_permission_role_template('members:invite_bulk', 'tenant_admin', true, 'Can send bulk invitations');
SELECT insert_permission_role_template('members:invite_bulk', 'staff', true, 'Staff can invite multiple members');

-- =====================================================================================
-- ENTERPRISE FEATURES - RBAC.MULTI_ROLE
-- =====================================================================================

-- rbac:multi_role_enable - Only admin can enable multi-role
SELECT insert_permission_role_template('rbac:multi_role_enable', 'tenant_admin', true, 'Can enable multi-role support');

-- rbac:multi_role_assign - Only admin can assign multiple roles
SELECT insert_permission_role_template('rbac:multi_role_assign', 'tenant_admin', true, 'Can assign multiple roles to users');

-- rbac:multi_role_analyze - Only admin can analyze conflicts
SELECT insert_permission_role_template('rbac:multi_role_analyze', 'tenant_admin', true, 'Can check for permission conflicts');

-- =====================================================================================
-- ENTERPRISE FEATURES - RBAC.DELEGATION
-- =====================================================================================

-- rbac:delegate - Admin and delegators can delegate
SELECT insert_permission_role_template('rbac:delegate', 'tenant_admin', true, 'Can delegate roles to others');

-- rbac:delegate_revoke - Admin can revoke delegations
SELECT insert_permission_role_template('rbac:delegate_revoke', 'tenant_admin', true, 'Can revoke delegated access');

-- rbac:delegate_view - Admin can view delegations
SELECT insert_permission_role_template('rbac:delegate_view', 'tenant_admin', true, 'Can view active delegations');

-- =====================================================================================
-- ENTERPRISE FEATURES - RBAC.AUDIT_EXPORT
-- =====================================================================================

-- rbac:audit_export - Only admin can export audit data
SELECT insert_permission_role_template('rbac:audit_export', 'tenant_admin', true, 'Can export audit logs for compliance');

-- =====================================================================================
-- ENTERPRISE FEATURES - LIMITS.UNLIMITED
-- =====================================================================================

-- limits:unlimited_members - Admin controls unlimited access
SELECT insert_permission_role_template('limits:unlimited_members', 'tenant_admin', true, 'Unlimited member profiles enabled');

-- limits:unlimited_transactions - Admin controls unlimited access
SELECT insert_permission_role_template('limits:unlimited_transactions', 'tenant_admin', true, 'Unlimited transactions enabled');

-- =====================================================================================
-- ENTERPRISE FEATURES - INTEGRATIONS.API
-- =====================================================================================

-- integrations:api_access - Only admin can access API
SELECT insert_permission_role_template('integrations:api_access', 'tenant_admin', true, 'Can use REST API');

-- integrations:webhook_configure - Only admin can configure webhooks
SELECT insert_permission_role_template('integrations:webhook_configure', 'tenant_admin', true, 'Can setup webhook endpoints');

-- integrations:webhook_test - Only admin can test webhooks
SELECT insert_permission_role_template('integrations:webhook_test', 'tenant_admin', true, 'Can test webhook delivery');

-- =====================================================================================
-- ENTERPRISE FEATURES - REPORTS.ADVANCED
-- =====================================================================================

-- reports:generate - Admin and staff can generate reports
SELECT insert_permission_role_template('reports:generate', 'tenant_admin', true, 'Can generate comprehensive reports');
SELECT insert_permission_role_template('reports:generate', 'staff', false, 'Staff may generate assigned reports');

-- reports:export_advanced - Admin can do advanced export
SELECT insert_permission_role_template('reports:export_advanced', 'tenant_admin', true, 'Can export to PDF/Excel with formatting');

-- reports:schedule - Only admin can schedule reports
SELECT insert_permission_role_template('reports:schedule', 'tenant_admin', true, 'Can schedule automated reports');

-- =====================================================================================
-- ENTERPRISE FEATURES - NOTIFICATIONS.SCHEDULED
-- =====================================================================================

-- notifications:schedule - Admin and staff can schedule notifications
SELECT insert_permission_role_template('notifications:schedule', 'tenant_admin', true, 'Can schedule notifications');
SELECT insert_permission_role_template('notifications:schedule', 'staff', true, 'Staff can schedule announcements');

-- notifications:bulk_send - Admin and staff can send bulk
SELECT insert_permission_role_template('notifications:bulk_send', 'tenant_admin', true, 'Can send to large groups');
SELECT insert_permission_role_template('notifications:bulk_send', 'staff', true, 'Staff can send bulk notifications');

-- =====================================================================================
-- STEP 3: Cleanup helper function
-- =====================================================================================
DROP FUNCTION IF EXISTS insert_permission_role_template(text, text, boolean, text);

-- =====================================================================================
-- STEP 4: Update statistics
-- =====================================================================================

-- Log the count of templates created
DO $$
DECLARE
  v_count integer;
BEGIN
  SELECT COUNT(*) INTO v_count FROM permission_role_templates;
  RAISE NOTICE 'Created % permission role templates', v_count;
END $$;

COMMIT;
