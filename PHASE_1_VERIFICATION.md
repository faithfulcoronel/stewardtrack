# Phase 1 Implementation Verification

## Quick Verification Steps

### 1. Check Service Registration in DI Container

The following services should be properly registered:

```typescript
// In src/lib/container.ts

// MenuAccessService (already existed)
container
  .bind<MenuAccessService>(TYPES.MenuAccessService)
  .to(MenuAccessService)
  .inRequestScope();

// MenuRenderingService (NEW)
container
  .bind<MenuRenderingService>(TYPES.MenuRenderingService)
  .to(MenuRenderingService)
  .inRequestScope();

// MenuManagementService (NEW)
container
  .bind<MenuManagementService>(TYPES.MenuManagementService)
  .to(MenuManagementService)
  .inRequestScope();

// IMenuItemRepository
container
  .bind<IMenuItemRepository>(TYPES.IMenuItemRepository)
  .to(MenuItemRepository)
  .inRequestScope();

// IMenuItemAdapter
container
  .bind<IMenuItemAdapter>(TYPES.IMenuItemAdapter)
  .to(MenuItemAdapter)
  .inRequestScope();
```

### 2. Verify Type Symbols

Check that all required symbols exist in `src/lib/types.ts`:

- ✅ `MenuAccessService: Symbol.for('MenuAccessService')`
- ✅ `MenuRenderingService: Symbol.for('MenuRenderingService')`
- ✅ `MenuManagementService: Symbol.for('MenuManagementService')`
- ✅ `IMenuItemRepository: Symbol.for('IMenuItemRepository')`
- ✅ `IMenuItemAdapter: Symbol.for('IMenuItemAdapter')`

### 3. Verify Database Schema

The menu_items table should have these columns:

```sql
-- Core fields (existing)
id uuid PRIMARY KEY
parent_id uuid REFERENCES menu_items(id)
code text NOT NULL
label text NOT NULL
path text NOT NULL
icon text
sort_order integer DEFAULT 0
is_system boolean DEFAULT false
section text
permission_key text
feature_key text
tenant_id uuid REFERENCES tenants(id)
deleted_at timestamp
created_by uuid
updated_by uuid
created_at timestamp
updated_at timestamp

-- New fields (Phase 1)
surface_id uuid REFERENCES metadata_surfaces(id) ON DELETE SET NULL
badge_text text
badge_variant text CHECK (badge_variant IN ('default', 'primary', 'secondary', 'success', 'warning', 'danger'))
description text
is_visible boolean DEFAULT true
metadata jsonb DEFAULT '{}'::jsonb
```

### 4. Example Usage Patterns

#### Using MenuAccessService

```typescript
import { container } from '@/lib/container';
import { TYPES } from '@/lib/types';
import type { MenuAccessService } from '@/services/MenuAccessService';

// In an API route or server component
const menuAccessService = container.get<MenuAccessService>(TYPES.MenuAccessService);

// Check access to a single menu item
const result = await menuAccessService.checkAccess(menuId, userId, tenantId);

if (result.allowed) {
  // User has access
  console.log('Access granted');
} else {
  // User does not have access
  console.log('Access denied:', result.reason);
  if (result.requiresUpgrade) {
    console.log('License upgrade required');
  }
}

// Get all accessible menu items for a user
const accessibleItems = await menuAccessService.getAccessibleMenuItems(userId, tenantId);

// Get menu items with access status (including locked items)
const itemsWithStatus = await menuAccessService.getMenuItemsWithStatus(userId, tenantId);
```

#### Using MenuRenderingService

```typescript
import { container } from '@/lib/container';
import { TYPES } from '@/lib/types';
import type { MenuRenderingService } from '@/services/MenuRenderingService';

// In an API route or server component
const menuRenderingService = container.get<MenuRenderingService>(TYPES.MenuRenderingService);

// Get hierarchical menu structure
const menuTree = await menuRenderingService.getMenuHierarchy(tenantId, {
  includeHidden: false,
  includeSystem: true,
  maxDepth: 3,
});

// Get menu items grouped by section
const menuBySection = await menuRenderingService.getMenuItemsBySection(tenantId);

// Get breadcrumbs for a menu item
const breadcrumbs = await menuRenderingService.getBreadcrumbs(menuItemId, tenantId);

// Find menu item by path
const activeItem = menuRenderingService.findByPath(menuTree, '/admin/dashboard');

// Get active trail for highlighting
const trail = menuRenderingService.getActiveTrail(menuTree, '/admin/members/list');

// Annotate with access status
const accessResults = await menuAccessService.checkMultipleAccess(
  menuItems.map(item => item.id),
  userId,
  tenantId
);
const annotatedMenu = menuRenderingService.annotateWithAccess(menuTree, accessResults);
```

#### Using MenuManagementService

