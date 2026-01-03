# Epic 5: Member & Account Management - Review & Fix

**Release:** Beta - March 2026
**Timeline:** Week 6 (February 10-16, 2026)
**Duration:** 1 week
**Priority:** P1 (Review & Fix Existing Code)
**Epic Type:** REVIEW & FIX (Not New Build)
**Epic Owner:** Full Stack Team + Claude AI Assistance
**Dependencies:** Epic 1 (JWT Authentication), Epic 3 (RBAC)

## Epic Overview

**IMPORTANT:** This is NOT a new feature build. The Member & Account Management module already exists in the codebase with metadata-driven pages. This epic focuses on:

1. **Verifying** all member/account modules follow the standard **Dashboard → List → AddEdit → Profile** pattern
2. **Testing** all existing functionality works correctly
3. **Fixing** any bugs found during testing
4. **Ensuring** proper RBAC permissions are enforced
5. **Validating** all metadata definitions are complete and correct
6. **Confirming** the 1:1 relationship between Members and Accounts is properly enforced

**DO NOT** add new features or build from scratch. Focus on reviewing, testing, and fixing what already exists.

---

## Domain Model Review

### Key Concepts (Existing Architecture)

**Member:**
- Represents a **person** in the church community
- Contains personal information (name, contact, demographics)
- Always has a 1:1 relationship with an Account
- Cannot exist without an Account

**Account:**
- Represents a **financial identity** (person OR non-person)
- Can be:
  - **Person Account** (linked to a Member via 1:1 relationship)
  - **Organization Account** (church partner organization, no Member)
  - **Business Account** (vendor, supplier, no Member)
  - **Anonymous Account** (one-time donors, no Member)
- Tracks financial transactions (donations, payments, balances)
- Has auto-generated account number (e.g., ACC-00001)

**Membership Type:**
- Defines categories of membership (Active Member, Associate, Youth, etc.)
- Used to classify members and assign specific privileges/restrictions
- Linked to members via foreign key relationship

---

## Standard Page Pattern

All member/account modules must follow this metadata-driven pattern:

```
Module Name
    ├─> Dashboard (Overview/Summary page)
    ├─> List (Table/Grid view with filters)
    ├─> AddEdit (Manage - Create/Edit form)
    └─> Profile (Detail view for single record)
```

**Example: Members Module**
```
Members Management
    ├─> Members Dashboard       (members/dashboard)
    ├─> Members List            (members/list)
    ├─> Member Add/Edit         (members/manage)
    └─> Member Profile          (members/profile)
```

---

## Modules to Review

The following modules must have metadata definitions and follow the Dashboard → List → AddEdit → Profile pattern:

### 1. **Members**
- ✅ Dashboard: Summary stats (total members, new this month, by status, growth trends)
- ✅ List: Searchable table with filters (status, ministry, date joined, family)
- ✅ AddEdit: Form to create/edit member with Account auto-creation
- ✅ Profile: Detailed member view with Account info, family, ministries, donation history

