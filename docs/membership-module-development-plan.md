# Membership Module Modernization Plan

## Executive Summary
The membership workspace already exposes comprehensive pastoral data through a metadata-driven admin experience, yet most dashboard and workflow surfaces are powered by placeholder payloads. Converting those insights to live Supabase sources, automating assimilation pipelines, and layering collaborative tooling will unlock measurable value for congregations of every size.

## Current Module Evaluation
- **Metadata-first architecture** – Membership routes resolve XML blueprints at request time using tenant, locale, and feature-flag context, allowing teams to ship layout enhancements without shipping new React bundles.
- **Mapped UI surfaces** – Dashboard and list blueprints define hero panels, KPI cards, quick links, and roster grids that only need dynamic data bindings to become production ready.
- **Service-layer plumbing** – Existing repositories and adapters already wrap Supabase queries for metrics, directories, birthdays, and filter lookups, making them natural sources for metadata hydration.
- **Rich member domain model** – Member records include contact profiles, discipleship pathways, serving roles, care plans, and giving data, providing the structure required for holistic pastoral workflows once surfaced in the UI.
- **Manage workspace scaffolding** – Metadata manage forms hydrate from lookup groups and existing fragments, so improving data pipelines will immediately enrich editing experiences.
- **Key gaps** – Hero stats, segment cards, and grid enrichments remain hard coded, while household and giving rollups return zero values despite available financial services.

## Market and Trend Signals
- Churches expect automated assimilation pipelines that shepherd first-time guests toward covenant membership with templated communications and stage tracking.
- Hybrid discipleship models (in-person + digital) demand mobile-friendly touchpoints, volunteer scheduling, and integrations with messaging platforms.
- Financial transparency and generosity coaching depend on consolidated dashboards connecting pledges, recurring giving, and care status in one view.
- Data privacy, consent tracking, and delegated pastoral access control remain top-of-mind as congregations adopt modern SaaS tools.

## Module Development Plan

### Phase 1 – Data & Insights Foundation (4–6 weeks)
1. **Wire live metrics into metadata** – Replace static hero/KPI payloads in dashboard and list blueprints with service-backed data sources, using existing adapter methods per tenant.
2. **Augment member grid rows** – Extend the `resolveMembersTable` pipeline to include household membership, giving YTD, and care tags by composing `MembersDashboardService` with `MemberService.getFinancialTotals` before shaping row data.
3. **Real-time filters and counts** – Add Supabase-backed filter definitions (stage, type, center, assimilation status) so admins can segment quickly; leverage active stage/type services for option hydration.
4. **Instrumentation & observability** – Emit analytics events when admins run filters or open care follow-ups to measure adoption; capture latency from adapter calls for baseline SLOs.

**Deliverables**: updated metadata sources, enhanced services, dashboards using production data, telemetry dashboard.

### Phase 2 – Engagement & Assimilation Workflows (6–8 weeks)
1. **Pipeline orchestration** – Introduce a membership journey timeline combining stage history with automation triggers, surfacing inside the existing care timeline component once live data feeds are available.
2. **Automation templates** – Provide configurable touchpoint cadences (emails, tasks, SMS hooks) per stage. Store templates via metadata so Supabase functions send actual communications.
3. **Care & serving alignment** – Expand manage workspace sections to auto-suggest serving roles, care assignments, and discipleship next steps using rule-based recommendations bound through metadata expressions.
4. **Household collaboration** – Enable household rollups in the grid and dashboards so pastoral staff can prioritize ministry to families; reuse household relationship services.

**Deliverables**: assimilation pipeline UI, automated reminders, enriched manage form, household-first dashboards.

### Phase 3 – Scaling for Multi-site & Advanced Analytics (6–8 weeks)
1. **Campus-aware dashboards** – Layer per-center aggregations (attendance, giving, assimilation velocity) and allow switching contexts in hero metrics while preserving tenant isolation.
2. **Delegated pastoral access** – Implement granular RBAC overlays so campus pastors, ministry directors, and finance teams see tailored slices of the membership workspace.
3. **Predictive insights** – Train simple propensity scores (e.g., churn risk, volunteer readiness) using existing data fields and display inside dashboards or roster tags once validated.
4. **Mobile-first pastoral console** – Author condensed metadata blueprints for tablets and phones, enabling on-the-go check-ins and follow-up logging.

**Deliverables**: multi-site toggles, RBAC overlays, predictive badges, responsive metadata layouts.

## Cross-Cutting Initiatives
- **Data hygiene & migration** – Define validation rules and batch scripts using the existing validator framework to keep legacy imports consistent.
- **Security & compliance** – Audit Supabase policies for membership tables and ensure GDPR/CCPA-ready consent tracking before public launch.
- **Documentation & training** – Provide metadata authoring playbooks so church admins can extend layouts without developer involvement.

## Adoption Path by Church Size
- **Small churches** – Start with Phase 1 dashboards and manual assimilation tasks; offer preconfigured stage/type sets and simplified manage forms.
- **Medium churches** – Layer in Phase 2 automation templates, volunteer recommendations, and multi-staff collaboration flows.
- **Large multi-site churches** – Prioritize Phase 3 campus analytics, delegated access controls, and predictive insights to coordinate across campuses.

## Testing
⚠️ Not run (analysis-only planning exercise).
