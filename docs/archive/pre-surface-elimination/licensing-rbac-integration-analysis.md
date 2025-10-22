# Licensing and RBAC System Integration Analysis

**Date:** 2025-10-20
**System:** StewardTrack Church Management SaaS
**Version:** Analysis for Integration Phase 1

---

## Executive Summary

This analysis examines the current state of the Licensing Studio and RBAC systems to identify integration gaps and opportunities for automatic deployment of permissions to tenant administrators. The analysis reveals a sophisticated but disconnected architecture where features, permissions, and surface bindings exist but lack automated provisioning workflows.

**Key Finding:** The infrastructure for permission-based feature gating exists, but the automatic deployment mechanism from Licensing Studio to tenant RBAC configurations is missing.

---

## 1. Current System Architecture

### 1.1 Licensing Studio Component Architecture

**Location:** `/admin/licensing` (src/components/admin/licensing/)

**Key Components:**
- **LicensingStudio.tsx**: Main dashboard with 5 tabs
  - Product Offerings
  - Features (feature_catalog management)
  - Feature Bundles (license_feature_bundles)
  - License Assignments (manual tenant provisioning)
  - Analytics

**Data Model:**
```
feature_catalog (system-wide features)
  ├── id (uuid)
  ├── code (text, unique)
  ├── name, description, category
  ├── surface_id (text) - NEW COLUMN (added 20251219091001)
  ├── surface_type (text) - NEW COLUMN
  ├── module (text) - NEW COLUMN
  ├── phase (text)
  ├── is_delegatable (boolean)
  └── is_active (boolean)

license_feature_bundles (groupings of features)
  ├── id (uuid)
  ├── code (text, unique)
  ├── name, description
  ├── bundle_type (core|add-on|module|custom)
  ├── category (text)
  └── is_active, is_system, sort_order

license_feature_bundle_items (many-to-many)
  ├── bundle_id → license_feature_bundles
  ├── feature_id → feature_catalog
  ├── is_required (boolean)
  └── display_order (integer)

product_offerings (pricing tiers)
  ├── id (uuid)
  ├── code (text)
  ├── name, tier (starter|professional|enterprise)
  └── offering_type (subscription|trial|custom)

product_offering_bundles (many-to-many)
  ├── offering_id → product_offerings
  ├── bundle_id → license_feature_bundles
  ├── is_required (boolean)
  └── display_order (integer)

tenant_feature_grants (active tenant licenses)
  ├── tenant_id → tenants
  ├── feature_id → feature_catalog
  ├── grant_source (package|direct|trial|comp)
  ├── starts_at, expires_at
  └── package_id (optional)
```

**Workflow:**
1. Product Owner creates features in Licensing Studio
2. Features are organized into bundles
3. Bundles are associated with product offerings
4. Offerings are assigned to tenants (manual or at registration)
5. **MISSING:** Automatic permission deployment to tenant RBAC

---

### 1.2 RBAC System Component Architecture

**Location:** `/admin/security/rbac` (src/components/admin/rbac/)

**Key Components:**
- **RbacDashboard**: Command center overview
- **RoleExplorer**: Browse roles/bundles/permissions
- **BundleComposer**: Permission bundle creation wizard
- **SurfaceBindingManager**: Map surfaces to roles/permissions
- **MetadataPublishingDashboard**: Deployment and compilation controls

**Data Model:**
```
permissions (tenant-scoped RBAC permissions)
  ├── id (uuid)
  ├── tenant_id → tenants
  ├── code (text)
  ├── module, resource, action
  ├── description
  └── scope (tenant|campus|ministry|global)

roles (tenant-scoped or system roles)
  ├── id (uuid)
  ├── tenant_id (nullable for system roles)
  ├── code (text)
  ├── name, description
  ├── scope (tenant|campus|ministry|global|system)
  ├── metadata_key (text) - for surface binding
  ├── is_delegatable, is_system
  └── is_active

permission_bundles (reusable permission groups)
  ├── id (uuid)
  ├── tenant_id → tenants
  ├── code (text)
  ├── name, description
  ├── scope (tenant|campus|ministry|global)
  ├── metadata_key (text)
  └── category

permission_bundle_permissions (many-to-many)
  ├── bundle_id → permission_bundles
  └── permission_id → permissions

role_permissions (many-to-many)
  ├── role_id → roles
  └── permission_id → permissions

role_bundles (many-to-many)
  ├── role_id → roles
  └── bundle_id → permission_bundles

user_roles (user role assignments)
  ├── user_id → auth.users
  ├── role_id → roles
  ├── tenant_id → tenants
  └── assigned_at

metadata_surfaces (blueprint registry)
  ├── id (text, primary key)
  ├── module, route, blueprint_path
  ├── surface_type (page|dashboard|wizard|manager|console|audit|overlay)
  ├── phase (foundation|role-management|surface-binding|delegated|operations|legacy)
  ├── feature_code (text) - links to feature_catalog
  ├── rbac_role_keys (text[])
  ├── rbac_bundle_keys (text[])
  ├── required_license_bundle_id → license_feature_bundles
  ├── required_features (text[])
  └── license_tier_min (starter|professional|enterprise)

rbac_surface_bindings (role/bundle → surface mappings)
  ├── tenant_id → tenants
  ├── role_id → roles (nullable)
  ├── bundle_id → permission_bundles (nullable)
  ├── menu_item_id (nullable)
  ├── metadata_blueprint_id → metadata_surfaces
  ├── required_license_bundle_id → license_feature_bundles
  ├── enforces_license (boolean)
  ├── required_feature_code (text)
  └── is_active
```

