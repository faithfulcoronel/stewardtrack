# Epic 3: Simplified RBAC System

**Release:** Beta - March 2026
**Timeline:** Weeks 5-6 (February 3-16, 2026)
**Duration:** 2 weeks
**Priority:** P0 (Blocking - Critical Infrastructure)
**Epic Owner:** Backend Team
**Dependencies:** Epic 1 (JWT Authentication)

## Epic Overview

Implement and review the **simplified 2-layer RBAC system** (Roles → Permissions) with multi-role support, delegation, and feature-permission mapping. This epic has two major components:

### Component 1: RBAC Core System (REVIEW & FIX)
Review and fix the existing simplified 2-layer RBAC architecture:
- Direct Role → Permission mapping (no bundles)
- Multi-role support for users
- Role delegation with scope and time limits
- Feature-to-permission mapping for license control
- **License and permission guards** on all pages and features
- **Metadata page access control** enforcement

### Component 2: License Studio (REVIEW & FIX)
Review and fix the existing License Management Studio UI that already exists in the codebase:
- Product Offerings management
- License Features catalog
- Feature Bundles configuration
- License assignment and monitoring
- Compliance checking and health monitoring

**Critical Infrastructure:** This epic must be completed before onboarding, as it controls all access throughout the system and integrates with the licensing/payment flow.

## RBAC Architecture (Simplified)

### Core Principles

**Before Simplification (Old - 3 Layers):**
```
Users → Roles → Permission Bundles → Permissions ❌ TOO COMPLEX
```

**After Simplification (New - 2 Layers):**
```
Users → Roles → Permissions ✅ SIMPLE
```

### Entity Relationships

```
┌─────────────────────────────────────────────────┐
│                   RBAC System                   │
├─────────────────────────────────────────────────┤
│                                                 │
│  Users (auth.users)                            │
│    │                                            │
│    ├──> user_roles (many-to-many)             │
│    │       │                                    │
│    │       └──> Roles                          │
│    │              │                             │
│    │              └──> role_permissions        │
│    │                      │                     │
│    │                      └──> Permissions     │
│    │                                            │
│    └──> delegations (temporary role grants)   │
│                                                 │
│  Features → feature_permissions → Permissions  │
│  (License features mapped to permissions)      │
│                                                 │
└─────────────────────────────────────────────────┘
```

### Key Changes from Original System

1. **Removed:** `permission_bundles` table
2. **Removed:** `role_permission_bundles` table
3. **Removed:** `bundle_permissions` table
4. **Simplified:** Direct `role_permissions` mapping
5. **Simplified:** Delegation assigns complete roles (not granular permissions)
6. **Added:** Multi-role support (users can have multiple roles)
7. **Added:** Feature-to-permission mapping for license control

---

## Database Schema

**File:** `supabase/migrations/20250128000007_simplified_rbac_system.sql`

