# Services Directory - Architecture & Patterns

## Overview

The `services/` directory contains the **business logic layer** of StewardTrack. Services orchestrate complex operations by coordinating between multiple repositories, implementing domain rules, and providing unified interfaces for application features.

**Key Principle:** Services are stateless, request-scoped, and follow dependency injection patterns via InversifyJS.

## Architecture Pattern

### Service Layer Responsibilities

Services in this directory:
- **Orchestrate** business workflows across multiple repositories
- **Enforce** business rules and validation logic
- **Coordinate** transactional operations
- **Aggregate** data from multiple sources
- **Transform** data between domain and presentation layers
- **Log** audit events (when RbacAuditService is implemented)

**Services DO NOT:**
- Access the database directly (use repositories)
- Convert database rows to domain models (use adapters)
- Handle HTTP requests/responses (that's API routes)
- Maintain state between requests

### Dependency Injection Pattern

All services follow this pattern:

```typescript
import 'server-only';
import { injectable, inject } from 'inversify';
import { TYPES } from '@/lib/types';

@injectable()
export class MyService {
  constructor(
    @inject(TYPES.IMyRepository)
    private myRepository: IMyRepository,
    @inject(TYPES.IOtherService)
    private otherService: IOtherService
  ) {}

  async doSomething(data: SomeDto): Promise<Result> {
    // Business logic here
  }
}
```

**Critical Requirements:**
1. **`'server-only'`** import at the top prevents client-side usage
2. **`@injectable()`** decorator registers the class with the DI container
3. **`@inject(TYPES.X)`** decorator injects dependencies by type symbol
4. **Private readonly** dependencies in constructor
5. Services are bound in `src/lib/container.ts` with `.inRequestScope()`

### Tenant Resolution Pattern

Services must resolve tenant context for multi-tenant isolation:

```typescript
private async resolveTenantId(tenantId?: string): Promise<string> {
  const resolved = tenantId ?? (await tenantUtils.getTenantId());
  if (!resolved) {
    throw new Error('No tenant context available');
  }
  return resolved;
}

async myMethod(param: string, tenantId?: string): Promise<Result> {
  const effectiveTenantId = await this.resolveTenantId(tenantId);
  return await this.repository.doSomething(param, effectiveTenantId);
}
```

**Why Optional `tenantId` Parameter?**
- Allows API routes to explicitly pass tenant (for admin operations)
- Falls back to current user's tenant context (via `tenantUtils.getTenantId()`)
- Provides flexibility for system-level operations

## Major Service Categories

### RBAC Services

**Core Services:**
- **`RbacCoreService.ts`** - Role, permission, and user-role management
- **`RbacFeatureService.ts`** - Feature flag grants and license feature integration
- **`RbacDelegationService.ts`** - Simplified role-based delegation with scopes
- **`RbacPublishingService.ts`** - Compile/publish RBAC state changes
- **`RbacStatisticsService.ts`** - Dashboard statistics and analytics

**Key Patterns:**
- **Direct Permission Assignment:** No permission bundles - permissions assigned directly to roles
- **Multi-Role Support:** Users can have multiple roles; conflict analysis provided
- **Scope-Based Delegation:** Delegate complete roles with Campus/Ministry/Event scopes
- **Feature-Permission Mapping:** Features mapped to required permissions via `feature_permissions` table

```typescript
// Example: Role creation with permission assignment
const role = await rbacCoreService.createRole({
  name: 'Finance Manager',
  description: 'Manages church finances',
  scope: 'tenant'
}, tenantId);

// Directly assign permissions (no bundles)
await rbacCoreService.assignPermissions(role.id, [
  'finance:read',
  'finance:write',
  'donations:read'
], tenantId);
```

### Licensing Services

**Core Services:**
- **`LicensingService.ts`** - Product offerings, feature bundles, tenant provisioning
- **`LicenseFeatureService.ts`** - Feature grant management
- **`LicenseValidationService.ts`** - License compliance checking
- **`LicenseMonitoringService.ts`** - Health monitoring and alerts

**Key Patterns:**
- **Tier-Based Features:** Essential → Professional → Enterprise → Premium
- **Feature Bundles:** Groups of features packaged together (e.g., "Advanced Reporting Bundle")
- **Tenant Provisioning:** Automatic feature grant during registration
- **License Assignment:** Manual assignment by product owners via Licensing Studio

```typescript
// Example: Provision tenant with product offering
await licensingService.provisionTenantLicense(
  tenantId,
  'professional_tier_offering_id'
);

// Example: Check feature access
const hasFeature = await licenseFeatureService.tenantHasFeature(
  tenantId,
  'advanced_reporting'
);
```

### Domain Services

Services organized by church management domains:
- **Members:** Member management, profiles, family relationships
- **Donations:** Contribution tracking, pledges, receipts
- **Events:** Event scheduling, registrations, attendance
- **Communications:** Email, SMS, notifications
- **Finance:** General ledger, budgeting, reports

## Best Practices

### 1. Error Handling

Always throw descriptive errors with context:

```typescript
async getUserRoles(userId: string, tenantId?: string): Promise<Role[]> {
  const effectiveTenantId = tenantId || await tenantUtils.getTenantId();
  if (!effectiveTenantId) {
    throw new Error('No tenant context available');
  }

  try {
    return await this.userRoleRepository.getUserRoles(userId, effectiveTenantId);
  } catch (error) {
    throw new Error(`Failed to retrieve user roles for ${userId}: ${error.message}`);
  }
}
```

### 2. Transaction Coordination

For multi-step operations, coordinate repositories:

```typescript
async createRoleWithPermissions(
  roleData: CreateRoleDto,
  permissionIds: string[],
  tenantId: string
): Promise<RoleWithPermissions> {
  // Step 1: Create role
  const role = await this.roleRepository.createRole(roleData, tenantId);

  // Step 2: Assign permissions
  for (const permissionId of permissionIds) {
    await this.rolePermissionRepository.assignPermission(
      role.id,
      permissionId,
      tenantId
    );
  }

  // Step 3: Return complete role with permissions
  return await this.roleRepository.getRoleWithPermissions(role.id, tenantId);
}
```

### 3. Audit Logging (Future)

Placeholder pattern for audit events:

```typescript
// TODO: Log audit event when RbacAuditService is available
// await this.auditService.logAuditEvent({
//   tenant_id: effectiveTenantId,
//   user_id: currentUserId,
//   action: 'CREATE_ROLE',
//   resource_type: 'role',
//   resource_id: role.id,
//   new_values: data
// });
```

### 4. Deduplication & Idempotency

For bulk operations, deduplicate to prevent conflicts:

```typescript
// Build grants map to deduplicate
const grantsMap = new Map<string, any>();

for (const feature of features) {
  const uniqueKey = `${feature.feature_id}|${feature.package_id}`;

  if (!grantsMap.has(uniqueKey)) {
    grantsMap.set(uniqueKey, {
      tenant_id: tenantId,
      feature_id: feature.feature_id,
      grant_source: 'package'
    });
  }
}

const featureGrants = Array.from(grantsMap.values());
```

### 5. Aggregation & Calculation

Services aggregate data across repositories:

```typescript
async getUserEffectivePermissions(userId: string, tenantId: string): Promise<Permission[]> {
  // Get user's roles
  const userRoles = await this.userRoleRepository.getUserRoles(userId, tenantId);

  // Aggregate permissions from all roles
  const permissionMap = new Map<string, Permission>();

  for (const role of userRoles) {
    const roleWithPerms = await this.roleRepository.getRoleWithPermissions(role.id, tenantId);
    if (roleWithPerms?.permissions) {
      roleWithPerms.permissions.forEach(perm => {
        permissionMap.set(perm.id, perm);
      });
    }
  }

  return Array.from(permissionMap.values());
}
```

## Testing Strategy

**Current State:** No automated testing framework configured.

**Manual Testing Approach:**
1. Start local Supabase stack
2. Test service methods via API routes
3. Verify database state changes
4. Check audit logs (when implemented)

**Recommended Future Tests:**
- Unit tests with mocked repositories
- Integration tests with test database
- Transaction rollback tests
- Tenant isolation verification

## Common Patterns Summary

| Pattern | Usage | Example |
|---------|-------|---------|
| **Tenant Resolution** | All tenant-scoped methods | `resolveTenantId()` |
| **Dependency Injection** | All service constructors | `@inject(TYPES.X)` |
| **Audit Logging** | State-changing operations | `// TODO: Log audit event` |
| **Error Wrapping** | Repository failures | `throw new Error(\`Failed to...\`)` |
| **Aggregation** | Cross-repository queries | `getUserEffectivePermissions()` |
| **Deduplication** | Bulk operations | `Map<string, T>` pattern |

## Anti-Patterns to Avoid

❌ **Direct Database Access**
```typescript
// BAD: Service accessing Supabase directly
const supabase = createClient();
const { data } = await supabase.from('roles').select('*');
```

✅ **Use Repositories**
```typescript
// GOOD: Service using repository
const roles = await this.roleRepository.getRoles(tenantId);
```

❌ **Stateful Services**
```typescript
// BAD: Storing state in service instance
private currentTenantId: string;
```

✅ **Stateless Operations**
```typescript
// GOOD: Pass tenant in each method call
async method(data: Dto, tenantId: string): Promise<Result>
```

❌ **Mixing Concerns**
```typescript
// BAD: Service handling HTTP responses
return NextResponse.json({ data });
```

✅ **Return Domain Objects**
```typescript
// GOOD: Service returns domain models
return roles;
```

## Adding a New Service

1. **Create Service File:** `src/services/MyService.ts`
2. **Define Interface:** `IMyService` with method signatures
3. **Implement Class:** With `@injectable()` decorator
4. **Add Type Symbol:** In `src/lib/types.ts`
5. **Register in Container:** In `src/lib/container.ts`
6. **Inject Dependencies:** Via constructor with `@inject()`

**Template:**
```typescript
import 'server-only';
import { injectable, inject } from 'inversify';
import { TYPES } from '@/lib/types';
import type { IMyRepository } from '@/repositories/my.repository';
import { tenantUtils } from '@/utils/tenantUtils';

export interface IMyService {
  doSomething(param: string, tenantId?: string): Promise<Result>;
}

@injectable()
export class MyService implements IMyService {
  constructor(
    @inject(TYPES.IMyRepository)
    private myRepository: IMyRepository
  ) {}

  private async resolveTenantId(tenantId?: string): Promise<string> {
    const resolved = tenantId ?? (await tenantUtils.getTenantId());
    if (!resolved) {
      throw new Error('No tenant context available');
    }
    return resolved;
  }

  async doSomething(param: string, tenantId?: string): Promise<Result> {
    const effectiveTenantId = await this.resolveTenantId(tenantId);
    return await this.myRepository.doSomething(param, effectiveTenantId);
  }
}
```

## Related Documentation

- **Repository Layer:** `src/repositories/claude.md`
- **Adapter Layer:** `src/adapters/claude.md`
- **DI Container:** `src/lib/claude.md`
- **API Routes:** `src/app/api/claude.md`