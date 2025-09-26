# StewardTrack Super Admin Control Center Software Delivery Plan

## 1. Overview
This document elaborates on the software development execution required to deliver the super admin control center, onboarding flow, and tenant lifecycle tooling described in the implementation plan. It translates strategic goals into engineering-ready milestones, environments, quality gates, and operational checklists.

## 2. Workstreams & Milestones

### 2.1 Workstream A – Experience Foundations (Weeks 1-4)
- **A1. Information Architecture & Navigation (Week 1)**
  - Audit existing `/admin` routes and layout components.
  - Define new `/admin/super` layout variant, breadcrumbs, and navigation groups.
  - Establish design tokens and Tailwind patterns for admin widgets.
- **A2. Design System Extensions (Week 1-2)**
  - Add reusable components: metric cards, package editors, onboarding wizard steps.
  - Update Storybook and visual regression tests.
- **A3. API Access Layer Setup (Week 2-3)**
  - Scaffold `/api/admin/super/*` handler structure with authentication and RBAC middleware.
  - Implement shared Supabase client util for privileged RPC calls.
- **A4. Telemetry & Error Handling (Week 3-4)**
  - Integrate logging middleware for API routes.
  - Add Sentry instrumentation for frontend and server actions.

### 2.2 Workstream B – Signup & Onboarding (Weeks 2-6)
- **B1. UX & Validation (Week 2-3)**
  - Implement multi-step `/signup` wizard with React Hook Form and Zod schemas.
  - Support tenant profile, admin details, package selection, and billing info capture.
- **B2. Supabase Integration (Week 3-4)**
  - Call `AuthService.handleNewTenantRegistration` via server actions.
  - Seed feature grants and subscription records using new RPCs.
- **B3. Post-Provisioning Experience (Week 4-5)**
  - Route first admin to delegation console with contextual tips.
  - Trigger welcome emails and audit entries.
- **B4. QA & Automation (Week 5-6)**
  - Write Cypress onboarding flow tests and pgTap coverage for registration functions.
  - Conduct accessibility audit (axe) for the wizard.

### 2.3 Workstream C – Licensing Studio (Weeks 4-9)
- **C1. Supabase Schema Enhancements (Week 4-5)**
  - Create RPCs: `create_feature_package`, `update_feature_package`, `assign_tenant_feature_package`, `list_feature_catalog`.
  - Add audit triggers and history tables (`feature_package_audit`).
- **C2. API Endpoints (Week 5-6)**
  - Implement CRUD endpoints calling the new RPCs with `super_admin` checks.
  - Provide optimistic concurrency using `updated_at` timestamps.
- **C3. UI Implementation (Week 6-8)**
  - Build package list, detail editors, feature matrix, and grant assignment flows.
  - Include inline analytics (tenant counts per package, feature utilization badges).
- **C4. Documentation & Training (Week 8-9)**
  - Produce runbooks for granting licenses, handling rollbacks, and auditing changes.

### 2.4 Workstream D – Subscription Control (Weeks 6-10)
- **D1. Supabase Functions (Week 6-7)**
  - Add `super_update_tenant_subscription` RPC with guardrails and audit logging.
  - Create `tenant_subscription_history` table with triggers.
- **D2. Usage Data Pipeline (Week 7-8)**
  - Extend `SubscriptionService` to fetch cross-tenant counts from reporting views.
  - Implement caching strategy for expensive aggregations.
- **D3. UI & Workflows (Week 8-9)**
  - Build dashboard with plan distribution charts, upgrade/downgrade modals, and confirmation flows.
  - Integrate Stripe/Billing adapters for payment adjustments.
- **D4. Testing & Rollout (Week 9-10)**
  - Create integration tests for plan changes and billing synchronization.
  - Perform staged rollout behind feature flag `superAdmin.subscriptionControl`.

### 2.5 Workstream E – Tenant Insights & Reporting (Weeks 8-12)
- **E1. Data Modeling (Week 8-9)**
  - Publish reporting views: `tenant_daily_summary`, `tenant_usage_overages`, `package_adoption_trends`.
  - Schedule refresh policies/materialized views where necessary.
- **E2. API & Caching (Week 9-10)**
  - Implement paginated API endpoints for analytics queries with filter support.
  - Add Redis-based cache invalidation tied to Supabase NOTIFY triggers.
- **E3. Visualization (Week 10-11)**
  - Build charts (line, bar, heatmap) using `@nivo` or Recharts.
  - Provide CSV export and saved filter presets.
- **E4. Observability & Alerts (Week 11-12)**
  - Hook metrics into existing monitoring stack (Datadog/Grafana) with SLIs for RPC latency and error rates.

### 2.6 Incremental Release Slices
- **Increment 0 – Foundational Shell (Weeks 1-2)**
  - Ship `/admin/super` navigation shell with placeholder cards surfaced behind feature flag `superAdmin.shell`.
  - Validate RBAC gating and logging middleware in production-like preview.