```sql
-- =====================================================
-- ROLES TABLE
-- Tenant-scoped or system-scoped roles
-- =====================================================
CREATE TABLE IF NOT EXISTS roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,

  -- Role details
  name TEXT NOT NULL,
  display_name TEXT NOT NULL,
  description TEXT,

  -- Scope
  scope TEXT NOT NULL DEFAULT 'tenant' CHECK (scope IN ('system', 'tenant')),

  -- System roles cannot be deleted/modified
  is_system BOOLEAN DEFAULT FALSE,

  -- Delegation
  is_delegatable BOOLEAN DEFAULT FALSE,

  -- Status
  is_active BOOLEAN DEFAULT TRUE,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Unique constraint: system roles have NULL tenant_id
  UNIQUE NULLS NOT DISTINCT (tenant_id, name)
);

-- Indexes
CREATE INDEX idx_roles_tenant_id ON roles(tenant_id);
CREATE INDEX idx_roles_scope ON roles(scope);
CREATE INDEX idx_roles_is_active ON roles(is_active);

-- RLS Policies
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation_select_roles" ON roles
  FOR SELECT USING (
    tenant_id IN (SELECT get_user_tenant_ids()) OR
    (tenant_id IS NULL AND scope = 'system')
  );

CREATE POLICY "tenant_admin_manage_roles" ON roles
  FOR ALL USING (
    tenant_id IN (SELECT get_user_tenant_ids()) AND
    is_system = FALSE AND
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid()
        AND r.name = 'tenant_admin'
    )
  );

-- =====================================================
-- PERMISSIONS TABLE
-- Granular access permissions
-- =====================================================
CREATE TABLE IF NOT EXISTS permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Permission details
  name TEXT NOT NULL UNIQUE, -- e.g., "members:read", "finance:write"
  display_name TEXT NOT NULL,
  description TEXT,

  -- Category (for UI grouping)
  category TEXT NOT NULL, -- e.g., "members", "finance", "rbac"

  -- System permissions cannot be deleted
  is_system BOOLEAN DEFAULT TRUE,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_permissions_category ON permissions(category);
CREATE INDEX idx_permissions_name ON permissions(name);

-- RLS Policies
ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "all_users_view_permissions" ON permissions
  FOR SELECT USING (TRUE);

-- =====================================================
-- ROLE_PERMISSIONS TABLE (SIMPLIFIED)
-- Direct mapping: Roles → Permissions (NO BUNDLES)
-- =====================================================
CREATE TABLE IF NOT EXISTS role_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(role_id, permission_id)
);

-- Indexes
CREATE INDEX idx_role_permissions_role_id ON role_permissions(role_id);
CREATE INDEX idx_role_permissions_permission_id ON role_permissions(permission_id);

-- RLS Policies
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_view_role_permissions" ON role_permissions
  FOR SELECT USING (TRUE);

CREATE POLICY "tenant_admin_manage_role_permissions" ON role_permissions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM roles r
      JOIN user_roles ur ON ur.role_id = r.id
      WHERE r.id = role_permissions.role_id
        AND ur.user_id = auth.uid()
        AND r.name = 'tenant_admin'
    )
  );

-- =====================================================
-- USER_ROLES TABLE
-- Many-to-many: Users can have MULTIPLE roles
-- =====================================================
CREATE TABLE IF NOT EXISTS user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  -- Assignment metadata
  assigned_by UUID REFERENCES auth.users(id),
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(user_id, role_id, tenant_id)
);

-- Indexes
CREATE INDEX idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX idx_user_roles_role_id ON user_roles(role_id);
CREATE INDEX idx_user_roles_tenant_id ON user_roles(tenant_id);

-- RLS Policies
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_view_own_roles" ON user_roles
  FOR SELECT USING (
    user_id = auth.uid() OR
    tenant_id IN (SELECT get_user_tenant_ids())
  );

CREATE POLICY "tenant_admin_manage_user_roles" ON user_roles
  FOR ALL USING (
    tenant_id IN (SELECT get_user_tenant_ids()) AND
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid()
        AND r.tenant_id = user_roles.tenant_id
        AND r.name = 'tenant_admin'
    )
  );

-- =====================================================
-- DELEGATIONS TABLE (SIMPLIFIED)
-- Temporary role assignments with scope and time limits
-- =====================================================
CREATE TABLE IF NOT EXISTS delegations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  -- Delegation parties
  delegator_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  delegatee_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Role being delegated (complete role, not granular permissions)
  role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,

  -- Scope limitation
  scope_type TEXT CHECK (scope_type IN ('campus', 'ministry', 'event', 'global')),
  scope_id UUID, -- Foreign key to campus, ministry, or event

  -- Time limitation
  start_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  end_date TIMESTAMPTZ,

  -- Status
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'revoked', 'expired')),

  -- Revocation
  revoked_by UUID REFERENCES auth.users(id),
  revoked_at TIMESTAMPTZ,
  revoke_reason TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_delegations_tenant_id ON delegations(tenant_id);
CREATE INDEX idx_delegations_delegator_id ON delegations(delegator_id);
CREATE INDEX idx_delegations_delegatee_id ON delegations(delegatee_id);
CREATE INDEX idx_delegations_role_id ON delegations(role_id);
CREATE INDEX idx_delegations_status ON delegations(status);
CREATE INDEX idx_delegations_end_date ON delegations(end_date);

-- RLS Policies
ALTER TABLE delegations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_view_delegations" ON delegations
  FOR SELECT USING (
    tenant_id IN (SELECT get_user_tenant_ids()) AND
    (delegator_id = auth.uid() OR delegatee_id = auth.uid())
  );

CREATE POLICY "users_create_delegations" ON delegations
  FOR INSERT WITH CHECK (
    tenant_id IN (SELECT get_user_tenant_ids()) AND
    delegator_id = auth.uid()
  );

-- =====================================================
-- FEATURE_PERMISSIONS TABLE
-- Maps license features to required permissions
-- =====================================================
CREATE TABLE IF NOT EXISTS feature_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Feature (from license_features table)
  feature_name TEXT NOT NULL, -- e.g., "advanced_reports", "multi_role_support"

  -- Required permission
  permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(feature_name, permission_id)
);

-- Indexes
CREATE INDEX idx_feature_permissions_feature_name ON feature_permissions(feature_name);
CREATE INDEX idx_feature_permissions_permission_id ON feature_permissions(permission_id);

-- RLS Policies
ALTER TABLE feature_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "all_users_view_feature_permissions" ON feature_permissions
  FOR SELECT USING (TRUE);

-- =====================================================
-- TRIGGERS
-- =====================================================
CREATE TRIGGER update_roles_updated_at
  BEFORE UPDATE ON roles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_permissions_updated_at
  BEFORE UPDATE ON permissions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_delegations_updated_at
  BEFORE UPDATE ON delegations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- FUNCTION: Get user's effective permissions
-- Combines direct role permissions + delegated permissions
-- =====================================================
CREATE OR REPLACE FUNCTION get_user_effective_permissions(
  p_user_id UUID,
  p_tenant_id UUID
)
RETURNS TABLE(permission_name TEXT) AS $$
BEGIN
  RETURN QUERY
  -- Permissions from direct role assignments
  SELECT DISTINCT p.name
  FROM user_roles ur
  JOIN roles r ON ur.role_id = r.id
  JOIN role_permissions rp ON rp.role_id = r.id
  JOIN permissions p ON p.id = rp.permission_id
  WHERE ur.user_id = p_user_id
    AND ur.tenant_id = p_tenant_id
    AND r.is_active = TRUE

  UNION

  -- Permissions from active delegations
  SELECT DISTINCT p.name
  FROM delegations d
  JOIN roles r ON d.role_id = r.id
  JOIN role_permissions rp ON rp.role_id = r.id
  JOIN permissions p ON p.id = rp.permission_id
  WHERE d.delegatee_id = p_user_id
    AND d.tenant_id = p_tenant_id
    AND d.status = 'active'
    AND (d.end_date IS NULL OR d.end_date > NOW())
    AND r.is_active = TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- FUNCTION: Check if user has permission
-- =====================================================
CREATE OR REPLACE FUNCTION user_has_permission(
  p_user_id UUID,
  p_tenant_id UUID,
  p_permission_name TEXT
)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM get_user_effective_permissions(p_user_id, p_tenant_id)
    WHERE permission_name = p_permission_name
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- SEED DEFAULT PERMISSIONS
-- =====================================================
INSERT INTO permissions (name, display_name, description, category, is_system)
VALUES
  -- Members
  ('members:read', 'View Members', 'View member profiles and directory', 'members', TRUE),
  ('members:write', 'Manage Members', 'Create, update, and delete members', 'members', TRUE),
  ('members:export', 'Export Members', 'Export member data', 'members', TRUE),

  -- Finance
  ('finance:read', 'View Finance', 'View donations and financial records', 'finance', TRUE),
  ('finance:write', 'Manage Finance', 'Record donations and expenses', 'finance', TRUE),
  ('finance:approve', 'Approve Expenses', 'Approve expense requests', 'finance', TRUE),

  -- RBAC
  ('rbac:read', 'View RBAC', 'View roles and permissions', 'rbac', TRUE),
  ('rbac:write', 'Manage RBAC', 'Create and modify roles', 'rbac', TRUE),
  ('rbac:assign', 'Assign Roles', 'Assign roles to users', 'rbac', TRUE),
  ('rbac:delegate', 'Delegate Roles', 'Delegate roles to other users', 'rbac', TRUE),

  -- Reports
  ('reports:read', 'View Reports', 'View and run reports', 'reports', TRUE),
  ('reports:advanced', 'Advanced Reports', 'Access advanced reporting features', 'reports', TRUE),
  ('reports:premium', 'Premium Reports', 'Access premium reporting features', 'reports', TRUE),

  -- Settings
  ('settings:read', 'View Settings', 'View system settings', 'settings', TRUE),
  ('settings:write', 'Manage Settings', 'Modify system settings', 'settings', TRUE),

  -- Audit
  ('audit:read', 'View Audit Logs', 'View system audit logs', 'audit', TRUE)
ON CONFLICT (name) DO NOTHING;

-- =====================================================
-- SEED DEFAULT SYSTEM ROLES
-- These roles are created at the SYSTEM level (tenant_id = NULL)
-- They serve as templates that tenants copy
-- =====================================================
INSERT INTO roles (name, display_name, description, scope, is_system, is_delegatable, tenant_id)
VALUES
  ('tenant_admin', 'Tenant Administrator', 'Full administrative access to tenant', 'tenant', TRUE, TRUE, NULL),
  ('staff', 'Staff Member', 'Church staff with elevated permissions', 'tenant', TRUE, TRUE, NULL),
  ('volunteer', 'Volunteer', 'Ministry volunteer with limited access', 'tenant', TRUE, TRUE, NULL),
  ('member', 'Church Member', 'Regular church member with basic access', 'tenant', TRUE, FALSE, NULL)
ON CONFLICT DO NOTHING;

-- =====================================================
-- SEED ROLE-PERMISSION MAPPINGS (for system roles)
-- =====================================================

-- Get role IDs (system roles have tenant_id = NULL)
DO $$
DECLARE
  v_admin_role_id UUID;
  v_staff_role_id UUID;
  v_volunteer_role_id UUID;
  v_member_role_id UUID;
BEGIN
  -- Get system role IDs
  SELECT id INTO v_admin_role_id FROM roles WHERE name = 'tenant_admin' AND tenant_id IS NULL;
  SELECT id INTO v_staff_role_id FROM roles WHERE name = 'staff' AND tenant_id IS NULL;
  SELECT id INTO v_volunteer_role_id FROM roles WHERE name = 'volunteer' AND tenant_id IS NULL;
  SELECT id INTO v_member_role_id FROM roles WHERE name = 'member' AND tenant_id IS NULL;

  -- Tenant Admin: ALL permissions
  INSERT INTO role_permissions (role_id, permission_id)
  SELECT v_admin_role_id, id FROM permissions
  ON CONFLICT DO NOTHING;

  -- Staff: Most permissions (no RBAC management)
  INSERT INTO role_permissions (role_id, permission_id)
  SELECT v_staff_role_id, id FROM permissions
  WHERE category IN ('members', 'finance', 'reports', 'settings')
    AND name NOT IN ('finance:approve', 'rbac:write', 'rbac:assign')
  ON CONFLICT DO NOTHING;

  -- Volunteer: Read access + basic write
  INSERT INTO role_permissions (role_id, permission_id)
  SELECT v_volunteer_role_id, id FROM permissions
  WHERE name IN (
    'members:read',
    'finance:read',
    'reports:read'
  )
  ON CONFLICT DO NOTHING;

  -- Member: Read-only access
  INSERT INTO role_permissions (role_id, permission_id)
  SELECT v_member_role_id, id FROM permissions
  WHERE name IN (
    'members:read',
    'reports:read'
  )
  ON CONFLICT DO NOTHING;
END $$;

-- =====================================================
-- SEED FEATURE-PERMISSION MAPPINGS
-- =====================================================
INSERT INTO feature_permissions (feature_name, permission_id)
SELECT 'advanced_reports', id FROM permissions WHERE name = 'reports:advanced'
UNION ALL
SELECT 'premium_reports', id FROM permissions WHERE name = 'reports:premium'
UNION ALL
SELECT 'multi_role_support', id FROM permissions WHERE name = 'rbac:assign'
UNION ALL
SELECT 'role_delegation', id FROM permissions WHERE name = 'rbac:delegate'
ON CONFLICT DO NOTHING;
```

