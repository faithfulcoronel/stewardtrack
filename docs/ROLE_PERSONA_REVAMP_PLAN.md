# Role Persona Revamp Implementation Plan

**Version:** 1.1
**Date:** January 2026
**Author:** Claude Code
**Status:** Draft - Pending Review

**Revision History:**
- v1.1: Removed Youth Leader role (11 roles total), updated Auditor with approval permissions, implemented Maker-Checker pattern for finance
- v1.0: Initial draft with 12 role personas

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Current State Analysis](#current-state-analysis)
3. [Proposed Role Personas](#proposed-role-personas)
4. [Permission Matrix](#permission-matrix)
5. [Implementation Approach](#implementation-approach)
6. [Database Migration Strategy](#database-migration-strategy)
7. [UI Component Updates](#ui-component-updates)
8. [Risk Assessment](#risk-assessment)
9. [Rollback Strategy](#rollback-strategy)

---

## Executive Summary

### Objective

Revamp the role template system from a generic 4-role model (`tenant_admin`, `staff`, `volunteer`, `member`) to a comprehensive church-specific persona system that better reflects real-world church organizational structures.

### Key Changes

| Current Roles (4) | Proposed Personas (11) |
|-------------------|------------------------|
| tenant_admin | Tenant Admin |
| staff | Senior Pastor |
| volunteer | Associate Pastor |
| member | Ministry Leader |
| | Treasurer |
| | Auditor |
| | Secretary |
| | Deacon/Elder |
| | Volunteer |
| | Member |
| | Visitor |

### Benefits

1. **Real-world alignment** - Roles match actual church positions
2. **Granular access control** - Finance roles separated from pastoral roles
3. **Financial accountability** - Auditor role with approval authority for transaction oversight
4. **Visitor support** - Public-facing limited access for newcomers

---

## Current State Analysis

### Existing Role Structure

```
permission_role_templates table
├── tenant_admin → ALL permissions (full control)
├── staff → Most view/create/edit permissions
├── volunteer → View + limited operational access
└── member → Self-service only
```

### Problems with Current Approach

| Issue | Impact |
|-------|--------|
| Too generic | A "staff" role doesn't distinguish between Pastor and Treasurer |
| No financial separation | Staff can see finances by default (not appropriate) |
| No financial controls | No maker-checker pattern for transaction approval |
| Missing visitor concept | No role for first-time guests |

### Current Permission Count

Based on the Feature Audit document and codebase analysis:

- **Total Permissions:** 121
- **Core (Essential):** 47 permissions
- **Premium:** 23 permissions
- **Professional:** 35 permissions
- **Enterprise:** 27 permissions

---

## Proposed Role Personas

### Tier 1: Administrative Roles

#### 1. Tenant Admin
**Description:** Full administrative control over all tenant operations
**Scope:** System-wide
**Use Case:** Church administrator, IT administrator, or lead pastor with admin responsibilities

**Access Level:** ALL PERMISSIONS

---

#### 2. Senior Pastor
**Description:** Primary spiritual leader with broad operational visibility
**Scope:** Pastoral, community, dashboard, reports
**Use Case:** Lead/Senior Pastor, Executive Pastor

**Key Access Areas:**
- Full member and household management
- Care plans and discipleship (full access)
- Goals and objectives (all visibility levels)
- Dashboard and reports
- Event management
- Group oversight
- Notification sending
- Limited RBAC viewing (not management)

**Restricted Areas:**
- Finance transactions (view summary only)
- Budget management
- RBAC role management
- System settings
- API/Webhook configuration

---

#### 3. Associate Pastor
**Description:** Pastoral staff with focus on specific ministry areas
**Scope:** Pastoral care, discipleship, assigned groups
**Use Case:** Associate Pastor, Worship Pastor, Children's Pastor

**Key Access Areas:**
- Member viewing and editing
- Care plans (full access)
- Discipleship (full access)
- Events (view, create, edit - not delete)
- Groups (manage assigned groups)
- Goals (staff-level visibility)
- Notifications (view, send)

**Restricted Areas:**
- Member deletion
- Finance (no access)
- RBAC management
- System settings
- Bulk operations

---

### Tier 2: Operational Roles

#### 4. Ministry Leader
**Description:** Leads a specific ministry or department
**Scope:** Assigned ministry/group management
**Use Case:** Small Group Leader, Worship Team Lead, Outreach Coordinator, Youth Pastor

**Key Access Areas:**
- Member viewing (directory level)
- Group management (assigned groups)
- Events (create, edit for their ministry)
- Attendance tracking
- Notifications (to group members)
- Goals (record progress on assigned key results)

**Restricted Areas:**
- Member creation/deletion
- Care plans
- Finance
- Discipleship plans
- RBAC

---

### Tier 3: Finance Roles

#### 5. Treasurer
**Description:** Operational financial management - creates and manages transactions
**Scope:** Day-to-day financial operations
**Use Case:** Church Treasurer, Finance Director, Bookkeeper

**Key Access Areas:**
- Finance transactions (create, edit, view)
- Budget management (create, edit, view)
- Financial reports (view, generate, export)
- Giving profiles (view, edit)
- Member viewing (for contribution records)
- Dashboard (finance widgets)

**Restricted Areas:**
- **Cannot approve transactions** (separation of duties - Auditor approves)
- Member editing (except giving-related)
- Care plans
- Discipleship
- RBAC management
- System settings

---

#### 6. Auditor
**Description:** Financial oversight with approval authority - reviews and approves transactions
**Scope:** Financial control and compliance
**Use Case:** Financial Secretary, Comptroller, Finance Committee Member

**Key Access Areas:**
- **Approve financial transactions** (before posting)
- **Approve budget changes**
- Finance viewing (full access)
- Budget viewing (full access)
- Financial reports (view, export)
- Giving profiles (view only)
- RBAC audit logs (view, export)
- Member viewing (for verification)

**Restricted Areas:**
- **Cannot create transactions** (separation of duties - Treasurer creates)
- Cannot edit transactions
- Cannot delete financial records
- Cannot modify budgets
- Care plans
- Discipleship
- System settings

---

### Tier 4: Administrative Support Roles

#### 7. Secretary
**Description:** Administrative support for church operations
**Scope:** Member records, communications, scheduling
**Use Case:** Church Secretary, Administrative Assistant

**Key Access Areas:**
- Member management (full CRUD)
- Household management
- Event management
- Email/notification sending
- Reports (basic)
- Member export
- Attendance tracking

**Restricted Areas:**
- Finance (except viewing summary)
- Care plans (sensitive)
- Discipleship
- RBAC management
- System settings

---

#### 8. Deacon/Elder
**Description:** Board member with oversight and pastoral support
**Scope:** Pastoral care, member welfare, governance
**Use Case:** Deacon, Elder, Board Member

**Key Access Areas:**
- Member viewing
- Care plans (view, assign if involved)
- Discipleship (view)
- Dashboard
- Reports (view)
- Finance summary viewing
- Meeting/event viewing

**Restricted Areas:**
- Member deletion
- Finance transactions
- RBAC management
- System settings
- Bulk operations

---

### Tier 5: Service Roles

#### 9. Volunteer
**Description:** General volunteer with task-specific access
**Scope:** Assigned tasks and check-in
**Use Case:** Greeter, Usher, Event Helper, Check-in Volunteer

**Key Access Areas:**
- Member directory (view basic info)
- Event viewing
- Attendance check-in
- Group viewing (assigned groups)
- Notifications (personal)

**Restricted Areas:**
- Member editing
- Finance
- Care plans
- Discipleship
- RBAC

---

### Tier 6: Member Roles

#### 10. Member
**Description:** Registered church member with self-service access
**Scope:** Personal profile, group participation
**Use Case:** Active Church Member

**Key Access Areas:**
- Own profile (view and limited edit)
- Group directory (view)
- Event viewing and registration
- Notification preferences
- Personal giving history (view)
- Goals (view staff-level)

**Restricted Areas:**
- Other member records
- Finance
- Care plans
- RBAC

---

#### 11. Visitor
**Description:** First-time or prospective guest
**Scope:** Public information only
**Use Case:** First-time Guest, Prospective Member

**Key Access Areas:**
- Public event listing
- Group directory (public groups)
- Own profile creation
- Notification preferences

**Restricted Areas:**
- Member directory
- Finance
- Care plans
- Discipleship
- All administrative functions

---

## Permission Matrix

### Complete Permission-to-Role Mapping

Below is the comprehensive mapping of all 121 permissions to the 11 role personas.

### Finance Role Separation (Maker-Checker Pattern)

| Role | Create | Edit | View | Approve | Rationale |
|------|:------:|:----:|:----:|:-------:|-----------|
| **Treasurer** | ✓ | ✓ | ✓ | — | Operational: creates transactions |
| **Auditor** | — | — | ✓ | ✓ | Control: reviews and approves |

> **Key Principle:** The person who creates a transaction cannot approve it.

#### Legend
- ✓ = Granted (Recommended)
- ○ = Granted (Optional - tenant can enable)
- — = Not granted

---

### Members Management

| Permission | Tenant Admin | Senior Pastor | Associate Pastor | Ministry Leader | Treasurer | Auditor | Secretary | Deacon/Elder | Volunteer | Member | Visitor |
|------------|:------------:|:-------------:|:----------------:|:---------------:|:---------:|:-------:|:---------:|:------------:|:---------:|:------:|:-------:|
| `members:view` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | — | — |
| `members:search` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ○ | — | — |
| `members:create` | ✓ | ✓ | ○ | — | — | — | ✓ | — | — | — | — |
| `members:edit` | ✓ | ✓ | ✓ | — | ○ | — | ✓ | — | — | — | — |
| `members:delete` | ✓ | — | — | — | — | — | ○ | — | — | — | — |
| `members:view_self` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| `members:edit_self` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| `members:invite` | ✓ | ✓ | ○ | — | — | — | ✓ | — | — | — | — |
| `members:invite_manage` | ✓ | ✓ | — | — | — | — | ✓ | — | — | — | — |
| `members:export` | ✓ | ○ | — | — | ✓ | ✓ | ✓ | — | — | — | — |
| `members:export_advanced` | ✓ | — | — | — | ✓ | ✓ | ○ | — | — | — | — |
| `members:bulk_update` | ✓ | — | — | — | — | — | ✓ | — | — | — | — |
| `members:bulk_import` | ✓ | — | — | — | — | — | ✓ | — | — | — | — |
| `members:invite_bulk` | ✓ | ○ | — | — | — | — | ✓ | — | — | — | — |

---

### Households

| Permission | Tenant Admin | Senior Pastor | Associate Pastor | Ministry Leader | Treasurer | Auditor | Secretary | Deacon/Elder | Volunteer | Member | Visitor |
|------------|:------------:|:-------------:|:----------------:|:---------------:|:---------:|:-------:|:---------:|:------------:|:---------:|:------:|:-------:|
| `households:view` | ✓ | ✓ | ✓ | ○ | ○ | — | ✓ | ✓ | — | — | — |
| `households:create` | ✓ | ✓ | — | — | — | — | ✓ | — | — | — | — |
| `households:edit` | ✓ | ✓ | ○ | — | — | — | ✓ | — | — | — | — |
| `households:delete` | ✓ | — | — | — | — | — | ○ | — | — | — | — |
| `households:manage_members` | ✓ | ✓ | — | — | — | — | ✓ | — | — | — | — |

---

### Groups

| Permission | Tenant Admin | Senior Pastor | Associate Pastor | Ministry Leader | Treasurer | Auditor | Secretary | Deacon/Elder | Volunteer | Member | Visitor |
|------------|:------------:|:-------------:|:----------------:|:---------------:|:---------:|:-------:|:---------:|:------------:|:---------:|:------:|:-------:|
| `groups:view` | ✓ | ✓ | ✓ | ✓ | — | — | ✓ | ✓ | ✓ | ✓ | ○ |
| `groups:create` | ✓ | ✓ | ✓ | ○ | — | — | ✓ | — | — | — | — |
| `groups:edit` | ✓ | ✓ | ✓ | ✓ | — | — | ✓ | — | — | — | — |
| `groups:delete` | ✓ | ✓ | — | — | — | — | ○ | — | — | — | — |
| `groups:members` | ✓ | ✓ | ✓ | ✓ | — | — | ✓ | — | ○ | — | — |

---

### Events

| Permission | Tenant Admin | Senior Pastor | Associate Pastor | Ministry Leader | Treasurer | Auditor | Secretary | Deacon/Elder | Volunteer | Member | Visitor |
|------------|:------------:|:-------------:|:----------------:|:---------------:|:---------:|:-------:|:---------:|:------------:|:---------:|:------:|:-------:|
| `events:view` | ✓ | ✓ | ✓ | ✓ | — | — | ✓ | ✓ | ✓ | ✓ | ✓ |
| `events:create` | ✓ | ✓ | ✓ | ✓ | — | — | ✓ | — | — | — | — |
| `events:edit` | ✓ | ✓ | ✓ | ✓ | — | — | ✓ | — | — | — | — |
| `events:delete` | ✓ | ✓ | — | — | — | — | ○ | — | — | — | — |
| `events:publish` | ✓ | ✓ | ✓ | ○ | — | — | ✓ | — | — | — | — |
| `events:registrations_view` | ✓ | ✓ | ✓ | ✓ | — | — | ✓ | — | ✓ | — | — |
| `events:registrations_manage` | ✓ | ✓ | ✓ | ✓ | — | — | ✓ | — | — | — | — |
| `events:attendance` | ✓ | ✓ | ✓ | ✓ | — | — | ✓ | — | ✓ | — | — |

---

### Goals & Objectives

| Permission | Tenant Admin | Senior Pastor | Associate Pastor | Ministry Leader | Treasurer | Auditor | Secretary | Deacon/Elder | Volunteer | Member | Visitor |
|------------|:------------:|:-------------:|:----------------:|:---------------:|:---------:|:-------:|:---------:|:------------:|:---------:|:------:|:-------:|
| `goals:view` | ✓ | ✓ | ✓ | ✓ | ○ | — | ✓ | ✓ | — | ✓ | — |
| `goals:view_leadership` | ✓ | ✓ | ○ | — | — | — | — | ✓ | — | — | — |
| `goals:view_all` | ✓ | ✓ | — | — | — | — | — | — | — | — | — |
| `goals:create` | ✓ | ✓ | ✓ | ○ | — | — | — | — | — | — | — |
| `goals:edit` | ✓ | ✓ | ✓ | ○ | — | — | — | — | — | — | — |
| `goals:delete` | ✓ | ✓ | — | — | — | — | — | — | — | — | — |
| `objectives:manage` | ✓ | ✓ | ✓ | ○ | — | — | — | — | — | — | — |
| `key_results:manage` | ✓ | ✓ | ✓ | ○ | — | — | — | — | — | — | — |
| `key_results:record_progress` | ✓ | ✓ | ✓ | ✓ | — | — | — | — | — | — | — |

---

### Care Plans

| Permission | Tenant Admin | Senior Pastor | Associate Pastor | Ministry Leader | Treasurer | Auditor | Secretary | Deacon/Elder | Volunteer | Member | Visitor |
|------------|:------------:|:-------------:|:----------------:|:---------------:|:---------:|:-------:|:---------:|:------------:|:---------:|:------:|:-------:|
| `care:view` | ✓ | ✓ | ✓ | — | — | — | — | ✓ | — | — | — |
| `care:create` | ✓ | ✓ | ✓ | — | — | — | — | ○ | — | — | — |
| `care:edit` | ✓ | ✓ | ✓ | — | — | — | — | ○ | — | — | — |
| `care:delete` | ✓ | — | — | — | — | — | — | — | — | — | — |
| `care:assign` | ✓ | ✓ | ✓ | — | — | — | — | — | — | — | — |
| `care:complete` | ✓ | ✓ | ✓ | — | — | — | — | ✓ | — | — | — |

---

### Discipleship

| Permission | Tenant Admin | Senior Pastor | Associate Pastor | Ministry Leader | Treasurer | Auditor | Secretary | Deacon/Elder | Volunteer | Member | Visitor |
|------------|:------------:|:-------------:|:----------------:|:---------------:|:---------:|:-------:|:---------:|:------------:|:---------:|:------:|:-------:|
| `discipleship:view` | ✓ | ✓ | ✓ | — | — | — | — | ○ | — | — | — |
| `discipleship:create` | ✓ | ✓ | ✓ | — | — | — | — | — | — | — | — |
| `discipleship:edit` | ✓ | ✓ | ✓ | — | — | — | — | — | — | — | — |
| `discipleship:delete` | ✓ | — | — | — | — | — | — | — | — | — | — |
| `discipleship:assign` | ✓ | ✓ | ✓ | — | — | — | — | — | — | — | — |
| `discipleship:progress` | ✓ | ✓ | ✓ | — | — | — | — | — | — | — | — |

---

### Finance

> **Maker-Checker Pattern:** Treasurer creates transactions, Auditor approves them.

| Permission | Tenant Admin | Senior Pastor | Associate Pastor | Ministry Leader | Treasurer | Auditor | Secretary | Deacon/Elder | Volunteer | Member | Visitor |
|------------|:------------:|:-------------:|:----------------:|:---------------:|:---------:|:-------:|:---------:|:------------:|:---------:|:------:|:-------:|
| `finance:view` | ✓ | ○ | — | — | ✓ | ✓ | — | ○ | — | — | — |
| `finance:view_summary` | ✓ | ✓ | — | — | ✓ | ✓ | ○ | ✓ | — | — | — |
| `finance:create` | ✓ | — | — | — | ✓ | — | — | — | — | — | — |
| `finance:edit` | ✓ | — | — | — | ✓ | — | — | — | — | — | — |
| `finance:delete` | ✓ | — | — | — | ○ | — | — | — | — | — | — |
| `finance:approve` | ✓ | — | — | — | — | ✓ | — | — | — | — | — |

---

### Budgets

> **Same Pattern:** Treasurer creates budgets, Auditor (and Deacon/Elder for governance) approves them.

| Permission | Tenant Admin | Senior Pastor | Associate Pastor | Ministry Leader | Treasurer | Auditor | Secretary | Deacon/Elder | Volunteer | Member | Visitor |
|------------|:------------:|:-------------:|:----------------:|:---------------:|:---------:|:-------:|:---------:|:------------:|:---------:|:------:|:-------:|
| `budgets:view` | ✓ | ○ | — | — | ✓ | ✓ | — | ○ | — | — | — |
| `budgets:create` | ✓ | — | — | — | ✓ | — | — | — | — | — | — |
| `budgets:edit` | ✓ | — | — | — | ✓ | — | — | — | — | — | — |
| `budgets:delete` | ✓ | — | — | — | ○ | — | — | — | — | — | — |
| `budgets:approve` | ✓ | — | — | — | — | ✓ | — | ✓ | — | — | — |

---

### Giving Profiles

| Permission | Tenant Admin | Senior Pastor | Associate Pastor | Ministry Leader | Treasurer | Auditor | Secretary | Deacon/Elder | Volunteer | Member | Visitor |
|------------|:------------:|:-------------:|:----------------:|:---------------:|:---------:|:-------:|:---------:|:------------:|:---------:|:------:|:-------:|
| `giving:view` | ✓ | — | — | — | ✓ | ✓ | — | — | — | — | — |
| `giving:edit` | ✓ | — | — | — | ✓ | — | — | — | — | — | — |

---

### Serving

| Permission | Tenant Admin | Senior Pastor | Associate Pastor | Ministry Leader | Treasurer | Auditor | Secretary | Deacon/Elder | Volunteer | Member | Visitor |
|------------|:------------:|:-------------:|:----------------:|:---------------:|:---------:|:-------:|:---------:|:------------:|:---------:|:------:|:-------:|
| `serving:view` | ✓ | ✓ | ✓ | ✓ | — | — | ✓ | ○ | ✓ | ○ | — |
| `serving:create` | ✓ | ✓ | ✓ | ✓ | — | — | ✓ | — | — | — | — |
| `serving:edit` | ✓ | ✓ | ✓ | ✓ | — | — | ✓ | — | — | — | — |
| `serving:delete` | ✓ | ✓ | — | — | — | — | ○ | — | — | — | — |

---

### Notifications

| Permission | Tenant Admin | Senior Pastor | Associate Pastor | Ministry Leader | Treasurer | Auditor | Secretary | Deacon/Elder | Volunteer | Member | Visitor |
|------------|:------------:|:-------------:|:----------------:|:---------------:|:---------:|:-------:|:---------:|:------------:|:---------:|:------:|:-------:|
| `notifications:view` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| `notifications:manage` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| `notifications:preferences` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| `notifications:send` | ✓ | ✓ | ✓ | ✓ | — | — | ✓ | — | — | — | — |
| `notifications:push_send` | ✓ | ✓ | ✓ | ○ | — | — | ✓ | — | — | — | — |
| `notifications:push_manage` | ✓ | — | — | — | — | — | — | — | — | — | — |
| `notifications:schedule` | ✓ | ✓ | ○ | — | — | — | ✓ | — | — | — | — |
| `notifications:bulk_send` | ✓ | ✓ | ○ | — | — | — | ✓ | — | — | — | — |

---

### Integrations

| Permission | Tenant Admin | Senior Pastor | Associate Pastor | Ministry Leader | Treasurer | Auditor | Secretary | Deacon/Elder | Volunteer | Member | Visitor |
|------------|:------------:|:-------------:|:----------------:|:---------------:|:---------:|:-------:|:---------:|:------------:|:---------:|:------:|:-------:|
| `integrations:email_view` | ✓ | — | — | — | — | — | ○ | — | — | — | — |
| `integrations:email_send` | ✓ | ✓ | ✓ | ○ | — | — | ✓ | — | — | — | — |
| `integrations:email_configure` | ✓ | — | — | — | — | — | — | — | — | — | — |
| `integrations:email_test` | ✓ | — | — | — | — | — | — | — | — | — | — |
| `integrations:email_templates` | ✓ | — | — | — | — | — | ○ | — | — | — | — |
| `integrations:sms_configure` | ✓ | — | — | — | — | — | — | — | — | — | — |
| `integrations:sms_test` | ✓ | — | — | — | — | — | — | — | — | — | — |
| `integrations:sms_send` | ✓ | ✓ | ○ | — | — | — | ✓ | — | — | — | — |
| `integrations:api_access` | ✓ | — | — | — | — | — | — | — | — | — | — |
| `integrations:webhook_configure` | ✓ | — | — | — | — | — | — | — | — | — | — |
| `integrations:webhook_test` | ✓ | — | — | — | — | — | — | — | — | — | — |

---

### RBAC & Security

| Permission | Tenant Admin | Senior Pastor | Associate Pastor | Ministry Leader | Treasurer | Auditor | Secretary | Deacon/Elder | Volunteer | Member | Visitor |
|------------|:------------:|:-------------:|:----------------:|:---------------:|:---------:|:-------:|:---------:|:------------:|:---------:|:------:|:-------:|
| `rbac:view` | ✓ | ✓ | — | — | — | ○ | — | — | — | — | — |
| `rbac:roles_view` | ✓ | ○ | — | — | — | — | — | — | — | — | — |
| `rbac:users_view` | ✓ | ○ | — | — | — | — | — | — | — | — | — |
| `rbac:roles_create` | ✓ | — | — | — | — | — | — | — | — | — | — |
| `rbac:roles_edit` | ✓ | — | — | — | — | — | — | — | — | — | — |
| `rbac:roles_delete` | ✓ | — | — | — | — | — | — | — | — | — | — |
| `rbac:assign` | ✓ | — | — | — | — | — | — | — | — | — | — |
| `rbac:revoke` | ✓ | — | — | — | — | — | — | — | — | — | — |
| `rbac:audit_view` | ✓ | — | — | — | — | ✓ | — | — | — | — | — |
| `rbac:audit_export` | ✓ | — | — | — | — | ✓ | — | — | — | — | — |
| `rbac:delegate` | ✓ | — | — | — | — | — | — | — | — | — | — |
| `rbac:delegate_revoke` | ✓ | — | — | — | — | — | — | — | — | — | — |
| `rbac:delegate_view` | ✓ | — | — | — | — | — | — | — | — | — | — |
| `rbac:multi_role_enable` | ✓ | — | — | — | — | — | — | — | — | — | — |
| `rbac:multi_role_assign` | ✓ | — | — | — | — | — | — | — | — | — | — |
| `rbac:multi_role_analyze` | ✓ | — | — | — | — | — | — | — | — | — | — |

---

### Settings & Dashboard

| Permission | Tenant Admin | Senior Pastor | Associate Pastor | Ministry Leader | Treasurer | Auditor | Secretary | Deacon/Elder | Volunteer | Member | Visitor |
|------------|:------------:|:-------------:|:----------------:|:---------------:|:---------:|:-------:|:---------:|:------------:|:---------:|:------:|:-------:|
| `settings:view` | ✓ | ○ | — | — | — | — | — | — | — | — | — |
| `settings:edit` | ✓ | — | — | — | — | — | — | — | — | — | — |
| `dashboard:view` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | — | — | — |
| `dashboard:widgets` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | — | — | — |

---

### Reports

| Permission | Tenant Admin | Senior Pastor | Associate Pastor | Ministry Leader | Treasurer | Auditor | Secretary | Deacon/Elder | Volunteer | Member | Visitor |
|------------|:------------:|:-------------:|:----------------:|:---------------:|:---------:|:-------:|:---------:|:------------:|:---------:|:------:|:-------:|
| `reports:view` | ✓ | ✓ | ✓ | ○ | ✓ | ✓ | ✓ | ✓ | — | — | — |
| `reports:export_basic` | ✓ | ✓ | ○ | — | ✓ | ✓ | ✓ | — | — | — | — |
| `reports:generate` | ✓ | ○ | — | — | ✓ | ✓ | ○ | — | — | — | — |
| `reports:export_advanced` | ✓ | — | — | — | ✓ | ✓ | — | — | — | — | — |
| `reports:schedule` | ✓ | — | — | — | ✓ | — | — | — | — | — | — |

---

### Limits (Enterprise)

| Permission | Tenant Admin | Senior Pastor | Associate Pastor | Ministry Leader | Treasurer | Auditor | Secretary | Deacon/Elder | Volunteer | Member | Visitor |
|------------|:------------:|:-------------:|:----------------:|:---------------:|:---------:|:-------:|:---------:|:------------:|:---------:|:------:|:-------:|
| `limits:unlimited_members` | ✓ | — | — | — | — | — | — | — | — | — | — |
| `limits:unlimited_transactions` | ✓ | — | — | — | — | — | — | — | — | — | — |

---

## Implementation Approach

### Phase 1: Database Schema Updates

1. **Update `STANDARD_ROLES` constant** in UI component
2. **Create new migration** for role persona definitions
3. **Update seed data** with new permission-role mappings

### Phase 2: Seed Data Migration

1. **Backup existing templates**
2. **Delete old templates** (clean slate approach)
3. **Insert new persona-based templates**

### Phase 3: UI Updates

1. **Update `RoleTemplateStep.tsx`** with new personas
2. **Add role descriptions and icons**
3. **Update wizard validation**

### Phase 4: Testing & Validation

1. **Verify all permissions mapped correctly**
2. **Test role template application on new features**
3. **Validate tenant override functionality**

---

## Database Migration Strategy

### Migration File Structure

```
supabase/migrations/
├── 20260113000001_revamp_role_personas.sql
│   ├── Step 1: Define role persona metadata
│   ├── Step 2: Delete existing templates
│   ├── Step 3: Insert new persona templates
│   └── Step 4: Verify counts
```

### Key Considerations

1. **Idempotent design** - Use `ON CONFLICT DO UPDATE`
2. **Transaction safety** - Wrap in `BEGIN/COMMIT`
3. **Audit trail** - Log changes with reasons
4. **Rollback support** - Keep backup of old mappings

---

## UI Component Updates

### Files to Modify

| File | Changes |
|------|---------|
| `RoleTemplateStep.tsx` | Update `STANDARD_ROLES` constant with 11 personas |
| `FeaturePermissionWizard.tsx` | Update type definitions |
| `component-registry.ts` | No changes needed |

### New STANDARD_ROLES Definition

```typescript
const STANDARD_ROLES = [
  // Administrative Roles
  { key: 'tenant_admin', label: 'Tenant Admin', description: 'Full administrative control', icon: 'Shield', tier: 'admin' },
  { key: 'senior_pastor', label: 'Senior Pastor', description: 'Primary spiritual leader', icon: 'Crown', tier: 'pastoral' },
  { key: 'associate_pastor', label: 'Associate Pastor', description: 'Pastoral staff member', icon: 'Heart', tier: 'pastoral' },

  // Operational Roles
  { key: 'ministry_leader', label: 'Ministry Leader', description: 'Department or group leader', icon: 'Users', tier: 'operational' },

  // Finance Roles (Maker-Checker Pattern)
  { key: 'treasurer', label: 'Treasurer', description: 'Creates financial transactions', icon: 'DollarSign', tier: 'finance' },
  { key: 'auditor', label: 'Auditor', description: 'Approves transactions & budgets', icon: 'ClipboardCheck', tier: 'finance' },

  // Support & Governance Roles
  { key: 'secretary', label: 'Secretary', description: 'Administrative support', icon: 'FileText', tier: 'support' },
  { key: 'deacon_elder', label: 'Deacon/Elder', description: 'Board oversight & budget approval', icon: 'Award', tier: 'governance' },

  // Service & Member Roles
  { key: 'volunteer', label: 'Volunteer', description: 'Task-specific access', icon: 'HandHelping', tier: 'service' },
  { key: 'member', label: 'Member', description: 'Self-service access', icon: 'User', tier: 'member' },
  { key: 'visitor', label: 'Visitor', description: 'Public information only', icon: 'UserPlus', tier: 'guest' },
];
```

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Existing tenant RBAC breaks | Low | High | Templates are suggestions, not enforced |
| Missing permission mappings | Medium | Medium | Comprehensive audit completed |
| UI performance with 12 roles | Low | Low | Lazy load role sections |
| Role confusion for admins | Medium | Medium | Clear descriptions and tooltips |

---

## Rollback Strategy

If issues arise:

1. **Database rollback**: Restore from backup or re-run old seed migration
2. **UI rollback**: Revert `STANDARD_ROLES` to original 4-role model
3. **Feature flag**: Add toggle to switch between old/new models

---

## Approval Checklist

- [ ] Review proposed role personas
- [ ] Verify permission matrix accuracy
- [ ] Approve database migration approach
- [ ] Confirm UI update strategy
- [ ] Sign off on rollback plan

---

## Next Steps (After Approval)

1. Create database migration file
2. Update UI components
3. Run metadata:compile
4. Test with sample tenant
5. Document changes in CHANGELOG

---

*Document generated by Claude Code - January 2026*
