# Feature Creation with Surface ID & Permission Definition - Implementation Plan

**Version:** 2.0
**Date:** 2025-10-14
**Status:** Ready for Review
**Complexity:** High (Full-Stack + RBAC + Licensing Integration)

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Background & Context](#background--context)
3. [Business Requirements](#business-requirements)
4. [Current State Analysis](#current-state-analysis)
5. [Proposed Solution](#proposed-solution)
6. [Technical Architecture](#technical-architecture)
7. [Implementation Phases](#implementation-phases)
8. [Database Schema Changes](#database-schema-changes)
9. [Service Layer Implementation](#service-layer-implementation)
10. [API Layer Implementation](#api-layer-implementation)
11. [UI/UX Implementation](#uiux-implementation)
12. [RBAC Integration](#rbac-integration)
13. [Testing Strategy](#testing-strategy)
14. [Deployment Plan](#deployment-plan)
15. [Risk Assessment](#risk-assessment)
16. [Success Metrics](#success-metrics)

---

## Executive Summary

### Purpose
Enable Product Owners to create and manage features in the Licensing Studio with associated **surface IDs** and **permission definitions** (rights like `members:view`, `members:manage`). These permissions can then be assigned to any role by Tenant Admins through the RBAC system, allowing flexible access control based on licensed features.

### Goals
1. **Product Owner Empowerment**: Define features with surface IDs and required permissions
2. **Permission-Based Access**: Use granular permissions (not roles) as the building blocks
3. **Tenant Flexibility**: Allow Tenant Admins to assign permissions to any role in their system
4. **Default Configuration**: Provide sensible default permission-to-role mappings
5. **Developer Integration**: Provide surface IDs and permissions for code-based access control
6. **Audit Trail**: Track all permission definitions and assignments

### Key Deliverables
- Enhanced Feature Catalog with surface and permission associations
- Feature Creation Wizard with permission definition
- Permission-to-Role mapping templates (defaults)
- Tenant Admin permission assignment UI
- Developer documentation with permission-based examples
- Access Gate integration for permission enforcement

### Estimated Timeline
- **Phase 1 (Foundation)**: 2 weeks - Database schema + permission services
- **Phase 2 (Feature Management)**: 2 weeks - Licensing Studio UI + APIs
- **Phase 3 (RBAC Integration)**: 2 weeks - Permission provisioning
- **Phase 4 (Tenant Configuration)**: 2 weeks - Permission assignment UI
- **Phase 5 (Testing & Documentation)**: 1 week - End-to-end testing
- **Total**: 9 weeks

---

## Background & Context

### Current System Overview

**Licensing System:**
- ✅ `feature_catalog` table exists with basic feature definitions
- ✅ Features can be grouped into bundles and assigned to product offerings
- ❌ Features do NOT have associated permissions/rights
- ❌ No link between features and RBAC permission system

**RBAC System:**
- ✅ `permissions` table with permission codes (e.g., `members:view`, `finance:write`)
- ✅ `role_permissions` junction table linking roles to permissions
- ✅ `rbac_surface_bindings` linking surfaces to permissions
- ✅ Tenant Admins can assign permissions to roles
- ❌ No automatic permission provisioning when features are licensed
- ❌ No default permission templates for features

**The Key Insight:**
Instead of assigning **roles** to features, we assign **permissions** to features. Tenant Admins then map those permissions to whatever roles make sense for their organization.

**Example Flow:**
```
Product Owner creates "Member Management" feature
    ↓
Defines required permissions:
    - members:view
    - members:create
    - members:edit
    - members:delete
    - members:export
    ↓
System provides default mapping:
    - tenant_admin: all permissions
    - staff: view, create, edit
    - volunteer: view, create
    ↓
Tenant licenses "Member Management"
    ↓
System creates permissions in tenant's RBAC
System applies default role mappings
    ↓
Tenant Admin customizes (optional):
    - Assigns members:delete to "ministry_lead" role
    - Removes members:export from "staff" role
    - Creates custom "member_coordinator" role with specific subset
```

### Current Workflow (Manual)
```
1. Product Owner defines feature concept
2. Developer manually creates permissions in code
3. Developer hard-codes permission checks
4. Tenant Admin manually assigns permissions to roles
5. No connection to licensing
```

### Desired Workflow (Automated)
```
1. Product Owner creates feature with permissions
2. System validates permission codes
3. System creates default permission-to-role templates
4. Feature added to product offering
5. Tenant licenses the offering
6. System auto-provisions permissions and default mappings
7. Tenant Admin customizes assignments as needed
8. Developer uses standardized permission checks
```

---

## Business Requirements

### Functional Requirements

#### FR-1: Feature Creation with Permissions
**As a** Product Owner
**I want to** create features with surface IDs and define required permissions
**So that** the system knows what rights are needed to use this feature

**Acceptance Criteria:**
- Feature creation wizard includes permission definition section
- Permissions follow standard format: `{category}:{action}` (e.g., `members:view`)
- Support for multiple permissions per feature
- System validates permission codes against naming conventions
- Permissions can be marked as required vs optional

**Example:**
```
Feature: Member Directory
Surface ID: admin/members/directory
Permissions:
  - members:view (required)
  - members:export (optional)
```

#### FR-2: Default Permission-to-Role Templates
**As a** Product Owner
**I want to** define default permission-to-role mappings
**So that** tenants get sensible starting configurations

**Acceptance Criteria:**
- For each permission, suggest which standard roles should have it by default
- Standard roles: tenant_admin, staff, volunteer, member
- Templates stored but not enforced (tenant can override)
- Clear indication of recommended vs custom mappings

**Example Template:**
```
Feature: Member Management
Permission: members:view
  Default Roles: [tenant_admin, staff, volunteer, member]

Permission: members:create
  Default Roles: [tenant_admin, staff]

Permission: members:delete
  Default Roles: [tenant_admin]
```

#### FR-3: Automatic Permission Provisioning
**As a** System
**I want to** automatically create permissions when a tenant licenses a feature
**So that** permissions are available for role assignment

**Acceptance Criteria:**
- Licensing a feature creates permission records in tenant's RBAC
- Permissions are linked to feature code for traceability
- Default role mappings are applied automatically
- Provisioning is idempotent (safe to run multiple times)
- Audit log records provisioning event

#### FR-4: Tenant Admin Permission Assignment
**As a** Tenant Admin
**I want to** assign feature permissions to any role in my organization
**So that** I can customize access based on my structure

**Acceptance Criteria:**
- UI shows all licensed features with their permissions
- Each permission displays currently assigned roles
- Admin can add/remove any role to any permission
- Changes take effect immediately
- System warns if removing permissions from critical roles
- Cannot remove required permissions from tenant_admin

**Example UI:**
```
Licensed Feature: Member Management

Permission: members:view
  Assigned Roles: [Tenant Admin, Staff, Volunteer]
  Available Roles: [Member, Campus Pastor, ...]
  [Add Role] [Remove]

Permission: members:delete
  Assigned Roles: [Tenant Admin]
  Available Roles: [Staff, Ministry Lead, ...]
  [Add Role] [Remove]
  ⚠️ Warning: This is a destructive permission. Assign carefully.
```

#### FR-5: Developer Permission Reference
**As a** Developer
**I want to** use standardized permission codes in my code
**So that** access control is consistent and maintainable

**Acceptance Criteria:**
- Permission codes follow consistent naming: `{category}:{action}`
- Categories align with domain modules (members, finance, events, etc.)
- Actions use standard verbs (view, create, edit, delete, manage, export)
- TypeScript types generated for all permissions
- Access Gate supports permission-based checks

**Code Example:**
```typescript
// Check single permission
const gate = Gate.withPermission('members:view');
await gate.verify(userId);

// Check multiple permissions (all required)
const gate = Gate.withPermission(['members:view', 'members:export'], 'all');

// Check for any of several permissions
const gate = Gate.withPermission(['members:edit', 'members:manage'], 'any');
```

#### FR-6: Permission Discovery & Documentation
**As a** Developer or Tenant Admin
**I want to** easily discover what permissions exist and what they control
**So that** I can make informed decisions about access

**Acceptance Criteria:**
- Permission catalog page listing all system permissions
- Each permission shows: code, description, feature association, category
- Filter by feature, category, or license tier
- Search by permission code or description
- Export to CSV for documentation

### Non-Functional Requirements

#### NFR-1: Performance
- Permission provisioning completes in < 5 seconds per feature
- Permission checks execute in < 50ms
- UI loads permission lists in < 1 second

#### NFR-2: Scalability
- Support 100+ permissions per feature
- Support 50+ roles per tenant
- Handle 10,000+ permission grants across all tenants

#### NFR-3: Security
- Only `licensing:admin` can define permissions
- Only `rbac:permissions:manage` can assign permissions to roles
- Tenant Admins cannot view other tenants' configurations
- Permission codes are immutable after creation

---

## Current State Analysis

### Existing Tables

#### `permissions` (Existing)
```sql
CREATE TABLE permissions (
  id uuid PRIMARY KEY,
  code text UNIQUE NOT NULL,
  name text NOT NULL,
  category text,
  description text,
  is_system boolean DEFAULT false,
  is_active boolean DEFAULT true,
  tenant_id uuid,  -- NULL for system-wide
  created_at timestamptz,
  updated_at timestamptz
);
```

**Notes:**
- ✅ Supports permission codes
- ✅ Has category field
- ❌ No link to features
- ❌ No "default role" templates

#### `role_permissions` (Existing)
```sql
CREATE TABLE role_permissions (
  id uuid PRIMARY KEY,
  role_id uuid REFERENCES roles(id),
  permission_id uuid REFERENCES permissions(id),
  tenant_id uuid NOT NULL,
  created_at timestamptz,
  UNIQUE (role_id, permission_id)
);
```

**Notes:**
- ✅ Links roles to permissions
- ✅ Tenant-scoped
- ❌ No template/default mechanism

### Gaps to Address

| Gap | Impact | Solution |
|-----|--------|----------|
| No feature-to-permission link | Cannot provision permissions when licensing | Add `feature_permissions` table |
| No default role templates | Every tenant starts from scratch | Add `permission_role_templates` table |
| No permission validation | Risk of typos and inconsistencies | Add `PermissionValidationService` |
| No bulk provisioning | Slow license activation | Add batch provisioning methods |
| No permission discovery UI | Hard to know what exists | Build permission catalog UI |

---

## Proposed Solution

### Solution Architecture

The solution introduces a **Permission-Centric Feature Model** where:

1. **Product Owner defines permissions** when creating features
2. **System validates permission codes** against naming standards
3. **Default templates** suggest which roles should have which permissions
4. **Licensing provisions permissions** automatically for tenants
5. **Tenant Admins customize** permission-to-role mappings
6. **Developers reference permissions** in code via Access Gate

### Key Components

#### 1. Enhanced Feature Catalog with Permissions

```typescript
interface FeatureCatalogEntry {
  id: string;
  code: string;
  name: string;
  category: string;
  description: string;
  phase: string;

  // NEW: Surface association
  surface_id: string | null;
  surface_type: string | null;
  module: string | null;

  // Permissions are stored in separate table (one-to-many)
  permissions?: FeaturePermission[];

  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface FeaturePermission {
  id: string;
  feature_id: string;
  permission_code: string;  // e.g., "members:view"
  display_name: string;     // e.g., "View Members"
  description: string;      // e.g., "Allows viewing member profiles"
  is_required: boolean;     // true = must grant, false = optional
  category: string;         // e.g., "members"
  action: string;           // e.g., "view"
  default_role_template?: PermissionRoleTemplate[];
}

interface PermissionRoleTemplate {
  permission_code: string;
  role_key: string;         // e.g., "tenant_admin", "staff"
  is_recommended: boolean;  // true = suggested default
  reason?: string;          // e.g., "Staff typically need view access"
}
```

#### 2. Feature Creation Wizard with Permission Definition

**Step 1: Basic Information**
- Feature code, name, description
- Category, phase

**Step 2: Surface Association**
- Surface ID, type, module

**Step 3: Permission Definition** (NEW)
- List of permissions for this feature
- Each permission:
  - Permission code (validated format)
  - Display name
  - Description
  - Required vs optional
  - Category and action (parsed from code)

**Step 4: Default Role Mapping** (NEW)
- For each permission, select recommended roles
- Visual matrix showing permissions × roles
- Checkboxes to toggle role assignments
- Guidance text for each role

**Step 5: Review & Create**
- Summary of feature, surface, permissions, and templates

#### 3. Permission Provisioning Flow

```
┌─────────────────────────────────────────┐
│ Tenant Licenses Feature                │
└──────────────┬──────────────────────────┘
               │
               ▼
    ┌──────────────────────────┐
    │ Get Feature Permissions  │
    └──────────┬───────────────┘
               │
               ▼
    ┌──────────────────────────┐
    │ For Each Permission:     │
    │ 1. Create permission     │
    │    record if not exists  │
    │ 2. Get default role IDs  │
    │ 3. Create role_permission│
    │    records               │
    │ 4. Audit log entry       │
    └──────────┬───────────────┘
               │
               ▼
    ┌──────────────────────────┐
    │ Emit Event:              │
    │ FeaturePermissionsProvisioned │
    └──────────────────────────┘
```

#### 4. Tenant Admin Permission Management UI

**Page: Licensed Features & Permissions**

Layout:
```
┌─────────────────────────────────────────────────────────────┐
│ Licensed Features                                           │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  [Filter: All Features ▼] [Search permissions...]          │
│                                                             │
│  Feature: Member Management                                │
│  └─ Surface: admin/members/management                      │
│                                                             │
│     Permissions (5):                                        │
│     ┌─────────────────────────────────────────────────┐   │
│     │ members:view                                     │   │
│     │ View member profiles and basic info             │   │
│     │                                                  │   │
│     │ Currently Assigned To:                          │   │
│     │ [Tenant Admin] [Staff] [Volunteer] [Member]    │   │
│     │                                                  │   │
│     │ Available Roles:                                 │   │
│     │ [+ Campus Pastor] [+ Ministry Lead]             │   │
│     │                                                  │   │
│     │ [Edit Assignments]                              │   │
│     └─────────────────────────────────────────────────┘   │
│                                                             │
│     ┌─────────────────────────────────────────────────┐   │
│     │ members:delete                                   │   │
│     │ Permanently delete member records                │   │
│     │ ⚠️ This is a destructive action                 │   │
│     │                                                  │   │
│     │ Currently Assigned To:                          │   │
│     │ [Tenant Admin]                                  │   │
│     │                                                  │   │
│     │ Available Roles:                                 │   │
│     │ [+ Staff] [+ Ministry Lead]                     │   │
│     │                                                  │   │
│     │ [Edit Assignments]                              │   │
│     └─────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Technical Architecture

### New Tables

#### 1. `feature_permissions`
Links features to their required permissions.

```sql
CREATE TABLE feature_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  feature_id uuid NOT NULL REFERENCES feature_catalog(id) ON DELETE CASCADE,
  permission_code text NOT NULL,
  display_name text NOT NULL,
  description text,
  category text NOT NULL,
  action text NOT NULL,
  is_required boolean DEFAULT true,
  display_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),

  UNIQUE (feature_id, permission_code)
);

-- Indexes
CREATE INDEX feature_permissions_feature_id_idx ON feature_permissions(feature_id);
CREATE INDEX feature_permissions_permission_code_idx ON feature_permissions(permission_code);
CREATE INDEX feature_permissions_category_idx ON feature_permissions(category);
```

#### 2. `permission_role_templates`
Default role mappings for permissions (suggestions for tenants).

```sql
CREATE TABLE permission_role_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  feature_permission_id uuid NOT NULL REFERENCES feature_permissions(id) ON DELETE CASCADE,
  role_key text NOT NULL,  -- e.g., 'tenant_admin', 'staff'
  is_recommended boolean DEFAULT true,
  reason text,
  created_at timestamptz DEFAULT now(),

  UNIQUE (feature_permission_id, role_key)
);

-- Indexes
CREATE INDEX permission_role_templates_feature_permission_id_idx
  ON permission_role_templates(feature_permission_id);
CREATE INDEX permission_role_templates_role_key_idx
  ON permission_role_templates(role_key);
```

### Service Layer

#### 1. PermissionValidationService

```typescript
@injectable()
export class PermissionValidationService {
  // Permission code must match: {category}:{action}
  private readonly PERMISSION_CODE_REGEX = /^[a-z_]+:[a-z_]+$/;

  private readonly VALID_ACTIONS = [
    'view', 'create', 'edit', 'delete', 'manage',
    'export', 'import', 'publish', 'approve'
  ];

  /**
   * Validates permission code format
   */
  validatePermissionCode(code: string): ValidationResult {
    const errors: string[] = [];

    if (!this.PERMISSION_CODE_REGEX.test(code)) {
      errors.push(
        'Permission code must follow format: {category}:{action} ' +
        '(lowercase, underscores only, e.g., members:view)'
      );
    }

    const [category, action] = code.split(':');

    if (!action || !this.VALID_ACTIONS.includes(action)) {
      errors.push(
        `Invalid action "${action}". Valid actions: ${this.VALID_ACTIONS.join(', ')}`
      );
    }

    if (!category || category.length < 3) {
      errors.push('Category must be at least 3 characters');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings: []
    };
  }

  /**
   * Validates permission set for a feature
   */
  async validateFeaturePermissions(
    featureId: string,
    permissions: Array<{ code: string; is_required: boolean }>
  ): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Must have at least one permission
    if (permissions.length === 0) {
      errors.push('Feature must have at least one permission defined');
    }

    // Check for duplicates
    const codes = permissions.map(p => p.code);
    const duplicates = codes.filter((code, index) => codes.indexOf(code) !== index);
    if (duplicates.length > 0) {
      errors.push(`Duplicate permission codes: ${duplicates.join(', ')}`);
    }

    // Validate each permission code
    for (const perm of permissions) {
      const result = this.validatePermissionCode(perm.code);
      errors.push(...result.errors);
    }

    // Warn if no "view" permission
    const hasViewPermission = codes.some(code => code.endsWith(':view'));
    if (!hasViewPermission) {
      warnings.push(
        'No "view" permission defined. Most features should include a view permission.'
      );
    }

    return { isValid: errors.length === 0, errors, warnings };
  }
}
```

#### 2. FeaturePermissionService

```typescript
@injectable()
export class FeaturePermissionService {
  constructor(
    @inject(TYPES.IFeaturePermissionRepository)
    private featurePermissionRepository: IFeaturePermissionRepository,
    @inject(TYPES.IPermissionRoleTemplateRepository)
    private permissionRoleTemplateRepository: IPermissionRoleTemplateRepository,
    @inject(TYPES.PermissionValidationService)
    private validationService: PermissionValidationService
  ) {}

  /**
   * Creates permissions for a feature
   */
  async createFeaturePermissions(
    featureId: string,
    permissions: Array<{
      code: string;
      display_name: string;
      description?: string;
      is_required?: boolean;
      default_roles?: string[];
    }>
  ): Promise<void> {
    // Validate permission set
    const validation = await this.validationService.validateFeaturePermissions(
      featureId,
      permissions.map(p => ({ code: p.code, is_required: p.is_required ?? true }))
    );

    if (!validation.isValid) {
      throw new Error(`Permission validation failed: ${validation.errors.join(', ')}`);
    }

    // Log warnings
    if (validation.warnings.length > 0) {
      console.warn('Permission validation warnings:', validation.warnings);
    }

    // Create each permission
    for (const perm of permissions) {
      const [category, action] = perm.code.split(':');

      // Create feature permission record
      const featurePermission = await this.featurePermissionRepository.create({
        feature_id: featureId,
        permission_code: perm.code,
        display_name: perm.display_name,
        description: perm.description,
        category,
        action,
        is_required: perm.is_required ?? true
      });

      // Create default role templates
      if (perm.default_roles && perm.default_roles.length > 0) {
        await this.createRoleTemplates(
          featurePermission.id,
          perm.default_roles
        );
      }
    }

    console.log(`Created ${permissions.length} permissions for feature ${featureId}`);
  }

  /**
   * Creates default role templates for a permission
   */
  private async createRoleTemplates(
    featurePermissionId: string,
    roleKeys: string[]
  ): Promise<void> {
    for (const roleKey of roleKeys) {
      await this.permissionRoleTemplateRepository.create({
        feature_permission_id: featurePermissionId,
        role_key: roleKey,
        is_recommended: true,
        reason: this.getDefaultRoleReason(roleKey)
      });
    }
  }

  /**
   * Provides default reasoning for role recommendations
   */
  private getDefaultRoleReason(roleKey: string): string {
    const reasons: Record<string, string> = {
      tenant_admin: 'Full administrative access',
      staff: 'Standard staff-level access',
      volunteer: 'Limited volunteer access',
      member: 'Basic member self-service access'
    };

    return reasons[roleKey] || 'Custom role assignment';
  }

  /**
   * Gets all permissions for a feature
   */
  async getFeaturePermissions(featureId: string): Promise<FeaturePermission[]> {
    return await this.featurePermissionRepository.getByFeatureId(featureId);
  }

  /**
   * Gets permission with default role templates
   */
  async getPermissionWithTemplates(permissionId: string) {
    const permission = await this.featurePermissionRepository.getById(permissionId);
    if (!permission) return null;

    const templates = await this.permissionRoleTemplateRepository.getByPermissionId(
      permissionId
    );

    return {
      ...permission,
      default_role_templates: templates
    };
  }
}
```

#### 3. TenantPermissionProvisioningService

```typescript
@injectable()
export class TenantPermissionProvisioningService {
  constructor(
    @inject(TYPES.IFeaturePermissionRepository)
    private featurePermissionRepository: IFeaturePermissionRepository,
    @inject(TYPES.IPermissionRepository)
    private permissionRepository: IPermissionRepository,
    @inject(TYPES.IRolePermissionRepository)
    private rolePermissionRepository: IRolePermissionRepository,
    @inject(TYPES.IPermissionRoleTemplateRepository)
    private permissionRoleTemplateRepository: IPermissionRoleTemplateRepository
  ) {}

  /**
   * Provisions permissions for a tenant when they license a feature
   */
  async provisionFeaturePermissions(
    tenantId: string,
    featureId: string
  ): Promise<void> {
    console.log(`Provisioning permissions for tenant ${tenantId}, feature ${featureId}`);

    try {
      // Get feature permissions
      const featurePermissions = await this.featurePermissionRepository.getByFeatureId(
        featureId
      );

      if (featurePermissions.length === 0) {
        console.warn(`No permissions defined for feature ${featureId}`);
        return;
      }

      // Process each permission
      for (const featurePerm of featurePermissions) {
        // 1. Create permission in tenant's RBAC (if not exists)
        const permission = await this.ensurePermissionExists(
          tenantId,
          featurePerm
        );

        // 2. Apply default role mappings
        await this.applyDefaultRoleMappings(
          tenantId,
          permission.id,
          featurePerm.id
        );
      }

      console.log(`Successfully provisioned ${featurePermissions.length} permissions for tenant ${tenantId}`);

    } catch (error) {
      console.error(`Failed to provision permissions for tenant ${tenantId}:`, error);
      throw new Error(`Permission provisioning failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Ensures permission exists in tenant's RBAC system
   */
  private async ensurePermissionExists(
    tenantId: string,
    featurePermission: FeaturePermission
  ): Promise<Permission> {
    // Check if permission already exists for tenant
    let permission = await this.permissionRepository.getByCode(
      featurePermission.permission_code,
      tenantId
    );

    if (!permission) {
      // Create new permission for tenant
      permission = await this.permissionRepository.create({
        code: featurePermission.permission_code,
        name: featurePermission.display_name,
        description: featurePermission.description,
        category: featurePermission.category,
        tenant_id: tenantId,
        is_system: false,
        is_active: true
      });

      console.log(`Created permission ${permission.code} for tenant ${tenantId}`);
    }

    return permission;
  }

  /**
   * Applies default role mappings from templates
   */
  private async applyDefaultRoleMappings(
    tenantId: string,
    permissionId: string,
    featurePermissionId: string
  ): Promise<void> {
    // Get default role templates
    const templates = await this.permissionRoleTemplateRepository.getByPermissionId(
      featurePermissionId
    );

    if (templates.length === 0) {
      console.warn(`No role templates for feature permission ${featurePermissionId}`);
      return;
    }

    // For each template, create role_permission mapping
    for (const template of templates) {
      // Get role ID for tenant
      const roleId = await this.getRoleIdByKey(tenantId, template.role_key);

      if (!roleId) {
        console.warn(`Role ${template.role_key} not found for tenant ${tenantId}`);
        continue;
      }

      // Check if mapping already exists
      const exists = await this.rolePermissionRepository.exists(
        roleId,
        permissionId
      );

      if (!exists) {
        // Create role-permission mapping
        await this.rolePermissionRepository.create({
          role_id: roleId,
          permission_id: permissionId,
          tenant_id: tenantId
        });

        console.log(`Assigned permission to role ${template.role_key} for tenant ${tenantId}`);
      }
    }
  }

  /**
   * Helper to get role ID by key for tenant
   */
  private async getRoleIdByKey(
    tenantId: string,
    roleKey: string
  ): Promise<string | null> {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('roles')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('key', roleKey)
      .eq('is_active', true)
      .single();

    if (error || !data) {
      return null;
    }

    return data.id;
  }

  /**
   * Removes permissions when a tenant loses access to a feature
   */
  async deprovisionFeaturePermissions(
    tenantId: string,
    featureId: string
  ): Promise<void> {
    // Get feature permissions
    const featurePermissions = await this.featurePermissionRepository.getByFeatureId(
      featureId
    );

    // Remove role-permission mappings
    for (const featurePerm of featurePermissions) {
      const permission = await this.permissionRepository.getByCode(
        featurePerm.permission_code,
        tenantId
      );

      if (permission) {
        // Remove all role mappings
        await this.rolePermissionRepository.deleteByPermissionId(permission.id);

        // Optionally delete the permission itself
        // (or mark as inactive to preserve audit history)
        await this.permissionRepository.update(permission.id, {
          is_active: false
        });
      }
    }

    console.log(`Deprovisioned permissions for feature ${featureId}, tenant ${tenantId}`);
  }
}
```

#### 4. TenantPermissionConfigurationService

```typescript
@injectable()
export class TenantPermissionConfigurationService {
  constructor(
    @inject(TYPES.IPermissionRepository)
    private permissionRepository: IPermissionRepository,
    @inject(TYPES.IRolePermissionRepository)
    private rolePermissionRepository: IRolePermissionRepository,
    @inject(TYPES.IRoleRepository)
    private roleRepository: IRoleRepository
  ) {}

  /**
   * Gets all permissions for a tenant with current role assignments
   */
  async getTenantPermissionsWithRoles(
    tenantId: string,
    featureId?: string
  ): Promise<PermissionWithRoles[]> {
    // Get all permissions for tenant
    let permissions = await this.permissionRepository.getByTenantId(tenantId);

    // Optionally filter by feature
    if (featureId) {
      const featurePermCodes = await this.getFeaturePermissionCodes(featureId);
      permissions = permissions.filter(p => featurePermCodes.includes(p.code));
    }

    // For each permission, get assigned roles
    const result: PermissionWithRoles[] = [];

    for (const permission of permissions) {
      const roleIds = await this.rolePermissionRepository.getRoleIdsByPermissionId(
        permission.id
      );

      const roles = await this.roleRepository.getByIds(roleIds);

      result.push({
        ...permission,
        assigned_roles: roles.map(r => ({
          id: r.id,
          key: r.key,
          name: r.name
        }))
      });
    }

    return result;
  }

  /**
   * Updates role assignments for a permission
   */
  async updatePermissionRoles(
    tenantId: string,
    permissionId: string,
    roleIds: string[]
  ): Promise<void> {
    // Validate permission belongs to tenant
    const permission = await this.permissionRepository.getById(permissionId);
    if (!permission || permission.tenant_id !== tenantId) {
      throw new Error('Permission not found or does not belong to tenant');
    }

    // Get current role assignments
    const currentRoleIds = await this.rolePermissionRepository.getRoleIdsByPermissionId(
      permissionId
    );

    // Determine adds and removes
    const toAdd = roleIds.filter(id => !currentRoleIds.includes(id));
    const toRemove = currentRoleIds.filter(id => !roleIds.includes(id));

    // Validate that tenant_admin always has access to required permissions
    const tenantAdminRole = await this.roleRepository.getByKey(tenantId, 'tenant_admin');
    if (tenantAdminRole && permission.is_required !== false) {
      if (!roleIds.includes(tenantAdminRole.id)) {
        throw new Error('tenant_admin must have access to required permissions');
      }
    }

    // Remove role assignments
    for (const roleId of toRemove) {
      await this.rolePermissionRepository.delete(roleId, permissionId);
    }

    // Add new role assignments
    for (const roleId of toAdd) {
      await this.rolePermissionRepository.create({
        role_id: roleId,
        permission_id: permissionId,
        tenant_id: tenantId
      });
    }

    console.log(`Updated permission ${permissionId} roles: +${toAdd.length}, -${toRemove.length}`);
  }

  /**
   * Resets permission role assignments to defaults
   */
  async resetToDefaults(
    tenantId: string,
    permissionId: string
  ): Promise<void> {
    // Get permission
    const permission = await this.permissionRepository.getById(permissionId);
    if (!permission) {
      throw new Error('Permission not found');
    }

    // Get feature permission to find templates
    const featurePermission = await this.featurePermissionRepository.getByCode(
      permission.code
    );

    if (!featurePermission) {
      throw new Error('Cannot reset: no default templates found');
    }

    // Get templates
    const templates = await this.permissionRoleTemplateRepository.getByPermissionId(
      featurePermission.id
    );

    // Get role IDs for template keys
    const roleIds: string[] = [];
    for (const template of templates) {
      const roleId = await this.getRoleIdByKey(tenantId, template.role_key);
      if (roleId) {
        roleIds.push(roleId);
      }
    }

    // Apply default role assignments
    await this.updatePermissionRoles(tenantId, permissionId, roleIds);

    console.log(`Reset permission ${permissionId} to default role assignments`);
  }

  /**
   * Gets available roles for assignment
   */
  async getAvailableRoles(tenantId: string): Promise<Role[]> {
    return await this.roleRepository.getByTenantId(tenantId, true); // active only
  }

  // Helper methods

  private async getFeaturePermissionCodes(featureId: string): Promise<string[]> {
    const featurePerms = await this.featurePermissionRepository.getByFeatureId(featureId);
    return featurePerms.map(p => p.permission_code);
  }

  private async getRoleIdByKey(tenantId: string, roleKey: string): Promise<string | null> {
    const role = await this.roleRepository.getByKey(tenantId, roleKey);
    return role?.id || null;
  }
}
```

---

## Database Schema Changes

### Migration 1: Add Surface to `feature_catalog`

```sql
-- Migration: 20251014_001_add_surface_to_feature_catalog.sql

BEGIN;

ALTER TABLE feature_catalog
  ADD COLUMN surface_id text,
  ADD COLUMN surface_type text CHECK (surface_type IN (
    'page', 'dashboard', 'wizard', 'manager', 'console', 'audit', 'overlay'
  )),
  ADD COLUMN module text;

-- Add unique constraint
ALTER TABLE feature_catalog
  ADD CONSTRAINT feature_catalog_surface_id_unique
  UNIQUE (surface_id);

-- Add indexes
CREATE INDEX feature_catalog_surface_id_idx
  ON feature_catalog(surface_id)
  WHERE surface_id IS NOT NULL;

CREATE INDEX feature_catalog_module_idx
  ON feature_catalog(module)
  WHERE module IS NOT NULL;

-- Comments
COMMENT ON COLUMN feature_catalog.surface_id IS
  'Associated metadata surface ID (e.g., admin/members/directory).';

COMMENT ON COLUMN feature_catalog.surface_type IS
  'Type of UI surface: page, dashboard, wizard, etc.';

COMMENT ON COLUMN feature_catalog.module IS
  'Module grouping (e.g., admin-members, admin-finance).';

COMMIT;
```

### Migration 2: Create `feature_permissions`

```sql
-- Migration: 20251014_002_create_feature_permissions.sql

BEGIN;

-- Feature permissions define what rights are needed to use a feature
CREATE TABLE feature_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  feature_id uuid NOT NULL REFERENCES feature_catalog(id) ON DELETE CASCADE,
  permission_code text NOT NULL,
  display_name text NOT NULL,
  description text,
  category text NOT NULL,
  action text NOT NULL,
  is_required boolean DEFAULT true,
  display_order integer DEFAULT 0,
  created_by uuid REFERENCES auth.users(id),
  updated_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),

  UNIQUE (feature_id, permission_code),
  CHECK (permission_code ~ '^[a-z_]+:[a-z_]+$')
);

-- Indexes
CREATE INDEX feature_permissions_feature_id_idx
  ON feature_permissions(feature_id);

CREATE INDEX feature_permissions_permission_code_idx
  ON feature_permissions(permission_code);

CREATE INDEX feature_permissions_category_idx
  ON feature_permissions(category);

CREATE INDEX feature_permissions_category_action_idx
  ON feature_permissions(category, action);

-- Enable RLS
ALTER TABLE feature_permissions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Feature permissions viewable by authenticated users"
  ON feature_permissions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Feature permissions manageable by licensing admins"
  ON feature_permissions FOR ALL
  TO authenticated
  USING (true)  -- TODO: Add licensing admin check
  WITH CHECK (true);

-- Trigger for updated_at
CREATE TRIGGER update_feature_permissions_updated_at
BEFORE UPDATE ON feature_permissions
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Comments
COMMENT ON TABLE feature_permissions IS
  'Defines required permissions (rights) for each feature. E.g., members:view, finance:delete.';

COMMENT ON COLUMN feature_permissions.permission_code IS
  'Permission code in format {category}:{action}, e.g., members:view, finance:delete.';

COMMENT ON COLUMN feature_permissions.is_required IS
  'Whether this permission is required (vs optional) for the feature to function.';

COMMIT;
```

### Migration 3: Create `permission_role_templates`

```sql
-- Migration: 20251014_003_create_permission_role_templates.sql

BEGIN;

-- Permission role templates define default role assignments for permissions
CREATE TABLE permission_role_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  feature_permission_id uuid NOT NULL REFERENCES feature_permissions(id) ON DELETE CASCADE,
  role_key text NOT NULL,
  is_recommended boolean DEFAULT true,
  reason text,
  created_by uuid REFERENCES auth.users(id),
  updated_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),

  UNIQUE (feature_permission_id, role_key)
);

-- Indexes
CREATE INDEX permission_role_templates_feature_permission_id_idx
  ON permission_role_templates(feature_permission_id);

CREATE INDEX permission_role_templates_role_key_idx
  ON permission_role_templates(role_key);

-- Enable RLS
ALTER TABLE permission_role_templates ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Permission role templates viewable by authenticated users"
  ON permission_role_templates FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Permission role templates manageable by licensing admins"
  ON permission_role_templates FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Trigger
CREATE TRIGGER update_permission_role_templates_updated_at
BEFORE UPDATE ON permission_role_templates
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Comments
COMMENT ON TABLE permission_role_templates IS
  'Default role assignments for permissions. Suggests which roles should have which permissions by default.';

COMMENT ON COLUMN permission_role_templates.role_key IS
  'Role key (e.g., tenant_admin, staff, volunteer).';

COMMENT ON COLUMN permission_role_templates.is_recommended IS
  'Whether this role assignment is recommended as a default.';

COMMENT ON COLUMN permission_role_templates.reason IS
  'Explanation for why this role should have this permission by default.';

COMMIT;
```

### Migration 4: Helper Functions

```sql
-- Migration: 20251014_004_permission_helper_functions.sql

BEGIN;

-- Function to get all permissions for a feature with templates
CREATE OR REPLACE FUNCTION get_feature_permissions_with_templates(p_feature_id uuid)
RETURNS TABLE (
  permission_id uuid,
  permission_code text,
  display_name text,
  description text,
  category text,
  action text,
  is_required boolean,
  default_roles jsonb
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT
    fp.id AS permission_id,
    fp.permission_code,
    fp.display_name,
    fp.description,
    fp.category,
    fp.action,
    fp.is_required,
    COALESCE(
      jsonb_agg(
        jsonb_build_object(
          'role_key', prt.role_key,
          'is_recommended', prt.is_recommended,
          'reason', prt.reason
        )
      ) FILTER (WHERE prt.id IS NOT NULL),
      '[]'::jsonb
    ) AS default_roles
  FROM feature_permissions fp
  LEFT JOIN permission_role_templates prt ON prt.feature_permission_id = fp.id
  WHERE fp.feature_id = p_feature_id
  GROUP BY fp.id, fp.permission_code, fp.display_name, fp.description,
           fp.category, fp.action, fp.is_required
  ORDER BY fp.display_order, fp.permission_code;
END;
$$;

-- Function to get tenant's licensed features with permissions
CREATE OR REPLACE FUNCTION get_tenant_licensed_features_with_permissions(p_tenant_id uuid)
RETURNS TABLE (
  feature_id uuid,
  feature_code text,
  feature_name text,
  surface_id text,
  permissions jsonb
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT
    fc.id AS feature_id,
    fc.code AS feature_code,
    fc.name AS feature_name,
    fc.surface_id,
    COALESCE(
      jsonb_agg(
        jsonb_build_object(
          'code', fp.permission_code,
          'name', fp.display_name,
          'description', fp.description,
          'is_required', fp.is_required
        )
        ORDER BY fp.display_order
      ) FILTER (WHERE fp.id IS NOT NULL),
      '[]'::jsonb
    ) AS permissions
  FROM feature_catalog fc
  JOIN tenant_feature_grants tfg ON tfg.feature_id = fc.id
  LEFT JOIN feature_permissions fp ON fp.feature_id = fc.id
  WHERE tfg.tenant_id = p_tenant_id
    AND fc.is_active = true
    AND (tfg.expires_at IS NULL OR tfg.expires_at > CURRENT_DATE)
  GROUP BY fc.id, fc.code, fc.name, fc.surface_id
  ORDER BY fc.name;
END;
$$;

-- Function to check if permission code is available
CREATE OR REPLACE FUNCTION is_permission_code_available(
  p_permission_code text,
  p_feature_id uuid DEFAULT NULL
)
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT NOT EXISTS (
    SELECT 1
    FROM feature_permissions
    WHERE permission_code = p_permission_code
      AND (p_feature_id IS NULL OR feature_id != p_feature_id)
  );
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_feature_permissions_with_templates(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION get_tenant_licensed_features_with_permissions(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION is_permission_code_available(text, uuid) TO authenticated;

COMMIT;
```

---

## API Layer Implementation

### 1. Feature Creation with Permissions

```typescript
// src/app/api/licensing/features/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { container } from '@/lib/container';
import { TYPES } from '@/lib/types';
import { z } from 'zod';

const featurePermissionSchema = z.object({
  code: z.string().regex(/^[a-z_]+:[a-z_]+$/, 'Must be format {category}:{action}'),
  display_name: z.string().min(1),
  description: z.string().optional(),
  is_required: z.boolean().default(true),
  default_roles: z.array(z.string()).optional()
});

const createFeatureSchema = z.object({
  code: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
  category: z.string().min(1),
  phase: z.enum(['alpha', 'beta', 'ga']).default('ga'),

  // Surface association
  surface: z.object({
    surface_id: z.string().min(1),
    surface_type: z.enum(['page', 'dashboard', 'wizard', 'manager', 'console', 'audit', 'overlay']),
    module: z.string().min(1)
  }).optional(),

  // Permissions
  permissions: z.array(featurePermissionSchema).min(1, 'At least one permission required')
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = createFeatureSchema.parse(body);

    const licensingService = container.get(TYPES.LicensingService);
    const featurePermissionService = container.get(TYPES.FeaturePermissionService);
    const validationService = container.get(TYPES.PermissionValidationService);

    // Additional validation
    const permissionValidation = await validationService.validateFeaturePermissions(
      'new',  // placeholder
      validatedData.permissions.map(p => ({ code: p.code, is_required: p.is_required }))
    );

    if (!permissionValidation.isValid) {
      return NextResponse.json(
        { error: 'Permission validation failed', details: permissionValidation.errors },
        { status: 400 }
      );
    }

    // Create feature
    const feature = await licensingService.createFeature({
      code: validatedData.code,
      name: validatedData.name,
      description: validatedData.description,
      category: validatedData.category,
      phase: validatedData.phase,
      surface_id: validatedData.surface?.surface_id,
      surface_type: validatedData.surface?.surface_type,
      module: validatedData.surface?.module
    });

    // Create permissions
    await featurePermissionService.createFeaturePermissions(
      feature.id,
      validatedData.permissions
    );

    return NextResponse.json(
      {
        success: true,
        feature,
        message: 'Feature created with permissions'
      },
      { status: 201 }
    );

  } catch (error) {
    console.error('Feature creation error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error', message: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 }
    );
  }
}
```

### 2. Tenant Permission Configuration API

```typescript
// src/app/api/tenant/permissions/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { container } from '@/lib/container';
import { TYPES } from '@/lib/types';
import { tenantUtils } from '@/utils/tenantUtils';

export async function GET(request: NextRequest) {
  try {
    const tenantId = await tenantUtils.getTenantId();
    if (!tenantId) {
      return NextResponse.json({ error: 'No tenant context' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const featureId = searchParams.get('feature_id');

    const configService = container.get(TYPES.TenantPermissionConfigurationService);

    const permissions = await configService.getTenantPermissionsWithRoles(
      tenantId,
      featureId || undefined
    );

    return NextResponse.json({ permissions });

  } catch (error) {
    console.error('Tenant permissions fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch permissions' },
      { status: 500 }
    );
  }
}
```

```typescript
// src/app/api/tenant/permissions/[permissionId]/roles/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { container } from '@/lib/container';
import { TYPES } from '@/lib/types';
import { tenantUtils } from '@/utils/tenantUtils';
import { z } from 'zod';

const updateRolesSchema = z.object({
  role_ids: z.array(z.string().uuid()).min(1)
});

export async function PUT(
  request: NextRequest,
  { params }: { params: { permissionId: string } }
) {
  try {
    const tenantId = await tenantUtils.getTenantId();
    if (!tenantId) {
      return NextResponse.json({ error: 'No tenant context' }, { status: 401 });
    }

    const body = await request.json();
    const { role_ids } = updateRolesSchema.parse(body);

    const configService = container.get(TYPES.TenantPermissionConfigurationService);

    await configService.updatePermissionRoles(
      tenantId,
      params.permissionId,
      role_ids
    );

    return NextResponse.json({
      success: true,
      message: 'Permission role assignments updated'
    });

  } catch (error) {
    console.error('Permission role update error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to update permission roles', message: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { permissionId: string } }
) {
  try {
    const tenantId = await tenantUtils.getTenantId();
    if (!tenantId) {
      return NextResponse.json({ error: 'No tenant context' }, { status: 401 });
    }

    const configService = container.get(TYPES.TenantPermissionConfigurationService);

    await configService.resetToDefaults(tenantId, params.permissionId);

    return NextResponse.json({
      success: true,
      message: 'Permission reset to default role assignments'
    });

  } catch (error) {
    console.error('Permission reset error:', error);
    return NextResponse.json(
      { error: 'Failed to reset permission' },
      { status: 500 }
    );
  }
}
```

---

## UI/UX Implementation

### Feature Creation Wizard (Updated)

```typescript
// src/components/admin/licensing/FeatureCreationWizard.tsx

'use client';

import React, { useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { PlusIcon, TrashIcon } from 'lucide-react';

const permissionSchema = z.object({
  code: z.string().regex(/^[a-z_]+:[a-z_]+$/, 'Format: {category}:{action}'),
  display_name: z.string().min(1),
  description: z.string().optional(),
  is_required: z.boolean(),
  default_roles: z.array(z.string())
});

const featureSchema = z.object({
  code: z.string().min(1),
  name: z.string().min(1),
  category: z.string().min(1),
  phase: z.enum(['alpha', 'beta', 'ga']),
  surface: z.object({
    surface_id: z.string().min(1),
    surface_type: z.string(),
    module: z.string()
  }).optional(),
  permissions: z.array(permissionSchema).min(1)
});

const ROLE_OPTIONS = [
  { key: 'tenant_admin', label: 'Tenant Admin', description: 'Full access' },
  { key: 'staff', label: 'Staff', description: 'Standard staff access' },
  { key: 'volunteer', label: 'Volunteer', description: 'Limited volunteer access' },
  { key: 'member', label: 'Member', description: 'Self-service access' }
];

const ACTION_TEMPLATES = [
  { action: 'view', label: 'View', description: 'Read-only access' },
  { action: 'create', label: 'Create', description: 'Create new records' },
  { action: 'edit', label: 'Edit', description: 'Modify existing records' },
  { action: 'delete', label: 'Delete', description: 'Remove records' },
  { action: 'manage', label: 'Manage', description: 'Full administrative access' },
  { action: 'export', label: 'Export', description: 'Export data' },
  { action: 'import', label: 'Import', description: 'Import data' }
];

export function FeatureCreationWizard({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { register, control, handleSubmit, watch, setValue, formState: { errors } } = useForm({
    resolver: zodResolver(featureSchema),
    defaultValues: {
      phase: 'ga',
      permissions: [
        {
          code: '',
          display_name: '',
          description: '',
          is_required: true,
          default_roles: ['tenant_admin']
        }
      ]
    }
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'permissions'
  });

  const category = watch('category');

  const addPermissionFromTemplate = (action: string) => {
    if (!category) {
      alert('Please set a category first');
      return;
    }

    const template = ACTION_TEMPLATES.find(t => t.action === action);
    if (!template) return;

    append({
      code: `${category}:${action}`,
      display_name: `${template.label} ${watch('name')}`,
      description: template.description,
      is_required: action === 'view',  // View is typically required
      default_roles: action === 'delete' || action === 'manage'
        ? ['tenant_admin']
        : ['tenant_admin', 'staff']
    });
  };

  const onSubmit = async (data: any) => {
    setIsSubmitting(true);
    try {
      const response = await fetch('/api/licensing/features', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      if (!response.ok) throw new Error('Failed to create feature');

      toast.success('Feature created successfully!');
      onClose();
    } catch (error) {
      toast.error('Failed to create feature');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Feature - Step {step} of 5</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Step 3: Permission Definition */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Define Permissions</h3>
                <p className="text-sm text-gray-500">
                  Category: <strong>{category || 'Not set'}</strong>
                </p>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <p className="text-sm font-medium mb-2">Quick Add Common Permissions:</p>
                <div className="flex flex-wrap gap-2">
                  {ACTION_TEMPLATES.map(template => (
                    <Button
                      key={template.action}
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => addPermissionFromTemplate(template.action)}
                      disabled={!category}
                    >
                      <PlusIcon className="w-4 h-4 mr-1" />
                      {template.label}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                {fields.map((field, index) => (
                  <div key={field.id} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium">Permission #{index + 1}</h4>
                      {fields.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => remove(index)}
                        >
                          <TrashIcon className="w-4 h-4" />
                        </Button>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium mb-1">
                          Permission Code *
                        </label>
                        <Input
                          {...register(`permissions.${index}.code`)}
                          placeholder="e.g., members:view"
                        />
                        {errors.permissions?.[index]?.code && (
                          <p className="text-sm text-red-600 mt-1">
                            {errors.permissions[index]?.code?.message}
                          </p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-1">
                          Display Name *
                        </label>
                        <Input
                          {...register(`permissions.${index}.display_name`)}
                          placeholder="e.g., View Members"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Description
                      </label>
                      <Input
                        {...register(`permissions.${index}.description`)}
                        placeholder="What does this permission allow?"
                      />
                    </div>

                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id={`required-${index}`}
                        checked={watch(`permissions.${index}.is_required`)}
                        onCheckedChange={(checked) =>
                          setValue(`permissions.${index}.is_required`, !!checked)
                        }
                      />
                      <label htmlFor={`required-${index}`} className="text-sm">
                        Required (must be granted for feature to work)
                      </label>
                    </div>
                  </div>
                ))}
              </div>

              <Button
                type="button"
                variant="outline"
                onClick={() => append({
                  code: `${category}:`,
                  display_name: '',
                  description: '',
                  is_required: false,
                  default_roles: ['tenant_admin']
                })}
                className="w-full"
              >
                <PlusIcon className="w-4 h-4 mr-2" />
                Add Custom Permission
              </Button>

              <div className="flex justify-between pt-4">
                <Button type="button" variant="outline" onClick={() => setStep(2)}>
                  Back
                </Button>
                <div className="space-x-3">
                  <Button type="button" variant="outline" onClick={onClose}>
                    Cancel
                  </Button>
                  <Button type="button" onClick={() => setStep(4)}>
                    Next: Default Roles
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Default Role Assignment */}
          {step === 4 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Default Role Assignments</h3>
              <p className="text-sm text-gray-600">
                Select which roles should have each permission by default. Tenant Admins can
                customize these assignments later.
              </p>

              <div className="space-y-6">
                {fields.map((field, index) => (
                  <div key={field.id} className="border rounded-lg p-4">
                    <h4 className="font-medium mb-3">
                      {watch(`permissions.${index}.display_name`) || 'Permission'}
                    </h4>
                    <p className="text-sm text-gray-500 mb-3">
                      Code: <code className="bg-gray-100 px-2 py-1 rounded">
                        {watch(`permissions.${index}.code`)}
                      </code>
                    </p>

                    <div className="grid grid-cols-2 gap-3">
                      {ROLE_OPTIONS.map(role => {
                        const isChecked = watch(`permissions.${index}.default_roles`)?.includes(role.key);
                        return (
                          <div
                            key={role.key}
                            className="flex items-start space-x-2 p-2 border rounded hover:bg-gray-50"
                          >
                            <Checkbox
                              id={`perm-${index}-role-${role.key}`}
                              checked={isChecked}
                              disabled={role.key === 'tenant_admin'}
                              onCheckedChange={(checked) => {
                                const current = watch(`permissions.${index}.default_roles`) || [];
                                const updated = checked
                                  ? [...current, role.key]
                                  : current.filter(r => r !== role.key);
                                setValue(`permissions.${index}.default_roles`, updated);
                              }}
                            />
                            <div className="flex-1">
                              <label
                                htmlFor={`perm-${index}-role-${role.key}`}
                                className="text-sm font-medium block"
                              >
                                {role.label}
                                {role.key === 'tenant_admin' && ' (Always)'}
                              </label>
                              <p className="text-xs text-gray-500">{role.description}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-between pt-4">
                <Button type="button" variant="outline" onClick={() => setStep(3)}>
                  Back
                </Button>
                <div className="space-x-3">
                  <Button type="button" variant="outline" onClick={onClose}>
                    Cancel
                  </Button>
                  <Button type="button" onClick={() => setStep(5)}>
                    Next: Review
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Step 5: Review */}
          {step === 5 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Review & Create</h3>

              <div className="bg-gray-50 p-4 rounded-lg space-y-4">
                <div>
                  <h4 className="font-medium">Feature Information</h4>
                  <dl className="mt-2 grid grid-cols-2 gap-2 text-sm">
                    <dt className="text-gray-600">Code:</dt>
                    <dd className="font-mono">{watch('code')}</dd>
                    <dt className="text-gray-600">Name:</dt>
                    <dd>{watch('name')}</dd>
                    <dt className="text-gray-600">Category:</dt>
                    <dd>{watch('category')}</dd>
                  </dl>
                </div>

                <div>
                  <h4 className="font-medium">Permissions ({fields.length})</h4>
                  <div className="mt-2 space-y-2">
                    {fields.map((field, index) => (
                      <div key={field.id} className="bg-white p-3 rounded border text-sm">
                        <div className="font-mono font-medium">
                          {watch(`permissions.${index}.code`)}
                        </div>
                        <div className="text-gray-600 mt-1">
                          {watch(`permissions.${index}.display_name`)}
                        </div>
                        <div className="mt-1 flex flex-wrap gap-1">
                          {watch(`permissions.${index}.default_roles`)?.map((role: string) => (
                            <span
                              key={role}
                              className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs"
                            >
                              {role}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex justify-between pt-4">
                <Button type="button" variant="outline" onClick={() => setStep(4)}>
                  Back
                </Button>
                <div className="space-x-3">
                  <Button type="button" variant="outline" onClick={onClose}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? 'Creating...' : 'Create Feature'}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </form>
      </DialogContent>
    </Dialog>
  );
}
```

---

## Developer Documentation Example

```typescript
// Example: Using permissions in code

import { Gate } from '@/lib/access-gate';

// Check single permission
const gate = Gate.withPermission('members:view');
await gate.verify(userId);

// Check multiple permissions (all required)
const gate = Gate.withPermission(['members:view', 'members:export'], 'all');

// Check for any permission
const gate = Gate.withPermission(['members:edit', 'members:manage'], 'any');

// In API route
export const DELETE = gateProtected(
  Gate.withPermission('members:delete'),
  getUserIdFromRequest
)(async (request) => {
  // Protected logic
  return NextResponse.json({ success: true });
});

// In server component
import { ProtectedSection } from '@/components/access-gate';

<ProtectedSection userId={userId} permissions="members:edit">
  <EditMemberForm />
</ProtectedSection>
```

---

## Summary

This updated implementation plan now correctly focuses on **permissions/rights** (like `members:view`, `finance:delete`) rather than role definitions. The key improvements:

1. ✅ **Product Owner defines permissions** when creating features
2. ✅ **Default role templates** suggest which roles should have which permissions
3. ✅ **Automatic provisioning** creates permissions in tenant RBAC when licensed
4. ✅ **Tenant Admin flexibility** to assign permissions to any role
5. ✅ **Developer-friendly** permission codes for consistent access control

The system is now permission-centric, giving tenants maximum flexibility while providing sensible defaults!