# Lib Directory - Architecture & Patterns

## Overview

The `lib/` directory contains **core infrastructure** and shared utilities for StewardTrack. This includes dependency injection setup, metadata system components, Supabase clients, tenant resolution, RBAC helpers, and cross-cutting concerns.

**Key Principle:** The `lib/` directory provides foundational plumbing that powers the entire application.

## Directory Structure

```
src/lib/
├── container.ts                 # InversifyJS DI container configuration
├── types.ts                     # DI type symbols for all services/repos/adapters
├── metadata/                    # Metadata system (resolver, interpreter, registry)
├── supabase/                    # Supabase client factories
├── server/                      # Server-side context and utilities
├── tenant/                      # Tenant resolution, session cache, RBAC seeding
├── rbac/                        # RBAC utilities and helpers
├── access-gate/                 # Access control gate system
├── auth/                        # Authentication actions
├── cache/                       # Caching strategies (license cache)
├── featureFlags/                # Feature flag utilities
├── audit/                       # Audit query helpers
└── utils.ts                     # General utility functions
```

## Major Subsystems

### 1. Dependency Injection (`container.ts` + `types.ts`)

The DI container is the heart of the application's architecture, managing all service, repository, and adapter instances.

#### `types.ts` - Type Symbol Registry

```typescript
export const TYPES = {
  // Services
  RbacCoreService: Symbol.for('RbacCoreService'),
  LicensingService: Symbol.for('LicensingService'),

  // Repositories
  IRoleRepository: Symbol.for('IRoleRepository'),
  IPermissionRepository: Symbol.for('IPermissionRepository'),

  // Adapters
  IRoleAdapter: Symbol.for('IRoleAdapter'),
  IPermissionAdapter: Symbol.for('IPermissionAdapter'),
};
```

**Pattern:** Every injectable class needs a unique `Symbol.for()` identifier.

#### `container.ts` - DI Container Configuration

```typescript
import { Container } from 'inversify';
import { TYPES } from './types';

const container = new Container();

// Bind services
container.bind<RbacCoreService>(TYPES.RbacCoreService)
  .to(RbacCoreService)
  .inRequestScope(); // ← CRITICAL: Request-scoped, not singleton

// Bind repositories
container.bind<IRoleRepository>(TYPES.IRoleRepository)
  .to(RoleRepository)
  .inRequestScope();

// Bind adapters
container.bind<IRoleAdapter>(TYPES.IRoleAdapter)
  .to(RoleAdapter)
  .inRequestScope();

export { container };
```

**Key Patterns:**
- **`.inRequestScope()`**: Creates new instance per request (stateless)
- **Interface Binding**: Bind interface symbol to implementation class
- **Layered Registration**: Services → Repositories → Adapters

**Why InversifyJS?**
- Type-safe dependency injection
- Easy to mock dependencies in tests
- Enforces interface-based design
- Prevents circular dependencies (container detects them)

### 2. Metadata System (`metadata/`)

The metadata system is StewardTrack's **core innovation** - pages defined in XML, compiled to JSON, and rendered dynamically.

#### Key Files

**Resolver** (`resolver.ts`)
- Merges base blueprints with overlays (tenant/role/variant)
- Resolves metadata layers based on context
- Returns canonical JSON for interpreter

```typescript
import { resolveMetadata } from '@/lib/metadata/resolver';

const metadata = await resolveMetadata({
  module: 'admin-community',
  route: 'members',
  tenantId: 'tenant-123',
  role: 'admin',
  variant: 'mobile'
});
```

**Component Registry** (`component-registry.ts`)
- Maps type strings → React components
- Used by interpreter to render components

```typescript
export const componentRegistry: ComponentRegistry = {
  'DataTable': DataTable,
  'FormField': FormField,
  'Button': Button,
  // ... 100+ component mappings
};
```

**Interpreter** (imported from external package)
- Walks canonical JSON definition
- Renders React components via component registry
- Evaluates conditional logic and data bindings

**Registry Provider** (`registryProvider.ts`)
- Loads compiled metadata from filesystem
- Provides manifest lookups

#### Metadata Workflow