```typescript
import { container } from '@/lib/container';
import { TYPES } from '@/lib/types';
import type { MenuManagementService } from '@/services/MenuManagementService';

// In an API route
const menuManagementService = container.get<MenuManagementService>(TYPES.MenuManagementService);

// Create a new menu item
const result = await menuManagementService.createMenuItem(
  {
    code: 'advanced_reports',
    label: 'Advanced Reports',
    path: '/admin/reports/advanced',
    icon: 'BarChart',
    section: 'reports',
    feature_key: 'advanced_reporting',
    surface_id: 'reports_advanced_surface_id',
    badge_text: 'New',
    badge_variant: 'primary',
    description: 'Access advanced reporting features',
    is_visible: true,
  },
  tenantId,
  userId
);

if (result.success) {
  console.log('Menu item created:', result.data);
} else {
  console.error('Validation errors:', result.errors);
}

// Update a menu item
const updateResult = await menuManagementService.updateMenuItem(
  menuItemId,
  {
    label: 'Advanced Analytics',
    badge_text: null, // Remove badge
  },
  tenantId,
  userId
);

// Delete a menu item (soft delete)
const deleteResult = await menuManagementService.deleteMenuItem(
  menuItemId,
  tenantId,
  userId
);

// Reorder menu items
const reorderResult = await menuManagementService.reorderMenuItems(
  [
    { id: 'item1', sort_order: 10 },
    { id: 'item2', sort_order: 20 },
    { id: 'item3', sort_order: 30 },
  ],
  tenantId,
  userId
);

// Move menu item to new parent
const moveResult = await menuManagementService.moveMenuItem(
  menuItemId,
  newParentId,
  tenantId,
  userId
);

// Duplicate a menu item
const duplicateResult = await menuManagementService.duplicateMenuItem(
  menuItemId,
  tenantId,
  userId
);
```

### 5. Integration with AccessGate Pattern

The MenuAccessService creates MenuItemAccessGate instances that extend AccessGate:

```typescript
import { MenuAccessService } from '@/services/MenuAccessService';

// Create a gate for a specific menu item
const menuGate = menuAccessService.createMenuGate(menuItemId);

// Use with GateGuard component (Phase 2)
<GateGuard
  check={async () => await menuGate.check(userId, tenantId)}
  redirect={true}
  redirectTo="/unauthorized"
>
  <ProtectedMenuContent />
</GateGuard>

// Or use imperatively
const isAllowed = await menuGate.allows(userId, tenantId);

// Or verify (throws on denial)
try {
  await menuGate.verify(userId, tenantId);
  // Access granted
} catch (error) {
  // Access denied
  if (error instanceof AccessDeniedError) {
    console.log('Redirect to:', error.redirectTo);
  }
}
```

### 6. Database Function Usage

The migration includes a database function for efficient access checking:

```sql
-- Direct database query (if needed)
SELECT * FROM get_accessible_menu_items(
  'user-uuid',
  'tenant-uuid'
);
```

This function:
- Checks role-based permissions via `role_menu_items`
- Checks surface bindings via `surface_id`
- Checks license features via `feature_key`
- Returns menu items with `has_access` boolean

### 7. Testing Service Integration

Create a simple test API route:

```typescript
// src/app/api/test/menu-services/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { container } from '@/lib/container';
import { TYPES } from '@/lib/types';
import type { MenuAccessService } from '@/services/MenuAccessService';
import type { MenuRenderingService } from '@/services/MenuRenderingService';
import type { MenuManagementService } from '@/services/MenuManagementService';

export async function GET(request: NextRequest) {
  try {
    const menuAccessService = container.get<MenuAccessService>(TYPES.MenuAccessService);
    const menuRenderingService = container.get<MenuRenderingService>(TYPES.MenuRenderingService);
    const menuManagementService = container.get<MenuManagementService>(TYPES.MenuManagementService);

    return NextResponse.json({
      success: true,
      message: 'All menu services loaded successfully',
      services: {
        menuAccessService: !!menuAccessService,
        menuRenderingService: !!menuRenderingService,
        menuManagementService: !!menuManagementService,
      },
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}
```

Test by visiting: `http://localhost:3000/api/test/menu-services`

Expected response:
```json
{
  "success": true,
  "message": "All menu services loaded successfully",
  "services": {
    "menuAccessService": true,
    "menuRenderingService": true,
    "menuManagementService": true
  }
}
```

## Common Issues and Solutions

### Issue 1: Service not found in container

**Error:** `No matching bindings found for serviceIdentifier: Symbol(MenuRenderingService)`

**Solution:** Ensure the service is imported and bound in `src/lib/container.ts`

### Issue 2: Circular dependency

**Error:** `Cannot instantiate cyclic dependency!`

**Solution:** Check constructor dependencies. MenuManagementService should only depend on IMenuItemRepository and AuditService.

### Issue 3: Type mismatch

**Error:** `Type 'X' is not assignable to type 'Y'`

**Solution:** Ensure MenuItem model includes all new fields and adapter defaultSelect includes them.

### Issue 4: Database constraint violation

**Error:** `violates foreign key constraint`

**Solution:** Ensure parent_id exists and belongs to same tenant. Use MenuManagementService which validates this.

## Build Verification

Run these commands to verify no TypeScript errors in new files:

```bash
# Check TypeScript compilation
npx tsc --noEmit

# Or run the build
npm run build
```

## Next Steps

After verifying Phase 1:

1. Proceed to Phase 2: DynamicSidebar component and API routes
2. Test menu hierarchy building with sample data
3. Test access control with different user roles
4. Test validation in MenuManagementService

## Success Criteria

Phase 1 is complete when:

- ✅ All services compile without errors
- ✅ Services are properly registered in DI container
- ✅ MenuItem model includes all new fields
- ✅ Database migration exists with correct schema
- ✅ MenuAccessService integrates with AccessGate
- ✅ MenuRenderingService builds hierarchies correctly
- ✅ MenuManagementService validates and manages CRUD operations
- ✅ All type symbols are defined
- ✅ Repository and adapter are bound

---

**Verification Date:** 2025-10-13
**Phase:** 1 of 4
**Status:** READY FOR TESTING
