# StewardTrack Feature Audit Document

**Version:** 1.4
**Date:** January 2026
**Purpose:** Comprehensive inventory of all implemented pages, features, permissions, and license tiers
**Last Updated:** Added serving.core and giving.profiles features with RBAC permissions

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Licensing Philosophy](#licensing-philosophy)
3. [License Tier Hierarchy](#license-tier-hierarchy)
4. [Feature Categories](#feature-categories)
5. [Detailed Feature Inventory](#detailed-feature-inventory)
6. [Permission Definitions](#permission-definitions)
7. [Implementation Status](#implementation-status)

---

## Executive Summary

### System Statistics

| Category | Count |
|----------|-------|
| Total Pages | 57 |
| Admin Pages | 44 |
| Public Pages | 9 |
| Protected Pages | 4 |
| API Routes | 126 |
| Metadata Blueprints | 129 |
| Licensable Features | 25 |
| Proposed Permissions | 81+ |

### License Tier Distribution

| Tier | Core Features | Premium Enhancements | Target Audience |
|------|---------------|----------------------|-----------------|
| Essential | 11 | 0 | Small churches (<100 members) |
| Premium | 11 | 6 | Growing churches (100-300 members) |
| Professional | 11 | 12 | Medium churches (300-500 members) |
| Enterprise | 11 | 17 | Large churches/multi-campus (500+ members) |

> **Note:** Custom product offerings can be created by super-admins with any feature combination.

---

## Licensing Philosophy

### Core Features Available to ALL Tiers

**IMPORTANT:** All tenants, regardless of tier, receive access to core functionality for every feature area. This ensures that:
- Every church can experience the platform's value immediately
- Core operations are never blocked by licensing
- Only advanced customization and premium enhancements are tier-gated

### What Varies by Tier

Higher tiers unlock:
1. **Capacity limits** (member count, transaction volume)
2. **Advanced features** (bulk operations, scheduling, automation)
3. **Additional integrations** (SMS, API, webhooks)
4. **Premium modules** (care plans, discipleship, advanced RBAC)

---

## License Tier Hierarchy

```
Essential → Premium → Professional → Enterprise
```

> **Note:** Super-admins can create custom product offerings with specific feature combinations
> beyond the standard tiers through the Product Offerings management UI.

### Essential Tier
**Target:** Small churches (<100 members)
**Price Point:** Entry-level / Free trial
**Member Limit:** Up to 100 profiles

**Core Features (available to ALL tiers):**
- Member directory and profiles (basic)
- Household management
- Event planning and calendar
- Financial viewing (read-only)
- In-app notifications
- Email integration (basic)
- RBAC viewing
- Tenant settings
- Admin dashboard

---

### Premium Tier
**Target:** Growing churches (100-300 members)
**Price Point:** Standard
**Member Limit:** Up to 300 profiles

**Includes all Essential features PLUS:**
- Member invitations (portal access)
- Care plans (pastoral care)
- Discipleship plans
- Event registration & attendance
- Push notifications

---

### Professional Tier
**Target:** Medium churches (300-500 members)
**Price Point:** Professional
**Member Limit:** Up to 500 profiles

**Includes all Premium features PLUS:**
- Full financial management (create/edit/approve)
- Budget management
- SMS integration
- RBAC management & audit trail
- Bulk member operations

---

### Enterprise Tier
**Target:** Large churches/multi-campus (500+ members)
**Price Point:** Enterprise
**Member Limit:** Up to 2000 profiles

**Includes all Professional features PLUS:**
- Multi-role support
- Role delegation with scopes (Campus/Ministry)
- Advanced analytics
- Unlimited member profiles
- Custom API integrations
- Webhook integration
- Advanced reporting with scheduling
- Scheduled notifications

---

## Feature Categories

### 1. Core Platform
- Authentication & Authorization
- Tenant Management
- Dashboard

### 2. Church Management
- Member Management
- Household Management
- Care Plans
- Discipleship Plans

### 3. Financial
- Financial Viewing
- Financial Management
- Budget Management

### 4. Community & Events
- Event Planning
- Event Registration

### 5. Communications
- Notifications
- Push Notifications
- Email Integration
- SMS Integration

### 6. Security & Access Control
- RBAC Core
- RBAC Management
- Multi-Role Support
- Role Delegation

---

## Detailed Feature Inventory

> **Note:** Features marked with **Tier: Essential (Core)** are available to ALL tiers.
> Features with higher tier requirements unlock additional capabilities on top of the core.

---

### CORE FEATURES (Available to ALL Tiers)

---

#### Feature: `members.core`
**Display Name:** Member Management
**Category:** Core
**Description:** Member directory, profiles, and basic management
**Tier:** Essential (Core) - Available to ALL tiers

| Permission Code | Display Name | Description | Required |
|-----------------|--------------|-------------|----------|
| `members:view` | View Members | View member directory and profiles | Yes |
| `members:search` | Search Members | Search and filter member records | Yes |
| `members:create` | Create Members | Add new member records | Yes |
| `members:edit` | Edit Members | Modify existing member records | Yes |
| `members:delete` | Delete Members | Remove member records | No |

**Pages:**
- `/admin/members` - Module hub
- `/admin/members/list` - Member listing
- `/admin/members/[memberId]` - Member profile
- `/admin/members/manage` - Member management
- `/admin/members/manage/lookup-new` - Create new member

---

#### Feature: `households.core`
**Display Name:** Household Management
**Category:** Core
**Description:** Track family units and relationships
**Tier:** Essential (Core) - Available to ALL tiers

| Permission Code | Display Name | Description | Required |
|-----------------|--------------|-------------|----------|
| `households:view` | View Households | View household records | Yes |
| `households:create` | Create Households | Create new household units | Yes |
| `households:edit` | Edit Households | Modify household information | Yes |
| `households:delete` | Delete Households | Remove household records | No |
| `households:manage_members` | Manage Household Members | Add/remove members from households | Yes |

**Pages:**
- `/admin/community/households` - Module hub
- `/admin/community/households/list` - Household listing
- `/admin/community/households/manage` - Create/edit households
- `/admin/community/households/[householdId]` - Household detail

---

#### Feature: `events.core`
**Display Name:** Event Management
**Category:** Management
**Description:** Church event planning and calendar management
**Tier:** Essential (Core) - Available to ALL tiers

| Permission Code | Display Name | Description | Required |
|-----------------|--------------|-------------|----------|
| `events:view` | View Events | View event listings and details | Yes |
| `events:create` | Create Events | Create new events | Yes |
| `events:edit` | Edit Events | Modify event details | Yes |
| `events:delete` | Delete Events | Remove events | No |
| `events:publish` | Publish Events | Make events visible publicly | Yes |

**Pages:**
- `/admin/community/planning` - Module hub
- `/admin/community/planning/calendar` - Calendar view
- `/admin/community/planning/manage` - Create/edit events

---

#### Feature: `finance.core`
**Display Name:** Financial Viewing
**Category:** Reporting
**Description:** View financial transactions and summaries
**Tier:** Essential (Core) - Available to ALL tiers

| Permission Code | Display Name | Description | Required |
|-----------------|--------------|-------------|----------|
| `finance:view` | View Finances | View financial records | Yes |
| `finance:view_summary` | View Summary | View financial summaries | Yes |

**Pages:**
- `/admin/finance` - Finance module hub
- `/admin/finance/transactions` - Transaction listing (view only)

---

#### Feature: `notifications.core`
**Display Name:** Notifications
**Category:** Notification
**Description:** In-app notifications and alerts
**Tier:** Essential (Core) - Available to ALL tiers

| Permission Code | Display Name | Description | Required |
|-----------------|--------------|-------------|----------|
| `notifications:view` | View Notifications | View own notifications | Yes |
| `notifications:manage` | Manage Notifications | Mark read, delete notifications | Yes |
| `notifications:preferences` | Notification Preferences | Configure notification settings | Yes |
| `notifications:send` | Send Notifications | Send in-app notifications | Yes |

---

#### Feature: `integrations.email`
**Display Name:** Email Integration
**Category:** Integration
**Description:** Basic email sending capabilities
**Tier:** Essential (Core) - Available to ALL tiers

| Permission Code | Display Name | Description | Required |
|-----------------|--------------|-------------|----------|
| `integrations:email_view` | View Email Settings | View email configuration | Yes |
| `integrations:email_send` | Send Emails | Send emails to members | Yes |

---

#### Feature: `rbac.core`
**Display Name:** RBAC Core
**Category:** Security
**Description:** Basic role-based access control viewing
**Tier:** Essential (Core) - Available to ALL tiers

| Permission Code | Display Name | Description | Required |
|-----------------|--------------|-------------|----------|
| `rbac:view` | View RBAC | View RBAC configuration | Yes |
| `rbac:roles_view` | View Roles | View role definitions | Yes |
| `rbac:users_view` | View User Roles | View user role assignments | Yes |

**Pages:**
- `/admin/security/rbac` - RBAC dashboard

---

#### Feature: `settings.core`
**Display Name:** Tenant Settings
**Category:** Management
**Description:** Configure tenant-specific settings
**Tier:** Essential (Core) - Available to ALL tiers

| Permission Code | Display Name | Description | Required |
|-----------------|--------------|-------------|----------|
| `settings:view` | View Settings | View tenant settings | Yes |
| `settings:edit` | Edit Settings | Modify tenant settings | Yes |

**Pages:**
- `/admin/settings` - Tenant settings

---

#### Feature: `dashboard.core`
**Display Name:** Admin Dashboard
**Category:** Core
**Description:** Main administrative dashboard with widgets
**Tier:** Essential (Core) - Available to ALL tiers

| Permission Code | Display Name | Description | Required |
|-----------------|--------------|-------------|----------|
| `dashboard:view` | View Dashboard | Access admin dashboard | Yes |
| `dashboard:widgets` | Dashboard Widgets | View dashboard widgets | Yes |

**Pages:**
- `/admin/dashboard` - Main dashboard

---

#### Feature: `reports.core`
**Display Name:** Basic Reports
**Category:** Reporting
**Description:** Basic reporting and export capabilities
**Tier:** Essential (Core) - Available to ALL tiers

| Permission Code | Display Name | Description | Required |
|-----------------|--------------|-------------|----------|
| `reports:view` | View Reports | Access basic reports | Yes |
| `reports:export_basic` | Basic Export | Export to CSV | Yes |

---

#### Feature: `groups.core`
**Display Name:** Groups Management
**Category:** Management
**Description:** Manage ministry groups and small groups
**Tier:** Essential (Core) - Available to ALL tiers

| Permission Code | Display Name | Description | Required |
|-----------------|--------------|-------------|----------|
| `groups:view` | View Groups | View group listings | Yes |
| `groups:create` | Create Groups | Create new groups | Yes |
| `groups:edit` | Edit Groups | Modify group details | Yes |
| `groups:delete` | Delete Groups | Remove groups | No |
| `groups:members` | Manage Group Members | Add/remove group members | Yes |

**Pages:**
- `/admin/community/groups` - Groups module hub
- `/admin/community/groups/list` - Group listing

---

### PREMIUM TIER FEATURES

> These features are available to Premium tier and above

---

#### Feature: `members.invitations`
**Display Name:** Member Invitations
**Category:** Communication
**Description:** Invite members to create portal accounts
**Tier:** Premium+

| Permission Code | Display Name | Description | Required |
|-----------------|--------------|-------------|----------|
| `members:invite` | Invite Members | Send portal invitations | Yes |
| `members:invite_manage` | Manage Invitations | View/cancel pending invitations | Yes |

---

#### Feature: `members.export`
**Display Name:** Member Export
**Category:** Reporting
**Description:** Export member data to various formats
**Tier:** Premium+

| Permission Code | Display Name | Description | Required |
|-----------------|--------------|-------------|----------|
| `members:export` | Export Members | Export member data to CSV/Excel | Yes |
| `members:export_advanced` | Advanced Export | Export with custom fields | No |

---

#### Feature: `care.plans`
**Display Name:** Care Plans
**Category:** Management
**Description:** Pastoral care tracking and follow-up management
**Tier:** Premium+

| Permission Code | Display Name | Description | Required |
|-----------------|--------------|-------------|----------|
| `care:view` | View Care Plans | View pastoral care records | Yes |
| `care:create` | Create Care Plans | Create new care plans | Yes |
| `care:edit` | Edit Care Plans | Modify care plan details | Yes |
| `care:delete` | Delete Care Plans | Remove care plan records | No |
| `care:assign` | Assign Care Plans | Assign caregivers to plans | Yes |
| `care:complete` | Complete Care Plans | Mark care plans as complete | Yes |

**Pages:**
- `/admin/community/care-plans` - Module hub
- `/admin/community/care-plans/list` - Care plans listing
- `/admin/community/care-plans/manage` - Create/edit care plans
- `/admin/community/care-plans/[carePlanId]` - Care plan detail

---

#### Feature: `discipleship.plans`
**Display Name:** Discipleship Plans
**Category:** Management
**Description:** Spiritual growth tracking and discipleship pathways
**Tier:** Premium+

| Permission Code | Display Name | Description | Required |
|-----------------|--------------|-------------|----------|
| `discipleship:view` | View Discipleship Plans | View discipleship records | Yes |
| `discipleship:create` | Create Discipleship Plans | Create new discipleship plans | Yes |
| `discipleship:edit` | Edit Discipleship Plans | Modify discipleship details | Yes |
| `discipleship:delete` | Delete Discipleship Plans | Remove discipleship records | No |
| `discipleship:assign` | Assign Mentors | Assign mentors to disciples | Yes |
| `discipleship:progress` | Track Progress | Update progress milestones | Yes |

**Pages:**
- `/admin/community/discipleship-plans` - Module hub
- `/admin/community/discipleship-plans/list` - Plans listing
- `/admin/community/discipleship-plans/manage` - Create/edit plans
- `/admin/community/discipleship-plans/[discipleshipPlanId]` - Plan detail

---

#### Feature: `events.registration`
**Display Name:** Event Registration
**Category:** Management
**Description:** Online event registration and attendance tracking
**Tier:** Premium+

| Permission Code | Display Name | Description | Required |
|-----------------|--------------|-------------|----------|
| `events:registrations_view` | View Registrations | View event registrations | Yes |
| `events:registrations_manage` | Manage Registrations | Approve/cancel registrations | Yes |
| `events:attendance` | Track Attendance | Record event attendance | Yes |

---

#### Feature: `notifications.push`
**Display Name:** Push Notifications
**Category:** Notification
**Description:** Mobile push notifications
**Tier:** Premium+

| Permission Code | Display Name | Description | Required |
|-----------------|--------------|-------------|----------|
| `notifications:push_send` | Send Push Notifications | Send push to members | Yes |
| `notifications:push_manage` | Manage Device Tokens | Manage registered devices | Yes |

---

### PROFESSIONAL TIER FEATURES

> These features are available to Professional tier and above

---

#### Feature: `finance.management`
**Display Name:** Financial Management
**Category:** Management
**Description:** Full financial transaction management
**Tier:** Professional+

| Permission Code | Display Name | Description | Required |
|-----------------|--------------|-------------|----------|
| `finance:create` | Create Transactions | Record new transactions | Yes |
| `finance:edit` | Edit Transactions | Modify transaction records | Yes |
| `finance:delete` | Delete Transactions | Remove transactions | No |
| `finance:approve` | Approve Transactions | Approve pending transactions | Yes |

**Pages:**
- `/admin/finance/manage` - Transaction management

---

#### Feature: `finance.budgets`
**Display Name:** Budget Management
**Category:** Management
**Description:** Create and manage church budgets
**Tier:** Professional+

| Permission Code | Display Name | Description | Required |
|-----------------|--------------|-------------|----------|
| `budgets:view` | View Budgets | View budget allocations | Yes |
| `budgets:create` | Create Budgets | Create new budgets | Yes |
| `budgets:edit` | Edit Budgets | Modify budget allocations | Yes |
| `budgets:delete` | Delete Budgets | Remove budgets | No |
| `budgets:approve` | Approve Budgets | Approve budget changes | Yes |

**Pages:**
- `/admin/finance/budgets` - Budget management

---

#### Feature: `integrations.sms`
**Display Name:** SMS Integration
**Category:** Integration
**Description:** Configure SMS/Twilio for text messaging
**Tier:** Professional+

| Permission Code | Display Name | Description | Required |
|-----------------|--------------|-------------|----------|
| `integrations:sms_configure` | Configure SMS | Setup SMS provider | Yes |
| `integrations:sms_test` | Test SMS | Send test messages | Yes |
| `integrations:sms_send` | Send SMS | Send SMS to members | Yes |

---

#### Feature: `integrations.email_advanced`
**Display Name:** Advanced Email Configuration
**Category:** Integration
**Description:** Advanced email provider configuration
**Tier:** Professional+

| Permission Code | Display Name | Description | Required |
|-----------------|--------------|-------------|----------|
| `integrations:email_configure` | Configure Email | Setup custom email provider | Yes |
| `integrations:email_test` | Test Email | Send test emails | Yes |
| `integrations:email_templates` | Email Templates | Manage email templates | Yes |

---

#### Feature: `rbac.management`
**Display Name:** RBAC Management
**Category:** Security
**Description:** Create and manage roles and permissions with audit trail
**Tier:** Professional+

| Permission Code | Display Name | Description | Required |
|-----------------|--------------|-------------|----------|
| `rbac:roles_create` | Create Roles | Create new roles | Yes |
| `rbac:roles_edit` | Edit Roles | Modify role definitions | Yes |
| `rbac:roles_delete` | Delete Roles | Remove roles | No |
| `rbac:assign` | Assign Roles | Assign roles to users | Yes |
| `rbac:revoke` | Revoke Roles | Remove roles from users | Yes |
| `rbac:audit_view` | View Audit Trail | View RBAC audit logs | Yes |

**Pages:**
- `/admin/security/rbac/roles` - Role management
- `/admin/security/rbac/audit` - Audit trail view

---

#### Feature: `members.bulk`
**Display Name:** Bulk Member Operations
**Category:** Management
**Description:** Bulk operations for member management
**Tier:** Professional+

| Permission Code | Display Name | Description | Required |
|-----------------|--------------|-------------|----------|
| `members:bulk_update` | Bulk Update | Update multiple members at once | Yes |
| `members:bulk_import` | Bulk Import | Import members from file | Yes |
| `members:invite_bulk` | Bulk Invitations | Send multiple invitations | Yes |

---

#### Feature: `serving.core`
**Display Name:** Volunteer Serving
**Category:** Management
**Description:** Manage volunteer serving assignments and schedules
**Tier:** Professional+

| Permission Code | Display Name | Description | Required |
|-----------------|--------------|-------------|----------|
| `serving:view` | View Serving | View volunteer serving assignments | Yes |
| `serving:create` | Create Serving | Create serving assignments | Yes |
| `serving:edit` | Edit Serving | Modify serving assignments | Yes |
| `serving:delete` | Delete Serving | Remove serving assignments | No |

**Pages:**
- `/admin/community/serving` - Module hub
- `/admin/community/serving/list` - Serving assignments listing
- `/admin/community/serving/manage` - Create/edit serving assignments

---

#### Feature: `giving.profiles`
**Display Name:** Giving Profiles
**Category:** Management
**Description:** Member giving profile management and insights
**Tier:** Professional+

| Permission Code | Display Name | Description | Required |
|-----------------|--------------|-------------|----------|
| `giving:view` | View Giving | View member giving profiles | Yes |
| `giving:edit` | Edit Giving | Modify giving profiles | Yes |

**Pages:**
- `/admin/finance/giving` - Giving profiles overview
- `/admin/members/[memberId]/giving` - Member giving profile

---

### ENTERPRISE TIER FEATURES

> These features are available to Enterprise tier and above

---

#### Feature: `rbac.multi_role`
**Display Name:** Multi-Role Support
**Category:** Security
**Description:** Allow users to have multiple roles simultaneously
**Tier:** Enterprise+

| Permission Code | Display Name | Description | Required |
|-----------------|--------------|-------------|----------|
| `rbac:multi_role_enable` | Enable Multi-Role | Enable multi-role for tenant | Yes |
| `rbac:multi_role_assign` | Assign Multiple Roles | Assign multiple roles to user | Yes |
| `rbac:multi_role_analyze` | Analyze Conflicts | Check for permission conflicts | Yes |

**Pages:**
- `/admin/rbac/multi-role` - Multi-role management

---

#### Feature: `rbac.delegation`
**Display Name:** Role Delegation
**Category:** Security
**Description:** Delegate roles to other users with scopes (Campus/Ministry)
**Tier:** Enterprise+

| Permission Code | Display Name | Description | Required |
|-----------------|--------------|-------------|----------|
| `rbac:delegate` | Delegate Roles | Delegate roles to others | Yes |
| `rbac:delegate_revoke` | Revoke Delegations | Revoke delegated access | Yes |
| `rbac:delegate_view` | View Delegations | View active delegations | Yes |

**Pages:**
- `/admin/rbac/delegate-access` - Delegate access management
- `/admin/rbac/delegated-console` - Delegated user console

---

#### Feature: `rbac.audit_export`
**Display Name:** Audit Export
**Category:** Security
**Description:** Export audit trail data for compliance
**Tier:** Enterprise

| Permission Code | Display Name | Description | Required |
|-----------------|--------------|-------------|----------|
| `rbac:audit_export` | Export Audit Data | Export audit logs | Yes |

---

#### Feature: `limits.unlimited`
**Display Name:** Unlimited Capacity
**Category:** Management
**Description:** No limits on member profiles or transactions
**Tier:** Enterprise

| Permission Code | Display Name | Description | Required |
|-----------------|--------------|-------------|----------|
| `limits:unlimited_members` | Unlimited Members | No member count restrictions | Yes |
| `limits:unlimited_transactions` | Unlimited Transactions | No transaction count restrictions | Yes |

---

#### Feature: `integrations.api`
**Display Name:** API Integrations
**Category:** Integration
**Description:** REST API access and webhook integrations
**Tier:** Enterprise

| Permission Code | Display Name | Description | Required |
|-----------------|--------------|-------------|----------|
| `integrations:api_access` | API Access | Access REST API | Yes |
| `integrations:webhook_configure` | Configure Webhooks | Setup webhook endpoints | Yes |
| `integrations:webhook_test` | Test Webhooks | Test webhook delivery | Yes |

---

#### Feature: `reports.advanced`
**Display Name:** Advanced Reporting
**Category:** Reporting
**Description:** Comprehensive reports with scheduling
**Tier:** Enterprise

| Permission Code | Display Name | Description | Required |
|-----------------|--------------|-------------|----------|
| `reports:generate` | Generate Reports | Create comprehensive reports | Yes |
| `reports:export_advanced` | Advanced Export | Export to PDF/Excel with formatting | Yes |
| `reports:schedule` | Schedule Reports | Schedule automated reports | Yes |

---

#### Feature: `notifications.scheduled`
**Display Name:** Scheduled Notifications
**Category:** Notification
**Description:** Schedule notifications for future delivery
**Tier:** Enterprise

| Permission Code | Display Name | Description | Required |
|-----------------|--------------|-------------|----------|
| `notifications:schedule` | Schedule Notifications | Create scheduled notifications | Yes |
| `notifications:bulk_send` | Bulk Send | Send to large groups | Yes |

---

## Permission Definitions

### Standard Permission Code Format

```
{module}:{action}
```

**Examples:**
- `members:view` - View members
- `members:create` - Create members
- `finance:approve` - Approve financial transactions

### Permission Categories

| Category | Prefix | Description |
|----------|--------|-------------|
| Members | `members:` | Member management operations |
| Households | `households:` | Household management |
| Groups | `groups:` | Group management |
| Care | `care:` | Care plan operations |
| Discipleship | `discipleship:` | Discipleship plan operations |
| Serving | `serving:` | Volunteer serving assignments |
| Giving | `giving:` | Member giving profiles |
| Events | `events:` | Event management |
| Finance | `finance:` | Financial operations |
| Budgets | `budgets:` | Budget management |
| Notifications | `notifications:` | Notification operations |
| Integrations | `integrations:` | Integration configuration |
| RBAC | `rbac:` | Access control operations |
| Settings | `settings:` | Settings management |
| Dashboard | `dashboard:` | Dashboard access |
| Limits | `limits:` | Usage limit controls |
| Reports | `reports:` | Reporting operations |

---

## Implementation Status

### Fully Implemented Pages

| Module | Pages | Status |
|--------|-------|--------|
| Members | 5 pages | Complete |
| Households | 4 pages | Complete |
| Groups | 2 pages | Complete |
| Care Plans | 4 pages | Complete |
| Discipleship Plans | 4 pages | Complete |
| Events | 3 pages | Complete |
| RBAC | 6 pages | Complete |
| Settings | 3 pages | Complete |
| Dashboard | 1 page | Complete |
| Finance | 3 pages | Complete |

### Feature Summary by Tier

| Tier | Core Features (All Tiers) | Tier-Specific Enhancements |
|------|---------------------------|---------------------------|
| **Essential** | `members.core`, `households.core`, `groups.core`, `events.core`, `finance.core`, `notifications.core`, `integrations.email`, `rbac.core`, `settings.core`, `dashboard.core`, `reports.core` | — |
| **Premium** | All Core | `members.invitations`, `members.export`, `care.plans`, `discipleship.plans`, `events.registration`, `notifications.push` |
| **Professional** | All Core + Premium | `finance.management`, `finance.budgets`, `integrations.sms`, `integrations.email_advanced`, `rbac.management`, `members.bulk`, `serving.core`, `giving.profiles` |
| **Enterprise** | All Core + Premium + Professional | `rbac.multi_role`, `rbac.delegation`, `rbac.audit_export`, `limits.unlimited`, `integrations.api`, `reports.advanced`, `notifications.scheduled` |

---

## Appendix A: Full Permission Matrix

### Core Features (Available to ALL Tiers)

| Feature | Permissions |
|---------|-------------|
| `members.core` | `members:view`, `members:search`, `members:create`, `members:edit`, `members:delete` |
| `households.core` | `households:view`, `households:create`, `households:edit`, `households:delete`, `households:manage_members` |
| `groups.core` | `groups:view`, `groups:create`, `groups:edit`, `groups:delete`, `groups:members` |
| `events.core` | `events:view`, `events:create`, `events:edit`, `events:delete`, `events:publish` |
| `finance.core` | `finance:view`, `finance:view_summary` |
| `notifications.core` | `notifications:view`, `notifications:manage`, `notifications:preferences`, `notifications:send` |
| `integrations.email` | `integrations:email_view`, `integrations:email_send` |
| `rbac.core` | `rbac:view`, `rbac:roles_view`, `rbac:users_view` |
| `settings.core` | `settings:view`, `settings:edit` |
| `dashboard.core` | `dashboard:view`, `dashboard:widgets` |
| `reports.core` | `reports:view`, `reports:export_basic` |

### Premium Tier Features

| Feature | Permissions |
|---------|-------------|
| `members.invitations` | `members:invite`, `members:invite_manage` |
| `members.export` | `members:export`, `members:export_advanced` |
| `care.plans` | `care:view`, `care:create`, `care:edit`, `care:delete`, `care:assign`, `care:complete` |
| `discipleship.plans` | `discipleship:view`, `discipleship:create`, `discipleship:edit`, `discipleship:delete`, `discipleship:assign`, `discipleship:progress` |
| `events.registration` | `events:registrations_view`, `events:registrations_manage`, `events:attendance` |
| `notifications.push` | `notifications:push_send`, `notifications:push_manage` |

### Professional Tier Features

| Feature | Permissions |
|---------|-------------|
| `finance.management` | `finance:create`, `finance:edit`, `finance:delete`, `finance:approve` |
| `finance.budgets` | `budgets:view`, `budgets:create`, `budgets:edit`, `budgets:delete`, `budgets:approve` |
| `integrations.sms` | `integrations:sms_configure`, `integrations:sms_test`, `integrations:sms_send` |
| `integrations.email_advanced` | `integrations:email_configure`, `integrations:email_test`, `integrations:email_templates` |
| `rbac.management` | `rbac:roles_create`, `rbac:roles_edit`, `rbac:roles_delete`, `rbac:assign`, `rbac:revoke`, `rbac:audit_view` |
| `members.bulk` | `members:bulk_update`, `members:bulk_import`, `members:invite_bulk` |
| `serving.core` | `serving:view`, `serving:create`, `serving:edit`, `serving:delete` |
| `giving.profiles` | `giving:view`, `giving:edit` |

### Enterprise Tier Features

| Feature | Permissions |
|---------|-------------|
| `rbac.multi_role` | `rbac:multi_role_enable`, `rbac:multi_role_assign`, `rbac:multi_role_analyze` |
| `rbac.delegation` | `rbac:delegate`, `rbac:delegate_revoke`, `rbac:delegate_view` |
| `rbac.audit_export` | `rbac:audit_export` |
| `limits.unlimited` | `limits:unlimited_members`, `limits:unlimited_transactions` |
| `integrations.api` | `integrations:api_access`, `integrations:webhook_configure`, `integrations:webhook_test` |
| `reports.advanced` | `reports:generate`, `reports:export_advanced`, `reports:schedule` |
| `notifications.scheduled` | `notifications:schedule`, `notifications:bulk_send` |

---

## Appendix B: Tier Comparison Matrix

| Feature Area | Essential | Premium | Professional | Enterprise |
|--------------|-----------|---------|--------------|------------|
| **Members** | View, Create, Edit | + Invitations, Export | + Bulk Operations | Unlimited |
| **Households** | Full Access | ✓ | ✓ | ✓ |
| **Groups** | Full Access | ✓ | ✓ | ✓ |
| **Events** | Basic Events | + Registration | ✓ | ✓ |
| **Finance** | View Only | ✓ | + Full Management | Unlimited |
| **Budgets** | — | — | Full Access | ✓ |
| **Care Plans** | — | Full Access | ✓ | ✓ |
| **Discipleship** | — | Full Access | ✓ | ✓ |
| **Serving** | — | — | Full Access | ✓ |
| **Giving Profiles** | — | — | Full Access | ✓ |
| **Notifications** | In-App | + Push | ✓ | + Scheduled |
| **Email** | Basic Send | ✓ | + Templates | ✓ |
| **SMS** | — | — | Full Access | ✓ |
| **RBAC** | View Only | ✓ | + Management | + Multi-Role, Delegation |
| **Reports** | Basic | ✓ | ✓ | + Advanced, Scheduled |
| **API/Webhooks** | — | — | — | Full Access |
| **Member Limit** | 100 | 300 | 500 | Unlimited |

---

*Document generated by Claude Code audit - January 2026 (v1.4)*
