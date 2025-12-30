-- =====================================================================================
-- MIGRATION: Enhance Notifications Schema for Service Bus Architecture
-- =====================================================================================
-- This migration:
-- 1. Adds missing columns to notifications table (expires_at, metadata, category, priority)
-- 2. Fixes RLS policies to properly isolate user data
-- 3. Creates notification_queue table for async message processing
-- 4. Creates notification_preferences table for user channel preferences
-- 5. Creates notification_templates table for customizable templates
-- 6. Adds notification feature codes to feature_catalog
-- =====================================================================================

BEGIN;

-- =====================================================================================
-- PART 1: Enhance notifications table
-- =====================================================================================

-- Add expires_at column if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'notifications' AND column_name = 'expires_at'
  ) THEN
    ALTER TABLE public.notifications ADD COLUMN expires_at TIMESTAMPTZ;
  END IF;
END $$;

-- Add metadata column if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'notifications' AND column_name = 'metadata'
  ) THEN
    ALTER TABLE public.notifications ADD COLUMN metadata JSONB DEFAULT '{}';
  END IF;
END $$;

-- Add category column if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'notifications' AND column_name = 'category'
  ) THEN
    ALTER TABLE public.notifications ADD COLUMN category TEXT DEFAULT 'system'
      CHECK (category IN ('system', 'security', 'member', 'finance', 'event', 'communication'));
  END IF;
END $$;

-- Add priority column if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'notifications' AND column_name = 'priority'
  ) THEN
    ALTER TABLE public.notifications ADD COLUMN priority TEXT DEFAULT 'normal'
      CHECK (priority IN ('low', 'normal', 'high', 'urgent'));
  END IF;
END $$;

-- Add index on expires_at for cleanup queries
CREATE INDEX IF NOT EXISTS idx_notifications_expires_at
  ON public.notifications (expires_at)
  WHERE expires_at IS NOT NULL;

-- Add index on category for filtering
CREATE INDEX IF NOT EXISTS idx_notifications_category
  ON public.notifications (category);

-- Add index on priority for urgent notifications
CREATE INDEX IF NOT EXISTS idx_notifications_priority
  ON public.notifications (priority)
  WHERE priority IN ('high', 'urgent');

-- =====================================================================================
-- PART 2: Fix RLS policies for proper user isolation
-- =====================================================================================

-- Drop existing overly permissive policies
DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can update their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can insert notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can delete their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "System can insert notifications" ON public.notifications;

-- Create notification policies with existence checks
DO $$
BEGIN
    -- Create properly scoped SELECT policy
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'notifications' AND policyname = 'Users can view their own notifications') THEN
        CREATE POLICY "Users can view their own notifications"
        ON public.notifications
        FOR SELECT
        TO authenticated
        USING (user_id = auth.uid());
    END IF;

    -- Create properly scoped UPDATE policy
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'notifications' AND policyname = 'Users can update their own notifications') THEN
        CREATE POLICY "Users can update their own notifications"
        ON public.notifications
        FOR UPDATE
        TO authenticated
        USING (user_id = auth.uid())
        WITH CHECK (user_id = auth.uid());
    END IF;

    -- Create INSERT policy (system can insert for any user, but user_id must be set)
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'notifications' AND policyname = 'System can insert notifications') THEN
        CREATE POLICY "System can insert notifications"
        ON public.notifications
        FOR INSERT
        TO authenticated
        WITH CHECK (user_id IS NOT NULL);
    END IF;

    -- Create properly scoped DELETE policy
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'notifications' AND policyname = 'Users can delete their own notifications') THEN
        CREATE POLICY "Users can delete their own notifications"
        ON public.notifications
        FOR DELETE
        TO authenticated
        USING (user_id = auth.uid());
    END IF;
END $$;

-- =====================================================================================
-- PART 3: Create notification_queue table for message bus
-- =====================================================================================

