# StewardTrack Super Admin Control Center User Stories

## Epic 1: Tenant Onboarding & Provisioning

### US1.1 – Start Signup Wizard
- **As** a prospective tenant owner
- **I want** to access a public signup page that guides me through account creation
- **So that** I can begin the process of provisioning my organization's StewardTrack workspace.
- **Acceptance Criteria**
  - Public `/signup` route is accessible without authentication.
  - Wizard provides clear progress indicator across all steps.
  - Form persists partially completed data between steps.
  - Given a user refreshes the browser mid-flow, when they return within 24 hours, then their previously entered data is restored from secure storage.
  - All interactive elements meet WCAG 2.1 AA accessibility requirements, including focus order and keyboard navigation.
  - Telemetry events capture step start, completion, and abandonment so funnel drop-off can be analyzed.

### US1.2 – Provide Tenant & Admin Details
- **As** a prospective tenant owner
- **I want** to enter tenant profile data, primary admin contact details, and domain preferences
- **So that** the platform can create a customized tenant space.
- **Acceptance Criteria**
  - Validation ensures unique tenant slug and required fields (name, email, password) are provided.
  - Errors are displayed inline with accessible messaging.
  - Submitted data is encrypted in transit and stored securely.
  - Given an attempted tenant slug conflict, when the user submits, then a suggestion list of available slugs is presented without clearing valid fields.
  - Required legal agreements (terms of service, privacy policy) must be explicitly accepted before progressing.
  - Audit logs capture the initial admin identity and originating IP address for compliance tracking.

### US1.3 – Select License Package
- **As** a prospective tenant owner
- **I want** to review available subscription packages and select the one that fits my needs
- **So that** the correct features and limits apply to my tenant from day one.
- **Acceptance Criteria**
  - Package cards display price, included features, and limits.
  - Selection persists to confirmation step and seeds Supabase RPC for provisioning.
  - System enforces package availability based on tenant size or industry rules.
  - Given pricing is sourced from Stripe, when the catalog is refreshed, then package details update without requiring deployment.
  - Upsell recommendations surface when feature requirements exceed the currently selected package.
  - Analytics attribute package selections to the marketing campaign or referral code captured earlier in the flow.

### US1.4 – Confirm & Provision Tenant
- **As** a prospective tenant owner
- **I want** to review my selections and trigger provisioning
- **So that** my tenant is created and I receive admin access.
- **Acceptance Criteria**
  - Confirmation step summarizes tenant info, package, and billing preferences.
  - Calling Supabase registration RPC creates tenant, assigns `super_admin` role, and seeds feature grants.
  - Success screen provides next steps and link to admin delegation tools.
  - Provisioning errors are surfaced with retry guidance and automatically logged to the incident management channel.
  - Given the RPC succeeds, when the admin first lands in-app, then a welcome tour checklist is available within the dashboard.
  - Email receipts and verification messages are dispatched within one minute of successful provisioning.

### US1.5 – Receive Onboarding Guidance
- **As** the first tenant admin
- **I want** contextual guidance on setting up additional users and configurations
- **So that** I can delegate access quickly.
- **Acceptance Criteria**
  - Post-registration screen links to delegation console and relevant docs.
  - Email notifications include onboarding checklist.
  - Analytics capture completion of delegation tasks.
  - In-app banner persists until all required onboarding actions are complete or dismissed by an authorized admin.
  - Support contact options (chat, ticket form) are embedded for quick assistance.
  - Given onboarding is incomplete after seven days, when reminder cadence triggers, then automated nudges are sent to the primary admin.

## Epic 2: Licensing & Feature Management

### US2.1 – View Feature Catalog
- **As** a super admin operator
- **I want** to browse the global catalog of features and packages
- **So that** I understand current offerings and dependencies.
- **Acceptance Criteria**
  - `/admin/super/licenses` lists feature packages with searchable/sortable table.
  - Individual feature items display description, tags, and linked feature gates.
  - Data loads via authenticated API using Supabase RPCs.
  - Table supports column-level filtering (status, market availability) with persisted preferences per operator.
  - Empty states provide quick actions to create the first package or import from CSV.
  - Loading, error, and permission states are visually distinct and covered by unit tests.

