# Membership Module Modernization User Stories

These user stories break down the modernization roadmap into incremental slices for delivery. Each story references the underlying architectural context captured in the membership module development plan and is organized by the phased roadmap.

## Phase 1 – Data & Insights Foundation

### Epic: Ship trustworthy membership insights

1. **Story: Dashboard hero metrics surface live data**  
   *As a campus or global admin, I want the membership dashboard hero cards to show tenant-specific live counts so that I can trust what I see when I open the workspace.*  
   **Acceptance criteria**  
   - Hero cards display the same totals as the corresponding Supabase queries for the signed-in tenant (active members, pending members, first-time guests, pastoral follow-ups).  
   - The metadata blueprint pulls numbers from the `MembersDashboardService` via dynamic bindings; no hard-coded placeholders remain.  
   - Error states display a fallback message and log telemetry if the service call fails.  
   - Unit tests cover successful and failed data hydration paths.

2. **Story: KPI quick links align with real counts**  
   *As an admin, I want the quick links under the hero cards to reflect accurate counts for common segments so that I know which cohorts need action.*  
   **Acceptance criteria**  
   - Quick link labels show live counts (e.g., "New this week (12)").  
   - Clicking a quick link applies the corresponding filters in the roster view.  
   - Analytics events record the quick link interactions with the selected segment.

3. **Story: Roster grid shows household and generosity data**  
   *As a pastoral staff member, I want to see household membership, giving year-to-date, and care tags in the roster table so that I can prioritize outreach.*  
   **Acceptance criteria**  
   - Grid rows surface household name, household role, giving YTD, and care plan tags.  
   - Values hydrate from combined `MembersDashboardService` and `MemberService.getFinancialTotals` responses.  
   - Rows render gracefully for members without giving history or care plans.  
   - Column visibility is configurable through metadata and persists per admin preference.

4. **Story: Filter drawer uses dynamic Supabase options**  
   *As an admin, I want the filter drawer options for stage, type, campus, and assimilation status to stay in sync with our configuration so that I can segment easily.*  
   **Acceptance criteria**  
   - Filter options hydrate at load from Supabase lookup tables.  
   - Selecting filters immediately updates the roster counts and applied chips.  
   - URL query parameters reflect the selected filters for easy sharing.  
   - Empty state messages appear when filters return zero members.

5. **Story: Membership telemetry baseline captured**  
   *As the product team, we want to capture key telemetry so that we can measure adoption of the new insights surfaces.*  
   **Acceptance criteria**  
   - Events fire when hero metrics render, filters run, quick links are clicked, and care follow-ups open.  
   - Latency metrics are recorded for each membership data service call.  
   - Dashboards exist in the observability stack to track adoption and performance baselines.

## Phase 2 – Engagement & Assimilation Workflows

### Epic: Automate guest-to-member journey

6. **Story: Member timeline surfaces stage history**  
   *As a discipleship pastor, I want to see a chronological timeline of a member’s assimilation stages so that I can understand their journey at a glance.*  
   **Acceptance criteria**  
   - Timeline component loads stage changes, contact attempts, and pastoral notes from Supabase.  
   - Entries differentiate automated vs. manual actions.  
   - Timeline updates in real time when a new action is logged.  
   - Printable view retains the same ordering and content.

7. **Story: Stage automations send templated communications**  
   *As a connections director, I want each assimilation stage to trigger recommended touchpoints so that guests progress without manual coordination.*  
   **Acceptance criteria**  
   - Admins can configure default email, SMS, and task templates per stage via metadata.  
   - Supabase functions queue or send communications when a member enters a stage.  
   - Admins can pause or override automations for specific members.  
   - Audit logs capture every automated communication with status outcomes.

8. **Story: Manage workspace suggests next steps**  
   *As a pastoral care coordinator, I want the manage member form to recommend serving teams, care plans, and discipleship steps so that I can guide members quickly.*  
   **Acceptance criteria**  
   - Metadata-driven suggestion panels show top recommendations based on rules (e.g., interests, current stage, household status).  
   - Accepting a suggestion writes the appropriate records (serving assignment, care follow-up, class enrollment).  
   - Suggestions adapt as member data changes.  
   - Admins can dismiss suggestions with reason codes for feedback.