---

## License & Permission Guard System

### Overview

The system enforces **two-level access control** on all pages and features:

1. **Permission Guards** - User must have required RBAC permission(s)
2. **License Guards** - Tenant must have active license feature grant

Both guards must pass for access to be granted. This applies to:
- **Metadata pages** (defined in XML)
- **API endpoints** (server-side enforcement)
- **UI components** (client-side hiding/disabling)
- **Features** (license-gated functionality)

### Guard Enforcement Layers

#### Layer 1: Metadata Pages (XML-based)

**Location:** `metadata/authoring/blueprints/**/*.xml`

Each metadata page defines RBAC rules:

```xml
<page id="members-list">
  <rbac>
    <permissions>
      <permission name="members:read" required="true" />
    </permissions>
    <features>
      <feature name="member_management" required="true" />
    </features>
  </rbac>
  <!-- Page content -->
</page>
```

**Resolver enforcement:** `src/lib/metadata/resolver.ts` checks user permissions and tenant feature grants before rendering page.

#### Layer 2: API Endpoints (Server-side)

**Pattern:**
```typescript
// src/app/api/members/route.ts
import { requirePermission, requireFeature } from '@/lib/server/auth-context';

export async function GET(request: NextRequest) {
  // Guard 1: Check permission
  await requirePermission('members:read');

  // Guard 2: Check license feature
  await requireFeature('member_management');

  // Proceed with API logic
}
```

**Utilities:** `src/lib/server/auth-context.ts`

#### Layer 3: UI Components (Client-side)

**Pattern:**
```typescript
// src/components/members/MemberActions.tsx
import { usePermissions } from '@/hooks/usePermissions';
import { useFeatures } from '@/hooks/useFeatures';

export function MemberActions() {
  const { hasPermission } = usePermissions();
  const { hasFeature } = useFeatures();

  const canEdit = hasPermission('members:write') && hasFeature('member_management');

  return (
    <Button disabled={!canEdit}>Edit</Button>
  );
}
```

