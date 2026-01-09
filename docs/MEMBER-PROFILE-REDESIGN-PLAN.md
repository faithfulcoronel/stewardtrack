# Member Profile Redesign Plan

## Executive Summary

This document outlines a comprehensive redesign of the StewardTrack member profile and management features. The goal is to simplify the user experience while maintaining all essential information, implementing mobile-first design principles, and creating role-based visibility controls.

**Key Scope Decisions:**
- **Care Plans**: Managed in dedicated Care Plans module - member profile shows read-only summary with link
- **Discipleship Plans**: Managed in dedicated Discipleship Plans module - member profile shows read-only summary with link
- **Giving/Finance**: Deferred to future implementation - not included in this redesign

---

## 1. Current State Analysis

### 1.1 Existing Architecture

**Current Pages:**
- `membership-profile.xml` - Admin view of member profile (6 tabs, ~50+ fields displayed)
- `membership-manage.xml` - Create/edit member records (~60+ form fields)
- `membership-list.xml` - Member directory with data grid
- `membership-dashboard.xml` - Dashboard with KPIs

**Related Modules (Separate Management):**
- `care-plans-*.xml` - Dedicated care plan management (list, profile, manage)
- `discipleship-plans-*.xml` - Dedicated discipleship plan management (list, profile, manage)

**Current Components:**
- `AdminMemberWorkspace.tsx` - Flexible workspace with profile/manage variants
- `AdminDetailPanels.tsx` - Read-only detail display with inline edit
- `AdminMetricCards.tsx` - KPI cards display
- `AdminActivityTimeline.tsx` - Milestone timeline
- `MemberQRCode.tsx` - QR code generation
- `FamilyMembershipManager.tsx` - Family relationship management

**Current Data Model:**
- ~100+ fields in `Member` model (many duplicating care/discipleship data)
- Categories: Identity, Demographics, Household/Family, Contact, Membership, Serving, Admin

### 1.2 Pain Points Identified

1. **Information Overload**: Profile displays too much information across 6 tabs
2. **Duplicate Data**: Care/discipleship fields exist on member record AND in dedicated modules
3. **No Self-Service Profile**: Members cannot view/edit their own profile
4. **Desktop-First Design**: Current UI not optimized for mobile devices
5. **Flat Permission Model**: No distinction between admin-visible vs member-visible fields
6. **Complex Navigation**: 6 tabs with nested accordions is overwhelming

### 1.3 Fields to Remove from Member Profile

The following fields should be **removed from member profile editing** since they are managed in dedicated modules:

**Care-Related Fields (managed in Care Plans module):**
- `pastoral_notes`
- `prayer_requests`
- `prayer_focus`

**Discipleship-Related Fields (managed in Discipleship Plans module):**
- `discipleship_next_step`
- `discipleship_mentor`
- `discipleship_group`
- `discipleship_pathways`

**Giving-Related Fields (deferred to future):**
- `giving_recurring_amount`
- `giving_recurring_frequency`
- `giving_recurring_method`
- `giving_pledge_amount`
- `giving_pledge_campaign`
- `giving_primary_fund`
- `giving_last_gift_amount`
- `giving_last_gift_at`
- `giving_last_gift_fund`
- `giving_tier`
- `finance_notes`

---

## 2. Proposed Solution

### 2.1 Vision

Create a **unified, role-aware member profile** that:
- Shows relevant information based on viewer role
- Prioritizes essential information with progressive disclosure
- Works seamlessly on mobile and desktop
- Follows modern card-based, thematic design
- Links to dedicated modules for care and discipleship instead of duplicating

### 2.2 Two-Page Architecture

#### Page 1: My Profile (Member Self-View)
**Route:** `/my/profile` or `/portal/profile`
**Permission:** `members:view_self` (new permission)
**Purpose:** Members view and edit their own basic information

#### Page 2: Member Profile (Admin/Staff View)
**Route:** `/admin/members/profile?memberId={id}`
**Permission:** `members:view` + `members:edit`
**Purpose:** Staff/admin view complete member information with links to related modules

---

## 3. Information Architecture

### 3.1 Field Visibility Matrix

