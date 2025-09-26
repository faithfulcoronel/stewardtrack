# StewardTrack RBAC Module - Comprehensive User Manual

## Table of Contents

1. [Introduction](#introduction)
2. [Getting Started](#getting-started)
3. [Phase A: Role Registry](#phase-a-role-registry)
4. [Phase B: Permission Bundle Composer](#phase-b-permission-bundle-composer)
5. [Phase C: Surface Binding Manager](#phase-c-surface-binding-manager)
6. [Phase D: Delegated Consoles & Multi-Role Runtime](#phase-d-delegated-consoles--multi-role-runtime)
7. [User Roles and Permissions](#user-roles-and-permissions)
8. [Best Practices](#best-practices)
9. [Troubleshooting](#troubleshooting)
10. [FAQ](#faq)

---

## Introduction

### What is RBAC?

Role-Based Access Control (RBAC) is a security system that manages user access to church management features based on their organizational roles. The StewardTrack RBAC module provides granular control over who can access what features, ensuring data security while enabling effective ministry operations.

### Key Benefits

- **Security**: Protect sensitive church data with proper access controls
- **Flexibility**: Easily adapt permissions as your church structure evolves
- **Scalability**: Manage access for churches of any size, from single campus to multi-site organizations
- **Delegation**: Enable campus pastors and ministry leaders to manage their own teams
- **Audit Trail**: Track all permission changes for accountability and compliance

### System Architecture

The RBAC system is built in four progressive phases:

- **Phase A**: Core role and permission management
- **Phase B**: Reusable permission bundles
- **Phase C**: UI surface binding with licensing integration
- **Phase D**: Delegated consoles and multi-role runtime support

---

## Getting Started

### Accessing the RBAC Module

1. Navigate to **Admin** → **Security** → **RBAC Management**
2. You'll see the main dashboard showing system status and quick actions
3. Use the phase tabs to access different functionality areas

### Initial Setup

Before using the RBAC system, ensure:

1. Your user account has system administrator privileges
2. Your church's organizational structure is defined (campuses, ministries, departments)
3. Basic roles like "Pastor," "Staff," and "Volunteer" are created

### Navigation Overview

- **Dashboard**: System overview and quick actions
- **Roles**: Manage individual roles and their permissions
- **Bundles**: Create reusable permission sets
- **Surface Bindings**: Link roles to UI features
- **Delegated Console**: Campus/ministry-scoped management
- **Multi-Role Assignment**: Assign multiple roles to users

---

## Phase A: Role Registry

### Overview

The Role Registry is the foundation of the RBAC system, where you define organizational roles and their specific permissions.

### Managing Roles

#### Creating a New Role

1. Go to **RBAC Dashboard** → **Quick Actions** → **Create Role**
2. Fill in the role details:
   - **Name**: Descriptive role name (e.g., "Campus Pastor")
   - **Description**: Clear explanation of the role's purpose
   - **Scope**: Choose from System, Campus, Ministry, or Department
   - **Delegatable**: Check if this role can be delegated to others
3. Click **Save Role**

#### Role Scopes Explained

- **System**: Church-wide access (e.g., Senior Pastor, IT Administrator)
- **Campus**: Campus-specific access (e.g., Campus Pastor, Campus Administrator)
- **Ministry**: Ministry-specific access (e.g., Youth Pastor, Worship Leader)
- **Department**: Department-specific access (e.g., Finance Manager, HR Coordinator)

#### Editing Roles

1. Navigate to **Roles** section
2. Click the **Edit** button next to the role
3. Modify the necessary fields
4. Click **Update Role**

> **Warning**: Changing role permissions affects all users assigned to that role immediately.

### Permission Management

#### Understanding Permissions

Permissions are specific actions users can perform, organized by modules:

- **Users Module**: `users.read`, `users.write`, `users.delete`
- **Finance Module**: `finance.read`, `finance.reports`, `finance.reconcile`
- **Events Module**: `events.create`, `events.manage`, `events.publish`
- **Audit Module**: `audit.read`, `audit.export`

#### Assigning Permissions to Roles

1. Select a role from the roles list
2. In the **Permissions** section, check the boxes for required permissions
3. Use the module filter to organize permissions by feature area
4. Click **Save Permissions**

#### Permission Inheritance

- Higher scope roles can inherit permissions from lower scopes
- System roles can access all campus, ministry, and department functions
- Campus roles can access ministry and department functions within their campus

### User Role Assignment

#### Assigning Roles to Users

1. Go to **Users** → **Role Assignment**
2. Select the user from the dropdown
3. Choose the appropriate role based on their position
4. Set the scope (which campus/ministry/department)
5. Click **Assign Role**

#### Bulk Role Assignment

For large churches with many staff members:

1. Use the **Bulk Assignment** feature
2. Upload a CSV file with user emails and role assignments
3. Review the preview before confirming
4. Process the bulk assignment

---

## Phase B: Permission Bundle Composer

### Overview

Permission Bundles are reusable collections of permissions that can be easily applied to multiple roles, ensuring consistency and reducing administrative overhead.

### Creating Permission Bundles

#### Standard Bundles

1. Navigate to **RBAC Dashboard** → **Compose Bundle**
2. Choose a bundle template or create custom:
   - **Pastoral Care Bundle**: Includes member data access, care notes, visitation tracking
   - **Event Management Bundle**: Event creation, venue booking, volunteer coordination
   - **Financial Bundle**: Donation tracking, expense reporting, budget access
   - **Communication Bundle**: Email access, announcement posting, directory access

#### Custom Bundle Creation

1. Click **Create Custom Bundle**
2. Enter bundle details:
   - **Name**: Descriptive name (e.g., "Youth Ministry Essentials")
   - **Description**: Purpose and included permissions
   - **Module Filter**: Select relevant modules
3. Select individual permissions to include
4. Save the bundle

### Bundle Management

#### Applying Bundles to Roles

1. Go to **Roles** → Select a role
2. In the **Permission Bundles** section
3. Check the bundles you want to apply
4. Bundles automatically add their permissions to the role

#### Bundle Versioning

- Bundles maintain version history when updated
- Roles using older bundle versions are flagged for review
- Administrators can choose to auto-update or manually review changes

#### Bundle Dependencies

Some bundles require other bundles:
- **Ministry Leader Bundle** requires **Basic Staff Bundle**
- **Campus Pastor Bundle** requires **Pastoral Care Bundle**

### Advanced Bundle Features

#### Conditional Permissions

Set permissions that only activate under certain conditions:
- **Time-based**: Permissions active only during service hours
- **Location-based**: Permissions tied to specific campus locations
- **Event-based**: Permissions activated during special events

#### Bundle Analytics

View bundle usage statistics:
- How many roles use each bundle
- Most/least used permissions within bundles
- Bundle effectiveness metrics

---

## Phase C: Surface Binding Manager

### Overview

Surface Bindings connect roles to specific UI elements, ensuring users only see features they're authorized to use. This phase integrates with the church's licensing system to respect feature limitations.

### Understanding UI Surfaces

#### Surface Types

- **Navigation Menus**: Main menu items and sub-navigation
- **Dashboard Widgets**: Information cards and quick actions
- **Form Fields**: Input fields and data entry forms
- **Reports**: Financial reports, member reports, ministry analytics
- **Settings Pages**: Configuration and administrative interfaces

#### Surface Metadata

Each UI surface includes:
- **Surface ID**: Unique identifier (e.g., `finance_dashboard`)
- **Feature Group**: Related feature category
- **License Requirement**: Minimum license level needed
- **Scope Requirements**: Campus/ministry restrictions

### Creating Surface Bindings

#### Basic Binding Creation

1. Navigate to **Surface Bindings** → **Create Binding**
2. Select the role to bind
3. Choose UI surfaces to make visible
4. Set any scope restrictions
5. Save the binding

#### Advanced Binding Options

- **Conditional Visibility**: Show surfaces only when certain conditions are met
- **Read-Only Mode**: Allow viewing but not editing
- **Partial Access**: Show limited fields or data
- **Time Restrictions**: Access limited to specific hours or days

### License Integration

#### Feature Licensing

The system respects your church's license level:
- **Basic License**: Core features only
- **Standard License**: Extended ministry features
- **Premium License**: Advanced analytics and multi-site features
- **Enterprise License**: Full feature access with customization

#### License Compliance

- Users cannot access features beyond the current license
- License upgrades automatically unlock new features
- License downgrades gracefully hide premium features

### Managing Bindings

#### Binding Hierarchy

Surface bindings follow role hierarchy:
1. System roles inherit all bindings
2. Campus roles inherit ministry and department bindings within scope
3. Ministry roles inherit department bindings within scope

#### Binding Conflicts

When conflicts arise:
- Higher scope takes precedence
- Explicit denials override implicit permissions
- System administrators can override all restrictions

---

## Phase D: Delegated Consoles & Multi-Role Runtime

### Overview

Phase D enables campus pastors and ministry leaders to manage their own teams within defined boundaries, while supporting users who need multiple roles for cross-ministry responsibilities.

### Delegated Console

#### Campus Pastor Console

**Purpose**: Allow campus pastors to manage volunteers and staff within their campus without seeing other campus data.

**Access**: Navigate to **RBAC Dashboard** → **Delegated Console**

**Features**:
- View and manage users within your campus scope
- Assign campus-appropriate roles to volunteers
- Monitor role assignments and changes
- Generate campus-specific access reports

#### Ministry Leader Console

**Purpose**: Enable ministry leaders to manage role assignments within their ministry area.

**Capabilities**:
- Assign ministry-specific roles (e.g., Youth Volunteer, Worship Team)
- Manage ministry-scoped permissions
- Track volunteer onboarding and role changes
- Coordinate with other ministry leaders

#### Using the Delegated Console

1. **View Delegation Scope**:
   - See your assigned delegation boundaries
   - Understand which users and roles you can manage
   - Review delegation statistics

2. **Manage Delegated Users**:
   - Search and filter users within your scope
   - View current role assignments
   - Add or remove roles as authorized

3. **Role Assignment**:
   - Select user from your delegated scope
   - Choose from available delegatable roles
   - Set role expiration if temporary
   - Add assignment notes

4. **Monitor Changes**:
   - Review recent role changes
   - Track who made what changes
   - Export delegation activity reports

### Multi-Role Assignment

#### Understanding Multi-Role Users

Some volunteers serve across multiple ministries and need different permissions for each:
- **Example**: A volunteer who serves as both Youth Leader and Worship Team member
- **Benefit**: Single user account with appropriate permissions for each role
- **Management**: Centralized view of all role assignments

#### Multi-Role Interface

**Access**: Navigate to **Multi-Role Assignment** from the RBAC dashboard

**Features**:
1. **User Overview**:
   - See all users with multiple roles
   - Filter by campus, ministry, or role type
   - View role assignment history

2. **Conflict Analysis**:
   - Automatic detection of role conflicts
   - Severity assessment (High/Medium/Low)
   - Resolution recommendations

3. **Bulk Assignment**:
   - Assign multiple roles simultaneously
   - Override conflict warnings when appropriate
   - Batch process for efficiency

#### Managing Role Conflicts

**Conflict Types**:
- **Scope Mismatch**: System role with campus-specific role
- **Permission Overlap**: Redundant permissions between roles
- **Access Escalation**: Combining roles creates excessive privileges

**Resolution Process**:
1. Review conflict analysis report
2. Understand the specific conflicts identified
3. Choose resolution approach:
   - Remove conflicting role
   - Modify role permissions
   - Override with justification

#### Multi-Role Runtime Context

The system automatically manages permission resolution for multi-role users:
- **Permission Union**: User gets the combined permissions of all roles
- **Scope Resolution**: Broadest applicable scope is used
- **Context Switching**: Users can switch between role contexts
- **Audit Tracking**: All actions logged with active role context

### Delegation Permission Management

#### Setting Up Delegation

**For System Administrators**:
1. Navigate to **Delegation Permissions**
2. Create delegation permission for campus pastor:
   - **Delegatee**: Select the campus pastor
   - **Scope**: Choose their campus
   - **Permissions**: Select what they can manage (users, roles, etc.)
   - **Restrictions**: Add any limitations
   - **Expiry**: Set expiration date if temporary

**Permission Templates**:
Use pre-built templates for common delegation scenarios:
- **Campus Manager**: Full user and role management within campus
- **Ministry Leader**: Ministry-scoped user and role management
- **Department Admin**: Department-specific administrative access

#### Monitoring Delegations

**Active Delegations**:
- View all current delegation permissions
- See last usage and activity levels
- Monitor for unused or expired delegations

**Audit Trail**:
- Track all delegation-related changes
- Monitor delegated actions
- Generate compliance reports

---

## User Roles and Permissions

### Standard Role Definitions

#### System Level Roles

**Senior Pastor**
- Full system access
- All campus and ministry oversight
- Financial approval authority
- Strategic planning access

**IT Administrator**
- System configuration
- User account management
- Security settings
- Integration management

**Executive Pastor**
- Multi-campus oversight
- Staff management
- Operational reporting
- Budget management

#### Campus Level Roles

**Campus Pastor**
- Campus-wide user management
- Campus financial oversight
- Local ministry coordination
- Campus reporting

**Campus Administrator**
- Administrative functions within campus
- User support and training
- Local system configuration
- Campus event coordination

#### Ministry Level Roles

**Youth Pastor**
- Youth ministry user management
- Youth event planning
- Parent communication
- Youth-specific reporting

**Worship Leader**
- Worship team management
- Service planning
- Music library access
- Technical coordination

**Children's Director**
- Children's ministry oversight
- Safety and security protocols
- Volunteer coordination
- Parent communication

#### Department Level Roles

**Finance Manager**
- Financial data access
- Expense management
- Budget tracking
- Financial reporting

**Communications Coordinator**
- Website content management
- Social media access
- Newsletter creation
- Communication analytics

### Permission Matrix

| Module | System Admin | Campus Pastor | Ministry Leader | Department Staff | Volunteer |
|--------|-------------|---------------|----------------|-----------------|-----------|
| Users | Full | Campus Only | Ministry Only | Department Only | View Own |
| Finance | Full | Campus Budget | Ministry Budget | Department Budget | None |
| Events | Full | Campus Events | Ministry Events | Department Events | Assigned Only |
| Reports | All Reports | Campus Reports | Ministry Reports | Department Reports | Limited |
| Settings | Full | Campus Settings | Ministry Settings | None | None |

---

## Best Practices

### Role Design Principles

#### 1. Principle of Least Privilege
- Give users only the minimum permissions needed for their role
- Regularly review and adjust permissions
- Remove unused permissions promptly

#### 2. Role Granularity
- Create specific roles rather than overly broad ones
- Use permission bundles for common permission sets
- Avoid creating roles for individual users

#### 3. Scope Appropriateness
- Match role scope to organizational responsibility
- Use campus scope for campus-specific roles
- Limit system scope to truly church-wide positions

### Security Best Practices

#### 1. Regular Access Reviews
- Conduct quarterly reviews of role assignments
- Remove roles for users who change positions
- Audit unused roles and permissions

#### 2. Delegation Oversight
- Monitor delegated role assignments
- Set reasonable expiration dates for delegations
- Require justification for high-privilege delegations

#### 3. Change Management
- Document all significant permission changes
- Test changes in a non-production environment first
- Communicate changes to affected users

### Organizational Guidelines

#### 1. Documentation
- Maintain current role descriptions
- Document business justification for roles
- Keep permission change log

#### 2. Training
- Train role managers on delegation features
- Provide user guides for common tasks
- Establish escalation procedures for access issues

#### 3. Compliance
- Ensure roles meet denominational requirements
- Respect data protection regulations
- Maintain audit trails for accountability

---

## Troubleshooting

### Common Issues

#### Users Cannot Access Expected Features

**Symptoms**: User reports they cannot see or use certain features

**Troubleshooting Steps**:
1. Check user's assigned roles
2. Verify role permissions include required features
3. Check surface bindings for role
4. Confirm license covers required features
5. Review any scope restrictions

**Resolution**:
- Add missing permissions to user's role
- Create new surface binding if needed
- Upgrade license if feature requires higher tier

#### Role Assignment Conflicts

**Symptoms**: Error messages when assigning multiple roles to user

**Troubleshooting Steps**:
1. Use Multi-Role Assignment interface
2. Review conflict analysis report
3. Identify specific conflict types
4. Determine appropriate resolution

**Resolution**:
- Remove conflicting role
- Modify role permissions to eliminate conflict
- Override conflict with documented justification

#### Delegation Not Working

**Symptoms**: Campus pastor cannot manage users in their scope

**Troubleshooting Steps**:
1. Verify delegation permission exists
2. Check delegation scope settings
3. Confirm delegation hasn't expired
4. Review delegation permission details

**Resolution**:
- Create or update delegation permission
- Adjust scope to match requirements
- Extend expiration date if needed

#### Performance Issues

**Symptoms**: RBAC interface loads slowly or times out

**Troubleshooting Steps**:
1. Check system resource usage
2. Review recent permission changes
3. Look for complex role hierarchies
4. Check for large user sets in roles

**Resolution**:
- Optimize role structure
- Consider breaking down large roles
- Contact system administrator for performance tuning

### Error Messages

#### "Insufficient Permissions"
- **Cause**: User lacks required permission for action
- **Solution**: Add permission to user's role or assign appropriate role

#### "Scope Restriction Violation"
- **Cause**: User trying to access data outside their scope
- **Solution**: Verify user's scope assignments or adjust data request

#### "License Limitation"
- **Cause**: Feature requires higher license tier
- **Solution**: Upgrade license or use alternative feature

#### "Delegation Boundary Exceeded"
- **Cause**: Delegated user trying to manage outside their scope
- **Solution**: Adjust delegation scope or clarify boundaries

### Getting Help

#### Internal Support
1. Check this user manual first
2. Consult your IT administrator
3. Review audit logs for clues
4. Test in a safe environment

#### External Support
1. Contact StewardTrack support with:
   - Detailed error description
   - Steps to reproduce issue
   - User roles and permissions involved
   - Screenshots if applicable

---

## FAQ

### General Questions

**Q: How often should we review role assignments?**
A: Quarterly reviews are recommended for most churches. Large churches or those with high staff turnover may need monthly reviews.

**Q: Can users have multiple roles?**
A: Yes, the Multi-Role Assignment feature supports users with multiple roles. The system automatically manages permission conflicts.

**Q: What happens when someone leaves their position?**
A: Remove or reassign their roles immediately. Use the role history feature to track what access they had.

### Technical Questions

**Q: How do permission bundles work with custom roles?**
A: Bundles add their permissions to any role they're applied to. Custom roles can use standard bundles plus additional permissions.

**Q: Can we customize the permission list?**
A: The core permissions are fixed, but you can create custom permission bundles that group permissions for your church's specific needs.

**Q: How does delegation work with multi-campus churches?**
A: Each campus pastor gets delegation permissions scoped to their campus. They cannot see or manage users from other campuses.

### Administrative Questions

**Q: Who can create new roles?**
A: Users with system administrator permissions can create roles. Campus pastors with delegation permissions can assign existing roles within their scope.

**Q: How do we handle temporary staff or volunteers?**
A: Create time-limited role assignments or use delegation features with expiration dates.

**Q: What's the difference between delegatable and non-delegatable roles?**
A: Delegatable roles can be assigned by campus pastors and ministry leaders within their scope. Non-delegatable roles require system administrator access.

### Licensing Questions

**Q: What features are included in each license tier?**
A: Check the Surface Binding Manager for current license coverage. Features are clearly marked with their license requirements.

**Q: Can we temporarily exceed our license for special events?**
A: Contact StewardTrack support about temporary license upgrades for events or busy seasons.

**Q: How do license changes affect existing users?**
A: License upgrades unlock new features immediately. License downgrades gracefully hide premium features but don't affect basic functionality.

---

## Conclusion

The StewardTrack RBAC module provides comprehensive access control for churches of all sizes. By following the guidelines in this manual, you can ensure secure, efficient management of user permissions while enabling effective ministry operations.

Remember to:
- Start with clear role definitions
- Use delegation to empower local leadership
- Regularly review and audit permissions
- Train users on their roles and responsibilities
- Contact support when needed

For the latest updates and additional resources, visit the StewardTrack documentation portal or contact our support team.

---

*This manual covers RBAC Module version 2.0. For updates and additional resources, visit docs.stewardtrack.com*