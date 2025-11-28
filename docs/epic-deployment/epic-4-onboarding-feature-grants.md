# Epic 4: Onboarding & Feature Grants

**Release:** Beta - March 2026
**Timeline:** Weeks 7-8 (February 17 - March 2, 2026)
**Duration:** 2 weeks
**Priority:** P0 (Blocking - Required for Product Launch)
**Epic Owner:** Full Stack Team
**Dependencies:** Epic 1 (JWT Authentication), Epic 2 (Xendit Payment), Epic 3 (RBAC System)

## Epic Overview

Implement the tenant onboarding wizard and license feature grant system. This epic ensures that after registration and payment, tenants are properly onboarded with:
1. Default RBAC roles seeded
2. License features granted based on selected plan
3. Guided setup wizard completed
4. Ready to use the system

## Architecture

### Onboarding Flow

```
Registration (Epic 1)
    │
    ├─> Create Supabase auth user
    ├─> Create tenant record
    ├─> Create profile record
    └─> Link user to tenant
    │
    ↓
RBAC Seeding (Epic 3 + THIS EPIC)
    │
    ├─> Seed 4 default roles (tenant_admin, staff, volunteer, member)
    ├─> Assign tenant_admin role to registered user
    └─> Ready for permission checking
    │
    ↓
Payment (Epic 2)
    │
    ├─> User selects plan (Essential/Professional/Enterprise/Premium)
    ├─> Payment processed via Xendit
    └─> Subscription activated
    │
    ↓
Feature Grants (THIS EPIC)
    │
    ├─> Grant features based on plan tier
    ├─> Update tenant_feature_grants table
    └─> Features immediately available
    │
    ↓
Onboarding Wizard (THIS EPIC)
    │
    ├─> Welcome screen
    ├─> Church details form
    ├─> Basic RBAC setup (optional)
    ├─> Feature tour
    └─> Complete onboarding
    │
    ↓
Ready to Use ✓
```

---

## Database Schema

The onboarding_progress table already exists, but we need to ensure feature grant tables are complete:

**File:** `supabase/migrations/20250128000008_feature_grants_system.sql`

