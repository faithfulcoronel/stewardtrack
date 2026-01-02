-- =====================================================================================
-- MIGRATION: Refresh Feature Catalog and Permissions
-- =====================================================================================
-- Deletes all existing features and permissions, then recreates them based on
-- the updated FEATURE_AUDIT.md document with correct tier hierarchy:
--   Essential → Premium → Professional → Enterprise
--
-- Core features are available to ALL tiers (tier = 'essential')
-- Higher tier features unlock additional capabilities
-- =====================================================================================

BEGIN;

-- First, update the tier constraint to remove 'custom' if it exists
-- and ensure we only have the 4 valid tiers
DO $$
BEGIN
  -- Drop existing constraint if it exists
  ALTER TABLE feature_catalog DROP CONSTRAINT IF EXISTS feature_catalog_tier_check;

  -- Add updated constraint with only 4 tiers
  ALTER TABLE feature_catalog ADD CONSTRAINT feature_catalog_tier_check
    CHECK (tier IS NULL OR tier IN ('essential', 'premium', 'professional', 'enterprise'));
END $$;

-- Soft-delete all existing features (keep for audit trail)
UPDATE feature_catalog
SET deleted_at = now(),
    updated_at = now()
WHERE deleted_at IS NULL;

-- Delete orphaned permissions (cascade should handle this, but ensure cleanup)
DELETE FROM feature_permissions
WHERE feature_id NOT IN (SELECT id FROM feature_catalog WHERE deleted_at IS NULL);

-- =====================================================================================
-- CORE FEATURES (Available to ALL Tiers - tier = 'essential')
-- =====================================================================================

-- members.core
INSERT INTO feature_catalog (code, name, category, description, tier, is_active, phase)
VALUES ('members.core', 'Member Management', 'core', 'Member directory, profiles, and basic management', 'essential', true, 'ga')
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  description = EXCLUDED.description,
  tier = EXCLUDED.tier,
  is_active = EXCLUDED.is_active,
  deleted_at = NULL,
  updated_at = now();

-- households.core
INSERT INTO feature_catalog (code, name, category, description, tier, is_active, phase)
VALUES ('households.core', 'Household Management', 'core', 'Track family units and relationships', 'essential', true, 'ga')
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  description = EXCLUDED.description,
  tier = EXCLUDED.tier,
  is_active = EXCLUDED.is_active,
  deleted_at = NULL,
  updated_at = now();

-- groups.core
INSERT INTO feature_catalog (code, name, category, description, tier, is_active, phase)
VALUES ('groups.core', 'Groups Management', 'management', 'Manage ministry groups and small groups', 'essential', true, 'ga')
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  description = EXCLUDED.description,
  tier = EXCLUDED.tier,
  is_active = EXCLUDED.is_active,
  deleted_at = NULL,
  updated_at = now();

-- events.core
INSERT INTO feature_catalog (code, name, category, description, tier, is_active, phase)
VALUES ('events.core', 'Event Management', 'management', 'Church event planning and calendar management', 'essential', true, 'ga')
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  description = EXCLUDED.description,
  tier = EXCLUDED.tier,
  is_active = EXCLUDED.is_active,
  deleted_at = NULL,
  updated_at = now();

-- finance.core
INSERT INTO feature_catalog (code, name, category, description, tier, is_active, phase)
VALUES ('finance.core', 'Financial Viewing', 'reporting', 'View financial transactions and summaries', 'essential', true, 'ga')
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  description = EXCLUDED.description,
  tier = EXCLUDED.tier,
  is_active = EXCLUDED.is_active,
  deleted_at = NULL,
  updated_at = now();

-- notifications.core
INSERT INTO feature_catalog (code, name, category, description, tier, is_active, phase)
VALUES ('notifications.core', 'Notifications', 'notification', 'In-app notifications and alerts', 'essential', true, 'ga')
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  description = EXCLUDED.description,
  tier = EXCLUDED.tier,
  is_active = EXCLUDED.is_active,
  deleted_at = NULL,
  updated_at = now();

