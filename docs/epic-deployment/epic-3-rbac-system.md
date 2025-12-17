# Epic 3: RBAC System & License Studio Integration

**Release:** Beta - March 2026
**Timeline:** Weeks 3-4 (January 20 - February 2, 2026)
**Duration:** 2 weeks
**Priority:** P0 (Blocking - Critical Infrastructure)
**Epic Owner:** Backend Team + Claude AI Assistance
**Dependencies:** Epic 1 (JWT Authentication)

## Epic Overview

Refactor the RBAC system to a simplified 2-layer architecture (Roles → Permissions) and complete the License Studio implementation with full RBAC-License integration. This epic has three major components:

### Component 1: RBAC System Simplification (REFACTOR)
**Current State:** 3-layer architecture (Roles → Permission Bundles → Permissions)
**Target State:** 2-layer architecture (Roles → Permissions) - remove bundles entirely

Tasks:
- Remove permission bundle tables and references
- Update `can_user()` function to direct permission checking
- Migrate existing role-bundle assignments to direct role-permission mappings
- Update RbacCoreService to eliminate bundle methods
- Direct Role → Permission mapping (no bundles)
- Multi-role support for users
- Role delegation with scope and time limits
- Feature-to-permission mapping for license control

### Component 2: License Studio Completion (BUILD & INTEGRATE)
**Current State:** 3-4 of 7 modules partially implemented (dashboard exists but incomplete)
**Target State:** All 7 modules fully functional with complete UI

Missing/Incomplete Modules:
- Module 4: License Assignment (backend exists, NO standalone UI)
- Module 5: Feature Grants (backend only, NO UI at all)
- Module 6: Compliance Checking (service exists, NO UI)
- Module 7: Health Monitoring (partial UI, needs completion)

Partially Complete Modules (need routing/integration fixes):
- Module 1: Product Offerings (3/4 complete)
- Module 2: License Features (3/4 complete)
- Module 3: Feature Bundles (2/4 complete, embedded in tabs)

### Component 3: RBAC-License Runtime Integration (IMPLEMENT)
**Current State:** Well-integrated at registration, NOT integrated at runtime
**Target State:** Combined permission + license guards enforced throughout application

Tasks:
- Implement combined guard utilities (permission AND license)
- Update metadata evaluation to check license features
- Add license feature checks to all API endpoints
- Implement payment webhook for license status changes
- Create unified can_access_surface() enforcement
- **License and permission guards** on all pages and features
- **Metadata page access control** enforcement for both RBAC and licensing

**Critical Infrastructure:** This epic must be completed before onboarding, as it controls all access throughout the system and integrates with the licensing/payment flow.

## ⚠️ IMPORTANT: Current State vs. Documentation

**CODEBASE REALITY CHECK:**

This document was originally written as if the "simplified 2-layer RBAC" already existed. **Deep codebase review revealed this is NOT accurate.** The actual implementation status is:

| Component | Document Claims | Actual Reality | Work Required |
|-----------|----------------|----------------|---------------|
| RBAC Architecture | "Simplified 2-layer (NO bundles)" | 3-layer with bundles STILL ACTIVE | REFACTOR (2-3 days) |
| License Studio | "7 modules exist, need review" | 3-4 modules partially done, 3-4 MISSING UI | BUILD (3-4 days) |
| RBAC-License Integration | "Guards enforce both" | Registration only, runtime NOT integrated | IMPLEMENT (2-3 days) |

**This epic is NOT "REVIEW & FIX" but "REFACTOR, BUILD & INTEGRATE" - a significant implementation effort.**

## RBAC Architecture

### Current State (3 Layers - NEEDS REFACTORING)

**Current Implementation:**
```
Users → Roles → Permission Bundles → Permissions ❌ TOO COMPLEX
```

**Database Evidence:**
- `permission_bundles` table EXISTS (migration 20250931000009_reset_rbac_schema.sql)
- `bundle_permissions` table EXISTS (linking bundles to permissions)
- `role_bundles` table EXISTS (linking roles to bundles)
- `can_user()` function has HARDCODED bundle logic (lines 497-544)
- Recent migration attempted removal but INCOMPLETE (20251219091017_remove_permission_bundles.sql)

### Target State (2 Layers - TO BE IMPLEMENTED)

**After Simplification:**
```
Users → Roles → Permissions ✅ SIMPLE
```

### Entity Relationships (Target)

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

### Refactoring Tasks

