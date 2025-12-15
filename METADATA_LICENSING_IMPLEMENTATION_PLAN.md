# Metadata-Driven Licensing Feature Implementation Plan

## Overview

This document provides step-by-step instructions to complete the integration of licensing features with metadata pages in StewardTrack. The goal is to ensure that license features are automatically seeded from metadata XML files and properly gate access to features.

## Problem Statement

Currently, 6 license features are hardcoded in the database but are NOT mapped to any metadata pages. New tenants receive these features in their license bundles, but the features don't actually gate any functionality because:

1. Metadata XML files don't declare which feature they belong to
2. Features are seeded independently from metadata (hardcoded in migrations)
3. The metadata evaluation system doesn't enforce feature-level access control

## Solution Architecture

### Phase 1: Metadata Schema & Compiler ✅ COMPLETED

**Status:** All compiler changes are complete.

**Changes Made:**
- Added `featureCode` attribute to XSD schema
- Updated `CanonicalDefinition` and `ManifestEntry` types
- Modified XML transformer to extract `featureCode`
- Updated publisher to include `featureCode` in manifest

### Phase 2: Annotate Metadata XML Files

**Task:** Add `featureCode` attribute to all existing metadata blueprints.

**Feature Code Mapping:**

Based on the 6 existing seed features and metadata structure:

| Module | Route Pattern | Feature Code | Description |
|--------|--------------|--------------|-------------|
| `admin-community` | `members/*` | `member-management` | Member lifecycle management |
| `admin-settings` | `*` | `core-foundation` | Core platform settings |
| `marketing` | `*` | `core-foundation` | Public marketing pages |

**Example Implementation:**

**Before:**
```xml
<PageDefinition kind="blueprint" module="admin-community" route="members/dashboard"
  schemaVersion="1.0.0" contentVersion="1.0.0">
```

**After:**
```xml
<PageDefinition kind="blueprint" module="admin-community" route="members/dashboard"
  schemaVersion="1.0.0" contentVersion="1.0.0"
  featureCode="member-management">
```

**Files to Update:**

1. **Member Management Features:**
   - `metadata/authoring/blueprints/admin-community/membership-dashboard.xml` → `member-management`
   - `metadata/authoring/blueprints/admin-community/membership-lookup-create.xml` → `member-management`
   - `metadata/authoring/blueprints/admin-community/membership-manage.xml` → `member-management`
   - `metadata/authoring/blueprints/admin-community/membership-profile.xml` → `member-management`

2. **Core Foundation Features:**
   - `metadata/authoring/blueprints/admin-settings/settings-overview.xml` → `core-foundation`
   - `metadata/authoring/blueprints/marketing/home.xml` → `core-foundation`

3. **UI Blocks (Optional):**
   - All `metadata/authoring/blueprints/ui-blocks/*.xml` → `core-foundation` (these are reusable components)

### Phase 3: Create Metadata-Driven Feature Seeding Migration

**File:** `supabase/migrations/YYYYMMDDHHMMSS_seed_features_from_metadata.sql`

**Purpose:** Replace hardcoded feature seeding with metadata-driven approach.

**Implementation:**

```sql
-- =====================================================
-- Metadata-Driven Feature Seeding Migration
-- Auto-generates feature_catalog entries from compiled metadata
-- =====================================================

BEGIN;

-- Step 1: Clear existing legacy features (optional - only if starting fresh)
-- TRUNCATE TABLE feature_catalog CASCADE;

-- Step 2: Create temporary function to extract unique feature codes from metadata registry
CREATE OR REPLACE FUNCTION extract_metadata_features()
RETURNS TABLE (
  code text,
  name text,
  category text,
  description text
) AS $$
DECLARE
  manifest_data jsonb;
  entry jsonb;
  feature_code text;
  module_name text;
BEGIN
  -- Read the manifest.json file (this would typically be done via application code)
  -- For now, we'll manually insert based on known metadata structure

  -- This is a placeholder - in production, you'd either:
  -- 1. Parse metadata/registry/manifest.json directly (if accessible from SQL)
  -- 2. OR create a Node.js script that reads manifest and generates INSERT statements
  -- 3. OR use application code to seed features during deployment

  RETURN QUERY
  SELECT
    'member-management'::text as code,
    'Member Management'::text as name,
    'members'::text as category,
    'Complete member lifecycle management and family relationships'::text as description
  UNION ALL
  SELECT
    'core-foundation'::text,
    'Core Foundation'::text,
    'core'::text,
    'Essential platform features required for all deployments'::text;
END;
$$ LANGUAGE plpgsql;

-- Step 3: Insert features from metadata
INSERT INTO feature_catalog (code, name, category, description, phase, is_active)
SELECT
  code,
  name,
  category,
  description,
  'ga'::text as phase,
  true as is_active
FROM extract_metadata_features()
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  description = EXCLUDED.description,
  updated_at = NOW();

-- Step 4: Map features to bundles
-- Core Foundation bundle
INSERT INTO license_feature_bundle_items (bundle_id, feature_id, is_required, display_order)
SELECT
  lfb.id,
  fc.id,
  true,
  1
FROM license_feature_bundles lfb
CROSS JOIN feature_catalog fc
WHERE lfb.code = 'core-foundation'
  AND fc.code = 'core-foundation'
ON CONFLICT (bundle_id, feature_id) DO NOTHING;

-- Member Management bundle
INSERT INTO license_feature_bundle_items (bundle_id, feature_id, is_required, display_order)
SELECT
  lfb.id,
  fc.id,
  true,
  1
FROM license_feature_bundles lfb
CROSS JOIN feature_catalog fc
WHERE lfb.code = 'member-management'
  AND fc.code = 'member-management'
ON CONFLICT (bundle_id, feature_id) DO NOTHING;

-- Clean up
DROP FUNCTION IF EXISTS extract_metadata_features();

COMMIT;

-- =====================================================
-- IMPORTANT: This migration is a starting point
-- The RECOMMENDED approach is to create a Node.js script:
-- tools/metadata/seedFeatures.ts
-- =====================================================

COMMENT ON TABLE feature_catalog IS
'Feature catalog entries are now driven by metadata featureCode attributes.
To add new features, annotate metadata XML files with featureCode and run metadata:compile.';
```

