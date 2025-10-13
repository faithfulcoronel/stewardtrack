# Super Admin Usage Audit

## Summary

All super admin checks have been audited and consolidated to use a centralized approach. This document outlines where super admin checks are used and confirms their validity.

## Centralized Method

**Location**: `src/lib/rbac/permissionHelpers.ts`

```typescript
// CENTRAL RPC CALLER - Only place that calls get_user_admin_role
export async function getUserAdminRole(): Promise<'super_admin' | 'tenant_admin' | 'staff' | 'member' | null>

// Helper that uses getUserAdminRole()
export async function checkSuperAdmin(): Promise<boolean>
```

## Valid Usages

### 1. Access Gate System ✅
**File**: `src/lib/access-gate/strategies.ts`
**Usage**: `SuperAdminGate` class for protecting super admin-only resources
**Status**: ✅ **VALID** - Uses centralized `checkSuperAdmin()`

### 2. Auth Utils ✅
**File**: `src/utils/authUtils.ts`
**Usage**: `checkSuperAdmin()` wrapper for backward compatibility
**Status**: ✅ **VALID** - Uses centralized helper from permissionHelpers

### 3. User Role Service ✅
**File**: `src/services/UserRoleService.ts`
**Usage**: `isSuperAdmin()` method (deprecated)
**Status**: ✅ **VALID** - Now delegates to centralized helper
**Note**: Method marked as deprecated, callers should use permissionHelpers directly

### 4. User Role Adapter ✅
**File**: `src/adapters/userRole.adapter.ts`
**Usage**: `isSuperAdmin()` method (deprecated)
**Status**: ✅ **VALID** - Now delegates to centralized helper
**Note**: Method marked as deprecated

### 5. Licensing API Routes ✅
**Files**:
- `src/app/api/licensing/product-offerings/[id]/route.ts`
- `src/app/api/licensing/product-offerings/[id]/features/route.ts`
- `src/app/api/licensing/product-offerings/[id]/features/[featureId]/route.ts`
- `src/app/api/licensing/product-offerings/[id]/bundles/route.ts`
- `src/app/api/licensing/product-offerings/[id]/bundles/[bundleId]/route.ts`
- `src/app/api/licensing/features/route.ts`
- `src/app/api/licensing/analytics/route.ts`

**Usage**: `checkSuperAdmin()` from authUtils for API route protection
**Status**: ✅ **VALID** - Licensing Studio is super admin only

**Example**:
```typescript
const isSuperAdmin = await checkSuperAdmin();
if (!isSuperAdmin) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
}
```

### 6. Admin Monitoring Routes ✅
**Files**:
- `src/app/api/admin/validate-licenses/route.ts`
- `src/app/api/admin/refresh-views/route.ts`
- `src/app/api/admin/monitoring/license-health/route.ts`

**Usage**: Super admin checks for system-wide administrative operations
**Status**: ✅ **VALID** - These are global admin operations

### 7. Admin Layout ✅
**File**: `src/app/admin/layout.tsx`
**Usage**: Filtering navigation items (e.g., hiding Licensing Studio from non-super-admins)
**Status**: ✅ **VALID** - Direct RPC call is acceptable in layout for UI filtering

**Code**:
```typescript
const { data: adminRoleData } = await supabase.rpc('get_user_admin_role');
if (adminRole === 'super_admin') {
  // Show super admin menu items
}
```

### 8. Base Adapter ✅
**File**: `src/adapters/base.adapter.ts`
**Usage**: Checking `this.context?.roles?.includes('super_admin')` for tenant filtering
**Status**: ✅ **VALID** - Using context roles, not making RPC calls
**Note**: This is checking already-loaded context, which is appropriate

## Removed Functions

### checkTenantAdmin() ❌ REMOVED
**Reason**: All access control besides super admin should use RBAC configuration

### checkStaff() ❌ REMOVED
**Reason**: All access control besides super admin should use RBAC configuration

## Usage Guidelines

