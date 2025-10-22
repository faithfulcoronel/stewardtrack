# RBAC ↔ Licensing Integration Status & Readiness Report

## 1. Purpose
This report summarizes how the current Role-Based Access Control (RBAC) stack and the Licensing Studio work together, outlines the end-to-end feature delivery workflow, and calls out remaining gaps to address before long-term growth.

## 2. Current Integration Snapshot

### 2.1 Service Orchestration & Dependency Injection
- `LicensingService` coordinates product offerings, feature bundles, surface bindings, and tenant license assignments through a single orchestrator that spans CRUD operations, combined RBAC/licensing access checks, and provisioning flows.【F:src/services/LicensingService.ts†L1-L340】
- `UserRoleService` injects `LicensingService` so RBAC evaluations always consider licensing. Helper methods gate surfaces by intersecting RBAC-permitted metadata with licensed surfaces and expose convenience APIs for “locked” experiences.【F:src/services/UserRoleService.ts†L10-L214】
- Permission helper utilities wrap these services so the rest of the app can perform unified access checks with one call, further tightening the integration surface.【F:src/lib/rbac/permissionHelpers.ts†L1-L116】

### 2.2 Metadata Runtime Alignment
- The metadata context builder now hydrates evaluation contexts with RBAC role arrays, license bundles, and tenant surface entitlements so XML-authored experiences can respect both authorization domains without bespoke code.【F:src/lib/metadata/contextBuilder.ts†L34-L193】
- The interpreter and evaluation pipeline accept multiple roles and license metadata, ensuring `<RBAC>` directives and expressions resolve against the combined context when rendering runtime overlays.【F:src/lib/metadata/evaluation.ts†L1-L120】

### 2.3 API Surface & Tooling
- A dedicated RBAC+licensing access endpoint exposes combined checks for external automation or UI clients, returning granular reasons for denials and relying on the same service stack used in-app.【F:src/app/api/rbac/check-access/route.ts†L1-L120】
- Licensing Studio centralizes admin workflows across product offerings, feature bundles, tenant assignments, and analytics, making it the primary console for governing entitlements alongside RBAC tooling.【F:src/components/admin/licensing/LicensingStudio.tsx†L3-L60】
- The RBAC Surface Binding Manager surfaces licensing coverage by feature code and lets administrators map metadata surfaces, RBAC roles, and licensing bundles in one place, closing the loop between metadata and entitlement configuration.【F:src/components/admin/rbac/SurfaceBindingManager.tsx†L720-L840】

### 2.4 Operational Readiness
- Phase 5 hardening delivered materialized view orchestration, caching, and monitoring for RBAC/licensing datasets, establishing GA readiness and observability for combined access pipelines.【F:PHASE_5_IMPLEMENTATION_REPORT.md†L1-L109】
- The rollout plan documents phased deployment toggles, health criteria, and operational checklists from internal testing through general availability, ensuring the platform can go live safely.【F:docs/deployment/licensing-rollout-plan.md†L1-L120】

## 3. Feature Lifecycle: From Idea to Enforced Access
1. **Model the capability** – Define or update license bundles, offerings, and surface bindings in the Licensing Studio so the entitlement exists in the catalog and can be tied to metadata and RBAC artifacts.【F:src/services/LicensingService.ts†L73-L340】【F:src/components/admin/licensing/LicensingStudio.tsx†L25-L60】
2. **Author metadata** – Create or adjust XML blueprints/overlays in `metadata/authoring`, compile them with the provided CLI, and rely on `<RBAC>` directives to scope visibility. This metadata-first approach keeps UI evolution declarative and versioned.【F:docs/architecture/metadata-architecture.md†L6-L55】
3. **Bind to RBAC & licensing** – Use the Surface Binding Manager to associate metadata surfaces with roles and required feature codes so the runtime intersection enforces both RBAC roles and license bundles.【F:src/components/admin/rbac/SurfaceBindingManager.tsx†L720-L840】
4. **Provision & assign** – During onboarding or manual adjustments, `LicensingService` provisions tenant features and records license history while `UserRoleService` seeds default roles; admins can reassign offerings through the Licensing Studio when plans change.【F:src/services/LicensingService.ts†L343-L435】【F:docs/phase4-tenant-subscription-onboarding-report.md†L460-L488】
5. **Runtime enforcement** – Metadata contexts and permission helpers apply the combined RBAC/licensing decision whenever a user loads a surface or API, guaranteeing that both domains remain synchronized as tenants evolve.【F:src/lib/metadata/contextBuilder.ts†L58-L93】【F:src/lib/rbac/permissionHelpers.ts†L16-L99】
6. **Monitor & iterate** – Materialized view refresh services, caching, and rollout guardrails keep access data fresh and observable so new features can launch safely and be expanded to additional tenants over time.【F:PHASE_5_IMPLEMENTATION_REPORT.md†L15-L109】【F:docs/deployment/licensing-rollout-plan.md†L21-L94】

## 4. Readiness Assessment
- **Architecture** – RBAC and licensing now converge at the service, metadata, and API layers, preventing drift between menu exposure, metadata overlays, and entitlement catalogs.【F:src/services/UserRoleService.ts†L168-L214】【F:src/lib/metadata/contextBuilder.ts†L58-L93】
- **Tooling** – Admin consoles cover the critical workflows (catalog management, binding oversight, analytics), minimizing manual SQL or Supabase work for day-to-day operations.【F:src/components/admin/licensing/LicensingStudio.tsx†L25-L60】【F:src/components/admin/rbac/SurfaceBindingManager.tsx†L720-L840】
- **Operations** – Refresh orchestration, caching, and documented rollout steps indicate the stack is production-ready with defined guardrails and observability hooks.【F:PHASE_5_IMPLEMENTATION_REPORT.md†L15-L109】【F:docs/deployment/licensing-rollout-plan.md†L21-L94】

Overall, the system is technically ready to go live and to support continuous feature delivery, provided the outstanding improvements below are prioritized.

## 5. Gaps & Improvement Opportunities
1. **Tier-aware RBAC seeding** – During onboarding, default roles are created without tier-specific permissions even though the tier is known. Automating bundle assignment per tier would prevent manual follow-up and align roles with licensed capabilities from day one.【F:docs/phase4-tenant-subscription-onboarding-report.md†L472-L503】
2. **License tier derivation** – The metadata context currently infers a tenant’s tier from only the first active offering, which can mask multi-offering or add-on scenarios. Expanding this to aggregate active offerings would yield more accurate feature flagging and UI behavior.【F:src/lib/metadata/contextBuilder.ts†L75-L92】
3. **Provisioning resilience** – `LicensingService.provisionTenantLicense` performs iterative Supabase inserts without transactional safeguards. Wrapping grants in a transaction and capturing partial-failure telemetry would harden onboarding against mid-flight errors.【F:src/services/LicensingService.ts†L355-L402】
4. **Catalog-to-metadata traceability** – While the Surface Binding Manager lists bound surfaces, there is no automated report that flags license features lacking metadata coverage or RBAC bindings. Extending analytics to highlight these gaps would prevent “orphaned” offerings as the catalog grows.【F:src/components/admin/rbac/SurfaceBindingManager.tsx†L720-L799】
5. **Plan-level automation scripts** – The rollout playbook references manual SQL for pilot tenant flags and health checks. Packaging these steps into repeatable scripts or CLI tasks would streamline staged rollouts and reduce operator error.【F:docs/deployment/licensing-rollout-plan.md†L61-L94】

Addressing these items will tighten the feedback loop between licensing decisions, metadata authoring, and RBAC enforcement, ensuring StewardTrack remains adaptable as new product tiers and features are introduced.