```sql
-- =====================================================
-- LICENSE_FEATURES TABLE (if not exists)
-- Catalog of all available features
-- =====================================================
CREATE TABLE IF NOT EXISTS license_features (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Feature details
  feature_name TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  description TEXT,

  -- Category
  category TEXT NOT NULL, -- 'core', 'advanced', 'premium'

  -- Feature tier
  tier TEXT NOT NULL CHECK (tier IN ('essential', 'professional', 'enterprise', 'premium')),

  -- Status
  is_active BOOLEAN DEFAULT TRUE,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_license_features_tier ON license_features(tier);
CREATE INDEX IF NOT EXISTS idx_license_features_category ON license_features(category);

-- RLS Policies
ALTER TABLE license_features ENABLE ROW LEVEL SECURITY;

CREATE POLICY "all_users_view_license_features" ON license_features
  FOR SELECT USING (TRUE);

-- =====================================================
-- TENANT_FEATURE_GRANTS TABLE
-- Track which features are granted to each tenant
-- =====================================================
CREATE TABLE IF NOT EXISTS tenant_feature_grants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  -- Feature reference
  feature_name TEXT NOT NULL, -- References license_features.feature_name

  -- Grant status
  is_granted BOOLEAN DEFAULT TRUE,

  -- Grant metadata
  granted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  granted_by TEXT DEFAULT 'system', -- 'system', 'admin', 'license_upgrade'
  expires_at TIMESTAMPTZ, -- NULL = never expires

  -- Usage tracking
  usage_count INTEGER DEFAULT 0,
  last_used_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(tenant_id, feature_name)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_tenant_feature_grants_tenant_id ON tenant_feature_grants(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_feature_grants_feature_name ON tenant_feature_grants(feature_name);
CREATE INDEX IF NOT EXISTS idx_tenant_feature_grants_is_granted ON tenant_feature_grants(is_granted);

-- RLS Policies
ALTER TABLE tenant_feature_grants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation_select_feature_grants" ON tenant_feature_grants
  FOR SELECT USING (tenant_id IN (SELECT get_user_tenant_ids()));

-- =====================================================
-- LICENSE_FEATURE_BUNDLES TABLE
-- Define which features are included in each plan
-- =====================================================
CREATE TABLE IF NOT EXISTS license_feature_bundles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Plan tier
  plan_name TEXT NOT NULL CHECK (plan_name IN ('essential', 'professional', 'enterprise', 'premium')),

  -- Feature reference
  feature_name TEXT NOT NULL, -- References license_features.feature_name

  -- Inclusion
  is_included BOOLEAN DEFAULT TRUE,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(plan_name, feature_name)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_license_feature_bundles_plan_name ON license_feature_bundles(plan_name);
CREATE INDEX IF NOT EXISTS idx_license_feature_bundles_feature_name ON license_feature_bundles(feature_name);

-- RLS Policies
ALTER TABLE license_feature_bundles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "all_users_view_license_feature_bundles" ON license_feature_bundles
  FOR SELECT USING (TRUE);

-- =====================================================
-- ONBOARDING_PROGRESS TABLE (ensure it exists)
-- =====================================================
CREATE TABLE IF NOT EXISTS onboarding_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Progress tracking
  current_step TEXT NOT NULL DEFAULT 'welcome',
  completed BOOLEAN DEFAULT FALSE,

  -- Step data (JSONB per step)
  step_data JSONB DEFAULT '{}',

  -- Completion
  completed_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(tenant_id, user_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_onboarding_progress_tenant_id ON onboarding_progress(tenant_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_progress_user_id ON onboarding_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_progress_completed ON onboarding_progress(completed);

-- RLS Policies
ALTER TABLE onboarding_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_view_own_onboarding" ON onboarding_progress
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "users_update_own_onboarding" ON onboarding_progress
  FOR UPDATE USING (user_id = auth.uid());

-- =====================================================
-- TRIGGERS
-- =====================================================
CREATE TRIGGER update_license_features_updated_at
  BEFORE UPDATE ON license_features
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tenant_feature_grants_updated_at
  BEFORE UPDATE ON tenant_feature_grants
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_onboarding_progress_updated_at
  BEFORE UPDATE ON onboarding_progress
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- FUNCTION: Grant features based on plan
-- =====================================================
CREATE OR REPLACE FUNCTION grant_plan_features(
  p_tenant_id UUID,
  p_plan_name TEXT
)
RETURNS VOID AS $$
BEGIN
  -- Insert feature grants for all features in the plan
  INSERT INTO tenant_feature_grants (tenant_id, feature_name, granted_by)
  SELECT
    p_tenant_id,
    lfb.feature_name,
    'license_activation'
  FROM license_feature_bundles lfb
  WHERE lfb.plan_name = p_plan_name
    AND lfb.is_included = TRUE
  ON CONFLICT (tenant_id, feature_name)
  DO UPDATE SET
    is_granted = TRUE,
    granted_at = NOW(),
    granted_by = 'license_upgrade';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- SEED LICENSE FEATURES
-- =====================================================
INSERT INTO license_features (feature_name, display_name, description, category, tier)
VALUES
  -- Core Features (Essential and above)
  ('member_management', 'Member Management', 'Manage church members and families', 'core', 'essential'),
  ('basic_donations', 'Basic Donation Tracking', 'Record and track donations', 'core', 'essential'),
  ('standard_reports', 'Standard Reports', 'Member directory and basic financial reports', 'core', 'essential'),
  ('user_management', 'User Management', 'Manage system users and basic roles', 'core', 'essential'),

  -- Advanced Features (Professional and above)
  ('advanced_reports', 'Advanced Reports', 'Donor analysis and trend reports', 'advanced', 'professional'),
  ('budget_management', 'Budget Management', 'Create and track budgets', 'advanced', 'professional'),
  ('expense_tracking', 'Expense Tracking', 'Record and approve expenses', 'advanced', 'professional'),
  ('multi_role_support', 'Multi-Role Support', 'Assign multiple roles to users', 'advanced', 'professional'),
  ('pledge_tracking', 'Pledge Tracking', 'Track member pledges and commitments', 'advanced', 'professional'),

  -- Premium Features (Enterprise and above)
  ('premium_reports', 'Premium Reports', 'Executive dashboard and predictive analytics', 'premium', 'enterprise'),
  ('custom_report_builder', 'Custom Report Builder', 'Build custom reports', 'premium', 'enterprise'),
  ('role_delegation', 'Role Delegation', 'Delegate roles with scope and time limits', 'premium', 'enterprise'),
  ('audit_logging', 'Audit Logging', 'Comprehensive activity logging', 'premium', 'enterprise'),
  ('data_export', 'Data Export', 'Export data in multiple formats', 'premium', 'enterprise'),

  -- Premium+ Features (Premium plan only)
  ('scheduled_reports', 'Scheduled Reports', 'Automated report delivery via email', 'premium', 'premium'),
  ('api_access', 'API Access', 'RESTful API for integrations', 'premium', 'premium'),
  ('white_label', 'White Label', 'Custom branding and domain', 'premium', 'premium'),
  ('priority_support', 'Priority Support', '24/7 priority customer support', 'premium', 'premium')
ON CONFLICT (feature_name) DO NOTHING;

-- =====================================================
-- SEED LICENSE FEATURE BUNDLES
-- =====================================================

-- Essential Plan
INSERT INTO license_feature_bundles (plan_name, feature_name, is_included)
SELECT 'essential', feature_name, TRUE
FROM license_features
WHERE tier = 'essential'
ON CONFLICT DO NOTHING;

-- Professional Plan (Essential + Professional features)
INSERT INTO license_feature_bundles (plan_name, feature_name, is_included)
SELECT 'professional', feature_name, TRUE
FROM license_features
WHERE tier IN ('essential', 'professional')
ON CONFLICT DO NOTHING;

-- Enterprise Plan (Essential + Professional + Enterprise features)
INSERT INTO license_feature_bundles (plan_name, feature_name, is_included)
SELECT 'enterprise', feature_name, TRUE
FROM license_features
WHERE tier IN ('essential', 'professional', 'enterprise')
ON CONFLICT DO NOTHING;

-- Premium Plan (All features)
INSERT INTO license_feature_bundles (plan_name, feature_name, is_included)
SELECT 'premium', feature_name, TRUE
FROM license_features
ON CONFLICT DO NOTHING;
```

