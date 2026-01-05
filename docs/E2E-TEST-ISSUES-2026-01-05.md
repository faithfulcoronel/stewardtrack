# E2E Test Issues Report - 2026-01-05

## Test Run Summary

| Metric | Value |
|--------|-------|
| Total Tests | 90 |
| Passed | 62 |
| Failed | 17 |
| Skipped | 10 |
| Duration | 11.4 minutes |

### Latest Run (after fixes)
- **Previous:** 59 passed, 21 failed
- **Current:** 62 passed, 17 failed (+3 passing, -4 failing)
- **Fixed Issues:** RLS violations, ON CONFLICT constraint mismatch

---

## Issue 1: Database Statement Timeout (CRITICAL - P0)

**Status:** PARTIALLY FIXED (still occurs under heavy concurrent load)

**Error Message:**
```
canceling statement due to statement timeout
```

**Stack Trace:**
```
Error: Failed to assign permission with elevated access: canceling statement due to statement timeout
    at RolePermissionAdapter.assignWithElevatedAccess (src/adapters/rolePermission.adapter.ts:241:13)
    at async RolePermissionRepository.assignWithElevatedAccess (src/repositories/rolePermission.repository.ts:104:12)
    at async PermissionDeploymentService.applyRoleTemplate (src/services/PermissionDeploymentService.ts:503:9)
    at async PermissionDeploymentService.deployPermission (src/services/PermissionDeploymentService.ts:386:30)
    at async PermissionDeploymentService.deployFeaturePermissions (src/services/PermissionDeploymentService.ts:255:26)
    at async PermissionDeploymentService.deployAllFeaturePermissions (src/services/PermissionDeploymentService.ts:142:24)
    at async Immediate.<anonymous> (src/services/RegistrationService.ts:279:35)
```

**Files Affected:**
- `apps/web/src/adapters/rolePermission.adapter.ts:241`
- `apps/web/src/services/PermissionDeploymentService.ts:503`
- `apps/web/src/adapters/userRoleManagement.adapter.ts:116`
- `apps/web/src/services/RegistrationService.ts:279`

**Root Cause:**
Database queries are timing out during tenant registration when deploying permissions and assigning roles. The `assignWithElevatedAccess` method uses complex RLS-bypassing queries that exceed the default statement timeout when the database is under load from concurrent test registrations.

**Impact:**
- High - Causes cascading test failures
- Affects roles: tenant_admin, staff, member, volunteer
- 15+ tests fail as a secondary effect

**Fix Applied:**
1. Added `batchAssignWithElevatedAccess()` method to `RolePermissionAdapter` and `RolePermissionRepository`
2. Created `deployPermissionWithBatchCollection()` in `PermissionDeploymentService` to collect all role assignments
3. Modified `deployFeaturePermissions()` to batch insert all role-permission assignments in a single upsert query
4. Uses Supabase's `upsert()` with `ignoreDuplicates: true` to handle existing assignments gracefully

**Files Modified:**
- `apps/web/src/adapters/rolePermission.adapter.ts`
- `apps/web/src/repositories/rolePermission.repository.ts`
- `apps/web/src/services/PermissionDeploymentService.ts`

---

## Issue 2: Test Selector Strict Mode Violation (P2)

**Status:** FIXED

**Error Message:**
```
strict mode violation: getByTestId('total-elapsed-time').or(getByRole('heading', { name: /Account Created/i }))
  .or(getByRole('heading', { name: /Registration Failed/i })) resolved to 2 elements
```

**File Affected:**
- `apps/web/e2e/tests/auth/registration-redirect.spec.ts:301`

**Root Cause:**
The test selector uses `.or()` which matches multiple elements when both the success heading AND the elapsed time element exist simultaneously on the success page.

**Fix Applied:**
Added `.first()` to the selector chain to handle cases where multiple elements match.

**File Modified:**
- `apps/web/e2e/tests/auth/registration-redirect.spec.ts:300`

---

## Issue 6: RLS Violation on Discipleship Pathways (P1)

**Status:** FIXED

**Error Message:**
```
new row violates row-level security policy for table "discipleship_pathways"
```

**Stack Trace:**
```
Error: new row violates row-level security policy for table "discipleship_pathways"
    at MembershipOnboardingPlugin.seedDiscipleshipPathways (src/lib/onboarding/plugins/features/MembershipOnboardingPlugin.ts:344:9)
```

**Root Cause:**
The `MembershipOnboardingPlugin` was using repository methods that internally call `createSupabaseServerClient()`, which is subject to RLS policies. During registration, the onboarding plugins run in a `setImmediate` callback where the auth context is lost, causing RLS policy violations when trying to insert records into `discipleship_pathways`, `membership_type`, and `membership_stage` tables.

**Fix Applied:**
1. Changed all database operations in `MembershipOnboardingPlugin` to use `getSupabaseServiceClient()` (service role client) which bypasses RLS
2. Removed unused repository dependencies (`IMembershipTypeRepository`, `IMembershipStageRepository`, `IDiscipleshipPathwayRepository`)
3. All seed methods now directly insert records using the service role client

**File Modified:**
- `apps/web/src/lib/onboarding/plugins/features/MembershipOnboardingPlugin.ts`

---

## Issue 7: Batch Upsert ON CONFLICT Mismatch (P1)

**Status:** FIXED

**Error Message:**
```
there is no unique or exclusion constraint matching the ON CONFLICT specification
```

