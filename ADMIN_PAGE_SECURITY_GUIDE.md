# Admin Page Security Guide

## Overview

This guide explains how to protect admin pages from unauthorized access using the `ProtectedAdminPage` component with AccessGate integration.

## The Problem

**Menu filtering is NOT enough!** Hiding menu items in the UI does not prevent users from directly accessing pages if they know the URL.

### Example Security Lapse:
```typescript
// ❌ INSECURE - Only hides menu item
if (user.role !== 'super_admin') {
  // Don't show "Licensing Studio" in menu
}

// But user can still visit: /admin/licensing directly!
```

## The Solution

Wrap **every protected page** with `ProtectedAdminPage` component that checks AccessGate on the server before rendering.

### Example Secure Page:
```typescript
// ✅ SECURE - Server-side protection
import { ProtectedAdminPage } from '@/components/access-gate/ProtectedAdminPage';

export default async function LicensingPage() {
  return (
    <ProtectedAdminPage superAdminOnly requireTenant={false}>
      <LicensingStudioContent />
    </ProtectedAdminPage>
  );
}
```

## Protection Patterns

### 1. Super Admin Only Pages

Use for: Licensing Studio, Menu Builder, System Settings

```typescript
<ProtectedAdminPage superAdminOnly requireTenant={false}>
  {children}
</ProtectedAdminPage>
```

**Pages that need this:**
- `/admin/licensing` - Licensing Studio
- `/admin/menu-builder` - Menu Builder
- Any system-wide administration pages

### 2. Permission-Based Protection

Use for: Members, Finance, Reports, etc.

```typescript
<ProtectedAdminPage permission="members:read">
  {children}
</ProtectedAdminPage>

// Multiple permissions (all required)
<ProtectedAdminPage permission={['members:read', 'members:write']} permissionMode="all">
  {children}
</ProtectedAdminPage>

// Multiple permissions (any one required)
<ProtectedAdminPage permission={['members:read', 'members:write']} permissionMode="any">
  {children}
</ProtectedAdminPage>
```

**Permission Mappings:**
- `/admin/members/**` → `members:read` or `members:write`
- `/admin/financial-overview` → `finance:read`
- `/admin/expenses` → `finance:read`
- `/admin/reports` → `reports:read`
- `/admin/security/rbac/**` → `rbac:manage`

### 3. Role-Based Protection

Use for: Settings, Admin-only pages

```typescript
<ProtectedAdminPage role="tenant_admin">
  {children}
</ProtectedAdminPage>

// Multiple roles (any one required)
<ProtectedAdminPage role={['tenant_admin', 'campus_pastor']} roleMode="any">
  {children}
</ProtectedAdminPage>
```

**Role Mappings:**
- `/admin/settings` → `tenant_admin`
- Delegation pages → `tenant_admin`

### 4. Surface-Based Protection

Use for: Metadata-driven pages with surface bindings

```typescript
<ProtectedAdminPage surfaceId="member-management">
  {children}
</ProtectedAdminPage>
```

### 5. Custom Gate Protection

Use for: Complex access logic

```typescript
import { Gate, all, any } from '@/lib/access-gate';

const complexGate = all(
  Gate.withPermission('finance:read'),
  Gate.withLicense('advanced-reports')
);

<ProtectedAdminPage gate={complexGate}>
  {children}
</ProtectedAdminPage>
```

## Page Protection Checklist

### All Admin Pages Must:

- [ ] Import `ProtectedAdminPage` from `@/components/access-gate/ProtectedAdminPage`
- [ ] Wrap the entire page content in `<ProtectedAdminPage>`
- [ ] Specify appropriate access control (superAdminOnly, permission, role, or surfaceId)
- [ ] Set `requireTenant={false}` for super admin-only pages
- [ ] Add security comment in file header documenting protection level

### Example Template:

```typescript
/**
 * [Page Name]
 *
 * [Description]
 *
 * SECURITY: Protected by ProtectedAdminPage with [protection type]
 */

import { ProtectedAdminPage } from '@/components/access-gate/ProtectedAdminPage';
import { PageContent } from '@/components/...';

export const metadata = {
  title: '[Page Title] | StewardTrack',
  description: '[Description]',
};

export default async function PageName() {
  return (
    <ProtectedAdminPage [protection props]>
      <PageContent />
    </ProtectedAdminPage>
  );
}
```

## Page Inventory & Required Protection

### 🔴 Critical - Super Admin Only (requireTenant: false)

- [ ] `/admin/licensing/page.tsx` - `superAdminOnly`
- [ ] `/admin/menu-builder/page.tsx` - `superAdminOnly` ✅ **DONE**
- [ ] `/admin/settings/page.tsx` (system settings) - `superAdminOnly`

### 🟡 High Priority - Permission Required

- [ ] `/admin/members/page.tsx` - `permission="members:read"`
- [ ] `/admin/members/list/page.tsx` - `permission="members:read"`
- [ ] `/admin/members/manage/page.tsx` - `permission="members:write"`
- [ ] `/admin/members/manage/lookup-new/page.tsx` - `permission="members:write"`
- [ ] `/admin/members/[memberId]/page.tsx` - `permission="members:read"`
- [ ] `/admin/security/rbac/page.tsx` - `permission="rbac:manage"`
- [ ] `/admin/security/rbac/**/page.tsx` (all subpages) - `permission="rbac:manage"`
- [ ] `/admin/rbac/**/page.tsx` (all delegation pages) - `permission="rbac:manage"`