**Hooks:** `src/hooks/usePermissions.ts`, `src/hooks/useFeatures.ts`

#### Layer 4: Service Layer (Business logic)

**Pattern:**
```typescript
// src/services/MemberService.ts
export class MemberService {
  async createMember(data: CreateMemberDto, userId: string, tenantId: string) {
    // Validate permissions via RbacCoreService
    const hasPermission = await this.rbacService.userHasPermission(
      userId,
      tenantId,
      'members:write'
    );

    if (!hasPermission) {
      throw new Error('Permission denied');
    }

    // Validate license feature
    const hasFeature = await this.licenseFeatureService.tenantHasFeature(
      tenantId,
      'member_management'
    );

    if (!hasFeature) {
      throw new Error('Feature not licensed');
    }

    // Proceed with business logic
  }
}
```

### Review Checklist: Guard Enforcement

#### Metadata Pages
- [ ] All metadata pages have `<rbac>` section with required permissions
- [ ] All metadata pages have `<features>` section with required license features
- [ ] Resolver enforces RBAC rules before rendering
- [ ] Users without permission see 403 error
- [ ] Tenants without feature grant see feature upsell message

#### API Endpoints
- [ ] All protected endpoints call `requirePermission()`
- [ ] All feature-gated endpoints call `requireFeature()`
- [ ] Endpoints return 403 for permission denied
- [ ] Endpoints return 402 (Payment Required) for missing feature
- [ ] Error messages indicate which permission/feature is missing

#### UI Components
- [ ] Components use `usePermissions()` hook to check permissions
- [ ] Components use `useFeatures()` hook to check license features
- [ ] Buttons/actions are disabled when permission/feature missing
- [ ] Feature upsell prompts shown for premium features
- [ ] No client-side bypass possible (server validates)

#### Service Layer
- [ ] Services validate permissions before operations
- [ ] Services validate license features before feature use
- [ ] Proper error messages thrown for access denial
- [ ] Audit logs capture permission denials

### Common Guard Patterns

#### Pattern 1: Single Permission Guard
```
Permission: members:read
Feature: member_management
Use case: View member list
```

#### Pattern 2: Multiple Permissions (OR logic)
```
Permissions: finance:read OR finance:write
Feature: basic_donations
Use case: View donation reports
```

#### Pattern 3: Multiple Permissions (AND logic)
```
Permissions: finance:write AND finance:approve
Feature: expense_management
Use case: Approve expense requests
```

#### Pattern 4: Tiered Features
```
Standard: basic_reports + reports:read
Advanced: advanced_reports + reports:advanced
Premium: premium_reports + reports:premium
Use case: Reporting suite access
```

### Testing Guard Enforcement

**Test Matrix:**

| Guard Type | Test Scenario | Expected Result |
|------------|---------------|-----------------|
| Permission Only | User has permission, tenant has feature | ✅ Access granted |
| Permission Only | User lacks permission, tenant has feature | ❌ 403 Permission denied |
| Feature Only | User has permission, tenant lacks feature | ❌ 402 Feature not licensed |
| Combined | User lacks permission, tenant lacks feature | ❌ 403 Permission denied (check permission first) |
| Combined | User has permission, tenant has feature | ✅ Access granted |

**Test with different roles:**
- Tenant Admin (all permissions)
- Staff (most permissions, some features)
- Volunteer (read-only, basic features)
- Member (minimal permissions, no admin features)

**Test with different license tiers:**
- Essential (core features only)
- Professional (core + advanced features)
- Enterprise (all features except premium)
- Premium (all features)

### Key Files to Review

**Guard Utilities:**
- `src/lib/server/auth-context.ts` - `requirePermission()`, `requireFeature()`
- `src/lib/metadata/resolver.ts` - Metadata RBAC enforcement
- `src/hooks/usePermissions.ts` - Client-side permission checks
- `src/hooks/useFeatures.ts` - Client-side feature checks

**Guard Configuration:**
- `metadata/authoring/blueprints/**/*.xml` - RBAC rules in metadata
- `src/services/RbacCoreService.ts` - Permission validation
- `src/services/LicenseFeatureService.ts` - Feature grant validation

**Example Implementations:**
- `src/app/api/members/route.ts` - API guard example
- `src/components/members/MemberActions.tsx` - UI guard example
- `src/services/MemberService.ts` - Service guard example

---

## User Stories

### Story 3.1: RBAC Core Service (Simplified)

**As a** backend developer
**I want** a simplified RBAC service without permission bundles
**So that** role management is straightforward and maintainable

**Priority:** P0
**Story Points:** 13

#### Implementation

**File:** `src/services/RbacCoreService.ts`