| Category | Field | Member Self-View | Staff View | Admin View |
|----------|-------|-----------------|------------|------------|
| **Identity** | Name | View/Edit | View/Edit | View/Edit |
| | Preferred Name | View/Edit | View/Edit | View/Edit |
| | Profile Photo | View/Edit | View/Edit | View/Edit |
| | Birthday | View/Edit | View | View/Edit |
| | Anniversary | View/Edit | View | View/Edit |
| | Marital Status | View | View | View/Edit |
| | Gender | View | View | View/Edit |
| | Occupation | View | View | View/Edit |
| **Contact** | Email | View/Edit | View | View/Edit |
| | Phone | View/Edit | View | View/Edit |
| | Address | View/Edit | View | View/Edit |
| | Preferred Contact | View/Edit | View | View/Edit |
| **Family** | Family Name | View | View | View/Edit |
| | Family Members | View | View | View/Edit |
| | Role in Family | View | View | View/Edit |
| **Emergency** | Contact Name | View/Edit | View | View/Edit |
| | Contact Phone | View/Edit | View | View/Edit |
| | Relationship | View/Edit | View | View/Edit |
| | Physician | Hidden | View | View/Edit |
| **Membership** | Stage | Hidden | View | View/Edit |
| | Type | View | View | View/Edit |
| | Center | View | View | View/Edit |
| | Join Date | View | View | View/Edit |
| | Envelope # | Hidden | View | View/Edit |
| **Engagement** | Small Groups | View | View | View/Edit |
| | Spiritual Gifts | View | View | View/Edit |
| | Ministry Interests | View/Edit | View | View/Edit |
| | Attendance Rate | Hidden | View | View |
| | Last Attendance | Hidden | View | View |
| **Serving** | Team | View | View | View/Edit |
| | Role | View | View | View/Edit |
| | Schedule | View | View | View/Edit |
| | Coach | Hidden | View | View/Edit |
| | Next Serve Date | View | View | View/Edit |
| | Leadership Roles | Hidden | View | View/Edit |
| | Leadership Position | Hidden | View | View/Edit |
| **Care Plans** | Summary (read-only) | Hidden | View | View |
| | Link to Module | Hidden | View | View |
| **Discipleship** | Summary (read-only) | Hidden | View | View |
| | Link to Module | Hidden | View | View |
| **Admin** | Member ID | Hidden | View | View |
| | Tags | Hidden | View | View/Edit |
| | Data Steward | Hidden | Hidden | View/Edit |
| | Last Review | Hidden | Hidden | View/Edit |

### 3.2 Thematic Card Groupings

Instead of 6 tabs, organize into **thematic cards** with progressive disclosure:

#### Member Self-View Cards (5 cards):
1. **Profile Card** - Photo, name, key identifiers
2. **Contact Card** - How to reach me
3. **Family Card** - My household
4. **Church Life Card** - My groups, serving, interests
5. **Emergency Card** - Who to contact in emergency

#### Staff/Admin View Cards (6 cards):
1. **Profile Summary Card** - Identity snapshot with key metrics
2. **Contact & Family Card** - All contact info and household
3. **Engagement Card** - Groups, attendance, spiritual gifts
4. **Serving & Leadership Card** - Teams, roles, coaching
5. **Care & Discipleship Summary Card** - Read-only summaries with links to modules
6. **Administrative Card** - Membership status, tags, audit

---

## 4. UI/UX Design Specifications

### 4.1 Mobile-First Principles

**Viewport Breakpoints:**
- Mobile: < 640px (stacked cards, full-width)
- Tablet: 640px - 1024px (2-column grid)
- Desktop: > 1024px (3-column grid with sidebar)

**Touch Targets:**
- Minimum 44x44px for interactive elements
- Adequate spacing between tap targets (8px minimum)

**Progressive Disclosure:**
- Show summary on card face
- Expand for details on tap/click
- Use bottom sheets on mobile for editing

### 4.2 Card Component Design

```
┌─────────────────────────────────────────┐
│  [Icon]  Card Title              [Edit] │
│  ───────────────────────────────────────│
│                                         │
│  Key Value 1: Bold Display Value        │
│  Supporting detail or secondary info    │
│                                         │
│  Key Value 2: Another Value             │
│  ───────────────────────────────────────│
│  [+ Show more] or [Collapse]            │
└─────────────────────────────────────────┘
```

**Card States:**
- Collapsed (summary only)
- Expanded (full details)
- Edit mode (inline forms on mobile bottom sheet)
- Loading state with skeleton
- Empty state with call-to-action

### 4.3 Read-Only Summary Card Design (Care & Discipleship)

