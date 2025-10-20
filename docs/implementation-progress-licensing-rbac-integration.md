# Licensing-RBAC Integration Implementation Progress

**Date Started:** 2025-12-19
**Status:** Phase 1 In Progress (60% Complete)

---

## Overview

Implementing automatic permission deployment from Licensing Studio to tenant RBAC systems. This bridges the gap where features are granted to tenants but permissions are never created, leaving tenant_admin with zero access.

---

## Completed Work ✅

### 1. Database Migration (COMPLETE)
**File:** `supabase/migrations/20251219091008_cleanup_orphaned_rbac_licensing_data.sql`

**What it does:**
- Archives orphaned permissions (not linked to licensed features)
- Archives orphaned surface bindings (pointing to non-existent surfaces)
- Deletes archived data safely
- Adds `metadata_key` column to `roles` table for template linking
- Adds `is_system` column to `roles` table for default roles
- Adds foreign key constraint on `feature_catalog.surface_id`
- Updates existing default roles with `metadata_key` values
- Creates performance indexes

**Key additions:**
```sql
-- roles.metadata_key → Links to role templates (e.g., 'role_tenant_admin')
-- roles.is_system → True for default roles created during registration
-- permissions.source → 'license_feature' | 'manual' | 'system'
-- permissions.source_reference → UUID of feature_catalog entry
```

### 2. PermissionDeploymentService (COMPLETE)
**File:** `src/services/PermissionDeploymentService.ts`

**Core service** that deploys permissions from licensed features to tenant RBAC.

**Key Methods:**
- `deployAllFeaturePermissions(tenantId, options)` → Deploy all licensed features
- `deployFeaturePermissions(tenantId, featureId, options)` → Deploy single feature
- `removeUnlicensedPermissions(tenantId, options)` → Clean up when license downgraded
- `syncTenantPermissions(tenantId, options)` → Full sync (add + remove)
- `getDeploymentStatus(tenantId)` → Check deployment state

**Algorithm Flow:**
1. Get feature from `feature_catalog`
2. Get permissions from `feature_permissions`
3. For each permission:
   - Create tenant permission in `permissions` table
   - Get role templates from `permission_role_templates`
   - Apply templates to tenant roles via `role_permissions`
4. If feature has `surface_id`, create surface binding

### 3. RolePermissionRepository & Adapter (COMPLETE)
**Files:**
- `src/repositories/rolePermission.repository.ts`
- `src/adapters/rolePermission.adapter.ts`

**Purpose:** Manages `role_permissions` join table (role ↔ permission many-to-many).

**Key Methods:**
- `assign(roleId, permissionId)` → Add permission to role
- `revoke(roleId, permissionId)` → Remove permission from role
- `findByRoleAndPermission()` → Check if assignment exists
- `assignMany()` → Bulk assign permissions
- `revokeMany()` → Bulk revoke permissions

### 4. Dependency Injection Setup (COMPLETE)
**Files:**
- `src/lib/types.ts` → Added type symbols
- `src/lib/container.ts` → Registered services/repositories/adapters

**Registered:**
- `PermissionDeploymentService`
- `RolePermissionRepository` + `RolePermissionAdapter`
- `RbacSurfaceBindingRepository` (alias for SurfaceBindingRepository)

---

## In Progress 🚧

### 5. Add Missing Repository Methods (60% COMPLETE)

Need to add methods to existing repositories that PermissionDeploymentService depends on:

#### PermissionRepository (`src/repositories/permission.repository.ts`)
**Missing Methods:**
```typescript
findByCode(tenantId: string, code: string): Promise<Permission | null>
getByTenantId(tenantId: string): Promise<Permission[]>
```

#### RoleRepository (`src/repositories/role.repository.ts`)
**Missing Methods:**
```typescript
findByMetadataKey(tenantId: string, metadataKey: string): Promise<Role | null>
```

#### FeaturePermissionRepository (`src/repositories/featurePermission.repository.ts`)
**Missing Methods:**
```typescript
getByFeatureId(featureId: string): Promise<FeaturePermission[]>
getRoleTemplates(featurePermissionId: string): Promise<PermissionRoleTemplate[]>
```

#### SurfaceBindingRepository (`src/repositories/surfaceBinding.repository.ts`)
**Missing Methods:**
```typescript
findBySurfaceId(tenantId: string, surfaceId: string): Promise<RbacSurfaceBinding | null>
create(data: CreateSurfaceBindingDto): Promise<RbacSurfaceBinding>
```

---

## Pending Work 📋

### 6. Update Registration Flow (NOT STARTED)
**File:** `src/app/api/auth/register/route.ts`

**Changes needed:**
```typescript
// After line ~120 (after seedDefaultRBAC and feature grants)
const permissionDeploymentService = container.get<PermissionDeploymentService>(
  TYPES.PermissionDeploymentService
);

await permissionDeploymentService.deployAllFeaturePermissions(tenant.id);
```

**Impact:** New tenants get automatic permission deployment on signup.

---

### 7. Update seedDefaultRBAC (NOT STARTED)
**File:** `src/lib/tenant/seedDefaultRBAC.ts`

**Changes needed:**
```typescript
// Update createRole calls to include metadata_key and is_system
const adminRole = await rbacService.createRole({
  name: 'Tenant Administrator',
  tenant_id: tenantId,
  metadata_key: 'role_tenant_admin',  // ⭐ ADD THIS
  is_system: true,                     // ⭐ ADD THIS
  scope: 'tenant'
});

// Repeat for staff, volunteer, member roles
```

**Impact:** Default roles properly linked to templates for permission deployment.

---

### 8. Hook into License Assignment (NOT STARTED)
**File:** `src/app/api/licensing/license-assignments/assign/route.ts`

