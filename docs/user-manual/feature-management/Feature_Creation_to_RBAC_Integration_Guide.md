# Feature Creation to RBAC Integration - Complete User Guide

**Version:** 1.0
**Last Updated:** October 2025
**Target Audience:** Product Owners, Developers, Tenant Admins

---

## Table of Contents

1. [Introduction](#introduction)
2. [Understanding the System](#understanding-the-system)
3. [Personas & Workflows](#personas--workflows)
4. [Phase 1: Product Owner Creates Feature](#phase-1-product-owner-creates-feature)
5. [Phase 2: Developer Implements Feature](#phase-2-developer-implements-feature)
6. [Phase 3: Product Owner Publishes Feature](#phase-3-product-owner-publishes-feature)
7. [Phase 4: Tenant Admin Customizes Access](#phase-4-tenant-admin-customizes-access)
8. [Complete Lifecycle Example](#complete-lifecycle-example)
9. [Troubleshooting](#troubleshooting)
10. [Best Practices](#best-practices)

---

## Introduction

This guide walks you through the complete lifecycle of a feature in StewardTrack—from creation by a Product Owner to customization by individual church administrators. The system uses a **permission-based access control model** that provides flexibility while maintaining security.

### What You'll Learn

- How Product Owners define features with permissions
- How Developers integrate features using permission checks
- How features flow through license tiers
- How Tenant Admins customize access for their church

### Key Concepts

- **Feature**: A specific capability in the system (e.g., "Advanced Donor Reports")
- **Permission**: A granular right needed to use a feature (e.g., `donations:view`, `donations:export`)
- **License Tier**: Subscription level (Essential, Professional, Enterprise, Premium)
- **Feature Bundle**: Group of related features assigned to a license tier
- **Role Template**: Suggested permission-to-role mappings for new tenants
- **Surface**: UI element (page, component, menu item) associated with a feature

---

## Understanding the System

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    FEATURE LIFECYCLE FLOW                        │
└─────────────────────────────────────────────────────────────────┘

Product Owner                Developer              System                Tenant Admin
      │                          │                     │                        │
      ├─ Create Feature          │                     │                        │
      │  Define Permissions      │                     │                        │
      │  Set Role Templates      │                     │                        │
      │                          │                     │                        │
      │──────────────────────────┼────────────────────►│                        │
      │                          │                     │                        │
      │                          ├─ Implement Code     │                        │
      │                          │  Add Permission     │                        │
      │                          │  Checks in UI/API   │                        │
      │                          │                     │                        │
      │                          └────────────────────►│                        │
      │                                                 │                        │
      ├─ Add to Bundle                                 │                        │
      ├─ Assign to Offering                            │                        │
      │                                                 │                        │
      │─────────────────────────────────────────────────┼───────────────────────►│
      │                                                 │                        │
      │                                                 ├─ Tenant Gets License  │
      │                                                 ├─ Provision Permissions│
      │                                                 ├─ Apply Role Templates │
      │                                                 │                        │
      │                                                 └───────────────────────►│
      │                                                                          │
      │                                                                          ├─ View Features
      │                                                                          ├─ Customize Roles
      │                                                                          └─ Grant Access
```

### Permission Model

StewardTrack uses **permissions** (not roles) as the foundation of access control:

**Permission Format:** `{category}:{action}`
- Examples: `members:view`, `donations:export`, `finance:delete`
- Category: Domain area (members, donations, events, finance)
- Action: Operation (view, create, edit, delete, manage, export, import)

**Why Permissions?**
- ✅ Tenant flexibility - Admins assign permissions to ANY role they create
- ✅ Fine-grained control - Different actions for different users
- ✅ License enforcement - Features require specific permissions
- ✅ Clear boundaries - Easy to understand what each permission allows

---

## Personas & Workflows

### 🎯 Product Owner (Super Admin)

**Responsibilities:**
- Define what features exist in the system
- Specify permissions required for each feature
- Create default permission-to-role templates
- Organize features into bundles
- Assign bundles to license tiers

**Access:** Licensing Studio (`/admin/licensing`)

**Tools:**
- Feature Catalog Manager
- Permission Definition Wizard
- Feature Bundles Manager
- Product Offerings Manager

---

### 👨‍💻 Developer

**Responsibilities:**
- Build feature functionality (UI, API, business logic)
- Implement permission checks using Access Gate
- Test with different permission sets
- Document surface IDs and permission requirements

**Access:** Codebase, Development Environment

**Tools:**
- Access Gate library (`@/lib/access-gate`)
- Permission helper functions
- TypeScript types for permissions

---

### 🏢 Tenant Admin (Church Administrator)

**Responsibilities:**
- View features available in their license
- Assign permissions to roles within their church
- Create custom roles for specific needs
- Manage delegation (temporary access grants)

**Access:** RBAC Module (`/admin/rbac`)

**Tools:**
- Feature Permissions Manager
- Role Management UI
- Permission Assignment Interface
- Delegation System

---

## Phase 1: Product Owner Creates Feature

### Step 1.1: Access Feature Creation

1. Log in as Super Admin
2. Navigate to **Admin** → **Licensing** → **Features** tab
3. Click **"Create Feature"** button

You'll see the **Feature Permission Wizard** with 4 steps.

---

### Step 1.2: Basic Information (Step 1 of 4)

Fill in feature details:

| Field | Description | Example |
|-------|-------------|---------|
| **Feature Name*** | User-friendly name | `Advanced Donor Reports` |
| **Description*** | What the feature does | `Generate detailed donation analytics with custom date ranges and export capabilities` |
| **License Tier*** | Minimum tier required | `Professional` |
| **Category*** | Functional grouping | `Reporting & Analytics` |

**Tips:**
- Use clear, descriptive names (users see these)
- Write descriptions from user's perspective
- Choose tier based on feature complexity
- Category helps organize features for admins

Click **"Next: Surface Association"**

---

### Step 1.3: Surface Association (Step 2 of 4)

Connect the feature to UI elements:

| Field | Description | Example |
|-------|-------------|---------|
| **Module*** | Application module | `donations` |
| **Surface Type*** | Type of UI element | `page` |
| **Surface ID*** | Unique identifier | `advanced-donor-reports` |

**Surface Types:**
- **page**: Full page/route
- **dashboard**: Dashboard widget
- **wizard**: Multi-step form
- **manager**: Data management interface
- **console**: Administrative console
- **audit**: Audit/logging interface
- **overlay**: Modal or overlay component

**Why Surface Association?**
- Enables automatic menu hiding for unlicensed features
- Links features to specific code locations
- Provides clear mapping for developers

Click **"Next: Define Permissions"**

---

### Step 1.4: Permission Definition (Step 3 of 4)

Define permissions required for this feature:

**Add Permissions:**

1. **Quick Add Common Permissions** (if module is set):
   - Click pre-configured buttons like "View", "Create", "Edit", "Delete", "Export"
   - System auto-generates permission codes based on module

2. **Manual Permission Entry**:
   - **Permission Code***: Format `{category}:{action}` (e.g., `donations:view`)
   - **Display Name***: User-friendly label (e.g., "View Donations")
   - **Description**: What this permission allows
   - **Required**: Check if mandatory for feature to work

**Example Permissions for Advanced Donor Reports:**

```
Permission: donations:view
Display Name: View Donations
Description: View donation records and basic statistics
Required: ✓ (checked)

Permission: donations:export
Display Name: Export Donation Data
Description: Export donation reports to PDF, Excel, or CSV
Required: ☐ (unchecked)

Permission: donations:analyze
Display Name: Analyze Donation Trends
Description: Access advanced analytics and trend analysis
Required: ✓ (checked)
```

**Validation Rules:**
- Permission code must match format: `{category}:{action}`
- Category and action must be lowercase with underscores only
- At least one permission required per feature
- System warns if no "view" permission exists

**Add/Remove Permissions:**
- Click **"Add Custom Permission"** to add more
- Click trash icon to remove a permission

Click **"Next: Default Role Assignments"**

---

### Step 1.5: Default Role Assignment (Step 4 of 4)

Set default permission-to-role mappings:

For each permission, select which roles should have it **by default**:

**Standard Roles:**
- **Tenant Admin**: Always checked (cannot uncheck) - full access
- **Staff**: Standard staff-level access
- **Volunteer**: Limited volunteer access
- **Member**: Basic member self-service access

**Example Configuration:**

```
Permission: donations:view
  ☑ Tenant Admin (always)
  ☑ Staff
  ☑ Volunteer
  ☐ Member

Permission: donations:export
  ☑ Tenant Admin (always)
  ☑ Staff
  ☐ Volunteer
  ☐ Member

Permission: donations:analyze
  ☑ Tenant Admin (always)
  ☑ Staff
  ☐ Volunteer
  ☐ Member
```

**Important Notes:**
- These are **templates** (suggestions), not hard rules
- Tenant Admins can change assignments later
- Tenant Admin always gets all permissions
- Choose based on typical use cases

Click **"Create Feature"**

---

### Step 1.6: Review & Confirm

The system will:

1. ✅ Create feature record in catalog
2. ✅ Create all permission definitions
3. ✅ Store role templates
4. ✅ Generate unique feature ID
5. ✅ Set status to **DRAFT** (not yet available)

**Success!** Feature is created but not visible to tenants yet.

**Next Steps:**
- Feature appears in Features Manager
- Developer can implement functionality
- Later: Add to bundle and publish

---

## Phase 2: Developer Implements Feature

### Step 2.1: Review Feature Specification

Receive from Product Owner:
- Feature name: `Advanced Donor Reports`
- Surface ID: `advanced-donor-reports`
- Module: `donations`
- Feature ID: `feat_abc123xyz`
- Required permissions:
  - `donations:view` (required)
  - `donations:analyze` (required)
  - `donations:export` (optional)

---

### Step 2.2: Create Feature Page with Permission Check

**File:** `src/app/admin/donations/advanced-donor-reports/page.tsx`

```typescript
import { Gate } from '@/lib/access-gate';
import { ProtectedPage } from '@/components/access-gate';
import { getCurrentUserId } from '@/utils/authUtils';
import { AdvancedDonorReports } from '@/components/donations/AdvancedDonorReports';

export default async function AdvancedDonorReportsPage() {
  const userId = await getCurrentUserId();

  // Check if user has required permissions
  const gate = Gate.withPermission(['donations:view', 'donations:analyze'], 'all');

  return (
    <ProtectedPage gate={gate} userId={userId} redirectTo="/admin/access-denied">
      <div className="container mx-auto p-6">
        <h1 className="text-3xl font-bold mb-6">Advanced Donor Reports</h1>
        <AdvancedDonorReports />
      </div>
    </ProtectedPage>
  );
}
```

**Alternative: Using Surface Gate (Recommended)**

```typescript
import { Gate } from '@/lib/access-gate';
import { ProtectedPage } from '@/components/access-gate';
import { getCurrentUserId } from '@/utils/authUtils';
import { AdvancedDonorReports } from '@/components/donations/AdvancedDonorReports';

export default async function AdvancedDonorReportsPage() {
  const userId = await getCurrentUserId();

  // Surface gate checks BOTH permissions AND license
  const gate = Gate.forSurface('advanced-donor-reports');

  return (
    <ProtectedPage gate={gate} userId={userId}>
      <div className="container mx-auto p-6">
        <h1 className="text-3xl font-bold mb-6">Advanced Donor Reports</h1>
        <AdvancedDonorReports />
      </div>
    </ProtectedPage>
  );
}
```

**Key Points:**
- Use `Gate.withPermission()` for permission-only checks
- Use `Gate.forSurface()` for combined permission + license checks (recommended)
- `ProtectedPage` component handles access logic automatically
- Pass array of permission codes with `'all'` (all required) or `'any'` (any required)
- Surface ID matches what Product Owner created
- Unauthorized users are redirected gracefully

---

### Step 2.3: Implement Component with Conditional Features

**File:** `src/components/donations/AdvancedDonorReports.tsx`

```typescript
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { ReportVisualization } from './ReportVisualization';
import { ExportButton } from './ExportButton';
import { ProtectedSection } from '@/components/access-gate';

export function AdvancedDonorReports({ userId }: { userId: string }) {
  const [dateRange, setDateRange] = useState({ from: null, to: null });
  const [reportData, setReportData] = useState(null);

  const generateReport = async () => {
    const response = await fetch('/api/donations/advanced-reports', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dateRange }),
    });
    const data = await response.json();
    setReportData(data);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <DateRangePicker value={dateRange} onChange={setDateRange} />

        {/* Show export button only if user has permission */}
        <ProtectedSection
          userId={userId}
          permissions="donations:export"
          hideOnDenied={true}
        >
          <ExportButton data={reportData} />
        </ProtectedSection>
      </div>

      <Button onClick={generateReport}>Generate Report</Button>

      {reportData && <ReportVisualization data={reportData} />}
    </div>
  );
}
```

**Key Points:**
- Use `ProtectedSection` component to conditionally render features
- Set `hideOnDenied={true}` to hide instead of showing fallback
- Export button only shows if user has `donations:export` permission
- Never trust client-side checks alone (always verify in API too)
- Pass `userId` from parent component

---

### Step 2.4: Protect API Endpoints

**File:** `src/app/api/donations/advanced-reports/route.ts`

**Method 1: Using `gateProtected` Middleware (Recommended)**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { Gate } from '@/lib/access-gate';
import { gateProtected } from '@/lib/access-gate/middleware';
import { getUserIdFromRequest } from '@/utils/authUtils';
import { generateAdvancedDonorReport } from '@/services/DonorReportingService';

// Single line to protect the entire route!
export const POST = gateProtected(
  Gate.withPermission(['donations:view', 'donations:analyze'], 'all'),
  getUserIdFromRequest
)(async (request: NextRequest) => {
  // This code only runs if user has permissions
  const { dateRange } = await request.json();

  try {
    const report = await generateAdvancedDonorReport(dateRange);
    return NextResponse.json({ success: true, data: report });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to generate report' },
      { status: 500 }
    );
  }
});
```

**Method 2: Manual Check**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { Gate } from '@/lib/access-gate';
import { getCurrentUserId } from '@/utils/authUtils';
import { generateAdvancedDonorReport } from '@/services/DonorReportingService';

export async function POST(request: NextRequest) {
  const userId = await getCurrentUserId();

  // Verify permissions manually
  const gate = Gate.withPermission(['donations:view', 'donations:analyze'], 'all');
  const result = await gate.check(userId);

  if (!result.allowed) {
    return NextResponse.json(
      {
        success: false,
        error: result.reason || 'Access denied'
      },
      { status: 403 }
    );
  }

  const { dateRange } = await request.json();

  try {
    const report = await generateAdvancedDonorReport(dateRange);
    return NextResponse.json({ success: true, data: report });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to generate report' },
      { status: 500 }
    );
  }
}
```

**Critical Security Rules:**
- ✅ Always check permissions in API routes
- ✅ Never rely on client-side checks alone
- ✅ Use `gateProtected` middleware for cleaner code
- ✅ Return 403 Forbidden for unauthorized access
- ✅ Provide helpful error messages with reason

---

### Step 2.5: Add Menu Item (Optional)

**File:** Database seeding or migration

```sql
INSERT INTO menu_items (
  id,
  label,
  href,
  icon,
  parent_id,
  display_order
) VALUES (
  gen_random_uuid(),
  'Advanced Reports',
  '/admin/donations/advanced-donor-reports',
  'ChartBar',
  (SELECT id FROM menu_items WHERE href = '/admin/donations'),
  20
);

-- Link menu item to required permissions
INSERT INTO menu_permissions (menu_item_id, permission_id)
SELECT
  mi.id,
  p.id
FROM menu_items mi
CROSS JOIN permissions p
WHERE mi.href = '/admin/donations/advanced-donor-reports'
  AND p.code IN ('donations:view', 'donations:analyze');
```

**Result:** Menu item automatically hides for users without permissions

---

### Step 2.6: Test Implementation

**Test Scenarios:**

1. **Test with full permissions**:
   - Create test user with Staff role (has all permissions)
   - Verify page loads
   - Verify all features work
   - Verify export button appears

2. **Test without export permission**:
   - Remove `donations:export` from test user
   - Verify page still loads
   - Verify export button hidden
   - Verify API blocks export attempts

3. **Test without required permissions**:
   - Remove `donations:view` from test user
   - Verify page redirects to access denied
   - Verify API returns 403
   - Verify menu item hidden

4. **Test with unlicensed tenant**:
   - Test with tenant on Essential license
   - Verify access denied (Professional required)
   - Verify upgrade prompt shown

---

### Step 2.7: Document for Product Owner

Create handoff document:

```markdown
# Advanced Donor Reports - Implementation Complete

## Feature Details
- Feature ID: feat_abc123xyz
- Surface ID: advanced-donor-reports
- Route: /admin/donations/advanced-donor-reports
- Module: donations

## Permissions Implemented
✅ donations:view (required) - Controls page access
✅ donations:analyze (required) - Controls report generation
✅ donations:export (optional) - Controls export functionality

## Testing Results
✅ All permission checks working
✅ Menu integration complete
✅ API protection in place
✅ Tested with Professional tier tenant
✅ Tested with Essential tier tenant (blocked)

## Ready for Publishing
Feature is deployed and ready for Product Owner to:
1. Publish feature (change status DRAFT → PUBLISHED)
2. Add to Professional Features bundle
3. Assign bundle to Professional offering
```

**Notify Product Owner:** Implementation complete, ready for publishing

---

## Phase 3: Product Owner Publishes Feature

### Step 3.1: Verify Implementation

1. Navigate to **Admin** → **Licensing** → **Features**
2. Find **"Advanced Donor Reports"** (status: DRAFT)
3. Click feature name to view details
4. Click **"View Permissions"** to verify all permissions exist

---

### Step 3.2: Publish the Feature

1. On feature details page, click **"Edit Feature"** button
2. (Optional) Update description or details if needed
3. Feature is automatically active (features are active by default)
4. Click **"Save"**

**Result:** Feature is now published and can be added to bundles

---

### Step 3.3: Add Feature to License Bundle

1. Navigate to **Feature Bundles** tab
2. Find **"Professional Features"** bundle (or create new one)
3. Click **"Edit"** on the bundle
4. Click **"Add Features"** button
5. Search for **"Advanced Donor Reports"**
6. Check the checkbox next to it
7. Set **Display Order** (controls order in lists)
8. Click **"Save"**

**Bundle Structure Example:**

```
Professional Features Bundle
├─ Member Management (core)
├─ Event Management (core)
├─ Online Giving Integration
├─ Email Campaigns
├─ Advanced Donor Reports  ← Newly added
└─ Custom Reporting
```

---

### Step 3.4: Assign Bundle to Product Offering

1. Navigate to **Product Offerings** tab
2. Find **"Professional Plan"** offering
3. Click **"Edit"** on the offering
4. Verify **"Professional Features"** bundle is assigned
5. If not assigned:
   - Click **"Add Feature Bundle"**
   - Select **"Professional Features"**
   - Click **"Save"**

**Product Offering Structure:**

```
Professional Plan ($99/month)
├─ Base Features (Essential bundle)
├─ Professional Features (includes Advanced Donor Reports)
└─ Communication Suite
```

---

### Step 3.5: Grant to Existing Tenants

Features are automatically granted when:
- ✅ Feature is published
- ✅ Feature is in a bundle
- ✅ Bundle is in a product offering
- ✅ Tenant has active license for that offering

**For existing Professional tenants**, features are granted automatically. System will:

1. Detect tenant has Professional license
2. Find all bundles in Professional offering
3. Grant all features in those bundles
4. Provision permissions with role templates
5. Make features available immediately

**No manual intervention required** - system handles provisioning automatically.

---

### Step 3.6: Verify Feature Access

**Test with Production Tenant:**

1. Log in as user from a tenant with Professional license
2. Navigate to **Donations** module
3. ✅ Verify **"Advanced Reports"** menu item appears
4. Click menu item
5. ✅ Verify page loads successfully
6. ✅ Verify functionality works
7. Test export button (if user has permission)

**Test with Different License:**

1. Log in as user from tenant with Essential license
2. Navigate to **Donations** module
3. ❌ Verify "Advanced Reports" menu item does NOT appear
4. Try direct URL access
5. ✅ Verify redirect to access denied or upgrade page

---

## Phase 4: Tenant Admin Customizes Access

When a tenant is granted a feature, the system automatically:

1. ✅ Creates permission records in tenant's RBAC
2. ✅ Applies default role templates (from feature definition)
3. ✅ Makes permissions available for customization

Now the Tenant Admin can customize who has access.

---

### Step 4.1: Access RBAC Module

1. Log in as Tenant Admin
2. Navigate to **Admin** → **RBAC** → **Feature Permissions**
3. View all licensed features and their permissions

---

### Step 4.2: View Feature Permissions

**Feature Permissions Manager** shows:

```
┌────────────────────────────────────────────────────────────┐
│ Licensed Features                                          │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  🎯 Advanced Donor Reports                                │
│  Professional Tier • Reporting & Analytics                │
│                                                            │
│  Permissions (3):                                         │
│  ┌──────────────────────────────────────────────────┐    │
│  │ donations:view                                    │    │
│  │ View donation records and basic statistics       │    │
│  │ Required: Yes                                     │    │
│  │                                                   │    │
│  │ Currently Assigned To:                           │    │
│  │ [Tenant Admin] [Staff] [Volunteer]              │    │
│  │                                                   │    │
│  │ [Edit Assignments]                               │    │
│  └──────────────────────────────────────────────────┘    │
│                                                            │
│  ┌──────────────────────────────────────────────────┐    │
│  │ donations:export                                  │    │
│  │ Export donation reports to PDF, Excel, or CSV    │    │
│  │ Required: No                                      │    │
│  │                                                   │    │
│  │ Currently Assigned To:                           │    │
│  │ [Tenant Admin] [Staff]                          │    │
│  │                                                   │    │
│  │ [Edit Assignments]                               │    │
│  └──────────────────────────────────────────────────┘    │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

---

### Step 4.3: Edit Permission Assignments

**Scenario:** Grant `donations:export` to Ministry Leaders

1. Find the `donations:export` permission card
2. Click **"Edit Assignments"**
3. **Permission Assignment Dialog** opens:
   ```
   Permission: donations:export
   Export donation reports to PDF, Excel, or CSV

   Currently Assigned Roles:
   - Tenant Admin
   - Staff

   Available Roles:
   - Volunteer
   - Member
   - Ministry Leader  ← Select this
   - Campus Pastor
   - Finance Director
   ```
4. Check **"Ministry Leader"**
5. Click **"Save"**

**Result:** Ministry Leaders can now export donation reports

---

### Step 4.4: Remove Permission from Role

**Scenario:** Remove export permission from Volunteers

1. Find the `donations:export` permission
2. Click **"Edit Assignments"**
3. Uncheck **"Volunteer"**
4. Click **"Save"**

**Result:** Volunteers can view reports but cannot export

---

### Step 4.5: Create Custom Role with Specific Permissions

**Scenario:** Create "Donation Coordinator" role

1. Navigate to **RBAC** → **Roles**
2. Click **"Create Role"**
3. Enter details:
   ```
   Role Name: Donation Coordinator
   Description: Manages donation processing and reporting
   Scope: Tenant
   ```
4. Click **"Create"**
5. Navigate to **Feature Permissions**
6. For each relevant permission, click **"Edit Assignments"**
7. Add **"Donation Coordinator"** to:
   - `donations:view` ✓
   - `donations:create` ✓
   - `donations:edit` ✓
   - `donations:export` ✓
   - `donations:analyze` ✓
   - `donations:delete` ✗ (not granted)

**Result:** Custom role with specific permission set

---

### Step 4.6: Assign Users to Roles

1. Navigate to **RBAC** → **Users**
2. Find user (e.g., "John Smith")
3. Click **"Manage Roles"**
4. Add **"Donation Coordinator"** role
5. Click **"Save"**

**Result:** John Smith now has Donation Coordinator permissions

---

### Step 4.7: Use Delegation for Temporary Access

**Scenario:** Give Finance Director temporary export access

1. Navigate to **RBAC** → **Delegation**
2. Click **"Create Delegation"**
3. Configure:
   ```
   Delegate From: Tenant Admin
   Delegate To: Sarah Chen (Finance Director)
   Duration: 30 days
   Reason: Year-end reporting assistance

   Permissions:
   ✓ donations:export (read-only)
   ✓ donations:analyze (read-only)
   ```
4. Click **"Create Delegation"**

**Result:** Sarah has export access for 30 days, then auto-revoked

---

## Complete Lifecycle Example

### Example: Adding "Recurring Giving Management" Feature

#### Phase 1: Product Owner (Day 1)

**Create Feature:**
```
Feature Name: Recurring Giving Management
Description: Manage recurring donation schedules, payment methods, and donor communication
Tier: Professional
Category: Financial Management
Module: donations
Surface ID: recurring-giving-management
Surface Type: manager

Permissions:
1. donations:view_recurring (required)
   - "View Recurring Donations"
   - Default roles: [Tenant Admin, Staff]

2. donations:manage_recurring (required)
   - "Manage Recurring Donations"
   - Default roles: [Tenant Admin, Staff]

3. donations:cancel_recurring (required)
   - "Cancel Recurring Donations"
   - Default roles: [Tenant Admin]

4. donations:edit_payment_methods (optional)
   - "Edit Payment Methods"
   - Default roles: [Tenant Admin, Staff]
```

**Result:** Feature created with ID `feat_recurring_123`

---

#### Phase 2: Developer (Days 2-5)

**Day 2 - Create Page:**

```typescript
// src/app/admin/donations/recurring-giving-management/page.tsx
import { Gate } from '@/lib/access-gate';

export default async function RecurringGivingPage() {
  const gate = Gate.withPermissions(
    ['donations:view_recurring', 'donations:manage_recurring'],
    'all'
  );

  if (!(await gate.check())) {
    redirect('/admin/access-denied');
  }

  return <RecurringGivingManager />;
}
```

**Day 3 - Implement Component:**

```typescript
// src/components/donations/RecurringGivingManager.tsx
'use client';

export function RecurringGivingManager() {
  const canCancel = useGate(['donations:cancel_recurring']);
  const canEditPayment = useGate(['donations:edit_payment_methods']);

  return (
    <div>
      <RecurringDonationList />
      {canEditPayment && <PaymentMethodEditor />}
      {canCancel && <CancelSubscriptionButton />}
    </div>
  );
}
```

**Day 4 - Protect API:**

```typescript
// src/app/api/donations/recurring/[id]/cancel/route.ts
export async function POST(request: NextRequest) {
  const gate = Gate.withPermissions(['donations:cancel_recurring']);
  if (!(await gate.check())) {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 });
  }

  // Cancel recurring donation...
}
```

**Day 5 - Test & Deploy**

---

#### Phase 3: Product Owner (Day 6)

**Publish Feature:**
1. Edit feature (already active)
2. Add to "Professional Features" bundle
3. Professional offering already has this bundle
4. Save changes

**Automatic Provisioning:**
- System detects 24 tenants have Professional license
- Creates 4 permissions for each tenant (96 total permission records)
- Applies default role templates:
  - Tenant Admin: All 4 permissions
  - Staff: 3 permissions (not cancel)
- Takes ~2 seconds total

**Result:** 24 churches immediately have access

---

#### Phase 4: Tenant Admin (Day 7+)

**Church A (Typical Use Case):**
- No changes needed
- Default templates work perfectly
- Staff can manage, admins can cancel

**Church B (Custom Need):**
- Create "Stewardship Director" role
- Grant all recurring giving permissions
- Assign role to 2 staff members

**Church C (Restricted Access):**
- Remove `donations:edit_payment_methods` from Staff role
- Only Tenant Admin can edit payment methods
- Added security for sensitive financial data

**Church D (Delegation):**
- Year-end audit coming up
- Delegate view/export permissions to external auditor
- Set 60-day expiration
- Auto-revoked after audit complete

---

## Troubleshooting

### Issue: Feature not showing for tenant

**Symptoms:** Tenant has correct license, but feature doesn't appear

**Checks:**
1. ✅ Feature is published (not DRAFT)
2. ✅ Feature in a bundle
3. ✅ Bundle assigned to correct offering
4. ✅ Tenant license matches offering
5. ✅ Permissions provisioned

**Solution:**

```sql
-- Verify feature grants
SELECT * FROM tenant_feature_grants
WHERE tenant_id = '<tenant_id>'
  AND feature_id = (SELECT id FROM feature_catalog WHERE name = 'Feature Name');

-- If missing, system will auto-grant on next license check
-- Or manually refresh:
-- (Contact system administrator)
```

---

### Issue: User can't access feature

**Symptoms:** User has correct role but gets access denied

**Checks:**
1. ✅ User assigned to role
2. ✅ Role has required permissions
3. ✅ Permissions are marked active
4. ✅ User logged out and back in (clear session)

**Solution (Tenant Admin):**
1. Go to **RBAC** → **Feature Permissions**
2. Find the feature
3. Verify role has required permissions
4. If missing, click **"Edit Assignments"** and add role
5. Have user log out and back in

---

### Issue: Permission changes not taking effect

**Symptoms:** Changed permissions but user still sees old behavior

**Cause:** Session cache not refreshed

**Solution:**
1. Have user **log out completely**
2. **Log back in**
3. Clear browser cache (Ctrl+Shift+Delete)
4. Try again

**For persistent issues:**
- Check browser console for errors
- Verify API returns 200 (not 403)
- Contact developer to verify permission checks in code

---

### Issue: Menu item visible but page gives access denied

**Symptoms:** User sees menu item, clicks it, gets blocked

**Cause:** Menu permissions don't match page permissions

**Developer Fix Required:**
```typescript
// Page requires both permissions
Gate.withPermissions(['donations:view', 'donations:export'], 'all')

// But menu only checks one
// Fix: Update menu_permissions to include both
```

---

## Best Practices

### For Product Owners

✅ **DO:**
- Use clear, user-friendly feature names
- Write descriptions from user's perspective
- Choose appropriate license tiers (don't over-tier basic features)
- Define granular permissions (separate view, edit, delete)
- Set sensible default role templates
- Test with development tenant before publishing
- Document feature dependencies

❌ **DON'T:**
- Create features without permissions
- Use technical jargon in feature names
- Lock basic functionality behind high tiers
- Create overly broad permissions (e.g., `app:do_everything`)
- Skip role template definition (forces every tenant to configure)
- Publish untested features

---

### For Developers

✅ **DO:**
- Check permissions in BOTH pages AND API routes
- Use permission arrays for multiple requirements
- Provide helpful error messages
- Test with various permission sets
- Document surface IDs clearly
- Use TypeScript types for permissions
- Handle permission checks gracefully (don't crash)

❌ **DON'T:**
- Trust client-side permission checks alone
- Hard-code permission checks (use Access Gate)
- Expose sensitive data without permission verification
- Forget to check optional permissions
- Use arbitrary permission codes (follow format)
- Skip testing with unlicensed tenants

**Code Examples:**

```typescript
// ✅ GOOD - Multiple checks
const gate = Gate.withPermissions(
  ['donations:view', 'donations:export'],
  'all'
);

// ❌ BAD - No check
const data = await getDonationData(); // Anyone can call

// ✅ GOOD - Graceful handling
if (!(await gate.check())) {
  return <UpgradePrompt feature="Advanced Reports" />;
}

// ❌ BAD - Crashes
const data = await gate.verify(); // Throws error if denied
```

---

### For Tenant Admins

✅ **DO:**
- Review default permissions when features are added
- Create roles that match your org structure
- Document custom roles and why you created them
- Use delegation for temporary access needs
- Remove unnecessary permissions from roles
- Train users on what they can access
- Review permission grants quarterly

❌ **DON'T:**
- Grant all permissions to all roles (security risk)
- Create too many custom roles (hard to manage)
- Forget to remove delegations when no longer needed
- Grant sensitive permissions (delete, export) to untrained users
- Ignore permission changes (review audit logs)

**Permission Philosophy:**

```
Principle of Least Privilege:
- Start with minimal permissions
- Add permissions as needs are proven
- Remove permissions when no longer needed
- Review periodically

Example:
- Volunteers: view only
- Staff: view + edit
- Directors: view + edit + export
- Admins: all permissions
```

---

## Appendix

### Permission Naming Conventions

**Format:** `{category}:{action}`

**Valid Categories:**
- `members` - Member management
- `donations` - Giving and donations
- `events` - Event management
- `finance` - Financial operations
- `communication` - Email, SMS, notifications
- `reporting` - Reports and analytics
- `administration` - System configuration

**Valid Actions:**
- `view` - Read access
- `create` - Create new records
- `edit` / `update` - Modify existing records
- `delete` - Remove records
- `manage` - Full CRUD access
- `export` - Export data
- `import` - Import data
- `approve` - Approval workflows
- `publish` - Publishing workflows

**Examples:**
```
✅ members:view
✅ donations:export
✅ finance:approve
✅ events:manage

❌ memberView (wrong format)
❌ donations_export (wrong separator)
❌ finance:do-stuff (invalid action)
```

---

### Feature Categories

| Category | Description | Examples |
|----------|-------------|----------|
| **Foundation** | Core features needed by all | Member directory, basic giving |
| **Engagement** | Member interaction | Events, small groups, volunteer management |
| **Financial** | Money management | Accounting, budgets, payroll |
| **Communication** | Messaging tools | Email campaigns, SMS, push notifications |
| **Reporting** | Analytics and insights | Custom reports, dashboards, exports |
| **Multi-Campus** | Multi-location support | Campus management, consolidated reporting |
| **Administration** | System config | User management, security settings |

---

### Quick Reference: API Endpoints

#### Features
```
GET    /api/licensing/features              List all features
POST   /api/licensing/features              Create feature
GET    /api/licensing/features/[id]         Get feature details
PUT    /api/licensing/features/[id]         Update feature
DELETE /api/licensing/features/[id]         Delete feature
```

#### Permissions
```
GET    /api/licensing/features/[id]/permissions       List feature permissions
POST   /api/licensing/features/[id]/permissions       Create permission
PUT    /api/licensing/features/[id]/permissions/[pid] Update permission
DELETE /api/licensing/features/[id]/permissions/[pid] Delete permission
```

#### RBAC (Tenant Admin)
```
GET    /api/rbac/features                   List licensed features
GET    /api/rbac/permissions                List tenant permissions
PUT    /api/rbac/permissions/[id]/roles     Update role assignments
GET    /api/rbac/roles                      List roles
POST   /api/rbac/delegations                Create delegation
```

---

## Summary

This guide covered the complete feature lifecycle:

1. **Product Owner** defines features with permissions and templates
2. **Developer** implements features with permission checks
3. **Product Owner** publishes features and assigns to bundles
4. **System** provisions permissions with default templates
5. **Tenant Admin** customizes permissions for their organization

By following this process, StewardTrack ensures:
- ✅ Controlled feature access based on licensing
- ✅ Flexible permissions within each tenant
- ✅ Secure implementation with multiple check layers
- ✅ Clear audit trails for compliance
- ✅ Scalable permission management

---

**Questions or Issues?**
- Technical Support: support@stewardtrack.com
- Feature Requests: product@stewardtrack.com
- Documentation: https://docs.stewardtrack.com

---

*Last Updated: October 2025*
*Version: 1.0*
*Based on actual StewardTrack implementation*
