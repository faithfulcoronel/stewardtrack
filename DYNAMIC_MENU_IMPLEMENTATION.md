# Dynamic Sidebar Menu System - Implementation Summary

## Overview

A complete implementation of a database-driven, access-controlled menu system for the StewardTrack admin interface. The system allows super administrators to create, manage, and reorder menu items through a visual interface while maintaining backward compatibility with the existing static menu.

## Architecture

### Core Components

1. **Database Layer** (Phase 1 - Completed)
   - `menu_items` table with comprehensive schema
   - Support for hierarchical menu structures
   - Role-based access via `role_menu_items` junction table
   - Surface bindings for metadata integration
   - License feature gating

2. **Services** (Phase 1 - Completed)
   - `MenuRenderingService`: Transforms flat menu items into hierarchical structures
   - `MenuManagementService`: CRUD operations with validation
   - `MenuAccessService`: Unified access control using AccessGate pattern

3. **Client Components** (Phase 2 - Completed)
   - `DynamicMenuItem`: Individual menu item with GateGuard integration
   - `DynamicSidebar`: Full sidebar replacement using dynamic menu items
   - Menu converter utilities for format transformation

4. **API Routes** (Phase 3 - Completed)
   - `GET/POST /api/menu-items`: List and create menu items
   - `GET/PATCH/DELETE /api/menu-items/[id]`: Individual item operations
   - `GET /api/menu-items/[id]/access-check`: Client-side access verification
   - `POST /api/menu-items/reorder`: Drag-drop reordering

5. **Admin UI** (Phase 4 - Completed)
   - `/admin/menu-builder`: Super admin only management interface
   - `MenuBuilderUI`: Three-panel layout (tree, editor, preview)
   - `MenuTree`: Hierarchical view with drag-drop reordering
   - `MenuItemEditor`: Comprehensive form for menu item properties
   - `SidebarPreview`: Live preview of menu changes

6. **Layout Integration** (Phase 5 - Completed)
   - Environment variable strategy selector: `NEXT_PUBLIC_MENU_STRATEGY`
   - Graceful fallback to static menu on errors
   - `DynamicAdminLayoutShell`: Wrapper for dynamic menu rendering

## File Structure

```
src/
├── app/
│   ├── admin/
│   │   ├── layout.tsx                           # Updated with strategy selector
│   │   └── menu-builder/
│   │       └── page.tsx                          # Menu builder page
│   └── api/
│       └── menu-items/
│           ├── route.ts                          # List & create
│           ├── [id]/
│           │   ├── route.ts                      # Get, update, delete
│           │   └── access-check/
│           │       └── route.ts                  # Access verification
│           └── reorder/
│               └── route.ts                      # Reordering
├── components/
│   └── admin/
│       ├── DynamicSidebar.tsx                    # Dynamic sidebar component
│       ├── DynamicMenuItem.tsx                   # Individual menu item
│       ├── DynamicAdminLayoutShell.tsx           # Layout shell for dynamic menu
│       └── menu-builder/
│           ├── MenuBuilderUI.tsx                 # Main UI container
│           ├── MenuTree.tsx                      # Tree view with drag-drop
│           ├── MenuItemEditor.tsx                # Form editor
│           └── SidebarPreview.tsx                # Live preview
├── lib/
│   └── menu/
│       └── menuConverter.ts                      # Conversion utilities
├── services/
│   ├── MenuRenderingService.ts                   # Hierarchy transformation
│   ├── MenuManagementService.ts                  # CRUD operations
│   └── MenuAccessService.ts                      # Access control
└── models/
    └── menuItem.model.ts                         # MenuItem type definition

supabase/
└── migrations/
    └── 20251219091000_menu_system_enhancements.sql
```

## Key Features

### 1. Access Control Integration
- **RBAC**: Menu items can be restricted by role via `role_menu_items` table
- **Licensing**: Feature gating through `feature_key` column
- **Surface Bindings**: Integration with metadata system via `surface_id`
- **GateGuard**: Client-side access checks using existing AccessGate pattern

### 2. Hierarchical Menus
- Parent-child relationships via `parent_id`
- Nested rendering support (though current UI shows flat structure)
- Breadcrumb trail generation
- Descendant retrieval utilities

