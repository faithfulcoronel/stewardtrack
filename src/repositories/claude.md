# Repositories Directory - Architecture & Patterns

## Overview

The `repositories/` directory implements the **data access layer** of StewardTrack. Repositories act as an abstraction between the business logic (services) and the underlying database (Supabase), delegating actual database operations to adapters.

**Key Principle:** Repositories define the contract for data operations, while adapters implement the database-specific logic.

## Architecture Pattern

### Repository Layer Responsibilities

Repositories in this directory:
- **Define interfaces** for data access operations
- **Delegate** to adapters for actual database queries
- **Extend** `BaseRepository` for common CRUD operations
- **Enforce** tenant isolation via required `tenantId` parameters
- **Provide** type-safe data access methods

**Repositories DO NOT:**
- Execute SQL directly (adapters handle that)
- Transform database rows to models (adapters do that)
- Implement business logic (that's for services)
- Handle HTTP requests/responses

### Standard Repository Pattern

All repositories follow this structure:

```typescript
import { injectable, inject } from 'inversify';
import { BaseRepository } from '@/repositories/base.repository';
import type { IMyAdapter } from '@/adapters/my.adapter';
import type { MyModel, CreateMyDto, UpdateMyDto } from '@/models/my.model';
import { TYPES } from '@/lib/types';

// Interface defines the contract
export interface IMyRepository extends BaseRepository<MyModel> {
  create(data: CreateMyDto, tenantId: string): Promise<MyModel>;
  update(id: string, data: UpdateMyDto, tenantId: string): Promise<MyModel>;
  delete(id: string, tenantId: string): Promise<void>;
  findById(id: string, tenantId: string): Promise<MyModel | null>;
  findAll(tenantId: string): Promise<MyModel[]>;
}

// Implementation delegates to adapter
@injectable()
export class MyRepository extends BaseRepository<MyModel> implements IMyRepository {
  constructor(@inject(TYPES.IMyAdapter) private readonly myAdapter: IMyAdapter) {
    super(myAdapter);
  }

  async create(data: CreateMyDto, tenantId: string): Promise<MyModel> {
    return await this.myAdapter.create(data, tenantId);
  }

  async update(id: string, data: UpdateMyDto, tenantId: string): Promise<MyModel> {
    return await this.myAdapter.update(id, data, tenantId);
  }

  async delete(id: string, tenantId: string): Promise<void> {
    return await this.myAdapter.delete(id, tenantId);
  }

  async findById(id: string, tenantId: string): Promise<MyModel | null> {
    return await this.myAdapter.findById(id, tenantId);
  }

  async findAll(tenantId: string): Promise<MyModel[]> {
    return await this.myAdapter.findAll(tenantId);
  }
}
```

### BaseRepository Pattern

The `BaseRepository<T>` class provides common operations inherited by all repositories:

```typescript
export abstract class BaseRepository<T> {
  protected adapter: IBaseAdapter<T>;

  constructor(adapter: IBaseAdapter<T>) {
    this.adapter = adapter;
  }

  async findById(id: string): Promise<T | null> {
    return await this.adapter.findById(id);
  }

  async findAll(): Promise<T[]> {
    return await this.adapter.findAll();
  }

  // ... other common methods
}
```

**Why This Pattern?**
- **Separation of Concerns:** Repositories define operations, adapters implement them
- **Testability:** Easy to mock repositories in service tests
- **Flexibility:** Can swap database implementations by changing adapters
- **Type Safety:** Strongly typed interfaces prevent runtime errors

## Major Repository Categories

### RBAC Repositories

**Core Repositories:**
- **`role.repository.ts`** - Role CRUD operations
- **`permission.repository.ts`** - Permission queries
- **`userRole.repository.ts`** - User-role assignment management
- **`delegation.repository.ts`** - Delegation operations with scopes

**Example: Role Repository Interface**
```typescript
export interface IRoleRepository extends BaseRepository<Role> {
  createRole(data: CreateRoleDto, tenantId: string): Promise<Role>;
  updateRole(id: string, data: UpdateRoleDto, tenantId: string): Promise<Role>;
  deleteRole(id: string, tenantId: string): Promise<void>;
  getRoles(tenantId: string, includeSystem?: boolean): Promise<Role[]>;
  getRole(roleId: string): Promise<Role | null>;
  getRoleWithPermissions(id: string, tenantId: string): Promise<RoleWithPermissions | null>;
  getRoleStatistics(tenantId: string, includeSystem?: boolean): Promise<Role[]>;
  findByMetadataKey(tenantId: string, metadataKey: string): Promise<Role | null>;
}
```

### Licensing Repositories

**Core Repositories:**
- **`productOffering.repository.ts`** - Product offerings and pricing plans
- **`licenseFeatureBundle.repository.ts`** - Feature bundle management
- **`tenantFeatureGrant.repository.ts`** - Tenant feature access grants
- **`licenseAssignment.repository.ts`** - Manual license assignments

**Pattern: Complex Queries**
```typescript
async getOfferingWithFeatures(id: string): Promise<ProductOfferingWithFeatures | null> {
  return await this.productOfferingAdapter.getOfferingWithFeatures(id);
}

async getOfferingBundles(offeringId: string): Promise<BundleInfo[]> {
  return await this.productOfferingAdapter.getOfferingBundles(offeringId);
}
```

### Domain Repositories

Repositories for church management entities:
- **Members:** `member.repository.ts`, `family.repository.ts`
- **Donations:** `donation.repository.ts`, `pledge.repository.ts`
- **Events:** `event.repository.ts`, `registration.repository.ts`
- **Communications:** `message.repository.ts`, `notification.repository.ts`

## Key Patterns

### 1. Tenant Isolation

**Every repository method** that accesses tenant-scoped data **MUST** require `tenantId`:

```typescript
// CORRECT: Tenant ID required
async getRoles(tenantId: string, includeSystem: boolean = true): Promise<Role[]> {
  return await this.roleAdapter.getRoles(tenantId, includeSystem);
}

// INCORRECT: Missing tenant ID
async getRoles(includeSystem: boolean = true): Promise<Role[]> {
  return await this.roleAdapter.getRoles(includeSystem); // ❌ Security risk!
}
```

**Why?** This enforces multi-tenant isolation at the data access layer and prevents accidental cross-tenant data leaks.

### 2. Delegation to Adapters

Repositories are thin wrappers that delegate to adapters:

```typescript
@injectable()
export class RoleRepository extends BaseRepository<Role> implements IRoleRepository {
  constructor(@inject(TYPES.IRoleAdapter) private readonly roleAdapter: IRoleAdapter) {
    super(roleAdapter);
  }

  // Simple delegation
  async createRole(data: CreateRoleDto, tenantId: string): Promise<Role> {
    return await this.roleAdapter.createRole(data, tenantId);
  }

  // Delegation with validation
  async deleteRole(id: string, tenantId: string): Promise<void> {
    // Could add validation here before delegating
    return await this.roleAdapter.deleteRole(id, tenantId);
  }
}
```

### 3. Composite Queries

Repositories can orchestrate multiple adapter calls for complex data:

```typescript
async getRoleWithPermissions(id: string, tenantId: string): Promise<RoleWithPermissions | null> {
  // Adapter handles the join query and returns enriched data
  return await this.roleAdapter.getRoleWithPermissions(id, tenantId);
}
```

### 4. Interface-First Design

Always define the interface before implementation:

```typescript
// 1. Define interface
export interface IMyRepository extends BaseRepository<MyModel> {
  myMethod(param: string, tenantId: string): Promise<MyModel>;
}

// 2. Implement repository
@injectable()
export class MyRepository extends BaseRepository<MyModel> implements IMyRepository {
  // Implementation
}

// 3. Register in DI container (src/lib/container.ts)
container.bind<IMyRepository>(TYPES.IMyRepository).to(MyRepository).inRequestScope();

// 4. Services inject interface, not implementation
constructor(@inject(TYPES.IMyRepository) private myRepository: IMyRepository) {}
```

## Best Practices

### 1. Method Naming Conventions

Use consistent verb prefixes:

| Prefix | Purpose | Example |
|--------|---------|---------|
| `create` | Create new record | `createRole(data, tenantId)` |
| `update` | Update existing record | `updateRole(id, data, tenantId)` |
| `delete` | Delete record | `deleteRole(id, tenantId)` |
| `get` | Retrieve single/multiple records | `getRole(id)`, `getRoles(tenantId)` |
| `find` | Search with criteria | `findByMetadataKey(tenantId, key)` |
| `assign` | Create relationship | `assignRole(userId, roleId, tenantId)` |
| `revoke` | Remove relationship | `revokeRole(userId, roleId, tenantId)` |

### 2. Return Types

- **Single record:** `Promise<T | null>` (null if not found)
- **Multiple records:** `Promise<T[]>` (empty array if none)
- **Creation:** `Promise<T>` (return created entity)
- **Update:** `Promise<T>` (return updated entity)
- **Deletion:** `Promise<void>` (no return value)
- **Count:** `Promise<number>`

### 3. Error Handling

Repositories propagate adapter errors:

```typescript
async getRole(roleId: string): Promise<Role | null> {
  // Adapter will throw descriptive error if query fails
  return await this.roleAdapter.getRole(roleId);
}
```

**Don't catch and swallow errors** - let them bubble up to services/API routes.

### 4. Optional Parameters

Use optional parameters for filters, not core identifiers:

```typescript
// GOOD: Optional filter
async getRoles(tenantId: string, includeSystem?: boolean): Promise<Role[]>

// BAD: Optional tenant ID (security risk)
async getRoles(includeSystem: boolean, tenantId?: string): Promise<Role[]>
```

## Repository-Adapter Relationship

```
┌─────────────┐
│   Service   │  (Business Logic)
└──────┬──────┘
       │ calls
       ▼
┌─────────────┐
│ Repository  │  (Data Access Interface)
└──────┬──────┘
       │ delegates to
       ▼
┌─────────────┐
│   Adapter   │  (Database Implementation)
└──────┬──────┘
       │ queries
       ▼
┌─────────────┐
│  Supabase   │  (Database)
└─────────────┘
```

**Responsibilities:**
- **Repository:** Define contract, enforce tenant isolation
- **Adapter:** Execute queries, transform data, handle errors

## Common Repository Patterns

### Pattern 1: Simple CRUD

```typescript
export interface ISimpleRepository extends BaseRepository<SimpleModel> {
  create(data: CreateDto, tenantId: string): Promise<SimpleModel>;
  update(id: string, data: UpdateDto, tenantId: string): Promise<SimpleModel>;
  delete(id: string, tenantId: string): Promise<void>;
  findAll(tenantId: string): Promise<SimpleModel[]>;
}
```

### Pattern 2: Relationship Management

```typescript
export interface IUserRoleRepository extends BaseRepository<UserRole> {
  assignRole(data: AssignRoleDto, tenantId: string, assignedBy?: string): Promise<UserRole>;
  revokeRole(userId: string, roleId: string, tenantId: string): Promise<void>;
  getUserRoles(userId: string, tenantId: string): Promise<Role[]>;
  getUsersWithRole(roleId: string, tenantId: string): Promise<any[]>;
}
```

### Pattern 3: Complex Queries

```typescript
export interface IRoleRepository extends BaseRepository<Role> {
  getRoleWithPermissions(id: string, tenantId: string): Promise<RoleWithPermissions | null>;
  getRoleStatistics(tenantId: string, includeSystem?: boolean): Promise<Role[]>;
  findByMetadataKey(tenantId: string, metadataKey: string): Promise<Role | null>;
}
```

### Pattern 4: Aggregation

```typescript
export interface IStatsRepository {
  getDashboardStats(tenantId: string): Promise<DashboardStats>;
  getRoleDistribution(tenantId: string): Promise<RoleDistribution[]>;
  getPermissionUsage(tenantId: string): Promise<PermissionUsage[]>;
}
```

## Anti-Patterns to Avoid

❌ **Business Logic in Repository**
```typescript
// BAD: Repository implementing business rules
async createRole(data: CreateRoleDto, tenantId: string): Promise<Role> {
  if (data.name === 'admin') {
    // ❌ Business logic doesn't belong here
    data.permissions = await this.getAllPermissions();
  }
  return await this.roleAdapter.createRole(data, tenantId);
}
```

✅ **Keep Repositories Thin**
```typescript
// GOOD: Simple delegation
async createRole(data: CreateRoleDto, tenantId: string): Promise<Role> {
  return await this.roleAdapter.createRole(data, tenantId);
}
```

❌ **Direct Database Access**
```typescript
// BAD: Repository accessing Supabase directly
async getRoles(tenantId: string): Promise<Role[]> {
  const supabase = createClient();
  const { data } = await supabase.from('roles').select('*');
  return data;
}
```

✅ **Delegate to Adapter**
```typescript
// GOOD: Delegate to adapter
async getRoles(tenantId: string): Promise<Role[]> {
  return await this.roleAdapter.getRoles(tenantId);
}
```

❌ **Optional Tenant ID**
```typescript
// BAD: Security risk - tenant ID should be required
async getRoles(includeSystem: boolean, tenantId?: string): Promise<Role[]>
```

✅ **Required Tenant ID**
```typescript
// GOOD: Enforces tenant isolation
async getRoles(tenantId: string, includeSystem?: boolean): Promise<Role[]>
```

## Testing Repositories

**Current State:** No automated tests configured.

**Recommended Testing Approach:**
1. **Mock the adapter** in repository tests
2. **Verify** repository calls adapter with correct parameters
3. **Test** error propagation from adapter to repository

```typescript
// Example test (when testing framework is added)
describe('RoleRepository', () => {
  it('should delegate to adapter', async () => {
    const mockAdapter = {
      getRoles: jest.fn().mockResolvedValue([mockRole])
    };
    const repository = new RoleRepository(mockAdapter);

    const result = await repository.getRoles('tenant-123');

    expect(mockAdapter.getRoles).toHaveBeenCalledWith('tenant-123', true);
    expect(result).toEqual([mockRole]);
  });
});
```

## Adding a New Repository

1. **Define Model:** In `src/models/my.model.ts`
2. **Create Interface:** `IMyRepository extends BaseRepository<MyModel>`
3. **Implement Repository:** `MyRepository implements IMyRepository`
4. **Add Adapter Interface:** In `src/adapters/my.adapter.ts`
5. **Add Type Symbol:** In `src/lib/types.ts`
6. **Register in Container:** In `src/lib/container.ts`

**Template:**
```typescript
import { injectable, inject } from 'inversify';
import { BaseRepository } from '@/repositories/base.repository';
import type { IMyAdapter } from '@/adapters/my.adapter';
import type { MyModel, CreateMyDto, UpdateMyDto } from '@/models/my.model';
import { TYPES } from '@/lib/types';

export interface IMyRepository extends BaseRepository<MyModel> {
  create(data: CreateMyDto, tenantId: string): Promise<MyModel>;
  findAll(tenantId: string): Promise<MyModel[]>;
}

@injectable()
export class MyRepository extends BaseRepository<MyModel> implements IMyRepository {
  constructor(@inject(TYPES.IMyAdapter) private readonly myAdapter: IMyAdapter) {
    super(myAdapter);
  }

  async create(data: CreateMyDto, tenantId: string): Promise<MyModel> {
    return await this.myAdapter.create(data, tenantId);
  }

  async findAll(tenantId: string): Promise<MyModel[]> {
    return await this.myAdapter.findAll(tenantId);
  }
}
```

## Related Documentation

- **Service Layer:** `src/services/claude.md`
- **Adapter Layer:** `src/adapters/claude.md`
- **Models:** `src/models/`
- **DI Container:** `src/lib/claude.md`