-- integrations.email
INSERT INTO feature_catalog (code, name, category, description, tier, is_active, phase)
VALUES ('integrations.email', 'Email Integration', 'integration', 'Basic email sending capabilities', 'essential', true, 'ga')
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  description = EXCLUDED.description,
  tier = EXCLUDED.tier,
  is_active = EXCLUDED.is_active,
  deleted_at = NULL,
  updated_at = now();

-- rbac.core
INSERT INTO feature_catalog (code, name, category, description, tier, is_active, phase)
VALUES ('rbac.core', 'RBAC Core', 'security', 'Basic role-based access control viewing', 'essential', true, 'ga')
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  description = EXCLUDED.description,
  tier = EXCLUDED.tier,
  is_active = EXCLUDED.is_active,
  deleted_at = NULL,
  updated_at = now();

-- settings.core
INSERT INTO feature_catalog (code, name, category, description, tier, is_active, phase)
VALUES ('settings.core', 'Tenant Settings', 'management', 'Configure tenant-specific settings', 'essential', true, 'ga')
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  description = EXCLUDED.description,
  tier = EXCLUDED.tier,
  is_active = EXCLUDED.is_active,
  deleted_at = NULL,
  updated_at = now();

-- dashboard.core
INSERT INTO feature_catalog (code, name, category, description, tier, is_active, phase)
VALUES ('dashboard.core', 'Admin Dashboard', 'core', 'Main administrative dashboard with widgets', 'essential', true, 'ga')
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  description = EXCLUDED.description,
  tier = EXCLUDED.tier,
  is_active = EXCLUDED.is_active,
  deleted_at = NULL,
  updated_at = now();

-- reports.core
INSERT INTO feature_catalog (code, name, category, description, tier, is_active, phase)
VALUES ('reports.core', 'Basic Reports', 'reporting', 'Basic reporting and export capabilities', 'essential', true, 'ga')
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  description = EXCLUDED.description,
  tier = EXCLUDED.tier,
  is_active = EXCLUDED.is_active,
  deleted_at = NULL,
  updated_at = now();

-- =====================================================================================
-- PREMIUM TIER FEATURES
-- =====================================================================================

-- members.invitations
INSERT INTO feature_catalog (code, name, category, description, tier, is_active, phase)
VALUES ('members.invitations', 'Member Invitations', 'communication', 'Invite members to create portal accounts', 'premium', true, 'ga')
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  description = EXCLUDED.description,
  tier = EXCLUDED.tier,
  is_active = EXCLUDED.is_active,
  deleted_at = NULL,
  updated_at = now();

-- members.export
INSERT INTO feature_catalog (code, name, category, description, tier, is_active, phase)
VALUES ('members.export', 'Member Export', 'reporting', 'Export member data to various formats', 'premium', true, 'ga')
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  description = EXCLUDED.description,
  tier = EXCLUDED.tier,
  is_active = EXCLUDED.is_active,
  deleted_at = NULL,
  updated_at = now();

-- care.plans
INSERT INTO feature_catalog (code, name, category, description, tier, is_active, phase)
VALUES ('care.plans', 'Care Plans', 'management', 'Pastoral care tracking and follow-up management', 'premium', true, 'ga')
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  description = EXCLUDED.description,
  tier = EXCLUDED.tier,
  is_active = EXCLUDED.is_active,
  deleted_at = NULL,
  updated_at = now();

-- discipleship.plans
INSERT INTO feature_catalog (code, name, category, description, tier, is_active, phase)
VALUES ('discipleship.plans', 'Discipleship Plans', 'management', 'Spiritual growth tracking and discipleship pathways', 'premium', true, 'ga')
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  description = EXCLUDED.description,
  tier = EXCLUDED.tier,
  is_active = EXCLUDED.is_active,
  deleted_at = NULL,
  updated_at = now();

-- events.registration
INSERT INTO feature_catalog (code, name, category, description, tier, is_active, phase)
VALUES ('events.registration', 'Event Registration', 'management', 'Online event registration and attendance tracking', 'premium', true, 'ga')
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  description = EXCLUDED.description,
  tier = EXCLUDED.tier,
  is_active = EXCLUDED.is_active,
  deleted_at = NULL,
  updated_at = now();

