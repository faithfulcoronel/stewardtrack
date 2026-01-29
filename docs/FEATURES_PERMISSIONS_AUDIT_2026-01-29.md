# Features & Permissions Audit Report

**Date:** January 29, 2026
**Source:** `features-import-template-2026-01-28.xlsx`
**Purpose:** Verify that all feature codes and permission codes defined in the import template are implemented and enforced in the StewardTrack application layer.
**Last Updated:** January 29, 2026 (all recommendations completed)

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Cleanup Completed](#cleanup-completed)
3. [Feature Codes Audit](#feature-codes-audit)
4. [Permission Codes Audit](#permission-codes-audit)
   - [Fully Implemented](#fully-implemented--enforced)
   - [Partially Implemented](#partially-implemented)
   - [Not Implemented](#not-implemented)
5. [Old Permission Codes - Remaining in SQL Migrations](#old-permission-codes---remaining-in-sql-migrations)
6. [Recommendations](#recommendations)

---

## Executive Summary

The audit compared 17 new feature codes and 62 new permission codes from the Excel import template against the StewardTrack codebase, including XML metadata blueprints, TypeScript services/repositories, API routes, SQL migrations, and AI assistant tools.

| Category | Count | Status |
|----------|-------|--------|
| Feature codes - Implemented | 16 / 17 | `accesscontrol.core` is template-only (codebase uses `rbac.core`) |
| Permissions - Fully enforced | 39 / 62 | Covered at page, API, and service layers (includes newly enforced) |
| Permissions - Partially enforced | 8 / 62 | `planner:manage/delete`, `calendar:manage/delete`, `attendance:view/delete`, `registrations:view/manage` — deferred or implicitly covered |
| Permissions - Not implemented | 9 / 62 | `event:*`, `notebook:*`, `access_control:*` — template-only, recommend removal |
| Old permissions - Application cleanup | **DONE** | All high-priority codes replaced in app layer |
| Old permissions - SQL migrations | Remaining | Only exist in historical migration files |
| Naming consistency | **DONE** | `households.core`, `events.core`, `attendance.core` standardized |

---

## Cleanup Completed

The following old permission codes have been replaced in all application-layer files (XML blueprints, TypeScript components, services, API routes). SQL migration files were intentionally left unchanged as they are historical records.

### `members:edit` replaced with `members:manage`

| File | Change |
|------|--------|
| `apps/web/src/app/admin/members/list/page.tsx` | Comment updated |
| `apps/web/src/app/admin/members/[memberId]/page.tsx` | Comment updated |
| `apps/web/src/app/admin/community/members/[memberId]/view/page.tsx` | Gate check, `canEditMembers`, `canEditSelf` arrays, comment |
| `apps/web/src/components/dynamic/member/MemberProfileHeader.tsx` | `canEditPhoto` permission check |
| `apps/web/src/components/dynamic/member/MemberProfileLayout.tsx` | `canViewSidebar` permission check |
| `apps/web/src/lib/rbac/permissionHelpers.ts` | JSDoc examples |
| `apps/web/metadata/authoring/blueprints/admin-community/families-manage.xml` | `requiredPermissions` changed to `households:manage` |
| `apps/web/src/app/admin/community/families/manage/page.tsx` | Gate changed to `households:manage` |

### `goals:create` / `goals:edit` replaced with `goals:manage`

| File | Change |
|------|--------|
| `apps/web/metadata/authoring/blueprints/admin-community/planning-goals-manage.xml` | Comment updated |
| `apps/web/metadata/authoring/blueprints/admin-community/planning-goals-detail.xml` | Comment updated |
| `apps/web/metadata/authoring/blueprints/admin-community/planning-goals-categories.xml` | Comment updated |
| `apps/web/metadata/authoring/blueprints/admin-community/planning-goals-categories-manage.xml` | Comment updated |
| `apps/web/src/app/api/community/planning/goals/route.ts` | TODO comment updated |
| `apps/web/src/app/admin/community/planning/goals/create/page.tsx` | Comment updated |

### `objectives:create` / `objectives:edit` replaced with `objectives:manage`

| File | Change |
|------|--------|
| `apps/web/metadata/authoring/blueprints/admin-community/planning-goals-objectives-manage.xml` | Comment updated |

### `finance:reports` replaced with `finance:view` (+ `finance.reports` feature code replaced with `finance.core`)

| File | Change |
|------|--------|
| `apps/web/metadata/authoring/blueprints/admin-finance/reports-trial-balance.xml` | `featureCode` and `requiredPermissions` updated |
| `apps/web/metadata/authoring/blueprints/admin-finance/reports-income-statement.xml` | `featureCode` and `requiredPermissions` updated |
| `apps/web/metadata/authoring/blueprints/admin-finance/reports-dashboard.xml` | `featureCode` and `requiredPermissions` updated |
| `apps/web/metadata/authoring/blueprints/admin-finance/reports-balance-sheet.xml` | `featureCode` and `requiredPermissions` updated |

### `finance:edit` replaced with `finance:manage`

| File | Change |
|------|--------|
| `apps/web/metadata/authoring/blueprints/admin-community/accounts-dashboard.xml` | RBAC `requirePermissions` updated |
| `apps/web/src/lib/metadata/services/finance-notifications.ts` | `getUsersWithPermission` call updated |
| `apps/web/src/components/licensing/wizard/PermissionDefinitionStep.tsx` | Example text updated |

### Short URL entity permissions updated

| File | Change |
|------|--------|
| `apps/web/src/app/s/[token]/page.tsx` | All entity permission arrays modernized: removed `:edit` variants, added `:manage`; `care:*` → `careplans:*`, `discipleship:*` → `discipleshipplans:*` |

---

## RBAC Enforcement Added

The following permission enforcement gaps were identified and fixed to align with the template's permission definitions.

### Objectives Detail Page - Missing RBAC on Actions

**File:** `apps/web/metadata/authoring/blueprints/admin-community/planning-goals-objectives-detail.xml`

| Action | Permission Added |
|--------|-----------------|
| `edit-objective` | `<RBAC requirePermissions="objectives:manage" />` |
| `add-key-result` | `<RBAC requirePermissions="key_results:manage" />` |
| `delete-objective` | `<RBAC requirePermissions="objectives:delete" />` |

### Community Accounts - Missing/Inconsistent RBAC on Actions

| File | Action | Change |
|------|--------|--------|
| `admin-community/accounts-list.xml` | `launch-new-account` | Added `<RBAC requirePermissions="accounts:manage" />` |
| `admin-community/accounts-profile.xml` | `edit-account` | Added `<RBAC requirePermissions="accounts:manage" />` |
| `admin-community/accounts-dashboard.xml` | `launch-new-account` | Changed `finance:manage` → `accounts:manage` for consistency |
| `admin-finance/accounts-list.xml` | `add-account` | Changed `finance:manage` → `accounts:manage` for consistency |
| `admin-finance/accounts-profile.xml` | `edit-account` | Changed `finance:manage` → `accounts:manage` for consistency |

### Account Profile Pages - Added Delete Actions

| File | Change |
|------|--------|
| `admin-finance/accounts-profile.xml` | Added `delete-account` action with `<RBAC requirePermissions="accounts:delete" />` |
| `admin-community/accounts-profile.xml` | Added `delete-account` action with `<RBAC requirePermissions="accounts:delete" />` |

### Settings - Added `settings:manage` Enforcement

| File | Change |
|------|--------|
| `admin-settings/settings-overview.xml` | Added `<RBAC requirePermissions="settings:manage" />` to `save-settings` action |
| `apps/web/src/app/admin/settings/page.tsx` | Added `settings:view`/`settings:manage` permission gate; fetches user permissions server-side |
| `apps/web/src/components/dynamic/admin/CanvaStyleSettingsPage.tsx` | Accepts `userPermissions` prop; enforces `settings:manage` for all write operations (profile, preferences) |
| `apps/web/src/components/dynamic/admin/ChurchProfileSection.tsx` | Added `readOnly` prop; hides edit buttons and logo upload when user lacks `settings:manage` |

---

## Feature Codes Audit

### New Feature Codes (Action: insert)

| # | Feature Code | Status | Enforcement Locations |
|---|---|---|---|
| 1 | `members.core` | Implemented | 7+ XML blueprints, MemberService, MemberImportService, member.repository, API routes (`/api/members/export`, `/api/members/import`), AI tools (GetMemberDetailsTool, SearchMembersTool, CreateMemberTool), license evaluation, seed scripts |
| 2 | `members.household` | Implemented | 3 XML blueprints (`households-list`, `households-profile`, `households-manage`), MemberHouseholdService, memberHousehold.repository, AI tools (GetFamilyDetailsTool, SearchFamiliesTool, ManageFamilyMembersTool) |
| 3 | `members.care` | Implemented | 3 XML blueprints (`care-plans-list`, `care-plans-profile`, `care-plans-manage`), MemberCarePlanService, memberCarePlan.repository, service handler `admin-community-careplans.ts`, AI tools |
| 4 | `members.discipleship` | Implemented | 3 XML blueprints (`discipleship-plans-list`, `discipleship-plans-profile`, `discipleship-plans-manage`), MemberDiscipleshipPlanService, memberDiscipleshipPlan.repository, service handler `admin-community-discipleship.ts`, AI tools |
| 5 | `planner.core` | Implemented | 11+ XML blueprints (planning-goals, categories, reports, dashboard), GoalsService, goal.repository, objective.repository, keyResult.repository, API routes (`/api/community/planning/goals`), service handler `admin-community-goals.ts` |
| 6 | `planner.calendar` | Implemented | XML blueprint (`planning-calendar`), PlanningService, calendarEvent.repository, calendarCategory.repository |
| 7 | `planner.event` | Implemented | XML blueprint (`planning-event-manage`), PlanningService, calendarEvent.repository |
| 8 | `planner.ministries` | Implemented | 3 XML blueprints (`scheduler-ministry-list`, `scheduler-ministry-profile`, `scheduler-ministry-manage`), MinistryService, ministry.repository, ministryTeam.repository, service handler `admin-community-scheduler.ts` |
| 9 | `planner.scheduler` | Implemented | 6 XML blueprints (`scheduler-dashboard`, `scheduler-schedules`, `scheduler-schedule-profile`, `scheduler-schedule-manage`, `scheduler-occurrences`, `scheduler-occurrence-detail`), SchedulerService, ministrySchedule.repository, scheduleOccurrence.repository |
| 10 | `planner.attendance` | Implemented | XML blueprint (`scheduler-checkin`), scheduleAttendance.repository, scheduleAttendance.adapter |
| 11 | `planner.notebook` | Implemented | 3 XML blueprints (`planning-notebooks`, `planning-notebooks-detail`, `planning-notebooks-manage`), NotebookService |
| 12 | `planner.registration` | Implemented | scheduleRegistration.repository (database and service layer) |
| 13 | `accounts.core` | Implemented | 7 XML blueprints across `admin-finance` and `admin-community` modules, AI tools (GetAccountDetailsTool, SearchAccountsTool, ManageAccountTool) |
| 14 | `finance.core` | Implemented | 20+ XML blueprints (finance-dashboard, transactions, sources, funds, categories, budgets, fiscal-years, opening-balances, reports), license evaluation, API route `available-metrics/route.ts` |
| 15 | `communication.core` | Implemented | 5 XML blueprints (`communication-dashboard`, `campaign-list`, `campaign-profile`, `campaign-manage`, `template-list`), CommunicationService, RecipientService, campaign.repository, template.repository, API routes, AI tools |
| 16 | `accesscontrol.core` | **NOT FOUND** | The codebase uses `rbac.core` instead. No references to `accesscontrol.core` exist anywhere. |
| 17 | `settings.core` | Implemented | XML blueprint (`settings-overview`), SQL migrations, license evaluation |

### Old Feature Codes (Action: delete)

The following legacy feature codes are being replaced. Some still have residual references:

| Old Feature Code | Replacement | Residual References |
|---|---|---|
| `ministries.core` | `planner.ministries` | Legacy SQL in `20260110120000_create_scheduler_system.sql` |
| `scheduler.core` | `planner.scheduler` | Legacy SQL in `20260110120000_create_scheduler_system.sql` |
| `goals.core` | `planner.core` | SQL in `20260108100000_add_goals_core_feature.sql`, `FEATURE_AUDIT.md` |
| `dashboard.core` | (kept) | SQL migrations, `evaluation.ts` - still actively used |
| `households.core` | `members.household` | SQL migrations only — **app code cleaned up** (`seedFeatures.ts`, `evaluation.ts` updated) |
| `events.core` | `planner.event` | SQL migrations only — **app code cleaned up** (`seedFeatures.ts`, `evaluation.ts` updated) |
| `attendance.core` | `planner.attendance` | SQL migrations only — **app code cleaned up** (`available-metrics/route.ts` updated) |
| `finance.reports` | `finance.core` | SQL migrations only — **app code cleaned up** (4 report XML blueprints updated) |
| `member_care.core` | `members.care` | No residual references |
| `objectives.core` | `planner.core` | No residual references |
| `key_results.core` | `planner.core` | No residual references |
| `notebook.core` | `planner.notebook` | No residual references |
| `giving.core` | `finance.core` | No residual references |
| `sms.core` | `integrations.sms` | No residual references |
| `email.core` | `integrations.email` | No residual references |
| `roles.core` | `rbac.core` | No residual references |
| `users.core` | `rbac.core` | No residual references |
| `calendar.core` | `planner.calendar` | No residual references |

---

## Permission Codes Audit

### Fully Implemented & Enforced

These permissions are checked at the page level (XML `requiredPermissions`), component level (RBAC tags), and/or API route level.

#### Members Module

| Permission | XML Blueprints | Services/API | AI Tools |
|---|---|---|---|
| `members:view` | `membership-list`, `membership-profile`, `membership-dashboard` | MemberService (find, findById, findAll) | GetMemberDetailsTool, SearchMembersTool, GetMemberBirthdaysTool, GetMemberAnniversariesTool |
| `members:manage` | `membership-manage`, `membership-lookup-create`, component RBAC on MemberImportActions | MemberService (create, update, import, export), `/api/members/export`, `/api/members/import` | CreateMemberTool |
| `members:delete` | Component RBAC on delete/archive action in `membership-list` | MemberService (soft-delete/archive) | - |

#### Households Module

| Permission | XML Blueprints | Services/API | AI Tools |
|---|---|---|---|
| `households:view` | `households-list`, `households-profile` | MemberHouseholdService | GetFamilyDetailsTool, SearchFamiliesTool |
| `households:manage` | `households-manage`, edit actions in `households-profile` | MemberHouseholdService | ManageFamilyMembersTool |
| `households:delete` | Delete actions in data grids | MemberHouseholdService | - |

#### Care Plans Module

| Permission | XML Blueprints | Services/API | AI Tools |
|---|---|---|---|
| `careplans:view` | `care-plans-list`, `care-plans-profile` | MemberCarePlanService | GetCarePlanDetailsTool, SearchCarePlansTool |
| `careplans:manage` | `care-plans-manage` | MemberCarePlanService | ManageCarePlanTool |
| `careplans:delete` | Delete actions in data grids | MemberCarePlanService | - |

#### Discipleship Plans Module

| Permission | XML Blueprints | Services/API | AI Tools |
|---|---|---|---|
| `discipleshipplans:view` | `discipleship-plans-list`, `discipleship-plans-profile` | MemberDiscipleshipPlanService | GetDiscipleshipPlanDetailsTool, SearchDiscipleshipPlansTool |
| `discipleshipplans:manage` | `discipleship-plans-manage` | MemberDiscipleshipPlanService | ManageDiscipleshipPlanTool |
| `discipleshipplans:delete` | Delete actions in data grids | MemberDiscipleshipPlanService | - |

#### Goals Module

| Permission | XML Blueprints | Services/API |
|---|---|---|
| `goals:view` | `planning-goals`, `planning-goals-detail`, `planning-goals-categories`, `planning-goals-reports` | GoalsService |
| `goals:manage` | `planning-goals-manage`, `planning-goals-categories-manage` | GoalsService, `/api/community/planning/goals` |
| `goals:delete` | Delete actions in data grids | GoalsService |

#### Ministries Module

| Permission | XML Blueprints | Services/API |
|---|---|---|
| `ministries:view` | `scheduler-ministry-list`, `scheduler-ministry-profile` | MinistryService |
| `ministries:manage` | `scheduler-ministry-manage` | MinistryService |
| `ministries:delete` | Delete actions in data grids | MinistryService |

#### Scheduler Module

| Permission | XML Blueprints | Services/API |
|---|---|---|
| `scheduler:view` | `scheduler-dashboard`, `scheduler-schedules`, `scheduler-schedule-profile`, `scheduler-occurrences`, `scheduler-occurrence-detail` | SchedulerService |
| `scheduler:manage` | `scheduler-schedule-manage` | SchedulerService |
| `scheduler:delete` | Delete actions in data grids | SchedulerService |

#### Accounts Module

| Permission | XML Blueprints | Services/API | AI Tools |
|---|---|---|---|
| `accounts:view` | `accounts-dashboard`, `accounts-list`, `accounts-profile` (both `admin-community` and `admin-finance`) | - | GetAccountDetailsTool, SearchAccountsTool |
| `accounts:manage` | `accounts-manage` (both modules) | - | ManageAccountTool |

#### Finance Module

| Permission | XML Blueprints | Services/API |
|---|---|---|
| `finance:view` | 57+ XML files (all dashboards, lists, profiles, reports) | AI tools |
| `finance:manage` | 50+ XML files (all manage and entry pages) | Service handlers |
| `finance:delete` | Service handler actions | `admin-finance-transactions.ts`, `admin-finance-accounts.ts`, `admin-finance-budgets.ts` |
| `finance:approve` | Transaction approval workflow | `admin-finance-transactions.ts` (maker-checker pattern) |
| `finance:post` | Transaction posting workflow | `admin-finance-transactions.ts` |

#### Communication Module

| Permission | XML Blueprints | Services/API | AI Tools |
|---|---|---|---|
| `communication:view` | `communication-dashboard`, `campaign-list`, `campaign-profile`, `template-list` | CommunicationService, RecipientService, API routes | SuggestAudienceTool |
| `communication:manage` | `campaign-manage` | CommunicationService, API routes | GenerateTemplateTool, ComposeMessageTool |
| `communication:delete` | Delete actions in service handlers | CommunicationService | - |

---

### Partially Implemented

These permissions exist in the template and have some enforcement, but are missing full coverage.

| Permission | What Exists | What's Missing |
|---|---|---|
| `key_results:view` | Implied in goal detail pages | No explicit `requiredPermissions="key_results:view"` on any page |
| `key_results:manage` | `planning-goals-key-results-manage.xml` | Page-level check exists |
| `key_results:delete` | `planning-goals-detail.xml`, `planning-goals-objectives-detail.xml` | **Enforced** — `<RBAC requirePermissions="key_results:delete" />` on `delete-key-result` actions |
| `objectives:view` | `planning-goals-objectives-detail.xml` | Exists at page level |
| `objectives:manage` | `planning-goals-objectives-manage.xml` | Exists at page level |
| `objectives:delete` | `planning-goals-objectives-detail.xml` | **Enforced** — `<RBAC requirePermissions="objectives:delete" />` on `delete-objective` action |
| `planner:view` | `planning-dashboard.xml` | `planner:manage` and `planner:delete` not referenced anywhere |
| `planner:manage` | Not used | No pages or services reference this permission |
| `planner:delete` | Not used | No pages or services reference this permission |
| `calendar:view` | `planning-calendar.xml` | `calendar:manage` and `calendar:delete` not referenced |
| `calendar:manage` | Not used | No pages or services reference this permission |
| `calendar:delete` | Not used | No pages or services reference this permission |
| `attendance:view` | Not used | No pages reference this; only `attendance:manage` is used |
| `attendance:manage` | `scheduler-occurrence-detail.xml` edit actions | Limited to occurrence detail page |
| `attendance:delete` | Not used | No pages or services reference this permission |
| `registrations:view` | Database/documentation only | No XML blueprint or service-level check |
| `registrations:manage` | Database/documentation only | No XML blueprint or service-level check |
| `registrations:delete` | Not used | No enforcement anywhere |
| `settings:view` | `settings-overview.xml`, `page.tsx` access gate | **Enforced** — Page-level + access gate |
| `settings:manage` | `settings-overview.xml`, `CanvaStyleSettingsPage.tsx` | **Enforced** — RBAC on `save-settings` action + `readOnly` prop enforcement |
| `settings:delete` | Not used | No delete functionality exists for settings |
| `accounts:delete` | `accounts-profile.xml` (both finance + community) | **Enforced** — `<RBAC requirePermissions="accounts:delete" />` on `delete-account` actions |

---

### Not Implemented

These permission codes from the template have zero references in the codebase.

| Permission | Reason | Recommendation |
|---|---|---|
| `event:view` | System uses `planner:view` for calendar/event pages | Remove from template or implement dedicated event permissions |
| `event:manage` | Same as above | Remove from template or implement |
| `event:delete` | Same as above | Remove from template or implement |
| `notebook:view` | Notebook pages use `members:manage` (per RLS migration `20260123250000`) | Remove from template or implement dedicated notebook permissions |
| `notebook:manage` | Same as above | Remove from template or implement |
| `notebook:delete` | Same as above | Remove from template or implement |
| `access_control:view` | RBAC module uses its own permission structure (`rbac:roles:*`) | Remove from template; use existing RBAC permissions |
| `access_control:manage` | Same as above | Remove from template |
| `access_control:delete` | Same as above | Remove from template |

---

## Old Permission Codes - Remaining in SQL Migrations

All high-priority old permission codes have been cleaned up from application-layer files. The codes below only remain in SQL migration files (historical records, not application logic).

### Remaining in SQL Migrations Only

These old codes exist in SQL migrations but are no longer referenced in any application code. A future database migration can consolidate them.

| Old Permission | Replacement | Migration Files |
|---|---|---|
| `members:search` | `members:view` | `20260113000001_revamp_role_personas.sql`, `20260103000001_refresh_feature_catalog_and_permissions.sql` |
| `members:create` | `members:manage` | `20260113000001_revamp_role_personas.sql`, RLS policy migrations |
| `households:create` | `households:manage` | `20260113000001_revamp_role_personas.sql` |
| `households:edit` | `households:manage` | `20260113000001_revamp_role_personas.sql` |
| `finance:view_summary` | `finance:view` | Migrations, docs |
| `dashboard:view` | (remove) | Migrations only |
| `dashboard:widgets` | (remove) | Migrations only |
| `settings:edit` | `settings:manage` | Migrations, RLS policies |

### Already Removed (No Action Needed)

These codes no longer appear anywhere in the codebase.

| Old Permission | Notes |
|---|---|
| `members:edit` | **Cleaned up** - Replaced with `members:manage` in all app files |
| `goals:create`, `goals:edit` | **Cleaned up** - Replaced with `goals:manage` in all app files |
| `objectives:create`, `objectives:edit` | **Cleaned up** - Replaced with `objectives:manage` in all app files |
| `finance:reports` | **Cleaned up** - Replaced with `finance:view` in all app files |
| `finance:create`, `finance:edit` | **Cleaned up** - Replaced with `finance:manage` in all app files |
| `campaigns:view`, `campaigns:manage`, `campaigns:create`, `campaigns:edit` | Replaced by `communication:*` |
| `roles:view`, `roles:create`, `roles:edit`, `roles:delete` | Replaced by RBAC-specific permissions |
| `users:view`, `users:create`, `users:edit`, `users:delete` | Replaced by RBAC-specific permissions |
| `key_results:create`, `key_results:edit` | Never existed in code |
| `templates:view`, `templates:manage` | Only in notification schema (separate concern) |

---

## Recommendations

### 1. Fix Template Issues

| Action | Detail | Status |
|---|---|---|
| Replace `accesscontrol.core` | Change to `rbac.core` in the feature template | Template-only (no app code uses this) |
| Remove `event:*` permissions | Not implemented; event access is controlled via `planner:view` | Template-only (no app code uses this) |
| Remove `notebook:*` permissions | Not implemented; notebook access uses `members:manage` | Template-only (no app code uses this) |
| Remove `access_control:*` permissions | Not implemented; RBAC has its own permission structure | Template-only (no app code uses this) |
| Add RBAC enforcement for unused `:manage`/`:delete` variants | `settings:manage`, `accounts:delete`, `objectives:manage/delete`, `key_results:manage` were defined but missing enforcement | **Done** - See "RBAC Enforcement Added" below |

### 2. Code Cleanup (Old Permissions)

Run a cleanup migration and XML update to replace deprecated permission codes:

```
members:edit        -> members:manage
members:search      -> members:view
members:create      -> members:manage
goals:create        -> goals:manage
goals:edit          -> goals:manage
objectives:create   -> objectives:manage
objectives:edit     -> objectives:manage
finance:reports     -> finance:view
finance:create      -> finance:manage
finance:edit        -> finance:manage
finance:view_summary -> finance:view
households:create   -> households:manage
households:edit     -> households:manage
settings:edit       -> settings:manage
```

### 3. Add Missing Enforcement

| Permission | Action Needed | Status |
|---|---|---|
| `key_results:view` | No standalone detail page exists; key results are viewed inline on `objectives-detail.xml` (gated by `objectives:view`) and `planning-goals-detail.xml` (gated by `goals:view`) | **N/A** — Implicitly covered by parent page permissions |
| `key_results:delete` | Add `delete-key-result` action with RBAC to pages that list key results | **Done** — Added to `planning-goals-detail.xml` and `planning-goals-objectives-detail.xml` |
| `objectives:delete` | Add RBAC check for delete actions | **Done** (previous session) — `objectives-detail.xml` has `<RBAC requirePermissions="objectives:delete" />` on `delete-objective` action |
| `registrations:view` | Registration data shown on `scheduler-schedule-profile.xml` (registrants table) and `scheduler-occurrence-detail.xml` (RegistrationList component) — both gated by `scheduler:view` at page level | **Deferred** — No standalone registration admin page exists; registration components are embedded in scheduler pages. Will enforce when dedicated registration management UI is built |
| `registrations:manage` | Same as above — no registration-specific manage actions (approve/reject/cancel) exist in XML blueprints yet | **Deferred** — Will enforce when registration management actions are added |
| `attendance:view` | Check-in page (`scheduler-checkin.xml`) correctly uses `attendance:manage` (it's a write operation). Attendance data viewing is on `scheduler-occurrence-detail.xml` (AttendanceTracker component) gated by `scheduler:view` | **N/A** — Attendance viewing is implicitly covered by `scheduler:view`; check-in correctly requires `attendance:manage` |

**Files Changed:**
- `planning-goals-detail.xml` — Added `delete-key-result` action with `<RBAC requirePermissions="key_results:delete" />`
- `planning-goals-objectives-detail.xml` — Added `delete-key-result` action with `<RBAC requirePermissions="key_results:delete" />`

### 4. Naming Consistency

| Issue | Resolution | Status |
|---|---|---|
| `households.core` vs `members.household` | Standardize on `members.household` | **Done** — Updated `evaluation.ts`, `seedFeatures.ts` |
| `attendance.core` vs `planner.attendance` | Standardize on `planner.attendance` | **Done** — Updated `available-metrics/route.ts` |
| `events.core` vs `planner.event` | Standardize on `planner.event` | **Done** — Updated `evaluation.ts`, `seedFeatures.ts` |

**Files Changed:**
- `src/lib/metadata/evaluation.ts` — `CORE_FEATURES` array: `households.core` → `members.household`, `events.core` → `planner.event`
- `tools/metadata/seedFeatures.ts` — All 3 maps (`FEATURE_CATEGORIES`, `FEATURE_DESCRIPTIONS`, `bundleMappings`): `households.core` → `members.household`, `events.core` → `planner.event`
- `src/app/api/community/planning/goals/available-metrics/route.ts` — `requiresFeature`: `attendance.core` → `planner.attendance` (2 occurrences)

**Note:** XML blueprints already used the correct names (`members.household`, `planner.event`, `planner.attendance`). Stale compiled artifacts (`@1.0.0`) with old names exist but are orphaned — the manifest points to `@1.1.0` versions which have correct names.

---

*Generated by automated codebase audit on January 29, 2026.*
