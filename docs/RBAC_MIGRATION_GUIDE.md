# RBAC Simplification Migration Guide

## Overview

The RBAC system has been simplified from a 3-layer architecture to a cleaner 2-layer model. This guide helps you understand the changes and how they affect your existing setup.

## What Changed

### Architecture Simplification

**Before (3-layer):**
```
Features → Permissions → Bundles → Roles → Users
```

**After (2-layer):**
```
Features → Permissions → Roles → Users
```

### Key Changes

1. **Permission Bundles Removed**
   - RBAC permission bundles have been eliminated
   - Permissions are now directly assigned to roles
   - All existing bundle-permission mappings were automatically migrated to direct role-permission assignments

2. **License Feature Bundles Preserved**
   - License Studio feature bundles remain unchanged
   - These are for pricing tiers (Essential, Professional, Enterprise, Premium)
   - Managed at `/admin/licensing` (NOT affected by RBAC changes)

3. **Delegation Simplified**
   - Delegation permissions management UI removed
   - Delegation templates removed
   - **New Model:** Delegation = Role + Scope + Time Limit
   - Delegate complete roles only (no granular permission selection)

4. **Dashboard Simplified**
   - "Implementation Phases" tab removed
   - Quick Actions reorganized into "Core Actions" and "Advanced Features"
   - Bundle statistics removed from dashboard

5. **New Role Creation Wizard**
   - 4-step wizard for creating roles
   - Direct permission assignment (no bundles)
   - Optional user linking
   - Review & create workflow

## Database Changes

### Tables Dropped

The following RBAC bundle tables were dropped in migrations:

- `permission_bundles` - RBAC permission groupings (no longer needed)
- `permission_bundle_permissions` - Bundle-to-permission mappings
- `role_bundle_assignments` - Role-to-bundle mappings
- `role_bundles` - Additional bundle table
- `bundle_permissions` - Additional permission table

**Note:** License feature bundle tables remain untouched:
- `license_feature_bundles` ✅ Still exists
- `license_feature_bundle_features` ✅ Still exists

### Migration Applied

Migrations automatically:
1. Flattened all bundle permissions into direct role-permission assignments
2. Dropped bundle tables using CASCADE
3. No data loss - all permissions preserved

## UI Changes

### Removed Pages/Features

- `/admin/rbac/delegation-permissions` - Delegation permission management page
- Bundle management UI (was never fully implemented)
- Complex delegation templates

### Updated Pages

1. **RBAC Dashboard** (`/admin/security/rbac`)
   - Now has 4 tabs (was 5): Overview, Recent Activity, User Management, Quick Actions
   - Quick Actions split into Core and Advanced sections
   - Bundle statistics removed

2. **Quick Actions - Core**
   - Create Role (opens wizard)
   - Manage Permissions
   - Audit Logs
   - Export Data

3. **Quick Actions - Advanced**
   - Multi-Role Assignment
   - Delegated Console
   - Delegate Access

### New Features

1. **Role Creation Wizard**
   - Access via Quick Actions → Create Role
   - Step 1: Basic Info (name, description, scope, delegatable)
   - Step 2: Assign Permissions (search, filter, select)
   - Step 3: Link Users (optional)
   - Step 4: Review & Create

## API Changes

### Removed Endpoints

- `/api/rbac/bundles` - Bundle CRUD operations
- `/api/rbac/bundles/[id]` - Individual bundle operations
- `/api/rbac/delegation/permissions` - Delegation permission management
- `/api/rbac/delegation/permissions/[id]` - Individual delegation permission
- `/api/rbac/delegation/templates` - Delegation templates

### Preserved Endpoints

All core RBAC endpoints remain:
- `/api/rbac/roles` ✅
- `/api/rbac/roles/[id]` ✅
- `/api/rbac/permissions` ✅
- `/api/rbac/users` ✅
- `/api/rbac/users/[userId]/roles` ✅
- `/api/rbac/delegation/assign-role` ✅
- `/api/rbac/delegation/revoke-role` ✅
- `/api/rbac/multi-role/*` ✅

