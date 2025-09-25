# RBAC Architecture Research and Implementation Plan

## 1. Current-State Findings

### 1.1 Database and Security Model
- Core RBAC tables (`roles`, `permissions`, `user_roles`, `role_permissions`) are tenant scoped and enforce row-level security via `check_tenant_access`, but optional inheritance is still handled through a minimal `role_groups` table without broader orchestration.【F:supabase/migrations/20250730000000_dynamic_rbac.sql†L9-L77】
- The `can_user` helper infers the active tenant by selecting the caller’s first `tenant_users` record, meaning multi-tenant users get permissions for an arbitrary congregation if no tenant parameter is supplied.【F:supabase/migrations/20250730000000_dynamic_rbac.sql†L87-L116】
- Navigation, licensing, and permission data each maintain tenant isolation, with menu items and license features RLS-protected and seeded per congregation for consistency across tenants.【F:supabase/migrations/20250801000000_menu_license_system.sql†L8-L200】
- Roles are mapped to menu items through `role_menu_items`, creating a direct binding between RBAC and navigation; the table is populated from existing role and menu permission links to prevent drift.【F:supabase/migrations/20250815000000_role_menu_items.sql†L1-L43】
- Permission aggregation for API consumers is exposed through `get_user_roles_with_permissions`, which now stitches role → menu → permission relationships and grants access to administrators or anyone with the `user.view` permission.【F:supabase/migrations/20250819000000_update_get_user_roles.sql†L1-L62】

### 1.2 License and Feature Controls
- Menu entries, menu permissions, licenses, and license features all include `tenant_id` columns with `check_tenant_access` policies, but there is no explicit binding between feature entitlements and RBAC decisions—menu visibility depends on role links alone.【F:supabase/migrations/20250801000000_menu_license_system.sql†L31-L144】【F:supabase/migrations/20250815000000_role_menu_items.sql†L33-L43】

### 1.3 Application Adapters and Services
- `UserRoleAdapter` delegates Supabase RPCs for role queries but still invokes `can_user` without a tenant argument, mirroring the database limitation. It also exposes helper calls for admin detection and bulk role replacement per tenant.【F:src/adapters/userRole.adapter.ts†L9-L174】
- `UserRoleService` fetches tenant context via `tenantUtils`, aggregates permissions from the RPC response, and short-circuits when no tenant is present, yet `canUser` forwards calls directly to the adapter without reinforcing tenant specificity.【F:src/services/UserRoleService.ts†L17-L110】

### 1.4 Metadata Runtime Integration
- The metadata evaluator accepts only a single role string in its context; `<RBAC>` directives check that lone value, so users with multiple roles rely on whichever role the runtime selects, limiting expressiveness for overlay composition.【F:src/lib/metadata/evaluation.ts†L9-L177】
- Authoring guidance already treats RBAC as a declarative metadata concern, requiring overlays and components to align with canonical identifiers, but there is no registry translating database role IDs to metadata-friendly keys.【F:docs/metadata-architecture.md†L1-L104】

## 2. Target Architecture Overview
1. **Scoped permission vocabulary** – Elevate roles and permissions with explicit `scope` metadata (`system`, `tenant`, `delegated`) and introduce reusable `permission_actions` + `permission_bundles` to standardize capability definitions across congregations.
2. **Deterministic tenant resolution** – Replace the implicit `can_user(text)` signature with a tenant-aware variant and companion helpers/materialized views so Supabase policies and services can perform fast, explicit lookups.
3. **Unified surface bindings** – Consolidate navigation and metadata associations into a single `rbac_surface_bindings` table, enabling shared keys between database roles, menu items, and metadata overlay identifiers.
4. **License-aware gating** – Bind license features directly to permission bundles or surface bindings so unlicensed capabilities never appear, even if RBAC grants are present.
5. **Metadata alignment** – Extend the runtime to evaluate RBAC against arrays of role/bundle keys and maintain a registry that maps database identifiers to metadata tokens.
6. **Operational rigor** – Provide migration scripts, refresh triggers, and audit hooks that keep materialized views current and ensure RBAC changes trigger metadata recompilation and monitoring.

## 3. Step-by-Step Implementation Plan