```
1. Author XML in metadata/authoring/blueprints/
   ↓
2. Run `npm run metadata:compile`
   ↓
3. Compiler validates XML → outputs JSON to metadata/compiled/
   ↓
4. Registry manifest updated with artifact paths
   ↓
5. Runtime: Resolver merges layers → Interpreter renders React
```

**Critical Commands:**
- `npm run metadata:compile` - **Always run before testing metadata changes**
- `npm run metadata:watch` - Auto-compile on file changes
- `npm run metadata:types` - Regenerate TS types after schema changes

### 3. Supabase Clients (`supabase/`)

#### Server-Side Client (`server.ts`)

```typescript
import { createClient as createSupabaseClient } from '@/lib/supabase/server';

// In API routes, server components, services, adapters
const supabase = await createSupabaseClient();

const { data, error } = await supabase
  .from('roles')
  .select('*')
  .eq('tenant_id', tenantId);
```

**Features:**
- Uses **service role key** (bypasses RLS for admin operations)
- Server-only (never exposed to client)
- Used in adapters, API routes, server components

#### Client-Side Client (`client.ts`)

```typescript
import { createClient } from '@/lib/supabase/client';

// In client components, hooks
const supabase = createClient();

const { data: user } = await supabase.auth.getUser();
```

**Features:**
- Uses **anonymous key** (RLS enforced)
- Safe for client-side usage
- Used in client components, authentication flows

**IMPORTANT:** Never use server-side client in client components (exposes service role key).

### 4. Tenant Resolution (`tenant/`)

#### Tenant Resolver (`tenant-resolver.ts`)

Resolves tenant context from authenticated user:

```typescript
import { tenantUtils } from '@/utils/tenantUtils';

// Get current user's tenant
const tenantId = await tenantUtils.getTenantId();

// Get tenant record
const tenant = await tenantUtils.getTenant();
```

**Resolution Flow:**
1. Get authenticated user from Supabase session
2. Query `tenant_users` table for user's tenant association
3. Return tenant ID or null
4. Services require tenant for all operations

#### Session Cache (`session-cache.ts`)

Caches session data to minimize database queries:

```typescript
// Cached for request duration
const cachedSession = await getSessionFromCache();
```

**Why Cache?**
- Multiple services call `getCurrentUser()` in same request
- Reduces Supabase API calls
- Improves performance

#### RBAC Seeding (`seedDefaultRBAC.ts`)

Seeds default roles and permissions during tenant registration:

```typescript
import { seedDefaultRBAC } from '@/lib/tenant/seedDefaultRBAC';

// Called during /api/auth/register
await seedDefaultRBAC(tenantId);
```

**Seeds:**
- 4 default roles: `tenant_admin`, `staff`, `volunteer`, `member`
- Core permissions for each role
- System-level vs tenant-level scopes

### 5. Server Context (`server/context.ts`)

Provides centralized request context resolution:

```typescript
import { getCurrentUser, getCurrentUserId, getCurrentTenantId } from '@/lib/server/context';

// In API routes or server components
const user = await getCurrentUser(); // Redirects to /login if not authenticated
const userId = await getCurrentUserId();
const tenantId = await getCurrentTenantId(); // Redirects to /unauthorized if no tenant

// Optional tenant (won't redirect)
const tenantId = await getCurrentTenantId({ optional: true });
```

**Features:**
- Automatic redirects on auth failures
- Type-safe overloads (optional vs required)
- Consistent error handling across app

### 6. RBAC Helpers (`rbac/`)

#### Publishing Store (`publishing-store.ts`)

Manages RBAC state publishing workflows:

```typescript
import { publishingStore } from '@/lib/rbac/publishing-store';

// Compile RBAC changes for deployment
await publishingStore.compileChanges(tenantId);
```

#### Permission Helpers (`permissionHelpers.ts`)

Utility functions for permission checks:

```typescript
import { hasPermission, getEffectivePermissions } from '@/lib/rbac/permissionHelpers';

const canEdit = await hasPermission(userId, 'members:write', tenantId);
const permissions = await getEffectivePermissions(userId, tenantId);
```