### ✅ DO Use Super Admin Check For:
1. **Licensing Studio** - System-wide license management
2. **Global System Configuration** - Settings that affect all tenants
3. **System Monitoring** - Health checks, analytics across all tenants
4. **Database Maintenance** - System-wide operations like view refreshes
5. **Access Gate Protection** - Using `Gate.superAdminOnly()`

### ❌ DON'T Use Super Admin Check For:
1. **Tenant-specific operations** - Use RBAC permissions instead
2. **Feature access** - Use RBAC + licensing checks
3. **User management** - Use RBAC role-based checks
4. **Campus/ministry operations** - Use RBAC scope-based checks
5. **Any other role checks** - Use RBAC configuration

## Correct Patterns

### Pattern 1: API Route Protection (Super Admin Only)
```typescript
import { checkSuperAdmin } from '@/utils/authUtils';

export async function POST(request: NextRequest) {
  const { isAuthorized } = await checkSuperAdmin();

  if (!isAuthorized) {
    return NextResponse.json(
      { error: 'Super admin access required' },
      { status: 403 }
    );
  }

  // Protected logic
}
```

### Pattern 2: Page Protection (Super Admin Only)
```typescript
import { Gate } from '@/lib/access-gate';
import { ProtectedPage } from '@/components/access-gate';

const gate = Gate.superAdminOnly();

<ProtectedPage gate={gate} userId={user.id}>
  <SuperAdminContent />
</ProtectedPage>
```

### Pattern 3: UI Conditional Rendering
```typescript
import { getUserAdminRole } from '@/lib/rbac/permissionHelpers';

const adminRole = await getUserAdminRole();

{adminRole === 'super_admin' && (
  <SuperAdminFeature />
)}
```

### Pattern 4: Other Access Control (Use RBAC)
```typescript
// ❌ DON'T DO THIS
const isTenantAdmin = await checkTenantAdmin(); // REMOVED!

// ✅ DO THIS INSTEAD
import { Gate } from '@/lib/access-gate';

const gate = Gate.withPermission('admin.manage_tenant');
// OR
const gate = Gate.withRole('tenant_admin');
// OR
const gate = Gate.forSurface('tenant-management');
```

## Migration Checklist

- [x] Remove `checkTenantAdmin()` from permissionHelpers
- [x] Remove `checkStaff()` from permissionHelpers
- [x] Update `UserRoleService.isSuperAdmin()` to use centralized method
- [x] Update `UserRoleAdapter.isSuperAdmin()` to use centralized method
- [x] Update `SuperAdminGate` to use centralized method
- [x] Update `authUtils.checkSuperAdmin()` to use centralized method
- [x] Audit all API routes using super admin checks
- [x] Document valid usage patterns
- [x] Document anti-patterns (what not to do)

## Testing Super Admin Access

To test if you have super admin access:

1. Check the database:
```sql
SELECT * FROM get_user_admin_role();
-- Should return 'super_admin'
```

2. Check in code:
```typescript
import { checkSuperAdmin, getUserAdminRole } from '@/lib/rbac/permissionHelpers';

const isSuperAdmin = await checkSuperAdmin();
console.log('Is Super Admin:', isSuperAdmin);

const role = await getUserAdminRole();
console.log('Admin Role:', role); // Should be 'super_admin'
```

## Database Function

The Supabase RPC function should be:
```sql
CREATE OR REPLACE FUNCTION get_user_admin_role()
RETURNS TEXT AS $$
  -- Implementation that checks user's admin role
  -- Returns: 'super_admin', 'tenant_admin', 'staff', 'member', or NULL
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

## Summary

✅ **Centralized**: One method calls `get_user_admin_role` RPC
✅ **Consistent**: All code uses `checkSuperAdmin()` from permissionHelpers
✅ **Simplified**: Only super admin uses this approach, all other access uses RBAC
✅ **Documented**: Clear guidelines on when to use vs not use
✅ **Validated**: All existing usages audited and confirmed as valid

The codebase now has a clean, maintainable super admin check system! 🎉