CREATE TABLE IF NOT EXISTS public.notification_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Event data
  event_type TEXT NOT NULL,
  event_id UUID NOT NULL,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Channel routing
  channel TEXT NOT NULL CHECK (channel IN ('in_app', 'email', 'sms', 'push', 'webhook')),

  -- Message content
  payload JSONB NOT NULL DEFAULT '{}',

  -- Queue management
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'dead')),
  priority INTEGER NOT NULL DEFAULT 0,

  -- Retry logic
  attempts INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 3,
  next_attempt_at TIMESTAMPTZ DEFAULT now(),

  -- Scheduling
  scheduled_for TIMESTAMPTZ,

  -- Tracking
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  error_message TEXT,

  -- Correlation
  correlation_id UUID,
  parent_queue_id UUID REFERENCES public.notification_queue(id)
);

-- Indexes for queue processing
CREATE INDEX IF NOT EXISTS idx_notification_queue_pending
  ON public.notification_queue (next_attempt_at, priority DESC)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_notification_queue_scheduled
  ON public.notification_queue (scheduled_for)
  WHERE status = 'pending' AND scheduled_for IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_notification_queue_tenant
  ON public.notification_queue (tenant_id);

CREATE INDEX IF NOT EXISTS idx_notification_queue_recipient
  ON public.notification_queue (recipient_id);

CREATE INDEX IF NOT EXISTS idx_notification_queue_event
  ON public.notification_queue (event_id);

CREATE INDEX IF NOT EXISTS idx_notification_queue_correlation
  ON public.notification_queue (correlation_id)
  WHERE correlation_id IS NOT NULL;

-- Enable RLS
ALTER TABLE public.notification_queue ENABLE ROW LEVEL SECURITY;

-- Admin-only access to queue (service role bypasses RLS)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'notification_queue' AND policyname = 'Admins can manage notification queue') THEN
        CREATE POLICY "Admins can manage notification queue"
        ON public.notification_queue
        FOR ALL
        TO authenticated
        USING (
          EXISTS (
            SELECT 1 FROM public.user_roles ur
            JOIN public.roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid()
            AND r.code IN ('super_admin', 'tenant_admin')
          )
        );
    END IF;
END $$;

-- =====================================================================================
-- PART 4: Create notification_preferences table
-- =====================================================================================

CREATE TABLE IF NOT EXISTS public.notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,

  -- Preference settings
  category TEXT NOT NULL CHECK (category IN ('system', 'security', 'member', 'finance', 'event', 'communication', 'all')),
  channel TEXT NOT NULL CHECK (channel IN ('in_app', 'email', 'sms', 'push', 'webhook')),
  enabled BOOLEAN NOT NULL DEFAULT true,

  -- Digest settings
  digest_frequency TEXT CHECK (digest_frequency IN ('immediate', 'hourly', 'daily', 'weekly')),

  -- Quiet hours (stored as TIME)
  quiet_hours_start TIME,
  quiet_hours_end TIME,
  quiet_hours_timezone TEXT DEFAULT 'UTC',

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Ensure unique preference per user/tenant/category/channel
  CONSTRAINT notification_preferences_unique
    UNIQUE (user_id, tenant_id, category, channel)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_notification_preferences_user
  ON public.notification_preferences (user_id, tenant_id);

CREATE INDEX IF NOT EXISTS idx_notification_preferences_lookup
  ON public.notification_preferences (user_id, tenant_id, category, channel);

-- Enable RLS
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

-- Users can view/manage their own preferences (with existence checks)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'notification_preferences' AND policyname = 'Users can view their own notification preferences') THEN
        CREATE POLICY "Users can view their own notification preferences"
        ON public.notification_preferences
        FOR SELECT
        TO authenticated
        USING (user_id = auth.uid());
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'notification_preferences' AND policyname = 'Users can insert their own notification preferences') THEN
        CREATE POLICY "Users can insert their own notification preferences"
        ON public.notification_preferences
        FOR INSERT
        TO authenticated
        WITH CHECK (user_id = auth.uid());
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'notification_preferences' AND policyname = 'Users can update their own notification preferences') THEN
        CREATE POLICY "Users can update their own notification preferences"
        ON public.notification_preferences
        FOR UPDATE
        TO authenticated
        USING (user_id = auth.uid())
        WITH CHECK (user_id = auth.uid());
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'notification_preferences' AND policyname = 'Users can delete their own notification preferences') THEN
        CREATE POLICY "Users can delete their own notification preferences"
        ON public.notification_preferences
        FOR DELETE
        TO authenticated
        USING (user_id = auth.uid());
    END IF;