### US2.2 – Create or Update Feature Package
- **As** a super admin operator
- **I want** to create new packages or adjust existing ones
- **So that** we can iterate on product offerings.
- **Acceptance Criteria**
  - Form supports creating package metadata, pricing, and included features.
  - Updates trigger audit logging and refresh of effective permissions.
  - Validation prevents removal of required base features.
  - Draft changes can be saved without publishing to tenants, with review workflows for other admins.
  - Pricing inputs support localization (currency, tax treatments) and sync to billing provider APIs.
  - Unit tests verify Supabase RPC contracts and error handling for optimistic updates.

### US2.3 – Assign Package to Tenant
- **As** a super admin operator
- **I want** to grant a specific feature package to a tenant
- **So that** their license matches contractual agreements.
- **Acceptance Criteria**
  - Tenant picker lists active tenants with search/filter.
  - Assign action calls Supabase RPC and updates UI optimistically.
  - Audit log entry records actor, tenant, package, timestamp.
  - Bulk assignment flow allows applying packages to multiple tenants with preview of impacted features.
  - Guardrails warn when downgrading would remove critical features currently in use.
  - Notification emails/slack alerts are sent to tenant admins summarizing the change.

### US2.4 – Review Licensing History
- **As** a compliance officer
- **I want** to inspect historical license changes for a tenant
- **So that** I can resolve disputes or audits.
- **Acceptance Criteria**
  - Timeline view shows package assignments, removals, and overrides.
  - Entries link to audit log records stored in Supabase.
  - Export to CSV is available for external review.
  - Filters support event type, actor role, and effective date ranges.
  - Historical comparison view highlights differences between two selected snapshots.
  - Audit data retention policy (minimum 7 years) is documented and enforced.

## Epic 3: Subscription Management

### US3.1 – Monitor Subscription Health
- **As** a super admin operator
- **I want** to view usage metrics vs plan limits across all tenants
- **So that** I can identify accounts nearing overage.
- **Acceptance Criteria**
  - Dashboard displays plan distribution, utilization percentages, and alerts.
  - Data refreshes within 15 minutes of change.
  - Filters by package, region, lifecycle stage.
  - Alert thresholds are configurable per operator and persist to Supabase metadata tables.
  - Widgets support drill-down into individual tenant detail pages without losing filter context.
  - Performance budgets ensure charts render within 1.5 seconds on p95 requests.

### US3.2 – Upgrade or Downgrade Subscription
- **As** a super admin operator
- **I want** to adjust a tenant’s subscription tier with proper guardrails
- **So that** changes align with support agreements.
- **Acceptance Criteria**
  - Upgrade/downgrade modal enforces confirmation and notes.
  - Supabase RPC logs action and emits billing updates.
  - System prevents downgrades that would violate current usage limits.
  - Scheduling options allow future-dated plan changes with preview of billing impact.
  - Given the operator lacks billing permissions, when attempting the action, then a clear RBAC error appears.
  - Automated regression tests cover upgrade/downgrade flows including rollback on failure.

### US3.3 – View Subscription History
- **As** a finance analyst
- **I want** to review a tenant’s subscription history and billing adjustments
- **So that** I can reconcile invoices.
- **Acceptance Criteria**
  - History table shows previous plans, effective dates, actors, and billing references.
  - Export and API access available for finance systems.
  - Data integrity checks ensure no gaps in timeline.
  - Visual diff highlights pricing changes and add-on adjustments between periods.
  - Webhooks notify downstream finance tools when new history entries are recorded.
  - Retention policies comply with financial record-keeping requirements (minimum 7 years).

## Epic 4: Tenant Analytics & Reporting

### US4.1 – View Tenant Growth Metrics
- **As** a super admin operator
- **I want** to see trends in tenant signups, activations, and churn
- **So that** I can monitor platform health.
- **Acceptance Criteria**
  - Line charts display daily/weekly counts with comparison period.
  - Filters allow segmentation by package, industry, or geography.
  - Data sourced from reporting views with <500ms API latency p95.
  - Trend insights call out statistically significant increases or decreases week-over-week.
  - Data exports respect applied filters and include metadata about extraction time and operator.
  - Historical baselines are stored to enable SLA tracking for growth targets.

### US4.2 – Monitor Feature Adoption
- **As** a product manager
- **I want** to analyze which features are most used across tenants
- **So that** we can prioritize roadmap investments.
- **Acceptance Criteria**
  - Heatmap visualizes feature usage vs package tier.
  - Ability to export dataset for deeper analysis.
  - Highlights top underutilized features for follow-up.
  - Drill-down reveals tenant cohorts contributing to usage trends with anonymized identifiers.
  - Tooltips surface definitions and last updated timestamps for each metric.
  - Product feedback quick links allow operators to flag features needing qualitative research.