**Workflow:**
1. Tenant Admin creates custom roles
2. Roles are assigned permission bundles
3. Surface bindings link roles to metadata surfaces
4. Publishing dashboard compiles and deploys changes
5. **MISSING:** Initial seeding from licensed features

---

### 1.3 Feature Permission System (NEW - Partially Implemented)

**Location:** src/services/FeaturePermissionService.ts

**Purpose:** Bridge licensing features to RBAC permissions

**Data Model:**
```
feature_permissions (permissions defined for features)
  ├── id (uuid)
  ├── feature_id → feature_catalog
  ├── permission_code (text, unique)
  ├── display_name, description
  ├── is_required (boolean)
  └── display_order (integer)

permission_role_templates (default role assignments)
  ├── id (uuid)
  ├── feature_permission_id → feature_permissions
  ├── role_key (text) - maps to roles.metadata_key
  ├── is_recommended (boolean)
  └── reason (text)
```

**Wizard Flow (FeaturePermissionWizard):**
1. **BasicInfoStep**: Feature name, tier, category
2. **SurfaceAssociationStep**: Link to metadata surface
3. **PermissionDefinitionStep**: Define permission codes
4. **RoleTemplateStep**: Assign default roles per permission
5. **ReviewStep**: Create feature with permissions + templates

**Current Status:**
- ✅ Wizard UI implemented
- ✅ Service layer for CRUD operations
- ✅ Role template storage
- ❌ **NOT CONNECTED to tenant provisioning**
- ❌ **NO deployment workflow when license assigned**

---

## 2. Current Data Flows

### 2.1 Tenant Registration Flow (WORKING)

**File:** `src/app/api/auth/register/route.ts`

```
1. User signs up with email/password + church info + offering selection
   ↓
2. Create Supabase auth user
   ↓
3. Get product offering details (to determine tier)
   ↓
4. Create tenant record with subdomain + tier
   ↓
5. Create user profile
   ↓
6. Create tenant_users junction
   ↓
7. Provision license features (LicensingService.provisionTenantLicense)
   - Calls get_offering_all_features() database function
   - Grants features to tenant via tenant_feature_grants
   ↓
8. Seed default RBAC roles (seedDefaultRBAC)
   - Creates 4 roles: tenant_admin, staff, volunteer, member
   - NO PERMISSIONS assigned yet!
   ↓
9. Assign tenant_admin role to user
   ↓
10. Return success
```

**Gap Identified:**
- Step 7 grants features but does NOT create corresponding permissions
- Step 8 creates roles but does NOT link them to any permissions
- **Result:** Tenant has licensed features but tenant_admin has no actual permissions

---

### 2.2 Feature Creation Flow (WORKING)

**File:** `src/app/api/licensing/features/route.ts`

```
POST /api/licensing/features
  ↓
1. Super admin creates feature in feature_catalog
   - Includes surface_id, surface_type, module
   - Feature is system-wide (not tenant-specific)
   ↓
2. Feature stored but NOT deployed to any tenant
   ↓
3. Optional: Define permissions via /api/licensing/features/[id]/permissions
   - Creates feature_permissions records
   - Creates permission_role_templates
   ↓
4. **MISSING:** No automatic deployment to tenants with this feature
```

**Gap Identified:**
- Features are created centrally but never materialized as tenant permissions
- Role templates exist but are never instantiated for actual tenant roles

---

### 2.3 License Assignment Flow (WORKING BUT INCOMPLETE)

**File:** `src/services/LicensingService.ts` → `assignLicenseToTenant()`

