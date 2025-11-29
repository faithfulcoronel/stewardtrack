# Epic 6: Church Finance Module - Review & Fix

**Release:** Beta - March 2026
**Timeline:** Week 7 (February 17-23, 2026)
**Duration:** 1 week
**Priority:** P1 (Review & Fix Existing Code)
**Epic Type:** REVIEW & FIX (Not New Build)
**Epic Owner:** Full Stack Team + Claude AI Assistance
**Dependencies:** Epic 1 (JWT Authentication), Epic 3 (RBAC), Epic 5 (Members - Review)

## Epic Overview

**IMPORTANT:** This is NOT a new feature build. The Church Finance module already exists in the codebase with metadata-driven pages. This epic focuses on:

1. **Verifying** all finance modules follow the standard **Dashboard → List → AddEdit → Profile** pattern
2. **Testing** all existing functionality works correctly
3. **Fixing** any bugs found during testing
4. **Ensuring** proper RBAC permissions are enforced
5. **Validating** all metadata definitions are complete and correct

**DO NOT** add new features or build from scratch. Focus on reviewing, testing, and fixing what already exists.

---

## Standard Page Pattern

All finance modules must follow this metadata-driven pattern:

```
Module Name
    ├─> Dashboard (Overview/Summary page)
    ├─> List (Table/Grid view with filters)
    ├─> AddEdit (Manage - Create/Edit form)
    └─> Profile (Detail view for single record)
```

**Example: Donations Module**
```
Donations Management
    ├─> Donation Dashboard      (donations/dashboard)
    ├─> Donation List           (donations/list)
    ├─> Donation Add/Edit       (donations/manage)
    └─> Donation Profile        (donations/profile)
```

---

## Finance Modules to Review

The following financial modules must have metadata definitions and follow the Dashboard → List → AddEdit → Profile pattern:

### 1. **Donations/Expense**
- ✅ Dashboard: Summary stats, recent donations, trends
- ✅ List: Searchable table with filters (date, category, donor, method)
- ✅ AddEdit: Form to record/edit donations
- ✅ Profile: Detailed view of single donation with receipt

### 2. **Budgets**
- ✅ Dashboard: Budget overview, budget vs actual summary
- ✅ List: All budgets by fiscal year with status
- ✅ AddEdit: Create/edit annual budget with line items
- ✅ Profile: Budget detail with category breakdown

### 3. **Funds**
- ✅ Dashboard: Fund balances, recent transactions
- ✅ List: All funds with balances
- ✅ AddEdit: Create/edit fund definitions
- ✅ Profile: Fund detail with transaction history

### 4. **Chart of Accounts (COA)**
- ✅ Dashboard: Account hierarchy overview
- ✅ List: All accounts in hierarchical view
- ✅ AddEdit: Create/edit account definitions
- ✅ Profile: Account detail with transactions

### 5. **Source (Fund Sources)**
- ✅ Dashboard: Source summary
- ✅ List: All fund sources
- ✅ AddEdit: Create/edit fund sources
- ✅ Profile: Source detail

### 6. **Fiscal Year**
- ✅ Dashboard: Current fiscal year overview
- ✅ List: All fiscal years with status
- ✅ AddEdit: Create/edit fiscal year periods
- ✅ Profile: Fiscal year detail with period breakdown

### 7. **Income Categories**
- ✅ Dashboard: Income category summary
- ✅ List: All income categories
- ✅ AddEdit: Create/edit income categories
- ✅ Profile: Category detail with transactions

### 8. **Expense Categories**
- ✅ Dashboard: Expense category summary
- ✅ List: All expense categories with hierarchy
- ✅ AddEdit: Create/edit expense categories
- ✅ Profile: Category detail with transactions

### 9. **Opening Balances**
- ✅ Dashboard: Opening balance summary by account
- ✅ List: All opening balances by fiscal year
- ✅ AddEdit: Enter/edit opening balances
- ✅ Profile: Opening balance detail

---

## Review Checklist

### Phase 1: Metadata Verification (Days 1-2)

**For each module above:**
- [ ] Verify XML metadata exists in `metadata/authoring/blueprints/finance/`
- [ ] Confirm all 4 pages are defined (dashboard, list, manage, profile)
- [ ] Check component registry has all required finance components
- [ ] Validate dataSources are properly configured
- [ ] Verify RBAC rules in metadata (permissions required)
- [ ] Run `npm run metadata:compile` to ensure no validation errors

### Phase 2: Functional Testing (Days 3-5)

**For each module:**

#### Dashboard Page
- [ ] Page loads without errors
- [ ] Summary statistics display correctly
- [ ] Charts/graphs render properly (if applicable)
- [ ] Quick actions work (Create New, View Reports, etc.)
- [ ] Filters update data correctly

#### List Page
- [ ] Table loads with correct data
- [ ] Pagination works
- [ ] Search functionality works
- [ ] Column sorting works
- [ ] Filters apply correctly
- [ ] Row actions work (Edit, Delete, View)
- [ ] Bulk actions work (if applicable)
- [ ] Export functionality works (if applicable)

#### AddEdit (Manage) Page
- [ ] Create form displays all required fields
- [ ] Form validation works
- [ ] Required field indicators show
- [ ] Dropdowns/selects populate correctly
- [ ] Date pickers work
- [ ] File uploads work (if applicable)
- [ ] Save creates new record successfully
- [ ] Edit mode loads existing data
- [ ] Update saves changes correctly
- [ ] Cancel/Back navigation works

#### Profile Page
- [ ] Detail view displays all record fields
- [ ] Related data loads (transactions, history, etc.)
- [ ] Actions work (Edit, Delete, Print, etc.)
- [ ] Navigation to related records works
- [ ] Audit trail displays (if applicable)

