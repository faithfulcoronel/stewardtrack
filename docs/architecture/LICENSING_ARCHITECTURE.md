# Licensing Architecture Documentation

## Overview

This document describes the current state of the StewardTrack licensing system architecture, including what exists, what's missing, and the intended design patterns.

**Last Updated**: 2025-10-05
**Status**: Current implementation uses direct feature associations; bundle-to-offering associations not yet implemented

---

## Table of Contents

1. [Current Architecture](#current-architecture)
2. [Database Schema](#database-schema)
3. [Data Flow](#data-flow)
4. [Missing Components](#missing-components)
5. [Intended Design](#intended-design)
6. [Implementation Status](#implementation-status)

---

## Current Architecture

### High-Level Overview

```
┌─────────────────────┐
│ Product Offerings   │ (SKUs like "Starter", "Pro", "Enterprise")
└──────────┬──────────┘
           │
           │ product_offering_features (many-to-many)
           │
           ▼
┌─────────────────────┐
│  Feature Catalog    │ (Individual features like "member_create", "reports_view")
└─────────────────────┘
           ▲
           │ license_feature_bundle_items (many-to-many)
           │
┌──────────┴──────────┐
│ Feature Bundles     │ (Logical groupings like "Member Management", "Financial Tools")
└─────────────────────┘
```

**Key Point**: Product Offerings currently link **directly to individual features**, not to bundles. Bundles are organizational tools without direct offering association.

---

## Database Schema

### Core Tables

#### 1. `product_offerings`
**Purpose**: Define product SKUs (Starter, Professional, Enterprise plans)

**Location**: `supabase/migrations/20251218001008_create_product_offerings.sql` (lines 7-28)

**Key Fields**:
```sql
id uuid PRIMARY KEY
code text UNIQUE                    -- e.g., "starter-monthly"
name text                          -- e.g., "Starter Plan"
offering_type text                 -- 'subscription', 'one-time', 'add-on'
tier text                          -- 'starter', 'professional', 'enterprise'
billing_cycle text                 -- 'monthly', 'yearly'
base_price numeric(10,2)
currency text DEFAULT 'USD'
max_users integer
max_tenants integer
is_active boolean DEFAULT true
```

**Usage**: Defines what customers can purchase.

---

#### 2. `product_offering_features`
**Purpose**: Links product offerings to individual features

**Location**: `supabase/migrations/20251218001008_create_product_offerings.sql` (lines 32-39)

**Schema**:
```sql
CREATE TABLE product_offering_features (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  offering_id uuid NOT NULL REFERENCES product_offerings(id) ON DELETE CASCADE,
  feature_id uuid NOT NULL REFERENCES feature_catalog(id) ON DELETE CASCADE,
  is_required boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  UNIQUE (offering_id, feature_id)
);
```

**Current State**: ✅ **Fully Implemented**

**Usage**: When a tenant subscribes to "Professional Plan", they get all features in this table where `offering_id = professional_plan_id`.

---

#### 3. `license_feature_bundles`
**Purpose**: Group related features into reusable bundles

**Location**: `supabase/migrations/20251218001009_create_license_feature_bundles.sql` (lines 7-23)

**Key Fields**:
```sql
id uuid PRIMARY KEY
code text UNIQUE                    -- e.g., "member-management"
name text                          -- e.g., "Member Management"
bundle_type text                   -- 'core', 'add-on', 'module', 'custom'
category text DEFAULT 'general'    -- 'members', 'finance', 'rbac', etc.
is_active boolean DEFAULT true
is_system boolean DEFAULT false    -- System bundles can't be deleted
```

**Current State**: ✅ **Fully Implemented**

**Usage**: Organizational tool for grouping features. Example: "Member Management" bundle contains features like `member_create`, `member_edit`, `member_delete`.

---

#### 4. `license_feature_bundle_items`
**Purpose**: Links bundles to individual features

**Location**: `supabase/migrations/20251218001009_create_license_feature_bundles.sql` (lines 26-34)

**Schema**:
```sql
CREATE TABLE license_feature_bundle_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bundle_id uuid NOT NULL REFERENCES license_feature_bundles(id) ON DELETE CASCADE,
  feature_id uuid NOT NULL REFERENCES feature_catalog(id) ON DELETE CASCADE,
  is_required boolean DEFAULT true,
  display_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  UNIQUE (bundle_id, feature_id)
);
```

**Current State**: ✅ **Fully Implemented**

**Usage**: Defines which features belong to each bundle.

---

#### 5. `product_offering_bundles` ❌
**Purpose**: Would link product offerings to bundles

**Current State**: ❌ **DOES NOT EXIST**

**Intended Schema**:
```sql
-- THIS TABLE IS MISSING
CREATE TABLE product_offering_bundles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  offering_id uuid NOT NULL REFERENCES product_offerings(id) ON DELETE CASCADE,
  bundle_id uuid NOT NULL REFERENCES license_feature_bundles(id) ON DELETE CASCADE,
  is_required boolean DEFAULT true,
  display_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  UNIQUE (offering_id, bundle_id)
);
```

**Why It's Needed**: Would allow assigning entire bundles to offerings instead of individual features.

---

#### 6. `feature_catalog`
**Purpose**: Master list of all available features in the system

**Location**: `supabase/migrations/20250931000010_rbac_surface_license_overhaul.sql` (lines 244-258)

**Key Fields**:
```sql
id uuid PRIMARY KEY
code text UNIQUE                    -- e.g., "member_create", "reports_view"
name text                          -- e.g., "Create Members", "View Reports"
category text DEFAULT 'core'       -- 'members', 'finance', 'rbac', 'reports'
phase text DEFAULT 'ga'            -- 'alpha', 'beta', 'ga' (general availability)
is_delegatable boolean DEFAULT false
is_active boolean DEFAULT true
```

**Current State**: ✅ **Fully Implemented**

**Usage**: Central registry of all system capabilities.

---

## Data Flow

### Current Implementation: Direct Feature Association

#### When Creating a Product Offering:

```typescript
// 1. Create the offering
const offering = await licensingService.createProductOffering({
  code: 'professional-monthly',
  name: 'Professional Plan',
  tier: 'professional',
  base_price: 49.99,
  // ... other fields
});

// 2. Add individual features (current approach)
await licensingService.addFeatureToOffering(offering.id, {
  feature_id: 'uuid-of-member-create-feature',
  is_required: true
});

await licensingService.addFeatureToOffering(offering.id, {
  feature_id: 'uuid-of-member-edit-feature',
  is_required: true
});
// ... repeat for each feature
```

#### When Provisioning a License:

**File**: `src/services/LicensingService.ts` (lines 317-359)

```typescript
async provisionTenantLicense(tenantId: string, offeringId: string) {
  // 1. Get offering with its features
  const offering = await this.getProductOfferingWithFeatures(offeringId);

  // 2. Grant each feature individually to the tenant
  for (const feature of offering.features) {
    await this.grantFeatureToTenant(tenantId, feature.id);
  }

  // 3. Create subscription record
  await this.createTenantSubscription(tenantId, offeringId);
}
```

**Result**: Tenant gets individual feature grants in `tenant_feature_grants` table.

---

### Intended Design: Bundle-Based Association

#### How It Should Work (Not Yet Implemented):

```typescript
// 1. Create the offering
const offering = await licensingService.createProductOffering({
  code: 'professional-monthly',
  name: 'Professional Plan',
  tier: 'professional',
  base_price: 49.99,
});

// 2. Assign entire bundles (intended approach - NOT IMPLEMENTED)
await licensingService.addBundleToOffering(offering.id, {
  bundle_id: 'uuid-of-member-management-bundle',
  is_required: true
});

await licensingService.addBundleToOffering(offering.id, {
  bundle_id: 'uuid-of-financial-tools-bundle',
  is_required: true
});

// 3. Optionally add individual features for customization
await licensingService.addFeatureToOffering(offering.id, {
  feature_id: 'uuid-of-special-feature',
  is_required: false
});
```

#### Provisioning with Bundles (Intended):

```typescript
async provisionTenantLicense(tenantId: string, offeringId: string) {
  // 1. Get offering with bundles
  const offering = await this.getProductOfferingWithBundles(offeringId);

  // 2. For each bundle, get its features
  for (const bundle of offering.bundles) {
    const bundleFeatures = await this.getBundleFeatures(bundle.id);

    // 3. Grant all bundle features to tenant
    for (const feature of bundleFeatures) {
      await this.grantFeatureToTenant(tenantId, feature.id);
    }
  }

  // 4. Also grant any individual features directly attached
  for (const feature of offering.features) {
    await this.grantFeatureToTenant(tenantId, feature.id);
  }
}
```

---

## Missing Components

### Database Layer

❌ **Table**: `product_offering_bundles`
- Would create many-to-many relationship between offerings and bundles
- Needs migration file

### Data Models

❌ **TypeScript Interfaces** in `src/models/productOffering.model.ts`:
```typescript
// These do NOT exist yet
export interface ProductOfferingBundle {
  id: string;
  offering_id: string;
  bundle_id: string;
  is_required: boolean;
  display_order: number;
  created_at: string;
}

export interface ProductOfferingWithBundles extends ProductOffering {
  bundles?: Array<{
    id: string;
    code: string;
    name: string;
    bundle_type: string;
    category: string;
    is_required: boolean;
    feature_count: number;
  }>;
}

export interface AssignBundleToOfferingDto {
  bundle_id: string;
  is_required?: boolean;
  display_order?: number;
}
```

### Adapter Layer

❌ **Methods** in `src/adapters/productOffering.adapter.ts`:
```typescript
// These methods do NOT exist
async addBundleToOffering(
  offeringId: string,
  bundleId: string,
  isRequired: boolean,
  displayOrder?: number
): Promise<void>

async removeBundleFromOffering(
  offeringId: string,
  bundleId: string
): Promise<void>

async getOfferingBundles(
  offeringId: string
): Promise<Array<BundleInfo>>

async getOfferingWithBundles(
  offeringId: string
): Promise<ProductOfferingWithBundles>

async expandBundlesToFeatures(
  offeringId: string
): Promise<Array<FeatureInfo>>
```

### Service Layer

❌ **Methods** in `src/services/LicensingService.ts`:
```typescript
// These methods do NOT exist
async addBundleToOffering(
  offeringId: string,
  dto: AssignBundleToOfferingDto
): Promise<void>

async removeBundleFromOffering(
  offeringId: string,
  bundleId: string
): Promise<void>

async getOfferingBundles(
  offeringId: string
): Promise<Array<BundleWithFeatures>>

async getProductOfferingWithBundles(
  offeringId: string
): Promise<ProductOfferingWithBundles>
```

### API Layer

❌ **Endpoints** (these routes do NOT exist):
- `POST /api/licensing/product-offerings/[id]/bundles` - Assign bundle to offering
- `DELETE /api/licensing/product-offerings/[id]/bundles/[bundleId]` - Remove bundle
- `GET /api/licensing/product-offerings/[id]/bundles` - List offering's bundles

### UI Layer

❌ **Components**:
- No bundle selection UI in `CreateOfferingDialog.tsx`
- No bundle selection UI in `EditOfferingDialog.tsx`
- No "Bundles" tab/section in `ProductOfferingsManager.tsx`

---

## Intended Design

### Design Philosophy

The licensing system is intended to support **three modes of feature assignment**:

#### 1. Bundle-Based (Intended - Not Implemented)
- Assign pre-defined bundles to offerings
- **Benefits**: Reusability, maintainability, consistency
- **Use Case**: Standard tiers that use common feature sets
- **Example**: "Professional Plan" = Member Management Bundle + Financial Tools Bundle

#### 2. Individual Features (Currently Implemented)
- Add features one-by-one to offerings
- **Benefits**: Complete customization, à la carte
- **Use Case**: Custom offerings, special client needs
- **Example**: "Custom Enterprise" with hand-picked features

#### 3. Hybrid (Intended - Not Implemented)
- Mix bundles + individual features
- **Benefits**: Flexibility with efficiency
- **Use Case**: Standard plan with custom additions
- **Example**: "Professional+" = Professional Plan bundles + Advanced Reporting feature

### Architecture Goals

1. **Reusability**: Define bundles once, use in multiple offerings
2. **Maintainability**: Update bundle → all offerings get updated features
3. **Flexibility**: Support bundle-based, individual, or hybrid approaches
4. **Auditability**: Track what features came from bundles vs direct assignment
5. **Performance**: Efficient feature resolution during license provisioning

---

## Implementation Status

### ✅ What Works Today

| Component | Status | Notes |
|-----------|--------|-------|
| Product Offerings table | ✅ Complete | Can create/edit offerings |
| Feature Catalog | ✅ Complete | Central feature registry |
| Feature Bundles table | ✅ Complete | Can create/edit bundles |
| Bundle → Feature mapping | ✅ Complete | Bundles contain features |
| Offering → Feature mapping | ✅ Complete | Offerings contain individual features |
| License provisioning | ✅ Works | Grants features from offerings to tenants |
| UI for Offerings | ✅ Complete | Create/edit offerings |
| UI for Bundles | ✅ Complete | Create/edit bundles with feature selection |
| UI for Bundle Features | ✅ Complete | Select features when creating bundles |

### ❌ What's Missing

| Component | Status | Impact |
|-----------|--------|--------|
| Offering → Bundle mapping | ❌ Missing | Can't assign bundles to offerings |
| `product_offering_bundles` table | ❌ Missing | No database support |
| Bundle selection UI in Offering dialogs | ❌ Missing | No way to assign bundles via UI |
| Service methods for bundle operations | ❌ Missing | No business logic |
| API endpoints for bundle associations | ❌ Missing | No API support |

### Current Workaround

**Today**: You must add features individually to each offering, even if those features are grouped in bundles elsewhere. Bundles are purely organizational and don't affect offering configuration.

**To create "Professional Plan" today**:
1. Go to Product Offerings
2. Click "Create Offering"
3. Manually add each feature one-by-one
4. Save

**Intended approach** (not available):
1. Go to Product Offerings
2. Click "Create Offering"
3. Select "Member Management" bundle
4. Select "Financial Tools" bundle
5. Optionally add individual features
6. Save (all bundle features automatically included)

---

## Migration Comment Evidence

**File**: `supabase/migrations/20251218001009_create_license_feature_bundles.sql`
**Line 74**:

```sql
COMMENT ON TABLE license_feature_bundles IS 'Reusable groupings of features that can be assigned to product offerings.';
```

This comment clearly indicates the **design intent**: bundles should be assignable to product offerings. However, this functionality is **not yet implemented**.

---

## Conclusion

### Summary

- ✅ **Feature Bundles exist** and work as organizational tools
- ✅ **Product Offerings exist** and can be assigned individual features
- ❌ **Bundle-to-Offering association does NOT exist**
- ❌ **UI for bundle assignment is missing**
- 📝 **Design intent** suggests this was planned but not completed

### Current State

The system uses a **direct feature association model**:
- Offerings → Individual Features ✅
- Bundles → Individual Features ✅
- Offerings → Bundles ❌

### To Implement Full Bundle Support

You would need to:
1. Create `product_offering_bundles` migration
2. Add TypeScript interfaces for bundle associations
3. Implement adapter methods
4. Add service methods
5. Create API endpoints
6. Build UI for bundle selection in offering dialogs
7. Update license provisioning logic to expand bundles

**Estimated Complexity**: Medium-High (full stack change from DB to UI)

---

**Document Version**: 1.0
**Author**: Claude AI
**Date**: 2025-10-05
