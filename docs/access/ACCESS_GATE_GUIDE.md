# Access Gate System - User Guide

## Overview

The **Access Gate System** is a comprehensive, pattern-based access control solution that allows you to protect pages, features, and sections with simple, short lines of code. It combines RBAC (Role-Based Access Control) and licensing checks into a unified, elegant API.

## Design Patterns Used

- **Strategy Pattern**: Different access check strategies (RBAC, Licensing, Combined)
- **Chain of Responsibility**: Combining multiple access checks
- **Factory Pattern**: Simple creation of access gates
- **Decorator Pattern**: Adding additional checks to existing gates

## Quick Start

### 1. Server-Side Usage (Recommended)

#### Protect an Entire Page

```typescript
// app/admin/page.tsx
import { Gate } from '@/lib/access-gate';
import { ProtectedPage } from '@/components/access-gate';
import { getCurrentUserId } from '@/utils/authUtils';

export default async function AdminPage() {
  const userId = await getCurrentUserId();

  // Single line of code to protect the entire page!
  const gate = Gate.forSurface('admin-panel');

  return (
    <ProtectedPage gate={gate} userId={userId}>
      <AdminDashboard />
    </ProtectedPage>
  );
}
```

#### Protect API Routes

```typescript
// app/api/members/delete/route.ts
import { Gate } from '@/lib/access-gate';
import { gateProtected } from '@/lib/access-gate/middleware';
import { getUserIdFromRequest } from '@/utils/authUtils';

// Single line to protect the route!
export const DELETE = gateProtected(
  Gate.withPermission('members.delete'),
  getUserIdFromRequest
)(async (request) => {
  // Your protected logic here
  return NextResponse.json({ success: true });
});
```

#### Protect Server Actions

```typescript
// actions/deleteUser.ts
'use server'

import { Gate } from '@/lib/access-gate';
import { checkGate } from '@/lib/access-gate/middleware';
import { getCurrentUserId } from '@/utils/authUtils';

export async function deleteUser(userId: string) {
  // Single line to check access!
  await checkGate(Gate.withPermission('users.delete'), await getCurrentUserId());

  // Protected logic
  await db.user.delete({ where: { id: userId } });
}
```

### 2. Client-Side Usage

#### Protect UI Sections

```typescript
// components/MemberDashboard.tsx
'use client';

import { ProtectedSection } from '@/components/access-gate';

export function MemberDashboard({ userId }: { userId: string }) {
  return (
    <div>
      <h1>Member Dashboard</h1>

      {/* Protect by permission - single line! */}
      <ProtectedSection userId={userId} permissions="members.edit">
        <EditButton />
      </ProtectedSection>

      {/* Protect by surface */}
      <ProtectedSection userId={userId} surfaceId="member-reports">
        <ReportsSection />
      </ProtectedSection>

      {/* Protect by role */}
      <ProtectedSection
        userId={userId}
        roles={['campus-pastor', 'senior-pastor']}
        fallback={<div>Campus Pastor access required</div>}
      >
        <CampusManagement />
      </ProtectedSection>
    </div>
  );
}
```

#### Hide Sections (No Fallback)

```typescript
<ProtectedSection
  userId={userId}
  permissions="finance.view"
  hideOnDenied={true}
>
  <FinanceWidget />
</ProtectedSection>
```

## Gate Types

### 1. Surface Gate (RBAC + Licensing)

Checks both RBAC permissions and licensing for a specific surface.

```typescript
const gate = Gate.forSurface('member-management');
```

### 2. Permission Gate

Checks RBAC permissions only.

```typescript
// Single permission
const gate = Gate.withPermission('members.edit');

// Multiple permissions (all required - AND logic)
const gate = Gate.withPermission(['members.edit', 'members.delete'], 'all');

// Multiple permissions (any required - OR logic)
const gate = Gate.withPermission(['members.edit', 'members.delete'], 'any');
```

### 3. License Gate

Checks if tenant has license for a feature.