```typescript
import { injectable, inject } from 'inversify';
import { TYPES } from '@/lib/types';
import { getSupabaseServerClient } from '@/lib/supabase/server';

export interface Role {
  id: string;
  tenant_id?: string;
  name: string;
  display_name: string;
  description?: string;
  scope: 'system' | 'tenant';
  is_system: boolean;
  is_delegatable: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Permission {
  id: string;
  name: string;
  display_name: string;
  description?: string;
  category: string;
  is_system: boolean;
}

export interface CreateRoleDto {
  name: string;
  display_name: string;
  description?: string;
  is_delegatable?: boolean;
  permission_ids: string[]; // Direct permission assignment
}

@injectable()
export class RbacCoreService {
  /**
   * Create a new role with permissions (simplified - no bundles)
   */
  async createRole(data: CreateRoleDto, tenantId: string): Promise<Role> {
    const supabase = getSupabaseServerClient();

    // 1. Create role
    const { data: role, error: roleError } = await supabase
      .from('roles')
      .insert({
        tenant_id: tenantId,
        name: data.name,
        display_name: data.display_name,
        description: data.description,
        scope: 'tenant',
        is_system: false,
        is_delegatable: data.is_delegatable || false
      })
      .select()
      .single();

    if (roleError) {
      throw new Error(`Failed to create role: ${roleError.message}`);
    }

    // 2. Assign permissions directly to role (NO BUNDLES)
    if (data.permission_ids && data.permission_ids.length > 0) {
      const rolePermissions = data.permission_ids.map(permId => ({
        role_id: role.id,
        permission_id: permId
      }));

      const { error: permError } = await supabase
        .from('role_permissions')
        .insert(rolePermissions);

      if (permError) {
        // Rollback: delete role
        await supabase.from('roles').delete().eq('id', role.id);
        throw new Error(`Failed to assign permissions: ${permError.message}`);
      }
    }

    console.log('Role created (simplified RBAC):', {
      roleId: role.id,
      name: role.name,
      permissionCount: data.permission_ids.length
    });

    return role;
  }

  /**
   * Get role with its permissions
   */
  async getRoleWithPermissions(roleId: string, tenantId: string): Promise<any> {
    const supabase = getSupabaseServerClient();

    const { data: role } = await supabase
      .from('roles')
      .select(`
        *,
        role_permissions!inner(
          permissions(*)
        )
      `)
      .eq('id', roleId)
      .or(`tenant_id.eq.${tenantId},tenant_id.is.null`)
      .single();

    if (!role) {
      throw new Error('Role not found');
    }

    return {
      ...role,
      permissions: role.role_permissions.map((rp: any) => rp.permissions)
    };
  }

  /**
   * Update role permissions (direct assignment, no bundles)
   */
  async updateRolePermissions(
    roleId: string,
    permissionIds: string[],
    tenantId: string
  ): Promise<void> {
    const supabase = getSupabaseServerClient();

    // Verify role belongs to tenant
    const { data: role } = await supabase
      .from('roles')
      .select('id, is_system')
      .eq('id', roleId)
      .eq('tenant_id', tenantId)
      .single();

    if (!role) {
      throw new Error('Role not found or access denied');
    }

    if (role.is_system) {
      throw new Error('Cannot modify system role permissions');
    }

    // Delete existing permissions
    await supabase
      .from('role_permissions')
      .delete()
      .eq('role_id', roleId);

    // Insert new permissions
    if (permissionIds.length > 0) {
      const rolePermissions = permissionIds.map(permId => ({
        role_id: roleId,
        permission_id: permId
      }));

      const { error } = await supabase
        .from('role_permissions')
        .insert(rolePermissions);

      if (error) {
        throw new Error(`Failed to update permissions: ${error.message}`);
      }
    }

    console.log('Role permissions updated:', {
      roleId,
      permissionCount: permissionIds.length
    });
  }

  /**
   * Assign role to user (supports multi-role)
   */
  async assignRoleToUser(
    userId: string,
    roleId: string,
    tenantId: string,
    assignedBy?: string
  ): Promise<void> {
    const supabase = getSupabaseServerClient();

    const { error } = await supabase
      .from('user_roles')
      .insert({
        user_id: userId,
        role_id: roleId,
        tenant_id: tenantId,
        assigned_by: assignedBy
      });

    if (error) {
      if (error.code === '23505') { // Unique violation
        throw new Error('User already has this role');
      }
      throw new Error(`Failed to assign role: ${error.message}`);
    }

    console.log('Role assigned to user:', { userId, roleId });
  }

  /**
   * Remove role from user
   */
  async removeRoleFromUser(userId: string, roleId: string, tenantId: string): Promise<void> {
    const supabase = getSupabaseServerClient();

    const { error } = await supabase
      .from('user_roles')
      .delete()
      .eq('user_id', userId)
      .eq('role_id', roleId)
      .eq('tenant_id', tenantId);

    if (error) {
      throw new Error(`Failed to remove role: ${error.message}`);
    }

    console.log('Role removed from user:', { userId, roleId });
  }

  /**
   * Get user's roles (multi-role support)
   */
  async getUserRoles(userId: string, tenantId: string): Promise<Role[]> {
    const supabase = getSupabaseServerClient();

    const { data } = await supabase
      .from('user_roles')
      .select('roles(*)')
      .eq('user_id', userId)
      .eq('tenant_id', tenantId);

    return (data || []).map((ur: any) => ur.roles);
  }

  /**
   * Get user's effective permissions (from all roles + delegations)
   */
  async getUserEffectivePermissions(userId: string, tenantId: string): Promise<Permission[]> {
    const supabase = getSupabaseServerClient();

    const { data } = await supabase.rpc('get_user_effective_permissions', {
      p_user_id: userId,
      p_tenant_id: tenantId
    });

    if (!data) return [];

    // Get full permission details
    const permissionNames = data.map((p: any) => p.permission_name);

    const { data: permissions } = await supabase
      .from('permissions')
      .select('*')
      .in('name', permissionNames);

    return permissions || [];
  }

  /**
   * Check if user has specific permission
   */
  async userHasPermission(
    userId: string,
    tenantId: string,
    permissionName: string
  ): Promise<boolean> {
    const supabase = getSupabaseServerClient();

    const { data } = await supabase.rpc('user_has_permission', {
      p_user_id: userId,
      p_tenant_id: tenantId,
      p_permission_name: permissionName
    });

    return data === true;
  }

  /**
   * Get all permissions
   */
  async getAllPermissions(): Promise<Permission[]> {
    const supabase = getSupabaseServerClient();

    const { data, error } = await supabase
      .from('permissions')
      .select('*')
      .order('category', { ascending: true })
      .order('name', { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch permissions: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Get all roles for tenant
   */
  async getAllRoles(tenantId: string): Promise<Role[]> {
    const supabase = getSupabaseServerClient();

    const { data, error } = await supabase
      .from('roles')
      .select('*')
      .or(`tenant_id.eq.${tenantId},tenant_id.is.null`)
      .order('name', { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch roles: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Delete role (soft delete - set inactive)
   */
  async deleteRole(roleId: string, tenantId: string): Promise<void> {
    const supabase = getSupabaseServerClient();

    // Verify role belongs to tenant and is not system role
    const { data: role } = await supabase
      .from('roles')
      .select('is_system')
      .eq('id', roleId)
      .eq('tenant_id', tenantId)
      .single();

    if (!role) {
      throw new Error('Role not found or access denied');
    }

    if (role.is_system) {
      throw new Error('Cannot delete system role');
    }

    // Soft delete
    const { error } = await supabase
      .from('roles')
      .update({ is_active: false })
      .eq('id', roleId);

    if (error) {
      throw new Error(`Failed to delete role: ${error.message}`);
    }

    console.log('Role deleted:', { roleId });
  }
}
```