- **Increment 1 – Guided Signup (Week 4 launch window)**
  - Enable `/signup` wizard end-to-end for selected tenants, including tenant creation and initial grant seeding.
  - Release accompanying onboarding telemetry dashboard with read-only metrics while licensing tooling remains hidden.
- **Increment 2 – Licensing Studio Read/Write (Week 7 launch window)**
  - Expose package CRUD and tenant grant assignment to super admins, with audit history and rollback scripts verified.
  - Keep subscription overrides disabled to limit early surface area; monitor license adoption metrics.
- **Increment 3 – Subscription Overrides (Week 9 launch window)**
  - Allow controlled set of operators to adjust tenant plans and sync with billing sandbox before production rollout.
  - Backstop with integration tests and staged feature flag expansion per tenant cohort.
- **Increment 4 – Analytics & Alerts (Week 12 launch window)**
  - Deliver cross-tenant insights dashboards, CSV export, and alerting hooks.
  - Conclude rollout by enabling all super admin flags once performance SLIs are met.

## 3. Environment Strategy
- **Local Development**: Supabase local stack with seeded tenants, packages, and feature catalogs; enable mocked billing provider.
- **Preview Environments**: Vercel preview for each PR, Supabase branch database seeded via migration scripts, feature flags set to enable super admin pages for test users.
- **Staging**: Mirror production RBAC roles, run load tests on reporting views, integrate with actual billing sandbox.
- **Production**: Gradual feature flag rollout, additional monitoring dashboards for RPC latency and onboarding funnel.

## 4. Dependencies & Integrations
- Alignment with design team for admin UX patterns.
- Stripe/Billing team for plan changes and proration behavior.
- Security review for new RPCs and cross-tenant data access.
- Documentation team for operator runbooks and onboarding guides.

## 5. Quality Assurance Plan
- **Code Quality**: Enforce ESLint, Prettier, TypeScript strict mode, and Storybook visual regression tests.
- **Automated Testing**: Unit tests (Jest) for UI components, pgTap for Supabase functions, Cypress for end-to-end onboarding and admin workflows.
- **Manual Testing**: Exploratory sessions covering edge cases (failed registration, conflicting feature packages, billing errors).
- **Accessibility**: WCAG 2.1 AA compliance via axe scans and manual keyboard testing.
- **Performance**: Lighthouse audits for `/signup` and admin pages; monitor API latency thresholds (<300ms p95 for CRUD, <500ms p95 for analytics).

## 6. Release Management
- Feature flags: `superAdmin.licensing`, `superAdmin.subscriptionControl`, `superAdmin.analytics`, `public.signupWizard`.
- CI/CD: GitHub Actions pipeline running lint, test, Supabase migrations, and deploy previews.
- Change control: require architectural review for RPC changes, security review before enabling cross-tenant data queries.
- Rollback plan: ability to disable feature flags, revert Supabase migrations with down scripts, and restore audit snapshots.

## 7. Resource Allocation
- **Engineering**: 2 frontend engineers, 1 full-stack engineer, 1 Supabase specialist, 1 QA automation engineer.
- **Design**: 1 product designer, 1 UX researcher (part-time).
- **Product/Program**: 1 product manager, 1 delivery lead.
- **Support**: Technical writer for documentation, DevOps for monitoring integration.

## 8. Timeline Summary
| Increment | Duration | Release Goal | Key Deliverables |
| --- | --- | --- | --- |
| Increment 0 | Weeks 1-2 | Ship shell to limited operators | `/admin/super` layout, RBAC gating, logging middleware |
| Increment 1 | Weeks 3-4 | Enable guided signup pilot | `/signup` wizard MVP, onboarding telemetry, welcome comms |
| Increment 2 | Weeks 5-7 | Deliver licensing CRUD | Supabase RPCs, CRUD UI, audit/rollback docs |
| Increment 3 | Weeks 7-9 | Activate subscription overrides | Override RPC, billing integration, integration tests |
| Increment 4 | Weeks 9-12 | Launch analytics suite | Reporting views, dashboards, alerts & exports |
| Ongoing | Continuous | Sustain quality gates | Automated tests, accessibility sweeps, release governance |

## 9. Risks & Mitigations
- **Supabase Performance Bottlenecks**: Conduct load testing early; leverage materialized views and caching.
- **Billing Integration Complexity**: Coordinate with finance; add mock providers for testing.
- **Scope Creep**: Maintain change control board; only admit new features post-MVP.
- **Security Incidents**: Implement rigorous RBAC checks, audit logging, and security testing before launch.

## 10. Success Metrics
- Signup conversion rate ≥ 60% from start to completion of wizard.
- Admin satisfaction score ≥ 8/10 during beta feedback.
- Reduction in manual subscription adjustments by 80% after launch.
- Error rate for new RPCs < 0.1% over rolling 7-day window.

