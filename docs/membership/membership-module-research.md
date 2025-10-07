# StewardTrack Membership Module Research & Completion Plan

## 1. Current Experience Deep Dive

### 1.1 Metadata-driven page architecture
- **Manage workspace** &mdash; `/admin/members/manage` renders a hero, contextual metrics, and a tabbed `AdminMemberWorkspace` form powered by the `membershipRecords` service data source and lookup bindings for stages, types, and centers.【F:metadata/authoring/blueprints/admin-community/membership-manage.xml†L1-L176】【F:metadata/authoring/blueprints/admin-community/membership-manage.xml†L327-L370】【F:metadata/authoring/blueprints/admin-community/membership-manage.xml†L3338-L3346】
- **Directory** &mdash; `/admin/members/list` combines a hero, engagement segment cards, and the metadata-driven data grid that relies on the `admin-community.members.list.membersTable` handler for live rows.【F:metadata/authoring/blueprints/admin-community/membership-list.xml†L1-L95】【F:metadata/authoring/blueprints/admin-community/membership-list.xml†L184-L195】
- **Profile** &mdash; `/admin/members/[memberId]` stitches rich overview, engagement, serving, care, and finance panels with inline edit affordances that link back to manage sections.【F:metadata/authoring/blueprints/admin-community/membership-profile.xml†L200-L320】
- **Dashboard** &mdash; `/admin/members` assembles hero, KPI cards, quick links, giving trend, and care timeline components entirely from static blueprint data today.【F:metadata/authoring/blueprints/admin-community/membership-dashboard.xml†L1-L118】

### 1.2 Data orchestration & services
- Metadata handlers map to strongly typed services: the members list handler enriches table rows through `MembersDashboardService.getDirectory`, injecting avatar metadata and stage variants.【F:src/lib/metadata/services/admin-community.ts†L1015-L1058】
- Profile and manage data sources reuse `MemberProfileService` to load composite records, with graceful fallbacks and timeline limits.【F:src/lib/metadata/services/admin-community.ts†L1387-L1452】
- Inline lookup values come from dedicated membership lookup services that wrap Supabase adapters with tenant-aware request context and sorting.【F:src/lib/metadata/services/admin-community/membershipLookups.ts†L1-L200】
- The system already exposes higher-level dashboard metrics services (`MembersDashboardService` → repository → adapter) capable of returning counts, directory slices, and birthday cohorts, although the dashboard blueprint still uses placeholder XML values.【F:src/services/MembersDashboardService.ts†L1-L35】【F:src/repositories/membersDashboard.repository.ts†L1-L74】【F:src/adapters/membersDashboard.adapter.ts†L1-L160】【F:metadata/authoring/blueprints/admin-community/membership-dashboard.xml†L54-L126】

### 1.3 Form submission and inline editing
- `AdminMemberWorkspace` normalizes metadata-provided fields, binds lookup options, manages household search state, and delegates submission to `useAdminFormController`, which executes metadata actions with tenant-role context and toast notifications.【F:src/components/dynamic/admin/AdminMemberWorkspace.tsx†L434-L620】【F:src/components/dynamic/admin/useAdminFormController.ts†L1-L120】
- Manage submissions run through `ManageMemberAction`, parsing request payloads, loading repositories via `MemberManageResourceFactory`, mapping form fields (including membership stage/type/center and household payloads), and persisting via `MemberService.create/update` with validator safeguards and user-friendly error handling.【F:src/lib/metadata/actions/admin-community/manage-member/action.ts†L1-L106】【F:src/lib/metadata/actions/admin-community/manage-member/resourceFactory.ts†L1-L120】【F:src/lib/metadata/actions/admin-community/manage-member/mapper.ts†L321-L520】
- Detail panels trigger inline edit dialogs backed by `/api/admin/members/manage-section`, which re-evaluates metadata to isolate the correct form sections and return initial values, helper text, and submit actions for each action ID defined in `MANAGE_SECTION_CONFIG`.【F:src/components/dynamic/admin/AdminDetailPanels.tsx†L120-L220】【F:src/app/api/admin/members/manage-section/route.ts†L1-L200】【F:src/lib/members/manageSectionConfig.ts†L1-L65】

