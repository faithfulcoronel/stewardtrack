-- ============================================================================
-- Migration: Add Notification Templates for Care Plans and Discipleship Plans
--
-- Creates system notification templates for:
-- - Care Plan Assignment
-- - Discipleship Plan Assignment
-- ============================================================================

-- Insert system notification templates (tenant_id = NULL for system templates)

-- Care Plan Assigned - In-App Template
INSERT INTO notification_templates (
  id,
  tenant_id,
  event_type,
  channel,
  name,
  subject,
  body_template,
  is_active,
  created_at
) VALUES (
  gen_random_uuid(),
  NULL, -- System template
  'care_plan.assigned',
  'in_app',
  'Care Plan Assigned - In-App',
  NULL, -- In-app doesn't use subject
  'A care plan has been assigned to you. {{#if details}}Details: {{details}}{{/if}}',
  true,
  now()
) ON CONFLICT (tenant_id, event_type, channel) DO UPDATE SET
  body_template = EXCLUDED.body_template,
  is_active = true;

-- Care Plan Assigned - Email Template
INSERT INTO notification_templates (
  id,
  tenant_id,
  event_type,
  channel,
  name,
  subject,
  body_template,
  is_active,
  created_at
) VALUES (
  gen_random_uuid(),
  NULL, -- System template
  'care_plan.assigned',
  'email',
  'Care Plan Assigned - Email',
  'Care Plan Assigned',
  E'<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <h1 style="color: #2563eb; margin-bottom: 20px;">Care Plan Assigned</h1>
  <p>Hello {{memberName}},</p>
  <p>A care plan has been created for you by your church staff.</p>
  {{#if statusLabel}}
  <p><strong>Status:</strong> {{statusLabel}}</p>
  {{/if}}
  {{#if priority}}
  <p><strong>Priority:</strong> {{priority}}</p>
  {{/if}}
  {{#if followUpDate}}
  <p><strong>Follow-up Date:</strong> {{followUpDate}}</p>
  {{/if}}
  <p><a href="{{actionPayload}}" style="display: inline-block; background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 16px;">View Care Plan</a></p>
  <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
  <p style="font-size: 12px; color: #6b7280;">This is an automated notification from StewardTrack.</p>
</body>
</html>',
  true,
  now()
) ON CONFLICT (tenant_id, event_type, channel) DO UPDATE SET
  subject = EXCLUDED.subject,
  body_template = EXCLUDED.body_template,
  is_active = true;

-- Care Plan Assigned - SMS Template
INSERT INTO notification_templates (
  id,
  tenant_id,
  event_type,
  channel,
  name,
  subject,
  body_template,
  is_active,
  created_at
) VALUES (
  gen_random_uuid(),
  NULL, -- System template
  'care_plan.assigned',
  'sms',
  'Care Plan Assigned - SMS',
  NULL, -- SMS doesn't use subject
  'A care plan has been assigned to you. Check your church app for details.',
  true,
  now()
) ON CONFLICT (tenant_id, event_type, channel) DO UPDATE SET
  body_template = EXCLUDED.body_template,
  is_active = true;

-- Discipleship Plan Assigned - In-App Template
INSERT INTO notification_templates (
  id,
  tenant_id,
  event_type,
  channel,
  name,
  subject,
  body_template,
  is_active,
  created_at
) VALUES (
  gen_random_uuid(),
  NULL, -- System template
  'discipleship_plan.assigned',
  'in_app',
  'Discipleship Plan Assigned - In-App',
  NULL,
  'You''ve been enrolled in {{#if pathway}}the "{{pathway}}" pathway{{else}}a discipleship plan{{/if}}.{{#if mentorName}} Your mentor is {{mentorName}}.{{/if}}',
  true,
  now()
) ON CONFLICT (tenant_id, event_type, channel) DO UPDATE SET
  body_template = EXCLUDED.body_template,
  is_active = true;

-- Discipleship Plan Assigned - Email Template
INSERT INTO notification_templates (
  id,
  tenant_id,
  event_type,
  channel,
  name,
  subject,
  body_template,
  is_active,
  created_at
) VALUES (
  gen_random_uuid(),
  NULL, -- System template
  'discipleship_plan.assigned',
  'email',
  'Discipleship Plan Assigned - Email',
  'Your Discipleship Journey Begins',
  E'<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <h1 style="color: #2563eb; margin-bottom: 20px;">Your Discipleship Journey Begins</h1>
  <p>Hello {{memberName}},</p>
  <p>Congratulations! You''ve been enrolled in {{#if pathway}}the <strong>{{pathway}}</strong> discipleship pathway{{else}}a personalized discipleship plan{{/if}}.</p>
  {{#if mentorName}}
  <p><strong>Your Mentor:</strong> {{mentorName}}</p>
  {{/if}}
  {{#if nextStep}}
  <p><strong>Your Next Step:</strong> {{nextStep}}</p>
  {{/if}}
  {{#if targetDate}}
  <p><strong>Target Completion:</strong> {{targetDate}}</p>
  {{/if}}
  <p>We''re excited to walk alongside you on this spiritual growth journey!</p>
  <p><a href="{{actionPayload}}" style="display: inline-block; background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 16px;">View Your Plan</a></p>
  <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
  <p style="font-size: 12px; color: #6b7280;">This is an automated notification from StewardTrack.</p>
</body>
</html>',
  true,
  now()
) ON CONFLICT (tenant_id, event_type, channel) DO UPDATE SET
  subject = EXCLUDED.subject,
  body_template = EXCLUDED.body_template,
  is_active = true;

-- Discipleship Plan Assigned - SMS Template
INSERT INTO notification_templates (
  id,
  tenant_id,
  event_type,
  channel,
  name,
  subject,
  body_template,
  is_active,
  created_at
) VALUES (
  gen_random_uuid(),
  NULL, -- System template
  'discipleship_plan.assigned',
  'sms',
  'Discipleship Plan Assigned - SMS',
  NULL,
  'Your discipleship journey begins! {{#if pathway}}Pathway: {{pathway}}.{{/if}}{{#if mentorName}} Mentor: {{mentorName}}.{{/if}} Check your church app for details.',
  true,
  now()
) ON CONFLICT (tenant_id, event_type, channel) DO UPDATE SET
  body_template = EXCLUDED.body_template,
  is_active = true;

-- Add comments
COMMENT ON TABLE notification_templates IS 'Stores notification templates for different event types and channels. tenant_id = NULL indicates system templates available to all tenants.';