### 7. Access Gate (`access-gate/`)

Middleware-style access control system:

```typescript
import { AccessGate } from '@/lib/access-gate';

// In server components or API routes
const gate = new AccessGate(userId, tenantId);

await gate.requirePermission('members:read');
await gate.requireFeature('advanced_reporting');
await gate.requireRole('admin');
```

**Strategies:**
- Permission-based access control
- Feature flag gating
- Role-based access control
- Combines RBAC + licensing

### 8. Utilities

#### `utils.ts` - General Utilities

```typescript
import { cn } from '@/lib/utils';

// Tailwind class merging
const className = cn('px-4 py-2', isActive && 'bg-blue-500');
```

#### `helpers.ts` - Helper Functions

Various helper utilities for common operations.

## Key Patterns

### Pattern 1: DI Container Usage

**Adding a New Service:**

```typescript
// 1. Add to types.ts
export const TYPES = {
  MyService: Symbol.for('MyService'),
};

// 2. Bind in container.ts
container.bind<MyService>(TYPES.MyService)
  .to(MyService)
  .inRequestScope();

// 3. Inject in dependent class
@injectable()
export class OtherService {
  constructor(
    @inject(TYPES.MyService)
    private myService: MyService
  ) {}
}
```

### Pattern 2: Server Context Resolution

**API Route Pattern:**

```typescript
// src/app/api/my-route/route.ts
import { getCurrentTenantId, getCurrentUserId } from '@/lib/server/context';

export async function GET() {
  const userId = await getCurrentUserId(); // Redirects if not logged in
  const tenantId = await getCurrentTenantId(); // Redirects if no tenant

  // ... business logic
}
```

### Pattern 3: Tenant Utilities

**Service Pattern:**

```typescript
private async resolveTenantId(tenantId?: string): Promise<string> {
  const resolved = tenantId ?? (await tenantUtils.getTenantId());
  if (!resolved) {
    throw new Error('No tenant context available');
  }
  return resolved;
}
```

### Pattern 4: Metadata Resolution

**Page Component Pattern:**

```typescript
import { resolveMetadata } from '@/lib/metadata/resolver';
import { interpretMetadata } from '@/lib/metadata/interpreter';

const metadata = await resolveMetadata({
  module: 'admin-community',
  route: 'members',
  tenantId,
  role: userRole,
});

return interpretMetadata(metadata, context);
```

### Pattern 5: Supabase Client Selection

```typescript
// ❌ WRONG: Server client in client component
'use client';
import { createClient } from '@/lib/supabase/server'; // ❌ Exposes service role key

// ✅ CORRECT: Client client in client component
'use client';
import { createClient } from '@/lib/supabase/client';

// ✅ CORRECT: Server client in API route
import { createClient } from '@/lib/supabase/server';
export async function POST() {
  const supabase = await createClient();
}
```

## Best Practices

### 1. DI Container

- **Always use `.inRequestScope()`** for services/repositories/adapters
- **Never use `.inSingletonScope()`** (causes stale data and memory leaks)
- **Bind interfaces, not classes** (`TYPES.IMyService`, not `TYPES.MyService`)
- **Use `Symbol.for()` for type symbols** (enables cross-module access)

### 2. Metadata System