##### Update DI Container

```typescript
// src/lib/types.ts
export const TYPES = {
  // ... existing
  RbacCoreService: Symbol.for('RbacCoreService'),
};

// src/lib/container.ts
import { RbacCoreService } from '@/services/RbacCoreService';

container.bind<RbacCoreService>(TYPES.RbacCoreService).to(RbacCoreService).inRequestScope();
```

---

### Story 3.2: Role Delegation Service (Simplified)

**As a** church administrator
**I want** to delegate complete roles to other users
**So that** I can temporarily grant access without permanent role assignment

**Priority:** P1
**Story Points:** 8

#### Implementation

**File:** `src/services/RbacDelegationService.ts`

```typescript
import { injectable, inject } from 'inversify';
import { TYPES } from '@/lib/types';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import type { RbacCoreService } from './RbacCoreService';

export interface CreateDelegationDto {
  delegatee_id: string;
  role_id: string;
  scope_type?: 'campus' | 'ministry' | 'event' | 'global';
  scope_id?: string;
  end_date?: string;
}

@injectable()
export class RbacDelegationService {
  constructor(
    @inject(TYPES.RbacCoreService)
    private rbacService: RbacCoreService
  ) {}

  /**
   * Delegate a role to another user (simplified - complete role only)
   */
  async delegateRole(
    data: CreateDelegationDto,
    delegatorId: string,
    tenantId: string
  ): Promise<any> {
    const supabase = getSupabaseServerClient();

    // 1. Verify delegator has the role they're delegating
    const delegatorRoles = await this.rbacService.getUserRoles(delegatorId, tenantId);
    const hasRole = delegatorRoles.some(r => r.id === data.role_id);

    if (!hasRole) {
      throw new Error('You can only delegate roles you possess');
    }

    // 2. Verify role is delegatable
    const { data: role } = await supabase
      .from('roles')
      .select('is_delegatable, name')
      .eq('id', data.role_id)
      .single();

    if (!role || !role.is_delegatable) {
      throw new Error('This role cannot be delegated');
    }

    // 3. Create delegation
    const { data: delegation, error } = await supabase
      .from('delegations')
      .insert({
        tenant_id: tenantId,
        delegator_id: delegatorId,
        delegatee_id: data.delegatee_id,
        role_id: data.role_id,
        scope_type: data.scope_type || 'global',
        scope_id: data.scope_id,
        end_date: data.end_date
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create delegation: ${error.message}`);
    }

    console.log('Role delegated:', {
      delegator: delegatorId,
      delegatee: data.delegatee_id,
      role: role.name
    });

    return delegation;
  }

  /**
   * Revoke a delegation
   */
  async revokeDelegation(
    delegationId: string,
    revokedBy: string,
    reason?: string
  ): Promise<void> {
    const supabase = getSupabaseServerClient();

    const { error } = await supabase
      .from('delegations')
      .update({
        status: 'revoked',
        revoked_by: revokedBy,
        revoked_at: new Date().toISOString(),
        revoke_reason: reason
      })
      .eq('id', delegationId);

    if (error) {
      throw new Error(`Failed to revoke delegation: ${error.message}`);
    }

    console.log('Delegation revoked:', { delegationId, revokedBy });
  }

  /**
   * Get active delegations for a user (as delegatee)
   */
  async getUserDelegations(userId: string, tenantId: string): Promise<any[]> {
    const supabase = getSupabaseServerClient();

    const { data } = await supabase
      .from('delegations')
      .select(`
        *,
        roles(*),
        delegator:delegator_id(email, profiles(first_name, last_name))
      `)
      .eq('delegatee_id', userId)
      .eq('tenant_id', tenantId)
      .eq('status', 'active')
      .or('end_date.is.null,end_date.gt.' + new Date().toISOString());

    return data || [];
  }

  /**
   * Get delegations granted by a user (as delegator)
   */
  async getDelegationsGrantedBy(userId: string, tenantId: string): Promise<any[]> {
    const supabase = getSupabaseServerClient();

    const { data } = await supabase
      .from('delegations')
      .select(`
        *,
        roles(*),
        delegatee:delegatee_id(email, profiles(first_name, last_name))
      `)
      .eq('delegator_id', userId)
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false });

    return data || [];
  }
}
```

##### Update DI Container

```typescript
// src/lib/types.ts
export const TYPES = {
  // ... existing
  RbacDelegationService: Symbol.for('RbacDelegationService'),
};

// src/lib/container.ts
import { RbacDelegationService } from '@/services/RbacDelegationService';

container.bind<RbacDelegationService>(TYPES.RbacDelegationService)
  .to(RbacDelegationService)
  .inRequestScope();
```

---

### Story 3.3: RBAC API Endpoints

**As a** frontend developer
**I want** API endpoints for RBAC operations
**So that** I can build role management UI

**Priority:** P0
**Story Points:** 5

#### Implementation

**File:** `src/app/api/rbac/roles/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { container } from '@/lib/container';
import { TYPES } from '@/lib/types';
import type { RbacCoreService } from '@/services/RbacCoreService';
import { getAuthContext, requirePermission } from '@/lib/server/auth-context';
import { z } from 'zod';

const createRoleSchema = z.object({
  name: z.string().min(2).max(50),
  display_name: z.string().min(2).max(100),
  description: z.string().optional(),
  is_delegatable: z.boolean().optional(),
  permission_ids: z.array(z.string().uuid())
});

