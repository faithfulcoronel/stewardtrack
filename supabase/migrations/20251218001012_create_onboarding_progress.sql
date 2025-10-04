-- Migration: Create onboarding_progress table
-- This table tracks tenant onboarding completion status and progress data

CREATE TABLE IF NOT EXISTS onboarding_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Progress tracking
  current_step text NOT NULL DEFAULT 'welcome',
  completed_steps text[] DEFAULT '{}',
  is_completed boolean DEFAULT false,
  completed_at timestamptz,

  -- Step data storage (JSONB for flexibility)
  welcome_data jsonb DEFAULT '{}',
  church_details_data jsonb DEFAULT '{}',
  rbac_setup_data jsonb DEFAULT '{}',
  feature_tour_data jsonb DEFAULT '{}',

  -- Metadata
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),

  -- Constraints
  CONSTRAINT unique_tenant_onboarding UNIQUE(tenant_id),
  CONSTRAINT valid_step CHECK (current_step IN ('welcome', 'church-details', 'rbac-setup', 'feature-tour', 'complete'))
);

-- Add indexes for performance
CREATE INDEX idx_onboarding_progress_tenant_id ON onboarding_progress(tenant_id);
CREATE INDEX idx_onboarding_progress_user_id ON onboarding_progress(user_id);
CREATE INDEX idx_onboarding_progress_is_completed ON onboarding_progress(is_completed);

-- Add RLS policies
ALTER TABLE onboarding_progress ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own tenant's onboarding progress
CREATE POLICY onboarding_progress_select_policy ON onboarding_progress
  FOR SELECT
  USING (
    tenant_id IN (
      SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()
    )
  );

-- Policy: Users can insert onboarding progress for their tenant
CREATE POLICY onboarding_progress_insert_policy ON onboarding_progress
  FOR INSERT
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()
    )
  );

-- Policy: Users can update their own tenant's onboarding progress
CREATE POLICY onboarding_progress_update_policy ON onboarding_progress
  FOR UPDATE
  USING (
    tenant_id IN (
      SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()
    )
  );

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_onboarding_progress_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_onboarding_progress_updated_at
  BEFORE UPDATE ON onboarding_progress
  FOR EACH ROW
  EXECUTE FUNCTION update_onboarding_progress_updated_at();

-- Add comments for documentation
COMMENT ON TABLE onboarding_progress IS 'Tracks tenant onboarding wizard progress and completion status';
COMMENT ON COLUMN onboarding_progress.current_step IS 'The current step in the onboarding wizard';
COMMENT ON COLUMN onboarding_progress.completed_steps IS 'Array of step IDs that have been completed';
COMMENT ON COLUMN onboarding_progress.is_completed IS 'Whether the entire onboarding process is complete';
COMMENT ON COLUMN onboarding_progress.welcome_data IS 'Data collected during the welcome step';
COMMENT ON COLUMN onboarding_progress.church_details_data IS 'Data collected during the church details step (address, contact, etc.)';
COMMENT ON COLUMN onboarding_progress.rbac_setup_data IS 'Data collected during the RBAC/team setup step';
COMMENT ON COLUMN onboarding_progress.feature_tour_data IS 'Data collected during the feature tour step';