END $$;

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_notification_preferences_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS notification_preferences_updated_at ON public.notification_preferences;
CREATE TRIGGER notification_preferences_updated_at
  BEFORE UPDATE ON public.notification_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_notification_preferences_updated_at();

-- =====================================================================================
-- PART 5: Create notification_templates table
-- =====================================================================================

CREATE TABLE IF NOT EXISTS public.notification_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE, -- NULL for system templates

  -- Template identification
  event_type TEXT NOT NULL,
  channel TEXT NOT NULL CHECK (channel IN ('in_app', 'email', 'sms', 'push', 'webhook')),
  name TEXT NOT NULL,

  -- Template content
  subject TEXT, -- For email subject line
  title_template TEXT, -- For in-app/push title
  body_template TEXT NOT NULL, -- Main content (supports {{variables}})

  -- Template settings
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_system BOOLEAN NOT NULL DEFAULT false, -- System templates cannot be modified by tenants

  -- Metadata
  variables JSONB DEFAULT '[]', -- List of available variables: [{name, description, required}]

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id),

  -- Unique constraint: one template per event/channel per tenant (or system)
  CONSTRAINT notification_templates_unique
    UNIQUE (tenant_id, event_type, channel)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_notification_templates_lookup
  ON public.notification_templates (event_type, channel, tenant_id);

CREATE INDEX IF NOT EXISTS idx_notification_templates_tenant
  ON public.notification_templates (tenant_id)
  WHERE tenant_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_notification_templates_system
  ON public.notification_templates (event_type, channel)
  WHERE tenant_id IS NULL AND is_system = true;

-- Enable RLS
ALTER TABLE public.notification_templates ENABLE ROW LEVEL SECURITY;

-- Notification templates policies (with existence checks)
DO $$
BEGIN
    -- Users can view system templates and their tenant's templates
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'notification_templates' AND policyname = 'Users can view accessible notification templates') THEN
        CREATE POLICY "Users can view accessible notification templates"
        ON public.notification_templates
        FOR SELECT
        TO authenticated
        USING (
          tenant_id IS NULL -- System templates
          OR tenant_id IN (
            SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid()
          )
        );
    END IF;

    -- Only admins can manage tenant templates
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'notification_templates' AND policyname = 'Admins can manage tenant notification templates') THEN
        CREATE POLICY "Admins can manage tenant notification templates"
        ON public.notification_templates
        FOR ALL
        TO authenticated
        USING (
          tenant_id IS NOT NULL
          AND EXISTS (
            SELECT 1 FROM public.user_roles ur
            JOIN public.roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid()
            AND ur.tenant_id = notification_templates.tenant_id
            AND r.code IN ('super_admin', 'tenant_admin')
          )
        )
        WITH CHECK (
          tenant_id IS NOT NULL
          AND is_system = false -- Cannot create system templates
          AND EXISTS (
            SELECT 1 FROM public.user_roles ur
            JOIN public.roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid()
            AND ur.tenant_id = notification_templates.tenant_id
            AND r.code IN ('super_admin', 'tenant_admin')
          )
        );
    END IF;
END $$;

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_notification_templates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  NEW.updated_by = auth.uid();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS notification_templates_updated_at ON public.notification_templates;
CREATE TRIGGER notification_templates_updated_at
  BEFORE UPDATE ON public.notification_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_notification_templates_updated_at();

-- =====================================================================================
-- PART 6: Add notification feature codes to feature_catalog
-- =====================================================================================