export async function GET(request: NextRequest) {
  try {
    await requirePermission('rbac:read');
    const authContext = await getAuthContext();

    const rbacService = container.get<RbacCoreService>(TYPES.RbacCoreService);
    const roles = await rbacService.getAllRoles(authContext.tenantId);

    return NextResponse.json({
      success: true,
      data: roles
    });
  } catch (error) {
    console.error('Get roles error:', error);

    return NextResponse.json(
      {
        success: false,
        error: { code: 'FETCH_FAILED', message: 'Failed to fetch roles' }
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await requirePermission('rbac:write');
    const authContext = await getAuthContext();

    const body = await request.json();
    const data = createRoleSchema.parse(body);

    const rbacService = container.get<RbacCoreService>(TYPES.RbacCoreService);
    const role = await rbacService.createRole(data, authContext.tenantId);

    return NextResponse.json({
      success: true,
      data: role
    }, { status: 201 });
  } catch (error) {
    console.error('Create role error:', error);

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'CREATE_FAILED',
          message: error instanceof Error ? error.message : 'Failed to create role'
        }
      },
      { status: 500 }
    );
  }
}
```

**File:** `src/app/api/rbac/permissions/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { container } from '@/lib/container';
import { TYPES } from '@/lib/types';
import type { RbacCoreService } from '@/services/RbacCoreService';
import { requirePermission } from '@/lib/server/auth-context';

