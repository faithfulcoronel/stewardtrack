# Super Admin Check - Centralized Approach

## Overview

All super admin checks in the application now use a **single centralized method** that calls the Supabase RPC function `get_user_admin_role`. This ensures consistency across the entire application.

## The Central Method

### Location
[src/lib/rbac/permissionHelpers.ts](src/lib/rbac/permissionHelpers.ts:30-45)

### Implementation
```typescript
/**
 * CENTRAL METHOD: Get user's admin role using Supabase RPC
 * This is the ONLY place where we call the database RPC function.
 * All other methods should use this function.
 */
export async function getUserAdminRole(): Promise<'super_admin' | 'tenant_admin' | 'staff' | 'member' | null> {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: adminRoleData, error } = await supabase.rpc('get_user_admin_role');

    if (error) {
      console.error('[getUserAdminRole] RPC error:', error);
      return null;
    }

    return adminRoleData as 'super_admin' | 'tenant_admin' | 'staff' | 'member' | null;
  } catch (error) {
    console.error('[getUserAdminRole] Error:', error);
    return null;
  }
}
```

## Helper Methods

All helper methods use `getUserAdminRole()`:

### Check Super Admin
```typescript
export async function checkSuperAdmin(): Promise<boolean> {
  const adminRole = await getUserAdminRole();
  return adminRole === 'super_admin';
}
```

### Check Tenant Admin
```typescript
export async function checkTenantAdmin(): Promise<boolean> {
  const adminRole = await getUserAdminRole();
  return adminRole === 'super_admin' || adminRole === 'tenant_admin';
}
```

### Check Staff
```typescript
export async function checkStaff(): Promise<boolean> {
  const adminRole = await getUserAdminRole();
  return adminRole === 'super_admin' || adminRole === 'tenant_admin' || adminRole === 'staff';
}
```

## Usage Throughout the Application

### 1. In Layout Files
```typescript
// src/app/admin/layout.tsx
const { data: adminRoleData } = await supabase.rpc('get_user_admin_role');
const adminRole = adminRoleData as 'super_admin' | 'tenant_admin' | 'staff' | 'member' | null;

if (adminRole === 'super_admin') {
  // Show super admin features
}
```

### 2. In Access Gates
```typescript
// src/lib/access-gate/strategies.ts
import { checkSuperAdmin } from '@/lib/rbac/permissionHelpers';

export class SuperAdminGate extends AccessGate {
  async check(userId: string): Promise<AccessCheckResult> {
    const isSuperAdmin = await checkSuperAdmin();
    // ...
  }
}
```

### 3. In Auth Utils
```typescript
// src/utils/authUtils.ts
import { checkSuperAdmin as checkSuperAdminHelper } from '@/lib/rbac/permissionHelpers';

export const authUtils = {
  checkSuperAdmin: async () => {
    const user = await authUtils.getUser();
    if (!user) return { isAuthorized: false, user: null };

    const isSuperAdmin = await checkSuperAdminHelper();
    return { isAuthorized: isSuperAdmin, user };
  }
};
```

### 4. In Services
```typescript
// src/services/UserRoleService.ts
import { checkSuperAdmin as checkSuperAdminHelper } from '@/lib/rbac/permissionHelpers';

async isSuperAdmin(_userId?: string): Promise<boolean> {
  return await checkSuperAdminHelper();
}
```

### 5. In Page Components
```typescript
// Any page that needs super admin check
import { checkSuperAdmin } from '@/lib/rbac/permissionHelpers';

export default async function AdminPage() {
  const isSuperAdmin = await checkSuperAdmin();

  if (!isSuperAdmin) {
    redirect('/unauthorized');
  }

  // Protected content
}
```

## Migration Path

### ❌ Old Approach (DO NOT USE)
```typescript
// Multiple different implementations
const { data } = await supabase.rpc('get_user_admin_role');
// OR
await userRoleService.isSuperAdmin(userId);
// OR
await this.repo.isSuperAdmin(userId);
```

### ✅ New Approach (USE THIS)
```typescript
// Always use the centralized helper
import { checkSuperAdmin, getUserAdminRole } from '@/lib/rbac/permissionHelpers';

// For boolean check
const isSuperAdmin = await checkSuperAdmin();

// For getting the actual role
const adminRole = await getUserAdminRole();
```

## Benefits

1. **Single Source of Truth**: Only one place calls the RPC function
2. **Consistency**: Same behavior everywhere in the app
3. **Maintainability**: Easy to update or debug
4. **Type Safety**: Proper TypeScript types throughout
5. **Error Handling**: Centralized error handling and logging

## Database Function

The underlying Supabase RPC function:

```sql
CREATE OR REPLACE FUNCTION get_user_admin_role()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
-- Returns 'super_admin', 'tenant_admin', 'staff', 'member', or NULL
-- based on the current authenticated user
$$;
```

## Testing

When testing super admin access:

```typescript
// In tests, mock the permissionHelpers
jest.mock('@/lib/rbac/permissionHelpers', () => ({
  checkSuperAdmin: jest.fn().mockResolvedValue(true),
  getUserAdminRole: jest.fn().mockResolvedValue('super_admin')
}));
```

## Summary

✅ **DO**: Use `checkSuperAdmin()` or `getUserAdminRole()` from permissionHelpers
❌ **DON'T**: Call `supabase.rpc('get_user_admin_role')` directly anywhere else
✅ **DO**: Import from `@/lib/rbac/permissionHelpers`
❌ **DON'T**: Create new implementations of super admin checks

All super admin checks now flow through one central method, ensuring consistency and maintainability! 🎉
