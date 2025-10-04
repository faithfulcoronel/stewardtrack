# StewardTrack Super Admin Control Center Implementation Plan

## 1. Goals & Success Criteria
- Deliver a consolidated control center for `super_admin` operators to model licenses, provision subscription packages, govern tenant lifecycles, and surface cross-tenant analytics.
- Provide a guided signup/onboarding flow that provisions a tenant, seeds the first administrator with the proper license bundle, and hands off to in-app delegation tools.
- Ensure every administrative action is governed by the existing RBAC stack (roles, bundles, surface bindings, and license gates) while exposing auditable Supabase functions for automation.

## 2. Current State Assessment

### 2.1 RBAC & Licensing Foundations
- RBAC data is flattened into `tenant_user_effective_permissions`, enabling consistent permission checks and audit refresh hooks already in place.
- Admin tooling includes metadata-aware managers such as the Multi-Role Assignment console and Surface Binding Manager, which already read from RBAC APIs and license-aware feature catalogs.
- Supabase has normalized license objects (`feature_packages`, `feature_package_items`, `tenant_feature_grants`) and helper functions (`tenant_has_feature`, `can_access_feature`) to enforce entitlements at the database layer.

### 2.2 Admin Experience
- `/admin` currently renders a static account overview with no tenant-wide telemetry or navigation dedicated to super admins.
- The admin layout hard-codes tenant-scoped sections and lacks links for license governance, subscription management, or cross-tenant reporting needed by platform operators.

### 2.3 Subscription & Tenant Data
- Subscription tier limits are calculated via `SubscriptionService` and `SubscriptionAdapter`, but they operate only on the caller’s tenant context and expose member/transaction counts for usage gating.
- Supabase exposes `update_tenant_subscription` for tenant/self-service upgrades and `get_tenant_data_counts` for per-tenant record tallies, yet there is no orchestration for platform-wide oversight or per-tenant overrides by super admins.

### 2.4 Signup & Onboarding
- Authentication adapters can invoke `handle_new_tenant_registration`, which creates the tenant, seeds defaults, and assigns the first user the `super_admin` admin role while attaching core roles.
- The public surface lacks a signup/onboarding flow; only a basic login page is provided today.

## 3. Gap Analysis
| Requirement | Current Coverage | Gaps |
| --- | --- | --- |
| Model licenses & create packages | Database tables exist; no UI/API for package CRUD or assignment tooling | Need super-admin views, API routes, and Supabase RPCs to create/update packages and map feature grants |
| Signup & onboarding | RPC + adapter ready | Build UX, validation, and multi-step capture for tenant + admin license selection |
| First user admin rights & delegation | Registration function sets `super_admin`; delegation consoles exist | Onboarding must collect license intent, seed feature grants, and surface delegation next steps |
| Dashboard stats & reports for all tenants | Per-tenant counts exist | Need cross-tenant rollups, trend charts, incident logs, and filters accessible only to super admins |
| Upgrade/downgrade tenant subscriptions | Tenant-scoped `update_tenant_subscription` exists | Add super-admin override path for arbitrary tenants, history tracking, and guardrails |

## 4. Target Architecture

### 4.1 Frontend (Next.js 15, App Router)
- Create a dedicated `/admin/super` section with its own layout variant and navigation for platform controls while reusing the existing sidebar shell components.
- Compose feature pages:
  - **Licensing Studio**: manage feature catalog, packages, and tenant grants with tables, editors, and audit history.
  - **Subscription Control**: visualize plan distribution, usage thresholds, and trigger upgrade/downgrade actions using Supabase server actions.
  - **Tenant Insights**: aggregate KPIs (active members, financial activity, support load) leveraging new Supabase reporting views.
  - **Onboarding Pipeline**: monitor pending signups, activation progress, and license compliance.
- Build `/signup` multi-step wizard capturing tenant info, admin profile, selected package, and billing preference; leverage server actions that call `AuthService.handleNewTenantRegistration` and seed initial feature grants.

### 4.2 API Layer (App Router API routes)
- Introduce authenticated API endpoints under `/api/admin/super/*` to manage packages (`feature_packages`), grants (`tenant_feature_grants`), and subscription overrides, enforcing `super_admin` RBAC via `tenant_user_effective_permissions` checks before invoking Supabase RPCs.
- Add onboarding APIs for license recommendations, domain availability, and invitation issuance that wrap existing auth repository methods.
- Expose telemetry endpoints that query new Supabase views (e.g., daily tenant growth, package adoption) for dashboard charts.