**Key Features to Verify:**
- Member creation automatically creates linked Account (1:1 relationship)
- Account number is auto-generated (ACC-#####)
- Search works across name, email, phone, account number
- Family grouping functionality works
- Ministry assignment works
- Photo upload works
- Emergency contact information saves correctly

### 2. **Membership Types**
- ✅ Dashboard: Overview of membership type distribution
- ✅ List: All membership types with member counts
- ✅ AddEdit: Create/edit membership type definitions
- ✅ Profile: Membership type detail with assigned members list

**Key Features to Verify:**
- Membership types can be created/edited/deleted
- Active/inactive status works
- Member count per type displays correctly
- Assigning membership type to member works
- Default membership type is applied to new members

### 3. **Accounts**
- ✅ Dashboard: Account overview (total accounts, by type, balances)
- ✅ List: All accounts with filters (type, status, balance range)
- ✅ AddEdit: Create/edit non-member accounts (Organization, Business, Anonymous)
- ✅ Profile: Account detail with transaction history, linked member (if applicable)

**Key Features to Verify:**
- Can create non-member accounts (Organization, Business, Anonymous)
- Cannot manually create "member" type accounts (must use Member creation)
- Account balance calculations are correct
- Transaction history displays correctly
- Account number uniqueness enforced
- Account type and entity type constraints work

---

## Review Checklist

### Phase 1: Metadata Verification (Days 1-2)

**For each module above:**
- [ ] Verify XML metadata exists in `metadata/authoring/blueprints/members/`
- [ ] Confirm all 4 pages are defined (dashboard, list, manage, profile)
- [ ] Check component registry has all required member/account components
- [ ] Validate dataSources are properly configured
- [ ] Verify RBAC rules in metadata (permissions required: `members:view`, `members:edit`)
- [ ] Run `npm run metadata:compile` to ensure no validation errors

### Phase 2: Functional Testing (Days 3-5)

#### Members Module Testing

**Dashboard Page:**
- [ ] Total member count is accurate
- [ ] New members this month count is correct
- [ ] Member status breakdown (active/inactive/deceased/transferred) displays correctly
- [ ] Growth trend chart renders (if implemented)
- [ ] Quick actions work (Add New Member, View Reports)

**List Page:**
- [ ] Table loads all members correctly
- [ ] Search works across name, email, phone, account number
- [ ] Status filter works (active, inactive, deceased, transferred)
- [ ] Ministry filter works
- [ ] Family filter works
- [ ] Date joined range filter works
- [ ] Column sorting works
- [ ] Pagination works
- [ ] Row actions work (View, Edit, Delete)

**AddEdit (Manage) Page:**
- [ ] Create form displays all required fields
- [ ] Form validation works (required: first_name, last_name)
- [ ] Email validation works
- [ ] Date pickers work (DOB, membership date, baptism date, confirmation date)
- [ ] Gender dropdown works
- [ ] Marital status dropdown works
- [ ] Ministry multi-select works
- [ ] Family assignment dropdown works
- [ ] Photo upload works
- [ ] Emergency contact fields save correctly
- [ ] Save creates new member AND Account atomically
- [ ] Account number is auto-generated correctly (ACC-#####)
- [ ] Edit mode loads existing member data
- [ ] Update saves changes correctly
- [ ] Cancel/Back navigation works

**Profile Page:**
- [ ] Member details display correctly
- [ ] Linked Account information shows (account number, balance)
- [ ] Family members list displays (if family assigned)
- [ ] Ministries list displays
- [ ] Donation history displays correctly
- [ ] Photo displays
- [ ] Emergency contact info displays
- [ ] Edit button navigates to edit form
- [ ] Delete button works (soft delete - changes status to inactive)

#### Membership Types Module Testing

**Dashboard Page:**
- [ ] Membership type distribution chart displays
- [ ] Total count of membership types shows
- [ ] Quick actions work

**List Page:**
- [ ] All membership types load
- [ ] Member count per type is accurate
- [ ] Active/inactive status displays correctly
- [ ] Row actions work (View, Edit, Delete)

**AddEdit Page:**
- [ ] Create form works
- [ ] Name field is required
- [ ] Description field works
- [ ] Active/inactive toggle works
- [ ] Save creates new membership type
- [ ] Edit mode loads existing data
- [ ] Update saves changes

**Profile Page:**
- [ ] Membership type details display
- [ ] Member count displays correctly
- [ ] List of members with this type displays
- [ ] Edit button works

#### Accounts Module Testing

**Dashboard Page:**
- [ ] Total account count is accurate
- [ ] Account type breakdown (member, organization, business, anonymous) displays
- [ ] Total balance summary is correct
- [ ] Quick actions work

**List Page:**
- [ ] All accounts load
- [ ] Account type filter works
- [ ] Status filter works (active, inactive, suspended)
- [ ] Balance range filter works
- [ ] Search by account name/number works
- [ ] Column sorting works
- [ ] Pagination works
- [ ] Row actions work

**AddEdit Page:**
- [ ] Can create Organization account
- [ ] Can create Business account
- [ ] Can create Anonymous account
- [ ] CANNOT create Member account (validation prevents it)
- [ ] Account number is auto-generated
- [ ] Form validation works
- [ ] Edit mode loads existing data
- [ ] Update saves changes

**Profile Page:**
- [ ] Account details display correctly
- [ ] Balance displays correctly
- [ ] Transaction history displays
- [ ] Linked member shows (if type is "member")
- [ ] Contact information displays (for non-member accounts)
- [ ] Edit button works

### Phase 3: RBAC & License Guard Testing (Days 6-7)

**Test with different roles:**
- [ ] **Tenant Admin**: Full access to all member/account modules
- [ ] **Staff**: Read access to members, limited write access
- [ ] **Volunteer**: Read-only access to basic member info (no financial data)
- [ ] **Member**: No access to member/account management modules

**Verify Permission Guards:**
- [ ] Unauthorized users cannot access member/account routes
- [ ] API endpoints enforce `members:view` and `members:edit` permissions
- [ ] API endpoints enforce `accounts:read` and `accounts:write` permissions
- [ ] UI hides/disables actions based on user permissions
- [ ] Error messages display for permission denied (403 status)

**Verify License Guards:**
- [ ] Metadata pages check `member_management` feature grant
- [ ] API endpoints call `requireFeature('member_management')`
- [ ] Tenants without feature license see 402 error or upsell message
- [ ] Feature grant verified before member creation/editing
- [ ] Multi-level guards work (permission AND feature both required)

**Verify Metadata RBAC Rules:**
- [ ] Members Dashboard XML has `<rbac>` section with required permissions
- [ ] Members List XML enforces `members:view` permission
- [ ] Members AddEdit XML enforces `members:edit` permission
- [ ] Members Profile XML enforces `members:view` permission
- [ ] Metadata resolver blocks access when permission/feature missing

### Phase 4: Data Integrity Testing (Days 8-9)

**Test:**
- [ ] Member creation ALWAYS creates linked Account
- [ ] Member and Account have 1:1 relationship (cannot orphan Account)
- [ ] Account number uniqueness is enforced per tenant
- [ ] Account number generation is sequential and collision-free
- [ ] Cannot delete Member if they have donation history (referential integrity)
- [ ] Cannot delete Account if linked to Member (ON DELETE RESTRICT)
- [ ] Soft delete changes membership_status to 'inactive', doesn't delete row
- [ ] Account balance updates correctly after transactions
- [ ] RLS policies enforce tenant isolation
- [ ] Member cannot be assigned to another tenant's account
- [ ] Family relationships maintain referential integrity

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
- Missing or incorrect component type mappings for member/account components
- Broken dataSource references to members, accounts, membership_types tables
- Invalid RBAC permission checks (should be `members:view/write`, `accounts:read/write`)
- Missing required fields in forms (first_name, last_name, account_type)
- Incorrect event handlers for member/account creation

### Component Issues
- Member creation not triggering Account creation
- Account number not auto-generating
- Family dropdown not populating
- Ministry multi-select not working
- Photo upload failing
- Date pickers not working correctly

### Service/Repository Issues
- Missing error handling in MemberService/AccountService
- Incorrect data transformations in repositories
- RLS policy violations
- N+1 query issues when fetching members with accounts
- Missing tenant context validation
- Atomic transaction failures (member + account creation should be atomic)

### Database Issues
- Missing foreign key constraints (member.account_id → accounts.id)
- Missing unique constraint on account_number per tenant
- Incorrect ON DELETE behavior (should be RESTRICT for accounts referenced by members)
- Trigger errors for account number generation
- RLS policy gaps
- Missing indexes on frequently queried columns (email, phone, account_number, membership_status)

---

## Testing Matrix

| Module | Dashboard | List | AddEdit | Profile | RBAC | Data Integrity |
|--------|-----------|------|---------|---------|------|----------------|
| Members | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| Membership Types | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| Accounts | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |

---

## Key Locations in Codebase

### Metadata Files
- **Blueprint XML**: `metadata/authoring/blueprints/members/`
- **Compiled JSON**: `metadata/compiled/members/`
- **Registry**: `metadata/registry/manifest.json`

### Code Files
- **Services**:
  - `src/services/MemberService.ts`
  - `src/services/AccountService.ts`
  - `src/services/MembershipTypeService.ts`
- **Repositories**:
  - `src/repositories/member.repository.ts`
  - `src/repositories/account.repository.ts`
  - `src/repositories/membershipType.repository.ts`
- **API Routes**:
  - `src/app/api/members/`
  - `src/app/api/accounts/`
  - `src/app/api/membership-types/`
- **Components**: `src/components/members/` (if using custom React components)
- **Component Registry**: `src/lib/metadata/component-registry.ts`

### Database
- **Migrations**: `supabase/migrations/*_members*.sql`, `supabase/migrations/*_accounts*.sql`
- **Tables**: `members`, `accounts`, `membership_types`
- **Functions**: `generate_account_number()`, `create_member_with_account()`

---

## Critical Database Constraints to Verify

1. **Member-Account Relationship:**
   - `members.account_id` is UNIQUE (enforces 1:1 relationship)
   - `members.account_id` references `accounts.id` with ON DELETE RESTRICT
   - Cannot have multiple members pointing to same account
   - Cannot delete account that has linked member

2. **Account Number Uniqueness:**
   - `(tenant_id, account_number)` is UNIQUE
   - Account numbers are sequential per tenant
   - Format is `ACC-#####` (5 digits, zero-padded)

3. **Account Type Constraints:**
   - `account_type` CHECK constraint: `IN ('member', 'organization', 'business', 'anonymous')`
   - `entity_type` CHECK constraint: `IN ('person', 'non_person')`
   - If `account_type = 'member'`, then `entity_type = 'person'`

4. **Membership Status Constraints:**
   - `membership_status` CHECK constraint: `IN ('active', 'inactive', 'deceased', 'transferred')`

---

## Bug Tracking Template

Use this template to document bugs found during review:

```markdown
**Bug ID:** MEMBER-001
**Module:** Members
**Page:** AddEdit
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

- ✅ All 3 modules verified to follow Dashboard → List → AddEdit → Profile pattern
- ✅ All metadata definitions compile without errors
- ✅ All pages load and function correctly
- ✅ RBAC permissions enforced on all routes and APIs
- ✅ Member-Account 1:1 relationship is properly enforced
- ✅ Account number generation works correctly
- ✅ All bugs found during testing are fixed
- ✅ No new features added (scope discipline maintained)
- ✅ Documentation updated with any fixes made

---

## Epic Completion Checklist

- [ ] All 3 member/account modules reviewed and tested
- [ ] Metadata definitions verified and compiled
- [ ] All bugs documented and fixed
- [ ] RBAC permissions tested and enforced
- [ ] Data integrity validated (1:1 relationship, account numbers, constraints)
- [ ] Manual testing completed for all modules
- [ ] Member creation with Account auto-creation verified
- [ ] Non-member account creation verified
- [ ] Search, filter, pagination functionality tested
- [ ] No new features added (review-only scope maintained)
- [ ] Documentation updated

---

## Next Epic

[Epic 6: Church Finance Module](./epic-6-church-finance.md) (P1 - Review & Fix)
