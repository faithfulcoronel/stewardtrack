# RBAC Incremental User Stories

This document breaks the RBAC backlog into incremental user stories derived from the latest review feedback. Each increment is designed to be deliverable independently while building toward the metadata-first, automation-ready RBAC experience described in the implementation plan.

## Increment 1 – Metadata Blueprint Foundations

### Story 1.1 – Author dashboards from XML blueprints
* **Persona:** Metadata author
* **Need:** Create and update the RBAC dashboard surface using XML blueprints stored alongside other canonical metadata.
* **Acceptance Criteria:**
  - Blueprint schema documented with examples for each surface (dashboard, explorer, composer, binding manager).
  - Dashboard renders solely from blueprint files delivered by Supabase, with no hard-coded React layout data.
  - Blueprint updates propagate to the UI without a rebuild (hot reload via Supabase metadata fetch or polling).
  - Unit tests confirm the interpreter can deserialize the new XML structures and map them to existing components.
* **Notes:** This story unblocks future overlays and ensures Phase A stories align with the metadata-first mandate.

### Story 1.2 – Canonical metadata registry export
* **Persona:** Metadata author & integrator
* **Need:** Reference stable metadata keys when composing roles and bundles.
* **Acceptance Criteria:**
  - Supabase exposes an endpoint (REST or RPC) that lists canonical role, bundle, and binding keys with human-readable descriptions.
  - Registry is surfaced in the UI (table or lookup modal) and downloadable as CSV/JSON.
  - Registry entries include the source Supabase ID, canonical key, display name, and last-modified timestamp.
  - Documentation added to the metadata authoring guide covering how to reference registry keys in blueprints.
* **Notes:** This fulfills Phase A registry visibility and supports validation logic in later increments.

## Increment 2 – Replace Mock Data With Live Supabase Flows

### Story 2.1 – Delegated persona data sourcing
* **Persona:** Delegated admin (campus or ministry lead)
* **Need:** Manage real tenant roles, bundles, and assignments without mock datasets.
* **Acceptance Criteria:**
  - All delegated persona views retrieve data from Supabase tables or views with tenant scoping enforced.
  - Mock JSON files removed from the codebase or clearly isolated under a development-only flag.
  - Feature flag controls allow fallback to mock data in non-production environments.
  - Integration tests verify end-to-end data retrieval for at least two tenant fixtures.
* **Notes:** Required before Phase C/D badges can be marked complete.

### Story 2.2 – Multi-role assignment workflows
* **Persona:** Global RBAC admin
* **Need:** Assign and revoke multiple roles in a single workflow using live data.
* **Acceptance Criteria:**
  - Bulk assignment UI writes to Supabase using transactional RPC or stored procedures.
  - Error handling surfaces Supabase validation messages without console errors.
  - Activity logs capture assignments with metadata about actor, target, and role bundle key.
  - Regression tests confirm role count mismatches are prevented by backend constraints.
* **Notes:** Builds on Story 2.1 and enables accurate progress reporting for delegated experiences.

## Increment 3 – Publishing & Automation APIs

### Story 3.1 – Implement `/api/rbac/publishing/*` routes
* **Persona:** RBAC release manager
* **Need:** Trigger and monitor metadata publishing actions directly from the UI.
* **Acceptance Criteria:**
  - Next.js API routes implemented for publish, dry-run, status, and cancel actions, delegating to Supabase functions.
  - Endpoints secured via Supabase auth checks and return structured error payloads.
  - UI buttons reflect real status transitions (idle → running → succeeded/failed) based on API responses.
  - Contract tests ensure endpoints return `404` or `403` for unauthorized or unknown tenants.
* **Notes:** Removes broken controls and unlocks Phase E automation.

### Story 3.2 – Publishing audit timeline integration
* **Persona:** Compliance auditor
* **Need:** View automated audit trails tied to publishing jobs and materialized view freshness.
* **Acceptance Criteria:**
  - Audit timeline aggregates Supabase job history, materialized view refresh times, and compilation statuses.
  - Health indicators derived from backend signals, not client-side heuristics.
  - Timeline entries link to raw audit records and expose filters for date range, tenant, and status.
  - Documentation updated to explain automation signals and troubleshooting steps.
* **Notes:** Completes the automation story and validates readiness for compliance reviews.

## Increment 4 – Honest Phase Signaling

### Story 4.1 – Dynamic phase status service
* **Persona:** Program manager
* **Need:** Display accurate phase completion badges based on backend readiness, not hard-coded booleans.
* **Acceptance Criteria:**
  - Phase status derived from a configuration document or Supabase table indicating feature readiness per phase.
  - Dashboard badges update automatically when status flags change; no redeploy required.
  - Phase marked “Complete” only when all prerequisite stories (by ID) are marked done.
  - Unit tests cover status transitions and fallback messaging for partially complete phases.
* **Notes:** Prevents overstating progress and aligns UI signals with actual capabilities.

### Story 4.2 – Feature gating for unfinished experiences
* **Persona:** RBAC product owner
* **Need:** Hide or downgrade unfinished experiences until dependent increments ship.
* **Acceptance Criteria:**
  - Feature gate system supports “hidden,” “preview,” and “generally available” states.
  - Screens relying on missing APIs default to informative empty states rather than failing requests.
  - Changelog entries generated when toggles move to GA.
  - Telemetry dashboard tracks gate usage to inform rollout decisions.
* **Notes:** Ensures users are not exposed to broken flows and clarifies roadmap status.

---

### Cross-Cutting Definition of Done
* Feature documentation updated in `docs/rbac` for each shipped increment.
* Supabase migration scripts versioned and peer-reviewed.
* Accessibility and localization review completed for new or significantly changed UI surfaces.
* Rollback plan documented for each increment, including feature flag strategy.