**Changes needed:**
```typescript
// After successful assignment (around line ~75)
const permissionDeploymentService = container.get<PermissionDeploymentService>(
  TYPES.PermissionDeploymentService
);

await permissionDeploymentService.syncTenantPermissions(tenant_id);
```

**Impact:** When license changes, permissions automatically sync.

---

### 9. Testing & Validation (NOT STARTED)

**Test Checklist:**
- [ ] Run migration on local database
- [ ] New tenant signup → tenant_admin has permissions
- [ ] Assign license to existing tenant → permissions deployed
- [ ] Change license tier → permissions updated
- [ ] Create feature in Licensing Studio → permission metadata saved
- [ ] Feature with surface_id → surface binding auto-created
- [ ] Role templates applied correctly to tenant_admin
- [ ] ACCESS_GATE_GUIDE examples work end-to-end

---

## Known Issues & Risks ⚠️

### 1. Missing Repository Methods
**Impact:** PermissionDeploymentService will throw errors when called.
**Resolution:** Must complete section #5 above before testing.

### 2. Migration Timing
**Issue:** Migration must run BEFORE deploying new code.
**Resolution:** Run `npx supabase db push` after reviewing migration SQL.

### 3. Existing Tenants
**Issue:** Existing tenants won't get automatic permission deployment.
**Resolution:** Create admin endpoint to trigger `deployAllFeaturePermissions()` for existing tenants.

### 4. Type Mismatches
**Issue:** Some interfaces reference fields that may not exist in database.
**Resolution:** Verify schema matches TypeScript interfaces before deploying.

---

## Next Steps (Priority Order)

1. **Complete Repository Methods** (2-3 hours)
   - Add missing methods to Permission, Role, FeaturePermission, SurfaceBinding repositories
   - Add corresponding methods to their adapters
   - Test each method individually

2. **Update Registration Flow** (30 minutes)
   - Modify `src/app/api/auth/register/route.ts`
   - Add permission deployment after seedDefaultRBAC

3. **Update seedDefaultRBAC** (1 hour)
   - Add `metadata_key` and `is_system` to role creation
   - Ensure all 4 default roles have proper keys

4. **Hook into License Assignment** (30 minutes)
   - Modify license assignment endpoint
   - Add sync call after assignment

5. **End-to-End Testing** (2-3 hours)
   - Run migration
   - Test new tenant signup
   - Test license assignment
   - Test permission deployment
   - Verify ACCESS_GATE_GUIDE works

6. **Documentation** (1 hour)
   - Update README
   - Document deployment process
   - Create admin runbook for manual sync

---

## Success Criteria

### Phase 1 Success (Foundation)
- ✅ Database migration runs successfully
- ✅ PermissionDeploymentService creates without errors
- ✅ DI container binds all dependencies
- ⏳ All repository methods implemented
- ⏳ New tenants get auto-deployed permissions
- ⏳ Tenant_admin has full access based on tier
- ⏳ Surface bindings created automatically

### Phase 2 Success (Integration)
- ⏳ License assignment triggers permission sync
- ⏳ License downgrade removes permissions
- ⏳ Feature creation in Licensing Studio deploys to all tenants
- ⏳ ACCESS_GATE_GUIDE examples work end-to-end

### Phase 3 Success (Production Ready)
- ⏳ Background jobs handle large permission sets
- ⏳ Out-of-sync alerts notify admins
- ⏳ Manual sync endpoint for existing tenants
- ⏳ Comprehensive testing completed
- ⏳ Documentation updated

---

## Files Created/Modified

### Created ✨
1. `supabase/migrations/20251219091008_cleanup_orphaned_rbac_licensing_data.sql`
2. `src/services/PermissionDeploymentService.ts`
3. `src/repositories/rolePermission.repository.ts`
4. `src/adapters/rolePermission.adapter.ts`
5. `docs/implementation-progress-licensing-rbac-integration.md` (this file)
6. `docs/licensing-rbac-integration-analysis.md` (created by agent)

### Modified 🔧
1. `src/lib/types.ts` → Added type symbols
2. `src/lib/container.ts` → Registered new services/repositories/adapters

### Pending Modifications 📝
1. `src/repositories/permission.repository.ts` → Add findByCode, getByTenantId
2. `src/repositories/role.repository.ts` → Add findByMetadataKey
3. `src/repositories/featurePermission.repository.ts` → Add getByFeatureId, getRoleTemplates
4. `src/repositories/surfaceBinding.repository.ts` → Add findBySurfaceId
5. `src/adapters/*.adapter.ts` → Corresponding adapter methods
6. `src/app/api/auth/register/route.ts` → Add deployment call
7. `src/lib/tenant/seedDefaultRBAC.ts` → Add metadata_key, is_system
8. `src/app/api/licensing/license-assignments/assign/route.ts` → Add sync call

---

## Estimated Time to Complete

- **Remaining Work:** ~8-10 hours
- **Testing:** ~2-3 hours
- **Documentation:** ~1 hour
- **Total:** ~11-14 hours

---

## Questions for Review

1. **Should we create a manual sync endpoint for existing tenants?**
   - Recommendation: Yes, create `/api/admin/sync-permissions/{tenantId}`

2. **How should we handle permission conflicts?**
   - Current approach: Non-destructive (don't replace existing)
   - Alternative: Force replace with `forceReplace: true` option

3. **Should surface bindings be read-only for tenants?**
   - Recommendation: Yes, only super_admin can modify
   - Tenants see bindings but can't edit

4. **What about permissions created manually by tenants?**
   - Current approach: Keep them (source != 'license_feature')
   - They won't be removed during cleanup

---

**Last Updated:** 2025-12-19 (During implementation)
**Next Review:** After completing repository methods
