# Archived Documentation - Pre-Surface Elimination

**Archive Date:** 2025-10-22
**Reason:** These documents describe the RBAC architecture with surface bindings, which has been eliminated.

## Context

These documents were archived following the completion of the **Surface Elimination Refactoring** project. The RBAC system was simplified from a 6-layer architecture to a 3-layer architecture:

**Old Architecture (Described in these docs):**
```
Features → Surfaces → Surface Bindings → Bundles → Permissions → Roles
```

**New Architecture (Current):**
```
Features → Permissions → Roles
```

## Archived Files

1. **rbac-ui-implementation-plan.md** - UI implementation plan based on surface bindings
2. **licensing-rbac-integration-plan.md** - Integration plan using surface-based access control
3. **rbac-licensing-integration-status.md** - Status report referencing surface bindings
4. **licensing-rbac-integration-analysis.md** - Analysis document with surface architecture
5. **implementation-progress-licensing-rbac-integration.md** - Progress tracking with surface references

## Current Documentation

For up-to-date RBAC documentation, see:

- **Architecture:** [`docs/architecture/rbac-architecture-plan.md`](../../architecture/rbac-architecture-plan.md) (updated with current architecture notes)
- **Completion Summary:** [`docs/SURFACE_ELIMINATION_COMPLETE.md`](../../SURFACE_ELIMINATION_COMPLETE.md)
- **Refactoring Plan:** [`docs/refactoring-eliminate-metadata-surfaces.md`](../../refactoring-eliminate-metadata-surfaces.md)
- **Project Instructions:** [`CLAUDE.md`](../../../CLAUDE.md) (main project reference)

## Why These Were Archived

These documents contain extensive references to:
- `rbac_surface_bindings` table (dropped)
- `metadata_surfaces` table (dropped)
- Surface-based access control patterns (eliminated)
- UI implementations that relied on surface mappings (refactored)

The information is preserved here for historical reference but should not be used for current development.

## Migration Notes

If you need to understand the evolution of the RBAC system:

1. Start with the archived files to understand the original design
2. Read [`docs/refactoring-eliminate-metadata-surfaces.md`](../../refactoring-eliminate-metadata-surfaces.md) to understand the refactoring rationale
3. Review [`docs/SURFACE_ELIMINATION_COMPLETE.md`](../../SURFACE_ELIMINATION_COMPLETE.md) for the complete list of changes
4. Reference [`CLAUDE.md`](../../../CLAUDE.md) for current system architecture

---

**Do not use these documents for current development** - they describe an obsolete architecture.