```
┌─────────────────────────────────────────┐
│  [🙏] Care & Discipleship               │
│  ───────────────────────────────────────│
│                                         │
│  Care Plan                              │
│  ┌─────────────────────────────────────┐│
│  │ Status: Coaching          [Active] ││
│  │ Pastor: Lauren Patel                ││
│  │ Follow-up: Oct 28, 2024             ││
│  │                     [View Plan →]   ││
│  └─────────────────────────────────────┘│
│                                         │
│  Discipleship Journey                   │
│  ┌─────────────────────────────────────┐│
│  │ Mentor: Carlos Vega                 ││
│  │ Next Step: Complete leadership      ││
│  │            cohort module 3          ││
│  │                     [View Plan →]   ││
│  └─────────────────────────────────────┘│
│                                         │
└─────────────────────────────────────────┘
```

### 4.4 Color Theming

Use semantic color tokens for status and emphasis:

| Purpose | Light Mode | Dark Mode |
|---------|-----------|-----------|
| Primary surface | White | Gray-900 |
| Card background | White | Gray-800 |
| Section divider | Gray-100 | Gray-700 |
| Positive status | Emerald-500/15 | Emerald-500/20 |
| Warning status | Amber-500/15 | Amber-500/20 |
| Info status | Sky-500/15 | Sky-500/20 |
| Critical status | Red-500/15 | Red-500/20 |

### 4.5 Typography Hierarchy

| Element | Size | Weight | Line Height |
|---------|------|--------|-------------|
| Page title | 24px | Semibold | 1.2 |
| Card title | 16px | Medium | 1.3 |
| Label | 12px | Medium | 1.4 |
| Value | 14px | Regular | 1.4 |
| Large value | 24px | Semibold | 1.2 |
| Caption | 12px | Regular | 1.4 |

---

## 5. New Component Design

### 5.1 Permission Checking Pattern (Access-Gate Framework)

Components use a **permission-based visibility pattern** that integrates with the access-gate framework:

1. **Server-side**: Fetch user's permissions using `getUserPermissionCodes()` from `@/lib/rbac/permissionHelpers`
2. **Pass to components**: Permissions are passed as `userPermissions` prop (array of permission codes)
3. **Client-side checks**: Components use simple inline checks: `userPermissions.some(p => [...].includes(p))`

This approach:
- ✅ Works with metadata XML framework (props can be passed from XML definitions)
- ✅ Follows access-gate patterns (server-side permission resolution)
- ✅ No server-only imports in client components
- ✅ Supports both direct React usage and metadata-driven rendering

### 5.2 MemberProfileCard Component

A flexible, themeable card component with permission-based visibility:

```typescript
interface MemberProfileCardProps {
  variant: 'identity' | 'contact' | 'family' | 'engagement' |
           'serving' | 'emergency' | 'admin';
  userPermissions?: string[]; // Array of permission codes for visibility control
  title?: string;
  description?: string;
  icon?: React.ReactNode;
  items?: CardDetailItem[];
  canEdit?: boolean;
  onEdit?: () => void;
  editHref?: string;
  collapsed?: boolean;
  defaultCollapsed?: boolean;
  onToggle?: (collapsed: boolean) => void;
  emptyMessage?: string;
}
```

### 5.3 MemberProfileHeader Component

Hero section with profile photo and key metrics:

```typescript
interface MemberProfileHeaderProps {
  member: {
    id?: string;
    firstName: string;
    lastName: string;
    preferredName?: string | null;
    photoUrl?: string | null;
    stage?: string | null;
    stageVariant?: 'success' | 'warning' | 'info' | 'neutral' | null;
    center?: string | null;
    membershipType?: string | null;
    joinDate?: string | null;
  };
  userPermissions?: string[]; // Array of permission codes for visibility control
  metrics?: MetricItem[];
  actions?: ActionItem[];
  backHref?: string;
  backLabel?: string;
  onPhotoChange?: () => void;
}
```

### 5.4 MemberProfileLayout Component

Responsive layout wrapper:

```typescript
interface MemberProfileLayoutProps {
  header: ReactNode;
  cards: ReactNode;
  sidebar?: ReactNode; // Timeline, QR code - shown on desktop for staff/admin
  userPermissions?: string[]; // Array of permission codes for sidebar visibility
}
```

### 5.5 MemberCareSummaryCard Component

Read-only summary card with links to care/discipleship modules:

