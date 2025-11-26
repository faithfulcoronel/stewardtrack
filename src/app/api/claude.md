# API Routes Directory - Architecture & Patterns

## Overview

The `src/app/api/` directory contains **Next.js API routes** that handle HTTP requests for StewardTrack. These routes form the **HTTP interface layer** between the frontend and backend services.

**Key Principle:** API routes are thin controllers that delegate to services, handle request/response transformation, and manage HTTP concerns.

## Directory Structure

```
src/app/api/
├── rbac/                        # RBAC management endpoints
│   ├── roles/                   # Role CRUD
│   ├── permissions/             # Permission queries
│   ├── users/                   # User-role assignments
│   ├── delegation/              # Delegation workflows
│   ├── multi-role/              # Multi-role management
│   ├── audit/                   # Audit logs
│   └── statistics/              # RBAC stats
├── licensing/                   # Licensing management endpoints
│   ├── product-offerings/       # Product offerings CRUD
│   ├── features/                # License features
│   ├── feature-bundles/         # Feature bundle management
│   ├── assign-license/          # License assignment
│   └── tenants/                 # Tenant license queries
├── auth/                        # Authentication endpoints
│   └── register/                # Tenant registration
├── onboarding/                  # Onboarding wizard endpoints
│   ├── save-progress/           # Save wizard progress
│   └── complete/                # Complete onboarding
├── user-member-link/            # User-member linking
├── member-invitations/          # Member invitation workflows
├── metadata/                    # Metadata action execution
├── tenant/                      # Tenant management
├── access-gate/                 # Access control checks
└── admin/                       # Admin utilities
```

## Next.js API Route Basics

### File-Based Routing

Next.js uses file-system routing for API routes:

```
src/app/api/
├── roles/
│   ├── route.ts           # GET/POST /api/roles
│   └── [id]/
│       ├── route.ts       # GET/PUT/DELETE /api/roles/[id]
│       └── users/
│           └── route.ts   # GET/POST /api/roles/[id]/users
```

**URL Mapping:**
- `src/app/api/roles/route.ts` → `/api/roles`
- `src/app/api/roles/[id]/route.ts` → `/api/roles/123`
- `src/app/api/roles/[id]/users/route.ts` → `/api/roles/123/users`

### HTTP Method Handlers

Each `route.ts` file exports named functions for HTTP methods:

```typescript
import { NextRequest, NextResponse } from 'next/server';

// GET /api/my-resource
export async function GET(request: NextRequest) {
  return NextResponse.json({ message: 'GET handler' });
}

// POST /api/my-resource
export async function POST(request: NextRequest) {
  const body = await request.json();
  return NextResponse.json({ message: 'POST handler', body });
}

// PUT /api/my-resource
export async function PUT(request: NextRequest) {
  return NextResponse.json({ message: 'PUT handler' });
}

// DELETE /api/my-resource
export async function DELETE(request: NextRequest) {
  return NextResponse.json({ message: 'DELETE handler' });
}

// PATCH /api/my-resource
export async function PATCH(request: NextRequest) {
  return NextResponse.json({ message: 'PATCH handler' });
}
```

### Dynamic Route Parameters

```typescript
// src/app/api/roles/[id]/route.ts
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const roleId = params.id;
  // ... fetch role by ID
}
```

### Query Parameters

```typescript
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const includeSystem = searchParams.get('includeSystem') === 'true';
  const page = parseInt(searchParams.get('page') || '1');

  // ... use query params
}
```

## Standard API Route Pattern

All StewardTrack API routes follow this pattern:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { container } from '@/lib/container';
import { TYPES } from '@/lib/types';
import { getCurrentTenantId, getCurrentUserId } from '@/lib/server/context';
import type { MyService } from '@/services/MyService';
import type { CreateMyDto } from '@/models/my.model';