### 1.4 Quick create for lookup vocabularies
- Lookup pickers surface an inline “quick add” dialog powered by the `AdminLookupQuickCreate` component. It auto-generates codes, executes the `admin-community.members.manage.lookup.create` action, and returns the new option to the form.【F:src/components/dynamic/admin/AdminMemberWorkspace.tsx†L1110-L1152】【F:src/components/dynamic/admin/AdminLookupQuickCreate.tsx†L1-L170】
- The action validates input, establishes tenant-aware services via membership lookup helpers, handles Supabase uniqueness errors, and produces normalized `FormFieldOption` payloads for immediate reuse.【F:src/lib/metadata/actions/admin-community/manage-member/lookupCreate.ts†L1-L190】【F:src/lib/metadata/services/admin-community/membershipLookups.ts†L83-L200】

## 2. Supabase Membership Data Structure Analysis

### 2.1 Core classification tables
- **`membership_type`** – Stores tenant-scoped membership categories with system flags, ordering, and RLS policies to allow authenticated tenant users to read and admins to manage entries.【F:supabase/migrations/20250715000000_membership_tables.sql†L3-L80】 These values already hydrate manage/profile experiences through lookup handlers and the `MemberProfileService`, so keeping the UI contracts aligned with code/name pairs prevents drift.【F:src/lib/metadata/services/admin-community.ts†L965-L994】【F:src/adapters/memberProfile.adapter.ts†L183-L282】
- **`membership_stage`** – Successor to `membership_status`, renamed while keeping a compatibility view so existing metadata keeps working.【F:supabase/migrations/20250925000000_membership_stage_center_features.sql†L1-L16】 Stage lookups flow into directory row badges and admin panels today, but the stage history (see §2.4) is not yet surfaced.

### 2.2 Congregational context tables
- **`membership_center`** – Adds multi-site center metadata (address, service times, primary flags) plus tenant-aware RLS. Members now reference centers via `membership_center_id`, but no dedicated admin page exists to curate centers, so quick-create from the manage form is the only control.【F:supabase/migrations/20250925000000_membership_stage_center_features.sql†L18-L118】 We should stand up a lightweight CRUD workspace so pastors can manage codes, service times, and primary center designations without leaving the module.
- **`member_households`** – Normalizes shared household names, addresses, envelopes, and member arrays with RLS and automatic backfill. Member profiles already show household chips, yet there is no list or detail view to audit household data; a household drawer sourced from this table would make finance and follow-up tasks simpler.【F:supabase/migrations/20250927010000_membership_profile_normalization.sql†L17-L172】【F:src/adapters/memberProfile.adapter.ts†L183-L282】

### 2.3 Care, serving, discipleship, and giving records
- **`member_care_plans`** – Tracks pastoral assignments, follow-up dates, and stage alignment with full RLS coverage.【F:supabase/migrations/20250925000000_membership_stage_center_features.sql†L137-L214】 Profile panels already expect a `carePlan` object but we lack creation/editing surfaces, so care plans must be seeded manually. A modal-driven plan editor, an administrative list workspace, and inline completion flows on the profile should connect to this table to deliver full CRUD.
- **`member_serving_assignments`** – Captures serving teams, roles, schedules, and coaches with primary flags and triggers.【F:supabase/migrations/20250925000000_membership_stage_center_features.sql†L215-L296】 Profile summaries show serving details but only the main member record fields can change, leaving secondary assignments inaccessible. Add a dedicated “Serving roster” tab with inline table management, a bulk import drawer, and assignment history so staff can steward all placements.
- **`member_discipleship_plans`** & **`member_discipleship_milestones`** – Model discipleship pathways, mentors, target dates, and milestone celebrations with tenant-safe RLS.【F:supabase/migrations/20250925000000_membership_stage_center_features.sql†L297-L400】 The profile discipleship section currently renders single-value fields; expanding it to show plan progression, milestone chips, mentor assignments, and follow-up actions will unlock these tables and keep assimilation data actionable.
- **`member_giving_profiles`** – Stores recurring giving, pledge, and last-gift metrics with helper functions to sync from finance transactions.【F:supabase/migrations/20250925000000_membership_stage_center_features.sql†L401-L758】 Because the financial module will own the full giving workflow, the membership roadmap will defer live giving record implementation until that module ships, while keeping metadata placeholders to avoid breaking current layouts.【F:metadata/authoring/blueprints/admin-community/membership-profile.xml†L360-L508】

