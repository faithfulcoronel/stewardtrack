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

## Row Level Security (RLS) and Database Functions

### When to Use SECURITY DEFINER Functions

When building features that need to bypass RLS for super admins (like licensing management), use PostgreSQL functions with `SECURITY DEFINER`:

#### Problem: RLS Blocks Super Admin Access

```typescript
// ❌ This will fail - RLS blocks access to all tenants
const { data } = await supabase
  .from('tenants')
  .select('*'); // RLS policy: USING (has_tenant_access(id))
```

#### Solution: SECURITY DEFINER Function

```sql
-- Create function that bypasses RLS but checks roles internally
CREATE FUNCTION get_all_tenants_for_management()
RETURNS TABLE (...)
LANGUAGE plpgsql
SECURITY DEFINER  -- Function runs with owner's privileges
SET search_path = public
AS $$
BEGIN
  -- Check role INSIDE the function
  IF get_user_admin_role() != 'super_admin' THEN
    RAISE EXCEPTION 'Access denied. Only super admins can access this function.';
  END IF;

  -- Return data - RLS is bypassed because of SECURITY DEFINER
  RETURN QUERY
  SELECT * FROM tenants ORDER BY name;
END;
$$;
```

### Avoiding Ambiguous Column References

**CRITICAL**: When creating PostgreSQL functions with RETURNS TABLE, column names in the return table can conflict with table columns, causing "column reference is ambiguous" errors.

#### Problem: Ambiguous Columns

```sql
-- ❌ WRONG - Creates ambiguity
CREATE FUNCTION assign_license(p_tenant_id uuid)
RETURNS TABLE (
  tenant_id uuid,      -- Same name as tenants.tenant_id
  offering_id uuid     -- Same name as license_assignments.offering_id
)
AS $$
BEGIN
  DELETE FROM tenant_feature_grants
  WHERE tenant_id = p_tenant_id;  -- ERROR: ambiguous!

  RETURN QUERY
  SELECT
    p_tenant_id,
    p_offering_id;
END;
$$;
```

#### Solution: Use Different Return Column Names

```sql
-- ✅ CORRECT - Use distinct names with prefix
CREATE FUNCTION assign_license(p_tenant_id uuid, p_offering_id uuid)
RETURNS TABLE (
  result_tenant_id uuid,      -- Different from table columns
  result_offering_id uuid,    -- Different from table columns
  result_assigned_at timestamptz
)
AS $$
BEGIN
  -- Use table aliases everywhere
  DELETE FROM tenant_feature_grants tfg
  WHERE tfg.tenant_id = p_tenant_id  -- Fully qualified
    AND tfg.feature_id = v_feature_id;

  -- Update with alias
  UPDATE tenants t
  SET offering_id = p_offering_id
  WHERE t.id = p_tenant_id;  -- Fully qualified

  -- Return with explicit mapping
  RETURN QUERY
  SELECT
    p_tenant_id AS result_tenant_id,
    p_offering_id AS result_offering_id,
    now() AS result_assigned_at;
END;
$$;
```

#### Adapter Mapping for Result Columns

```typescript
// Map database result columns to interface
const dbResult = result[0] as any;
const mappedResult: AssignmentResult = {
  tenant_id: dbResult.result_tenant_id,
  offering_id: dbResult.result_offering_id,
  assigned_at: dbResult.result_assigned_at,
};
```

### Best Practices for Database Functions

1. **Always use table aliases** in DELETE, UPDATE, and SELECT statements
2. **Use SECURITY DEFINER** for functions that need RLS bypass
3. **Check user roles INSIDE the function** for security
4. **Prefix return column names** with `result_` to avoid ambiguity
5. **Fully qualify all column references** with table/alias names
6. **Set search_path explicitly** to `public` for security
7. **Use STABLE** for read-only functions that don't modify data
8. **Grant EXECUTE carefully** - only to authenticated users who need access

### Example: Complete RLS-Bypass Function

```sql
CREATE FUNCTION get_feature_change_summary(
  p_tenant_id uuid,
  p_new_offering_id uuid
)
RETURNS json
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_current_offering_id uuid;
  v_result json;
BEGIN
  -- 1. Check authorization
  IF get_user_admin_role() != 'super_admin' THEN
    RAISE EXCEPTION 'Access denied. Only super admins can access this function.';
  END IF;

  -- 2. Get data (RLS bypassed)
  SELECT t.subscription_offering_id INTO v_current_offering_id
  FROM tenants t  -- Use alias
  WHERE t.id = p_tenant_id;

  -- 3. Build result
  v_result := json_build_object(
    'currentOfferingId', v_current_offering_id,
    'newOfferingId', p_new_offering_id
  );

  RETURN v_result;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_feature_change_summary(uuid, uuid) TO authenticated;

-- Add documentation
COMMENT ON FUNCTION get_feature_change_summary IS 'Returns feature change summary. Only accessible by super_admins.';
```