### 3. Visual Customization
- **Icons**: Configurable from predefined set
- **Badges**: Text and variant support (default, primary, success, warning, danger)
- **Sections**: Grouping into General, Community, Financial, Administration
- **Visibility**: Toggle menu items on/off

### 4. Drag-Drop Reordering
- Visual tree interface with drag handles
- Section-based grouping preserved
- Automatic sort order calculation
- Bulk update API endpoint

### 5. Live Preview
- Real-time preview of menu changes
- Scaled-down sidebar visualization
- Non-interactive preview mode
- Reflects visibility settings

## Usage

### Enabling Dynamic Menus

Add to `.env.local`:
```env
NEXT_PUBLIC_MENU_STRATEGY=dynamic
```

Default behavior (static menus) when not set or set to `static`.

### Accessing Menu Builder

1. Login as super admin
2. Navigate to `/admin/menu-builder`
3. Interface shows:
   - **Left**: Tree view of current menu structure
   - **Center**: Form editor when item selected
   - **Right**: Live preview of sidebar

### Creating Menu Items

1. Click "Add Item" button
2. Configure in editor:
   - **Basic**: Code, label, path, description
   - **Appearance**: Icon, section, badge
   - **Access Control**: Permissions, features, surface ID
   - **Visibility**: Show/hide toggle
3. Click "Save Changes"

### Managing Access

Menu items respect three levels of access control:

1. **Role Access**: Configured in `role_menu_items` (manual SQL or future UI)
2. **License Features**: Set `feature_key` to require specific license feature
3. **Surface Bindings**: Set `surface_id` to tie to metadata surface permissions

All three are evaluated via `MenuAccessService.checkAccess()`.

## API Endpoints

### GET /api/menu-items
```typescript
// Query params:
// - includeHidden: boolean (default: false)
// - includeSystem: boolean (default: false)
// - section: string (filter by section)
// - format: 'flat' | 'hierarchy' | 'sections' (default: 'flat')

Response: { success: true, data: MenuItem[], format: string }
```

### POST /api/menu-items
```typescript
// Super admin only
Body: CreateMenuItemInput
Response: { success: true, data: MenuItem }
```

### GET /api/menu-items/[id]
```typescript
Response: { success: true, data: MenuItem }
```

### PATCH /api/menu-items/[id]
```typescript
// Super admin only
Body: UpdateMenuItemInput
Response: { success: true, data: MenuItem }
```

### DELETE /api/menu-items/[id]
```typescript
// Super admin only
// Cannot delete system items or items with children
Response: { success: true, message: string }
```

### GET /api/menu-items/[id]/access-check
```typescript
// Client-side access verification
Response: AccessCheckResult { allowed: boolean, reason?: string }
```

### POST /api/menu-items/reorder
```typescript
// Super admin only
Body: { items: Array<{ id: string, sort_order: number }> }
Response: { success: true, message: string }
```

## Database Schema Highlights

```sql
-- Core menu items table
CREATE TABLE menu_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  parent_id UUID REFERENCES menu_items(id),
  code VARCHAR(100) NOT NULL,
  label VARCHAR(255) NOT NULL,
  path VARCHAR(500) NOT NULL,
  icon VARCHAR(50),
  sort_order INTEGER NOT NULL DEFAULT 10,
  is_system BOOLEAN NOT NULL DEFAULT FALSE,
  section VARCHAR(100),
  permission_key VARCHAR(255),
  feature_key VARCHAR(100),
  surface_id TEXT,                    -- Links to metadata surfaces
  badge_text VARCHAR(50),
  badge_variant VARCHAR(20),
  description TEXT,
  is_visible BOOLEAN NOT NULL DEFAULT TRUE,
  metadata JSONB DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  CONSTRAINT unique_menu_code_per_tenant UNIQUE (tenant_id, code, deleted_at)
);

-- Role-based menu access
CREATE TABLE role_menu_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  menu_item_id UUID NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_role_menu_item UNIQUE (role_id, menu_item_id)
);
```

## Security Considerations

### Super Admin Protection
- Menu builder page requires super_admin role (checked server-side)
- All mutating API endpoints protected with `Gate.superAdminOnly()`
- System menu items cannot be modified or deleted

