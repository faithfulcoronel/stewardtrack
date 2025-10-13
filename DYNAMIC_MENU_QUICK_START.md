# Dynamic Menu System - Quick Start Guide

## Enable Dynamic Menus

Add to your `.env.local`:
```env
NEXT_PUBLIC_MENU_STRATEGY=dynamic
```

Restart your dev server.

## Access Menu Builder

1. Login as a user with `super_admin` role
2. Navigate to: **`http://localhost:3000/admin/menu-builder`**
3. You'll see a three-panel interface:
   - **Left**: Tree of existing menu items
   - **Center**: Editor for selected item
   - **Right**: Live preview of sidebar

## Create Your First Menu Item

### Via UI (Recommended)

1. Click **"Add Item"** button in menu builder
2. Fill in the editor:
   ```
   Code: my_custom_page
   Label: My Custom Page
   Path: /admin/my-custom-page
   Icon: dashboard (or any from dropdown)
   Section: General
   Permission Key: (leave empty for now)
   Visible: ON
   ```
3. Click **"Save Changes"**
4. See it appear in the preview on the right

### Via SQL (For Bulk Setup)

```sql
-- Insert a menu item
INSERT INTO menu_items (
  tenant_id,
  code,
  label,
  path,
  icon,
  sort_order,
  section,
  permission_key,
  is_visible
) VALUES (
  'YOUR_TENANT_ID',  -- Replace with actual tenant ID
  'admin_dashboard',
  'Dashboard',
  '/admin',
  'dashboard',
  10,
  'General',
  'admin:read',
  true
);

-- Grant access to roles
INSERT INTO role_menu_items (role_id, menu_item_id)
SELECT r.id, m.id
FROM roles r
CROSS JOIN menu_items m
WHERE r.code IN ('super_admin', 'tenant_admin', 'staff')
  AND m.code = 'admin_dashboard'
  AND r.tenant_id = m.tenant_id;
```

## Access Control Levels

Menu items have three layers of access control (all are optional):

### 1. Role-Based Access (Most Common)
```sql
-- Only users with specific roles can see the menu item
INSERT INTO role_menu_items (role_id, menu_item_id)
VALUES ('role-uuid', 'menu-item-uuid');
```

In UI: Not yet implemented - use SQL for now.

### 2. License Feature Gating
Set `feature_key` field to require a specific license feature:
```
feature_key: advanced_reporting
```

Users without this feature in their license won't see the item.

### 3. Surface Binding (Metadata Integration)
Set `surface_id` field to tie menu item to a metadata surface:
```
surface_id: finance_dashboard_surface
```

Uses existing RBAC surface bindings for permission checks.

## Reorder Menu Items

1. In menu builder, hover over any item in the tree
2. Drag the grip icon (appears on hover)
3. Drop on another item to reorder
4. Changes save automatically

## Organize by Section

Menu items are grouped into sections. Available sections:
- **General**: Dashboard, announcements, support, etc.
- **Community**: Members, groups, communications
- **Financial**: Finances, expenses, reports
- **Administration**: Settings, security, RBAC

Select section in the dropdown when editing a menu item.

## Add Badges

Make menu items stand out with badges:

1. Set **Badge Text**: "New", "Beta", "3", etc.
2. Set **Badge Variant**:
   - `default`: White badge (default)
   - `primary`: Blue badge
   - `success`: Green badge
   - `warning`: Yellow badge
   - `danger`: Red badge

## Hide Menu Items

Toggle **Visible** switch to hide items without deleting them.
Hidden items don't appear in the sidebar but are visible in the menu builder.

## System Menu Items

Items with `is_system = true` cannot be deleted or have code/path changed.
Create system items via migration for critical navigation.

## API Usage

### Get All Menu Items
```typescript
const response = await fetch('/api/menu-items');
const { data: menuItems } = await response.json();
```

### Get Hierarchical Structure
```typescript
const response = await fetch('/api/menu-items?format=hierarchy');
const { data: hierarchy } = await response.json();
```

### Check Access to Menu Item
```typescript
const response = await fetch(`/api/menu-items/${itemId}/access-check`);
const { allowed, reason } = await response.json();
```

### Create Menu Item (Super Admin Only)
```typescript
const response = await fetch('/api/menu-items', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    code: 'my_item',
    label: 'My Item',
    path: '/admin/my-item',
    icon: 'dashboard',
    section: 'General',
    is_visible: true,
  }),
});
```

## Common Patterns

### Creating a Protected Admin Page

1. **Create the menu item** in menu builder
2. **Set permission_key**: `my_feature:admin`
3. **Assign to roles** via SQL:
   ```sql
   INSERT INTO role_menu_items (role_id, menu_item_id)
   SELECT r.id, m.id FROM roles r, menu_items m
   WHERE r.code = 'super_admin' AND m.code = 'my_custom_page';
   ```

### Creating a Feature-Gated Menu Item

1. **Create the menu item**
2. **Set feature_key**: `premium_analytics`
3. Only tenants with that feature granted will see it

### Creating Nested Menu Items

1. Create parent item first
2. When creating child item, set **Parent ID** dropdown to parent
3. Child items inherit parent's section

Note: Current UI renders flat structure. Nested rendering coming soon.

## Troubleshooting

### "Menu item not appearing in sidebar"
- Check **Visible** is ON
- Verify role access in `role_menu_items` table
- Check license feature is granted (if `feature_key` set)
- Look for surface binding permissions (if `surface_id` set)

### "Cannot delete menu item"
- System items cannot be deleted
- Items with children must have children deleted first

### "Access check failing"
- Verify user has required role
- Check feature is granted to tenant
- Validate surface permissions

### "Menu builder not loading"
- Verify you have `super_admin` role
- Check browser console for errors
- Verify database migration applied

## Rollback to Static Menu

If you need to revert to the static menu system:

1. Remove or set to `static`:
   ```env
   NEXT_PUBLIC_MENU_STRATEGY=static
   ```
2. Restart dev server
3. Static menu will be used immediately

The system gracefully falls back to static on any errors with dynamic menus.

## Next Steps

1. **Seed your initial menu** - Use SQL or UI to create basic structure
2. **Set up role access** - Grant menu items to appropriate roles
3. **Test access control** - Login as different roles to verify
4. **Customize appearance** - Add badges, reorder, organize sections
5. **Monitor usage** - Watch for items users access most

## File Locations

- **Menu Builder Page**: `src/app/admin/menu-builder/page.tsx`
- **API Routes**: `src/app/api/menu-items/`
- **Services**: `src/services/Menu*.ts`
- **Components**: `src/components/admin/menu-builder/`
- **Migration**: `supabase/migrations/20251219091000_menu_system_enhancements.sql`

## Need Help?

1. Check full implementation guide: `DYNAMIC_MENU_IMPLEMENTATION.md`
2. Review service code for detailed logic
3. Check database schema in migration file
4. Test with static menu first to isolate issues