### ON CONFLICT and Unique Constraints

When inserting data with complex unique constraints, check for existence first instead of using ON CONFLICT:

```sql
-- ❌ WRONG - Complex ON CONFLICT that doesn't match index
INSERT INTO tenant_feature_grants (tenant_id, feature_id, grant_source)
VALUES (p_tenant_id, v_feature_id, 'direct')
ON CONFLICT (tenant_id, feature_id) DO NOTHING;  -- Doesn't match actual constraint!

-- Actual unique index has 5 columns:
-- (tenant_id, feature_id, grant_source, COALESCE(package_id, '...'), COALESCE(source_reference, ''))

-- ✅ CORRECT - Check existence first
SELECT EXISTS (
  SELECT 1 FROM tenant_feature_grants tfg
  WHERE tfg.tenant_id = p_tenant_id
    AND tfg.feature_id = v_feature_id
    AND tfg.grant_source = 'direct'
) INTO v_exists;

IF NOT v_exists THEN
  INSERT INTO tenant_feature_grants (...) VALUES (...);
ELSE
  UPDATE tenant_feature_grants SET ... WHERE ...;
END IF;
```

---

## Global Tables and Adapter Overrides

### When Tables Don't Have tenant_id

Some tables are **global resources** that don't belong to any specific tenant (e.g., `license_feature_bundles`, `feature_catalog`, `product_offerings`). These tables:

- Have **no `tenant_id` column**
- Are managed by **super_admin users only**
- Require **overriding BaseAdapter methods**

#### Problem: BaseAdapter Assumes tenant_id Exists

The `BaseAdapter` base class automatically filters by `tenant_id` in `create`, `update`, and `delete` methods:

```typescript
// BaseAdapter.update() - Line 408
.eq('id', id)
.eq('tenant_id', tenantId)  // ❌ Fails for global tables!
```

This causes errors like:
```
Error [TenantContextError]: No tenant context found
```

#### Solution: Override Methods in Adapter

For global tables, override the `create`, `update`, and `delete` methods to:
1. **Check `super_admin` role directly from database** - REQUIRED before any operation
2. **Omit `tenant_id` filter from queries** - ONLY for super_admin operations on global tables

**CRITICAL SECURITY RULE**:
- ✅ Global tables (no `tenant_id` column): Skip tenant filter ONLY if user is `super_admin`
- ❌ All other tables: ALWAYS filter by `tenant_id` regardless of user role
- ❌ Non-super_admin users: MUST NEVER access global tables or bypass tenant filtering

**Example: License Feature Bundle Adapter**