**Stack Trace:**
```
Error: Failed to batch assign permissions with elevated access: there is no unique or exclusion constraint matching the ON CONFLICT specification
    at RolePermissionAdapter.batchAssignWithElevatedAccess (src/adapters/rolePermission.adapter.ts:310:13)
```

**Root Cause:**
The `batchAssignWithElevatedAccess()` method in `rolePermission.adapter.ts` was using `onConflict: 'role_id,permission_id'` but the database's `role_permissions` table has a unique constraint on `(tenant_id, role_id, permission_id)` - a 3-column constraint, not 2-column.

**Fix Applied:**
Updated the `onConflict` specification to include `tenant_id`:
```typescript
.upsert(insertData, {
  onConflict: 'tenant_id,role_id,permission_id',  // Was: 'role_id,permission_id'
  ignoreDuplicates: true,
})
```

**File Modified:**
- `apps/web/src/adapters/rolePermission.adapter.ts`

---

## Issue 3: Navigation Timeouts (Secondary - P1)

**Status:** Blocked by Issue 1

**Error Message:**
```
Test timeout of 120000ms exceeded.
Error: page.goto: Test timeout of 120000ms exceeded.
```

**Tests Affected:**
- `household-duplication.spec.ts:309` - `/admin/members/list`
- `members-comprehensive.spec.ts:259` - `/admin/members/manage`
- `members-comprehensive.spec.ts:263` - `/admin/members/manage?memberId=...`

**Root Cause:**
Page navigation times out because the server is overwhelmed with concurrent registration/permission deployment operations causing database connection saturation. This is a secondary effect of Issue 1.

---

## Issue 4: External API Timeout (Warning - No Action Needed)

**Status:** Already Handled

**Error Message:**
```
AbortError: This operation was aborted
```

**File Affected:**
- `apps/web/src/adapters/adminDashboard.adapter.ts:174`

**Root Cause:**
External Bible verse API (`https://bible-api.com`) times out after 5 seconds. The error is caught and handled gracefully - no test failures result from this.

---

## Issue 5: JSON Parse Errors (P3)

**Status:** FIXED

**Error Message:**
```
SyntaxError: Unexpected end of JSON input
```

**Files Affected:**
- `apps/web/src/app/api/auth/register/route.ts:39`
- `apps/web/src/app/api/licensing/discounts/apply/route.ts:18`

**Root Cause:**
API routes occasionally receive empty request bodies during test runs. Likely caused by test infrastructure race conditions or request aborts.

**Fix Applied:**
Added defensive JSON parsing with proper error handling to both API routes:
1. Check if request body is empty before parsing
2. Wrap JSON.parse in try/catch with informative error messages
3. Return 400 status with clear error instead of throwing

**Files Modified:**
- `apps/web/src/app/api/auth/register/route.ts`
- `apps/web/src/app/api/licensing/discounts/apply/route.ts`

---

## Failed Tests Summary

### Category: Registration/Permission Deployment (Root: Issue 1)
| Test File | Test Name | Line |
|-----------|-----------|------|
| household-duplication.spec.ts | should update existing household when editing member address | 47 |
| household-duplication.spec.ts | should not create duplicate households on multiple edits | 142 |
| household-duplication.spec.ts | should verify members list count is reasonable vs households | 301 |
| members-comprehensive.spec.ts | should create a new member with all form fields populated | 23 |
| members-comprehensive.spec.ts | should edit an existing member across all form tabs | 368 |
| members-comprehensive.spec.ts | should show validation errors for required fields on create | 669 |
| members.spec.ts | should create a new member and then edit it | 17 |
| members.spec.ts | should show validation errors for empty required fields | 250 |
| members.spec.ts | should display members list with search functionality | 271 |
| mobile-responsive.spec.ts | should display login form correctly on mobile | 59 |
| notifications.spec.ts | should display notification bell in the header | 31 |
| notifications.spec.ts | should show unread badge when there are unread notifications | 41 |
| notifications.spec.ts | should open notification center when clicking the bell | 53 |
| notifications.spec.ts | should close notification center when pressing Escape | 64 |
| notifications.spec.ts | should show empty state when no notifications exist | 77 |
| notifications.spec.ts | should display notification list when notifications exist | 93 |
| notifications.spec.ts | should mark all notifications as read | 109 |
| notifications.spec.ts | should fetch notifications from API | 129 |
| notifications.spec.ts | should fetch unread count from API | 151 |

### Category: Test Code Issues
| Test File | Test Name | Line |
|-----------|-----------|------|
| registration-redirect.spec.ts | should display total elapsed time on completion | 272 |
| inactivity-timeout.spec.ts | should not interfere with normal page navigation | 256 |

---

## Fix Implementation Plan

### Phase 1: Critical Database Fixes
1. [x] Azure pipeline metadata compile step added
2. [x] Optimize `assignWithElevatedAccess` to use batch upserts
3. [x] Refactored permission deployment to collect and batch insert role assignments
4. [x] Fixed `onConflict` specification in `batchAssignWithElevatedAccess` to match unique constraint `(tenant_id, role_id, permission_id)`

### Phase 2: Test Code Fixes
5. [x] Fix registration-redirect.spec.ts selector ambiguity
6. [x] Add defensive JSON parsing to API routes
7. [x] Fixed RLS violation in MembershipOnboardingPlugin (use service role client)

### Phase 3: Verification
8. [ ] Run full E2E test suite locally
9. [ ] Verify all 21 previously failing tests pass