### 🟢 Medium Priority - Role Required

- [ ] `/admin/settings/page.tsx` (tenant settings) - `role="tenant_admin"`

### ⚪ Low Priority - General Access

- [ ] `/admin/page.tsx` - Dashboard (authenticated only)
- [ ] `/admin/docs/page.tsx` - Documentation (authenticated only)
- [ ] `/admin/modules/page.tsx` - Modules (authenticated only)
- [ ] `/admin/ui-blocks/**/page.tsx` - UI blocks (authenticated only)

## Preset Components

For common patterns, use preset components:

```typescript
import {
  SuperAdminPage,
  TenantAdminPage,
  MembersProtectedPage,
  FinanceProtectedPage,
  RBACProtectedPage
} from '@/components/access-gate/ProtectedAdminPage';

// Super admin page
<SuperAdminPage>{children}</SuperAdminPage>

// Tenant admin page
<TenantAdminPage>{children}</TenantAdminPage>

// Members page
<MembersProtectedPage>{children}</MembersProtectedPage>

// Finance page
<FinanceProtectedPage>{children}</FinanceProtectedPage>

// RBAC page
<RBACProtectedPage>{children}</RBACProtectedPage>
```

## Testing Security

### Manual Testing Checklist:

1. **Test as Super Admin:**
   - ✅ Can access `/admin/licensing`
   - ✅ Can access `/admin/menu-builder`
   - ❌ Cannot access `/admin/members` (should redirect)
   - ❌ Cannot access `/admin/financial-overview` (should redirect)

2. **Test as Tenant Admin:**
   - ❌ Cannot access `/admin/licensing` (should redirect)
   - ❌ Cannot access `/admin/menu-builder` (should redirect)
   - ✅ Can access `/admin/settings`
   - Access to other pages depends on permissions

3. **Test as Staff (with limited permissions):**
   - ❌ Cannot access super admin pages
   - ✅ Can access pages matching their permissions
   - ❌ Cannot access pages outside their permissions

### Automated Testing:

```typescript
// Test file: __tests__/admin-security.test.ts

describe('Admin Page Security', () => {
  it('redirects non-super-admin from licensing page', async () => {
    // Mock user without super admin role
    const response = await fetch('/admin/licensing');
    expect(response.status).toBe(302); // Redirect
    expect(response.headers.get('location')).toContain('unauthorized');
  });

  it('allows super admin to access licensing page', async () => {
    // Mock super admin user
    const response = await fetch('/admin/licensing');
    expect(response.status).toBe(200);
  });

  // ... more tests
});
```

## Security Best Practices

### ✅ DO:

- Always use `ProtectedAdminPage` for sensitive pages
- Use most restrictive access level needed
- Document security requirements in page comments
- Test access with different user roles
- Use preset components for common patterns
- Redirect to meaningful error pages (`/unauthorized?reason=...`)

### ❌ DON'T:

- Rely only on menu hiding for security
- Use client-side checks for authorization
- Grant excessive permissions "just to be safe"
- Skip protection on "internal" or "admin-only" pages
- Assume authentication is enough (need authorization too)
- Hard-code role checks instead of using AccessGate

## Migration Guide

### Existing Unprotected Page:

```typescript
// Before - INSECURE
export default async function MembersPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  return <MembersContent />;
}
```

### After Adding Protection:

```typescript
// After - SECURE
import { ProtectedAdminPage } from '@/components/access-gate/ProtectedAdminPage';

export default async function MembersPage() {
  return (
    <ProtectedAdminPage permission="members:read">
      <MembersContent />
    </ProtectedAdminPage>
  );
}
```

**Note:** `ProtectedAdminPage` handles authentication automatically - no need for manual auth checks!

## Common Issues

### Issue: "No tenant context" error

**Problem:** Page requires tenant but user doesn't have one (e.g., super admin)

**Solution:** Set `requireTenant={false}` for super admin pages:
```typescript
<ProtectedAdminPage superAdminOnly requireTenant={false}>
```

### Issue: Infinite redirect loop

**Problem:** Redirect path is also protected with same restrictions

**Solution:** Use `/unauthorized` (which should not be protected) or provide custom redirect:
```typescript
<ProtectedAdminPage
  permission="members:read"
  redirectTo="/admin?error=permission_denied"
>
```

### Issue: User has permission but still redirected

**Problem:** Permission name mismatch or RBAC not properly configured

**Solution:**
1. Check permission key matches database exactly (`members:read` not `members.read`)
2. Verify user role has the permission via `role_permissions` table
3. Check permission exists in `permissions` table

## Monitoring & Auditing

All AccessGate checks are automatically logged. Monitor failed access attempts:

```sql
-- Check recent unauthorized access attempts
SELECT
  event_type,
  user_id,
  resource_id,
  reason,
  created_at
FROM audit_logs
WHERE event_type = 'access_denied'
ORDER BY created_at DESC
LIMIT 100;
```

## Next Steps

1. **Audit all admin pages** - Review every page.tsx file in `/admin` directory
2. **Add protection** - Wrap unprotected pages with `ProtectedAdminPage`
3. **Document** - Add security comments to page headers
4. **Test** - Verify access with different user roles
5. **Monitor** - Check audit logs for unauthorized access attempts

## Questions?

Refer to:
- `src/components/access-gate/ProtectedAdminPage.tsx` - Component implementation
- `src/lib/access-gate/` - AccessGate system documentation
- `docs/access/ACCESS_GATE_GUIDE.md` - Comprehensive AccessGate guide