1. **Remove:** `permission_bundles` table (partially done, needs completion)
2. **Remove:** `role_bundles` table
3. **Remove:** `bundle_permissions` table
4. **Migrate:** Existing role-bundle-permission chains to direct role-permission mappings
5. **Refactor:** `can_user()` function to eliminate bundle logic (lines 497-544)
6. **Update:** RbacCoreService adapter to remove bundle references
7. **Remove:** Bundle seeding code from `src/lib/tenant/seedDefaultPermissionBundles.ts`
8. **Remove:** Bundle seeding call from registration flow (`src/app/api/auth/register/route.ts` lines 263-270)
9. **Test:** Verify all permission checks work after bundle removal
10. **Preserve:** Multi-role support (already working)
11. **Preserve:** Feature-to-permission mapping (already working)

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
  name TEXT NOT NULL UNIQUE, -- e.g., "members:view", "finance:write"
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
  ('members:view', 'View Members', 'View member profiles and directory', 'members', TRUE),
  ('members:manage', 'Manage Members', 'Create, update, and delete members', 'members', TRUE),
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
    'members:view',
    'finance:read',
    'reports:read'
  )
  ON CONFLICT DO NOTHING;

  -- Member: Read-only access
  INSERT INTO role_permissions (role_id, permission_id)
  SELECT v_member_role_id, id FROM permissions
  WHERE name IN (
    'members:view',
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

The system is **designed** to enforce **two-level access control** on all pages and features:

1. **Permission Guards** - User must have required RBAC permission(s)
2. **License Guards** - Tenant must have active license feature grant

**CODEBASE REALITY:** Guard integration is INCOMPLETE.

**Current Implementation Status:**

| Guard Layer | Permission Guards | License Guards | Combined (Both) | Status |
|-------------|------------------|----------------|-----------------|---------|
| **Registration Flow** | ✅ Working | ✅ Working | ✅ Working | Grade: A (Well integrated) |
| **Metadata Pages** | ✅ Working | ❌ NOT CHECKED | ❌ Missing | Grade: D (RBAC only) |
| **API Endpoints** | ⚠️ Partial | ❌ NOT CHECKED | ❌ Missing | Grade: D (Inconsistent) |
| **UI Components** | ⚠️ Partial | ❌ NOT CHECKED | ❌ Missing | Grade: D (Inconsistent) |
| **Runtime Enforcement** | ⚠️ Works but isolated | ❌ Works but isolated | ❌ NOT INTEGRATED | Grade: D |

**Critical Findings:**

1. **Registration Flow (WORKS):**
   - File: `src/app/api/auth/register/route.ts`
   - Steps 6-9 integrate RBAC + Licensing perfectly
   - PermissionDeploymentService bridges license features → RBAC permissions ✅

2. **Metadata Evaluation (BROKEN):**
   - File: `src/lib/metadata/evaluation.ts`
   - `isPermittedWithRoles()` only checks RBAC, NOT license features ❌
   - License features ARE in context (contextBuilder.ts) but NOT USED ❌

3. **Database Function (EXISTS BUT NEVER CALLED):**
   - Function: `can_access_surface()` in surface_license_bindings migration
   - Checks BOTH permission AND license ✅
   - ZERO references in application code ❌

4. **Payment Webhook (MISSING):**
   - No webhook handler for Xendit payment events
   - License status changes NOT automated
   - Feature grants NOT triggered by payments ❌

**Target State:** Both guards must pass for access to be granted. This applies to:
- **Metadata pages** (defined in XML) - NEEDS IMPLEMENTATION
- **API endpoints** (server-side enforcement) - NEEDS IMPLEMENTATION
- **UI components** (client-side hiding/disabling) - NEEDS IMPLEMENTATION
- **Features** (license-gated functionality) - NEEDS IMPLEMENTATION

### Guard Enforcement Layers (Target)

#### Layer 1: Metadata Pages (XML-based)

**Location:** `metadata/authoring/blueprints/**/*.xml`

Each metadata page defines RBAC rules:

```xml
<page id="members-list">
  <rbac>
    <permissions>
      <permission name="members:view" required="true" />
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
  await requirePermission('members:view');

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

  const canEdit = hasPermission('members:manage') && hasFeature('member_management');

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
      'members:manage'
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
Permission: members:view
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

## License Studio Completion & Integration

### Overview

The License Studio is a **partially implemented admin interface** for managing the licensing system. **Codebase review revealed significant gaps** - only 3-4 of 7 modules have UI, the rest are backend-only.

**Location:** `/admin/licensing/*`

**Current Implementation Status:**
- **Main Dashboard:** EXISTS - Consolidated single-page with tabs (NOT Dashboard → List → AddEdit → Profile pattern)
- **Standalone Module Pages:** MISSING for most modules
- **API Routes:** EXIST for most operations
- **Services:** FULLY IMPLEMENTED (LicensingService, LicenseFeatureService, LicenseValidationService, etc.)
- **UI Completeness:** 30-40% (3-4 of 7 modules have partial UI)

### Module Implementation Status

| Module | Backend | API Routes | UI Dashboard Tab | Standalone Pages | Completeness |
|--------|---------|------------|------------------|------------------|--------------|
| 1. Product Offerings | ✅ | ✅ | ✅ | ⚠️ Partial | 75% (3/4) |
| 2. License Features | ✅ | ✅ | ✅ | ⚠️ Partial | 75% (3/4) |
| 3. Feature Bundles | ✅ | ✅ | ✅ | ❌ None | 50% (2/4) |
| 4. License Assignment | ✅ | ✅ | ⚠️ Partial | ❌ None | 25% (1/4) |
| 5. Feature Grants | ✅ | ✅ | ❌ None | ❌ None | 0% (0/4) |
| 6. Compliance | ✅ | ⚠️ Partial | ❌ None | ❌ None | 0% (0/4) |
| 7. Health Monitoring | ✅ | ✅ | ⚠️ Partial | ❌ None | 25% (1/4) |

**Files Evidence:**
- Main dashboard: `src/app/admin/licensing/page.tsx` (consolidated tabs)
- Offerings: `src/app/admin/licensing/offerings/new/page.tsx` EXISTS
- Features: `src/app/admin/licensing/features/create/page.tsx` EXISTS
- Missing: NO `/admin/licensing/licenses/` page
- Missing: NO `/admin/licensing/feature-grants/` page
- Missing: NO `/admin/licensing/compliance/` page
- Missing: NO `/admin/licensing/health/` dedicated page

**This is NOT "REVIEW & FIX" but "COMPLETE BUILD" work (estimated 3-4 days).**

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

### Implementation Checklist

#### Phase 1: RBAC Simplification (Days 1-3)

**Remove Bundle Architecture:**
- [ ] Create migration to drop bundle tables (permission_bundles, bundle_permissions, role_bundles)
- [ ] Create data migration to convert role-bundle-permission to direct role-permission
- [ ] Backup existing bundle assignments before conversion
- [ ] Refactor `can_user()` function to remove bundle logic (lines 497-544)
- [ ] Update RbacCoreService adapter to remove bundle references
- [ ] Remove bundle seeding from `src/lib/tenant/seedDefaultPermissionBundles.ts`
- [ ] Remove bundle seeding call from registration flow (`src/app/api/auth/register/route.ts` lines 263-270)
- [ ] Test all permission checks work after refactoring
- [ ] Verify 4 default roles (tenant_admin, staff, volunteer, member) have correct direct permissions
- [ ] Verify multi-role support still works
- [ ] Verify delegation still works

#### Phase 2: License Studio UI Completion (Days 4-7)

**Build Missing Module UIs:**
- [ ] Module 4: Create `/admin/licensing/licenses/` page (Dashboard → List → AddEdit → Profile)
- [ ] Module 5: Create `/admin/licensing/feature-grants/` page (Dashboard → List → AddEdit)
- [ ] Module 6: Create `/admin/licensing/compliance/` page (Dashboard → Violations List → Detail)
- [ ] Module 7: Complete `/admin/licensing/health/` page (add missing metrics)
- [ ] Fix routing for Modules 1-3 (offerings, features, bundles)
- [ ] Ensure all pages have RBAC metadata (`licensing:admin` permission required)
- [ ] Add all licensing components to component registry
- [ ] Create metadata XML for all 7 modules
- [ ] Run `npm run metadata:compile` to validate

**Functional Testing:**
- [ ] Product Offerings: Create, edit, activate, deactivate
- [ ] Features: Add, edit, categorize, activate
- [ ] Feature Bundles: Assign features to offerings
- [ ] Licenses: Assign, upgrade, downgrade, suspend
- [ ] Feature Grants: Grant, revoke, view history
- [ ] Compliance: Run checks, view violations
- [ ] Health: Verify metrics accuracy

#### Phase 3: RBAC-License Runtime Integration (Days 8-10)

**Implement Combined Guards:**
- [ ] Create `requireFeature()` utility in `src/lib/server/auth-context.ts`
- [ ] Create `requirePermissionAndFeature()` combined utility
- [ ] Update `isPermittedWithRoles()` in `src/lib/metadata/evaluation.ts` to check license features
- [ ] Use license features from context (already populated in contextBuilder.ts)
- [ ] Add license feature checks to metadata resolver
- [ ] Implement `can_access_surface()` wrapper service
- [ ] Create `useFeatures()` hook for client-side license checks
- [ ] Update all metadata pages to include `<features>` in RBAC section
- [ ] Add `requireFeature()` calls to all feature-gated API endpoints
- [ ] Implement Xendit payment webhook handler
- [ ] Test payment webhook triggers license activation
- [ ] Test license activation triggers feature grants
- [ ] Verify combined guards work across all layers

**Integration Testing:**
- [ ] Create product offering → Add features → Assign to tenant → Verify grants
- [ ] Upgrade tenant license → Verify new features granted
- [ ] Downgrade tenant license → Verify features revoked
- [ ] Expire license → Verify compliance violation detected
- [ ] Payment webhook → License activation → Feature grants → Permission deployment
- [ ] Test user WITHOUT permission but WITH feature (should deny)
- [ ] Test user WITH permission but WITHOUT feature (should deny)
- [ ] Test user WITH both permission AND feature (should allow)

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

### Component 1: RBAC System Simplification (REFACTOR)
- [ ] Bundle tables removed (permission_bundles, bundle_permissions, role_bundles)
- [ ] Data migrated from bundle architecture to direct role-permission mapping
- [ ] `can_user()` function refactored (bundle logic removed)
- [ ] RbacCoreService adapter updated (no bundle references)
- [ ] Bundle seeding code removed (`seedDefaultPermissionBundles.ts`)
- [ ] Bundle seeding call removed from registration flow (`register/route.ts`)
- [ ] All permission checks work after refactoring
- [ ] 4 default roles have correct direct permissions
- [ ] Multi-role support still works
- [ ] Role delegation still works
- [ ] Feature-permission mapping preserved
- [ ] System roles seeding verified
- [ ] Default permissions seeding verified

### Component 2: License Studio Completion (BUILD & INTEGRATE)
- [ ] Module 4: License Assignment UI built (Dashboard → List → AddEdit → Profile)
- [ ] Module 5: Feature Grants UI built (Dashboard → List → AddEdit)
- [ ] Module 6: Compliance UI built (Dashboard → Violations List → Detail)
- [ ] Module 7: Health Monitoring UI completed (all metrics)
- [ ] Modules 1-3: Routing fixed (Offerings, Features, Bundles)
- [ ] All 7 modules have RBAC metadata
- [ ] All licensing components in component registry
- [ ] All pages follow proper routing patterns
- [ ] Product Offerings CRUD tested
- [ ] License Features CRUD tested
- [ ] Feature Bundles CRUD tested
- [ ] License assignment workflow tested
- [ ] Feature grants workflow tested
- [ ] Compliance checking tested
- [ ] Health monitoring tested
- [ ] Metadata compiled successfully

### Component 3: RBAC-License Runtime Integration (IMPLEMENT)
- [ ] `requireFeature()` utility created
- [ ] `requirePermissionAndFeature()` combined utility created
- [ ] Metadata evaluation checks license features
- [ ] License features from context used in evaluation
- [ ] Metadata resolver enforces license guards
- [ ] `can_access_surface()` wrapper service implemented
- [ ] `useFeatures()` hook created for client-side
- [ ] All metadata pages have `<features>` in RBAC section
- [ ] All feature-gated APIs call `requireFeature()`
- [ ] Xendit payment webhook handler implemented
- [ ] Payment webhook triggers license activation
- [ ] License activation triggers feature grants
- [ ] **Combined guards work on all metadata pages**
- [ ] **Combined guards work on all API endpoints**
- [ ] **Combined guards work in UI components**
- [ ] **Integration tested end-to-end**

### Documentation & Final Testing
- [ ] Documentation updated to reflect actual implementation
- [ ] Integration testing passed (RBAC + Licensing)
- [ ] All 3 components verified working together
- [ ] Ready for Epic 4 (Onboarding & Feature Grants)

---

## Implementation Notes

**Estimated Total Effort:** 10 days (2 weeks with buffer)

**Breakdown:**
- Phase 1 (RBAC Simplification): 3 days
- Phase 2 (License Studio UI): 4 days
- Phase 3 (Runtime Integration): 3 days

**Risk Factors:**
- Data migration from bundles to direct permissions may require careful testing
- Payment webhook implementation depends on Xendit API documentation
- Combined guard enforcement touches many files across the codebase

**Success Metrics:**
- Zero bundle references in codebase after Phase 1
- All 7 License Studio modules functional with UI after Phase 2
- Combined permission+license checks work on 100% of protected endpoints after Phase 3

---

## Next Epic

[Epic 4: Onboarding & Feature Grants](./epic-4-onboarding-feature-grants.md)
