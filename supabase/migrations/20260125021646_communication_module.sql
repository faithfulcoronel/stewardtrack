-- ============================================
-- Communication Module Database Schema
-- ============================================

-- Communication templates (create first as campaigns reference it)
CREATE TABLE IF NOT EXISTS communication_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL CHECK (category IN ('welcome', 'event', 'newsletter', 'prayer', 'announcement', 'follow-up', 'birthday', 'anniversary', 'custom')),
  channels TEXT[] NOT NULL DEFAULT '{"email"}',
  subject TEXT,
  content_html TEXT,
  content_text TEXT,
  variables JSONB DEFAULT '[]',
  is_system BOOLEAN DEFAULT false,
  is_ai_generated BOOLEAN DEFAULT false,
  ai_prompt TEXT,
  usage_count INTEGER DEFAULT 0,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

-- Communication campaigns table
CREATE TABLE IF NOT EXISTS communication_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  name TEXT NOT NULL,
  description TEXT,
  campaign_type TEXT NOT NULL CHECK (campaign_type IN ('individual', 'bulk', 'scheduled', 'recurring')),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'sending', 'sent', 'paused', 'cancelled', 'failed')),
  channels TEXT[] NOT NULL DEFAULT '{"email"}',
  subject TEXT,
  content_html TEXT,
  content_text TEXT,
  template_id UUID REFERENCES communication_templates(id),
  recipient_criteria JSONB,
  scheduled_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  total_recipients INTEGER DEFAULT 0,
  sent_count INTEGER DEFAULT 0,
  delivered_count INTEGER DEFAULT 0,
  failed_count INTEGER DEFAULT 0,
  opened_count INTEGER DEFAULT 0,
  clicked_count INTEGER DEFAULT 0,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

-- Campaign recipients (for tracking individual sends)
CREATE TABLE IF NOT EXISTS campaign_recipients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES communication_campaigns(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  recipient_type TEXT NOT NULL CHECK (recipient_type IN ('member', 'account', 'external')),
  recipient_id UUID,
  email TEXT,
  phone TEXT,
  personalization_data JSONB,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'failed', 'bounced', 'opened', 'clicked', 'unsubscribed')),
  channel TEXT NOT NULL,
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  opened_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ,
  error_message TEXT,
  provider_message_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Communication preferences (opt-out tracking)
CREATE TABLE IF NOT EXISTS communication_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  member_id UUID REFERENCES members(id),
  email TEXT,
  phone TEXT,
  email_opted_in BOOLEAN DEFAULT true,
  sms_opted_in BOOLEAN DEFAULT true,
  opted_out_at TIMESTAMPTZ,
  opted_out_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- AI-generated content suggestions (for smart compose)
CREATE TABLE IF NOT EXISTS communication_ai_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  campaign_id UUID REFERENCES communication_campaigns(id),
  suggestion_type TEXT NOT NULL CHECK (suggestion_type IN ('subject', 'content', 'personalization', 'audience', 'schedule')),
  original_input TEXT,
  suggested_content TEXT NOT NULL,
  ai_model TEXT,
  tokens_used INTEGER,
  accepted BOOLEAN,
  feedback TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- Indexes for performance
-- ============================================

