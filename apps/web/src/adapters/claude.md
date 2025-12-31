# Adapters Directory - Architecture & Patterns

## Overview

The `adapters/` directory implements the **database interaction layer** of StewardTrack. Adapters handle all direct communication with Supabase, execute queries, transform database rows into domain models, and manage database-specific concerns.

**Key Principle:** Adapters isolate database implementation details from the rest of the application.

## Architecture Pattern

### Adapter Layer Responsibilities

Adapters in this directory:
- **Execute** SQL queries via Supabase client
- **Transform** database rows ↔ domain models
- **Handle** database errors and edge cases
- **Enrich** models with computed/derived fields
- **Manage** RLS (Row-Level Security) policies
- **Normalize** data variations (e.g., scope normalization)

**Adapters DO NOT:**
- Implement business logic (that's for services)
- Define data contracts (that's for repositories)
- Handle HTTP requests/responses
- Manage transactions across multiple tables (coordinate in services)

### Standard Adapter Pattern

All adapters extend `BaseAdapter` and follow this structure:

```typescript
import 'server-only';
import { injectable, inject } from 'inversify';
import { BaseAdapter, type IBaseAdapter } from '@/adapters/base.adapter';
import { TYPES } from '@/lib/types';
import type { AuditService } from '@/services/AuditService';
import type { MyModel, CreateMyDto, UpdateMyDto } from '@/models/my.model';

export interface IMyAdapter extends IBaseAdapter<MyModel> {
  create(data: CreateMyDto, tenantId: string): Promise<MyModel>;
  update(id: string, data: UpdateMyDto, tenantId: string): Promise<MyModel>;
  delete(id: string, tenantId: string): Promise<void>;
  findById(id: string, tenantId: string): Promise<MyModel | null>;
  findAll(tenantId: string): Promise<MyModel[]>;
}

@injectable()
export class MyAdapter extends BaseAdapter<MyModel> implements IMyAdapter {
  constructor(
    @inject(TYPES.AuditService) private auditService: AuditService
  ) {
    super();
  }

  protected tableName = 'my_table';
  protected defaultSelect = `*`;

  async create(data: CreateMyDto, tenantId: string): Promise<MyModel> {
    const supabase = await this.getSupabaseClient();

    const { data: result, error } = await supabase
      .from(this.tableName)
      .insert({
        tenant_id: tenantId,
        name: data.name,
        // ... map DTO fields to database columns
      })
      .select('*')
      .single();

    if (error) {
      throw new Error(`Failed to create record: ${error.message}`);
    }

    if (!result) {
      throw new Error('Failed to create record: missing response payload');
    }

    return this.enrichModel(result);
  }

  private enrichModel(row: any): MyModel {
    return {
      ...row,
      // Add computed fields or normalize data
    };
  }
}
```

### BaseAdapter Pattern

The `BaseAdapter<T>` class provides:
- **Supabase Client Access:** `getSupabaseClient()` with server-side credentials
- **Common CRUD Methods:** Generic implementations for standard operations
- **Error Handling:** Consistent error patterns

```typescript
export abstract class BaseAdapter<T> implements IBaseAdapter<T> {
  protected abstract tableName: string;
  protected abstract defaultSelect: string;

  protected async getSupabaseClient() {
    const { createClient } = await import('@/lib/supabase/server');
    return await createClient();
  }

  async findById(id: string): Promise<T | null> {
    const supabase = await this.getSupabaseClient();
    const { data, error } = await supabase
      .from(this.tableName)
      .select(this.defaultSelect)
      .eq('id', id)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw new Error(`Failed to fetch record: ${error.message}`);
    }

    return data || null;
  }
}
```

## Key Patterns

### 1. Data Transformation

Adapters convert between database schema and domain models:

```typescript
// DTO → Database Row (Creation)
async createRole(data: CreateRoleDto, tenantId: string): Promise<Role> {
  const supabase = await this.getSupabaseClient();
  const scope = this.normalizeRoleScope(data.scope);

  const { data: result, error } = await supabase
    .from(this.tableName)
    .insert({
      tenant_id: tenantId,
      name: data.name,
      description: data.description ?? null,
      metadata_key: data.metadata_key ?? null,
      scope
    })
    .select('*')
    .single();

  if (error) {
    throw new Error(`Failed to create role: ${error.message}`);
  }

  return this.enrichRole(result);
}

// Database Row → Domain Model (Enrichment)
private enrichRole(role: any): Role {
  const normalizedScope = this.normalizeRoleScope(role.scope);

  return {
    ...role,
    scope: normalizedScope,
    is_system: role.is_system ?? normalizedScope === 'system',
    is_delegatable: role.is_delegatable ?? false
  };
}
```

### 2. Scope Normalization

Adapters normalize legacy/variant data to canonical forms:

```typescript
private normalizeRoleScope(scope?: string | null): 'system' | 'tenant' | 'delegated' {
  if (scope === 'system' || scope === 'tenant' || scope === 'delegated') {
    return scope;
  }

  // Legacy scope values
  if (scope === 'campus' || scope === 'ministry') {
    return 'delegated';
  }

  // Default fallback
  return 'tenant';
}
```

**Why Normalize?**
- Database may contain legacy values from migrations
- Provides consistent API for services
- Centralizes transformation logic

### 3. Data Enrichment

Adapters add computed fields or derived data:

```typescript
private enrichRoleList(roles: any[]): Role[] {
  if (!roles?.length) {
    return [];
  }

  return roles
    .map(role => this.enrichRole(role))
    .filter((role): role is Role => Boolean(role));
}

private enrichRole(role: any | null): Role | null {
  if (!role) {
    return null;
  }

  const normalizedScope = this.normalizeRoleScope(role.scope);

  return {
    ...role,
    scope: normalizedScope,
    is_system: role.is_system ?? normalizedScope === 'system',
    is_delegatable: role.is_delegatable ?? false
  };
}
```

### 4. Complex Queries with Joins

Adapters execute Supabase's PostgREST join syntax:

```typescript
async getRoleWithPermissions(id: string, tenantId: string): Promise<RoleWithPermissions | null> {
  const supabase = await this.getSupabaseClient();

  const { data, error } = await supabase
    .from(this.tableName)
    .select(`
      *,
      role_permissions!inner (
        permissions (*)
      )
    `)
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .single();

  if (error && error.code !== 'PGRST116') {
    throw new Error(`Failed to fetch role: ${error.message}`);
  }

  if (!data) return null;

  // Get user count via separate query
  const { count } = await supabase
    .from('user_roles')
    .select('*', { count: 'exact', head: true })
    .eq('role_id', id)
    .eq('tenant_id', tenantId);

  return this.enrichRole({
    ...data,
    permissions: data.role_permissions?.map((rp: any) => rp.permissions) || [],
    user_count: count || 0
  });
}
```

### 5. Error Handling Patterns

Adapters provide consistent error handling:

```typescript
async getRole(roleId: string): Promise<Role | null> {
  const supabase = await this.getSupabaseClient();

  const { data, error } = await supabase
    .from(this.tableName)
    .select('*')
    .eq('id', roleId)
    .single();

  // PGRST116 = "Row not found" - return null, not error
  if (error) {
    if (error.code === 'PGRST116') {
      return null;
    }
    throw new Error(`Failed to fetch role: ${error.message}`);
  }

  return this.enrichRole(data);
}
```

**Common Supabase Error Codes:**
- **`PGRST116`**: Row not found (return `null`)
- **`23505`**: Unique constraint violation
- **`23503`**: Foreign key violation
- **`42501`**: RLS policy violation

### 6. Bulk Operations with Deduplication

Adapters handle idempotent bulk inserts:

```typescript
async provisionFeatures(tenantId: string, offeringId: string): Promise<void> {
  const supabase = await this.getSupabaseClient();

  // Step 1: Query existing grants to avoid conflicts
  const { data: existingGrants } = await supabase
    .from('tenant_feature_grants')
    .select('feature_id, grant_source, package_id, source_reference')
    .eq('tenant_id', tenantId);

  // Step 2: Build unique key set for existing grants
  const existingGrantKeys = new Set(
    (existingGrants || []).map((grant: any) =>
      `${grant.feature_id}|${grant.grant_source}|${grant.package_id || ''}|${grant.source_reference || ''}`
    )
  );

  // Step 3: Deduplicate new grants
  const grantsMap = new Map<string, any>();

  for (const feature of features) {
    const uniqueKey = `${feature.feature_id}|package|${feature.package_id || ''}|offering_${offeringId}`;

    // Skip if already exists
    if (existingGrantKeys.has(uniqueKey)) {
      continue;
    }

    // Deduplicate within batch
    if (!grantsMap.has(uniqueKey)) {
      grantsMap.set(uniqueKey, {
        tenant_id: tenantId,
        feature_id: feature.feature_id,
        grant_source: 'package',
        package_id: feature.package_id,
        source_reference: `offering_${offeringId}`,
      });
    }
  }

  const featureGrants = Array.from(grantsMap.values());

  // Step 4: Insert only new grants (idempotent)
  if (featureGrants.length > 0) {
    const { error } = await supabase
      .from('tenant_feature_grants')
      .insert(featureGrants);

    if (error) {
      throw new Error(`Failed to provision features: ${error.message}`);
    }
  }
}
```

## Major Adapter Categories

### RBAC Adapters

**Core Adapters:**
- **`role.adapter.ts`** - Role CRUD, permission joins, statistics
- **`permission.adapter.ts`** - Permission queries by module
- **`userRole.adapter.ts`** - User-role assignments, multi-role support
- **`delegation.adapter.ts`** - Delegation with scope resolution

**Example: Role Adapter Features**
- Scope normalization (`campus`/`ministry` → `delegated`)
- Role enrichment (compute `is_system` flag)
- Permission aggregation (join role_permissions)
- User count aggregation (count user_roles)

### Licensing Adapters

**Core Adapters:**
- **`productOffering.adapter.ts`** - Product offerings, feature bundles
- **`licenseFeatureBundle.adapter.ts`** - Feature bundle management
- **`tenantFeatureGrant.adapter.ts`** - Feature grant CRUD
- **`licenseAssignment.adapter.ts`** - Manual license assignment

**Example: Product Offering Adapter**
- Join offerings with bundles and features
- Call database functions (`get_offering_all_features()`)
- Aggregate feature counts per bundle

## Best Practices

### 1. Always Use `server-only`

Prevent client-side adapter usage:

```typescript
import 'server-only'; // First import!
import { injectable, inject } from 'inversify';
```

### 2. Consistent Error Messages

Provide context in error messages:

```typescript
if (error) {
  throw new Error(`Failed to create role: ${error.message}`);
}

if (!result) {
  throw new Error('Failed to create role: missing response payload');
}
```

### 3. Null Safety

Check for null/undefined before enrichment:

```typescript
private enrichRole(role: any | null): Role | null {
  if (!role) {
    return null;
  }

  return {
    ...role,
    // enrichment logic
  };
}
```

### 4. Type-Safe Queries

Use `.select()` with explicit field lists:

```typescript
// GOOD: Explicit fields
.select('id, name, description, scope, tenant_id')

// ACCEPTABLE: All fields
.select('*')

// BAD: Untyped
.select() // Missing parameter
```

### 5. Use `.single()` for Unique Queries

```typescript
// Expect single result
const { data, error } = await supabase
  .from('roles')
  .select('*')
  .eq('id', roleId)
  .single(); // Returns single object or error

// Expect multiple results
const { data, error } = await supabase
  .from('roles')
  .select('*')
  .eq('tenant_id', tenantId); // Returns array
```

### 6. Handle RLS Policies

Row-Level Security policies can cause silent failures:

```typescript
// Query might return 0 rows if RLS blocks access
const { data, error } = await supabase
  .from('roles')
  .select('*')
  .eq('tenant_id', tenantId);

// Always check if RLS might be the cause
if (!data || data.length === 0) {
  // Could be empty table OR RLS restriction
}
```

### 7. Use Database Functions for Complex Logic

Call Postgres functions via `.rpc()`:

```typescript
const { data: features, error } = await supabase.rpc('get_offering_all_features', {
  p_offering_id: offeringId,
});

if (error) {
  throw new Error(`Failed to get offering features: ${error.message}`);
}
```

## Advanced Patterns

### Pattern 1: Conditional Enrichment

```typescript
private enrichRole(role: any, overrides: Partial<RoleFlags> = {}): Role | null {
  if (!role) {
    return null;
  }

  const normalizedScope = this.normalizeRoleScope(overrides.scope ?? role.scope);

  return {
    ...role,
    scope: normalizedScope,
    is_system: overrides.is_system ?? role.is_system ?? normalizedScope === 'system',
    is_delegatable: overrides.is_delegatable ?? role.is_delegatable ?? false
  };
}
```

### Pattern 2: Batch Enrichment

```typescript
private enrichRoleList(roles: (any | null)[] | null | undefined): Role[] {
  if (!roles?.length) {
    return [];
  }

  return roles
    .map(role => this.enrichRole(role))
    .filter((role): role is Role => Boolean(role));
}
```

### Pattern 3: Statistics Aggregation

```typescript
async getRoleStatistics(tenantId: string, includeSystem = true): Promise<Role[]> {
  const supabase = await this.getSupabaseClient();

  // Get roles
  let roleQuery = supabase
    .from(this.tableName)
    .select('*')
    .eq('tenant_id', tenantId)
    .is('deleted_at', null);

  if (!includeSystem) {
    roleQuery = roleQuery.neq('scope', 'system');
  }

  const { data: rolesData, error } = await roleQuery.order('name');

  if (error) {
    throw new Error(`Failed to fetch role statistics: ${error.message}`);
  }

  const roles = this.enrichRoleList(rolesData);

  // Aggregate counts for each role
  for (const role of roles) {
    const { count: userCount } = await supabase
      .from('user_roles')
      .select('*', { count: 'exact', head: true })
      .eq('role_id', role.id)
      .eq('tenant_id', tenantId);

    (role as any).user_count = userCount || 0;
  }

  return roles;
}
```

### Pattern 4: Transactional Safety

Supabase doesn't support multi-statement transactions in the JS client, so:

```typescript
// Use database functions for atomic operations
const { error } = await supabase.rpc('create_role_with_permissions', {
  p_role_data: roleData,
  p_permission_ids: permissionIds,
  p_tenant_id: tenantId
});

// OR coordinate in service layer with error handling
async createRoleWithPermissions(data: CreateRoleDto, permissionIds: string[], tenantId: string) {
  const role = await this.createRole(data, tenantId);

  try {
    for (const permissionId of permissionIds) {
      await this.assignPermission(role.id, permissionId, tenantId);
    }
  } catch (error) {
    // Manual rollback if needed
    await this.deleteRole(role.id, tenantId);
    throw error;
  }

  return role;
}
```

## Anti-Patterns to Avoid

❌ **Business Logic in Adapter**
```typescript
// BAD: Adapter implementing business rules
async createRole(data: CreateRoleDto, tenantId: string): Promise<Role> {
  if (data.name === 'admin') {
    // ❌ Business logic doesn't belong here
    throw new Error('Cannot create admin role via API');
  }
  // ...
}
```

✅ **Keep Adapters Focused on Data**
```typescript
// GOOD: Adapter only handles data operations
async createRole(data: CreateRoleDto, tenantId: string): Promise<Role> {
  const supabase = await this.getSupabaseClient();
  // ... pure data operations
}
```

❌ **Ignoring Errors**
```typescript
// BAD: Swallowing errors
const { data, error } = await supabase.from('roles').select('*');
return data || []; // ❌ Lost error information
```

✅ **Proper Error Handling**
```typescript
// GOOD: Propagate errors with context
const { data, error } = await supabase.from('roles').select('*');
if (error) {
  throw new Error(`Failed to fetch roles: ${error.message}`);
}
return data || [];
```

❌ **Client-Side Supabase Client**
```typescript
// BAD: Using client-side Supabase (anonymous key)
import { createClient } from '@supabase/supabase-js';
const supabase = createClient(url, anonKey);
```

✅ **Server-Side Supabase Client**
```typescript
// GOOD: Using server-side client (service role key)
protected async getSupabaseClient() {
  const { createClient } = await import('@/lib/supabase/server');
  return await createClient();
}
```

## Testing Adapters

**Current State:** No automated tests configured.

**Recommended Testing Approach:**
1. **Integration tests** with test database
2. **Mock Supabase client** for unit tests
3. **Test data enrichment** logic independently

```typescript
// Example test (when testing framework is added)
describe('RoleAdapter', () => {
  it('should normalize legacy scope values', () => {
    const adapter = new RoleAdapter(mockAuditService);

    expect(adapter['normalizeRoleScope']('campus')).toBe('delegated');
    expect(adapter['normalizeRoleScope']('ministry')).toBe('delegated');
    expect(adapter['normalizeRoleScope']('tenant')).toBe('tenant');
  });
});
```

## Adding a New Adapter

1. **Define Model:** In `src/models/my.model.ts`
2. **Create Adapter Interface:** `IMyAdapter extends IBaseAdapter<MyModel>`
3. **Implement Adapter:** `MyAdapter extends BaseAdapter<MyModel>`
4. **Add Type Symbol:** In `src/lib/types.ts`
5. **Register in Container:** In `src/lib/container.ts`
6. **Create Repository:** In `src/repositories/my.repository.ts`

**Template:**
```typescript
import 'server-only';
import { injectable, inject } from 'inversify';
import { BaseAdapter, type IBaseAdapter } from '@/adapters/base.adapter';
import { TYPES } from '@/lib/types';
import type { AuditService } from '@/services/AuditService';
import type { MyModel, CreateMyDto, UpdateMyDto } from '@/models/my.model';

export interface IMyAdapter extends IBaseAdapter<MyModel> {
  create(data: CreateMyDto, tenantId: string): Promise<MyModel>;
  update(id: string, data: UpdateMyDto, tenantId: string): Promise<MyModel>;
  delete(id: string, tenantId: string): Promise<void>;
  findAll(tenantId: string): Promise<MyModel[]>;
}

@injectable()
export class MyAdapter extends BaseAdapter<MyModel> implements IMyAdapter {
  constructor(
    @inject(TYPES.AuditService) private auditService: AuditService
  ) {
    super();
  }

  protected tableName = 'my_table';
  protected defaultSelect = `*`;

  async create(data: CreateMyDto, tenantId: string): Promise<MyModel> {
    const supabase = await this.getSupabaseClient();

    const { data: result, error } = await supabase
      .from(this.tableName)
      .insert({
        tenant_id: tenantId,
        ...data,
      })
      .select('*')
      .single();

    if (error) {
      throw new Error(`Failed to create record: ${error.message}`);
    }

    if (!result) {
      throw new Error('Failed to create record: missing response payload');
    }

    return this.enrichModel(result);
  }

  async update(id: string, data: UpdateMyDto, tenantId: string): Promise<MyModel> {
    const supabase = await this.getSupabaseClient();

    const { data: result, error } = await supabase
      .from(this.tableName)
      .update({ ...data, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .select('*')
      .single();

    if (error) {
      throw new Error(`Failed to update record: ${error.message}`);
    }

    if (!result) {
      throw new Error('Failed to update record: missing response payload');
    }

    return this.enrichModel(result);
  }

  async delete(id: string, tenantId: string): Promise<void> {
    const supabase = await this.getSupabaseClient();

    const { error } = await supabase
      .from(this.tableName)
      .delete()
      .eq('id', id)
      .eq('tenant_id', tenantId);

    if (error) {
      throw new Error(`Failed to delete record: ${error.message}`);
    }
  }

  async findAll(tenantId: string): Promise<MyModel[]> {
    const supabase = await this.getSupabaseClient();

    const { data, error } = await supabase
      .from(this.tableName)
      .select('*')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch records: ${error.message}`);
    }

    return (data || []).map(row => this.enrichModel(row));
  }

  private enrichModel(row: any): MyModel {
    return {
      ...row,
      // Add computed fields or normalization
    };
  }
}
```

## Related Documentation

- **Repository Layer:** `src/repositories/claude.md`
- **Service Layer:** `src/services/claude.md`
- **Models:** `src/models/`
- **Supabase Client:** `src/lib/supabase/server.ts`
