-- ============================================
-- Add updated_by column to Communication Tables
-- ============================================
-- Adds the standard updated_by audit column to communication tables
-- to track who last modified each record.

-- Add updated_by to communication_campaigns
ALTER TABLE communication_campaigns
ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);

-- Add updated_by to communication_templates
ALTER TABLE communication_templates
ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);

-- Add updated_by to campaign_recipients
ALTER TABLE campaign_recipients
ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);

-- Add updated_by to communication_preferences
ALTER TABLE communication_preferences
ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);

-- Add updated_by to communication_ai_suggestions
ALTER TABLE communication_ai_suggestions
ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);

-- Success confirmation
DO $$
BEGIN
  RAISE NOTICE 'Added updated_by column to communication tables';
END $$;
