# StewardTrack Licensing & RBAC Architecture

**Last Updated:** December 19, 2025
**Migration:** `20251219091025_drop_legacy_licensing_tables.sql`

This document provides a comprehensive overview of the Product Offering, Feature Management, and RBAC table architecture in StewardTrack.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Product Offering Layer](#product-offering-layer)
3. [Feature Catalog Layer](#feature-catalog-layer)
4. [Tenant Feature Grants Layer](#tenant-feature-grants-layer)
5. [RBAC Permission Layer](#rbac-permission-layer)
6. [Key Relationships & Data Flow](#key-relationships--data-flow)
7. [Access Control Flow](#access-control-flow)
8. [Database Schema Reference](#database-schema-reference)

---

## Architecture Overview

The StewardTrack licensing and RBAC system uses a **four-layer architecture**:

```
┌─────────────────────────────────────────────────────────────────┐
│                    PRODUCT OFFERING LAYER                        │
│  (What products we sell and what features they include)          │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                    FEATURE CATALOG LAYER                         │
│  (All available features and their permission requirements)      │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                 TENANT FEATURE GRANTS LAYER                      │
│  (What features each tenant has access to)                       │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                    RBAC PERMISSION LAYER                         │
│  (What users can do within the features they have access to)     │
└─────────────────────────────────────────────────────────────────┘
```

---

## Product Offering Layer

**Purpose:** Define purchasable products (SKUs) and the features they include.

### Tables

#### `product_offerings`
Catalog of purchasable product SKUs with pricing and tier information.

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key |
| `code` | text | Unique product code (e.g., `stewardtrack-professional-monthly`) |
| `name` | text | Display name |
| `description` | text | Product description |
| `offering_type` | text | `subscription`, `one-time`, `trial`, `enterprise` |
| `tier` | text | `starter`, `professional`, `enterprise`, `custom` |
| `billing_cycle` | text | `monthly`, `annual`, `lifetime`, `null` |
| `base_price` | decimal(10,2) | Price in specified currency |
| `currency` | text | Currency code (default: `USD`) |
| `max_users` | integer | Maximum users allowed (null = unlimited) |
| `max_tenants` | integer | Maximum tenants (default: 1) |
| `is_active` | boolean | Whether offering is currently available |
| `is_featured` | boolean | Featured on pricing page |
| `sort_order` | integer | Display order |
| `metadata` | jsonb | Additional configuration |

**Example:**
```sql
{
  code: 'stewardtrack-professional-monthly',
  name: 'StewardTrack Professional (Monthly)',
  offering_type: 'subscription',
  tier: 'professional',
  billing_cycle: 'monthly',
  base_price: 99.00,
  max_users: 250
}
```

#### `product_offering_features`
Direct feature assignments to product offerings (many-to-many).

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key |
| `offering_id` | uuid | FK → `product_offerings.id` |
| `feature_id` | uuid | FK → `feature_catalog.id` |
| `is_required` | boolean | Whether feature is required for offering |

**Constraint:** `UNIQUE (offering_id, feature_id)`

#### `product_offering_bundles`
Bundle assignments to product offerings (many-to-many).

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key |
| `offering_id` | uuid | FK → `product_offerings.id` |
| `bundle_id` | uuid | FK → `license_feature_bundles.id` |
| `is_required` | boolean | Whether bundle is required |
| `display_order` | integer | Display order for UI |

**Constraint:** `UNIQUE (offering_id, bundle_id)`

**Database Function:**
```sql
get_offering_all_features(p_offering_id uuid)
-- Returns all features from both direct assignments and bundles
```

---

## Feature Catalog Layer

**Purpose:** Define all available features, their groupings, and permission requirements.

### Tables

#### `feature_catalog`
Master catalog of all available features in the platform.

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key |
| `code` | text | Unique feature code (e.g., `members_dashboard`) |
| `name` | text | Display name |
| `category` | text | Category: `core`, `members`, `finance`, `rbac`, etc. |
| `description` | text | Feature description |
| `phase` | text | Development phase: `ga`, `beta`, `alpha`, `deprecated` |
| `is_delegatable` | boolean | Can be delegated to scoped users |
| `is_active` | boolean | Currently available |
| `surface` | text | UI surface reference (for metadata integration) |
| `tier` | text | Minimum license tier required |

**Constraint:** `UNIQUE (code)`

**Example:**
```sql
{
  code: 'advanced_reporting',
  name: 'Advanced Reporting',
  category: 'reports',
  phase: 'ga',
  is_delegatable: true,
  is_active: true,
  surface: 'reports/advanced',
  tier: 'professional'
}
```

#### `feature_permissions`
Required permissions for each feature (fine-grained access control).

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key |
| `feature_id` | uuid | FK → `feature_catalog.id` |
| `permission_code` | text | Permission code: `{category}:{action}` |
| `display_name` | text | Human-readable name |
| `description` | text | Permission description |
| `category` | text | Category from permission code |
| `action` | text | Action from permission code |
| `is_required` | boolean | Whether permission is required for feature |
| `display_order` | integer | Display order in UI |

**Constraints:**
- `UNIQUE (feature_id, permission_code)`
- `CHECK (permission_code ~ '^[a-z_]+:[a-z_]+$')` (format validation)

**Example:**
```sql
{
  feature_id: '<advanced_reporting_feature_id>',
  permission_code: 'reports:advanced',
  display_name: 'Access Advanced Reports',
  category: 'reports',
  action: 'advanced',
  is_required: true
}
```

#### `license_feature_bundles`
Reusable groupings of features (for licensing management, **NOT RBAC**).

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key |
| `code` | text | Unique bundle code |
| `name` | text | Display name |
| `description` | text | Bundle description |
| `bundle_type` | text | `core`, `add-on`, `module`, `custom` |
| `category` | text | Functional category |
| `is_active` | boolean | Currently available |
| `is_system` | boolean | System bundle (cannot be deleted by tenants) |
| `sort_order` | integer | Display order |
| `metadata` | jsonb | Additional configuration |

**Constraint:** `UNIQUE (code)`

**Example:**
```sql
{
  code: 'rbac-security',
  name: 'RBAC & Security',
  bundle_type: 'module',
  category: 'rbac',
  is_system: true
}
```

#### `license_feature_bundle_items`
Maps features to bundles (many-to-many).

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key |
| `bundle_id` | uuid | FK → `license_feature_bundles.id` |
| `feature_id` | uuid | FK → `feature_catalog.id` |
| `is_required` | boolean | Whether feature is required in bundle |
| `display_order` | integer | Display order within bundle |

**Constraint:** `UNIQUE (bundle_id, feature_id)`

---

## Tenant Feature Grants Layer

**Purpose:** Track which features each tenant has access to and how they were granted.

### Tables

#### `tenant_feature_grants`
Active feature access per tenant.

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key |
| `tenant_id` | uuid | FK → `tenants.id` |
| `feature_id` | uuid | FK → `feature_catalog.id` |
| `grant_source` | text | `direct`, `trial`, `comp` (legacy: `package`) |
| `package_id` | uuid | DEPRECATED: Previously FK → `feature_packages.id` |
| `source_reference` | text | Reference to granting source |
| `starts_at` | date | Grant start date |
| `expires_at` | date | Expiration date (null = no expiration) |
| `created_by` | uuid | User who granted access |
| `updated_by` | uuid | User who last updated |

**Constraint:** `UNIQUE (tenant_id, feature_id, grant_source, COALESCE(package_id, '00000000-...'), COALESCE(source_reference, ''))`

**Grant Sources:**
- `direct` - Granted via product offering assignment
- `trial` - Trial period grant
- `comp` - Complimentary grant
- `package` - (DEPRECATED) Legacy feature package grant

**Example:**
```sql
{
  tenant_id: '<tenant_uuid>',
  feature_id: '<advanced_reporting_uuid>',
  grant_source: 'direct',
  starts_at: '2025-01-01',
  expires_at: null
}
```

#### `license_assignments`
History of product offering assignments to tenants.

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key |
| `tenant_id` | uuid | FK → `tenants.id` |
| `offering_id` | uuid | FK → `product_offerings.id` |
| `previous_offering_id` | uuid | Previous offering (for upgrades/downgrades) |
| `assigned_by` | uuid | User who assigned the license |
| `notes` | text | Assignment notes |
| `created_at` | timestamptz | Assignment timestamp |

**Database Function:**
```sql
assign_license_to_tenant(
  p_tenant_id uuid,
  p_offering_id uuid,
  p_assigned_by uuid,
  p_notes text DEFAULT NULL
)
-- Assigns offering, manages feature grants, tracks history
```

---

## RBAC Permission Layer

**Purpose:** Define granular permissions and assign them to roles (user-level access control).

### Tables

#### `roles`
Role definitions per tenant.

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key |
| `tenant_id` | uuid | FK → `tenants.id` (null for system roles) |
| `name` | text | Role name |
| `description` | text | Role description |
| `scope` | text | `system`, `tenant`, `campus`, `ministry` |
| `metadata_key` | text | Reference to metadata definition |
| `is_system` | boolean | System role (cannot be deleted) |
| `is_delegatable` | boolean | Can be delegated to scoped users |
| `is_active` | boolean | Currently active |

**Constraint:** `UNIQUE (tenant_id, name)`

**Example:**
```sql
{
  tenant_id: '<tenant_uuid>',
  name: 'Finance Manager',
  scope: 'tenant',
  is_delegatable: true,
  is_active: true
}
```

#### `permissions`
Granular permission definitions per tenant.

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key |
| `tenant_id` | uuid | FK → `tenants.id` (null for system permissions) |
| `code` | text | Permission code: `{module}:{action}` |
| `name` | text | Display name |
| `description` | text | Permission description |
| `module` | text | Module/category |
| `action` | text | Action type |
| `scope` | text | `system`, `tenant`, `delegated` |

**Constraint:** `UNIQUE (tenant_id, code)`

**Example:**
```sql
{
  tenant_id: '<tenant_uuid>',
  code: 'finance:write',
  name: 'Write Financial Records',
  module: 'finance',
  action: 'write',
  scope: 'tenant'
}
```

#### `role_permissions`
Direct permission assignment to roles (**NO BUNDLES**).

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key |
| `tenant_id` | uuid | FK → `tenants.id` |
| `role_id` | uuid | FK → `roles.id` |
| `permission_id` | uuid | FK → `permissions.id` |

**Constraint:** `UNIQUE (tenant_id, role_id, permission_id)`

**Important:** The RBAC system uses **direct role → permission mapping**. There are NO permission bundles in RBAC (bundles only exist in the licensing layer).

#### `user_roles`
User to role assignments (many-to-many, supports multiple roles per user).

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key |
| `tenant_id` | uuid | FK → `tenants.id` |
| `user_id` | uuid | FK → `auth.users.id` |
| `role_id` | uuid | FK → `roles.id` |

**Constraint:** `UNIQUE (tenant_id, user_id, role_id)`

---

## Key Relationships & Data Flow

### Product Offering Assignment Flow

```
┌────────────────────┐
│ Product Offering   │
│ (Professional)     │
└────────┬───────────┘
         │
         ├─────────────────────────────────┐
         │                                 │
         ↓                                 ↓
┌────────────────────┐          ┌──────────────────────┐
│ Direct Features    │          │ Feature Bundles      │
│ (via offering_     │          │ (via offering_       │
│  features)         │          │  bundles)            │
└────────┬───────────┘          └──────────┬───────────┘
         │                                 │
         └─────────────┬───────────────────┘
                       │
                       ↓
              ┌────────────────────┐
              │ Feature Catalog    │
              │ (All Features)     │
              └────────┬───────────┘
                       │
                       ↓
              ┌────────────────────┐
              │ Tenant Feature     │
              │ Grants             │
              │ (grant_source:     │
              │  'direct')         │
              └────────────────────┘
```

### Registration Flow

**Step-by-step process when a new tenant registers:**

1. **Create Supabase Auth User**
   ```typescript
   supabase.auth.signUp({ email, password })
   ```

2. **Create Tenant Record**
   ```sql
   INSERT INTO tenants (subscription_offering_id, subdomain, ...)
   ```

3. **Generate Encryption Key**
   ```typescript
   EncryptionKeyManager.generateTenantKey(tenantId)
   ```
   - Creates encryption key for PII data protection

4. **Create Tenant Users Junction**
   ```sql
   INSERT INTO tenant_users (tenant_id, user_id, role: 'admin', admin_role: 'tenant_admin')
   ```

5. **Provision License Features**
   ```typescript
   LicensingService.provisionTenantLicense(tenantId, offeringId)
   ```
   - Reads `product_offering_features` for direct assignments
   - Reads `product_offering_bundles` → `license_feature_bundle_items` for bundled features
   - Creates `tenant_feature_grants` for each feature with `grant_source = 'direct'`

6. **Seed Default RBAC Roles**
   ```typescript
   seedDefaultRBAC(tenantId, tier)
   ```
   - Creates 4 default roles with metadata_key: `tenant_admin`, `staff`, `volunteer`, `member`
   - Each role has `metadata_key` linking to permission role templates (e.g., `role_tenant_admin`)
   - **No permissions assigned yet** - just creates empty role shells

7. **Assign User to Admin Role**
   ```typescript
   assignTenantAdminRole(userId, tenantId)
   ```
   - Assigns registering user to `tenant_admin` role via `user_roles` table

8. **Deploy Feature Permissions (Automatic)**
   ```typescript
   PermissionDeploymentService.deployAllFeaturePermissions(tenantId)
   ```
   - For each licensed feature:
     - Reads `feature_permissions` (global permission definitions)
     - Creates tenant-specific `permissions` records
     - Reads `permission_role_templates` (role assignments)
     - Matches `metadata_key` to find tenant roles
     - Creates `role_permissions` to assign permissions to roles
   - This is where permissions are automatically deployed from Feature Studio to tenant RBAC

9. **Return Success**
   - User is automatically logged in via Supabase session

### License Assignment/Change Flow

**When changing a tenant's product offering:**

```typescript
assign_license_to_tenant(tenant_id, new_offering_id)
```

1. **Get Current Offering**
   ```sql
   SELECT subscription_offering_id FROM tenants WHERE id = tenant_id
   ```

2. **Compare Features**
   - Old features: `get_offering_all_features(old_offering_id)`
   - New features: `get_offering_all_features(new_offering_id)`

3. **Revoke Removed Features**
   ```sql
   DELETE FROM tenant_feature_grants
   WHERE tenant_id = ? AND feature_id IN (removed_features)
   ```

4. **Grant New Features**
   ```sql
   INSERT INTO tenant_feature_grants (grant_source = 'direct')
   ```

5. **Update Tenant Record**
   ```sql
   UPDATE tenants SET subscription_offering_id = new_offering_id
   ```

6. **Record Assignment History**
   ```sql
   INSERT INTO license_assignments (tenant_id, offering_id, previous_offering_id)
   ```

---

## Access Control Flow

StewardTrack uses a **two-layer security model**:

### Layer 1: License Gate (Tenant-Level)

**Check:** Does the tenant have access to this feature?

**Metadata Attribute:** `featureCode`

**Implementation:**
```typescript
// In metadata evaluation
const tenantHasFeature = await checkTenantFeatureGrant(tenantId, featureCode);

if (!tenantHasFeature) {
  return { status: 404, message: "Page not found" };
}
```

**Query:**
```sql
SELECT EXISTS (
  SELECT 1 FROM tenant_feature_grants tfg
  JOIN feature_catalog fc ON fc.id = tfg.feature_id
  WHERE tfg.tenant_id = $1
    AND fc.code = $2
    AND (tfg.expires_at IS NULL OR tfg.expires_at > CURRENT_DATE)
)
```

### Layer 2: Permission Gate (User-Level)

**Check:** Does the user have the required permission?

**Metadata Attribute:** `requiredPermissions`

**Implementation:**
```typescript
// In metadata evaluation
const userPermissions = await getUserPermissions(userId, tenantId);
const hasPermission = requiredPermissions.some(p => userPermissions.includes(p));

if (!hasPermission) {
  return { status: 403, message: "Permission denied" };
}
```

**Query:**
```sql
SELECT DISTINCT p.code
FROM user_roles ur
JOIN role_permissions rp ON rp.role_id = ur.role_id
JOIN permissions p ON p.id = rp.permission_id
WHERE ur.user_id = $1 AND ur.tenant_id = $2
```

### Combined Access Check

```
User requests page with:
  featureCode = "advanced_reporting"
  requiredPermissions = ["reports:advanced"]

┌─────────────────────────────────────────┐
│ 1. Check Tenant Feature Grant           │
│    Does tenant have "advanced_reporting"?│
└─────────────┬───────────────────────────┘
              │
              ├─── NO → 404 Page Not Found
              │
              └─── YES ↓
┌─────────────────────────────────────────┐
│ 2. Check User Permission                 │
│    Does user have "reports:advanced"?    │
└─────────────┬───────────────────────────┘
              │
              ├─── NO → 403 Permission Denied
              │
              └─── YES → Grant Access ✓
```

### Feature → Permission Mapping

Features can require specific permissions:

```sql
-- Example: Advanced Reporting feature requires "reports:advanced" permission

INSERT INTO feature_permissions (feature_id, permission_code, is_required)
SELECT
  fc.id,
  'reports:advanced',
  true
FROM feature_catalog fc
WHERE fc.code = 'advanced_reporting';
```

**Access Flow:**
1. Tenant must have `advanced_reporting` feature in `tenant_feature_grants`
2. User must have `reports:advanced` permission via `role_permissions`
3. Both checks must pass for access to be granted

---

## Database Schema Reference

### Entity Relationship Diagram

```
┌─────────────────────┐
│ product_offerings   │
└──────────┬──────────┘
           │
           ├─────────────────────────────────┐
           │                                 │
           ↓                                 ↓
┌──────────────────────┐          ┌─────────────────────────┐
│ product_offering_    │          │ product_offering_       │
│ features             │          │ bundles                 │
└──────────┬───────────┘          └──────────┬──────────────┘
           │                                 │
           │                                 ↓
           │                      ┌─────────────────────────┐
           │                      │ license_feature_bundles │
           │                      └──────────┬──────────────┘
           │                                 │
           │                                 ↓
           │                      ┌─────────────────────────┐
           │                      │ license_feature_bundle_ │
           │                      │ items                   │
           │                      └──────────┬──────────────┘
           │                                 │
           └─────────────┬───────────────────┘
                         │
                         ↓
              ┌─────────────────────┐
              │ feature_catalog     │
              └──────────┬──────────┘
                         │
                         ├──────────────────┬─────────────────┐
                         │                  │                 │
                         ↓                  ↓                 ↓
              ┌─────────────────┐  ┌──────────────┐  ┌──────────────┐
              │ tenant_feature_ │  │ feature_     │  │ delegations  │
              │ grants          │  │ permissions  │  │              │
              └─────────────────┘  └──────┬───────┘  └──────────────┘
                                          │
                                          ↓
                                   ┌──────────────┐
                                   │ permissions  │
                                   └──────┬───────┘
                                          │
                                          ↓
                                   ┌──────────────┐
                                   │ role_        │
                                   │ permissions  │
                                   └──────┬───────┘
                                          │
                                          ↓
                                   ┌──────────────┐
                                   │ roles        │
                                   └──────┬───────┘
                                          │
                                          ↓
                                   ┌──────────────┐
                                   │ user_roles   │
                                   └──────────────┘
```

### Table Summary

| Layer | Table Name | Purpose |
|-------|------------|---------|
| **Product** | `product_offerings` | Purchasable SKUs with pricing |
| **Product** | `product_offering_features` | Direct feature assignments to offerings |
| **Product** | `product_offering_bundles` | Bundle assignments to offerings |
| **Feature** | `feature_catalog` | All available features |
| **Feature** | `license_feature_bundles` | Reusable feature groupings |
| **Feature** | `license_feature_bundle_items` | Features in bundles |
| **Feature** | `feature_permissions` | Required permissions per feature |
| **Tenant** | `tenant_feature_grants` | Active feature access per tenant |
| **Tenant** | `license_assignments` | Offering assignment history |
| **RBAC** | `roles` | Role definitions |
| **RBAC** | `permissions` | Permission definitions |
| **RBAC** | `role_permissions` | Direct role → permission mapping |
| **RBAC** | `user_roles` | User → role assignments |

### Important Constraints

1. **Product Offerings**
   - `UNIQUE (code)` on `product_offerings`
   - `UNIQUE (offering_id, feature_id)` on `product_offering_features`
   - `UNIQUE (offering_id, bundle_id)` on `product_offering_bundles`

2. **Feature Catalog**
   - `UNIQUE (code)` on `feature_catalog`
   - `UNIQUE (code)` on `license_feature_bundles`
   - `UNIQUE (bundle_id, feature_id)` on `license_feature_bundle_items`
   - `UNIQUE (feature_id, permission_code)` on `feature_permissions`

3. **Tenant Grants**
   - Complex unique index on `tenant_feature_grants`:
     ```sql
     (tenant_id, feature_id, grant_source,
      COALESCE(package_id, '00000000-...'),
      COALESCE(source_reference, ''))
     ```

4. **RBAC**
   - `UNIQUE (tenant_id, name)` on `roles`
   - `UNIQUE (tenant_id, code)` on `permissions`
   - `UNIQUE (tenant_id, role_id, permission_id)` on `role_permissions`
   - `UNIQUE (tenant_id, user_id, role_id)` on `user_roles`

---

## Key Design Principles

### 1. Separation of Concerns

- **Licensing Layer** (tenant-level): Controls WHAT features a tenant has access to
- **RBAC Layer** (user-level): Controls WHO can do WHAT within those features

### 2. Two Types of Bundles

- **License Feature Bundles** (`license_feature_bundles`): For grouping features in product offerings
- **RBAC has NO bundles**: Direct `role_permissions` mapping only

### 3. Static Metadata Architecture

- All UI structure, navigation, and page definitions are in **XML files**
- NO database-driven navigation (menu_items table removed)
- Metadata uses `featureCode` and `requiredPermissions` attributes for access control

### 4. Grant Source Tracking

- `tenant_feature_grants.grant_source` tracks HOW a feature was granted:
  - `direct` - Via product offering
  - `trial` - Trial period
  - `comp` - Complimentary
  - `package` - (DEPRECATED) Legacy system

### 5. Multi-Role Support

- Users can have multiple roles simultaneously
- Permissions are aggregated from all assigned roles
- Conflict analysis available for overlapping permissions

---

## Migration Notes

### Dropped Tables (Migration: 20251219091025)

The following legacy tables were dropped:

1. **`feature_packages`** - Replaced by `product_offerings` architecture
2. **`feature_package_items`** - Replaced by `product_offering_features` + `product_offering_bundles`

**Data Migration:**
- All `tenant_feature_grants` with `grant_source = 'package'` had `package_id` set to NULL
- New grants use `grant_source = 'direct'` and link via `product_offerings`

### Still Active Tables

- ✅ `license_feature_bundles` - Active (for licensing bundles)
- ✅ `product_offering_bundles` - Active (junction for offering bundles)
- ✅ `delegation_permissions` - Active (granular delegation model)

---

## Related Documentation

- **Phase 4 Quick Reference:** `docs/phase4-developer-quick-reference.md`
- **CLAUDE.md:** Project overview and architecture
- **Metadata System:** `metadata/xsd/page-definition.xsd`

---

## Appendix: SQL Examples

### Check User Access

```sql
-- Check if user has access to a specific feature
WITH user_permissions AS (
  SELECT DISTINCT p.code
  FROM user_roles ur
  JOIN role_permissions rp ON rp.role_id = ur.role_id
  JOIN permissions p ON p.id = rp.permission_id
  WHERE ur.user_id = :user_id
    AND ur.tenant_id = :tenant_id
),
tenant_features AS (
  SELECT fc.code
  FROM tenant_feature_grants tfg
  JOIN feature_catalog fc ON fc.id = tfg.feature_id
  WHERE tfg.tenant_id = :tenant_id
    AND (tfg.expires_at IS NULL OR tfg.expires_at > CURRENT_DATE)
)
SELECT
  CASE
    WHEN tf.code IS NULL THEN 'NO_FEATURE'
    WHEN fp.permission_code IS NOT NULL AND up.code IS NULL THEN 'NO_PERMISSION'
    ELSE 'GRANTED'
  END as access_status
FROM feature_catalog fc
LEFT JOIN tenant_features tf ON tf.code = fc.code
LEFT JOIN feature_permissions fp ON fp.feature_id = fc.id AND fp.is_required = true
LEFT JOIN user_permissions up ON up.code = fp.permission_code
WHERE fc.code = :feature_code;
```

### Get All User Accessible Features

```sql
-- Get all features a user can access
SELECT DISTINCT fc.code, fc.name, fc.category
FROM tenant_feature_grants tfg
JOIN feature_catalog fc ON fc.id = tfg.feature_id
LEFT JOIN feature_permissions fp ON fp.feature_id = fc.id AND fp.is_required = true
LEFT JOIN (
  SELECT DISTINCT p.code
  FROM user_roles ur
  JOIN role_permissions rp ON rp.role_id = ur.role_id
  JOIN permissions p ON p.id = rp.permission_id
  WHERE ur.user_id = :user_id AND ur.tenant_id = :tenant_id
) up ON up.code = fp.permission_code
WHERE tfg.tenant_id = :tenant_id
  AND (tfg.expires_at IS NULL OR tfg.expires_at > CURRENT_DATE)
  AND (fp.permission_code IS NULL OR up.code IS NOT NULL)
ORDER BY fc.category, fc.name;
```

### Assign Product Offering to Tenant

```sql
-- Assign a new product offering to a tenant
SELECT * FROM assign_license_to_tenant(
  p_tenant_id := :tenant_id,
  p_offering_id := :new_offering_id,
  p_assigned_by := :admin_user_id,
  p_notes := 'Upgraded to Professional tier'
);
```

---

**Document Version:** 1.0
**Last Migration:** 20251219091025_drop_legacy_licensing_tables
**Status:** ✅ Current