-- Campaign indexes
CREATE INDEX IF NOT EXISTS idx_communication_campaigns_tenant_id ON communication_campaigns(tenant_id);
CREATE INDEX IF NOT EXISTS idx_communication_campaigns_status ON communication_campaigns(status);
CREATE INDEX IF NOT EXISTS idx_communication_campaigns_created_at ON communication_campaigns(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_communication_campaigns_scheduled_at ON communication_campaigns(scheduled_at) WHERE scheduled_at IS NOT NULL;

-- Template indexes
CREATE INDEX IF NOT EXISTS idx_communication_templates_tenant_id ON communication_templates(tenant_id);
CREATE INDEX IF NOT EXISTS idx_communication_templates_category ON communication_templates(category);

-- Recipient indexes
CREATE INDEX IF NOT EXISTS idx_campaign_recipients_campaign_id ON campaign_recipients(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_recipients_tenant_id ON campaign_recipients(tenant_id);
CREATE INDEX IF NOT EXISTS idx_campaign_recipients_status ON campaign_recipients(status);
CREATE INDEX IF NOT EXISTS idx_campaign_recipients_email ON campaign_recipients(email);
CREATE INDEX IF NOT EXISTS idx_campaign_recipients_phone ON campaign_recipients(phone);

-- Preference indexes
CREATE INDEX IF NOT EXISTS idx_communication_preferences_tenant_id ON communication_preferences(tenant_id);
CREATE INDEX IF NOT EXISTS idx_communication_preferences_member_id ON communication_preferences(member_id);
CREATE INDEX IF NOT EXISTS idx_communication_preferences_email ON communication_preferences(email);
CREATE INDEX IF NOT EXISTS idx_communication_preferences_phone ON communication_preferences(phone);

-- AI suggestions indexes
CREATE INDEX IF NOT EXISTS idx_communication_ai_suggestions_tenant_id ON communication_ai_suggestions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_communication_ai_suggestions_campaign_id ON communication_ai_suggestions(campaign_id);

-- ============================================
-- Unique constraints
-- ============================================

-- Preferences unique constraints (use partial indexes to handle nulls)
CREATE UNIQUE INDEX IF NOT EXISTS idx_communication_preferences_tenant_member
  ON communication_preferences(tenant_id, member_id)
  WHERE member_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_communication_preferences_tenant_email
  ON communication_preferences(tenant_id, email)
  WHERE email IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_communication_preferences_tenant_phone
  ON communication_preferences(tenant_id, phone)
  WHERE phone IS NOT NULL;

-- ============================================
-- Row Level Security Policies
-- ============================================

-- Enable RLS on all tables
ALTER TABLE communication_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE communication_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_recipients ENABLE ROW LEVEL SECURITY;
ALTER TABLE communication_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE communication_ai_suggestions ENABLE ROW LEVEL SECURITY;

-- Campaign policies
CREATE POLICY "Campaigns are viewable by tenant users" ON communication_campaigns
  FOR SELECT USING (
    tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid())
  );

CREATE POLICY "Campaigns are insertable by tenant users" ON communication_campaigns
  FOR INSERT WITH CHECK (
    tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid())
  );

CREATE POLICY "Campaigns are updatable by tenant users" ON communication_campaigns
  FOR UPDATE USING (
    tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid())
  );

CREATE POLICY "Campaigns are deletable by tenant users" ON communication_campaigns
  FOR DELETE USING (
    tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid())
  );

-- Template policies
CREATE POLICY "Templates are viewable by tenant users" ON communication_templates
  FOR SELECT USING (
    tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid())
  );

CREATE POLICY "Templates are insertable by tenant users" ON communication_templates
  FOR INSERT WITH CHECK (
    tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid())
  );

CREATE POLICY "Templates are updatable by tenant users" ON communication_templates
  FOR UPDATE USING (
    tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid())
  );

CREATE POLICY "Templates are deletable by tenant users" ON communication_templates
  FOR DELETE USING (
    tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid())
  );

-- Recipient policies
CREATE POLICY "Recipients are viewable by tenant users" ON campaign_recipients
  FOR SELECT USING (
    tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid())
  );

CREATE POLICY "Recipients are insertable by tenant users" ON campaign_recipients
  FOR INSERT WITH CHECK (
    tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid())
  );

CREATE POLICY "Recipients are updatable by tenant users" ON campaign_recipients
  FOR UPDATE USING (
    tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid())
  );

CREATE POLICY "Recipients are deletable by tenant users" ON campaign_recipients
  FOR DELETE USING (
    tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid())
  );

-- Preference policies
CREATE POLICY "Preferences are viewable by tenant users" ON communication_preferences
  FOR SELECT USING (
    tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid())
  );

CREATE POLICY "Preferences are insertable by tenant users" ON communication_preferences
  FOR INSERT WITH CHECK (
    tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid())
  );

CREATE POLICY "Preferences are updatable by tenant users" ON communication_preferences
  FOR UPDATE USING (
    tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid())
  );

CREATE POLICY "Preferences are deletable by tenant users" ON communication_preferences
  FOR DELETE USING (
    tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid())
  );

-- AI Suggestions policies
CREATE POLICY "AI Suggestions are viewable by tenant users" ON communication_ai_suggestions
  FOR SELECT USING (
    tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid())
  );

CREATE POLICY "AI Suggestions are insertable by tenant users" ON communication_ai_suggestions
  FOR INSERT WITH CHECK (
    tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid())
  );

CREATE POLICY "AI Suggestions are updatable by tenant users" ON communication_ai_suggestions
  FOR UPDATE USING (
    tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid())
  );