```typescript
interface MemberCareSummaryCardProps {
  memberId: string;
  carePlan?: CarePlanSummary | null;
  discipleshipPlan?: DiscipleshipPlanSummary | null;
  userPermissions?: string[]; // Array of permission codes for visibility control
}
```

**Permission check pattern in components:**
```typescript
// Components check visibility using inline array checks
const canViewCareOrDiscipleship = userPermissions.some(p =>
  ["care:view", "discipleship:view", "members:manage"].includes(p)
);

// For admin fields
const canViewAdminFields = userPermissions.some(p =>
  ["members:view", "members:manage"].includes(p)
);
```

---

## 6. XML Metadata Structure

### 6.1 New Blueprint: my-profile.xml

```xml
<?xml version="1.0" encoding="UTF-8"?>
<PageDefinition
  kind="blueprint"
  module="portal"
  route="profile"
  schemaVersion="1.0.0"
  contentVersion="1.0.0"
  featureCode="members.self-service"
  requiredPermissions="members:view_self"
  locale="en-US">
  <Page id="portal-my-profile">
    <Title>My Profile</Title>
    <Regions>
      <Region id="main">
        <Component id="profile-header" type="MemberProfileHeader">
          <Props>
            <Prop name="userPermissions" kind="expression">["members:edit_self"]</Prop>
            <!-- Role-appropriate header without giving metrics -->
          </Props>
        </Component>
        <Component id="profile-cards" type="MemberProfileLayout">
          <Props>
            <Prop name="userPermissions" kind="expression">["members:edit_self"]</Prop>
            <Prop name="cards" kind="expression">
              <!-- Only member-visible cards: identity, contact, family, church life, emergency -->
            </Prop>
          </Props>
        </Component>
      </Region>
    </Regions>
  </Page>
</PageDefinition>
```

### 6.2 Refactored Blueprint: membership-profile.xml

Simplified structure with care/discipleship as read-only summaries:

```xml
<Component id="profile-layout" type="MemberProfileLayout">
  <Props>
    <Prop name="userPermissions" kind="expression">context.userPermissions</Prop>
    <Prop name="cards" kind="expression">
      <!--
        Cards: identity, contact-family, engagement, serving,
        care-summary (read-only), admin
        NO giving card - deferred to future
      -->
    </Prop>
  </Props>
</Component>

<!-- Care & Discipleship Summary - Read Only -->
<Component id="care-summary" type="MemberCareSummaryCard">
  <Props>
    <Prop name="memberId" kind="expression">params.memberId</Prop>
    <Prop name="userPermissions" kind="expression">context.userPermissions</Prop>
    <Prop name="carePlan" kind="expression">
      (() => {
        // Fetch latest care plan summary
        return data.memberCarePlan ?? null;
      })()
    </Prop>
    <Prop name="discipleshipPlan" kind="expression">
      (() => {
        // Fetch latest discipleship plan summary
        return data.memberDiscipleshipPlan ?? null;
      })()
    </Prop>
  </Props>
</Component>
```

---

## 7. Permission Model Changes

### 7.1 New Permissions

| Permission Code | Display Name | Description |
|----------------|--------------|-------------|
| `members:view_self` | View Own Profile | Member can view their own profile |
| `members:edit_self` | Edit Own Profile | Member can edit limited fields on their profile |

### 7.2 Permission Role Templates

```sql
-- members:view_self - All authenticated members
SELECT insert_permission_role_template('members:view_self', 'member', true,
  'Members can view their own profile');
SELECT insert_permission_role_template('members:view_self', 'volunteer', true,
  'Volunteers can view their own profile');
SELECT insert_permission_role_template('members:view_self', 'staff', true,
  'Staff can view their own profile');
SELECT insert_permission_role_template('members:view_self', 'tenant_admin', true,
  'Admins can view their own profile');

-- members:edit_self - All authenticated members
SELECT insert_permission_role_template('members:edit_self', 'member', true,
  'Members can update limited profile fields');
SELECT insert_permission_role_template('members:edit_self', 'volunteer', true,
  'Volunteers can update limited profile fields');
SELECT insert_permission_role_template('members:edit_self', 'staff', true,
  'Staff can update limited profile fields');
SELECT insert_permission_role_template('members:edit_self', 'tenant_admin', true,
  'Admins can update limited profile fields');
```

---

## 8. Database Changes

### 8.1 Fields to Deprecate (Keep but Don't Display/Edit)