### 2.4 Engagement metadata & history
- **`member_tags`** – Provides normalized tagging with RLS; currently only exposed via freeform arrays on the member record, meaning tags cannot be batch-managed or audited. Introduce a metadata-backed tag manager and leverage quick-create for discoverability.【F:supabase/migrations/20250925000000_membership_stage_center_features.sql†L1005-L1059】【F:metadata/authoring/blueprints/admin-community/membership-profile.xml†L391-L411】
- **`member_timeline_events`** – Persists timeline cards (title, category, occurred_at, metadata) with tenant policies and audit triggers.【F:supabase/migrations/20250925000000_membership_stage_center_features.sql†L1062-L1118】 The profile timeline component expects live events but still runs on sample data; wiring this service handler will make milestones trustworthy.【F:metadata/authoring/blueprints/admin-community/membership-profile.xml†L421-L433】
- **`membership_stage_history`** – Automatically records stage transitions via the `record_membership_stage_history` trigger yet is invisible in the UI. Adding a “Stage history” drawer and export will let teams audit journey movement and align with assimilation reports.【F:supabase/migrations/20250925000000_membership_stage_center_features.sql†L137-L214】【F:supabase/migrations/20250925000000_membership_stage_center_features.sql†L1120-L1152】

## 3. Key Findings & Opportunities

1. **Dashboard and directory hero metrics are static** – All hero numbers, KPI cards, and engagement segment values ship as hard-coded XML, meaning real congregational trends are invisible despite having data services capable of producing them.【F:metadata/authoring/blueprints/admin-community/membership-dashboard.xml†L54-L126】【F:metadata/authoring/blueprints/admin-community/membership-list.xml†L39-L181】
2. **Metrics services are already production-ready but unused** – The `MembersDashboardService` stack queries Supabase for totals, new members, visitor counts, directory slices, and birthdays, yet none of these handlers are wired into metadata for dashboard widgets, creating duplication and drift risks.【F:src/services/MembersDashboardService.ts†L1-L35】【F:src/adapters/membersDashboard.adapter.ts†L42-L160】
3. **Inline editing infrastructure is strong** – Manage workflows, inline dialogs, and quick create flows follow consistent metadata evaluation patterns with validation, analytics-ready footers, and toast feedback, so landing real data on the dashboard would harmonize with the existing ecosystem.【F:src/components/dynamic/admin/AdminDetailPanels.tsx†L120-L220】【F:src/lib/metadata/actions/admin-community/manage-member/action.ts†L20-L106】

## 4. User Story to Complete the Module

> **As a membership pastor, I need the membership dashboard and directory hero metrics to reflect live Supabase data so that I can trust StewardTrack for weekly ministry decisions without switching to spreadsheets.**

