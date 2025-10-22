# RBAC Documentation Index

**Last Updated:** 2025-10-22
**Current Architecture:** Features → Permissions → Roles (3-layer simplified model)

## Quick Start

For a quick overview of the RBAC system, start here:
- **Project Instructions:** [`CLAUDE.md`](../CLAUDE.md) - Main project reference with RBAC section
- **Completion Summary:** [`SURFACE_ELIMINATION_COMPLETE.md`](SURFACE_ELIMINATION_COMPLETE.md) - Recent architecture changes

## Core Documentation

### Architecture

1. **[RBAC Architecture Plan](architecture/rbac-architecture-plan.md)**
   - Original architecture planning (updated with current status notes)
   - Historical context for the evolution of the RBAC system
   - Implementation phases (some superseded by simplification)

### API Documentation

2. **[Feature Permissions API](api/FEATURE_PERMISSIONS_API.md)**
   - API endpoints for managing features and permissions
   - Feature creation and permission assignment workflows
   - Current and accurate documentation

### Testing

3. **[RBAC Testing Guide](TESTING_GUIDE_LICENSING_RBAC.md)**
   - Testing procedures for RBAC and licensing integration
   - Test scenarios and validation steps

### User Guides

4. **[Feature Creation to RBAC Integration Guide](user-manual/feature-management/Feature_Creation_to_RBAC_Integration_Guide.md)**
   - End-to-end guide for creating features and assigning permissions
   - Workflow documentation for administrators

### User Stories

5. **[RBAC UI User Stories](user-stories/rbac-ui-user-stories.md)**
   - User experience requirements
   - UI/UX specifications for RBAC management

6. **[RBAC Incremental User Stories](user-stories/rbac-incremental-user-stories.md)**
   - Phased development stories
   - Feature rollout planning

## Current Architecture Overview

### Database Tables (Core)

- **`roles`** - Role definitions (tenant-scoped and system-scoped)
- **`permissions`** - Granular access rights (e.g., `members:read`, `finance:write`)
- **`user_roles`** - Many-to-many user-role assignments
- **`permission_bundles`** - Reusable permission groups
- **`permission_bundle_permissions`** - Bundle membership
- **`feature_catalog`** - Available features with metadata
- **`feature_permissions`** - Direct feature-to-permission mappings ✨ **KEY TABLE**
- **`tenant_feature_grants`** - License-based feature access per tenant
- **`delegations`** - Temporary role assignments

### Key Services

- **`RbacCoreService.ts`** - Core role/permission operations
- **`RbacFeatureService.ts`** - Feature flag grants and license feature management
- **`RbacDelegationService.ts`** - Delegation workflows
- **`RbacPublishingService.ts`** - Compile/publish RBAC state changes
- **`UserRoleService.ts`** - User role management and permission checking
- **`LicensingService.ts`** - License validation and feature grants

### Permission Checking Flow

```
1. User requests access to feature
2. System checks user roles via UserRoleService
3. Roles provide permissions via RbacCoreService
4. Feature requires specific permissions (via feature_permissions table)
5. System checks if user has required permissions
6. License validation confirms feature is granted to tenant
7. Access granted or denied
```

## What Changed (Surface Elimination)

### Removed Architecture Components

**Dropped Tables:**
- ❌ `metadata_surfaces` - UI surface definitions
- ❌ `rbac_surface_bindings` - Role/surface associations
- ❌ `surface_id`, `surface_type`, `module` columns from `feature_catalog`

**Removed Services:**
- ❌ `RbacMetadataService` - Surface binding management

**Removed API Endpoints:**
- ❌ `/api/rbac/check-access` - Surface access checks
- ❌ `/api/licensing/surface-bindings` - Surface binding management

### New Simplified Flow

**Before (6 layers):**
```
Feature → Surface → Surface Binding → Bundle → Permission → Role
```

**After (3 layers):**
```
Feature → Permission → Role
```

## Migration from Old Architecture

If you're working with code that references the old architecture:

1. **Replace surface checks** with direct feature permission checks
2. **Use `feature_permissions` table** instead of `rbac_surface_bindings`
3. **Remove surface_id references** from feature creation workflows
4. **Update access control logic** to check permissions directly

See [`SURFACE_ELIMINATION_COMPLETE.md`](SURFACE_ELIMINATION_COMPLETE.md) for detailed migration guidance.

## Archived Documentation

Obsolete documentation has been moved to:
- **[`docs/archive/pre-surface-elimination/`](archive/pre-surface-elimination/README.md)**

These documents describe the old surface-based architecture and should not be used for current development.

## Related Documentation

### General Project Documentation
- **[README.md](../README.md)** - Project overview
- **[CLAUDE.md](../CLAUDE.md)** - AI assistant instructions (includes RBAC section)

### Implementation Summaries
- **[Phase 1 Completion](../PHASE_1_IMPLEMENTATION_COMPLETE.md)**
- **[Phase 1 Verification](../PHASE_1_VERIFICATION.md)**
- **[Implementation Complete Summary](IMPLEMENTATION_COMPLETE_SUMMARY.md)**

### Refactoring Documentation
- **[Refactoring Plan: Eliminate Metadata Surfaces](refactoring-eliminate-metadata-surfaces.md)**
- **[Refactoring Status](refactoring-status-metadata-surfaces.md)**
- **[Surface Elimination Complete](SURFACE_ELIMINATION_COMPLETE.md)** ⭐ **Latest**

## Contributing to RBAC Documentation

When updating RBAC documentation:

1. **Update this index** if adding new documentation
2. **Mark outdated sections** with update notices
3. **Archive obsolete docs** instead of deleting them
4. **Reference the current architecture** (3-layer model)
5. **Avoid referencing** surfaces, surface bindings, or metadata surfaces

## Support

For questions about the RBAC system:
- Review the [RBAC section in CLAUDE.md](../CLAUDE.md#rbac-system)
- Check the [Surface Elimination Complete summary](SURFACE_ELIMINATION_COMPLETE.md)
- Review service source code in `src/services/Rbac*.ts`

---

**Note:** This documentation index reflects the current simplified architecture. Historical architecture information is available in the archive folder.