```
Manual License Assignment (Licensing Studio UI):
  ↓
1. Product Owner selects tenant + offering
   ↓
2. Create license_assignments record (audit trail)
   ↓
3. Call get_feature_change_summary() to preview changes
   ↓
4. Grant/revoke features in tenant_feature_grants
   ↓
5. **MISSING:** No RBAC permission sync triggered
   ↓
6. Tenant gains access to features but no UI surfaces work
   (because metadata_surfaces check feature_code, which IS granted)
   (but rbac_surface_bindings check permissions, which are NOT granted)
```

**Gap Identified:**
- Features granted, but permissions not created
- Tenant administrator must manually create permissions and bind them
- No automation between licensing and RBAC layers

---

### 2.4 Surface Access Check Flow (PARTIALLY WORKING)

**Database Functions:**
- `can_access_metadata_surface(surface_id, user_id, tenant_id)`
- `can_access_surface(user_id, tenant_id, surface_id)` (licensing-aware)

**Check Logic:**
```
1. Check feature_code on metadata_surface
   ↓
   If feature_code exists:
     → Check tenant_feature_grants (via tenant_has_feature)
     → If NOT granted: DENY ACCESS
   ↓
2. Check rbac_role_keys / rbac_bundle_keys on metadata_surface
   ↓
   If keys exist:
     → Check user_roles → get_user_role_metadata_keys()
     → If user's roles match keys: GRANT ACCESS
     → Else: DENY ACCESS
   ↓
3. Check rbac_surface_bindings
   ↓
   If binding exists for surface:
     → Check user has assigned role/bundle
     → Check enforces_license flag
     → If enforces_license:
       → Check required_license_bundle_id granted
     → All checks pass: GRANT ACCESS
   ↓
4. Default: GRANT ACCESS (if no restrictions)
```

**Current Result:**
- Feature licensing checks work (tenant_feature_grants)
- RBAC checks FAIL because no permissions/roles bound to surfaces
- Surfaces protected by feature_code only are accessible
- Surfaces requiring RBAC fail (most admin surfaces)

---

## 3. Integration Gaps

### 3.1 Primary Gap: Missing Permission Deployment Pipeline

**Current State:**
- Licensing Studio: Defines features + permissions centrally
- RBAC System: Manages tenant-specific permissions + roles
- **NO CONNECTION between the two**

**What's Missing:**
1. **Automatic Permission Creation**: When a tenant is granted a feature, create corresponding permissions in the tenant's `permissions` table
2. **Role Template Instantiation**: Apply permission_role_templates to actual tenant roles
3. **Surface Binding Generation**: Create rbac_surface_bindings based on feature surface_id
4. **Deployment Trigger**: Hook into license assignment to trigger permission sync

---

### 3.2 Secondary Gaps

#### 3.2.1 Metadata Surface Registration
**Issue:** metadata_surfaces table has entries for RBAC UI but not for all features
**Impact:** Features with surface_id can't be bound to surfaces that don't exist
**Solution:** Register metadata_surfaces when creating features OR auto-register during deployment

#### 3.2.2 Role Template Key Mapping
**Issue:** permission_role_templates use `role_key` (text) but must map to actual tenant `roles.id` (uuid)
**Current Mapping:** Uses `roles.metadata_key` column (text) for matching
**Risk:** If metadata_key is null or doesn't match, mapping fails
**Solution:** Ensure seedDefaultRBAC sets metadata_key for all roles

#### 3.2.3 Default Role Permissions
**Issue:** Tenant registration creates 4 roles with ZERO permissions
**Impact:** tenant_admin role has no actual access to anything
**Solution:** During provisioning, assign default permissions based on tier

#### 3.2.4 Bundle-Level vs Permission-Level Grants
**Issue:** Licensing works at feature-bundle level, RBAC works at permission level
**Mismatch:** One feature = multiple permissions, but grants are per-feature
**Solution:** Feature deployment must expand to all feature_permissions

---

### 3.3 Data Inconsistencies

#### 3.3.1 Duplicate Feature Definitions
**Location:** Two parallel systems:
- `feature_catalog` (licensing) - system-wide features
- `metadata_surfaces` (RBAC) - surface definitions

**Duplication:** Both have `feature_code` but serve different purposes
- feature_catalog: Entitlement gating (what tenant has licensed)
- metadata_surfaces: UI surface registration (what blueprints exist)