9. **Story: Household dashboards highlight family progress**  
   *As a family pastor, I want the household view to consolidate membership progress so that I can coach families together.*  
   **Acceptance criteria**  
   - Household summary cards display aggregate attendance, giving, and assimilation stage mix.  
   - Clicking into a household member opens their manage workspace tab in-context.  
   - Permissions ensure only staff assigned to the household’s campus can access sensitive data.  
   - Household reports export to CSV with the new columns.

## Phase 3 – Multi-site Scale & Predictive Insights

### Epic: Equip multi-site leadership with predictive guidance

10. **Story: Campus switcher scopes dashboard metrics**  
    *As a campus pastor, I want to toggle the dashboard to my campus so that I can review localized insights without losing global context.*  
    **Acceptance criteria**  
    - Campus selector appears for tenants with multiple centers; single-campus tenants default silently.  
    - Selecting a campus refreshes hero metrics, roster filters, and quick links to that context.  
    - Global admins can view aggregated data across all campuses.  
    - Campus selection persists between sessions for each user.

11. **Story: Delegated access controls align with roles**  
    *As an enterprise administrator, I want to grant ministry leaders access only to relevant members so that sensitive data stays protected.*  
    **Acceptance criteria**  
    - RBAC policies in Supabase restrict roster queries to assigned campuses or ministries.  
    - Metadata blueprints respect the scoped data, hiding actions the user cannot take.  
    - Access changes propagate within five minutes without requiring redeploys.  
    - Audit reports list membership records viewed or edited per role.

12. **Story: Predictive badges highlight at-risk members**  
    *As a care pastor, I want to see churn-risk and volunteer-readiness indicators on members so that I can intervene proactively.*  
    **Acceptance criteria**  
    - Predictive scores calculate nightly using defined data inputs (attendance gap, giving decline, engagement history).  
    - Roster rows display badges with tooltips explaining the drivers.  
    - Care follow-up queues sort by risk tier when desired.  
    - Model performance metrics (precision/recall) are monitored and visible to product.

13. **Story: Mobile pastoral console supports on-the-go care**  
    *As a mobile campus pastor, I want a streamlined membership console on my tablet or phone so that I can record follow-ups in the field.*  
    **Acceptance criteria**  
    - Responsive metadata layouts deliver a simplified roster, timeline, and quick action buttons on small screens.  
    - Offline-friendly caching lets staff draft notes without immediate connectivity.  
    - Biometric login or passcode protects mobile access.  
    - Telemetry distinguishes mobile usage to inform future investments.

## Cross-cutting Initiatives

14. **Story: Data hygiene rules keep imports consistent**  
    *As a data steward, I want automated validation on member imports so that we maintain a clean system of record.*  
    **Acceptance criteria**  
    - Validation scripts run during batch imports to flag duplicates, missing consent, and invalid contact data.  
    - Admins receive actionable error reports with suggested corrections.  
    - Successful imports log to an audit table with metadata version applied.  
    - CI pipeline includes tests for the validator logic.

15. **Story: Consent tracking meets compliance standards**  
    *As the compliance officer, I need membership data to reflect explicit consent states so that we satisfy GDPR/CCPA requirements.*  
    **Acceptance criteria**  
    - Consent capture forms store timestamped records linked to communications preferences.  
    - Reporting surfaces members lacking required consents.  
    - Data export API respects consent flags when generating lists.  
    - Privacy policy updates propagate to consent forms without code changes.

16. **Story: Admin documentation enables self-service configuration**  
    *As an implementation specialist, I want clear guides for configuring metadata layouts and automations so that churches can adapt the module without engineering help.*  
    **Acceptance criteria**  
    - Step-by-step guides cover dashboard widgets, automation templates, and RBAC configuration.  
    - Documentation lives alongside metadata repositories with version history.  
    - Example metadata bundles for small, medium, and large churches are published.  
    - Feedback loop exists for churches to request doc updates.