### Access Control
- Client-side: `GateGuard` component prevents rendering unauthorized items
- Server-side: `MenuAccessService` validates all access checks
- Tenant isolation enforced at database level

### Validation
- Unique code constraint per tenant
- Circular parent reference prevention
- Cannot delete items with children
- Path and label required fields

## Migration from Static to Dynamic

### Step 1: Create Menu Items
Use SQL to seed initial menu items matching static structure:

```sql
-- Example: Create Overview menu item
INSERT INTO menu_items (tenant_id, code, label, path, icon, sort_order, section, permission_key)
VALUES (
  'your-tenant-id',
  'admin_overview',
  'Overview',
  '/admin',
  'dashboard',
  10,
  'General',
  'admin:read'
);
```

### Step 2: Assign Role Access
```sql
-- Grant access to specific roles
INSERT INTO role_menu_items (role_id, menu_item_id)
SELECT r.id, m.id
FROM roles r, menu_items m
WHERE r.code IN ('super_admin', 'tenant_admin')
  AND m.code = 'admin_overview';
```

### Step 3: Enable Dynamic Strategy
```env
NEXT_PUBLIC_MENU_STRATEGY=dynamic
```

### Step 4: Verify
- All menu items appear in `/admin/menu-builder`
- Sidebar renders correctly
- Access control works as expected

## Testing Checklist

- [ ] Static menu renders correctly (default)
- [ ] Dynamic menu renders when enabled
- [ ] Fallback to static on dynamic menu error
- [ ] Menu builder page accessible to super admin only
- [ ] Non-super admin gets 401/403 on menu builder
- [ ] Creating menu items works
- [ ] Updating menu items works
- [ ] Deleting menu items works (except system items)
- [ ] Cannot delete items with children
- [ ] Drag-drop reordering persists
- [ ] Access checks respect role assignments
- [ ] Access checks respect feature keys
- [ ] Access checks respect surface bindings
- [ ] Badge variants display correctly
- [ ] Icon selection works
- [ ] Section grouping works
- [ ] Hidden items don't appear in sidebar
- [ ] Live preview updates on changes
- [ ] Mobile sidebar works with dynamic menu

## Future Enhancements

1. **UI for Role Assignment**: Currently requires SQL
2. **Nested Menu Rendering**: Display child items in tree
3. **Bulk Operations**: Select multiple items for batch actions
4. **Menu Templates**: Predefined menu structures
5. **Version History**: Audit trail of menu changes
6. **Import/Export**: JSON import/export for menu structure
7. **Search/Filter**: Find menu items in large structures
8. **Analytics**: Track menu item usage
9. **A/B Testing**: Test different menu structures
10. **Customization Per User**: Allow users to personalize menu

## Dependencies

- Existing RBAC system (roles, permissions, user_roles)
- Licensing system (licenses, license_features, tenant_feature_grants)
- Metadata system (metadata_surfaces, surface_bindings)
- AccessGate pattern (lib/access-gate)
- DI container (Inversify)
- Supabase client

## Performance Considerations

- Menu items cached at layout level (per-request)
- Access checks batched where possible
- Hierarchical transformation done server-side
- Client-side GateGuard makes one API call per item (could be optimized)
- Consider implementing menu cache with revalidation strategy

## Troubleshooting

### Menu items not appearing
1. Check `is_visible` is true
2. Verify role access in `role_menu_items`
3. Check feature key is granted to tenant
4. Verify surface binding permissions

### Drag-drop not saving
1. Ensure super admin role
2. Check browser console for API errors
3. Verify items are in same section

### Access checks failing
1. Check `MenuAccessService` logs
2. Verify user has required roles
3. Check license features are active
4. Validate surface binding configuration

### Fallback to static menu
1. Check `NEXT_PUBLIC_MENU_STRATEGY` environment variable
2. Verify database migration applied
3. Check server logs for errors
4. Ensure DI container has menu services registered

## Support

For issues or questions:
1. Check server logs for detailed error messages
2. Verify database schema matches migration
3. Ensure all environment variables are set
4. Test with static menu first to isolate issues

## Conclusion

The dynamic menu system provides a flexible, extensible foundation for menu management while maintaining the existing UI/UX. The phased implementation ensures each component can be tested independently, and the strategy selector allows for gradual rollout with easy rollback.