-- notifications.push
INSERT INTO feature_catalog (code, name, category, description, tier, is_active, phase)
VALUES ('notifications.push', 'Push Notifications', 'notification', 'Mobile push notifications', 'premium', true, 'ga')
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  description = EXCLUDED.description,
  tier = EXCLUDED.tier,
  is_active = EXCLUDED.is_active,
  deleted_at = NULL,
  updated_at = now();

-- =====================================================================================
-- PROFESSIONAL TIER FEATURES
-- =====================================================================================

-- finance.management
INSERT INTO feature_catalog (code, name, category, description, tier, is_active, phase)
VALUES ('finance.management', 'Financial Management', 'management', 'Full financial transaction management', 'professional', true, 'ga')
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  description = EXCLUDED.description,
  tier = EXCLUDED.tier,
  is_active = EXCLUDED.is_active,
  deleted_at = NULL,
  updated_at = now();

-- finance.budgets
INSERT INTO feature_catalog (code, name, category, description, tier, is_active, phase)
VALUES ('finance.budgets', 'Budget Management', 'management', 'Create and manage church budgets', 'professional', true, 'ga')
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  description = EXCLUDED.description,
  tier = EXCLUDED.tier,
  is_active = EXCLUDED.is_active,
  deleted_at = NULL,
  updated_at = now();

-- integrations.sms
INSERT INTO feature_catalog (code, name, category, description, tier, is_active, phase)
VALUES ('integrations.sms', 'SMS Integration', 'integration', 'Configure SMS/Twilio for text messaging', 'professional', true, 'ga')
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  description = EXCLUDED.description,
  tier = EXCLUDED.tier,
  is_active = EXCLUDED.is_active,
  deleted_at = NULL,
  updated_at = now();

-- integrations.email_advanced
INSERT INTO feature_catalog (code, name, category, description, tier, is_active, phase)
VALUES ('integrations.email_advanced', 'Advanced Email Configuration', 'integration', 'Advanced email provider configuration', 'professional', true, 'ga')
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  description = EXCLUDED.description,
  tier = EXCLUDED.tier,
  is_active = EXCLUDED.is_active,
  deleted_at = NULL,
  updated_at = now();

-- rbac.management
INSERT INTO feature_catalog (code, name, category, description, tier, is_active, phase)
VALUES ('rbac.management', 'RBAC Management', 'security', 'Create and manage roles and permissions with audit trail', 'professional', true, 'ga')
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  description = EXCLUDED.description,
  tier = EXCLUDED.tier,
  is_active = EXCLUDED.is_active,
  deleted_at = NULL,
  updated_at = now();

-- members.bulk
INSERT INTO feature_catalog (code, name, category, description, tier, is_active, phase)
VALUES ('members.bulk', 'Bulk Member Operations', 'management', 'Bulk operations for member management', 'professional', true, 'ga')
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  description = EXCLUDED.description,
  tier = EXCLUDED.tier,
  is_active = EXCLUDED.is_active,
  deleted_at = NULL,
  updated_at = now();

-- =====================================================================================
-- ENTERPRISE TIER FEATURES
-- =====================================================================================

-- rbac.multi_role
INSERT INTO feature_catalog (code, name, category, description, tier, is_active, phase)
VALUES ('rbac.multi_role', 'Multi-Role Support', 'security', 'Allow users to have multiple roles simultaneously', 'enterprise', true, 'ga')
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  description = EXCLUDED.description,
  tier = EXCLUDED.tier,
  is_active = EXCLUDED.is_active,
  deleted_at = NULL,
  updated_at = now();

-- rbac.delegation
INSERT INTO feature_catalog (code, name, category, description, tier, is_active, phase)
VALUES ('rbac.delegation', 'Role Delegation', 'security', 'Delegate roles to other users with scopes (Campus/Ministry)', 'enterprise', true, 'ga')
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  description = EXCLUDED.description,
  tier = EXCLUDED.tier,
  is_active = EXCLUDED.is_active,
  deleted_at = NULL,
  updated_at = now();

-- rbac.audit_export
INSERT INTO feature_catalog (code, name, category, description, tier, is_active, phase)
VALUES ('rbac.audit_export', 'Audit Export', 'security', 'Export audit trail data for compliance', 'enterprise', true, 'ga')
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  description = EXCLUDED.description,
  tier = EXCLUDED.tier,
  is_active = EXCLUDED.is_active,
  deleted_at = NULL,
  updated_at = now();