**Better Approach - Create Node.js Seeder Script:**

Create `tools/metadata/seedFeatures.ts`:

```typescript
import { promises as fs } from 'fs';
import path from 'path';
import { getSupabaseServerClient } from '@/lib/supabase/server';

interface ManifestEntry {
  featureCode?: string | null;
  layer: {
    module: string;
    route: string;
  };
}

interface ManifestFile {
  entries: Record<string, ManifestEntry>;
}

async function seedFeaturesFromMetadata() {
  // Read manifest
  const manifestPath = path.join(process.cwd(), 'metadata', 'registry', 'manifest.json');
  const manifestContent = await fs.readFile(manifestPath, 'utf-8');
  const manifest: ManifestFile = JSON.parse(manifestContent);

  // Extract unique feature codes
  const features = new Map<string, { module: string; routes: string[] }>();

  for (const [key, entry] of Object.entries(manifest.entries)) {
    if (entry.featureCode && entry.featureCode !== 'core-foundation') {
      if (!features.has(entry.featureCode)) {
        features.set(entry.featureCode, {
          module: entry.layer.module,
          routes: []
        });
      }
      features.get(entry.featureCode)!.routes.push(entry.layer.route);
    }
  }

  // Insert into feature_catalog
  const supabase = getSupabaseServerClient();

  for (const [code, data] of features) {
    const name = code.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    const category = data.module.replace('admin-', '');

    await supabase.from('feature_catalog').upsert({
      code,
      name,
      category,
      description: `Metadata-driven feature for ${data.module} module (${data.routes.length} routes)`,
      phase: 'ga',
      is_active: true
    }, {
      onConflict: 'code'
    });
  }

  console.log(`Seeded ${features.size} features from metadata`);
}

seedFeaturesFromMetadata().catch(console.error);
```

**Add NPM script to `package.json`:**

```json
{
  "scripts": {
    "metadata:seed-features": "tsx tools/metadata/seedFeatures.ts"
  }
}
```

### Phase 4: Update Metadata Evaluation for Feature Gating

**File:** `src/lib/metadata/evaluation.ts`

**Current State:** The evaluation context already has `licenseFeatures` array, but it's not enforced at the page level.

**Changes Needed:**

Add a new function to check feature access before evaluating metadata:

```typescript
// Add to src/lib/metadata/evaluation.ts

/**
 * Check if user has access to a metadata page based on license features
 *
 * @param featureCode - The feature code from metadata
 * @param context - Evaluation context with license features
 * @returns true if user has access, false otherwise
 */
export function hasFeatureAccess(
  featureCode: string | null | undefined,
  context: MetadataEvaluationContext
): boolean {
  // No feature code means public/unrestricted access
  if (!featureCode) {
    return true;
  }

  // Core foundation features are always accessible
  if (featureCode === 'core-foundation') {
    return true;
  }

  // Check if tenant has the required feature
  const licenseFeatures = context.licenseFeatures ?? [];
  return licenseFeatures.includes(featureCode);
}
```

**Update resolver to check feature access:**

File: `src/lib/metadata/resolver.ts`

```typescript
// Add this check in the resolve function after loading the definition

import { hasFeatureAccess } from './evaluation';

export async function resolveMetadata(
  module: string,
  route: string,
  context: MetadataEvaluationContext
): Promise<CanonicalDefinition | null> {
  const definition = await loadDefinition(module, route, context);

  if (!definition) {
    return null;
  }

  // NEW: Check feature access
  if (!hasFeatureAccess(definition.featureCode, context)) {
    console.warn(
      `Access denied to ${module}/${route}: Feature ${definition.featureCode} not in license`
    );
    return null;
  }

  return definition;
}
```

### Phase 5: Update Metadata Interpreter for Graceful Degradation

**File:** `src/lib/metadata/interpreter.tsx`

**Purpose:** Show an upgrade prompt when feature is not available instead of blank page.