The following fields remain in the `members` table for backward compatibility but are no longer editable via member profile:

```sql
-- These fields should be marked as deprecated in the model
-- Data is managed in care_plans and discipleship_plans tables

-- Care-related (managed via member_care_plans)
-- pastoral_notes, prayer_requests, prayer_focus

-- Discipleship-related (managed via member_discipleship_plans)
-- discipleship_next_step, discipleship_mentor, discipleship_group, discipleship_pathways

-- Giving-related (deferred to future Giving module)
-- All giving_* and finance_* fields
```

### 8.2 Data Migration Consideration

For existing members with care/discipleship data in the members table:
1. Keep existing data as-is (no data loss)
2. New care/discipleship data should be created in dedicated tables
3. Profile UI shows data from dedicated modules only
4. Future migration script can move legacy data if needed

---

## 9. Implementation Phases

### Phase 1: Foundation
- [x] Create new permission codes in database migration
- [x] Implement `MemberProfileCard` component
- [x] Implement `MemberProfileHeader` component
- [x] Implement `MemberProfileLayout` component
- [x] Implement `MemberCareSummaryCard` component (read-only)
- [x] Add components to component registry
- [x] Permission checking via `userPermissions` prop (using access-gate pattern)

### Phase 2: Member Self-View
- [x] Create `my-profile.xml` blueprint
- [x] Create `/portal/profile` route handler (now redirects to `/admin/my-profile`)
- [x] Implement data source for self-profile
- [x] Implement self-edit API endpoints (GET/PATCH)
- [x] Add "My Profile" to admin navigation (visible to all authenticated users)
- [x] Create `/admin/my-profile` page using admin layout for consistent UX
- **Note:** Portal and admin now share the same layout; `/portal/profile` redirects to `/admin/my-profile`

### Phase 3: Admin Profile Refactor
- [x] Create new card-based admin profile view (`/admin/community/members/[memberId]/view`)
- [x] Implement role-aware field visibility via `userPermissions` prop
- [x] Add read-only care/discipleship summary card with links to modules
- [ ] (Optional) Refactor `membership-profile.xml` to use new components
- [x] Add navigation from member list to new card-based view (via redirect)
- **Note:** `/admin/members/[memberId]` now redirects to the new card-based view; legacy XML profile accessible via query param

### Phase 4: Form Simplification
- [x] Refactor `membership-manage.xml` to remove deprecated fields
- [x] Simplify form to core member data only (removed finance tab, care-notes section, discipleship fields)
- [x] Update form blueprint structure (5 tabs: Profile, Engagement, Emergency, Serving, Admin)
- [x] Update hero section description and metrics (removed giving references)
- **Changes Made:**
  - Removed entire Finance tab (giving/pledge fields deferred to dedicated Giving module)
  - Removed pastoral notes section from Care tab (now "Emergency" tab - managed in Care Plans module)
  - Removed `discipleshipNextStep` and `prayerFocus` fields from Engagement tab
  - Updated initialValues to exclude deprecated fields
  - Updated hero metrics to show Status instead of Recurring Giving
  - Updated description and footnote text

### Phase 4.5: QR Code Security & Cleanup
- [x] Implement generic short URL token system (`/lib/tokens/shortUrlTokens.ts`)
- [x] Create generic short URL director with receptionist pattern (`/app/s/[token]/page.tsx`)
- [x] Support multiple entity types: member, family, event, group, donation, care, discipleship, goal, invitation
- [x] Update MemberQRCode to use secure short URLs (hides member UUID)
- [x] Environment-aware base URL (works in dev and production)
- [x] Remove redundant "Member Since" metric from profile header (shown in Admin card)
- [x] Cleanup: Removed old `/app/m/[token]` route and `/lib/member/tokenUtils.ts`
- **Security:** QR codes now use obfuscated tokens (XOR + base64url) instead of exposing UUIDs

### Phase 5: Mobile Optimization
- [ ] Add responsive breakpoint styles
- [ ] Implement bottom sheet edit dialogs
- [ ] Optimize touch targets
- [ ] Test on iOS and Android via Capacitor
- [ ] Performance optimization for mobile networks

### Phase 6: Polish & Testing
- [ ] Accessibility audit (WCAG 2.1 AA)
- [ ] Cross-browser testing
- [ ] End-to-end tests with Playwright
- [ ] Documentation updates
- [ ] User acceptance testing

---

## 10. File Changes Summary

### New Files Created