## Code Changes

### Services Updated

1. **RbacCoreService.ts**
   - Removed bundle methods (~150 lines):
     - `createPermissionBundle()`
     - `updatePermissionBundle()`
     - `deletePermissionBundle()`
     - `getBundleWithPermissions()`
     - `addPermissionsToBundle()`
     - etc.

2. **RbacStatisticsService.ts**
   - Removed `getBundleStatistics()`
   - Updated `getDashboardStatistics()` - removed bundle counts

3. **rbac.service.ts**
   - Removed bundle management methods
   - Simplified to role-based operations only

### Types/Models Removed

From `src/models/rbac.model.ts`:
- `PermissionBundle` interface
- `RoleBundle` interface
- `BundlePermission` interface
- `CreatePermissionBundleDto` interface
- `UpdatePermissionBundleDto` interface
- `BundleWithPermissions` interface

Updated interfaces:
- `RoleWithPermissions` - removed `bundles` array
- `DelegatedContext` - removed `allowed_bundles`
- `MultiRoleContext` - removed `bundle_keys`

### DI Container Updated

Removed from `src/lib/container.ts`:
- `IPermissionBundleRepository` binding
- `IPermissionBundleAdapter` binding

## Migration Checklist

### For Existing Installations

✅ **Automatic (No Action Required):**
- Bundle permissions migrated to role permissions
- Database tables dropped safely
- All user permissions preserved

⚠️ **Review Recommended:**
1. Check role permissions in dashboard
2. Verify users still have correct access
3. Test delegation workflows
4. Review custom roles

### For Developers

✅ **Code Review:**
1. Remove any bundle-related imports
2. Update service calls to use direct role-permission APIs
3. Remove bundle references from custom code

⚠️ **Testing:**
1. Test role creation via new wizard
2. Verify permission assignments work
3. Test delegation with new simplified model
4. Verify multi-role functionality

## Rollback Plan

If you need to rollback (not recommended):

1. **Database:** Migrations are one-way - no rollback migration provided
2. **Code:** Check out previous git tag before simplification
3. **Alternative:** Contact support for assistance

**Recommendation:** The simplified architecture is more maintainable. Test thoroughly instead of rolling back.

## Support

### Common Issues

**Q: Where did my permission bundles go?**
A: They were flattened into direct role-permission assignments. Check role permissions in the dashboard.

**Q: Can I still group permissions?**
A: Yes, by creating roles. A role can have any set of permissions you need.

**Q: What about License Feature Bundles?**
A: Those are completely separate and unchanged. License Studio works exactly the same.

**Q: How do I create roles now?**
A: Use the new 4-step wizard: Dashboard → Quick Actions → Create Role

**Q: Can users still have multiple roles?**
A: Yes! Multi-role assignment is preserved and works better without bundle complexity.

### Getting Help

- Check RBAC Dashboard help guide (click "Help Guide" button)
- Review updated CLAUDE.md documentation
- Check RBAC_DOCUMENTATION_INDEX.md for all docs

## Benefits of Simplification

1. **Easier to Understand**
   - 2 layers instead of 3
   - Direct permission-to-role mapping
   - Simpler mental model

2. **Faster Role Creation**
   - Single wizard workflow
   - No bundle configuration needed
   - Immediate permission assignment

3. **Better Performance**
   - Fewer database joins
   - Simpler queries
   - Faster permission checks

4. **Easier Maintenance**
   - Less code to maintain (~800 lines removed)
   - Fewer moving parts
   - Clearer architecture

5. **More Intuitive Delegation**
   - Delegate complete roles (not custom permission sets)
   - Role + Scope + Time Limit model
   - Easier to understand and audit

## Version History

- **v1.0 (October 2025):** RBAC Simplification completed
  - Bundles removed
  - Wizard implemented
  - Delegation simplified
  - Dashboard streamlined

---

**Migration Status:** ✅ Complete
**Backward Compatible:** Yes (automatic migration)
**Data Loss:** None
**Action Required:** Review and test