```typescript
// Add to interpreter.tsx

import { hasFeatureAccess } from './evaluation';

export function MetadataPage({ definition, context }: MetadataPageProps) {
  // Check feature access
  if (!hasFeatureAccess(definition.featureCode, context)) {
    return (
      <FeatureUpgradePrompt
        featureName={definition.page.title || 'This Feature'}
        featureCode={definition.featureCode}
      />
    );
  }

  // Normal rendering
  return <>{/* existing rendering logic */}</>;
}

function FeatureUpgradePrompt({ featureName, featureCode }: {
  featureName: string;
  featureCode: string | null | undefined;
}) {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="max-w-md p-8 bg-white rounded-lg shadow-lg">
        <h2 className="text-2xl font-bold mb-4">Upgrade Required</h2>
        <p className="text-gray-600 mb-6">
          {featureName} requires the <strong>{featureCode}</strong> feature.
          Upgrade your plan to access this functionality.
        </p>
        <button className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
          View Upgrade Options
        </button>
      </div>
    </div>
  );
}
```

### Phase 6: Deployment Workflow

**Step-by-Step Deployment:**

1. **Compile Metadata:**
   ```bash
   npm run metadata:compile
   ```

2. **Seed Features (Choose one approach):**

   **Option A - Application Script (RECOMMENDED):**
   ```bash
   npm run metadata:seed-features
   ```

   **Option B - SQL Migration:**
   ```bash
   npx supabase db push
   ```

3. **Test Feature Gating:**
   - Create a test tenant with limited license
   - Verify they CANNOT access gated features
   - Verify they CAN access core-foundation features

4. **Grant Features to Existing Tenants:**
   ```sql
   -- Grant member-management feature to all existing tenants
   INSERT INTO tenant_feature_grants (tenant_id, feature_id, grant_source, granted_by)
   SELECT
     t.id,
     fc.id,
     'migration',
     'system'
   FROM tenants t
   CROSS JOIN feature_catalog fc
   WHERE fc.code = 'member-management'
   ON CONFLICT DO NOTHING;
   ```

## Testing Checklist

- [ ] Metadata compiles successfully with featureCode attributes
- [ ] Feature catalog is populated from metadata
- [ ] License bundles map to features correctly
- [ ] New tenant receives correct features based on plan
- [ ] Feature gating blocks access to unlicensed features
- [ ] Upgrade prompt displays when feature is not available
- [ ] Core foundation features are always accessible
- [ ] Existing tenants retain access to all features

## Future Enhancements

1. **Dynamic Feature Discovery:**
   - Automatically detect new features from metadata changes
   - Auto-update feature catalog on metadata compilation

2. **Feature Analytics:**
   - Track feature usage by tenant
   - Identify upgrade opportunities based on attempted access

3. **Granular Feature Flags:**
   - Component-level feature gating
   - A/B testing with feature flags

4. **Self-Service License Management:**
   - Allow tenants to upgrade plans
   - Trial periods for premium features

## References

- **Metadata Architecture:** See `CLAUDE.md` (Metadata System section)
- **Licensing Architecture:** See `docs/architecture/LICENSING_ARCHITECTURE.md`
- **RBAC Integration:** See `docs/architecture/rbac-architecture-plan.md`
- **Feature Catalog Schema:** See `supabase/migrations/20250931000010_rbac_surface_license_overhaul.sql:244-257`

## Appendix A: Feature Code Naming Convention

**Format:** `{category}-{noun}`

**Examples:**
- `member-management` (not `members` or `manage-members`)
- `financial-management` (not `finance` or `financials`)
- `rbac-security` (not `rbac` or `security`)
- `core-foundation` (not `core` or `base`)

**Rules:**
- Use kebab-case (lowercase with hyphens)
- Be descriptive but concise (2-3 words max)
- Avoid abbreviations unless widely known
- Group related features with same prefix

## Appendix B: Migration Rollback Plan

If issues arise, rollback steps:

1. **Remove feature gating from interpreter:**
   ```typescript
   // Comment out the feature check
   // if (!hasFeatureAccess(definition.featureCode, context)) { ... }
   ```

2. **Revert to hardcoded features:**
   ```sql
   -- Re-run original feature seeding migration
   ```

3. **Remove featureCode from XML:**
   ```bash
   # Git revert the metadata XML changes
   git revert HEAD
   npm run metadata:compile
   ```

## Status Summary

| Phase | Status | Completion |
|-------|--------|------------|
| Phase 1: Schema & Compiler | ✅ Complete | 100% |
| Phase 2: Annotate XML | 🔄 In Progress | 0% |
| Phase 3: Seeding Migration | 🔄 Pending | 0% |
| Phase 4: Evaluation Guards | 🔄 Pending | 0% |
| Phase 5: UI Interpreter | 🔄 Pending | 0% |
| Phase 6: Deployment | 🔄 Pending | 0% |

**Estimated Time Remaining:** 4-6 hours

**Next Immediate Step:** Annotate all metadata XML files with appropriate `featureCode` attributes (Phase 2).