-- limits.unlimited
INSERT INTO feature_catalog (code, name, category, description, tier, is_active, phase)
VALUES ('limits.unlimited', 'Unlimited Capacity', 'management', 'No limits on member profiles or transactions', 'enterprise', true, 'ga')
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  description = EXCLUDED.description,
  tier = EXCLUDED.tier,
  is_active = EXCLUDED.is_active,
  deleted_at = NULL,
  updated_at = now();

-- integrations.api
INSERT INTO feature_catalog (code, name, category, description, tier, is_active, phase)
VALUES ('integrations.api', 'API Integrations', 'integration', 'REST API access and webhook integrations', 'enterprise', true, 'ga')
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  description = EXCLUDED.description,
  tier = EXCLUDED.tier,
  is_active = EXCLUDED.is_active,
  deleted_at = NULL,
  updated_at = now();

-- reports.advanced
INSERT INTO feature_catalog (code, name, category, description, tier, is_active, phase)
VALUES ('reports.advanced', 'Advanced Reporting', 'reporting', 'Comprehensive reports with scheduling', 'enterprise', true, 'ga')
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  description = EXCLUDED.description,
  tier = EXCLUDED.tier,
  is_active = EXCLUDED.is_active,
  deleted_at = NULL,
  updated_at = now();

-- notifications.scheduled
INSERT INTO feature_catalog (code, name, category, description, tier, is_active, phase)
VALUES ('notifications.scheduled', 'Scheduled Notifications', 'notification', 'Schedule notifications for future delivery', 'enterprise', true, 'ga')
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  description = EXCLUDED.description,
  tier = EXCLUDED.tier,
  is_active = EXCLUDED.is_active,
  deleted_at = NULL,
  updated_at = now();

-- =====================================================================================
-- FEATURE PERMISSIONS
-- =====================================================================================