**Issue:** Some features only in feature_catalog, some only in metadata_surfaces
**Example:** RBAC surfaces (admin-security/*) defined in metadata_surfaces with feature_code

#### 3.3.2 Redundant License Tables
**Status:** Cleaned up in migration 20250931000010_rbac_surface_license_overhaul.sql
- OLD: `licenses`, `license_features` (removed)
- NEW: `feature_catalog`, `tenant_feature_grants`
**Note:** Migration successful, old tables dropped

#### 3.3.3 Surface Binding Complexity
**Issue:** rbac_surface_bindings has 3 nullable columns for relationships:
- role_id (nullable)
- bundle_id (nullable)
- menu_item_id (nullable)
- metadata_blueprint_id (nullable)

**At least one must be set, creating complex validation**
**Complication:** Adds license enforcement via:
- required_license_bundle_id
- enforces_license flag
- required_feature_code

**Result:** 3-way check (RBAC + licensing + surface) makes debugging difficult

---

## 4. Current vs Desired State

### 4.1 Current State Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                     LICENSING STUDIO                            │
│                     (System-Wide)                               │
│                                                                 │
│  ┌──────────────┐      ┌─────────────────┐                     │
│  │   Features   │─────▶│ Feature Bundles │                     │
│  │  (Catalog)   │      │                 │                     │
│  └──────────────┘      └─────────────────┘                     │
│         │                      │                                │
│         │                      │                                │
│         ▼                      ▼                                │
│  ┌─────────────────────────────────────┐                       │
│  │   Product Offerings (Tiers)         │                       │
│  └─────────────────────────────────────┘                       │
│                    │                                            │
└────────────────────┼────────────────────────────────────────────┘
                     │
                     │ Manual Assignment
                     │ (LicensingService.assignLicenseToTenant)
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│                  TENANT LICENSE GRANTS                          │
│              (tenant_feature_grants table)                      │
│                                                                 │
│  ✅ Tenant has feature entitlement                              │
│  ❌ NO permissions created in tenant RBAC                       │
│  ❌ NO surface bindings created                                 │
│  ❌ tenant_admin has no actual access                           │
└─────────────────────────────────────────────────────────────────┘

                     ❌ MISSING INTEGRATION

┌─────────────────────────────────────────────────────────────────┐
│                        RBAC SYSTEM                              │
│                      (Per-Tenant)                               │
│                                                                 │
│  ┌──────────────┐      ┌─────────────────┐                     │
│  │    Roles     │─────▶│   Permissions   │                     │
│  │  (4 default) │      │   (EMPTY!)      │                     │
│  └──────────────┘      └─────────────────┘                     │
│         │                      │                                │
│         │                      │                                │
│         ▼                      ▼                                │
│  ┌─────────────────────────────────────┐                       │
│  │   Surface Bindings (NONE CREATED)   │                       │
│  └─────────────────────────────────────┘                       │
│                                                                 │
│  Result: tenant_admin role exists but has NO permissions!      │
└─────────────────────────────────────────────────────────────────┘
```

---

### 4.2 Desired State Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                     LICENSING STUDIO                            │
│                     (System-Wide)                               │
│                                                                 │
│  ┌──────────────┐      ┌─────────────────┐                     │
│  │   Features   │─────▶│ Feature Bundles │                     │
│  │ + Permissions│      │                 │                     │
│  │ + Templates  │      └─────────────────┘                     │
│  └──────────────┘              │                                │
│         │                      │                                │
│         ▼                      ▼                                │
│  ┌─────────────────────────────────────┐                       │
│  │   Product Offerings (Tiers)         │                       │
│  └─────────────────────────────────────┘                       │
│                    │                                            │
└────────────────────┼────────────────────────────────────────────┘
                     │
                     │ Assignment (Manual or Auto)
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│               ✅ DEPLOYMENT PIPELINE (NEW)                       │
│                                                                 │
│  Step 1: Grant features (tenant_feature_grants)  ✅ DONE       │
│  Step 2: Deploy permissions per feature          ⭐ NEW        │
│  Step 3: Apply role templates                    ⭐ NEW        │
│  Step 4: Create surface bindings                 ⭐ NEW        │
│  Step 5: Publish metadata changes                ⭐ NEW        │
└─────────────────────────────────────────────────────────────────┘
                     │
                     │ Auto-provisioning
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│                        RBAC SYSTEM                              │
│                      (Per-Tenant)                               │
│                                                                 │
│  ┌──────────────┐      ┌─────────────────┐                     │
│  │    Roles     │─────▶│   Permissions   │  ✅ Populated!      │
│  │ (4 default + │      │ (from templates)│                     │
│  │  feature     │      └─────────────────┘                     │
│  │  roles)      │              │                                │
│  └──────────────┘              │                                │
│         │                      │                                │
│         │                      ▼                                │
│         │        ┌─────────────────────────────────┐            │
│         └───────▶│   Surface Bindings (AUTO)       │            │
│                  │   (from surface_id mappings)    │            │
│                  └─────────────────────────────────┘            │
│                                                                 │
│  Result: tenant_admin has full access based on licensed tier!  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 5. Opportunities for Simplification

### 5.1 Consolidate Feature Definitions

**Current:**
- `feature_catalog.feature_code` (licensing entitlement)
- `metadata_surfaces.feature_code` (surface gating)
- Both checked independently

**Simplified:**
- Single source of truth: `feature_catalog`
- `metadata_surfaces.feature_code` always references `feature_catalog.code`
- Foreign key constraint to ensure consistency

**Impact:** Eliminates confusion about which table is authoritative

---

### 5.2 Simplify Surface Binding Model

**Current:** Requires understanding 3 nullable columns + license enforcement

**Simplified Approach:**
```
rbac_surface_bindings (simplified):
  ├── tenant_id (required)
  ├── surface_id → metadata_surfaces (required)
  ├── role_id → roles (required, no more nullable)
  ├── grants_access (boolean, default true)
  └── is_active (boolean)

Remove:
  - bundle_id (derive from role_bundles)
  - menu_item_id (surfaces should reference menus, not vice versa)
  - required_license_bundle_id (check at metadata_surface level)
  - enforces_license (always enforce based on surface.feature_code)
```

**Rationale:**
- License checks happen at surface level (via feature_code)
- RBAC checks happen at binding level (via role_id)
- Clear separation of concerns

---

### 5.3 Remove Redundant License Tracking

**Current:** Multiple overlapping tables track license assignments:
- `tenant_feature_grants` (active grants)
- `license_assignments` (audit log of assignments)
- `product_offering_bundles` (what's in each offering)
- `license_feature_bundle_items` (what's in each bundle)

**Simplified:**
- Keep `tenant_feature_grants` as source of truth for active grants
- Keep `license_assignments` for audit only
- Flatten product offerings: Direct feature → offering mapping (no bundles)
- OR keep bundles but remove dual-level hierarchy

**Alternative:** Use bundles consistently:
- Tenants are granted bundles (not individual features)
- tenant_feature_grants expands to all features in granted bundles (computed)

---

### 5.4 Unified Metadata Surface Registry

**Current:** Surfaces defined in multiple places:
- Seeded in migration (admin-security/* surfaces)
- Potentially registered via `register_metadata_surface()` function
- Created manually by product owners

**Simplified:**
- Product Owner creates feature with surface_id
- System automatically registers metadata_surface entry
- Blueprint compilation validates surface exists

**Benefit:** No orphaned surface references, automatic surface catalog

---

## 6. Recommended Implementation Plan

### Phase 1: Foundation (Permission Deployment Pipeline)

**Goal:** Enable automatic permission deployment when licenses are assigned

**Tasks:**
1. ✅ Add surface columns to feature_catalog (DONE: migration 20251219091001)
2. Create `PermissionDeploymentService`:
   - `deployFeaturePermissions(tenantId, featureId)`: Create tenant permissions
   - `applyRoleTemplates(tenantId, permissionId)`: Assign to roles
   - `createSurfaceBindings(tenantId, featureId)`: Generate bindings
3. Hook into `LicensingService.provisionTenantLicense()`:
   - After granting features, call deployment service
4. Hook into `LicensingService.assignLicenseToTenant()`:
   - After license change, sync permissions (add/remove)
5. Update `seedDefaultRBAC()`:
   - Set metadata_key for all default roles
   - Pre-populate based on tier (starter, professional, enterprise)

**Files to Modify:**
- `src/services/LicensingService.ts` (add deployment hooks)
- `src/lib/tenant/seedDefaultRBAC.ts` (add metadata_key, tier-based permissions)
- NEW: `src/services/PermissionDeploymentService.ts`
- NEW: `src/repositories/permissionDeployment.repository.ts`

**Database Changes:**
- Ensure all default roles have metadata_key set
- Create indexes on frequently joined columns

---

### Phase 2: UI Enhancements (Tenant Admin Experience)

**Goal:** Allow tenant admins to see their licensed features and granted permissions

**Tasks:**
1. Create "My Licensed Features" dashboard in tenant admin:
   - Show active tenant_feature_grants
   - Show which permissions are deployed
   - Show which roles have access
2. Add "Permission Status" indicator to feature cards:
   - ✅ Deployed to tenant_admin
   - ⚠️ Partially deployed
   - ❌ Not deployed (manual setup required)
3. Add "Deploy Permissions" button to licensing studio:
   - Manual trigger for permission sync
   - Shows diff of what will be created/updated/removed

**Files to Create:**
- `src/components/admin/licensing/TenantFeatureDashboard.tsx`
- `src/components/admin/licensing/PermissionDeploymentStatus.tsx`
- `src/app/api/licensing/deploy-permissions/route.ts`

---

### Phase 3: Publishing Integration

**Goal:** Integrate permission deployment with RBAC publishing system

**Tasks:**
1. Add permission deployment to publishing queue:
   - Track deployment jobs in `rbac_publishing_jobs`
   - Show status in MetadataPublishingDashboard
2. Create "Sync License Permissions" job type:
   - Queued when license assignments change
   - Runs deployment service in background
3. Add tenant-level deployment status:
   - Track last successful deployment timestamp
   - Alert if out of sync (features granted but not deployed)

**Files to Modify:**
- `src/services/RbacPublishingService.ts` (add deployment job types)
- `src/components/admin/rbac/MetadataPublishingDashboard.tsx` (show license sync status)
- `src/repositories/publishing.repository.ts` (add deployment job queries)

---

### Phase 4: Data Cleanup and Simplification

**Goal:** Remove redundant data and simplify architecture

**Tasks:**
1. Audit all metadata_surfaces:
   - Ensure feature_code references valid feature_catalog.code
   - Add foreign key constraint
2. Simplify rbac_surface_bindings:
   - Consider removing nullable columns (bundle_id, menu_item_id)
   - Enforce role_id required constraint
3. Consolidate license bundle hierarchy:
   - Decide: Keep bundle-level or flatten to feature-level?
   - Update UI to reflect chosen model
4. Create data integrity checks:
   - Validate surface_id on features maps to existing surfaces
   - Check permission_role_templates reference valid metadata_keys

**Database Migrations:**
- Add foreign key: feature_catalog.surface_id → metadata_surfaces.id
- Add foreign key: metadata_surfaces.feature_code → feature_catalog.code
- Simplify rbac_surface_bindings (based on decision)

---

## 7. Technical Specifications

### 7.1 Proposed: PermissionDeploymentService

**File:** `src/services/PermissionDeploymentService.ts`

**Interface:**
```typescript
interface PermissionDeploymentService {
  // Deploy all permissions for a granted feature to a tenant
  deployFeaturePermissions(tenantId: string, featureId: string): Promise<DeploymentResult>;

  // Remove permissions when feature is revoked
  revokeFeaturePermissions(tenantId: string, featureId: string): Promise<void>;

  // Sync permissions after license change (add/remove/update)
  syncTenantPermissions(tenantId: string): Promise<SyncResult>;

  // Check if feature permissions are deployed and current
  checkDeploymentStatus(tenantId: string, featureId: string): Promise<DeploymentStatus>;
}

interface DeploymentResult {
  success: boolean;
  permissionsCreated: number;
  roleAssignmentsCreated: number;
  surfaceBindingsCreated: number;
  errors: string[];
}

interface SyncResult {
  featuresAdded: string[];
  featuresRemoved: string[];
  permissionsCreated: number;
  permissionsRemoved: number;
  errors: string[];
}

interface DeploymentStatus {
  isDeployed: boolean;
  lastDeployedAt: Date | null;
  permissionsCount: number;
  outOfSync: boolean;
  missingPermissions: string[];
}
```

---

### 7.2 Deployment Algorithm

**deployFeaturePermissions(tenantId, featureId)**

```typescript
1. Verify tenant has feature grant:
   - SELECT FROM tenant_feature_grants
     WHERE tenant_id = ? AND feature_id = ?
   - If NOT found: throw error "Feature not licensed"

2. Get feature permissions:
   - SELECT FROM feature_permissions
     WHERE feature_id = ?
   - If empty: return (nothing to deploy)

3. Get feature surface_id:
   - SELECT surface_id FROM feature_catalog WHERE id = ?

4. For each feature_permission:
   a. Create tenant permission:
      - INSERT INTO permissions (tenant_id, code, module, resource, action, ...)
      - Use permission_code as code
      - Parse module/resource/action from permission_code

   b. Get role templates:
      - SELECT FROM permission_role_templates
        WHERE feature_permission_id = permission.id

   c. For each role_template:
      - Find tenant role by metadata_key:
        SELECT id FROM roles
        WHERE tenant_id = ? AND metadata_key = role_template.role_key

      - Assign permission to role:
        INSERT INTO role_permissions (role_id, permission_id)
        ON CONFLICT DO NOTHING

5. If feature has surface_id:
   a. Ensure metadata_surface exists:
      - SELECT FROM metadata_surfaces WHERE id = feature.surface_id
      - If NOT exists: create basic entry

   b. For each role that has any permission from this feature:
      - CREATE rbac_surface_binding:
        INSERT INTO rbac_surface_bindings (
          tenant_id, role_id, metadata_blueprint_id,
          required_feature_code, is_active
        )
        VALUES (tenant_id, role_id, surface_id, feature.code, true)
        ON CONFLICT DO NOTHING

6. Log deployment:
   - INSERT INTO permission_deployment_log (
       tenant_id, feature_id, deployed_at,
       permissions_created, roles_updated
     )

7. Return DeploymentResult
```

---

### 7.3 Registration Flow Enhancement

**Modified:** `src/app/api/auth/register/route.ts`

**Change after Step 7 (Provision license features):**

```typescript
// STEP 7: Provision license features
await licensingService.provisionTenantLicense(tenantId, offeringId);

// NEW STEP 7.5: Deploy permissions for granted features
const permissionDeploymentService = container.get<PermissionDeploymentService>(
  TYPES.PermissionDeploymentService
);

try {
  const syncResult = await permissionDeploymentService.syncTenantPermissions(tenantId);
  console.log(`Deployed ${syncResult.permissionsCreated} permissions for tenant ${tenantId}`);

  if (syncResult.errors.length > 0) {
    console.warn('Permission deployment warnings:', syncResult.errors);
  }
} catch (error) {
  console.error('Failed to deploy permissions during registration:', error);
  // Non-fatal: Continue registration, tenant admin can sync later
}
```

---

### 7.4 License Assignment Enhancement

**Modified:** `src/services/LicensingService.ts`

**Change in assignLicenseToTenant():**

```typescript
async assignLicenseToTenant(
  tenantId: string,
  offeringId: string,
  assignedBy: string,
  notes?: string
): Promise<AssignmentResult> {
  // ... existing code ...

  const result = await this.licenseAssignmentRepository.assignLicenseToTenant(data);

  // NEW: Trigger permission deployment
  try {
    const { container } = await import('@/lib/container');
    const { TYPES } = await import('@/lib/types');
    const permissionDeploymentService = container.get<PermissionDeploymentService>(
      TYPES.PermissionDeploymentService
    );

    const syncResult = await permissionDeploymentService.syncTenantPermissions(tenantId);

    // Add sync results to assignment result
    result.permissionsSynced = syncResult.permissionsCreated;
    result.permissionsRemoved = syncResult.permissionsRemoved;
  } catch (error) {
    console.error('Failed to sync permissions after license assignment:', error);
    result.warnings = result.warnings || [];
    result.warnings.push('Permission sync failed - manual sync required');
  }

  return result;
}
```

---

## 8. Migration Strategy

### 8.1 Backward Compatibility

**Concern:** Existing tenants may have custom permissions configured

**Strategy:**
1. **Non-Destructive Deployment:** Never delete existing permissions
2. **Additive Only:** Only add new permissions for newly granted features
3. **Conflict Resolution:** If permission code already exists:
   - Check if it matches template (same module/resource/action)
   - If match: Skip (already configured)
   - If different: Log warning, use existing (respect customization)
4. **Opt-In Resync:** Provide "Reset to Default" button in tenant admin UI

---

### 8.2 Data Backfill

**For Existing Tenants (Post-Deployment):**

1. Create migration script: `backfill_tenant_permissions.ts`
2. For each tenant with active tenant_feature_grants:
   - Call `syncTenantPermissions()`
   - Log results to CSV for review
3. Manual review of any conflicts
4. Product Owner notifies tenants of new auto-provisioned permissions

---

### 8.3 Testing Strategy

**Unit Tests:**
- Test deployFeaturePermissions with various feature configurations
- Test role template matching (metadata_key resolution)
- Test conflict resolution (duplicate permission codes)

**Integration Tests:**
- Test full registration flow (signup → grant features → deploy permissions)
- Test license assignment flow (change offering → sync permissions)
- Test permission revocation (downgrade tier → remove permissions)

**Manual Testing Checklist:**
- [ ] Register new tenant with Essential offering
- [ ] Verify tenant_admin has Essential feature permissions
- [ ] Upgrade tenant to Professional offering via Licensing Studio
- [ ] Verify additional permissions deployed
- [ ] Check surface bindings created for new features
- [ ] Verify user can access Professional-tier surfaces
- [ ] Downgrade tenant to Essential
- [ ] Verify Professional permissions removed (or flagged as inactive)

---

## 9. Key Risks and Mitigations

### Risk 1: Permission Conflicts
**Risk:** Tenant has custom permission with same code as template
**Mitigation:** Use ON CONFLICT DO NOTHING, log conflict, preserve custom

### Risk 2: Role Template Mismatch
**Risk:** permission_role_templates reference role_keys that don't exist
**Mitigation:** Validation in FeaturePermissionService, ensure seedDefaultRBAC sets keys

### Risk 3: Performance Impact
**Risk:** Deploying 100+ permissions for complex offerings is slow
**Mitigation:** Use batch inserts, run in background job, show progress indicator

### Risk 4: Missing Surface Definitions
**Risk:** feature.surface_id references non-existent metadata_surface
**Mitigation:** Auto-register placeholder surface, warn Product Owner in UI

### Risk 5: Circular Dependencies
**Risk:** LicensingService depends on PermissionDeploymentService depends on RbacService
**Mitigation:** Use dependency injection properly, avoid circular imports

---

## 10. Success Criteria

### Phase 1 Success:
- [ ] New tenant registration automatically deploys permissions based on selected offering
- [ ] tenant_admin role has full access to all licensed features
- [ ] All Essential-tier surfaces accessible out-of-box
- [ ] Manual license assignment in Licensing Studio triggers permission sync
- [ ] Tenant dashboard shows "Permissions Deployed" status for each feature

### Phase 2 Success:
- [ ] Tenant admins can view licensed features in admin UI
- [ ] "Deploy Permissions" button works for manual sync
- [ ] Permission deployment logs visible in audit trail
- [ ] Feature permission wizard end-to-end functional

### Phase 3 Success:
- [ ] Permission deployment integrated into RBAC publishing dashboard
- [ ] Background jobs handle large permission sets
- [ ] Out-of-sync alerts visible when licenses updated but permissions not deployed

### Phase 4 Success:
- [ ] All feature_catalog.surface_id references valid metadata_surfaces
- [ ] Foreign key constraints enforce data integrity
- [ ] No orphaned permissions or surface bindings
- [ ] 90% reduction in "Why don't I have access?" support tickets

---

## 11. Appendix: Current Service Inventory

### Licensing Services:
- **LicensingService**: Product offerings, bundles, surface bindings, tenant provisioning
- **LicenseFeatureService**: (exists, not yet reviewed)
- **LicenseValidationService**: (referenced, needs review)
- **LicenseMonitoringService**: (referenced, needs review)

### RBAC Services:
- **RbacCoreService**: Role/permission/bundle CRUD, user role assignments
- **RbacMetadataService**: Surface binding management, metadata surface CRUD
- **RbacPublishingService**: Metadata compilation, publishing jobs, license validation jobs
- **RbacAuditService**: Audit log operations
- **RbacDelegationService**: Delegation workflows
- **RbacFeatureService**: Feature flag grants (rbacFeature.service.ts)
- **RbacStatisticsService**: Stats and analytics
- **RbacRegistryService**: (exists, not reviewed)

### Feature Permission Services:
- **FeaturePermissionService**: Permission definition, role template management, bulk operations
- **PermissionValidationService**: Permission code validation, format checks
- **FeatureCatalogRepository**: Feature CRUD operations

### Missing Services:
- ❌ **PermissionDeploymentService** (PROPOSED)
- ❌ **SurfaceRegistrationService** (OPTIONAL - auto-register surfaces)
- ❌ **LicenseSyncService** (OPTIONAL - dedicated sync orchestration)

---

## 12. Conclusion

The StewardTrack licensing and RBAC systems have robust foundations but lack the critical integration layer needed for automatic permission deployment. The primary gap is the absence of a deployment pipeline that translates licensed features into tenant-specific RBAC permissions and surface bindings.

**Key Takeaways:**

1. **Infrastructure Exists:** All necessary tables, services, and UI components are in place
2. **Missing Link:** No automation between licensing grants and RBAC deployment
3. **Impact:** Tenants receive features but can't access them until manual RBAC configuration
4. **Solution Complexity:** Medium - requires new service, hooks, and background jobs
5. **Data Quality:** Some cleanup needed (surface registration, foreign keys) but no major overhaul
6. **Backward Compatibility:** Can be achieved with non-destructive deployment strategy

**Recommended Next Steps:**

1. **Immediate:** Implement Phase 1 (PermissionDeploymentService + registration hooks)
2. **Short-term:** Add tenant-facing permission deployment status UI (Phase 2)
3. **Medium-term:** Integrate with publishing system for background processing (Phase 3)
4. **Long-term:** Data cleanup and architecture simplification (Phase 4)

With this implementation, tenant administrators will receive fully-configured RBAC permissions automatically upon license assignment, dramatically improving the onboarding experience and reducing support burden.

---

**Document Version:** 1.0
**Last Updated:** 2025-10-20
**Next Review:** After Phase 1 Implementation