| File | Purpose | Status |
|------|---------|--------|
| `apps/web/src/components/dynamic/member/MemberProfileCard.tsx` | Themeable profile card | ✅ Done |
| `apps/web/src/components/dynamic/member/MemberProfileHeader.tsx` | Profile hero section | ✅ Done |
| `apps/web/src/components/dynamic/member/MemberProfileLayout.tsx` | Responsive layout wrapper | ✅ Done |
| `apps/web/src/components/dynamic/member/MemberCareSummaryCard.tsx` | Read-only care/discipleship summary | ✅ Done |
| `apps/web/src/components/dynamic/member/index.ts` | Component exports | ✅ Done |
| `apps/web/metadata/authoring/blueprints/portal/my-profile.xml` | Self-view page definition | ✅ Done |
| `apps/web/src/app/portal/profile/page.tsx` | Portal profile route | ✅ Done |
| `apps/web/src/app/api/portal/profile/route.ts` | Self-profile API | ✅ Done |
| `supabase/migrations/20260109140000_add_member_self_permissions.sql` | New permissions | ✅ Done |
| `apps/web/src/app/admin/community/members/[memberId]/view/page.tsx` | Admin card-based profile view | ✅ Done |
| `apps/web/src/app/admin/my-profile/page.tsx` | Self-service profile (uses admin layout) | ✅ Done |
| `apps/web/src/app/portal/profile/page.tsx` | Redirect to `/admin/my-profile` | ✅ Done |

**Note:** Visibility utilities (`visibility.ts`) were NOT created as a separate module. Instead, permission checking is done via:
1. Server-side: `getUserPermissionCodes()` from `@/lib/rbac/permissionHelpers` (access-gate framework)
2. Client-side: Simple inline `userPermissions.some()` array checks with permissions passed as props

### Files to Modify

| File | Changes |
|------|---------|
| `apps/web/metadata/authoring/blueprints/admin-community/membership-profile.xml` | Refactor to card-based, remove care/discipleship/giving editing |
| `apps/web/metadata/authoring/blueprints/admin-community/membership-manage.xml` | Remove care/discipleship/giving form sections |
| `apps/web/src/lib/metadata/component-registry.ts` | Register new components |
| `apps/web/src/services/MemberProfileService.ts` | Add self-profile methods |
| `apps/web/src/repositories/memberProfile.repository.ts` | Add self-profile queries |
| `apps/web/src/models/member.model.ts` | Mark deprecated fields with JSDoc |

---

## 11. Success Metrics

| Metric | Current | Target |
|--------|---------|--------|
| Profile page load time | TBD | < 2s on 3G |
| Mobile usability score | TBD | > 90 (Lighthouse) |
| Fields visible to members | 0 (no self-view) | ~20 essential fields |
| Page tabs/complexity | 6 tabs, 30+ accordions | 0 tabs, 5-6 cards |
| Form fields (manage page) | ~60 fields | ~35 fields |
| Accessibility score | TBD | WCAG 2.1 AA compliant |

---

## 12. Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| Breaking existing admin workflows | High | Feature flag for gradual rollout |
| Data visibility leakage | Critical | Thorough permission testing |
| Mobile performance issues | Medium | Lazy loading, skeleton states |
| Component complexity | Medium | Incremental extraction, unit tests |
| Confusion about where to edit care data | Medium | Clear UI with "View/Edit in Care Plans" links |

---

## 13. Dependencies

- No external package additions required
- Uses existing Tailwind CSS configuration
- Uses existing shadcn/ui component library
- Compatible with current metadata compiler
- Requires existing Care Plans module
- Requires existing Discipleship Plans module

---

## 14. Open Questions

1. Should members be able to see a read-only summary of their own care plan status?
2. Should family address be editable by any family member or just head of household?
3. Should there be email/SMS notifications when profile is updated?
4. Should we track profile view audit logs?
5. When implementing Giving module in future, should it link back to member profile?

---

## Appendix A: Wireframes

### A.1 Mobile Self-View Profile