### Acceptance Criteria
- Dashboard hero, KPI cards, and care timeline pull data via metadata service handlers backed by `MembersDashboardService`, with sensible loading and empty states for each card.【F:metadata/authoring/blueprints/admin-community/membership-dashboard.xml†L1-L126】【F:src/services/MembersDashboardService.ts†L1-L35】
- Dashboard giving highlight clearly labels itself as pending live data and links to the forthcoming financial module, reusing placeholder metadata until those services are available.【F:metadata/authoring/blueprints/admin-community/membership-dashboard.xml†L54-L126】【F:supabase/migrations/20250925000000_membership_stage_center_features.sql†L401-L758】
- Membership list hero metrics and engagement segment cards consume a shared service handler that summarizes household counts, new members, recurring givers, and pipeline insights using the same Supabase queries, keeping copy in sync with reality.【F:metadata/authoring/blueprints/admin-community/membership-list.xml†L39-L181】【F:src/adapters/membersDashboard.adapter.ts†L42-L160】
- Admins can manage membership centers, stages, and types via metadata-driven CRUD surfaces that write to `membership_center`, `membership_stage`, and `membership_type`, with quick-create remaining available in forms.【F:supabase/migrations/20250925000000_membership_stage_center_features.sql†L18-L118】【F:supabase/migrations/20250715000000_membership_tables.sql†L3-L80】 These surfaces include list grids, detail drawers, validation, and audit history exports so multi-campus teams can confidently maintain center data.
- Member profiles and related admin workspaces render live care plans, serving assignments, and discipleship plans/milestones sourced from Supabase tables (`member_care_plans`, `member_serving_assignments`, `member_discipleship_plans`, `member_discipleship_milestones`), each with inline actions to add, update, complete, or archive records, plus cross-links to dedicated admin hubs for batch management.【F:supabase/migrations/20250925000000_membership_stage_center_features.sql†L137-L400】【F:metadata/authoring/blueprints/admin-community/membership-profile.xml†L360-L433】
- Giving profile surfaces remain static placeholders until the financial module lands. Acceptance criteria explicitly carve out giving so we can integrate the finance-owned services later without duplicating effort, while ensuring the UI communicates that live giving will arrive with the finance rollout.【F:supabase/migrations/20250925000000_membership_stage_center_features.sql†L401-L758】【F:metadata/authoring/blueprints/admin-community/membership-profile.xml†L360-L508】
- Stage history and household context are accessible from the profile via drawers or tabs that read from `membership_stage_history` and `member_households`, enabling audit-ready exports and edits.【F:supabase/migrations/20250925000000_membership_stage_center_features.sql†L137-L214】【F:supabase/migrations/20250927010000_membership_profile_normalization.sql†L17-L172】
- Metadata blueprints fall back to existing sample content if service calls fail, reusing the fallback logic already present in other membership handlers.【F:src/lib/metadata/services/admin-community.ts†L1387-L1452】
- UX displays skeleton states while metrics load, emits toasts on recoverable errors, and documents data freshness in footers (e.g., “Updated {{timestamp}}”).【F:src/components/dynamic/admin/AdminMemberWorkspace.tsx†L434-L620】
- Telemetry captures timing and error events for each dashboard data source and new Supabase-backed panels to monitor performance regressions post-launch.

### Definition of Done
- All dashboard/list metadata changes are covered by integration tests that mock `MembersDashboardService` responses and assert rendered values and empty-state messaging.
- Supabase-backed profile panels and admin workspaces (centers, care, serving, discipleship, tags, stage history) ship with API layer tests and happy-path UI coverage to confirm CRUD flows and surface bindings; giving remains excluded until the financial module provides end-to-end services.【F:supabase/migrations/20250925000000_membership_stage_center_features.sql†L18-L400】【F:supabase/migrations/20250925000000_membership_stage_center_features.sql†L401-L758】
- Supabase policies updated (if necessary) so dashboard handlers run under current tenant scopes without privilege escalations.
- Documentation updated in `reports/` to describe new handlers and how to extend metrics.
- No regression in manage/profile flows verified by smoke tests (save member, inline edit, quick create).

## 5. Incremental Implementation Plan

Each phase builds on the previous one so that data contracts, UX patterns, and operational safeguards evolve together. The user stories below split the epic in §4 into incremental releases that can be planned, estimated, and validated independently.

### Phase 1 – Service Handlers & Contracts

#### User Story P1
> **As a membership analytics lead, I need unified service handlers that expose live dashboard, profile, and ministry-plan data so that downstream metadata screens can consume trustworthy Supabase aggregates without duplicating query logic.**

#### Acceptance Criteria
- Dashboard hero, KPI, and engagement segment handlers in `admin-community` metadata source their data exclusively from `MembersDashboardService`, returning normalized DTOs with loading/error contracts that match existing metadata usage patterns.【F:src/lib/metadata/services/admin-community.ts†L1015-L1458】【F:src/services/MembersDashboardService.ts†L1-L35】
- Repository and adapter layers expose typed methods for membership centers, care plans, serving assignments, discipleship plans/milestones, stage history, and household summaries, each mapping to Supabase SQL or RPC calls with tenant-aware filters.【F:src/adapters/memberProfile.adapter.ts†L183-L380】【F:supabase/migrations/20250925000000_membership_stage_center_features.sql†L18-L400】
- Contracts account for empty datasets (returning `[]` with metadata for empty states) and error scenarios (throwing `MetadataServiceError` with user-safe messages) so that UI can present skeletons and fallbacks without regression.【F:src/lib/metadata/services/admin-community.ts†L1387-L1452】
- Placeholder DTOs are defined for giving profiles with TODO annotations referencing the finance module integration, ensuring no accidental production calls are made ahead of that roadmap item.【F:supabase/migrations/20250925000000_membership_stage_center_features.sql†L401-L758】