```typescript
const gate = Gate.withLicense('advanced-reports');
```

### 4. Role Gate

Checks if user has specific roles.

```typescript
// Single role
const gate = Gate.withRole('campus-pastor');

// Multiple roles (any required - OR logic)
const gate = Gate.withRole(['campus-pastor', 'senior-pastor'], 'any');

// Multiple roles (all required - AND logic)
const gate = Gate.withRole(['campus-pastor', 'finance-manager'], 'all');
```

### 5. Super Admin Gate

Checks if user is a super admin.

```typescript
const gate = Gate.superAdminOnly();
```

### 6. Authenticated Gate

Simply checks if user is authenticated.

```typescript
const gate = Gate.authenticated();
```

### 7. Custom Gate

Create custom access logic.

```typescript
const gate = Gate.custom(
  async (userId, tenantId) => {
    // Your custom logic
    const user = await getUser(userId);
    return user.isActive && user.emailVerified;
  },
  'User must be active and email verified'
);
```

## Combining Gates

### AND Logic (All gates must pass)

```typescript
import { all, Gate } from '@/lib/access-gate';

const gate = all(
  Gate.authenticated(),
  Gate.withPermission('members.edit'),
  Gate.withLicense('advanced-features')
);
```

### OR Logic (Any gate can pass)

```typescript
import { any, Gate } from '@/lib/access-gate';

const gate = any(
  Gate.superAdminOnly(),
  Gate.withRole('campus-pastor')
);
```

### Complex Combinations

```typescript
import { all, any, Gate } from '@/lib/access-gate';

// (Super Admin OR Campus Pastor) AND Has License
const gate = all(
  any(
    Gate.superAdminOnly(),
    Gate.withRole('campus-pastor')
  ),
  Gate.withLicense('multi-campus-features')
);
```

## Configuration Options

All gates accept optional configuration:

```typescript
const gate = Gate.withPermission('members.edit', 'all', {
  fallbackPath: '/no-access',  // Custom redirect path
  gracefulFail: true,           // Don't throw errors, just return false
});
```

## Direct Gate Usage

For maximum flexibility, use gates directly:

```typescript
import { Gate } from '@/lib/access-gate';

async function checkUserAccess(userId: string) {
  const gate = Gate.withPermission('members.edit');

  // Method 1: Check and get result
  const result = await gate.check(userId);
  if (result.allowed) {
    console.log('Access granted');
  } else {
    console.log('Denied:', result.reason);
  }

  // Method 2: Verify (throws on denial)
  try {
    await gate.verify(userId);
    console.log('Access granted');
  } catch (error) {
    console.error('Access denied:', error.message);
  }

  // Method 3: Simple boolean check
  const canAccess = await gate.allows(userId);
}
```

## Real-World Examples

### Example 1: Admin Page with Multiple Checks

```typescript
// app/admin/settings/page.tsx
import { all, Gate } from '@/lib/access-gate';
import { ProtectedPage } from '@/components/access-gate';

export default async function AdminSettingsPage() {
  const userId = await getCurrentUserId();

  // Must be authenticated AND super admin AND have license
  const gate = all(
    Gate.authenticated(),
    Gate.superAdminOnly(),
    Gate.withLicense('admin-features')
  );

  return (
    <ProtectedPage gate={gate} userId={userId} redirectTo="/unauthorized">
      <AdminSettings />
    </ProtectedPage>
  );
}
```

### Example 2: Conditional UI Elements

```typescript
'use client';

import { ProtectedSection } from '@/components/access-gate';

export function MemberCard({ userId, member }) {
  return (
    <div className="member-card">
      <h3>{member.name}</h3>
      <p>{member.email}</p>

      {/* Show edit button only if user can edit */}
      <ProtectedSection
        userId={userId}
        permissions="members.edit"
        hideOnDenied={true}
      >
        <button onClick={() => editMember(member.id)}>Edit</button>
      </ProtectedSection>

      {/* Show delete button only if user can delete */}
      <ProtectedSection
        userId={userId}
        permissions="members.delete"
        hideOnDenied={true}
      >
        <button onClick={() => deleteMember(member.id)}>Delete</button>
      </ProtectedSection>
    </div>
  );
}
```