export async function GET(request: NextRequest) {
  try {
    await requirePermission('rbac:read');

    const rbacService = container.get<RbacCoreService>(TYPES.RbacCoreService);
    const permissions = await rbacService.getAllPermissions();

    // Group by category
    const grouped = permissions.reduce((acc, perm) => {
      if (!acc[perm.category]) {
        acc[perm.category] = [];
      }
      acc[perm.category].push(perm);
      return acc;
    }, {} as Record<string, any[]>);

    return NextResponse.json({
      success: true,
      data: permissions,
      grouped
    });
  } catch (error) {
    console.error('Get permissions error:', error);

    return NextResponse.json(
      {
        success: false,
        error: { code: 'FETCH_FAILED', message: 'Failed to fetch permissions' }
      },
      { status: 500 }
    );
  }
}
```

---

## License Studio Review & Fix

### Overview

The License Studio is an **existing admin interface** for managing the licensing system. This section focuses on **reviewing and fixing** the existing functionality, NOT building new features.

**Location:** `/admin/licensing/*`

**Key Modules to Review:**
1. Product Offerings management
2. License Features catalog
3. Feature Bundles configuration
4. License assignment and tracking
5. Compliance checking
6. Health monitoring

### License Studio Modules

#### 1. Product Offerings Management

**Route:** `/admin/licensing/product-offerings`

**Existing Features to Verify:**
- [ ] Dashboard shows all product offerings (Essential, Professional, Enterprise, Premium)
- [ ] List view displays offerings with pricing and status
- [ ] Create/Edit offering form works
- [ ] Pricing configuration (monthly/annual) saves correctly
- [ ] Feature bundle assignment to offerings works
- [ ] Activate/Deactivate offering functionality
- [ ] Sort order changes are reflected

**Common Issues to Check:**
- Pricing not updating correctly
- Feature bundles not linking properly
- Inactive offerings still showing in public API
- Sort order not persisting

#### 2. License Features Catalog

**Route:** `/admin/licensing/features`

**Existing Features to Verify:**
- [ ] List all license features with categories
- [ ] Create new feature with feature_key, name, description
- [ ] Edit existing features
- [ ] Feature category assignment (core, advanced, premium)
- [ ] Feature activation/deactivation
- [ ] Feature usage tracking displays correctly

**Common Issues to Check:**
- Feature keys not unique
- Category filtering not working
- Deleted features breaking feature bundles
- Usage metrics not accurate

#### 3. Feature Bundles Configuration

**Route:** `/admin/licensing/feature-bundles`

**Existing Features to Verify:**
- [ ] View bundles by product offering
- [ ] Add features to bundle
- [ ] Remove features from bundle
- [ ] Mark features as included/excluded
- [ ] Bundle inheritance logic (if applicable)
- [ ] Preview what features each plan includes

**Common Issues to Check:**
- Features not properly linked to bundles
- Bundle changes not reflecting in tenant grants
- Circular dependencies in bundle inheritance
- UI not showing correct included/excluded state

#### 4. License Assignment & Tracking

**Route:** `/admin/licensing/licenses`

**Existing Features to Verify:**
- [ ] List all licenses by tenant
- [ ] View license details (plan, status, expiry)
- [ ] Assign license to tenant
- [ ] Upgrade/Downgrade license plan
- [ ] Suspend/Reactivate license
- [ ] License history/audit log displays
- [ ] Expiry date tracking and warnings

**Common Issues to Check:**
- License status not updating after payment
- Expiry warnings not showing
- Upgrade/downgrade not granting/revoking features correctly
- Audit log missing entries

#### 5. Tenant Feature Grants

**Route:** `/admin/licensing/feature-grants`

**Existing Features to Verify:**
- [ ] View all granted features per tenant
- [ ] Manually grant features (for testing/support)
- [ ] Revoke features
- [ ] See grant history (who granted, when)
- [ ] Feature grant status (active, expired, revoked)
- [ ] Bulk grant features from plan

**Common Issues to Check:**
- Manual grants not persisting
- Revoked features still accessible
- Grant history incomplete
- Bulk operations failing silently

#### 6. Compliance Checking

**Route:** `/admin/licensing/compliance`

**Existing Features to Verify:**
- [ ] Dashboard shows compliance status per tenant
- [ ] Identify tenants using features without license
- [ ] Show license violations (expired, exceeded limits)
- [ ] Compliance reports export
- [ ] Automated compliance alerts

**Common Issues to Check:**
- False positive violations
- Compliance check not running
- Reports showing incorrect data
- Alerts not triggering

#### 7. License Health Monitoring

**Route:** `/admin/licensing/health`

**Existing Features to Verify:**
- [ ] Overall license system health status
- [ ] Expiring licenses list (next 30 days)
- [ ] Trial licenses status
- [ ] Revenue metrics (active subscriptions)
- [ ] Usage statistics by feature
- [ ] System health warnings

**Common Issues to Check:**
- Health metrics not updating
- Expiry warnings missing tenants
- Revenue calculations incorrect
- Usage stats not accurate

### Review Checklist

#### Phase 1: Metadata Verification (Days 1-2)

**For each License Studio module:**
- [ ] Verify XML metadata exists in `metadata/authoring/blueprints/licensing/`
- [ ] Confirm all pages follow Dashboard → List → AddEdit → Profile pattern
- [ ] Check component registry has all required licensing components
- [ ] Validate dataSources are properly configured
- [ ] Verify RBAC rules (should require `licensing:admin` permission)
- [ ] Run `npm run metadata:compile` to ensure no validation errors

#### Phase 2: Functional Testing (Days 3-5)

**Test each module systematically:**
- [ ] Product Offerings: Create, edit, activate, deactivate
- [ ] Features: Add, edit, categorize, activate
- [ ] Feature Bundles: Assign features to offerings
- [ ] Licenses: Assign, upgrade, downgrade, suspend
- [ ] Feature Grants: Grant, revoke, view history
- [ ] Compliance: Run checks, view violations
- [ ] Health: Verify metrics accuracy

**Test License & Permission Guards:**
- [ ] Verify metadata pages enforce required permissions (RBAC rules in XML)
- [ ] Test feature flag checks prevent access to unlicensed features
- [ ] Confirm API endpoints validate both permissions and license features
- [ ] Verify UI components hide/disable based on permissions and features
- [ ] Test multi-level guards (permission AND feature required)

#### Phase 3: Integration Testing (Days 6-7)

**Cross-module workflows:**
- [ ] Create product offering → Add features → Assign to tenant → Verify grants
- [ ] Upgrade tenant license → Verify new features granted
- [ ] Downgrade tenant license → Verify features revoked
- [ ] Expire license → Verify compliance violation detected
- [ ] Payment webhook → License activation → Feature grants

#### Phase 4: Bug Fixes (Days 8-10)

**For each bug found:**
1. Document in issue tracker with severity (Critical, High, Medium, Low)
2. Identify root cause (metadata, service, database, UI)
3. Implement fix
4. Test fix thoroughly
5. Update metadata and recompile if needed
6. Verify fix doesn't break other functionality

### Key Services & Files to Review

**Services:**
- `src/services/LicensingService.ts` - Core licensing operations
- `src/services/LicenseFeatureService.ts` - Feature grant management
- `src/services/LicenseValidationService.ts` - Compliance checking
- `src/services/LicenseMonitoringService.ts` - Health monitoring
- `src/services/ProductOfferingService.ts` - Product management

**Repositories:**
- `src/repositories/productOffering.repository.ts`
- `src/repositories/licenseFeature.repository.ts`
- `src/repositories/license.repository.ts`
- `src/repositories/tenantFeatureGrant.repository.ts`

**API Routes:**
- `src/app/api/licensing/product-offerings/*`
- `src/app/api/licensing/features/*`
- `src/app/api/licensing/licenses/*`
- `src/app/api/licensing/feature-grants/*`

**Database Tables:**
- `product_offerings`
- `product_pricing`
- `license_features`
- `license_feature_bundles`
- `licenses`
- `tenant_feature_grants`
- `license_audit_logs`

### Testing Matrix

| Module | Dashboard | List | AddEdit | Integration | RBAC | Bugs Fixed |
|--------|-----------|------|---------|-------------|------|------------|
| Product Offerings | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| License Features | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| Feature Bundles | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| Licenses | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| Feature Grants | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| Compliance | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| Health | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |

### Success Criteria

- ✅ All 7 License Studio modules reviewed and tested
- ✅ All CRUD operations work correctly
- ✅ Feature grant flow works end-to-end
- ✅ License assignment triggers feature grants
- ✅ Compliance checking identifies violations accurately
- ✅ Health monitoring displays correct metrics
- ✅ All bugs found are documented and fixed
- ✅ RBAC permissions enforced (`licensing:admin` required)
- ✅ Integration with payment system verified
- ✅ No new features added (review-only scope maintained)

---

## Testing Strategy

### Unit Tests
- [ ] RbacCoreService creates role with permissions
- [ ] RbacCoreService assigns multiple roles to user
- [ ] RbacCoreService calculates effective permissions
- [ ] RbacDelegationService validates delegator has role
- [ ] RbacDelegationService enforces delegation constraints

### Integration Tests
- [ ] Create role with permissions via API
- [ ] Assign role to user via API
- [ ] Check user has permission
- [ ] Delegate role with scope
- [ ] Revoke delegation

### Manual Testing
1. Create new custom role
2. Assign permissions directly to role
3. Assign role to user
4. Verify user has permissions
5. Assign multiple roles to same user
6. Delegate role to another user
7. Revoke delegation

---

## Epic Completion Checklist

### Component 1: RBAC Core System (REVIEW & FIX)
- [ ] RBAC database schema verified (simplified 2-layer)
- [ ] RbacCoreService reviewed and bugs fixed
- [ ] RbacDelegationService reviewed and bugs fixed
- [ ] RBAC API endpoints tested and fixed
- [ ] Permission checking utilities verified working
- [ ] Multi-role support tested and fixed
- [ ] Feature-permission mapping verified
- [ ] System roles seeding verified
- [ ] Default permissions seeding verified
- [ ] **License guards verified on all pages**
- [ ] **Permission guards verified on all API endpoints**
- [ ] **Metadata RBAC rules verified and enforced**
- [ ] **Feature flag checks working correctly**

### Component 2: License Studio (REVIEW & FIX)
- [ ] All 7 License Studio modules reviewed
- [ ] Product Offerings management tested
- [ ] License Features catalog tested
- [ ] Feature Bundles configuration tested
- [ ] License assignment workflow tested
- [ ] Feature grants verified working
- [ ] Compliance checking verified
- [ ] Health monitoring verified
- [ ] All bugs found documented and fixed
- [ ] Integration with payment webhook verified
- [ ] RBAC permissions enforced on all licensing routes

### Documentation & Final Testing
- [ ] Documentation complete for both components
- [ ] Integration testing passed (RBAC + Licensing)
- [ ] Ready for Epic 4 (Onboarding & Feature Grants)

---

## Next Epic

[Epic 4: Onboarding & Feature Grants](./epic-4-onboarding-feature-grants.md)