```typescript
@injectable()
export class LicenseFeatureBundleAdapter extends BaseAdapter<LicenseFeatureBundle> {
  protected tableName = 'license_feature_bundles';

  // Override create to handle global table
  async create(data: Partial<LicenseFeatureBundle>): Promise<LicenseFeatureBundle> {
    try {
      // Check admin role directly from database (not context)
      const supabase = await this.getSupabaseClient();
      const { data: adminRole } = await supabase.rpc('get_user_admin_role');

      if (adminRole !== 'super_admin') {
        throw new Error('Access denied. Only super admins can create feature bundles.');
      }

      // Run pre-create hook
      const processedData = await this.onBeforeCreate(data);

      // Create record (NO tenant_id filter)
      const userId = await this.getUserId();
      const { data: created, error: createError } = await supabase
        .from(this.tableName)
        .insert({
          ...processedData,
          created_by: userId,
          updated_by: userId,
        })
        .select()
        .single();

      if (createError || !created) {
        throw new Error(createError?.message || 'Create failed');
      }

      const result = created as LicenseFeatureBundle;
      await this.onAfterCreate(result);

      return result;
    } catch (error: any) {
      throw new Error(`Failed to create: ${error.message}`);
    }
  }

  // Override update to handle global table
  async update(id: string, data: Partial<LicenseFeatureBundle>, fieldsToRemove?: string[]): Promise<LicenseFeatureBundle> {
    try {
      // Check admin role directly from database
      const supabase = await this.getSupabaseClient();
      const { data: adminRole } = await supabase.rpc('get_user_admin_role');

      if (adminRole !== 'super_admin') {
        throw new Error('Access denied. Only super admins can update feature bundles.');
      }

      let processedData = await this.onBeforeUpdate(id, data);

      if (fieldsToRemove) {
        processedData = this.sanitizeData(processedData, fieldsToRemove);
      }

      // Update record (NO tenant_id filter)
      const userId = await this.getUserId();
      const { data: updated, error: updateError } = await supabase
        .from(this.tableName)
        .update({
          ...processedData,
          updated_by: userId,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .is('deleted_at', null)
        .select()
        .single();

      if (updateError || !updated) {
        throw new Error(updateError?.message || 'Update failed');
      }

      const result = updated as LicenseFeatureBundle;
      await this.onAfterUpdate(result);

      return result;
    } catch (error: any) {
      throw new Error(`Failed to update: ${error.message}`);
    }
  }

  // Override delete to handle global table
  async delete(id: string): Promise<void> {
    try {
      // Check admin role directly from database
      const supabase = await this.getSupabaseClient();
      const { data: adminRole } = await supabase.rpc('get_user_admin_role');

      if (adminRole !== 'super_admin') {
        throw new Error('Access denied. Only super admins can delete feature bundles.');
      }

      await this.onBeforeDelete(id);

      const userId = await this.getUserId();

      // Soft delete (NO tenant_id filter)
      const { error: deleteError } = await supabase
        .from(this.tableName)
        .update({
          deleted_at: new Date().toISOString(),
          updated_by: userId,
        })
        .eq('id', id)
        .is('deleted_at', null);

      if (deleteError) {
        throw new Error(deleteError.message);
      }

      await this.onAfterDelete(id);
    } catch (error: any) {
      throw new Error(`Failed to delete: ${error.message}`);
    }
  }

  // Helper method needed for sanitizeData
  protected sanitizeData(data: Partial<LicenseFeatureBundle>, fieldsToRemove: string[]): Partial<LicenseFeatureBundle> {
    const sanitized = { ...data };
    for (const field of fieldsToRemove) {
      delete (sanitized as any)[field];
    }
    return sanitized;
  }
}
```

### Key Points for Global Tables

1. **Check role directly**: Use `supabase.rpc('get_user_admin_role')` instead of `this.context?.roles`
   - Context may not be properly populated
   - Direct database check is more reliable

2. **No tenant_id filter**: Omit `.eq('tenant_id', tenantId)` from queries
   - Global tables don't have this column
   - Filtering by it causes SQL errors
   - **ONLY applicable for super_admin on global tables**

3. **Super admin only**: Enforce `adminRole !== 'super_admin'` check **BEFORE any operation**
   - Global resources should only be managed by super admins
   - Reject all other roles early with clear error message
   - **This check is mandatory - NEVER skip it**

4. **Maintain hooks**: Still call `onBeforeCreate`, `onAfterCreate`, etc.
   - Allows audit logging to work correctly
   - Preserves lifecycle behavior

5. **Override all CRUD methods**: Create, update, and delete all need overrides
   - Base adapter assumes tenant context for all operations
   - Each method must handle global table differently

### Security Warning

**NEVER** omit `tenant_id` filtering unless:
1. ✅ The table is a global table (no `tenant_id` column exists)
2. ✅ The user has been verified as `super_admin` via `get_user_admin_role()`
3. ✅ You have overridden the adapter methods with explicit role checks

**Violating this rule creates security vulnerabilities** where users could access data from other tenants!

### When to Use This Pattern

Override adapter methods when:
- ✅ Table has no `tenant_id` column
- ✅ Resource is managed globally by super admins
- ✅ Examples: `license_feature_bundles`, `feature_catalog`, `product_offerings`

Don't override when:
- ❌ Table has `tenant_id` column
- ❌ Resource belongs to specific tenants
- ❌ Examples: `roles`, `permissions`, `members`, `tenants`

---

## Security Considerations

### Tenant Isolation

**CRITICAL**: Always filter by tenant_id for tenant-scoped tables

```typescript
// Every query must include tenant filter (for tenant-scoped tables)
const { data } = await supabase
  .from(this.tableName)
  .select('*')
  .eq('tenant_id', tenantId); // REQUIRED for tenant tables
```

**EXCEPTION**: Global tables (see "Global Tables and Adapter Overrides" section above)

### Row Level Security (RLS)

- All tables have RLS policies
- Policies use `check_tenant_access(tenant_id)` function for tenant-scoped tables
- For global tables, use SECURITY DEFINER functions with internal role checks
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

**Last Updated**: 2025-10-05
**Session Reference**: Licensing Studio Implementation and Global Tables Pattern
