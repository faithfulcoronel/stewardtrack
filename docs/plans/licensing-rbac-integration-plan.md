# Licensing, RBAC, and Tenant Onboarding Research & Implementation Plan

## 1. Research Synthesis

### 1.1 RBAC data + service architecture
- RBAC tables (roles, permissions, user_roles, role_permissions, role_groups) are tenant-scoped with `check_tenant_access` RLS and retain the legacy `can_user(text)` helper, which infers tenant context from the first tenant record and risks ambiguity for multi-tenant users.【F:supabase/migrations/20250730000000_dynamic_rbac.sql†L1-L119】
- The RBAC implementation plan already targets explicit tenant-aware helpers, effective-permission materialized views, and consolidated surface bindings that tie roles, menu items, metadata overlays, and license feature codes together.【F:docs/rbac/rbac-architecture-plan.md†L23-L58】
- `UserRoleAdapter` and `UserRoleService` mirror the database behavior: adapters call Supabase RPCs for permission checks and metadata keys, while services resolve tenant context and aggregate permissions but still depend on adapter-level tenant defaults, reinforcing the need for deterministic tenant parameters.【F:src/adapters/userRole.adapter.ts†L9-L313】【F:src/services/UserRoleService.ts†L1-L164】

### 1.2 Licensing and menu feature controls
- Menu items, menu permissions, licenses, and license features are all tenant-isolated tables with RLS, seeded global defaults, and helper functions to clone baseline navigation per tenant. However, license entitlements are not yet enforced in RBAC lookups, leaving menu exposure dependent on role bindings alone.【F:supabase/migrations/20250801000000_menu_license_system.sql†L1-L200】【F:docs/rbac/rbac-architecture-plan.md†L12-L44】
- License services and repositories already resolve active feature grants per tenant and power sidebar filtering, giving us reusable data sources for product statistics and license gating experiences.【F:src/services/LicenseFeatureService.ts†L1-L64】【F:src/services/SidebarService.ts†L24-L55】

### 1.3 Metadata runtime and surface management
- The metadata runtime supports layered blueprints/overlays, RBAC directives, and multi-role evaluation context, making it the natural place to align license + RBAC gating when bindings become metadata-aware.【F:docs/architecture/metadata-architecture.md†L1-L56】【F:src/lib/metadata/evaluation.ts†L9-L200】
- Admin RBAC tooling already surfaces binding dashboards that count role, bundle, and feature associations, providing a UI scaffold for a licensing studio and tenant-level analytics once real data is wired in.【F:src/components/admin/rbac/SurfaceBindingManager.tsx†L400-L520】

### 1.4 Auth and onboarding entry points
- Sign-in flows resolve tenant context via Supabase metadata or RPC, writing tenant sessions for subsequent RBAC calls—ideal for auto-promoting newly provisioned tenant admins during onboarding.【F:src/lib/auth/actions.ts†L1-L70】
- CLAUDE engineering guidelines enforce the three-layer architecture (service → repository → adapter) and emphasize tenant filtering, DI registration, and metadata alignment, which our plan must follow across all increments.【F:CLAUDE_AI_GUIDELINES.md†L17-L200】

## 2. Product Experience Goals

1. **Developer configurability** – Manage licensing schemas, associate RBAC features/pages, and expose APIs/UI hooks that respect tenant isolation.
2. **Product owner tooling** – Configure offers, feature bundles, and licensing entitlements through UI, with dashboard metrics that highlight tenant counts, adoption, and licensing health.
3. **Tenant journey** – Allow tenants to subscribe to product offerings, complete onboarding, be seeded as tenant admins, and configure RBAC for their church without leaving the guided flow.

Success will be measured by:
- Time-to-configure a new product package (target < 30 minutes).
- Accuracy of license gating (0 false-positive exposures in monitored tenants).
- Tenant onboarding completion rate within 48 hours of signup.

## 3. Incremental Implementation Plan

### Phase 0 – Discovery, telemetry baseline, and readiness (1 sprint)
**Objectives**
- Inventory existing RBAC bindings, licenses, and metadata overlays per tenant.
- Establish telemetry for tenant, license, and RBAC interactions.

