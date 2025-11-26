# RBAC System Simplification Plan

**Date:** 2025-10-22
**Goal:** Simplify RBAC to a 2-layer system: **Roles → Permissions**

## Current State

**Architecture:** 3 layers
```
Features → Permissions → Roles
           ↑
    Permission Bundles
```

**Issues:**
- Permission bundles add complexity layer
- Too many implementation phases and features
- Complex delegation system confusing users
- Quick actions tab overloaded with advanced features

## Target State

**Architecture:** 2 layers
```
Features → Permissions → Roles
```

**Benefits:**
- Direct role-to-permission mapping
- Simplified role creation workflow
- Cleaner UI with focused features
- Easier to understand and maintain

## Changes Overview

### 1. Remove Permission Bundles ✅ Simplifies System

**Database Changes:**
- Drop `permission_bundles` table
- Drop `permission_bundle_permissions` table
- Remove bundle references from roles
- Migrate existing bundle permissions directly to roles

**Code Changes:**
- Remove RbacCoreService bundle methods
- Remove bundle API endpoints (`/api/rbac/bundles`)
- Remove bundle UI components
- Update role model to remove bundle references

**Migration Strategy:**
1. Export existing bundles with their permissions
2. For each role that has bundles, directly assign those permissions
3. Drop bundle tables
4. Update all services/repositories

### 2. Create Role Creation Wizard ✅ Improves UX

**New Component:** `RoleCreationWizard`

**Steps:**
1. **Basic Info** - Name, description, scope
2. **Assign Permissions** - Multi-select permission picker with search/filter
3. **Link Users** - Select existing users to assign this role (optional, multi-select)
4. **Review & Create** - Summary before creation

**Features:**
- Permission search and filtering by module/category
- Bulk permission selection by category
- User search with profile display
- One-click role creation with all associations

### 3. Remove Implementation Phases Tab ✅ Reduces Clutter

**Remove:**
- "Implementation Phases" tab from dashboard
- PhaseStatus component and data
- All phase-related progress tracking UI

**Keep:**
- Overview tab (dashboard stats)
- Recent Activity tab
- User Management tab
- Quick Actions tab (simplified)

### 4. Keep User Management Tab ✅ Core Feature

**Current Features (Keep All):**
- User list with roles
- Role assignment/removal
- User search and filtering
- Bulk operations
- User details view

### 5. Simplify Quick Actions Tab ✅ Focus on Essentials

**Remove Complex Features:**
- ❌ Visual Permission Editor - Too complex for most users
- ❌ Permission Mapper - Advanced feature rarely used
- ❌ System Settings - Move to separate admin area
- ❌ Bundle Composer - Removing bundles entirely

**Keep Essential Actions:**
- ✅ Create New Role (now uses wizard)
- ✅ Manage Permissions (simple permission list)
- ✅ View Audit Logs (link to audit page)
- ✅ Export Roles & Permissions (data export)

**New Simple Layout:**
```
Quick Actions
├── Create Role (→ Opens wizard)
├── Manage Permissions (→ /admin/security/rbac/permissions)
├── Audit Logs (→ /admin/security/rbac/audit)
└── Export Data (→ Download JSON/CSV)
```

### 6. Evaluate Delegation Features

#### Keep (Core Functionality)

**✅ Multi-Role Assignment**
- **Why:** Essential for complex organizations
- **Use Case:** User needs both "Staff" and "Finance Manager" roles
- **Complexity:** Low - just multiple role assignments
- **Keep:** `/api/rbac/multi-role/*` endpoints
- **UI:** Simple multi-select in role assignment

**✅ Delegate Console (Simplified)**
- **Why:** Campus/ministry leaders need scoped access
- **Use Case:** Campus pastor manages only their campus
- **Simplify:** Remove advanced features, keep basic delegation
- **Keep:** Core delegation creation and viewing
- **Remove:** Complex delegation templates, bulk operations

#### Remove (Too Complex)

**❌ Delegation Permissions Management**
- **Why:** Too granular for most use cases
- **Alternative:** Use role-based delegation instead
- **Rationale:** If someone delegates, they delegate a full role, not cherry-picked permissions

**❌ Advanced Delegate Access Controls**
- **Why:** Overengineered for typical church management
- **Alternative:** Simple role-based scoping
- **Rationale:** Delegation should be straightforward, not a permission engineering exercise

**Simplified Delegation Model:**
```
Delegation = Assign Role + Scope (Campus/Ministry/Event) + Time Limit
```