-- Helper function to insert permissions for a feature
CREATE OR REPLACE FUNCTION insert_feature_permission(
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

-- =====================================================================================
-- Core Feature Permissions
-- =====================================================================================

-- members.core permissions
SELECT insert_feature_permission('members.core', 'members:view', 'View Members', 'View member directory and profiles', true, 1);
SELECT insert_feature_permission('members.core', 'members:search', 'Search Members', 'Search and filter member records', true, 2);
SELECT insert_feature_permission('members.core', 'members:create', 'Create Members', 'Add new member records', true, 3);
SELECT insert_feature_permission('members.core', 'members:edit', 'Edit Members', 'Modify existing member records', true, 4);
SELECT insert_feature_permission('members.core', 'members:delete', 'Delete Members', 'Remove member records', false, 5);

-- households.core permissions
SELECT insert_feature_permission('households.core', 'households:view', 'View Households', 'View household records', true, 1);
SELECT insert_feature_permission('households.core', 'households:create', 'Create Households', 'Create new household units', true, 2);
SELECT insert_feature_permission('households.core', 'households:edit', 'Edit Households', 'Modify household information', true, 3);
SELECT insert_feature_permission('households.core', 'households:delete', 'Delete Households', 'Remove household records', false, 4);
SELECT insert_feature_permission('households.core', 'households:manage_members', 'Manage Household Members', 'Add/remove members from households', true, 5);

-- groups.core permissions
SELECT insert_feature_permission('groups.core', 'groups:view', 'View Groups', 'View group listings', true, 1);
SELECT insert_feature_permission('groups.core', 'groups:create', 'Create Groups', 'Create new groups', true, 2);
SELECT insert_feature_permission('groups.core', 'groups:edit', 'Edit Groups', 'Modify group details', true, 3);
SELECT insert_feature_permission('groups.core', 'groups:delete', 'Delete Groups', 'Remove groups', false, 4);
SELECT insert_feature_permission('groups.core', 'groups:members', 'Manage Group Members', 'Add/remove group members', true, 5);

-- events.core permissions
SELECT insert_feature_permission('events.core', 'events:view', 'View Events', 'View event listings and details', true, 1);
SELECT insert_feature_permission('events.core', 'events:create', 'Create Events', 'Create new events', true, 2);
SELECT insert_feature_permission('events.core', 'events:edit', 'Edit Events', 'Modify event details', true, 3);
SELECT insert_feature_permission('events.core', 'events:delete', 'Delete Events', 'Remove events', false, 4);
SELECT insert_feature_permission('events.core', 'events:publish', 'Publish Events', 'Make events visible publicly', true, 5);

-- finance.core permissions
SELECT insert_feature_permission('finance.core', 'finance:view', 'View Finances', 'View financial records', true, 1);
SELECT insert_feature_permission('finance.core', 'finance:view_summary', 'View Summary', 'View financial summaries', true, 2);

-- notifications.core permissions
SELECT insert_feature_permission('notifications.core', 'notifications:view', 'View Notifications', 'View own notifications', true, 1);
SELECT insert_feature_permission('notifications.core', 'notifications:manage', 'Manage Notifications', 'Mark read, delete notifications', true, 2);
SELECT insert_feature_permission('notifications.core', 'notifications:preferences', 'Notification Preferences', 'Configure notification settings', true, 3);
SELECT insert_feature_permission('notifications.core', 'notifications:send', 'Send Notifications', 'Send in-app notifications', true, 4);

-- integrations.email permissions
SELECT insert_feature_permission('integrations.email', 'integrations:email_view', 'View Email Settings', 'View email configuration', true, 1);
SELECT insert_feature_permission('integrations.email', 'integrations:email_send', 'Send Emails', 'Send emails to members', true, 2);

-- rbac.core permissions
SELECT insert_feature_permission('rbac.core', 'rbac:view', 'View RBAC', 'View RBAC configuration', true, 1);
SELECT insert_feature_permission('rbac.core', 'rbac:roles_view', 'View Roles', 'View role definitions', true, 2);
SELECT insert_feature_permission('rbac.core', 'rbac:users_view', 'View User Roles', 'View user role assignments', true, 3);

-- settings.core permissions
SELECT insert_feature_permission('settings.core', 'settings:view', 'View Settings', 'View tenant settings', true, 1);
SELECT insert_feature_permission('settings.core', 'settings:edit', 'Edit Settings', 'Modify tenant settings', true, 2);

-- dashboard.core permissions
SELECT insert_feature_permission('dashboard.core', 'dashboard:view', 'View Dashboard', 'Access admin dashboard', true, 1);
SELECT insert_feature_permission('dashboard.core', 'dashboard:widgets', 'Dashboard Widgets', 'View dashboard widgets', true, 2);

-- reports.core permissions
SELECT insert_feature_permission('reports.core', 'reports:view', 'View Reports', 'Access basic reports', true, 1);
SELECT insert_feature_permission('reports.core', 'reports:export_basic', 'Basic Export', 'Export to CSV', true, 2);

-- =====================================================================================
-- Premium Feature Permissions
-- =====================================================================================

-- members.invitations permissions
SELECT insert_feature_permission('members.invitations', 'members:invite', 'Invite Members', 'Send portal invitations', true, 1);
SELECT insert_feature_permission('members.invitations', 'members:invite_manage', 'Manage Invitations', 'View/cancel pending invitations', true, 2);

-- members.export permissions
SELECT insert_feature_permission('members.export', 'members:export', 'Export Members', 'Export member data to CSV/Excel', true, 1);
SELECT insert_feature_permission('members.export', 'members:export_advanced', 'Advanced Export', 'Export with custom fields', false, 2);

-- care.plans permissions
SELECT insert_feature_permission('care.plans', 'care:view', 'View Care Plans', 'View pastoral care records', true, 1);
SELECT insert_feature_permission('care.plans', 'care:create', 'Create Care Plans', 'Create new care plans', true, 2);
SELECT insert_feature_permission('care.plans', 'care:edit', 'Edit Care Plans', 'Modify care plan details', true, 3);
SELECT insert_feature_permission('care.plans', 'care:delete', 'Delete Care Plans', 'Remove care plan records', false, 4);
SELECT insert_feature_permission('care.plans', 'care:assign', 'Assign Care Plans', 'Assign caregivers to plans', true, 5);
SELECT insert_feature_permission('care.plans', 'care:complete', 'Complete Care Plans', 'Mark care plans as complete', true, 6);

-- discipleship.plans permissions
SELECT insert_feature_permission('discipleship.plans', 'discipleship:view', 'View Discipleship Plans', 'View discipleship records', true, 1);
SELECT insert_feature_permission('discipleship.plans', 'discipleship:create', 'Create Discipleship Plans', 'Create new discipleship plans', true, 2);
SELECT insert_feature_permission('discipleship.plans', 'discipleship:edit', 'Edit Discipleship Plans', 'Modify discipleship details', true, 3);
SELECT insert_feature_permission('discipleship.plans', 'discipleship:delete', 'Delete Discipleship Plans', 'Remove discipleship records', false, 4);
SELECT insert_feature_permission('discipleship.plans', 'discipleship:assign', 'Assign Mentors', 'Assign mentors to disciples', true, 5);
SELECT insert_feature_permission('discipleship.plans', 'discipleship:progress', 'Track Progress', 'Update progress milestones', true, 6);

-- events.registration permissions
SELECT insert_feature_permission('events.registration', 'events:registrations_view', 'View Registrations', 'View event registrations', true, 1);
SELECT insert_feature_permission('events.registration', 'events:registrations_manage', 'Manage Registrations', 'Approve/cancel registrations', true, 2);
SELECT insert_feature_permission('events.registration', 'events:attendance', 'Track Attendance', 'Record event attendance', true, 3);

-- notifications.push permissions
SELECT insert_feature_permission('notifications.push', 'notifications:push_send', 'Send Push Notifications', 'Send push to members', true, 1);
SELECT insert_feature_permission('notifications.push', 'notifications:push_manage', 'Manage Device Tokens', 'Manage registered devices', true, 2);

-- =====================================================================================
-- Professional Feature Permissions
-- =====================================================================================

-- finance.management permissions
SELECT insert_feature_permission('finance.management', 'finance:create', 'Create Transactions', 'Record new transactions', true, 1);
SELECT insert_feature_permission('finance.management', 'finance:edit', 'Edit Transactions', 'Modify transaction records', true, 2);
SELECT insert_feature_permission('finance.management', 'finance:delete', 'Delete Transactions', 'Remove transactions', false, 3);
SELECT insert_feature_permission('finance.management', 'finance:approve', 'Approve Transactions', 'Approve pending transactions', true, 4);

-- finance.budgets permissions
SELECT insert_feature_permission('finance.budgets', 'budgets:view', 'View Budgets', 'View budget allocations', true, 1);
SELECT insert_feature_permission('finance.budgets', 'budgets:create', 'Create Budgets', 'Create new budgets', true, 2);
SELECT insert_feature_permission('finance.budgets', 'budgets:edit', 'Edit Budgets', 'Modify budget allocations', true, 3);
SELECT insert_feature_permission('finance.budgets', 'budgets:delete', 'Delete Budgets', 'Remove budgets', false, 4);
SELECT insert_feature_permission('finance.budgets', 'budgets:approve', 'Approve Budgets', 'Approve budget changes', true, 5);

-- integrations.sms permissions
SELECT insert_feature_permission('integrations.sms', 'integrations:sms_configure', 'Configure SMS', 'Setup SMS provider', true, 1);
SELECT insert_feature_permission('integrations.sms', 'integrations:sms_test', 'Test SMS', 'Send test messages', true, 2);
SELECT insert_feature_permission('integrations.sms', 'integrations:sms_send', 'Send SMS', 'Send SMS to members', true, 3);

-- integrations.email_advanced permissions
SELECT insert_feature_permission('integrations.email_advanced', 'integrations:email_configure', 'Configure Email', 'Setup custom email provider', true, 1);
SELECT insert_feature_permission('integrations.email_advanced', 'integrations:email_test', 'Test Email', 'Send test emails', true, 2);
SELECT insert_feature_permission('integrations.email_advanced', 'integrations:email_templates', 'Email Templates', 'Manage email templates', true, 3);

-- rbac.management permissions
SELECT insert_feature_permission('rbac.management', 'rbac:roles_create', 'Create Roles', 'Create new roles', true, 1);
SELECT insert_feature_permission('rbac.management', 'rbac:roles_edit', 'Edit Roles', 'Modify role definitions', true, 2);
SELECT insert_feature_permission('rbac.management', 'rbac:roles_delete', 'Delete Roles', 'Remove roles', false, 3);
SELECT insert_feature_permission('rbac.management', 'rbac:assign', 'Assign Roles', 'Assign roles to users', true, 4);
SELECT insert_feature_permission('rbac.management', 'rbac:revoke', 'Revoke Roles', 'Remove roles from users', true, 5);
SELECT insert_feature_permission('rbac.management', 'rbac:audit_view', 'View Audit Trail', 'View RBAC audit logs', true, 6);

-- members.bulk permissions
SELECT insert_feature_permission('members.bulk', 'members:bulk_update', 'Bulk Update', 'Update multiple members at once', true, 1);
SELECT insert_feature_permission('members.bulk', 'members:bulk_import', 'Bulk Import', 'Import members from file', true, 2);
SELECT insert_feature_permission('members.bulk', 'members:invite_bulk', 'Bulk Invitations', 'Send multiple invitations', true, 3);

-- =====================================================================================
-- Enterprise Feature Permissions
-- =====================================================================================

-- rbac.multi_role permissions
SELECT insert_feature_permission('rbac.multi_role', 'rbac:multi_role_enable', 'Enable Multi-Role', 'Enable multi-role for tenant', true, 1);
SELECT insert_feature_permission('rbac.multi_role', 'rbac:multi_role_assign', 'Assign Multiple Roles', 'Assign multiple roles to user', true, 2);
SELECT insert_feature_permission('rbac.multi_role', 'rbac:multi_role_analyze', 'Analyze Conflicts', 'Check for permission conflicts', true, 3);

-- rbac.delegation permissions
SELECT insert_feature_permission('rbac.delegation', 'rbac:delegate', 'Delegate Roles', 'Delegate roles to others', true, 1);
SELECT insert_feature_permission('rbac.delegation', 'rbac:delegate_revoke', 'Revoke Delegations', 'Revoke delegated access', true, 2);
SELECT insert_feature_permission('rbac.delegation', 'rbac:delegate_view', 'View Delegations', 'View active delegations', true, 3);

-- rbac.audit_export permissions
SELECT insert_feature_permission('rbac.audit_export', 'rbac:audit_export', 'Export Audit Data', 'Export audit logs', true, 1);

-- limits.unlimited permissions
SELECT insert_feature_permission('limits.unlimited', 'limits:unlimited_members', 'Unlimited Members', 'No member count restrictions', true, 1);
SELECT insert_feature_permission('limits.unlimited', 'limits:unlimited_transactions', 'Unlimited Transactions', 'No transaction count restrictions', true, 2);

-- integrations.api permissions
SELECT insert_feature_permission('integrations.api', 'integrations:api_access', 'API Access', 'Access REST API', true, 1);
SELECT insert_feature_permission('integrations.api', 'integrations:webhook_configure', 'Configure Webhooks', 'Setup webhook endpoints', true, 2);
SELECT insert_feature_permission('integrations.api', 'integrations:webhook_test', 'Test Webhooks', 'Test webhook delivery', true, 3);

-- reports.advanced permissions
SELECT insert_feature_permission('reports.advanced', 'reports:generate', 'Generate Reports', 'Create comprehensive reports', true, 1);
SELECT insert_feature_permission('reports.advanced', 'reports:export_advanced', 'Advanced Export', 'Export to PDF/Excel with formatting', true, 2);
SELECT insert_feature_permission('reports.advanced', 'reports:schedule', 'Schedule Reports', 'Schedule automated reports', true, 3);

-- notifications.scheduled permissions
SELECT insert_feature_permission('notifications.scheduled', 'notifications:schedule', 'Schedule Notifications', 'Create scheduled notifications', true, 1);
SELECT insert_feature_permission('notifications.scheduled', 'notifications:bulk_send', 'Bulk Send', 'Send to large groups', true, 2);

-- Clean up helper function
DROP FUNCTION IF EXISTS insert_feature_permission(text, text, text, text, boolean, integer);

COMMIT;