### US4.3 – Track Support & Compliance Signals
- **As** a support lead
- **I want** visibility into tenants with high support volume or compliance flags
- **So that** we can proactively intervene.
- **Acceptance Criteria**
  - Dashboard widget surfaces tickets per tenant, SLA breaches, compliance alerts.
  - Drill-down links to existing support tooling.
  - Alerts configurable for threshold breaches.
  - Incident correlation view associates support spikes with recent releases or plan changes.
  - Data privacy rules ensure only aggregated or de-identified information is shown to non-support roles.
  - Notifications can be routed to PagerDuty/Slack channels with per-signal configuration.

## Epic 5: Delegation & Access Governance

### US5.1 – Manage Admin Delegation
- **As** a tenant super admin
- **I want** to assign additional administrators and roles
- **So that** I can distribute operational responsibilities.
- **Acceptance Criteria**
  - Delegation console lists users, roles, and license bundles.
  - Supports inviting new admins with role presets.
  - Audit logs record changes to admin assignments.
  - Given a role includes restricted scopes, when assigned, then the assignee receives contextual training material links.
  - Invitations expire after configurable durations with automatic reminders to pending invitees.
  - Bulk role updates include preview of permissions being added or removed per user before confirmation.

### US5.2 – Enforce Feature-Based Access
- **As** a security engineer
- **I want** to ensure only licensed tenants access gated surfaces
- **So that** compliance is maintained.
- **Acceptance Criteria**
  - RBAC bindings updated automatically after license changes.
  - Unauthorized requests are blocked with informative messaging.
  - Monitoring detects and alerts on failed access attempts.
  - Feature gating logic is covered by unit/integration tests across web UI, API routes, and Supabase policies.
  - System maintains a catalog of feature-to-surface mappings for easy auditing.
  - Given an operator toggles a feature flag off, when a tenant requests the surface, then fallbacks render gracefully without exposing internal errors.

### US5.3 – View Delegation Activity Logs
- **As** a compliance officer
- **I want** to review a log of delegation actions
- **So that** we can confirm proper controls are in place.
- **Acceptance Criteria**
  - Activity log includes actor, action, target user, role, timestamp.
  - Supports filtering by tenant and date range.
  - Export for audits.
  - Logs are immutable once written, with append-only storage and tamper-evident hashing.
  - Drill-through opens the corresponding RBAC audit entry and any associated support ticket.
  - Retention policies align with corporate compliance requirements (minimum 5 years) and are automated.

## Epic 6: Platform Operations

### US6.1 – Monitor System Health
- **As** a platform operator
- **I want** operational dashboards for RPC latency, error rates, and background jobs
- **So that** I can keep the platform reliable.
- **Acceptance Criteria**
  - Observability dashboards updated with new metrics for super admin features.
  - Alerting thresholds configured for critical KPIs.
  - Runbooks documented for incident response.
  - Health checks monitor Supabase function latency, API error rates, and frontend availability from multiple regions.
  - Incident postmortems are templated and linked directly from the dashboard for rapid follow-up.
  - Disaster recovery drills include restoring a snapshot of admin configuration data.

### US6.2 – Manage Feature Flags
- **As** a release manager
- **I want** to toggle new admin modules via feature flags
- **So that** rollout can be phased safely.
- **Acceptance Criteria**
  - Feature flag states visible in admin console.
  - Changes propagate within 5 minutes across environments.
  - Audit log records flag updates.
  - Role-based permissions determine who can toggle flags vs. who can only view state.
  - Scheduling feature supports auto-expiring experiments with notifications prior to sunset.
  - Integration tests validate environment-specific overrides (dev, staging, prod).

### US6.3 – Conduct Security Reviews
- **As** a security lead
- **I want** to review new RPCs, API endpoints, and surfaces for vulnerabilities
- **So that** we maintain compliance and protect tenant data.
- **Acceptance Criteria**
  - Security checklist completed before production launch.
  - Penetration testing performed on admin endpoints.
  - All findings resolved or mitigated prior to general availability.
  - Threat modeling documents cover abuse cases for each new RPC and UI surface.
  - Static analysis and dependency scanning run in CI with gating thresholds.
  - Compliance sign-off (SOC2/ISO) recorded with evidence links in the security tracker.

