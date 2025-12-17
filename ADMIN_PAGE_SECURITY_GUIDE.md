# Admin Page Security - Quick Reference

> ðŸ“– **Full Documentation**: See [docs/access/ACCESS_GATE_GUIDE.md](docs/access/ACCESS_GATE_GUIDE.md) for comprehensive Access Gate System documentation.

## Overview

This is a quick reference for protecting admin pages. Use the existing `ProtectedPage` component from the Access Gate System.

## The Problem

**Menu filtering is NOT enough!** Hiding menu items in the UI does not prevent users from directly accessing pages if they know the URL.

### Example Security Lapse:
```typescript
// âŒ INSECURE - Only hides menu item
if (user.role !== 'super_admin') {
  // Don't show "Licensing Studio" in menu
}

// But user can still visit: /admin/licensing directly!
```

## The Solution

Use the **Access Gate System** with `ProtectedPage` component (server-side protection):

```typescript
// âœ… SECURE - Server-side protection
import { Gate } from '@/lib/access-gate';
import { ProtectedPage } from '@/components/access-gate';

export default async function LicensingPage() {
  const userId = await getCurrentUserId();
  const gate = Gate.superAdminOnly();

  return (
    <ProtectedPage gate={gate} userId={userId}>
      <LicensingStudioContent />
    </ProtectedPage>
  );
}
```

## Quick Patterns

### Super Admin Only

```typescript
import { Gate } from '@/lib/access-gate';
import { ProtectedPage } from '@/components/access-gate';

const gate = Gate.superAdminOnly();

<ProtectedPage gate={gate} userId={userId}>
  {children}
</ProtectedPage>
```

**Use for:** Licensing Studio, Menu Builder

**Pages that need this:**
- `/admin/licensing` - Licensing Studio
- `/admin/menu-builder` - Menu Builder
- Any system-wide administration pages

### 2. Permission-Based Protection

Use for: Members, Finance, Reports, etc.

```typescript
import { Gate } from '@/lib/access-gate';
import { ProtectedPage } from '@/components/access-gate';

// Single permission
const gate = Gate.withPermission('members:view');

<ProtectedPage gate={gate} userId={userId}>
  {children}
</ProtectedPage>

// Multiple permissions (all required)
const allGate = all(
  Gate.withPermission('members:view'),
  Gate.withPermission('members:manage')
);

<ProtectedPage gate={allGate} userId={userId}>
  {children}
</ProtectedPage>

// Multiple permissions (any one required)
const anyGate = any(
  Gate.withPermission('members:view'),
  Gate.withPermission('members:manage')
);

<ProtectedPage gate={anyGate} userId={userId}>
  {children}
</ProtectedPage>
```

**Permission Mappings:**
- `/admin/members/**` â†’ `members:view` or `members:manage`
- `/admin/financial-overview` â†’ `finance:read`
- `/admin/expenses` â†’ `finance:read`
- `/admin/reports` â†’ `reports:read`
- `/admin/security/rbac/**` â†’ `rbac:manage`

### 3. Role-Based Protection

Use for: Settings, Admin-only pages

```typescript
import { Gate, any } from '@/lib/access-gate';
import { ProtectedPage } from '@/components/access-gate';

// Single role
const gate = Gate.withRole('tenant_admin');

<ProtectedPage gate={gate} userId={userId} tenantId={tenantId}>
  {children}
</ProtectedPage>

// Multiple roles (any one required)
const anyRoleGate = any(
  Gate.withRole('tenant_admin'),
  Gate.withRole('campus_pastor')
);

<ProtectedPage gate={anyRoleGate} userId={userId} tenantId={tenantId}>
  {children}
</ProtectedPage>
```

**Role Mappings:**
- `/admin/settings` â†’ `tenant_admin`
- Delegation pages â†’ `tenant_admin`

### 4. Surface-Based Protection

Use for: Metadata-driven pages with surface bindings

```typescript
import { Gate } from '@/lib/access-gate';
import { ProtectedPage } from '@/components/access-gate';

const gate = Gate.withSurface('member-management');

<ProtectedPage gate={gate} userId={userId} tenantId={tenantId}>
  {children}
</ProtectedPage>
```

### 5. Custom Gate Protection

Use for: Complex access logic

```typescript
import { Gate, all, any } from '@/lib/access-gate';
import { ProtectedPage } from '@/components/access-gate';

// Complex multi-condition gate
const complexGate = all(
  Gate.withPermission('finance:read'),
  Gate.withLicense('advanced-reports')
);

<ProtectedPage gate={complexGate} userId={userId} tenantId={tenantId}>
  {children}
</ProtectedPage>
```

## Page Protection Checklist

### All Admin Pages Must:

- [ ] Import `Gate` from `@/lib/access-gate`
- [ ] Import `ProtectedPage` from `@/components/access-gate`
- [ ] Create appropriate gate based on access requirements
- [ ] Get userId (and tenantId if needed) using server-side utilities
- [ ] Wrap the entire page content in `<ProtectedPage>`
- [ ] Add security comment in file header documenting protection level

### Example Template:

```typescript
/**
 * [Page Name]
 *
 * [Description]
 *
 * SECURITY: Protected by AccessGate with [protection type]
 */

import { Gate } from '@/lib/access-gate';
import { ProtectedPage } from '@/components/access-gate';
import { getCurrentUserId, getCurrentTenantId } from '@/lib/server/context';
import { PageContent } from '@/components/...';

export const metadata = {
  title: '[Page Title] | StewardTrack',
  description: '[Description]',
};

export default async function PageName() {
  const userId = await getCurrentUserId();
  const tenantId = await getCurrentTenantId(); // Only if needed

  const gate = Gate.withPermission('members:view'); // Or other gate type

  return (
    <ProtectedPage gate={gate} userId={userId} tenantId={tenantId}>
      <PageContent />
    </ProtectedPage>
  );
}
```

## Page Inventory & Required Protection

### ðŸ”´ Critical - Super Admin Only

- [x] `/admin/licensing/page.tsx` - `Gate.superAdminOnly()`
- [x] `/admin/menu-builder/page.tsx` - `Gate.superAdminOnly()` âœ… **DONE**
- [x] `/admin/settings/page.tsx` (system settings) - `Gate.superAdminOnly()`

### ðŸŸ¡ High Priority - Permission Required

- [x] `/admin/members/page.tsx` - `Gate.withPermission('members:view')`
- [x] `/admin/members/list/page.tsx` - `Gate.withPermission('members:view')`
- [x] `/admin/members/manage/page.tsx` - `Gate.withPermission('members:manage')`
- [x] `/admin/members/manage/lookup-new/page.tsx` - `Gate.withPermission('members:manage')`
- [x] `/admin/members/[memberId]/page.tsx` - `Gate.withPermission('members:view')`
- [x] `/admin/security/rbac/page.tsx` - `Gate.rbacAdmin()`
- [x] `/admin/security/rbac/**/page.tsx` (all subpages) - `Gate.rbacAdmin()`
- [x] `/admin/rbac/**/page.tsx` (all delegation pages) - `Gate.rbacAdmin()`

### ðŸŸ¢ Medium Priority - Role Required

- [x] `/admin/settings/page.tsx` (tenant settings) - `Gate.withRole('tenant_admin')`

### âšª Low Priority - General Access

- [x] `/admin/page.tsx` - Dashboard (authenticated only - use basic gate)
- [x] `/admin/docs/page.tsx` - Documentation (authenticated only - use basic gate)
- [x] `/admin/modules/page.tsx` - Modules (authenticated only - use basic gate)
- [x] `/admin/ui-blocks/**/page.tsx` - UI blocks (authenticated only - use basic gate)


## Security Best Practices

### âœ… DO:

- Always use `ProtectedPage` for sensitive pages
- Use most restrictive access level needed
- Document security requirements in page comments
- Test access with different user roles
- Create shared wrappers or layouts for recurring gate patterns
- Redirect to meaningful error pages (`/unauthorized?reason=...`)

### âŒ DON'T:

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
import { ProtectedPage } from '@/components/access-gate/ProtectedPage';

export default async function MembersPage() {
  return (
    <ProtectedPage permission="members:view">
      <MembersContent />
    </ProtectedPage>
  );
}
```

**Note:** `ProtectedPage` handles authentication automatically - no need for manual auth checks!

## Common Issues

### Issue: "No tenant context" error

**Problem:** Page requires tenant but user doesn't have one (e.g., super admin)

**Solution:** Set `requireTenant={false}` for super admin pages:
```typescript
<ProtectedPage superAdminOnly requireTenant={false}>
```

### Issue: Infinite redirect loop

**Problem:** Redirect path is also protected with same restrictions

**Solution:** Use `/unauthorized` (which should not be protected) or provide custom redirect:
```typescript
<ProtectedPage
  permission="members:view"
  redirectTo="/admin?error=permission_denied"
>
```

### Issue: User has permission but still redirected

**Problem:** Permission name mismatch or RBAC not properly configured

**Solution:**
1. Check permission key matches database exactly (`members:view` not `members.read`)
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
2. **Add protection** - Wrap unprotected pages with `ProtectedPage`
3. **Document** - Add security comments to page headers
4. **Test** - Verify access with different user roles
5. **Monitor** - Check audit logs for unauthorized access attempts

## Questions?

Refer to:
- `src/components/access-gate/ProtectedPage.tsx` - Component implementation
- `src/lib/access-gate/` - AccessGate system documentation
- `docs/access/ACCESS_GATE_GUIDE.md` - Comprehensive AccessGate guide