**Key Stories**
- *As a developer*, I can export current RBAC bindings, license grants, and metadata surface associations per tenant to validate migration readiness.【F:docs/rbac/rbac-architecture-plan.md†L33-L44】
- *As a product owner*, I can see a baseline dashboard (tableau-style) summarizing tenants, active licenses, and unbound surfaces using existing service data to highlight gaps before new tooling launches.【F:src/services/LicenseFeatureService.ts†L1-L64】【F:src/components/admin/rbac/SurfaceBindingManager.tsx†L400-L520】

**Deliverables**
- Supabase scripts and analytics queries for RBAC/licensing exports.
- Instrumented logging for RBAC RPC calls and license fetches.
- Documentation of tenant data completeness & data quality issues.

### Phase 1 – Licensing domain model hardening (2 sprints)
**Objectives**
- Extend database and API layers to express product offerings, feature bundles, and tenant subscriptions with explicit license→RBAC mapping.

**Key Stories**
- *As a developer*, I can define product SKUs, feature bundles, and RBAC surface bindings in schema-backed tables/views so licensing can be linked to menus and metadata surfaces without manual joins.【F:supabase/migrations/20250801000000_menu_license_system.sql†L1-L200】【F:docs/rbac/rbac-architecture-plan.md†L23-L58】
- *As a product owner*, I can manage license catalogs and feature availability through APIs that respect tenant-scoped repositories following the three-layer pattern.【F:CLAUDE_AI_GUIDELINES.md†L17-L200】【F:src/services/LicenseFeatureService.ts†L1-L64】

**Workstreams**
- Database migrations for product catalog tables, feature bundle junctions, and RBAC surface binding extensions.
- Update adapters/repositories/services to expose CRUD & reporting endpoints for the new schema while maintaining tenant filters.
- Add DI container registrations for new repositories/services.

**Acceptance**
- Automated tests verifying tenant-specific filtering and license→surface relationships.
- API docs (OpenAPI or MD) describing new endpoints.

### Phase 2 – RBAC + licensing orchestration & metadata alignment (2–3 sprints)
**Objectives**
- Ensure permission checks respect license states and metadata surfaces evaluate against combined RBAC + licensing context.

**Key Stories**
- *As a developer*, I can call a single service API to determine if a user should see a surface based on roles, bundles, and active license features, backed by effective-permission materialized views.【F:docs/rbac/rbac-architecture-plan.md†L37-L55】【F:src/services/UserRoleService.ts†L37-L164】
- *As a product owner*, I can preview how licensing changes affect menus/metadata before publishing, using enhanced Surface Binding Manager analytics and simulated tenants.【F:src/components/admin/rbac/SurfaceBindingManager.tsx†L400-L520】
- *As metadata authors*, we can target RBAC tokens that map to database identifiers via a registry so overlays remain declarative while honoring licensing.【F:docs/architecture/metadata-architecture.md†L1-L56】【F:src/lib/metadata/evaluation.ts†L9-L200】

**Workstreams**
- Implement tenant-aware `can_user` variants and refresh policies that feed new Supabase views for licensed permissions.【F:supabase/migrations/20250730000000_dynamic_rbac.sql†L87-L119】
- Update `UserRoleAdapter`/`Service` to require tenant parameters, consume licensed surface views, and expose metadata-friendly keys.
- Enhance metadata evaluation context with license feature flags alongside role arrays.

**Acceptance**
- Unit/integration tests for combined RBAC + license gating.
- Metadata compilation tests verifying `<RBAC>` and license directives hide/show surfaces appropriately.

### Phase 3 – Admin UI for licensing studio & dashboards (2 sprints)
**Objectives**
- Deliver UI for product owners to manage licenses, view tenant adoption metrics, and trigger publishing/validation workflows.

**Key Stories**
- *As a product owner*, I can configure product offerings, assign them to tenants, and view adoption metrics from a unified licensing studio UI built on existing admin RBAC components.【F:src/components/admin/rbac/SurfaceBindingManager.tsx†L400-L520】
- *As a developer/operator*, I can queue license validation jobs and review audit logs from the admin dashboard, leveraging publishing APIs and audit services already present in the DI container.【F:src/lib/container.ts†L1-L120】