- **Run `npm run metadata:compile` after XML changes** (dev server doesn't auto-compile)
- **Register new components in component-registry.ts** before using in XML
- **Use metadata overlays** for tenant/role-specific customizations
- **Don't bypass resolver** - always use `resolveMetadata()` for proper layering

### 3. Tenant Resolution

- **Always require `tenantId` in data access methods**
- **Use `tenantUtils.getTenantId()` as fallback** in services
- **Never hardcode tenant IDs** (except tests)
- **Cache tenant lookups per request** to minimize DB queries

### 4. Supabase Clients

- **Server-side:** Use `@/lib/supabase/server` (service role key)
- **Client-side:** Use `@/lib/supabase/client` (anonymous key)
- **Never import server client in 'use client' components**
- **Always await `createClient()`** (it's async)

### 5. Server Context

- **Use `getCurrentTenantId()` for required tenant** (redirects on failure)
- **Use `getCurrentTenantId({ optional: true })` for optional tenant** (returns null)
- **Let context helpers handle redirects** (don't manually redirect)

## Anti-Patterns to Avoid

❌ **Singleton Services**
```typescript
// BAD: Singleton scope causes stale data
container.bind<MyService>(TYPES.MyService)
  .to(MyService)
  .inSingletonScope(); // ❌ Don't do this
```

✅ **Request-Scoped Services**
```typescript
// GOOD: New instance per request
container.bind<MyService>(TYPES.MyService)
  .to(MyService)
  .inRequestScope();
```

❌ **Server Client in Client Components**
```typescript
// BAD: Exposes service role key to browser
'use client';
import { createClient } from '@/lib/supabase/server';
```

✅ **Correct Client Selection**
```typescript
// GOOD: Client-safe Supabase client
'use client';
import { createClient } from '@/lib/supabase/client';
```

❌ **Skipping Metadata Compilation**
```typescript
// BAD: Edit XML but forget to compile
// XML changes in metadata/authoring/blueprints/
// ❌ Forgot: npm run metadata:compile
// Changes not reflected at runtime
```

✅ **Always Compile Metadata**
```bash
# GOOD: Compile after XML changes
npm run metadata:compile
```

❌ **Manual Context Resolution**
```typescript
// BAD: Reinventing the wheel
const supabase = await createClient();
const { data: { user } } = await supabase.auth.getUser();
if (!user) {
  redirect('/login');
}
```

✅ **Use Context Helpers**
```typescript
// GOOD: Use built-in context resolver
import { getCurrentUser } from '@/lib/server/context';
const user = await getCurrentUser(); // Auto-redirects
```

## Common Tasks

### Adding a New Service to DI Container

1. **Define Interface & Implementation**
```typescript
// src/services/MyService.ts
export interface IMyService {
  doSomething(): Promise<void>;
}

@injectable()
export class MyService implements IMyService {
  async doSomething() { /* ... */ }
}
```

2. **Add Type Symbol**
```typescript
// src/lib/types.ts
export const TYPES = {
  IMyService: Symbol.for('IMyService'),
};
```

3. **Register in Container**
```typescript
// src/lib/container.ts
import { MyService } from '@/services/MyService';
import type { IMyService } from '@/services/MyService';

container.bind<IMyService>(TYPES.IMyService)
  .to(MyService)
  .inRequestScope();
```

4. **Inject in Dependents**
```typescript
@injectable()
export class OtherService {
  constructor(
    @inject(TYPES.IMyService)
    private myService: IMyService
  ) {}
}
```

### Adding a Metadata Component

1. **Create React Component**
```typescript
// src/components/MyComponent.tsx
export function MyComponent({ data }: { data: any }) {
  return <div>{data.title}</div>;
}
```

2. **Register in Component Registry**
```typescript
// src/lib/metadata/component-registry.ts
import { MyComponent } from '@/components/MyComponent';

export const componentRegistry = {
  'MyComponent': MyComponent,
};
```

3. **Use in XML Metadata**
```xml
<component type="MyComponent">
  <dataBinding property="data" source="myDataSource" />
</component>
```

4. **Compile Metadata**
```bash
npm run metadata:compile
```

### Resolving Request Context

```typescript
// In API route or server component
import { getCurrentUser, getCurrentTenantId } from '@/lib/server/context';

export async function GET() {
  // Get authenticated user (redirects to /login if not authenticated)
  const user = await getCurrentUser();

  // Get tenant (redirects to /unauthorized if no tenant)
  const tenantId = await getCurrentTenantId();

  // Optional tenant (returns null instead of redirecting)
  const optionalTenantId = await getCurrentTenantId({ optional: true });

  // Custom redirect destination
  const customUser = await getCurrentUser({ redirectTo: '/custom-login' });
}
```

## Related Documentation

- **Services:** `src/services/claude.md`
- **Repositories:** `src/repositories/claude.md`
- **Adapters:** `src/adapters/claude.md`
- **Metadata Authoring:** `metadata/authoring/claude.md`
- **Root Overview:** `CLAUDE.md`