---

## User Stories

### Story 4.1: License Feature Service

**As a** system administrator
**I want** a service to manage feature grants
**So that** tenants automatically receive features based on their license

**Priority:** P0
**Story Points:** 8

#### Implementation

**File:** `src/services/LicenseFeatureService.ts`

```typescript
import { injectable } from 'inversify';
import { getSupabaseServerClient } from '@/lib/supabase/server';

export interface LicenseFeature {
  id: string;
  feature_name: string;
  display_name: string;
  description?: string;
  category: string;
  tier: string;
  is_active: boolean;
}

export interface FeatureGrant {
  id: string;
  tenant_id: string;
  feature_name: string;
  is_granted: boolean;
  granted_at: string;
  granted_by: string;
  expires_at?: string;
  usage_count: number;
  last_used_at?: string;
}

@injectable()
export class LicenseFeatureService {
  /**
   * Grant features to tenant based on plan
   */
  async grantPlanFeatures(tenantId: string, planName: string): Promise<void> {
    const supabase = getSupabaseServerClient();

    await supabase.rpc('grant_plan_features', {
      p_tenant_id: tenantId,
      p_plan_name: planName
    });

    console.log('Plan features granted:', {
      tenantId,
      planName
    });
  }

  /**
   * Check if tenant has a specific feature
   */
  async tenantHasFeature(tenantId: string, featureName: string): Promise<boolean> {
    const supabase = getSupabaseServerClient();

    const { data } = await supabase
      .from('tenant_feature_grants')
      .select('is_granted, expires_at')
      .eq('tenant_id', tenantId)
      .eq('feature_name', featureName)
      .single();

    if (!data || !data.is_granted) {
      return false;
    }

    // Check if expired
    if (data.expires_at && new Date(data.expires_at) < new Date()) {
      return false;
    }

    return true;
  }

  /**
   * Get all granted features for tenant
   */
  async getTenantFeatures(tenantId: string): Promise<FeatureGrant[]> {
    const supabase = getSupabaseServerClient();

    const { data, error } = await supabase
      .from('tenant_feature_grants')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('is_granted', true);

    if (error) {
      throw new Error(`Failed to fetch tenant features: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Get all available features
   */
  async getAllFeatures(): Promise<LicenseFeature[]> {
    const supabase = getSupabaseServerClient();

    const { data, error } = await supabase
      .from('license_features')
      .select('*')
      .eq('is_active', true)
      .order('tier', { ascending: true })
      .order('category', { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch features: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Get features for a specific plan
   */
  async getPlanFeatures(planName: string): Promise<string[]> {
    const supabase = getSupabaseServerClient();

    const { data, error } = await supabase
      .from('license_feature_bundles')
      .select('feature_name')
      .eq('plan_name', planName)
      .eq('is_included', true);

    if (error) {
      throw new Error(`Failed to fetch plan features: ${error.message}`);
    }

    return (data || []).map(item => item.feature_name);
  }

  /**
   * Manually grant a feature to tenant
   */
  async grantFeature(
    tenantId: string,
    featureName: string,
    grantedBy: string,
    expiresAt?: string
  ): Promise<void> {
    const supabase = getSupabaseServerClient();

    const { error } = await supabase
      .from('tenant_feature_grants')
      .insert({
        tenant_id: tenantId,
        feature_name: featureName,
        granted_by: grantedBy,
        expires_at: expiresAt
      })
      .select();

    if (error) {
      if (error.code === '23505') { // Unique violation
        // Update existing grant
        await supabase
          .from('tenant_feature_grants')
          .update({
            is_granted: true,
            granted_at: new Date().toISOString(),
            granted_by: grantedBy,
            expires_at: expiresAt
          })
          .eq('tenant_id', tenantId)
          .eq('feature_name', featureName);
      } else {
        throw new Error(`Failed to grant feature: ${error.message}`);
      }
    }

    console.log('Feature granted:', {
      tenantId,
      featureName,
      grantedBy
    });
  }

  /**
   * Revoke a feature from tenant
   */
  async revokeFeature(tenantId: string, featureName: string): Promise<void> {
    const supabase = getSupabaseServerClient();

    const { error } = await supabase
      .from('tenant_feature_grants')
      .update({ is_granted: false })
      .eq('tenant_id', tenantId)
      .eq('feature_name', featureName);

    if (error) {
      throw new Error(`Failed to revoke feature: ${error.message}`);
    }

    console.log('Feature revoked:', {
      tenantId,
      featureName
    });
  }

  /**
   * Record feature usage
   */
  async recordFeatureUsage(tenantId: string, featureName: string): Promise<void> {
    const supabase = getSupabaseServerClient();

    await supabase.rpc('increment', {
      row_id: tenantId,
      x: 1
    });

    await supabase
      .from('tenant_feature_grants')
      .update({
        usage_count: supabase.raw('usage_count + 1'),
        last_used_at: new Date().toISOString()
      })
      .eq('tenant_id', tenantId)
      .eq('feature_name', featureName);
  }
}
```

##### Update DI Container

```typescript
// src/lib/types.ts
export const TYPES = {
  // ... existing
  LicenseFeatureService: Symbol.for('LicenseFeatureService'),
};

// src/lib/container.ts
import { LicenseFeatureService } from '@/services/LicenseFeatureService';

container.bind<LicenseFeatureService>(TYPES.LicenseFeatureService)
  .to(LicenseFeatureService)
  .inRequestScope();
```

---

### Story 4.2: Onboarding Service

**As a** new tenant
**I want** a guided onboarding wizard
**So that** I can quickly set up my church system

**Priority:** P0
**Story Points:** 5

#### Implementation

**File:** `src/services/OnboardingService.ts`

```typescript
import { injectable, inject } from 'inversify';
import { TYPES } from '@/lib/types';
import { getSupabaseServerClient } from '@/lib/supabase/server';

export interface OnboardingProgress {
  id: string;
  tenant_id: string;
  user_id: string;
  current_step: string;
  completed: boolean;
  step_data: Record<string, any>;
  completed_at?: string;
}

export type OnboardingStep = 'welcome' | 'church_details' | 'rbac_setup' | 'feature_tour' | 'complete';

@injectable()
export class OnboardingService {
  /**
   * Get onboarding progress for user
   */
  async getProgress(userId: string, tenantId: string): Promise<OnboardingProgress | null> {
    const supabase = getSupabaseServerClient();

    const { data, error } = await supabase
      .from('onboarding_progress')
      .select('*')
      .eq('user_id', userId)
      .eq('tenant_id', tenantId)
      .single();

    if (error) return null;
    return data;
  }

  /**
   * Save progress for a specific step
   */
  async saveStepProgress(
    userId: string,
    tenantId: string,
    step: OnboardingStep,
    stepData: any
  ): Promise<void> {
    const supabase = getSupabaseServerClient();

    // Get existing progress
    const existing = await this.getProgress(userId, tenantId);

    if (existing) {
      // Update existing
      const updatedStepData = {
        ...existing.step_data,
        [step]: stepData
      };

      const { error } = await supabase
        .from('onboarding_progress')
        .update({
          current_step: step,
          step_data: updatedStepData
        })
        .eq('id', existing.id);

      if (error) {
        throw new Error(`Failed to save progress: ${error.message}`);
      }
    } else {
      // Create new
      const { error } = await supabase
        .from('onboarding_progress')
        .insert({
          user_id: userId,
          tenant_id: tenantId,
          current_step: step,
          step_data: { [step]: stepData }
        });

      if (error) {
        throw new Error(`Failed to create onboarding progress: ${error.message}`);
      }
    }

    console.log('Onboarding progress saved:', {
      userId,
      step
    });
  }

  /**
   * Complete onboarding
   */
  async completeOnboarding(userId: string, tenantId: string): Promise<void> {
    const supabase = getSupabaseServerClient();

    const { error } = await supabase
      .from('onboarding_progress')
      .update({
        completed: true,
        completed_at: new Date().toISOString(),
        current_step: 'complete'
      })
      .eq('user_id', userId)
      .eq('tenant_id', tenantId);

    if (error) {
      throw new Error(`Failed to complete onboarding: ${error.message}`);
    }

    console.log('Onboarding completed:', {
      userId,
      tenantId
    });
  }

  /**
   * Check if user has completed onboarding
   */
  async isOnboardingComplete(userId: string, tenantId: string): Promise<boolean> {
    const progress = await this.getProgress(userId, tenantId);
    return progress?.completed || false;
  }
}
```

##### Update DI Container

```typescript
// src/lib/types.ts
export const TYPES = {
  // ... existing
  OnboardingService: Symbol.for('OnboardingService'),
};

// src/lib/container.ts
import { OnboardingService } from '@/services/OnboardingService';

container.bind<OnboardingService>(TYPES.OnboardingService)
  .to(OnboardingService)
  .inRequestScope();
```

---

### Story 4.3: Onboarding Wizard UI

**As a** new tenant administrator
**I want** a step-by-step wizard
**So that** I can configure my church system

**Priority:** P0
**Story Points:** 13

#### Implementation

**File:** `src/app/(protected)/onboarding/page.tsx`

```typescript
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { CheckCircle } from 'lucide-react';

const STEPS = [
  { id: 'welcome', title: 'Welcome', description: 'Welcome to StewardTrack' },
  { id: 'church_details', title: 'Church Details', description: 'Tell us about your church' },
  { id: 'rbac_setup', title: 'Setup Users', description: 'Configure user access (optional)' },
  { id: 'feature_tour', title: 'Feature Tour', description: 'Explore available features' },
  { id: 'complete', title: 'Complete', description: 'You are all set!' }
];

export default function OnboardingPage() {
  const router = useRouter();
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [stepData, setStepData] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(false);

  const currentStep = STEPS[currentStepIndex];
  const progress = ((currentStepIndex + 1) / STEPS.length) * 100;

  useEffect(() => {
    fetchProgress();
  }, []);

  const fetchProgress = async () => {
    try {
      const response = await fetch('/api/onboarding/progress');
      const data = await response.json();

      if (data.success && data.data) {
        setStepData(data.data.step_data || {});

        // Find step index
        const stepIndex = STEPS.findIndex(s => s.id === data.data.current_step);
        if (stepIndex >= 0) {
          setCurrentStepIndex(stepIndex);
        }

        // If already completed, redirect to admin
        if (data.data.completed) {
          router.push('/admin');
        }
      }
    } catch (error) {
      console.error('Failed to fetch onboarding progress:', error);
    }
  };

  const handleNext = async () => {
    setLoading(true);

    try {
      // Save current step data
      await fetch('/api/onboarding/save-progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          step: currentStep.id,
          data: stepData[currentStep.id] || {}
        })
      });

      // Move to next step
      if (currentStepIndex < STEPS.length - 1) {
        setCurrentStepIndex(currentStepIndex + 1);
      } else {
        // Complete onboarding
        await fetch('/api/onboarding/complete', {
          method: 'POST'
        });

        router.push('/admin');
      }
    } catch (error) {
      console.error('Failed to save progress:', error);
      alert('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = () => {
    setCurrentStepIndex(currentStepIndex + 1);
  };

  const updateStepData = (data: any) => {
    setStepData({
      ...stepData,
      [currentStep.id]: data
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="w-full max-w-2xl">
        {/* Progress Bar */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-medium">Setup Progress</h2>
            <span className="text-sm text-muted-foreground">
              Step {currentStepIndex + 1} of {STEPS.length}
            </span>
          </div>
          <Progress value={progress} />
        </div>

        {/* Step Card */}
        <Card>
          <CardHeader>
            <CardTitle>{currentStep.title}</CardTitle>
            <CardDescription>{currentStep.description}</CardDescription>
          </CardHeader>
          <CardContent>
            {currentStep.id === 'welcome' && (
              <WelcomeStep onNext={handleNext} />
            )}

            {currentStep.id === 'church_details' && (
              <ChurchDetailsStep
                data={stepData.church_details}
                onChange={updateStepData}
                onNext={handleNext}
              />
            )}

            {currentStep.id === 'rbac_setup' && (
              <RbacSetupStep onNext={handleNext} onSkip={handleSkip} />
            )}

            {currentStep.id === 'feature_tour' && (
              <FeatureTourStep onNext={handleNext} />
            )}

            {currentStep.id === 'complete' && (
              <CompleteStep onFinish={() => router.push('/admin')} />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function WelcomeStep({ onNext }: { onNext: () => void }) {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-2xl font-bold mb-4">Welcome to StewardTrack!</h3>
        <p className="text-muted-foreground mb-6">
          Let's get your church management system set up. This wizard will guide you through
          the essential configuration steps.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="border rounded-lg p-4">
          <CheckCircle className="h-8 w-8 text-green-600 mb-2" />
          <h4 className="font-semibold mb-1">Member Management</h4>
          <p className="text-sm text-muted-foreground">
            Track members, families, and contact information
          </p>
        </div>
        <div className="border rounded-lg p-4">
          <CheckCircle className="h-8 w-8 text-green-600 mb-2" />
          <h4 className="font-semibold mb-1">Financial Tracking</h4>
          <p className="text-sm text-muted-foreground">
            Record donations, manage budgets, and generate reports
          </p>
        </div>
      </div>

      <Button onClick={onNext} className="w-full">
        Get Started
      </Button>
    </div>
  );
}

function ChurchDetailsStep({
  data,
  onChange,
  onNext
}: {
  data: any;
  onChange: (data: any) => void;
  onNext: () => void;
}) {
  const [formData, setFormData] = useState(data || {
    church_name: '',
    address: '',
    city: '',
    phone: '',
    website: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onChange(formData);
    onNext();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="church_name">Church Name</Label>
        <Input
          id="church_name"
          value={formData.church_name}
          onChange={(e) => setFormData({ ...formData, church_name: e.target.value })}
          required
        />
      </div>

      <div>
        <Label htmlFor="address">Address</Label>
        <Input
          id="address"
          value={formData.address}
          onChange={(e) => setFormData({ ...formData, address: e.target.value })}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="city">City</Label>
          <Input
            id="city"
            value={formData.city}
            onChange={(e) => setFormData({ ...formData, city: e.target.value })}
          />
        </div>
        <div>
          <Label htmlFor="phone">Phone</Label>
          <Input
            id="phone"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
          />
        </div>
      </div>

      <div>
        <Label htmlFor="website">Website (optional)</Label>
        <Input
          id="website"
          type="url"
          value={formData.website}
          onChange={(e) => setFormData({ ...formData, website: e.target.value })}
        />
      </div>

      <Button type="submit" className="w-full">
        Continue
      </Button>
    </form>
  );
}

function RbacSetupStep({ onNext, onSkip }: { onNext: () => void; onSkip: () => void }) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">User Access Setup</h3>
        <p className="text-muted-foreground">
          You can add more users and configure their access later from the Admin panel.
          For now, your account has full administrative access.
        </p>
      </div>

      <div className="border rounded-lg p-4 bg-blue-50">
        <h4 className="font-semibold mb-2">Default Roles Created</h4>
        <ul className="text-sm space-y-1 text-muted-foreground">
          <li>✓ Tenant Administrator (your role)</li>
          <li>✓ Staff Member</li>
          <li>✓ Volunteer</li>
          <li>✓ Church Member</li>
        </ul>
      </div>

      <div className="flex gap-4">
        <Button variant="outline" onClick={onSkip} className="flex-1">
          Skip for Now
        </Button>
        <Button onClick={onNext} className="flex-1">
          Continue
        </Button>
      </div>
    </div>
  );
}

function FeatureTourStep({ onNext }: { onNext: () => void }) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">Available Features</h3>
        <p className="text-muted-foreground">
          Based on your subscription plan, here are the features you have access to:
        </p>
      </div>

      <div className="space-y-2">
        <div className="flex items-center gap-2 p-3 border rounded-lg">
          <CheckCircle className="h-5 w-5 text-green-600" />
          <span>Member Management & Directory</span>
        </div>
        <div className="flex items-center gap-2 p-3 border rounded-lg">
          <CheckCircle className="h-5 w-5 text-green-600" />
          <span>Donation Tracking & Receipts</span>
        </div>
        <div className="flex items-center gap-2 p-3 border rounded-lg">
          <CheckCircle className="h-5 w-5 text-green-600" />
          <span>Financial Reports</span>
        </div>
      </div>

      <Button onClick={onNext} className="w-full">
        Finish Setup
      </Button>
    </div>
  );
}

function CompleteStep({ onFinish }: { onFinish: () => void }) {
  return (
    <div className="text-center space-y-6">
      <CheckCircle className="h-16 w-16 text-green-600 mx-auto" />
      <div>
        <h3 className="text-2xl font-bold mb-2">You're All Set!</h3>
        <p className="text-muted-foreground">
          Your church management system is ready to use.
        </p>
      </div>

      <Button onClick={onFinish} size="lg" className="w-full">
        Go to Dashboard
      </Button>
    </div>
  );
}
```

---

## Testing Strategy

### Unit Tests
- [ ] LicenseFeatureService grants plan features
- [ ] LicenseFeatureService checks feature access
- [ ] OnboardingService saves step progress
- [ ] OnboardingService completes onboarding

### Integration Tests
- [ ] Grant features after payment
- [ ] Onboarding wizard saves progress
- [ ] Onboarding completion redirects to admin
- [ ] Feature checks work correctly

### Manual Testing
1. Register new tenant
2. Complete payment
3. Verify default roles created
4. Verify features granted
5. Complete onboarding wizard
6. Verify redirect to admin dashboard
7. Check feature access in UI

---

## Epic Completion Checklist

- [ ] Feature grants database tables migrated
- [ ] LicenseFeatureService implemented
- [ ] OnboardingService implemented
- [ ] Feature grant API endpoints
- [ ] Onboarding wizard UI
- [ ] Progress saving functionality
- [ ] Default RBAC roles seeded on registration
- [ ] Features granted after payment
- [ ] Onboarding completion flow
- [ ] Documentation complete

---

## Next Epics (Lower Priority)

After completing the P0 epics (1-4), the remaining epics can be implemented in any order based on business priorities:

- Epic 5: Member & Account Management
- Epic 6: Church Finance Module
- Epic 7: SaaS Admin Dashboard (nice to have)
- Epic 8: Reporting Suite
- Epic 9: Delegation & Admin Features