INSERT INTO public.feature_catalog (code, name, category, description, tier, phase, is_active, is_delegatable)
VALUES
  ('notifications-inapp', 'In-App Notifications', 'notifications',
   'Basic notification bell with unread count and notification center', 'essential', 'ga', true, false),

  ('notifications-email', 'Email Notifications', 'notifications',
   'Email delivery channel for important notifications', 'essential', 'ga', true, false),

  ('notifications-sms', 'SMS Notifications', 'notifications',
   'SMS/text message delivery via Twilio integration', 'professional', 'ga', true, true),

  ('notifications-push', 'Push Notifications', 'notifications',
   'Mobile and web push notifications via Firebase Cloud Messaging', 'professional', 'ga', true, true),

  ('notifications-digest', 'Digest & Batching', 'notifications',
   'Batch notifications into hourly, daily, or weekly digests', 'professional', 'ga', true, true),

  ('notifications-scheduled', 'Scheduled Notifications', 'notifications',
   'Schedule notifications for future delivery with recurring support', 'enterprise', 'ga', true, true),

  ('notifications-webhooks', 'Webhook Delivery', 'notifications',
   'HTTP webhook delivery to external systems with retry logic', 'enterprise', 'ga', true, true),

  ('notifications-templates', 'Custom Templates', 'notifications',
   'Tenant-customizable notification templates with variables', 'enterprise', 'ga', true, true),

  ('notifications-analytics', 'Notification Analytics', 'notifications',
   'Delivery metrics, open rates, click tracking, and engagement dashboard', 'premium', 'ga', true, true),

  ('notifications-priority', 'Priority Routing', 'notifications',
   'Urgent and high-priority notification bypass and smart routing', 'premium', 'ga', true, true)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  tier = EXCLUDED.tier,
  category = EXCLUDED.category;

-- =====================================================================================
-- PART 7: Seed default system notification templates
-- =====================================================================================

INSERT INTO public.notification_templates (tenant_id, event_type, channel, name, title_template, body_template, is_system, variables)
VALUES
  -- Member invited
  (NULL, 'member.invited', 'in_app', 'Member Invitation',
   'New Member Invitation',
   'You have been invited to join {{tenant_name}}. Click to accept the invitation.',
   true,
   '[{"name": "tenant_name", "description": "Name of the organization", "required": true}, {"name": "inviter_name", "description": "Name of person who sent invite", "required": false}]'),

  (NULL, 'member.invited', 'email', 'Member Invitation Email',
   'You''ve been invited to join {{tenant_name}}',
   'Hello {{first_name}},\n\nYou have been invited to join {{tenant_name}}.\n\nClick the link below to accept your invitation:\n{{invitation_url}}\n\nThis invitation expires in 7 days.',
   true,
   '[{"name": "tenant_name", "description": "Name of the organization", "required": true}, {"name": "first_name", "description": "Recipient first name", "required": true}, {"name": "invitation_url", "description": "URL to accept invitation", "required": true}]'),

  -- Role assigned
  (NULL, 'role.assigned', 'in_app', 'Role Assigned',
   'New Role Assigned',
   'You have been assigned the {{role_name}} role by {{assigner_name}}.',
   true,
   '[{"name": "role_name", "description": "Name of the assigned role", "required": true}, {"name": "assigner_name", "description": "Name of person who assigned the role", "required": false}]'),

  -- Delegation expiring
  (NULL, 'delegation.expiring', 'in_app', 'Delegation Expiring',
   'Delegation Expiring Soon',
   'Your delegated {{role_name}} role will expire in {{days_remaining}} days.',
   true,
   '[{"name": "role_name", "description": "Name of the delegated role", "required": true}, {"name": "days_remaining", "description": "Days until expiration", "required": true}]'),

  (NULL, 'delegation.expiring', 'email', 'Delegation Expiring Email',
   'Your delegated access is expiring soon',
   'Hello {{first_name}},\n\nYour delegated {{role_name}} role will expire on {{expiration_date}}.\n\nIf you need to extend this access, please contact your administrator.',
   true,
   '[{"name": "first_name", "description": "Recipient first name", "required": true}, {"name": "role_name", "description": "Name of the delegated role", "required": true}, {"name": "expiration_date", "description": "Date of expiration", "required": true}]'),

  -- License expiring
  (NULL, 'license.expiring', 'in_app', 'License Expiring',
   'License Renewal Required',
   'Your {{plan_name}} license will expire in {{days_remaining}} days. Renew now to avoid service interruption.',
   true,
   '[{"name": "plan_name", "description": "Name of the license plan", "required": true}, {"name": "days_remaining", "description": "Days until expiration", "required": true}]'),

  (NULL, 'license.expiring', 'email', 'License Expiring Email',
   'Action Required: Your {{plan_name}} license expires soon',
   'Hello {{first_name}},\n\nYour {{plan_name}} license for {{tenant_name}} will expire on {{expiration_date}}.\n\nTo avoid service interruption, please renew your subscription:\n{{renewal_url}}',
   true,
   '[{"name": "first_name", "description": "Recipient first name", "required": true}, {"name": "plan_name", "description": "Name of the license plan", "required": true}, {"name": "tenant_name", "description": "Organization name", "required": true}, {"name": "expiration_date", "description": "Date of expiration", "required": true}, {"name": "renewal_url", "description": "URL to renew license", "required": true}]'),

  -- System maintenance
  (NULL, 'system.maintenance', 'in_app', 'System Maintenance',
   'Scheduled Maintenance',
   'System maintenance is scheduled for {{maintenance_date}}. Expected downtime: {{duration}}.',
   true,
   '[{"name": "maintenance_date", "description": "Date and time of maintenance", "required": true}, {"name": "duration", "description": "Expected duration", "required": true}]')