### Phase 3: RBAC & License Guard Testing (Days 6-7)

**Test with different roles:**
- [ ] **Tenant Admin**: Full access to all finance modules
- [ ] **Staff**: Read access, limited write access
- [ ] **Volunteer**: Read-only access to non-sensitive data
- [ ] **Member**: No access to finance modules

**Verify Permission Guards:**
- [ ] Unauthorized users cannot access finance routes
- [ ] API endpoints enforce `finance:read` and `finance:write` permissions
- [ ] UI hides/disables actions based on user permissions
- [ ] Error messages display for permission denied (403 status)
- [ ] Special permissions enforced (`finance:approve` for expense approval)

**Verify License Guards:**
- [ ] Metadata pages check finance-related feature grants
- [ ] Basic donation tracking requires `basic_donations` feature
- [ ] Advanced finance modules require `expense_management` feature
- [ ] Budget management requires `budget_management` feature
- [ ] API endpoints call `requireFeature()` for gated features
- [ ] Tenants without feature see 402 error or upsell message
- [ ] Multi-level guards work (permission AND feature both required)

**Verify Metadata RBAC Rules:**
- [ ] All finance module XMLs have `<rbac>` sections
- [ ] Donations Dashboard enforces `finance:read` + `basic_donations` feature
- [ ] Expense modules enforce `finance:write` + `expense_management` feature
- [ ] Budget modules enforce `finance:read` + `budget_management` feature
- [ ] Metadata resolver blocks access when permission/feature missing

### Phase 4: Data Integrity Testing (Days 8-9)

**Test:**
- [ ] Donation recording updates account balances correctly
- [ ] Expense recording updates budget actuals
- [ ] Pledge payments update pledge balances
- [ ] Budget vs Actual calculations are correct
- [ ] Fund balance calculations are accurate
- [ ] Opening balances carry forward correctly
- [ ] Fiscal year close procedures work
- [ ] RLS policies enforce tenant isolation

### Phase 5: Bug Fixes (Days 10-12)

**For each bug found:**
1. Document the issue in GitHub Issues or task tracker
2. Identify root cause (metadata, component, service, database)
3. Implement fix
4. Test fix thoroughly
5. Update metadata and recompile if needed
6. Verify fix doesn't break other functionality

---

## Common Issues to Look For

### Metadata Issues
- Missing or incorrect component type mappings
- Broken dataSource references
- Invalid RBAC permission checks
- Missing required fields in forms
- Incorrect event handlers

### Component Issues
- Missing components in component registry
- Incorrect prop types or mappings
- Broken event handlers
- UI layout issues
- Accessibility issues

### Service/Repository Issues
- Missing error handling
- Incorrect data transformations
- RLS policy violations
- Performance issues (N+1 queries)
- Missing tenant context validation

### Database Issues
- Missing indexes
- Incorrect foreign key constraints
- Trigger errors
- RLS policy gaps
- Data type mismatches

---

## Testing Matrix

| Module | Dashboard | List | AddEdit | Profile | RBAC | Data Integrity |
|--------|-----------|------|---------|---------|------|----------------|
| Donations | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| Expenses | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| Budgets | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| Funds | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| COA | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| Sources | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| Fiscal Year | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| Income Cat. | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| Expense Cat. | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| Opening Bal. | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |

---

## Key Locations in Codebase

### Metadata Files
- **Blueprint XML**: `metadata/authoring/blueprints/finance/`
- **Compiled JSON**: `metadata/compiled/finance/`
- **Registry**: `metadata/registry/manifest.json`

### Code Files
- **Services**: `src/services/Donation*.ts`, `src/services/Budget*.ts`, etc.
- **Repositories**: `src/repositories/donation.repository.ts`, `src/repositories/budget.repository.ts`, etc.
- **API Routes**: `src/app/api/donations/`, `src/app/api/budgets/`, etc.
- **Components**: `src/components/finance/` (if using custom React components)
- **Component Registry**: `src/lib/metadata/component-registry.ts`

### Database
- **Migrations**: `supabase/migrations/*_finance*.sql`
- **Tables**: `donations`, `expenses`, `budgets`, `budget_items`, `donation_categories`, `budget_categories`, etc.

---

## Bug Tracking Template

Use this template to document bugs found during review:

```markdown
**Bug ID:** FINANCE-001
**Module:** Donations
**Page:** List
**Severity:** High | Medium | Low
**Description:** [What's broken]
**Steps to Reproduce:**
1. Step 1
2. Step 2
3. Expected vs Actual

**Root Cause:** [Metadata | Component | Service | Database]
**Fix:** [What was changed]
**Files Modified:**
- file1.ts
- file2.xml

**Status:** Open | In Progress | Fixed | Verified
```

---

## Success Criteria

- ✅ All 9 finance modules verified to follow Dashboard → List → AddEdit → Profile pattern
- ✅ All metadata definitions compile without errors
- ✅ All pages load and function correctly
- ✅ RBAC permissions enforced on all routes and APIs
- ✅ Data integrity verified (balances, calculations, triggers)
- ✅ All bugs found during testing are fixed
- ✅ No new features added (scope discipline maintained)
- ✅ Documentation updated with any fixes made

---

## Epic Completion Checklist

- [ ] All 9 finance modules reviewed and tested
- [ ] Metadata definitions verified and compiled
- [ ] All bugs documented and fixed
- [ ] RBAC permissions tested and enforced
- [ ] Data integrity validated
- [ ] Manual testing completed for all modules
- [ ] No new features added (review-only scope maintained)
- [ ] Documentation updated

---

## Next Epic

[Epic 7: SaaS Admin Dashboard](./epic-7-saas-admin-dashboard.md) (P2 - Post-Launch)
