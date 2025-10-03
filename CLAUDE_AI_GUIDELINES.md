# Claude AI Guidelines for StewardTrack Development

This document contains coding guidelines and architectural patterns learned from development sessions, particularly focused on RBAC implementation and the church management system architecture.

## Table of Contents
- [Core Architectural Principles](#core-architectural-principles)
- [Data Layer Architecture Pattern](#data-layer-architecture-pattern)
- [RBAC Module Guidelines](#rbac-module-guidelines)
- [Database Schema Changes](#database-schema-changes)
- [UI/UX Best Practices](#uiux-best-practices)
- [Dependency Injection](#dependency-injection)
- [Error Handling](#error-handling)
- [Code Organization](#code-organization)

---

## Core Architectural Principles

### Three-Layer Architecture

**CRITICAL RULE**: Services MUST NEVER directly call Supabase. Always follow this pattern:

```
Service Layer → Repository Layer → Adapter Layer → Supabase Database
```

#### Layer Responsibilities

1. **Adapter Layer** (`src/adapters/`)
   - Handles direct database access via Supabase
   - Contains data access logic
   - Extends `BaseAdapter<T>`
   - Returns raw data from database

2. **Repository Layer** (`src/repositories/`)
   - Contains business logic
   - Orchestrates data operations
   - Calls adapters for data access
   - Extends `BaseRepository<T>`
   - Transforms data as needed

3. **Service Layer** (`src/services/`)
   - Orchestrates complex operations
   - Delegates to repositories
   - NO direct Supabase calls allowed
   - Handles cross-domain operations

### Example: Correct Implementation

```typescript
// ❌ WRONG - Service calling Supabase directly
class RbacStatisticsService {
  async getRoleStatistics(tenantId: string) {
    const supabase = await this.getSupabaseClient(); // WRONG!
    const { data } = await supabase.from('roles').select('*');
    return data;
  }
}

// ✅ CORRECT - Following the pattern
// 1. Adapter Layer
class RoleAdapter extends BaseAdapter<Role> {
  async getRoleStatistics(tenantId: string): Promise<Role[]> {
    const supabase = await this.getSupabaseClient();
    const { data, error } = await supabase
      .from('roles')
      .select('*')
      .eq('tenant_id', tenantId);
    if (error) throw new Error(error.message);
    return data;
  }
}

// 2. Repository Layer
class RoleRepository extends BaseRepository<Role> {
  async getRoleStatistics(tenantId: string): Promise<Role[]> {
    return await this.adapter.getRoleStatistics(tenantId);
  }
}

// 3. Service Layer
class RbacStatisticsService {
  async getRoleStatistics(tenantId: string): Promise<Role[]> {
    return await this.roleRepository.getRoleStatistics(tenantId);
  }
}
```

---

## Data Layer Architecture Pattern

### Adding a New Feature

When adding a new feature or method, follow this checklist:

#### 1. Define the Interface and Types

```typescript
// src/models/rbac.model.ts
export interface Role extends BaseModel {
  id: string;
  name: string;
  // ... other fields
}

export interface CreateRoleDto {
  name: string;
  description?: string;
  scope: 'system' | 'tenant' | 'delegated';
}
```

#### 2. Create the Adapter

```typescript
// src/adapters/role.adapter.ts
import { BaseAdapter } from '@/adapters/base.adapter';

export interface IRoleAdapter extends IBaseAdapter<Role> {
  getRoleStatistics(tenantId: string): Promise<Role[]>;
}

@injectable()
export class RoleAdapter extends BaseAdapter<Role> implements IRoleAdapter {
  protected tableName = 'roles';
  protected defaultSelect = '*';

  async getRoleStatistics(tenantId: string): Promise<Role[]> {
    const supabase = await this.getSupabaseClient();
    const { data, error } = await supabase
      .from(this.tableName)
      .select('*')
      .eq('tenant_id', tenantId);

    if (error) throw new Error(`Failed to get role statistics: ${error.message}`);
    return data;
  }
}
```

#### 3. Create the Repository

```typescript
// src/repositories/role.repository.ts
import { BaseRepository } from '@/repositories/base.repository';

export interface IRoleRepository extends IBaseRepository<Role> {
  getRoleStatistics(tenantId: string): Promise<Role[]>;
}

@injectable()
export class RoleRepository extends BaseRepository<Role> implements IRoleRepository {
  constructor(
    @inject(TYPES.RoleAdapter) protected adapter: IRoleAdapter
  ) {
    super(adapter);
  }

  async getRoleStatistics(tenantId: string): Promise<Role[]> {
    return await this.adapter.getRoleStatistics(tenantId);
  }
}
```

#### 4. Create or Update the Service

```typescript
// src/services/RbacCoreService.ts
@injectable()
export class RbacCoreService {
  constructor(
    @inject(TYPES.RoleRepository) private roleRepository: IRoleRepository
  ) {}

  async getRoleStatistics(tenantId?: string): Promise<Role[]> {
    const effectiveTenantId = tenantId || await tenantUtils.getTenantId();
    if (!effectiveTenantId) throw new Error('No tenant context available');

    return await this.roleRepository.getRoleStatistics(effectiveTenantId);
  }
}
```

#### 5. Register in DI Container

```typescript
// src/lib/types.ts
export const TYPES = {
  // ... existing types
  RoleAdapter: Symbol.for('IRoleAdapter'),
  RoleRepository: Symbol.for('IRoleRepository'),
  RbacCoreService: Symbol.for('RbacCoreService'),
};

// src/lib/container.ts
// Register Adapters
container.bind<IRoleAdapter>(TYPES.RoleAdapter).to(RoleAdapter).inSingletonScope();

// Register Repositories
container.bind<IRoleRepository>(TYPES.RoleRepository).to(RoleRepository).inSingletonScope();

// Register Services
container.bind<RbacCoreService>(TYPES.RbacCoreService).to(RbacCoreService).inSingletonScope();
```

---

## RBAC Module Guidelines

### Module Organization

The RBAC module is decomposed into 7 sub-domains:

1. **Core RBAC** - Roles, Permissions, User-Role assignments, Bundles
2. **Metadata** - Metadata surfaces and bindings
3. **Features** - Feature catalog and tenant grants
4. **Delegation** - Delegation contexts and permissions
5. **Audit** - Audit logging and compliance
6. **Publishing** - Publishing workflows and jobs
7. **Statistics** - Dashboard and analytics

### File Naming Conventions

```
Adapters:    role.adapter.ts, permission.adapter.ts
Repositories: role.repository.ts, permission.repository.ts
Services:     RbacCoreService.ts, RbacStatisticsService.ts
```

### Code Auto-Generation

When creating records that require unique codes:

```typescript
// Auto-generate code from name if not provided
const code = data.code || data.name
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '_')
  .replace(/^_+|_+$/g, '');

// Examples:
// "Member Management" → "member_management"
// "Admin Access!" → "admin_access"
// "Staff - Full Access" → "staff_full_access"
```

### Data Structure Patterns

When returning data with nested objects, ensure the structure matches frontend expectations:

```typescript
// ❌ WRONG - Flat structure
return {
  id: ur.id,
  user_id: ur.user_id,
  email: userInfo.email,
  first_name: userInfo.first_name,
  last_name: userInfo.last_name,
};

// ✅ CORRECT - Nested structure
return {
  id: ur.id,
  user_id: ur.user_id,
  assigned_at: ur.assigned_at,
  assigned_by: ur.assigned_by,
  user: {
    id: userInfo.id,
    email: userInfo.email,
    first_name: userInfo.first_name,
    last_name: userInfo.last_name
  }
};
```

---

## Database Schema Changes

### Migration Best Practices

1. **Always create migrations for schema changes**
```bash
npx supabase migration new add_column_to_table
```

⚠️ **CRITICAL**: The auto-generated migration filename uses the current timestamp, but this can cause issues if the timestamp is earlier than the last migrated file.

2. **ALWAYS verify and fix migration file timestamps**:

```bash
# Step 1: Create migration (auto-generates with current timestamp)
npx supabase migration new add_is_template_to_permission_bundles
# Creates: supabase/migrations/20251002220714_add_is_template_to_permission_bundles.sql

# Step 2: Check the last migration file in supabase/migrations/
# Example: Last file is 20251218001006_some_previous_migration.sql

# Step 3: Rename the new migration to be AFTER the last migration
# OLD: 20251002220714_add_is_template_to_permission_bundles.sql
# NEW: 20251218001007_add_is_template_to_permission_bundles.sql
#                 ^^^^ Increment from last migration timestamp
```

**Why this matters**:
- Supabase runs migrations in chronological order based on filename timestamp
- If your new migration has an older timestamp than already-applied migrations, it may be skipped
- Always ensure new migration timestamps are AFTER the last migration file, not based on actual time

**Workflow**:
```bash
# 1. List existing migrations to find the latest
ls -la supabase/migrations/ | tail -1

# 2. Generate new migration
npx supabase migration new my_feature

# 3. Rename file if needed to be after the last migration
# Use last_timestamp + 1 (increment by 1 second, minute, or hour as needed)

# 4. Edit the SQL file content
# 5. Apply migration
npx supabase db push
```

3. **Include these elements in migrations**:
```sql
-- Add column with appropriate constraints
ALTER TABLE table_name
ADD COLUMN column_name data_type DEFAULT default_value NOT NULL;

-- Add index if needed for performance
CREATE INDEX table_column_idx ON table_name(column_name);

-- Add comments for documentation
COMMENT ON COLUMN table_name.column_name IS 'Description of the column purpose';
```

4. **Migration file naming**:
   - ❌ WRONG: Use current date/time blindly
   - ✅ CORRECT: Use last migration timestamp + increment
   - Format: `YYYYMMDDHHMMSS_description.sql`
   - Example sequence:
     ```
     20251218001005_previous_migration.sql
     20251218001006_another_migration.sql
     20251218001007_add_is_template_to_permission_bundles.sql  ← New migration
     ```

### Schema Documentation

Always add comments to database objects:

```sql
COMMENT ON TABLE permission_bundles IS 'Groups of permissions that can be assigned to roles as a bundle.';
COMMENT ON COLUMN permission_bundles.is_template IS 'Indicates if this bundle is a template that can be cloned for new tenants';
```

---

## Next.js 15 Specific Patterns

### Dynamic Route Parameters

**CRITICAL**: In Next.js 15, dynamic route parameters (`params`) must be awaited before accessing their properties.

#### Wrong (Next.js 14 style)
```typescript
export async function PUT(request: NextRequest, { params }: RouteParams) {
  const role = await rbacService.updateRole(params.id, body); // ❌ ERROR
}
```

#### Correct (Next.js 15)
```typescript
export async function PUT(request: NextRequest, { params }: RouteParams) {
  // Await params first
  const { id } = await params;

  const role = await rbacService.updateRole(id, body); // ✅ CORRECT
}
```

#### Pattern for All Dynamic Routes
```typescript
interface RouteParams {
  params: {
    id: string;
    // ... other params
  };
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  const { id } = await params; // Always await first
  // ... use id
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  const { id } = await params; // Always await first
  // ... use id
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const { id } = await params; // Always await first
  // ... use id
}
```

**Error Message to Watch For**:
```
Error: Route "/api/..." used `params.id`.
`params` should be awaited before using its properties.
```

**Why**: Next.js 15 made params async to support streaming and better performance. This is a breaking change from Next.js 14.

---

## UI/UX Best Practices

### Button Loading States

**CRITICAL**: ALL buttons that trigger async operations MUST show loading states.

#### Implementation Pattern

```typescript
// 1. Add loading state
const [isCreating, setIsCreating] = useState(false);

// 2. Wrap async operation
const handleCreate = async (data) => {
  setIsCreating(true);
  try {
    const response = await fetch('/api/endpoint', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });

    const result = await response.json();

    if (result.success) {
      toast.success('Created successfully');
      // ... other success logic
    } else {
      toast.error(result.error || 'Failed to create');
    }
  } catch (error) {
    console.error('Error:', error);
    toast.error('Failed to create');
  } finally {
    setIsCreating(false); // Always reset in finally
  }
};

// 3. Update button JSX
import { Loader2 } from 'lucide-react';

<Button
  type="submit"
  disabled={isCreating}
  onClick={handleCreate}
>
  {isCreating ? (
    <>
      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
      Creating...
    </>
  ) : (
    <>
      <Plus className="h-4 w-4 mr-2" />
      Create
    </>
  )}
</Button>
```

#### Per-Row Operations

For grid/table actions (delete, edit, etc.):

```typescript
// Track by ID instead of boolean
const [deletingId, setDeletingId] = useState<string | null>(null);

const handleDelete = async (id: string) => {
  if (!confirm('Are you sure?')) return;

  setDeletingId(id);
  try {
    // ... delete logic
  } finally {
    setDeletingId(null);
  }
};

// In JSX
<Button
  disabled={deletingId === role.id}
  onClick={() => handleDelete(role.id)}
>
  {deletingId === role.id ? (
    <Loader2 className="h-4 w-4 animate-spin" />
  ) : (
    <Trash2 className="h-4 w-4" />
  )}
</Button>
```

#### Cancel Buttons During Operations

```typescript
<Button
  type="button"
  variant="outline"
  onClick={() => onClose()}
  disabled={isSubmitting} // Disable cancel during submit
>
  Cancel
</Button>
```

### Form Patterns

```typescript
const handleSubmit = (e: React.FormEvent) => {
  e.preventDefault();
  onSubmit(formData); // Pass data to parent handler
};

// Parent component handles loading state
const handleCreate = async (data: CreateDto) => {
  setIsCreating(true);
  try {
    // ... API call
  } finally {
    setIsCreating(false);
  }
};
```

---

## Dependency Injection

### InversifyJS Patterns

#### Registering Dependencies

```typescript
// 1. Define Symbol in src/lib/types.ts
export const TYPES = {
  ServiceName: Symbol.for('IServiceName'),
};

// 2. Register in src/lib/container.ts
container.bind<IServiceName>(TYPES.ServiceName)
  .to(ServiceName)
  .inSingletonScope();
```

#### Optional Dependencies

```typescript
import { optional } from 'inversify';

@injectable()
export class BaseAdapter<T> {
  constructor(
    @inject(TYPES.RequestContext) @optional()
    protected requestContext?: RequestContext
  ) {}

  // Use optional chaining
  const userId = this.requestContext?.userId;
}
```

#### Service Injection

```typescript
@injectable()
export class RbacService {
  constructor(
    @inject(TYPES.RbacCoreService)
    private rbacCoreService: RbacCoreService,

    @inject(TYPES.RbacStatisticsService)
    private rbacStatisticsService: RbacStatisticsService
  ) {}
}
```

---

## Error Handling

### API Error Handling Pattern

```typescript
try {
  const response = await fetch('/api/endpoint', { /* ... */ });
  const result = await response.json();

  if (result.success) {
    toast.success('Operation successful');
    // Handle success
  } else {
    toast.error(result.error || 'Operation failed');
  }
} catch (error) {
  console.error('Error description:', error);
  toast.error('Operation failed');
} finally {
  // Always reset loading states
  setIsLoading(false);
}
```

### Adapter Error Handling

```typescript
async getData(id: string): Promise<Data> {
  const supabase = await this.getSupabaseClient();
  const { data, error } = await supabase
    .from(this.tableName)
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    throw new Error(`Failed to get data: ${error.message}`);
  }

  return data;
}
```

### Service Error Handling

```typescript
async createEntity(data: CreateDto): Promise<Entity> {
  try {
    const tenantId = await tenantUtils.getTenantId();
    if (!tenantId) {
      throw new Error('No tenant context available');
    }

    return await this.repository.create(data, tenantId);
  } catch (error) {
    console.error('Error in service method:', error);
    throw error; // Re-throw for API layer to handle
  }
}
```

---

## Code Organization

### Module Refactoring Guidelines

When refactoring large monolithic files:

1. **Analyze existing code** - Understand all functionality before splitting
2. **Create refactoring plan** - Document domains and file structure
3. **Follow existing patterns** - Use similar modules as reference (e.g., member module)
4. **Maintain backward compatibility** - Use facade pattern for existing services
5. **Update incrementally** - Test after each phase
6. **Document changes** - Create summary documents

### File Structure Example (RBAC Module)

```
src/
├── adapters/
│   ├── base.adapter.ts
│   ├── role.adapter.ts
│   ├── permission.adapter.ts
│   ├── userRoleManagement.adapter.ts
│   └── permissionBundle.adapter.ts
├── repositories/
│   ├── base.repository.ts
│   ├── role.repository.ts
│   ├── permission.repository.ts
│   └── permissionBundle.repository.ts
├── services/
│   ├── RbacCoreService.ts          # Core operations
│   ├── RbacStatisticsService.ts    # Analytics
│   ├── RbacAuditService.ts         # Audit logging
│   └── rbac.service.ts             # Facade (delegates to specialized services)
├── models/
│   └── rbac.model.ts               # All type definitions
└── components/admin/rbac/
    ├── RoleExplorer.tsx
    ├── BundleComposer.tsx
    └── UserManagement.tsx
```

### Import Organization

```typescript
// 1. External libraries
import { injectable, inject } from 'inversify';
import { NextRequest, NextResponse } from 'next/server';

// 2. Internal utilities
import { TYPES } from '@/lib/types';
import { container } from '@/lib/container';

// 3. Models/Types
import type { Role, CreateRoleDto } from '@/models/rbac.model';

// 4. Services/Repositories/Adapters
import { RbacService } from '@/services/rbac.service';
import { RoleRepository } from '@/repositories/role.repository';
import { RoleAdapter } from '@/adapters/role.adapter';

// 5. Components (if applicable)
import { Button } from '@/components/ui/button';
```

---

## Testing Considerations

### Manual Testing Checklist

When implementing new features:

- [ ] Test happy path (success scenario)
- [ ] Test error scenarios (network errors, validation errors)
- [ ] Test loading states (buttons disabled, spinners shown)
- [ ] Test with missing/invalid data
- [ ] Test tenant isolation
- [ ] Test permissions/authorization
- [ ] Verify data appears correctly in UI
- [ ] Check console for errors
- [ ] Verify database records created/updated correctly

### Common Issues to Check

1. **Missing DI registrations** - Check container.ts
2. **Architectural violations** - Services calling Supabase directly
3. **Missing loading states** - Buttons without feedback
4. **Data structure mismatches** - Flat vs nested objects
5. **Missing columns** - Run migrations
6. **Tenant isolation** - All queries filtered by tenant_id

---

## Performance Considerations

### Materialized Views

When using materialized views for performance:

```typescript
// Refresh after data changes
await this.repository.refreshMaterializedView();
```

### Database Queries

- Always filter by `tenant_id` first
- Use indexes for frequently queried columns
- Limit results with pagination
- Select only needed columns

```typescript
// ❌ WRONG
const { data } = await supabase.from('roles').select('*');

// ✅ CORRECT
const { data } = await supabase
  .from('roles')
  .select('id, name, description')
  .eq('tenant_id', tenantId)
  .order('name')
  .limit(100);
```

---

## Security Considerations

### Tenant Isolation

**CRITICAL**: Always filter by tenant_id

```typescript
// Every query must include tenant filter
const { data } = await supabase
  .from(this.tableName)
  .select('*')
  .eq('tenant_id', tenantId); // REQUIRED
```

### Row Level Security (RLS)

- All tables have RLS policies
- Policies use `check_tenant_access(tenant_id)` function
- Never bypass RLS in application code
- Trust database-level security

### Audit Logging

Log all security-relevant operations:

```typescript
await this.auditService.log({
  operation: 'CREATE',
  table_name: 'roles',
  record_id: role.id,
  user_id: userId,
  security_impact: 'high'
});
```

---

## Common Patterns Summary

### ✅ DO

- Follow three-layer architecture strictly
- Add loading states to all async buttons
- Use try-catch-finally for error handling
- Create migrations for schema changes
- Auto-generate codes from names when appropriate
- Return nested data structures matching frontend expectations
- Register all dependencies in DI container
- Filter all queries by tenant_id
- Document complex logic with comments
- Use TypeScript types consistently
- **Await dynamic route params in Next.js 15** (e.g., `const { id } = await params;`)

### ❌ DON'T

- Call Supabase directly from services
- Skip loading states on buttons
- Forget to reset loading states in finally blocks
- Make schema changes without migrations
- Return data structures that don't match frontend expectations
- Skip DI registration for new adapters/repositories/services
- Query without tenant_id filter
- Ignore error handling
- Leave console.log statements in production code
- Use any type without good reason

---

## Quick Reference: Adding a New RBAC Feature

1. **Define types** in `src/models/rbac.model.ts`
2. **Create adapter** in `src/adapters/[feature].adapter.ts`
3. **Create repository** in `src/repositories/[feature].repository.ts`
4. **Update service** in `src/services/RbacCoreService.ts` (or create new specialized service)
5. **Register in DI** in `src/lib/types.ts` and `src/lib/container.ts`
6. **Create API route** in `src/app/api/rbac/[feature]/route.ts`
7. **Create UI component** in `src/components/admin/rbac/[Feature].tsx`
8. **Add loading states** to all buttons
9. **Test thoroughly** - happy path and error cases
10. **Document** - Add to relevant MD files

---

## Conclusion

Following these guidelines ensures:
- **Maintainable code** - Clear separation of concerns
- **Consistent architecture** - Predictable patterns throughout
- **Better UX** - Loading states and error handling
- **Secure implementation** - Tenant isolation and RLS
- **Team collaboration** - Clear patterns for all developers

Remember: **Services NEVER call Supabase directly** - this is the most critical architectural rule.

---

**Last Updated**: 2025-10-03
**Session Reference**: RBAC Refactoring and Implementation