```
┌────────────────────────────────────┐
│  [<]  My Profile              [⋮]  │
├────────────────────────────────────┤
│                                    │
│         ┌──────────┐               │
│         │  Photo   │               │
│         │   📷     │               │
│         └──────────┘               │
│      Avery Johnson                 │
│      Downtown Center               │
│                                    │
├────────────────────────────────────┤
│                                    │
│  ┌─────────────────────────────┐   │
│  │ 📱 Contact Info      [Edit] │   │
│  │ ─────────────────────────── │   │
│  │ Email: avery@example.org    │   │
│  │ Phone: (555) 204-1188       │   │
│  │ Preferred: Text             │   │
│  │                             │   │
│  │ [+ Show address]            │   │
│  └─────────────────────────────┘   │
│                                    │
│  ┌─────────────────────────────┐   │
│  │ 👨‍👩‍👧‍👦 My Family            │   │
│  │ ─────────────────────────── │   │
│  │ Johnson Family              │   │
│  │ Avery, Jordan, Micah, Selah │   │
│  │                             │   │
│  │ [+ Show address]            │   │
│  └─────────────────────────────┘   │
│                                    │
│  ┌─────────────────────────────┐   │
│  │ ⛪ Church Life              │   │
│  │ ─────────────────────────── │   │
│  │ Serving: Hospitality Team   │   │
│  │ Next: Oct 27 @ 8:30am       │   │
│  │                             │   │
│  │ Groups: Leadership Cohort   │   │
│  │                             │   │
│  │ [+ Show more]               │   │
│  └─────────────────────────────┘   │
│                                    │
│  ┌─────────────────────────────┐   │
│  │ 🚨 Emergency Contact [Edit] │   │
│  │ ─────────────────────────── │   │
│  │ Jordan Johnson (Spouse)     │   │
│  │ (555) 204-1189              │   │
│  └─────────────────────────────┘   │
│                                    │
└────────────────────────────────────┘
```

### A.2 Desktop Admin View

```
┌──────────────────────────────────────────────────────────────────────────┐
│  [<] Back to List                    Member Profile              [Edit]  │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌─────────────────────────────────────────────┐ ┌─────────────────────┐ │
│  │                                             │ │    Timeline         │ │
│  │  [Photo]  Avery Johnson                     │ │ ─────────────────── │ │
│  │           Active · Downtown Center          │ │ Oct 13: Hosted      │ │
│  │                                             │ │   hospitality       │ │
│  │  ┌────────┐ ┌────────┐ ┌────────┐          │ │   huddle            │ │
│  │  │  92%   │ │  Next  │ │ Active │          │ │                     │ │
│  │  │Attend  │ │ Serve  │ │ Care   │          │ │ Oct 21: Mentor      │ │
│  │  └────────┘ └────────┘ └────────┘          │ │   meeting           │ │
│  │                                             │ │   (scheduled)       │ │
│  └─────────────────────────────────────────────┘ │                     │ │
│                                                   │ [View all →]        │ │
│  ┌──────────────────┐ ┌──────────────────┐       └─────────────────────┘ │
│  │ 📱 Contact       │ │ 👨‍👩‍👧‍👦 Family       │                            │
│  │ ──────────────── │ │ ──────────────── │       ┌─────────────────────┐ │
│  │ avery@...        │ │ Johnson Family   │       │    QR Code          │ │
│  │ (555) 204-1188   │ │ 4 members        │       │   ┌─────────┐       │ │
│  │ 412 Hope Ave     │ │ Envelope #2041   │       │   │ ▓▓▓▓▓▓▓ │       │ │
│  │ Springfield, IL  │ │                  │       │   │ ▓     ▓ │       │ │
│  │        [Edit]    │ │         [Edit]   │       │   │ ▓▓▓▓▓▓▓ │       │ │
│  └──────────────────┘ └──────────────────┘       │   └─────────┘       │ │
│                                                   │   [Download]        │ │
│  ┌──────────────────┐ ┌──────────────────┐       └─────────────────────┘ │
│  │ 🙏 Engagement    │ │ 🤝 Serving       │                               │
│  │ ──────────────── │ │ ──────────────── │                               │
│  │ Leadership Cohort│ │ Hospitality Team │                               │
│  │ Hospitality Hud. │ │ Usher Captain    │                               │
│  │ Gifts: Leadership│ │ 2nd/4th Sundays  │                               │
│  │        [Edit]    │ │ Coach: R. Kim    │                               │
│  └──────────────────┘ │         [Edit]   │                               │
│                       └──────────────────┘                               │
│                                                                          │
│  ┌───────────────────────────────────────────────────────────────────┐   │
│  │ 💚 Care & Discipleship (Read-Only)                                │   │
│  │ ─────────────────────────────────────────────────────────────────│   │
│  │                                                                   │   │
│  │  Care Plan                          Discipleship Journey          │   │
│  │  ┌─────────────────────────────┐   ┌─────────────────────────────┐│   │
│  │  │ Status: Coaching   [Active]│   │ Mentor: Carlos Vega         ││   │
│  │  │ Pastor: Lauren Patel       │   │ Next: Complete module 3     ││   │
│  │  │ Follow-up: Oct 28          │   │ Pathway: Leadership Track   ││   │
│  │  │          [View Plan →]     │   │          [View Plan →]      ││   │
│  │  └─────────────────────────────┘   └─────────────────────────────┘│   │
│  └───────────────────────────────────────────────────────────────────┘   │
│                                                                          │
│  ┌──────────────────┐                                                    │
│  │ ⚙️ Admin          │                                                    │
│  │ ──────────────── │                                                    │
│  │ ID: mem_001      │                                                    │
│  │ Stage: Active    │                                                    │
│  │ Tags: Hospitality│                                                    │
│  │        [Edit]    │                                                    │
│  └──────────────────┘                                                    │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## Appendix B: API Contracts

### B.1 Self-Profile Endpoint

```typescript
// GET /api/portal/profile
interface SelfProfileResponse {
  member: {
    id: string;
    firstName: string;
    lastName: string;
    preferredName?: string;
    photoUrl?: string;
    email?: string;
    phone?: string;
    preferredContact?: string;
    address?: {
      street?: string;
      city?: string;
      state?: string;
      postalCode?: string;
    };
    family?: {
      id: string;
      name: string;
      role: 'head' | 'spouse' | 'child' | 'dependent' | 'other';
      members: Array<{ name: string }>;
    };
    serving?: {
      team?: string;
      role?: string;
      nextServeDate?: string;
    };
    groups?: string[];
    emergencyContact?: {
      name?: string;
      phone?: string;
      relationship?: string;
    };
  };
  permissions: {
    canEditContact: boolean;
    canEditEmergency: boolean;
    canEditInterests: boolean;
  };
}