#### UX Experience Notes
- No new UI ships yet, but UX partners receive contract documentation and sample JSON to validate information architecture for upcoming dashboard tiles and profile panels.
- Loading/empty/error states are described in the handler docs so designers can storyboard progressive disclosure and messaging before Phase 2.

#### Technical Implementation Details
- Create `getMembershipDashboardMetrics`, `getMembershipEngagementSegments`, and `getMembershipListHeroMetrics` handlers under `admin-community` services, following the CLAUDE_AI_GUIDELINES separation of adapters and repositories.【F:src/lib/metadata/services/admin-community.ts†L1015-L1458】
- Extend the members dashboard repository with composite Supabase queries (e.g., joined counts for active care plans vs. total members) using database views when calculations require multiple tables, keeping logic database-side for performance.【F:src/repositories/membersDashboard.repository.ts†L1-L74】【F:supabase/migrations/20250925000000_membership_stage_center_features.sql†L137-L214】
- Add new adapter functions (e.g., `fetchMemberCarePlansSummary`) that encapsulate Supabase filters, pagination defaults, and error normalization so metadata handlers receive ready-to-render data.
- Document contracts in `reports/membership-module-research.md` appendices or a new `docs/membership-handlers.md` file to support QA and future contributors.

#### Phase Exit Criteria
- Handler unit tests cover success, empty, and failure paths with mocked repository responses.
- API tokens/RLS policies validated to ensure multi-tenant safety for the new queries.

### Phase 2 – Metadata & UX Wiring

#### User Story P2A (Dashboard & Directory)
> **As a campus pastor, I want the membership dashboard and directory hero cards to display live congregation metrics with clear loading, empty, and error states so I can make informed decisions without exporting spreadsheets.**

#### Acceptance Criteria
- Dashboard blueprint swaps static data sources for the Phase 1 service handlers and renders skeleton states while requests resolve, with empty-state copy guiding users when no data is available.【F:metadata/authoring/blueprints/admin-community/membership-dashboard.xml†L54-L126】
- Directory hero metrics and engagement segments reuse the same handler payloads, ensuring identical totals between dashboard and list contexts and eliminating configuration drift.【F:metadata/authoring/blueprints/admin-community/membership-list.xml†L39-L181】
- KPI cards document last-updated timestamps and leverage color-coded trend indicators designed with accessible contrast ratios.
- Giving highlight block retains placeholder content but adds a tooltip/banner noting that live giving arrives with the finance module, linking to roadmap docs.【F:metadata/authoring/blueprints/admin-community/membership-dashboard.xml†L54-L126】【F:supabase/migrations/20250925000000_membership_stage_center_features.sql†L401-L758】

#### User Story P2B (Centers & Classifications)
> **As an operations director, I need dedicated admin workspaces to manage membership centers, stages, and types so I can maintain accurate site assignments, assimilation pathways, and reporting taxonomy.**

#### Acceptance Criteria
- New admin routes (e.g., `/admin/members/centers`, `/admin/members/stages`, `/admin/members/types`) expose list tables with filters, search, and CSV export for the corresponding Supabase tables.【F:supabase/migrations/20250925000000_membership_stage_center_features.sql†L18-L118】【F:supabase/migrations/20250715000000_membership_tables.sql†L3-L80】
- Create/edit drawers include validation (unique codes, required service times, active flags) and inline quick-create hooks reused by manage/profile forms.【F:metadata/authoring/blueprints/admin-community/membership-manage.xml†L3338-L3347】
- Navigation shortcuts from the manage workspace and profile panels deep-link into these new pages, maintaining context via query parameters (e.g., preselecting a center).
- Audit history exports include `updated_by`, `updated_at`, and reason fields to support compliance reviews.

#### User Story P2C (Care, Serving, Discipleship, Timeline, Households)
> **As a discipleship coordinator, I need the member profile and ministry workspaces to surface live care plans, serving assignments, discipleship journeys, timeline events, and household context so I can shepherd members with confidence.**