**Workstreams**
- Extend admin UI tabs for licensing management with forms, validation, and data grids using shadcn components.
- Integrate telemetry panels (tenant count, licensed feature coverage, RBAC drift) fed by new reporting endpoints.
- Ensure UI actions call services (not Supabase directly) and show loading/error states per guidelines.【F:CLAUDE_AI_GUIDELINES.md†L17-L200】

**Acceptance**
- UX review with product owners; accessibility checklist passed.
- Cypress or Playwright smoke flows for key licensing operations.

### Phase 4 – Tenant subscription & onboarding journey (3 sprints)
**Objectives**
- Provide public sign-up, subscription selection, onboarding wizard, and automated RBAC seeding for new tenants.

**Key Stories**
- *As a tenant admin*, I can subscribe to a product offering, provision my tenant, and automatically receive the admin role/license entitlements upon first login.【F:src/lib/auth/actions.ts†L1-L70】【F:supabase/migrations/20250730000000_dynamic_rbac.sql†L29-L114】
- *As a tenant admin*, I can complete an onboarding wizard that sets up my church’s RBAC policies (roles, bundles, feature toggles) using guided defaults from metadata-driven forms.【F:docs/architecture/metadata-architecture.md†L22-L48】
- *As a product owner*, I can monitor onboarding progress and tenant activation metrics on the dashboard, including conversion funnels and outstanding RBAC tasks.【F:src/services/LicenseFeatureService.ts†L1-L64】【F:src/components/admin/rbac/SurfaceBindingManager.tsx†L400-L520】

**Workstreams**
- Build public signup UI + API integrating payment/subscription logic (stubbed initially) and linking to license issuance.
- Extend onboarding metadata overlays with RBAC setup forms, leveraging metadata runtime for guided experiences.
- Automate tenant admin seeding via Supabase triggers or post-signup services following DI patterns.

**Acceptance**
- End-to-end tests covering signup → onboarding → admin landing with correct RBAC/licensing state.
- Audit logs verifying automatic role assignments and license grants.

### Phase 5 – Optimization, governance, and rollout (1–2 sprints)
**Objectives**
- Harden performance, observability, and compliance prior to GA rollout.

**Key Stories**
- *As an operator*, I receive alerts when license/RBAC bindings fall out of sync or onboarding stalls, with self-healing scripts or runbooks documented.【F:docs/rbac/rbac-architecture-plan.md†L51-L59】
- *As a developer*, I can run automated regression suites (unit, integration, metadata compilation) as part of CI/CD gates to maintain the architecture contract.【F:CLAUDE_AI_GUIDELINES.md†L17-L200】

**Workstreams**
- Performance tuning on Supabase views/materialized views; caching at service layer.
- Observability dashboards for onboarding conversion, license coverage, RBAC errors.
- Feature flag rollout strategy, tenant pilot program, migration playbooks.

**Acceptance**
- Production readiness review with SRE/product leadership.
- Documented rollback and support procedures.

## 4. Cross-Cutting Requirements & Risks

- **Architecture compliance** – All new functionality must continue to respect the three-layer pattern, DI registration, and tenant filtering to avoid security regressions.【F:CLAUDE_AI_GUIDELINES.md†L17-L200】
- **Data migration risk** – Translating existing role/menu bindings into license-aware surface bindings may reveal data quality issues; plan for reconciliation scripts and manual review windows.【F:docs/rbac/rbac-architecture-plan.md†L33-L58】
- **Metadata versioning** – Updating RBAC tokens and onboarding overlays requires careful coordination with metadata compilation and cache busting to avoid stale experiences.【F:docs/architecture/metadata-architecture.md†L20-L48】
- **Tenant experience** – Auto-assigning tenant admins and exposing RBAC configuration in onboarding must be reversible and auditable, leveraging existing audit services and session utilities.【F:src/lib/auth/actions.ts†L1-L70】【F:src/adapters/userRole.adapter.ts†L213-L313】

## 5. Next Steps
1. Socialize this plan with engineering, product, and UX stakeholders.
2. Kick off Phase 0 backlog refinement and telemetry setup.
3. Align release milestones with super-admin control center and onboarding roadmap documents.