### Example 3: Protected API Endpoint with Custom Logic

```typescript
// app/api/reports/advanced/route.ts
import { all, Gate } from '@/lib/access-gate';
import { gateProtected } from '@/lib/access-gate/middleware';

export const GET = gateProtected(
  all(
    Gate.withPermission('reports.view'),
    Gate.withLicense('advanced-reports'),
    Gate.custom(
      async (userId) => {
        const user = await getUser(userId);
        return user.reportQuotaRemaining > 0;
      },
      'Report quota exceeded'
    )
  ),
  getUserIdFromRequest,
  getTenantIdFromRequest
)(async (request) => {
  // Generate and return report
  return NextResponse.json({ report: generateAdvancedReport() });
});
```

### Example 4: Campus-Scoped Access

```typescript
// app/campus/[campusId]/page.tsx
import { Gate } from '@/lib/access-gate';
import { ProtectedPage } from '@/components/access-gate';

export default async function CampusPage({ params }: { params: { campusId: string } }) {
  const userId = await getCurrentUserId();

  const gate = Gate.custom(
    async (userId, tenantId) => {
      const userCampuses = await getUserCampuses(userId, tenantId);
      return userCampuses.includes(params.campusId);
    },
    'You do not have access to this campus'
  );

  return (
    <ProtectedPage gate={gate} userId={userId}>
      <CampusDashboard campusId={params.campusId} />
    </ProtectedPage>
  );
}
```

### Example 5: Upgrade Prompts

```typescript
'use client';

import { GateGuard } from '@/components/access-gate';
import { Gate } from '@/lib/access-gate';

export function PremiumFeature({ userId }) {
  const checkAccess = async () => {
    const gate = Gate.withLicense('premium-features');
    return await gate.check(userId);
  };

  return (
    <GateGuard
      check={checkAccess}
      fallback={
        <div className="upgrade-prompt">
          <h3>Premium Feature</h3>
          <p>Upgrade your plan to access this feature</p>
          <button>Upgrade Now</button>
        </div>
      }
    >
      <PremiumContent />
    </GateGuard>
  );
}
```

## Best Practices

### 1. Always Use Server-Side Protection for Critical Routes

```typescript
// ✅ Good - Server-side protection
export const DELETE = gateProtected(
  Gate.withPermission('users.delete'),
  getUserIdFromRequest
)(async (request) => {
  // Delete logic
});

// ❌ Bad - Client-side only (can be bypassed)
// Don't rely solely on client-side protection for critical operations
```

### 2. Use Client-Side Protection for UX

```typescript
// Use client components to hide/show UI elements
<ProtectedSection userId={userId} permissions="admin.access" hideOnDenied>
  <AdminPanel />
</ProtectedSection>
```

### 3. Combine Gates for Complex Logic

```typescript
// Use all() and any() to create complex access rules
const gate = all(
  Gate.authenticated(),
  any(
    Gate.superAdminOnly(),
    all(
      Gate.withRole('campus-pastor'),
      Gate.withLicense('multi-campus')
    )
  )
);
```

### 4. Handle Errors Gracefully

```typescript
const gate = Gate.withPermission('members.edit', 'all', {
  gracefulFail: true,  // Don't throw errors
  fallbackPath: '/unauthorized'
});
```

## Summary

The Access Gate System provides:

✅ **Simple API**: One-line protection for pages, routes, and sections
✅ **Flexible**: Multiple gate types and combination strategies
✅ **Type-Safe**: Full TypeScript support
✅ **Reusable**: Create once, use anywhere
✅ **Composable**: Combine gates with AND/OR logic
✅ **Integrated**: Works with existing RBAC and licensing systems

Start protecting your application with just one line of code:

```typescript
const gate = Gate.forSurface('admin-panel');
await gate.verify(userId);
```