### 4.3 Supabase Schema & Functions
- Author stored procedures for package CRUD, grant assignment, and bulk upgrades with audit logging similar to existing `update_tenant_subscription` patterns.
- Create reporting views/materialized views aggregating:
  - Tenant lifecycle metrics (signups per day, active/inactive counts).
  - License/package adoption per tier.
  - Usage thresholds vs. tier limits to flag overages.
- Extend `get_tenant_data_counts` or companion functions to support multi-tenant queries filtered by package, geography, or status for super admin dashboards.
- Add auditing triggers to `feature_packages`, `tenant_feature_grants`, and subscription override tables so admin actions show up in the RBAC audit timeline.

### 4.4 RBAC & Licensing Alignment
- Register new surfaces (e.g., `/admin/super/licenses`) in metadata and bind them to `super_admin` roles and requisite feature codes through `SurfaceBindingManager` flows, ensuring only licensed operators see the new modules.
- Define new permissions/bundles for subscription operations if finer-grained delegation is required (e.g., allow certain staff to adjust plans without full super admin rights).

### 4.5 Telemetry & Observability
- Instrument Supabase functions with audit inserts (reusing `rbac_audit_log`) and expose dashboards for refresh status, similar to existing RBAC health reporting patterns.
- Emit structured events from Next.js server actions to whatever analytics pipeline is adopted post-launch.

## 5. Implementation Phases

1. **Phase 0 – Discovery & UX**
   - Stakeholder workshops to define required metrics, workflows, and licensing taxonomy.
   - Design Figma mocks for super admin navigation, licensing studio, and onboarding wizard.

2. **Phase 1 – Signup & Onboarding MVP**
   - Build `/signup` multi-step flow with validation, license selection, and integration to `handle_new_tenant_registration`.
   - Post-registration, auto-create tenant feature grants matching the selected package and route to delegation consoles for further setup.

3. **Phase 2 – Licensing & Package Management**
   - Implement Supabase RPCs for package CRUD and grant assignments.
   - Build `/admin/super/licenses` page with tables, editors, and analytics for feature adoption, backed by new API routes and using existing audit patterns.

4. **Phase 3 – Subscription Control**
   - Extend Supabase with super-admin subscription override functions and plan history tables.
   - Create UI to review tenant usage vs. tier limits using `SubscriptionService` data and new cross-tenant reports.

5. **Phase 4 – Tenant Analytics Dashboard**
   - Author reporting views aggregating tenant KPIs; add caching/materialized views where necessary.
   - Visualize metrics (growth trends, support tickets, feature adoption) on `/admin/super/analytics`, with filters and export options.

6. **Phase 5 – Delegation & Compliance Enhancements**
   - Align new surfaces with RBAC bundles, optionally create granular permissions for billing vs. licensing management.
   - Integrate license compliance checks into metadata publishing workflows so unlicensed tenants can’t access restricted modules.

7. **Phase 6 – QA, Rollout, and Monitoring**
   - Expand automated tests: API route integration, Supabase function unit tests (pgTap), and Cypress/Playwright flows for signup + super admin UI.
   - Enable feature flags for gradual rollout, monitor audit logs and telemetry, and train support teams.

## 6. Risks & Mitigations
- **Cross-tenant data exposure**: enforce `is_super_admin()` checks in every Supabase RPC and API route, reuse existing RBAC utilities for context resolution.
- **License/package drift**: centralize grants through new RPCs and ensure UI writes trigger refreshes of `tenant_user_effective_permissions` when necessary.
- **Onboarding friction**: provide real-time validation (subdomain availability, package recommendations) and fallback support contact.

## 7. Rollout & Monitoring
- Launch the onboarding flow first to validate tenant provisioning.
- Roll out super admin dashboard incrementally, starting with read-only analytics before enabling write operations (package CRUD, subscription overrides).
- Monitor audit logs, Supabase function errors, and onboarding conversion metrics; implement alerting for failed upgrades or missing feature grants.

---

Testing: ⚠️ Not run (read-only review).