#### Acceptance Criteria
- Profile panels consume Supabase-backed handlers for care, serving, discipleship, and timeline data, supporting add/edit/archive actions with optimistic UI updates and undo toasts.【F:metadata/authoring/blueprints/admin-community/membership-profile.xml†L360-L433】【F:src/lib/metadata/services/admin-community.ts†L900-L1001】
- Dedicated admin workspaces for care plans, serving assignments, and discipleship pathways offer list grids, bulk actions (assign coach, mark milestone, close plan), and per-record detail drawers respecting tenant RLS policies.【F:supabase/migrations/20250925000000_membership_stage_center_features.sql†L137-L400】
- Stage history and household drawers render chronological logs with filters, CSV exports, and inline notes, powered by the new repository methods from Phase 1.【F:supabase/migrations/20250927010000_membership_profile_normalization.sql†L17-L172】
- UX copy communicates giving deferral within the profile (e.g., “Financial insights coming with StewardTrack Finance”) to set expectations transparently.【F:metadata/authoring/blueprints/admin-community/membership-profile.xml†L360-L508】

#### UX Experience Notes
- Deliver high-fidelity mocks for dashboard cards, admin tables, and profile drawers, including responsive states and a11y annotations (focus order, keyboard navigation, aria labels).
- Conduct design reviews with ministry stakeholders to validate that workflows (e.g., completing a care task) minimize clicks and respect mental models (timeline first, then actions).

#### Technical Implementation Details
- Update metadata XML to reference the new handler IDs, keeping fallback `<Data>` elements for resilience and documenting them inline with comments.
- Implement reusable table components/drawers leveraging existing admin layout primitives to maintain consistency and reduce engineering lift.
- Use React Query (or existing data hooks) with caching keys aligned to member IDs to prevent redundant Supabase calls across panels.
- Ensure Supabase Row Level Security policies accommodate new routes by adding role-based policies for ministry leads where needed.

#### Phase Exit Criteria
- End-to-end smoke tests (manual or automated) verify create/edit/delete flows for centers, care plans, serving assignments, and discipleship milestones.
- Accessibility spot check passes keyboard-only navigation and screen reader announcements for new components.
- Stakeholder demo captures qualitative feedback and approval before moving to Phase 3.

### Phase 3 – Quality, UX Polish, and Telemetry

#### User Story P3
> **As a product owner, I need automated quality gates, telemetry, and UX refinements in place so the live membership experience remains trustworthy and measurable after launch.**

#### Acceptance Criteria
- Automated test suite includes Playwright journeys for dashboard loading, CRUD modals, and profile interactions, plus Jest/RTL specs covering handler fallbacks and error toasts.【F:src/components/dynamic/admin/useAdminFormController.ts†L1-L120】
- Observability hooks emit timing and error metrics for each handler (e.g., `membership.dashboard.load_time_ms`) with dashboards documented for support teams.
- UX polish tasks (microcopy, spacing, iconography) applied per design QA checklist; accessibility review ensures WCAG 2.1 AA compliance for contrast, focus, and semantic structure.
- Release notes and in-app announcements inform users of the new functionality and reiterate the giving roadmap dependency.

#### UX Experience Notes
- QA checklist includes voiceover/NVDA run-throughs, dark mode screenshots, and confirmation that timestamp copy is human-readable (“Updated 5 minutes ago”).
- Telemetry dashboards surfaced to UX research so they can track adoption and identify friction for future iterations.

#### Technical Implementation Details
- Integrate telemetry via existing logging utilities or add a lightweight analytics hook that publishes to the platform’s observability pipeline, ensuring no PII is captured.
- Add CI gates to run new test suites and enforce minimum coverage thresholds for handlers and React components.
- Document rollback steps and feature flag toggles so operations can disable new panels if performance issues arise.

#### Phase Exit Criteria
- All tests pass in CI, coverage thresholds met, and error budgets defined with alerting rules.
- Support documentation and runbooks updated with troubleshooting guidance for dashboard data freshness and CRUD failures.

---
**Next Steps:** Socialize Phase 1 handler contracts with engineering and data stakeholders, schedule UX working sessions for Phase 2 mocks, and align QA resources early to prepare for the expanded Phase 3 automation scope.