// PATCH /api/portal/profile
interface UpdateSelfProfileRequest {
  preferredName?: string;
  email?: string;
  phone?: string;
  preferredContact?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    postalCode?: string;
  };
  emergencyContact?: {
    name?: string;
    phone?: string;
    relationship?: string;
  };
  ministryInterests?: string[];
}
```

### B.2 Member Care Summary Endpoint (New)

```typescript
// GET /api/admin/members/{memberId}/care-summary
interface MemberCareSummaryResponse {
  carePlan: {
    id: string;
    status: string;
    statusVariant: 'success' | 'warning' | 'info' | 'neutral';
    assignedTo?: string;
    followUpDate?: string;
    lastUpdated?: string;
  } | null;
  discipleshipPlan: {
    id: string;
    mentor?: string;
    nextStep?: string;
    currentPathway?: string;
    lastMilestone?: string;
  } | null;
}
```

---

## Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0.0 | 2026-01-09 | Claude | Initial document |
| 1.1.0 | 2026-01-09 | Claude | Removed care/discipleship/giving fields from editing scope; added read-only summary cards with links to dedicated modules |
| 1.2.0 | 2026-01-09 | Claude | Updated implementation status; replaced custom visibility utilities with access-gate pattern (inline permission checks via `userPermissions` prop) |
| 1.3.0 | 2026-01-09 | Claude | Removed deprecated `viewerRole` prop from all components; updated component interfaces to use only `userPermissions`; Phase 1 & 2 mostly complete |
| 1.4.0 | 2026-01-09 | Claude | Phase 2 complete: Added portal layout and home page; Phase 3 partial: New admin card-based profile view created at alternate route for backward compatibility |
| 1.5.0 | 2026-01-09 | Claude | Unified layout: Removed separate portal layout; "My Profile" now uses admin layout with permission-based visibility; `/portal/profile` redirects to `/admin/my-profile` |
| 1.6.0 | 2026-01-09 | Claude | Phase 3 navigation: `/admin/members/[memberId]` now redirects to new card-based view at `/admin/community/members/[memberId]/view`; fixed permission codes (underscore format) |
| 1.7.0 | 2026-01-09 | Claude | Phase 4 complete: Simplified `membership-manage.xml` form - removed Finance tab, Care-notes section, discipleship fields; form now has 5 tabs (Profile, Engagement, Emergency, Serving, Admin) |