ON CONFLICT (tenant_id, event_type, channel) DO NOTHING;

-- =====================================================================================
-- PART 8: Add feature permissions for notification features
-- =====================================================================================

-- Permissions for notifications-inapp feature
INSERT INTO public.feature_permissions (feature_id, permission_code, display_name, description, category, action, is_required, display_order)
SELECT fc.id, 'notifications:view', 'View Notifications', 'View own notifications in the notification center', 'notifications', 'view', true, 1
FROM public.feature_catalog fc WHERE fc.code = 'notifications-inapp'
ON CONFLICT DO NOTHING;

INSERT INTO public.feature_permissions (feature_id, permission_code, display_name, description, category, action, is_required, display_order)
SELECT fc.id, 'notifications:dismiss', 'Dismiss Notifications', 'Mark notifications as read and delete own notifications', 'notifications', 'dismiss', false, 2
FROM public.feature_catalog fc WHERE fc.code = 'notifications-inapp'
ON CONFLICT DO NOTHING;

INSERT INTO public.feature_permissions (feature_id, permission_code, display_name, description, category, action, is_required, display_order)
SELECT fc.id, 'notifications:manage_queue', 'Manage Queue', 'View and manage the notification queue', 'notifications', 'admin', false, 10
FROM public.feature_catalog fc WHERE fc.code = 'notifications-inapp'
ON CONFLICT DO NOTHING;

INSERT INTO public.feature_permissions (feature_id, permission_code, display_name, description, category, action, is_required, display_order)
SELECT fc.id, 'notifications:broadcast', 'Send Broadcast', 'Send broadcast notifications to all users', 'notifications', 'admin', false, 11
FROM public.feature_catalog fc WHERE fc.code = 'notifications-inapp'
ON CONFLICT DO NOTHING;

-- Permissions for notifications-templates feature
INSERT INTO public.feature_permissions (feature_id, permission_code, display_name, description, category, action, is_required, display_order)
SELECT fc.id, 'notification_templates:view', 'View Templates', 'View notification templates', 'notifications', 'view', true, 1
FROM public.feature_catalog fc WHERE fc.code = 'notifications-templates'
ON CONFLICT DO NOTHING;

INSERT INTO public.feature_permissions (feature_id, permission_code, display_name, description, category, action, is_required, display_order)
SELECT fc.id, 'notification_templates:edit', 'Edit Templates', 'Create and edit notification templates', 'notifications', 'edit', false, 2
FROM public.feature_catalog fc WHERE fc.code = 'notifications-templates'
ON CONFLICT DO NOTHING;

-- Permissions for notifications-analytics feature
INSERT INTO public.feature_permissions (feature_id, permission_code, display_name, description, category, action, is_required, display_order)
SELECT fc.id, 'notification_analytics:view', 'View Analytics', 'View notification delivery analytics', 'notifications', 'view', true, 1
FROM public.feature_catalog fc WHERE fc.code = 'notifications-analytics'
ON CONFLICT DO NOTHING;

INSERT INTO public.feature_permissions (feature_id, permission_code, display_name, description, category, action, is_required, display_order)
SELECT fc.id, 'notification_analytics:export', 'Export Analytics', 'Export notification analytics data', 'notifications', 'export', false, 2
FROM public.feature_catalog fc WHERE fc.code = 'notifications-analytics'
ON CONFLICT DO NOTHING;

COMMIT;