export async function GET(request: NextRequest) {
  try {
    // 1. Resolve context (tenant, user)
    const tenantId = await getCurrentTenantId();
    const userId = await getCurrentUserId();

    // 2. Get service from DI container
    const myService = container.get<MyService>(TYPES.MyService);

    // 3. Parse query parameters
    const { searchParams } = new URL(request.url);
    const filter = searchParams.get('filter');

    // 4. Call service method
    const data = await myService.getData(tenantId, filter);

    // 5. Return JSON response
    return NextResponse.json({
      success: true,
      data
    });
  } catch (error) {
    // 6. Handle errors
    console.error('Error fetching data:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch data'
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // 1. Resolve context
    const tenantId = await getCurrentTenantId();

    // 2. Get service
    const myService = container.get<MyService>(TYPES.MyService);

    // 3. Parse request body
    const body: CreateMyDto = await request.json();

    // 4. Validate input
    if (!body.name) {
      return NextResponse.json(
        {
          success: false,
          error: 'Name is required'
        },
        { status: 400 }
      );
    }

    // 5. Call service
    const result = await myService.create(body, tenantId);

    // 6. Return response
    return NextResponse.json({
      success: true,
      data: result
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating resource:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create resource'
      },
      { status: 500 }
    );
  }
}
```

## Key Patterns

### Pattern 1: Context Resolution

**Always resolve tenant/user context at the start:**

```typescript
export async function GET(request: NextRequest) {
  try {
    // Required tenant (redirects if missing)
    const tenantId = await getCurrentTenantId();

    // Optional tenant (returns null if missing)
    const optionalTenantId = await getCurrentTenantId({ optional: true });

    // Current user (redirects to /login if not authenticated)
    const userId = await getCurrentUserId();

    // Full user object
    const user = await getCurrentUser();

    // ... rest of handler
  } catch (error) {
    // ...
  }
}
```

### Pattern 2: Service Injection from DI Container

**Never instantiate services directly:**

```typescript
// ❌ BAD: Direct instantiation
const myService = new MyService(new MyRepository(...));

// ✅ GOOD: DI container
const myService = container.get<MyService>(TYPES.MyService);
```

### Pattern 3: Request Body Parsing

```typescript
export async function POST(request: NextRequest) {
  try {
    // Parse JSON body
    const body: CreateRoleDto = await request.json();

    // Parse FormData (for file uploads)
    const formData = await request.formData();
    const file = formData.get('file') as File;

    // Parse search params
    const { searchParams } = new URL(request.url);
    const param = searchParams.get('key');

    // ...
  } catch (error) {
    // ...
  }
}
```

### Pattern 4: Input Validation

```typescript
export async function POST(request: NextRequest) {
  try {
    const body: CreateRoleDto = await request.json();

    // Basic validation
    if (!body.name || !body.scope) {
      return NextResponse.json(
        {
          success: false,
          error: 'Name and scope are required'
        },
        { status: 400 }
      );
    }

    // Advanced validation with Zod (recommended)
    const schema = z.object({
      name: z.string().min(2),
      scope: z.enum(['system', 'tenant', 'delegated']),
    });

    const validationResult = schema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation failed',
          details: validationResult.error.errors
        },
        { status: 400 }
      );
    }

    // ... proceed with validated data
  } catch (error) {
    // ...
  }
}
```

### Pattern 5: Response Formats

**Standard Success Response:**
```typescript
return NextResponse.json({
  success: true,
  data: result
});
```

**Standard Error Response:**
```typescript
return NextResponse.json(
  {
    success: false,
    error: 'Error message',
    details?: additionalInfo
  },
  { status: 400 | 401 | 403 | 404 | 500 }
);
```

**Status Codes:**
- **200 OK**: Successful GET/PUT/PATCH
- **201 Created**: Successful POST
- **204 No Content**: Successful DELETE
- **400 Bad Request**: Invalid input
- **401 Unauthorized**: Not authenticated
- **403 Forbidden**: Not authorized
- **404 Not Found**: Resource doesn't exist
- **500 Internal Server Error**: Server-side error

### Pattern 6: Error Handling

```typescript
export async function GET(request: NextRequest) {
  try {
    // ... handler logic
  } catch (error) {
    console.error('Error in GET /api/my-route:', error);

    // Check for specific error types
    if (error instanceof ValidationError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 400 }
      );
    }

    if (error instanceof NotFoundError) {
      return NextResponse.json(
        { success: false, error: 'Resource not found' },
        { status: 404 }
      );
    }

    // Generic error
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'An error occurred'
      },
      { status: 500 }
    );
  }
}
```

### Pattern 7: Dynamic Route Parameters

```typescript
// src/app/api/roles/[id]/route.ts
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const roleId = params.id;
    const tenantId = await getCurrentTenantId();

    const rbacService = container.get<RbacService>(TYPES.RbacService);
    const role = await rbacService.getRoleWithPermissions(roleId, tenantId);

    if (!role) {
      return NextResponse.json(
        { success: false, error: 'Role not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: role });
  } catch (error) {
    // ...
  }
}
```

## Major Route Groups

### RBAC Routes (`/api/rbac/`)

**Roles:**
- `GET /api/rbac/roles` - List all roles
- `POST /api/rbac/roles` - Create role
- `GET /api/rbac/roles/[id]` - Get role details
- `PUT /api/rbac/roles/[id]` - Update role
- `DELETE /api/rbac/roles/[id]` - Delete role
- `GET /api/rbac/roles/[id]/users` - Get users with role
- `POST /api/rbac/roles/[id]/permissions` - Assign permissions to role

**Users:**
- `GET /api/rbac/users` - List users
- `GET /api/rbac/users/[userId]/roles` - Get user's roles
- `POST /api/rbac/users/[userId]/roles` - Assign role to user
- `DELETE /api/rbac/users/[userId]/roles/[roleId]` - Revoke role from user

**Delegation:**
- `GET /api/rbac/delegation/roles` - Get delegatable roles
- `POST /api/rbac/delegation/assign-role` - Delegate role with scope
- `POST /api/rbac/delegation/revoke-role` - Revoke delegated role

**Multi-Role:**
- `GET /api/rbac/multi-role/users` - Get users with multiple roles
- `POST /api/rbac/multi-role/assign` - Assign multiple roles to user
- `POST /api/rbac/multi-role/analyze-conflicts` - Analyze role conflicts

**Statistics:**
- `GET /api/rbac/statistics` - RBAC dashboard statistics

### Licensing Routes (`/api/licensing/`)

**Product Offerings:**
- `GET /api/licensing/product-offerings` - List offerings
- `POST /api/licensing/product-offerings` - Create offering
- `GET /api/licensing/product-offerings/[id]` - Get offering details
- `PUT /api/licensing/product-offerings/[id]` - Update offering
- `DELETE /api/licensing/product-offerings/[id]` - Delete offering

**License Assignment:**
- `POST /api/licensing/assign-license` - Assign license to tenant
- `GET /api/licensing/tenants` - List tenants for assignment
- `GET /api/licensing/tenants/[id]/history` - License history
- `GET /api/licensing/feature-changes` - Preview feature changes

**Features:**
- `GET /api/licensing/features` - List license features
- `POST /api/licensing/features` - Create license feature
- `GET /api/licensing/features/[id]/permissions` - Get feature permissions

### Authentication Routes (`/api/auth/`)

**Registration:**
- `POST /api/auth/register` - Register new tenant

**Flow:**
1. Create Supabase auth user
2. Create tenant record
3. Seed default RBAC roles
4. Provision license features
5. Create onboarding progress

### Onboarding Routes (`/api/onboarding/`)

**Progress:**
- `POST /api/onboarding/save-progress` - Save wizard step progress
- `POST /api/onboarding/complete` - Mark onboarding complete

## Best Practices

### 1. API Route Responsibilities

**DO:**
- ✅ Resolve context (tenant, user)
- ✅ Parse request (body, params, query)
- ✅ Validate input
- ✅ Delegate to services
- ✅ Transform response
- ✅ Handle errors
- ✅ Return JSON

**DON'T:**
- ❌ Implement business logic (use services)
- ❌ Access database directly (use services/repositories)
- ❌ Perform complex calculations (use services)
- ❌ Instantiate services manually (use DI container)

### 2. Error Handling

**Always wrap handlers in try-catch:**
```typescript
export async function GET(request: NextRequest) {
  try {
    // ... handler logic
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json(
      { success: false, error: 'Error message' },
      { status: 500 }
    );
  }
}
```

### 3. Input Validation

**Validate before processing:**
```typescript
const body = await request.json();

if (!body.name || !body.scope) {
  return NextResponse.json(
    { success: false, error: 'Missing required fields' },
    { status: 400 }
  );
}
```

### 4. Consistent Response Format

**Use standard format:**
```typescript
// Success
{ success: true, data: result }

// Error
{ success: false, error: 'message', details?: any }
```

### 5. Status Codes

**Use appropriate HTTP status codes:**
```typescript
// 201 Created (POST success)
return NextResponse.json({ success: true, data }, { status: 201 });

// 404 Not Found
return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });

// 400 Bad Request
return NextResponse.json({ success: false, error: 'Invalid input' }, { status: 400 });
```

### 6. Logging

**Log errors with context:**
```typescript
catch (error) {
  console.error('Error fetching roles for tenant:', tenantId, error);
  // ...
}
```

## Anti-Patterns to Avoid

❌ **Business Logic in API Routes**
```typescript
// BAD: Implementing business logic in route
export async function POST(request: NextRequest) {
  const body = await request.json();

  // ❌ Business logic doesn't belong here
  if (body.name === 'admin' && body.scope !== 'system') {
    return NextResponse.json({ error: 'Invalid admin config' }, { status: 400 });
  }

  // ❌ Direct database access
  const supabase = await createClient();
  const { data } = await supabase.from('roles').insert(body);

  return NextResponse.json({ data });
}
```

✅ **Delegate to Services**
```typescript
// GOOD: Thin controller
export async function POST(request: NextRequest) {
  try {
    const tenantId = await getCurrentTenantId();
    const body = await request.json();

    const rbacService = container.get<RbacService>(TYPES.RbacService);
    const role = await rbacService.createRole(body, tenantId);

    return NextResponse.json({ success: true, data: role }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ success: false, error }, { status: 500 });
  }
}
```

❌ **Manual Service Instantiation**
```typescript
// BAD: Manual instantiation
const rbacService = new RbacService(new RoleRepository(...));
```

✅ **DI Container**
```typescript
// GOOD: Use container
const rbacService = container.get<RbacService>(TYPES.RbacService);
```

❌ **Missing Error Handling**
```typescript
// BAD: No try-catch
export async function GET(request: NextRequest) {
  const data = await myService.getData(); // ❌ Could throw
  return NextResponse.json({ data });
}
```

✅ **Proper Error Handling**
```typescript
// GOOD: Wrapped in try-catch
export async function GET(request: NextRequest) {
  try {
    const data = await myService.getData();
    return NextResponse.json({ success: true, data });
  } catch (error) {
    return NextResponse.json({ success: false, error }, { status: 500 });
  }
}
```

## Testing API Routes

**Current State:** No automated tests configured.

**Recommended Testing Approach:**
1. **Integration tests** calling routes via HTTP
2. **Mock services** to isolate route logic
3. **Test error cases** (missing params, validation failures)

```typescript
// Example test (when testing framework is added)
describe('GET /api/roles', () => {
  it('should return roles for authenticated user', async () => {
    const response = await fetch('/api/roles', {
      headers: { Authorization: `Bearer ${testToken}` }
    });

    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.success).toBe(true);
    expect(Array.isArray(json.data)).toBe(true);
  });
});
```

## Adding a New API Route

1. **Create Route File**
```typescript
// src/app/api/my-resource/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { container } from '@/lib/container';
import { TYPES } from '@/lib/types';
import { getCurrentTenantId } from '@/lib/server/context';

export async function GET(request: NextRequest) {
  try {
    const tenantId = await getCurrentTenantId();
    const myService = container.get<MyService>(TYPES.MyService);

    const data = await myService.getData(tenantId);

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch data' },
      { status: 500 }
    );
  }
}
```

2. **Test Route**
```bash
curl http://localhost:3000/api/my-resource
```

3. **Document Route** (in this file or API docs)

## Related Documentation

- **Services:** `src/services/claude.md`
- **DI Container:** `src/lib/claude.md`
- **Server Context:** `src/lib/server/context.ts`
- **Next.js API Routes:** https://nextjs.org/docs/app/building-your-application/routing/route-handlers