### Phase 1 – Discovery and Data Inventory
1. Extract current role, permission, menu, and license datasets to understand tenant-specific customizations and identify any orphaned references across `role_permissions`, `role_menu_items`, and metadata overlays.【F:supabase/migrations/20250730000000_dynamic_rbac.sql†L32-L117】【F:supabase/migrations/20250815000000_role_menu_items.sql†L1-L43】
2. Catalogue metadata `<RBAC>` usage and existing role identifiers to plan the mapping between database role IDs and metadata keys.【F:src/lib/metadata/evaluation.ts†L9-L177】【F:docs/metadata-architecture.md†L1-L104】

### Phase 2 – Database Foundations
3. Author migrations that add `scope` columns to RBAC tables, create `permission_actions` and `permission_bundles`, and replace `role_groups` with a normalized hierarchy that supports inheritance without duplicating permissions.【F:supabase/migrations/20250730000000_dynamic_rbac.sql†L36-L77】
4. Introduce a tenant-aware `can_user(required_permission text, tenant_id uuid)` signature plus a `current_tenant()` helper. Refactor row-level security and stored procedures to reference the explicit tenant parameter instead of implicit selection.【F:supabase/migrations/20250730000000_dynamic_rbac.sql†L87-L116】
5. Build a `tenant_user_effective_permissions` materialized view that expands roles, bundles, and direct grants into flattened permission sets keyed by `(tenant_id, user_id)` to accelerate authorization checks.

### Phase 3 – Surface Binding and License Alignment
6. Replace `role_menu_items` with `rbac_surface_bindings`, capturing associations between roles/bundles, menu items, metadata page IDs, and optional feature codes; migrate existing role-menu data into the new table.【F:supabase/migrations/20250815000000_role_menu_items.sql†L1-L43】
7. Extend menu and metadata schemas with `feature_code` references, and create linking tables or view logic that require both RBAC permission and license availability before surfacing navigation elements.【F:supabase/migrations/20250801000000_menu_license_system.sql†L31-L144】

### Phase 4 – Application and Metadata Layer Updates
8. Update `UserRoleAdapter`, repositories, and services so `canUser` and related queries always pass an explicit tenant ID and read from the effective-permission view. Add caching where appropriate to minimize round trips.【F:src/adapters/userRole.adapter.ts†L9-L174】【F:src/services/UserRoleService.ts†L17-L110】
9. Implement a role/bundle registry that maps database identifiers to metadata tokens, and update the metadata evaluation context to accept an array of keys, adjusting `<RBAC>` checks accordingly.【F:src/lib/metadata/evaluation.ts†L9-L177】
10. Recompile metadata overlays with the new identifiers and verify navigation/menu bindings resolve through `rbac_surface_bindings` rather than legacy tables.【F:docs/metadata-architecture.md†L1-L104】

### Phase 5 – License Enforcement and Automation
11. Wire license checks into Supabase views or policies that feed navigation data so only tenants with the correct feature entitlements see bound menu items and metadata overlays.【F:supabase/migrations/20250801000000_menu_license_system.sql†L91-L144】
12. Create triggers or Supabase functions that refresh the effective-permission materialized view whenever roles, bundles, or license bindings change.
13. Add audit logging and monitoring (e.g., Supabase triggers, observability dashboards) to detect orphaned bindings or mismatched license states.

### Phase 6 – Migration, Testing, and Rollout
14. Develop backfill scripts that translate current role/permission assignments into bundles and surface bindings while preserving tenant isolation; validate results tenant-by-tenant against pre-migration exports.【F:supabase/migrations/20250730000000_dynamic_rbac.sql†L9-L117】【F:supabase/migrations/20250815000000_role_menu_items.sql†L33-L43】
15. Expand automated tests: unit tests for new database functions, integration tests for service adapters, and metadata compilation tests covering multi-role evaluation paths.【F:src/services/UserRoleService.ts†L17-L110】【F:src/lib/metadata/evaluation.ts†L9-L177】
16. Roll out behind feature flags, enabling the new pipeline for pilot tenants, monitoring performance and audit logs before enabling globally.

Following these steps will deliver tenant-explicit authorization, align Supabase enforcement with the metadata runtime, and ensure licensing rules suppress unentitled surfaces across the SaaS experience.