No need for custom permission selection - delegate the whole role or don't.

### 7. Access Gate Integration ✅ Already Done

**Current State:** Access gates use permission-based checks
- `Gate.permission('rbac:manage')`
- `Gate.rbacAdmin()`
- Already integrated with RBAC system

**No Changes Needed:** Access gates work directly with permissions and roles.

## Implementation Phases

### Phase 1: Database Migration (Week 1)

**Tasks:**
1. Create migration to flatten bundle permissions into roles
2. Drop permission_bundles tables
3. Update role table structure if needed
4. Test migration on dev database

**Migration Steps:**
```sql
-- 1. Flatten bundle permissions to roles
INSERT INTO role_permissions (role_id, permission_id, tenant_id)
SELECT ur.role_id, bp.permission_id, r.tenant_id
FROM user_roles ur
JOIN role_bundle_assignments rba ON ur.role_id = rba.role_id
JOIN permission_bundle_permissions bp ON rba.bundle_id = bp.bundle_id
JOIN roles r ON ur.role_id = r.id
ON CONFLICT DO NOTHING;

-- 2. Drop bundle tables
DROP TABLE IF EXISTS role_bundle_assignments CASCADE;
DROP TABLE IF EXISTS permission_bundle_permissions CASCADE;
DROP TABLE IF EXISTS permission_bundles CASCADE;
```

### Phase 2: Backend Services (Week 1-2)

**Tasks:**
1. Remove bundle methods from RbacCoreService
2. Delete `/api/rbac/bundles` endpoint
3. Update RbacService to remove bundle delegation
4. Update role creation to handle direct permissions
5. Remove bundle-related types from models

### Phase 3: Role Creation Wizard (Week 2)

**Tasks:**
1. Create `RoleCreationWizard.tsx` component
2. Create wizard step components (BasicInfo, PermissionsStep, UsersStep, ReviewStep)
3. Add permission search/filter component
4. Add user search/select component
5. Integrate with role API

### Phase 4: Dashboard Simplification (Week 2-3)

**Tasks:**
1. Remove "Implementation Phases" tab
2. Simplify "Quick Actions" tab
3. Update dashboard stats (remove bundle counts)
4. Clean up phase-related components
5. Update navigation and routes

### Phase 5: Delegation Simplification (Week 3)

**Tasks:**
1. Keep core delegation with role + scope model
2. Remove delegation permissions management UI
3. Simplify delegation console
4. Remove advanced delegation features
5. Update delegation API to be role-based only

### Phase 6: Documentation & Testing (Week 3-4)

**Tasks:**
1. Update RBAC user manual
2. Update API documentation
3. Update CLAUDE.md with new architecture
4. Create migration guide for existing users
5. Integration testing
6. User acceptance testing

## Success Metrics

- ✅ 2-layer architecture (Roles → Permissions)
- ✅ Role creation time reduced by 50%
- ✅ UI complexity reduced (fewer tabs, simpler actions)
- ✅ 100% feature parity for core RBAC functionality
- ✅ No broken functionality for existing users
- ✅ Clean migration path from bundles to direct permissions

## Risks & Mitigation

### Risk 1: Data Loss During Migration
**Mitigation:** Export all bundle-permission mappings before migration, test on dev first

### Risk 2: Users Relying on Bundles
**Mitigation:** Migrate bundles to direct role permissions transparently, document changes

### Risk 3: Complex Existing Delegations
**Mitigation:** Analyze existing delegations, provide conversion scripts

### Risk 4: Breaking Existing Code
**Mitigation:** Comprehensive testing, gradual rollout with feature flags

## Rollback Plan

If simplification causes issues:

1. **Database:** Keep bundle tables in archive schema for 30 days
2. **Code:** Tag current state before changes
3. **Features:** Feature flag for new wizard vs. old system
4. **Data:** Backup before migration, restore if needed

## Timeline

**Total Duration:** 3-4 weeks

- **Week 1:** Database migration + backend services
- **Week 2:** Role wizard + dashboard simplification
- **Week 3:** Delegation simplification + testing
- **Week 4:** Documentation + deployment

## Next Steps

1. Review and approve this plan
2. Create feature flag for gradual rollout
3. Backup production database
4. Start Phase 1: Database migration

---

**Approval Required:** YES
**Estimated LOC Removed:** ~5,000 lines
**Estimated Complexity Reduction:** 40%
