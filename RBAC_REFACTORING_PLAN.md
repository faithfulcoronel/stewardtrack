# RBAC System Refactoring Plan

## Executive Summary

This document outlines a comprehensive refactoring plan for the Role-Based Access Control (RBAC) system in the StewardTrack church management platform. The current implementation consists of two monolithic files (rbac.repository.ts at 3,036 lines and rbac.service.ts at 1,597 lines) that need to be decomposed into a modular, maintainable architecture following the established three-layer pattern used throughout the application.

---

## Table of Contents

1. [Current State Analysis](#current-state-analysis)
2. [Architecture Reference: Member Module Pattern](#architecture-reference-member-module-pattern)
3. [Identified Issues & Code Smells](#identified-issues--code-smells)
4. [Proposed Refactoring Strategy](#proposed-refactoring-strategy)
5. [Detailed Component Breakdown](#detailed-component-breakdown)
6. [Migration Strategy](#migration-strategy)
7. [Benefits & Expected Outcomes](#benefits--expected-outcomes)
8. [Implementation Checklist](#implementation-checklist)

---

## Current State Analysis

### rbac.repository.ts (3,036 lines)

**Current Responsibilities (God Object Anti-Pattern):**
- Direct Supabase database operations for ALL RBAC entities
- Role CRUD operations
- Permission Bundle management
- User-Role assignments
- Permission queries
- Surface Binding management
- Metadata Surface operations
- Feature Catalog management
- Tenant Feature Grants
- Audit logging
- Delegated context resolution
- Multi-role context handling
- Statistics and dashboard queries
- Materialized view operations
- Publishing job management
- Compliance reporting
- Delegation permission management
- Multi-role conflict analysis

**Architecture Violations:**
1. **Single Responsibility Principle**: Handles 15+ distinct domain concerns
2. **Direct Database Access**: No adapter layer for data access abstraction
3. **Mixed Concerns**: Business logic intertwined with data access
4. **No Domain Separation**: All RBAC sub-domains in one file
5. **Testing Challenges**: Impossible to unit test individual components

### rbac.service.ts (1,597 lines)

**Current Responsibilities:**
- Tenant context resolution
- Role management orchestration
- Permission Bundle orchestration
- User-Role assignment orchestration
- Audit event logging
- Feature access validation
- Delegation validation
- Multi-role conflict detection
- Metadata compilation
- Publishing workflows
- Compliance report generation
- Statistics aggregation

**Architecture Violations:**
1. **Orchestration Overload**: Too many orchestration paths
2. **Inconsistent Patterns**: Some methods call repository directly, others add business logic
3. **Duplicate Logic**: Tenant resolution repeated in every method
4. **Poor Modularity**: Cannot reuse sub-components independently

---

## Architecture Reference: Member Module Pattern

The member module demonstrates the correct three-layer architecture that should be applied to RBAC:

### Layer 1: Adapters (Data Access Layer)
**File:** `src/adapters/member.adapter.ts`

**Responsibilities:**
- Direct Supabase client interaction
- Query building and execution
- Data transformation (database ↔ model)
- Low-level data validation
- Relationship handling
- Lifecycle hooks (onBeforeCreate, onAfterCreate, etc.)

**Key Characteristics:**
```typescript
@injectable()
export class MemberAdapter extends BaseAdapter<Member> {
  protected tableName = 'members';
  protected defaultSelect = '...';
  protected defaultRelationships = [...];

  // Specific data access methods
  async getCurrentMonthBirthdays(): Promise<Member[]>
  async getBirthdaysByMonth(month: number): Promise<Member[]>

  // Lifecycle hooks for data layer concerns
  protected async onBeforeCreate(data: Partial<Member>)
  protected async onAfterCreate(data: Member)
}
```

### Layer 2: Repositories (Business Logic Layer)
**File:** `src/repositories/member.repository.ts`

**Responsibilities:**
- Business rule enforcement
- Cross-entity validation
- Domain-specific queries
- Data formatting/enrichment
- Adapter orchestration (when multiple adapters needed)

**Key Characteristics:**
```typescript
@injectable()
export class MemberRepository extends BaseRepository<Member> {
  constructor(@inject(TYPES.IMemberAdapter) private readonly memberAdapter: IMemberAdapter) {
    super(memberAdapter);
  }

  // Domain-specific operations
  async getCurrentMonthBirthdays(): Promise<Member[]>

  // Business validation hooks
  protected async beforeCreate(data: Partial<Member>)
  protected async afterCreate(data: Member)
}
```

### Layer 3: Services (Application Logic Layer)
**File:** `src/services/MemberService.ts`

**Responsibilities:**
- Application workflow orchestration
- Multi-repository coordination
- Complex business operations
- Transaction boundaries
- External service integration

**Key Characteristics:**
```typescript
@injectable()
export class MemberService implements CrudService<Member> {
  constructor(
    @inject(TYPES.IMemberRepository) private repo: IMemberRepository,
    @inject(TYPES.IAccountRepository) private accountRepo: IAccountRepository,
    // Other dependencies...
  ) {}

  // Complex orchestration
  async getFinancialTotals(memberId: string)
  async getFinancialTrends(memberId: string, range: string)
}
```

---

## Identified Issues & Code Smells

### 1. **God Object Pattern**
- `RbacRepository` has 3,036 lines handling 15+ distinct concerns
- Violates Single Responsibility Principle at scale
- Impossible to maintain, test, or extend independently

### 2. **Missing Abstraction Layer**
- No adapter layer between repository and database
- Direct Supabase client usage in repository
- Cannot mock or swap data sources for testing

### 3. **Poor Domain Separation**
- Roles, Bundles, Permissions, Features, Surfaces, Audit logs all mixed
- No clear boundaries between sub-domains
- Difficult to understand data flow

### 4. **Inconsistent Error Handling**
- Some methods throw errors, others return null
- No centralized error handling strategy
- Mixed error message formats

### 5. **Duplicate Code**
- Tenant resolution logic repeated 50+ times
- User context retrieval duplicated
- Similar query patterns not abstracted

### 6. **Testing Nightmares**
- Cannot unit test individual components
- Must mock entire Supabase client for any test
- Integration tests required for simple operations

### 7. **Poor Scalability**
- Adding new RBAC features requires modifying monolithic files
- High risk of regression bugs
- Merge conflicts guaranteed in team environment

### 8. **Unclear Dependencies**
- Hard to understand what depends on what
- Circular dependency risks
- Cannot optimize imports

---

## Proposed Refactoring Strategy

### Phase 1: Domain Analysis & Decomposition

Identify distinct RBAC sub-domains:

1. **Core RBAC Domain**
   - Roles
   - Permissions
   - Permission Bundles
   - User-Role Assignments

2. **Metadata Domain**
   - Metadata Surfaces
   - Surface Overlays
   - Surface Bindings

3. **Feature Management Domain**
   - Feature Catalog
   - Tenant Feature Grants
   - Feature Access Validation

4. **Delegation Domain**
   - Delegated Contexts
   - Delegation Permissions
   - Delegation Scopes

5. **Audit Domain**
   - Audit Logs
   - Compliance Reports
   - Audit Timeline

6. **Publishing Domain**
   - Publishing Jobs
   - Metadata Compilation
   - View Refresh Operations

7. **Statistics Domain**
   - Dashboard Statistics
   - Role Statistics
   - Bundle Statistics
   - Health Metrics

### Phase 2: Create Adapter Layer

Create focused adapters for each sub-domain:

#### Core RBAC Adapters
- `src/adapters/rbac/role.adapter.ts`
- `src/adapters/rbac/permission.adapter.ts`
- `src/adapters/rbac/permissionBundle.adapter.ts`
- `src/adapters/rbac/userRole.adapter.ts`

#### Metadata Adapters
- `src/adapters/rbac/metadataSurface.adapter.ts`
- `src/adapters/rbac/surfaceBinding.adapter.ts`

#### Feature Adapters
- `src/adapters/rbac/featureCatalog.adapter.ts`
- `src/adapters/rbac/tenantFeatureGrant.adapter.ts`

#### Other Domain Adapters
- `src/adapters/rbac/rbacAudit.adapter.ts`
- `src/adapters/rbac/delegation.adapter.ts`
- `src/adapters/rbac/publishing.adapter.ts`

### Phase 3: Create Repository Layer

Create focused repositories mirroring adapters:

#### Core RBAC Repositories
- `src/repositories/rbac/role.repository.ts`
- `src/repositories/rbac/permission.repository.ts`
- `src/repositories/rbac/permissionBundle.repository.ts`
- `src/repositories/rbac/userRole.repository.ts`

#### Metadata Repositories
- `src/repositories/rbac/metadataSurface.repository.ts`
- `src/repositories/rbac/surfaceBinding.repository.ts`

#### Feature Repositories
- `src/repositories/rbac/featureCatalog.repository.ts`
- `src/repositories/rbac/tenantFeatureGrant.repository.ts`

#### Other Domain Repositories
- `src/repositories/rbac/rbacAudit.repository.ts`
- `src/repositories/rbac/delegation.repository.ts`
- `src/repositories/rbac/publishing.repository.ts`

### Phase 4: Refactor Service Layer

Create focused services for complex workflows:

- `src/services/rbac/RbacCoreService.ts` - Role & Permission management
- `src/services/rbac/RbacMetadataService.ts` - Metadata surface operations
- `src/services/rbac/RbacFeatureService.ts` - Feature access & licensing
- `src/services/rbac/RbacDelegationService.ts` - Delegation workflows
- `src/services/rbac/RbacAuditService.ts` - Audit & compliance
- `src/services/rbac/RbacPublishingService.ts` - Publishing workflows
- `src/services/rbac/RbacStatisticsService.ts` - Dashboard & analytics

Keep main `RbacService` as a facade/orchestrator:
- `src/services/rbac.service.ts` - Coordinates all RBAC services

---

## Detailed Component Breakdown

### 1. Role Adapter (`role.adapter.ts`)

```typescript
import 'server-only';
import { injectable, inject } from 'inversify';
import { BaseAdapter } from '@/adapters/base.adapter';
import { Role } from '@/models/rbac.model';
import { TYPES } from '@/lib/types';

export interface IRoleAdapter extends IBaseAdapter<Role> {
  getRoleWithPermissions(id: string): Promise<RoleWithPermissions | null>;
  getRolesByScope(scope: string): Promise<Role[]>;
  getRoleStatistics(includeSystem: boolean): Promise<Role[]>;
}

@injectable()
export class RoleAdapter extends BaseAdapter<Role> implements IRoleAdapter {
  protected tableName = 'roles';

  protected defaultSelect = `
    id,
    tenant_id,
    name,
    description,
    metadata_key,
    scope,
    is_system,
    is_delegatable,
    created_at,
    updated_at
  `;

  protected defaultRelationships = [
    {
      table: 'role_permissions',
      foreignKey: 'role_id',
      select: ['permission_id'],
      nestedRelationships: [
        {
          table: 'permissions',
          foreignKey: 'permission_id',
          select: ['id', 'name', 'action', 'module']
        }
      ]
    }
  ];

  async getRoleWithPermissions(id: string): Promise<RoleWithPermissions | null> {
    const supabase = await this.getSupabaseClient();
    const tenantId = await this.getTenantId();

    const { data, error } = await supabase
      .from('roles')
      .select(`
        *,
        role_permissions!inner (
          permissions (*)
        ),
        role_bundles!inner (
          permission_bundles (*)
        )
      `)
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw new Error(`Failed to fetch role: ${error.message}`);
    }

    if (!data) return null;

    // Get user count
    const { count } = await supabase
      .from('user_roles')
      .select('*', { count: 'exact', head: true })
      .eq('role_id', id)
      .eq('tenant_id', tenantId);

    return {
      ...data,
      permissions: data.role_permissions?.map((rp: any) => rp.permissions) || [],
      bundles: data.role_bundles?.map((rb: any) => rb.permission_bundles) || [],
      user_count: count || 0
    };
  }

  async getRolesByScope(scope: string): Promise<Role[]> {
    const { data } = await this.fetch({
      filters: {
        scope: { operator: 'eq', value: scope },
        deleted_at: { operator: 'isEmpty', value: true }
      },
      order: { column: 'name', ascending: true }
    });

    return data || [];
  }

  async getRoleStatistics(includeSystem: boolean): Promise<Role[]> {
    const supabase = await this.getSupabaseClient();
    const tenantId = await this.getTenantId();

    let query = supabase
      .from('roles')
      .select('*')
      .eq('tenant_id', tenantId)
      .is('deleted_at', null);

    if (!includeSystem) {
      query = query.neq('scope', 'system');
    }

    const { data, error } = await query.order('name');

    if (error) {
      throw new Error(`Failed to fetch role statistics: ${error.message}`);
    }

    // Enrich with statistics
    const roles = data || [];
    for (const role of roles) {
      const { count: userCount } = await supabase
        .from('user_roles')
        .select('*', { count: 'exact', head: true })
        .eq('role_id', role.id)
        .eq('tenant_id', tenantId);

      const { count: bundleCount } = await supabase
        .from('role_bundles')
        .select('*', { count: 'exact', head: true })
        .eq('role_id', role.id)
        .eq('tenant_id', tenantId);

      (role as any).user_count = userCount || 0;
      (role as any).bundle_count = bundleCount || 0;
    }

    return roles;
  }

  protected async onBeforeCreate(data: Partial<Role>): Promise<Partial<Role>> {
    // Normalize scope
    if (data.scope) {
      data.scope = this.normalizeRoleScope(data.scope);
    }
    return data;
  }

  private normalizeRoleScope(scope: string): 'system' | 'tenant' | 'delegated' {
    if (scope === 'system' || scope === 'tenant' || scope === 'delegated') {
      return scope;
    }
    if (scope === 'campus' || scope === 'ministry') {
      return 'delegated';
    }
    return 'tenant';
  }
}
```

### 2. Role Repository (`role.repository.ts`)

```typescript
import { injectable, inject } from 'inversify';
import { BaseRepository } from '@/repositories/base.repository';
import { Role, RoleWithPermissions } from '@/models/rbac.model';
import { TYPES } from '@/lib/types';
import type { IRoleAdapter } from '@/adapters/rbac/role.adapter';

export interface IRoleRepository extends BaseRepository<Role> {
  getRoleWithPermissions(id: string): Promise<RoleWithPermissions | null>;
  getRolesByScope(scope: string): Promise<Role[]>;
  getRoleStatistics(includeSystem: boolean): Promise<Role[]>;
  validateRoleName(name: string, excludeId?: string): Promise<boolean>;
}

@injectable()
export class RoleRepository extends BaseRepository<Role> implements IRoleRepository {
  constructor(
    @inject(TYPES.IRoleAdapter)
    private readonly roleAdapter: IRoleAdapter
  ) {
    super(roleAdapter);
  }

  async getRoleWithPermissions(id: string): Promise<RoleWithPermissions | null> {
    return await this.roleAdapter.getRoleWithPermissions(id);
  }

  async getRolesByScope(scope: string): Promise<Role[]> {
    return await this.roleAdapter.getRolesByScope(scope);
  }

  async getRoleStatistics(includeSystem: boolean): Promise<Role[]> {
    return await this.roleAdapter.getRoleStatistics(includeSystem);
  }

  async validateRoleName(name: string, excludeId?: string): Promise<boolean> {
    const filters: any = {
      name: { operator: 'eq', value: name },
      deleted_at: { operator: 'isEmpty', value: true }
    };

    if (excludeId) {
      filters.id = { operator: 'neq', value: excludeId };
    }

    const { data } = await this.find({ filters, pagination: { page: 1, pageSize: 1 } });
    return (data?.length || 0) === 0;
  }

  protected async beforeCreate(data: Partial<Role>): Promise<Partial<Role>> {
    // Business validation: check for duplicate role names
    if (data.name) {
      const isUnique = await this.validateRoleName(data.name);
      if (!isUnique) {
        throw new Error(`Role with name "${data.name}" already exists`);
      }
    }

    // Business rule: system roles cannot be created by users
    if (data.scope === 'system' && !data.is_system) {
      throw new Error('Cannot create system scope role without system flag');
    }

    return data;
  }

  protected async beforeUpdate(id: string, data: Partial<Role>): Promise<Partial<Role>> {
    // Business validation: check for duplicate role names
    if (data.name) {
      const isUnique = await this.validateRoleName(data.name, id);
      if (!isUnique) {
        throw new Error(`Role with name "${data.name}" already exists`);
      }
    }

    // Business rule: cannot change system roles
    const existingRole = await this.findById(id);
    if (existingRole?.is_system && data.scope !== undefined && data.scope !== 'system') {
      throw new Error('Cannot change scope of system role');
    }

    return data;
  }

  protected async beforeDelete(id: string): Promise<void> {
    // Business rule: cannot delete system roles
    const role = await this.findById(id);
    if (role?.is_system) {
      throw new Error('Cannot delete system role');
    }

    // Business rule: cannot delete role with active users
    const roleWithPerms = await this.getRoleWithPermissions(id);
    if (roleWithPerms && roleWithPerms.user_count > 0) {
      throw new Error(`Cannot delete role with ${roleWithPerms.user_count} active users`);
    }
  }
}
```

### 3. RBAC Core Service (`RbacCoreService.ts`)

```typescript
import 'server-only';
import { injectable, inject } from 'inversify';
import { TYPES } from '@/lib/types';
import type { IRoleRepository } from '@/repositories/rbac/role.repository';
import type { IPermissionBundleRepository } from '@/repositories/rbac/permissionBundle.repository';
import type { IUserRoleRepository } from '@/repositories/rbac/userRole.repository';
import type { IRbacAuditRepository } from '@/repositories/rbac/rbacAudit.repository';
import {
  Role,
  PermissionBundle,
  UserRole,
  CreateRoleDto,
  UpdateRoleDto,
  AssignRoleDto
} from '@/models/rbac.model';

@injectable()
export class RbacCoreService {
  constructor(
    @inject(TYPES.IRoleRepository)
    private roleRepo: IRoleRepository,

    @inject(TYPES.IPermissionBundleRepository)
    private bundleRepo: IPermissionBundleRepository,

    @inject(TYPES.IUserRoleRepository)
    private userRoleRepo: IUserRoleRepository,

    @inject(TYPES.IRbacAuditRepository)
    private auditRepo: IRbacAuditRepository
  ) {}

  // Role Management
  async createRole(data: CreateRoleDto): Promise<Role> {
    const role = await this.roleRepo.create(data);

    // Log the action
    await this.auditRepo.create({
      action: 'CREATE_ROLE',
      resource_type: 'role',
      resource_id: role.id,
      new_values: data
    });

    return role;
  }

  async updateRole(id: string, data: UpdateRoleDto): Promise<Role> {
    // Get old values for audit
    const oldRole = await this.roleRepo.getRoleWithPermissions(id);

    const role = await this.roleRepo.update(id, data);

    // Log the action
    await this.auditRepo.create({
      action: 'UPDATE_ROLE',
      resource_type: 'role',
      resource_id: role.id,
      old_values: oldRole,
      new_values: data
    });

    return role;
  }

  async deleteRole(id: string): Promise<void> {
    // Get role data for audit before deletion
    const role = await this.roleRepo.getRoleWithPermissions(id);

    await this.roleRepo.delete(id);

    // Log the action
    await this.auditRepo.create({
      action: 'DELETE_ROLE',
      resource_type: 'role',
      resource_id: id,
      old_values: role
    });
  }

  async getRoles(includeSystem = true): Promise<Role[]> {
    if (includeSystem) {
      const { data } = await this.roleRepo.findAll({
        filters: {
          deleted_at: { operator: 'isEmpty', value: true }
        },
        order: { column: 'name', ascending: true }
      });
      return data || [];
    }

    return await this.roleRepo.getRolesByScope('tenant');
  }

  async getRoleWithPermissions(id: string) {
    return await this.roleRepo.getRoleWithPermissions(id);
  }

  // User-Role Assignment
  async assignRole(data: AssignRoleDto, assignedBy?: string): Promise<UserRole> {
    const userRole = await this.userRoleRepo.assignRole(data, assignedBy);

    // Log the action
    await this.auditRepo.create({
      action: 'ASSIGN_ROLE',
      resource_type: 'user_role',
      resource_id: userRole.id,
      new_values: data,
      user_id: assignedBy
    });

    return userRole;
  }

  async revokeRole(userId: string, roleId: string): Promise<void> {
    await this.userRoleRepo.revokeRole(userId, roleId);

    // Log the action
    await this.auditRepo.create({
      action: 'REVOKE_ROLE',
      resource_type: 'user_role',
      resource_id: `${userId}-${roleId}`,
      old_values: { user_id: userId, role_id: roleId }
    });
  }

  async getUserRoles(userId: string): Promise<Role[]> {
    return await this.userRoleRepo.getUserRoles(userId);
  }

  async getUserEffectivePermissions(userId: string) {
    return await this.userRoleRepo.getUserEffectivePermissions(userId);
  }

  // Permission Bundle Management
  async createPermissionBundle(data: CreatePermissionBundleDto): Promise<PermissionBundle> {
    const bundle = await this.bundleRepo.create(data);

    // Log the action
    await this.auditRepo.create({
      action: 'CREATE_BUNDLE',
      resource_type: 'permission_bundle',
      resource_id: bundle.id,
      new_values: data
    });

    return bundle;
  }

  async updatePermissionBundle(id: string, data: UpdatePermissionBundleDto): Promise<PermissionBundle> {
    const oldBundle = await this.bundleRepo.getBundleWithPermissions(id);
    const bundle = await this.bundleRepo.update(id, data);

    // Log the action
    await this.auditRepo.create({
      action: 'UPDATE_BUNDLE',
      resource_type: 'permission_bundle',
      resource_id: bundle.id,
      old_values: oldBundle,
      new_values: data
    });

    return bundle;
  }

  async deletePermissionBundle(id: string): Promise<void> {
    const bundle = await this.bundleRepo.getBundleWithPermissions(id);
    await this.bundleRepo.delete(id);

    // Log the action
    await this.auditRepo.create({
      action: 'DELETE_BUNDLE',
      resource_type: 'permission_bundle',
      resource_id: id,
      old_values: bundle
    });
  }

  async getPermissionBundles(scopeFilter?: string): Promise<PermissionBundle[]> {
    if (scopeFilter) {
      const { data } = await this.bundleRepo.findAll({
        filters: {
          scope: { operator: 'eq', value: scopeFilter }
        },
        order: { column: 'name', ascending: true }
      });
      return data || [];
    }

    const { data } = await this.bundleRepo.findAll({
      order: { column: 'name', ascending: true }
    });
    return data || [];
  }
}
```

### 4. Main RBAC Service Facade (`rbac.service.ts`)

```typescript
import 'server-only';
import { injectable, inject } from 'inversify';
import { TYPES } from '@/lib/types';
import type { RbacCoreService } from '@/services/rbac/RbacCoreService';
import type { RbacMetadataService } from '@/services/rbac/RbacMetadataService';
import type { RbacFeatureService } from '@/services/rbac/RbacFeatureService';
import type { RbacDelegationService } from '@/services/rbac/RbacDelegationService';
import type { RbacAuditService } from '@/services/rbac/RbacAuditService';
import type { RbacPublishingService } from '@/services/rbac/RbacPublishingService';
import type { RbacStatisticsService } from '@/services/rbac/RbacStatisticsService';

/**
 * Main RBAC Service - Acts as a facade to coordinate all RBAC sub-services
 * Provides a unified interface for RBAC operations throughout the application
 */
@injectable()
export class RbacService {
  constructor(
    @inject(TYPES.RbacCoreService)
    private coreService: RbacCoreService,

    @inject(TYPES.RbacMetadataService)
    private metadataService: RbacMetadataService,

    @inject(TYPES.RbacFeatureService)
    private featureService: RbacFeatureService,

    @inject(TYPES.RbacDelegationService)
    private delegationService: RbacDelegationService,

    @inject(TYPES.RbacAuditService)
    private auditService: RbacAuditService,

    @inject(TYPES.RbacPublishingService)
    private publishingService: RbacPublishingService,

    @inject(TYPES.RbacStatisticsService)
    private statisticsService: RbacStatisticsService
  ) {}

  // ========== Core RBAC Operations ==========

  // Roles
  createRole = this.coreService.createRole.bind(this.coreService);
  updateRole = this.coreService.updateRole.bind(this.coreService);
  deleteRole = this.coreService.deleteRole.bind(this.coreService);
  getRoles = this.coreService.getRoles.bind(this.coreService);
  getRoleWithPermissions = this.coreService.getRoleWithPermissions.bind(this.coreService);

  // User-Role Assignments
  assignRole = this.coreService.assignRole.bind(this.coreService);
  revokeRole = this.coreService.revokeRole.bind(this.coreService);
  getUserRoles = this.coreService.getUserRoles.bind(this.coreService);
  getUserEffectivePermissions = this.coreService.getUserEffectivePermissions.bind(this.coreService);

  // Permission Bundles
  createPermissionBundle = this.coreService.createPermissionBundle.bind(this.coreService);
  updatePermissionBundle = this.coreService.updatePermissionBundle.bind(this.coreService);
  deletePermissionBundle = this.coreService.deletePermissionBundle.bind(this.coreService);
  getPermissionBundles = this.coreService.getPermissionBundles.bind(this.coreService);

  // ========== Metadata Operations ==========

  getMetadataSurfaces = this.metadataService.getMetadataSurfaces.bind(this.metadataService);
  createMetadataSurface = this.metadataService.createMetadataSurface.bind(this.metadataService);
  getSurfaceBindings = this.metadataService.getSurfaceBindings.bind(this.metadataService);
  createSurfaceBinding = this.metadataService.createSurfaceBinding.bind(this.metadataService);
  updateSurfaceBinding = this.metadataService.updateSurfaceBinding.bind(this.metadataService);
  deleteSurfaceBinding = this.metadataService.deleteSurfaceBinding.bind(this.metadataService);

  // ========== Feature Management ==========

  getFeatureCatalog = this.featureService.getFeatureCatalog.bind(this.featureService);
  getTenantFeatureGrants = this.featureService.getTenantFeatureGrants.bind(this.featureService);
  hasFeatureAccess = this.featureService.hasFeatureAccess.bind(this.featureService);
  createFeature = this.featureService.createFeature.bind(this.featureService);

  // ========== Delegation ==========

  getDelegatedContext = this.delegationService.getDelegatedContext.bind(this.delegationService);
  getDelegationScopes = this.delegationService.getDelegationScopes.bind(this.delegationService);
  assignDelegatedRole = this.delegationService.assignDelegatedRole.bind(this.delegationService);
  revokeDelegatedRole = this.delegationService.revokeDelegatedRole.bind(this.delegationService);

  // ========== Audit & Compliance ==========

  getAuditLogs = this.auditService.getAuditLogs.bind(this.auditService);
  getAuditTimelineForCompliance = this.auditService.getAuditTimelineForCompliance.bind(this.auditService);
  generateComplianceReport = this.auditService.generateComplianceReport.bind(this.auditService);

  // ========== Publishing ==========

  getPublishingJobs = this.publishingService.getPublishingJobs.bind(this.publishingService);
  queueMetadataCompilationJob = this.publishingService.queueMetadataCompilationJob.bind(this.publishingService);
  compileMetadata = this.publishingService.compileMetadata.bind(this.publishingService);
  publishMetadata = this.publishingService.publishMetadata.bind(this.publishingService);

  // ========== Statistics & Dashboards ==========

  getRoleStatistics = this.statisticsService.getRoleStatistics.bind(this.statisticsService);
  getBundleStatistics = this.statisticsService.getBundleStatistics.bind(this.statisticsService);
  getDashboardStatistics = this.statisticsService.getDashboardStatistics.bind(this.statisticsService);
  getRbacHealthMetrics = this.statisticsService.getRbacHealthMetrics.bind(this.statisticsService);
}
```

---

## Migration Strategy

### Step 1: Create Infrastructure (Week 1)
1. Create directory structure:
   ```
   src/
     adapters/rbac/
     repositories/rbac/
     services/rbac/
   ```

2. Update dependency injection container (`src/lib/types.ts`):
   ```typescript
   // Add new RBAC types
   IRoleAdapter: Symbol.for('IRoleAdapter'),
   IRoleRepository: Symbol.for('IRoleRepository'),
   IPermissionBundleAdapter: Symbol.for('IPermissionBundleAdapter'),
   // ... etc

   RbacCoreService: Symbol.for('RbacCoreService'),
   RbacMetadataService: Symbol.for('RbacMetadataService'),
   // ... etc
   ```

3. Create base interfaces for RBAC types

### Step 2: Migrate Core Domain (Week 2)
1. Create and test Role adapter + repository
2. Create and test Permission adapter + repository
3. Create and test PermissionBundle adapter + repository
4. Create and test UserRole adapter + repository
5. Create RbacCoreService
6. Update existing code to use new core service (gradually)

### Step 3: Migrate Metadata Domain (Week 3)
1. Create MetadataSurface adapter + repository
2. Create SurfaceBinding adapter + repository
3. Create RbacMetadataService
4. Update metadata-related code

### Step 4: Migrate Feature Domain (Week 4)
1. Create FeatureCatalog adapter + repository
2. Create TenantFeatureGrant adapter + repository
3. Create RbacFeatureService
4. Update feature access checks

### Step 5: Migrate Supporting Domains (Week 5)
1. Create Audit adapter + repository + service
2. Create Delegation adapter + repository + service
3. Create Publishing adapter + repository + service
4. Create Statistics service

### Step 6: Create Facade & Cleanup (Week 6)
1. Create new RbacService facade
2. Update all imports to use new RbacService
3. Deprecate old rbac.repository.ts and rbac.service.ts
4. Add deprecation warnings
5. Monitor for any remaining usage

### Step 7: Final Migration (Week 7)
1. Remove old files
2. Clean up unused imports
3. Update tests
4. Update documentation
5. Deploy to staging
6. Monitor for issues

---

## Benefits & Expected Outcomes

### 1. **Improved Maintainability**
- **Before**: 3,036-line repository file, 1,597-line service file
- **After**: 25+ focused files, each < 300 lines
- Each component has single responsibility
- Easy to locate and fix bugs

### 2. **Enhanced Testability**
- **Before**: Must mock entire Supabase client for any test
- **After**: Can unit test each component independently
- Mock only the specific adapter/repository needed
- Better test coverage with less effort

### 3. **Better Developer Experience**
- **Before**: Overwhelming files, hard to navigate
- **After**: Clear structure, intuitive organization
- Easy to find relevant code
- Lower onboarding time for new developers

### 4. **Reduced Merge Conflicts**
- **Before**: All RBAC changes touch same 2 files
- **After**: Changes isolated to specific domain files
- Multiple developers can work in parallel
- Less time resolving conflicts

### 5. **Improved Scalability**
- **Before**: Adding features requires modifying monolithic files
- **After**: Add new adapters/repositories independently
- Plug-and-play architecture
- Easier to extend functionality

### 6. **Better Error Handling**
- **Before**: Inconsistent error handling across methods
- **After**: Centralized error handling in each layer
- Domain-specific error types
- Better error messages

### 7. **Performance Optimization Opportunities**
- **Before**: Cannot optimize individual operations
- **After**: Can cache at adapter level
- Can optimize queries per domain
- Better monitoring of slow operations

### 8. **Clearer Dependencies**
- **Before**: Hidden dependencies, circular risks
- **After**: Explicit dependency injection
- Clear dependency graph
- Easier to understand system architecture

### 9. **Compliance & Audit**
- **Before**: Audit logging scattered
- **After**: Centralized audit service
- Consistent audit trail
- Easier compliance reporting

### 10. **Multi-tenant Isolation**
- **Before**: Tenant resolution in every method
- **After**: Centralized in adapters
- Better tenant data isolation
- Reduced risk of data leaks

---

## Implementation Checklist

### Phase 1: Infrastructure
- [ ] Create `src/adapters/rbac/` directory
- [ ] Create `src/repositories/rbac/` directory
- [ ] Create `src/services/rbac/` directory
- [ ] Update `src/lib/types.ts` with new DI symbols
- [ ] Create base interfaces for RBAC models
- [ ] Set up testing infrastructure for new modules

### Phase 2: Core RBAC Domain
- [ ] Create `IRoleAdapter` interface
- [ ] Implement `RoleAdapter` extending `BaseAdapter`
- [ ] Create `IRoleRepository` interface
- [ ] Implement `RoleRepository` extending `BaseRepository`
- [ ] Write unit tests for RoleAdapter
- [ ] Write unit tests for RoleRepository
- [ ] Create `IPermissionAdapter` interface
- [ ] Implement `PermissionAdapter`
- [ ] Create `IPermissionRepository` interface
- [ ] Implement `PermissionRepository`
- [ ] Create `IPermissionBundleAdapter` interface
- [ ] Implement `PermissionBundleAdapter`
- [ ] Create `IPermissionBundleRepository` interface
- [ ] Implement `PermissionBundleRepository`
- [ ] Create `IUserRoleAdapter` interface
- [ ] Implement `UserRoleAdapter`
- [ ] Create `IUserRoleRepository` interface
- [ ] Implement `UserRoleRepository`
- [ ] Create `RbacCoreService`
- [ ] Write integration tests for RbacCoreService
- [ ] Update DI container bindings

### Phase 3: Metadata Domain
- [ ] Create `IMetadataSurfaceAdapter` interface
- [ ] Implement `MetadataSurfaceAdapter`
- [ ] Create `IMetadataSurfaceRepository` interface
- [ ] Implement `MetadataSurfaceRepository`
- [ ] Create `ISurfaceBindingAdapter` interface
- [ ] Implement `SurfaceBindingAdapter`
- [ ] Create `ISurfaceBindingRepository` interface
- [ ] Implement `SurfaceBindingRepository`
- [ ] Create `RbacMetadataService`
- [ ] Write tests for metadata components
- [ ] Update DI container bindings

### Phase 4: Feature Domain
- [ ] Create `IFeatureCatalogAdapter` interface
- [ ] Implement `FeatureCatalogAdapter`
- [ ] Create `IFeatureCatalogRepository` interface
- [ ] Implement `FeatureCatalogRepository`
- [ ] Create `ITenantFeatureGrantAdapter` interface
- [ ] Implement `TenantFeatureGrantAdapter`
- [ ] Create `ITenantFeatureGrantRepository` interface
- [ ] Implement `TenantFeatureGrantRepository`
- [ ] Create `RbacFeatureService`
- [ ] Write tests for feature components
- [ ] Update DI container bindings

### Phase 5: Audit Domain
- [ ] Create `IRbacAuditAdapter` interface
- [ ] Implement `RbacAuditAdapter`
- [ ] Create `IRbacAuditRepository` interface
- [ ] Implement `RbacAuditRepository`
- [ ] Create `RbacAuditService`
- [ ] Implement compliance reporting
- [ ] Write tests for audit components
- [ ] Update DI container bindings

### Phase 6: Delegation Domain
- [ ] Create `IDelegationAdapter` interface
- [ ] Implement `DelegationAdapter`
- [ ] Create `IDelegationRepository` interface
- [ ] Implement `DelegationRepository`
- [ ] Create `RbacDelegationService`
- [ ] Write tests for delegation components
- [ ] Update DI container bindings

### Phase 7: Publishing Domain
- [ ] Create `IPublishingAdapter` interface
- [ ] Implement `PublishingAdapter`
- [ ] Create `IPublishingRepository` interface
- [ ] Implement `PublishingRepository`
- [ ] Create `RbacPublishingService`
- [ ] Write tests for publishing components
- [ ] Update DI container bindings

### Phase 8: Statistics Domain
- [ ] Create `RbacStatisticsService`
- [ ] Implement dashboard statistics
- [ ] Implement role statistics
- [ ] Implement bundle statistics
- [ ] Implement health metrics
- [ ] Write tests for statistics service
- [ ] Update DI container bindings

### Phase 9: Service Facade
- [ ] Create new `RbacService` facade
- [ ] Wire up all sub-services
- [ ] Add facade methods for all operations
- [ ] Write integration tests for facade
- [ ] Update DI container bindings

### Phase 10: Migration
- [ ] Identify all usages of old `RbacService`
- [ ] Update imports to new service structure
- [ ] Run full test suite
- [ ] Fix any breaking changes
- [ ] Add deprecation warnings to old files
- [ ] Monitor for usage of deprecated code

### Phase 11: Cleanup
- [ ] Remove old `rbac.repository.ts`
- [ ] Remove old `rbac.service.ts` (keep facade)
- [ ] Update documentation
- [ ] Update API routes
- [ ] Update UI components
- [ ] Run full regression test suite
- [ ] Deploy to staging
- [ ] Monitor metrics

### Phase 12: Documentation
- [ ] Update architecture documentation
- [ ] Create RBAC development guide
- [ ] Document new service structure
- [ ] Create migration guide for other modules
- [ ] Update API documentation
- [ ] Create troubleshooting guide

---

## File Size Comparison

### Before Refactoring
```
src/repositories/rbac.repository.ts     3,036 lines
src/services/rbac.service.ts            1,597 lines
                                        ─────────
Total:                                  4,633 lines (2 files)
```

### After Refactoring
```
Adapters Layer (11 files):
  src/adapters/rbac/role.adapter.ts                      ~250 lines
  src/adapters/rbac/permission.adapter.ts                ~150 lines
  src/adapters/rbac/permissionBundle.adapter.ts          ~200 lines
  src/adapters/rbac/userRole.adapter.ts                  ~200 lines
  src/adapters/rbac/metadataSurface.adapter.ts           ~180 lines
  src/adapters/rbac/surfaceBinding.adapter.ts            ~150 lines
  src/adapters/rbac/featureCatalog.adapter.ts            ~120 lines
  src/adapters/rbac/tenantFeatureGrant.adapter.ts        ~150 lines
  src/adapters/rbac/rbacAudit.adapter.ts                 ~200 lines
  src/adapters/rbac/delegation.adapter.ts                ~180 lines
  src/adapters/rbac/publishing.adapter.ts                ~200 lines

Repositories Layer (11 files):
  src/repositories/rbac/role.repository.ts               ~200 lines
  src/repositories/rbac/permission.repository.ts         ~120 lines
  src/repositories/rbac/permissionBundle.repository.ts   ~180 lines
  src/repositories/rbac/userRole.repository.ts           ~180 lines
  src/repositories/rbac/metadataSurface.repository.ts    ~150 lines
  src/repositories/rbac/surfaceBinding.repository.ts     ~120 lines
  src/repositories/rbac/featureCatalog.repository.ts     ~100 lines
  src/repositories/rbac/tenantFeatureGrant.repository.ts ~120 lines
  src/repositories/rbac/rbacAudit.repository.ts          ~180 lines
  src/repositories/rbac/delegation.repository.ts         ~150 lines
  src/repositories/rbac/publishing.repository.ts         ~180 lines

Services Layer (8 files):
  src/services/rbac/RbacCoreService.ts                   ~300 lines
  src/services/rbac/RbacMetadataService.ts               ~200 lines
  src/services/rbac/RbacFeatureService.ts                ~180 lines
  src/services/rbac/RbacDelegationService.ts             ~200 lines
  src/services/rbac/RbacAuditService.ts                  ~200 lines
  src/services/rbac/RbacPublishingService.ts             ~250 lines
  src/services/rbac/RbacStatisticsService.ts             ~200 lines
  src/services/rbac.service.ts (Facade)                  ~150 lines
                                                         ─────────
Total:                                                   ~5,100 lines (30 files)
```

**Analysis:**
- Slight increase in total lines due to:
  - Proper interfaces and type definitions
  - Better error handling
  - Comprehensive documentation
  - Duplicate code elimination in some areas offset by clearer structure
- **Average file size: 170 lines** (vs 2,300 lines before)
- **30 focused files** vs 2 monolithic files
- Each file has single, clear purpose

---

## Conclusion

This refactoring plan transforms the RBAC system from a monolithic, unmaintainable structure into a modular, scalable architecture that follows established patterns in the codebase. The migration can be performed incrementally over 7-12 weeks with minimal disruption to ongoing development.

The key success factors are:
1. **Follow the member module pattern** - proven, battle-tested architecture
2. **Incremental migration** - avoid big bang rewrites
3. **Comprehensive testing** - ensure no regressions
4. **Clear documentation** - help team understand new structure
5. **Monitoring** - track performance and issues during rollout

The resulting system will be:
- **Easier to maintain** - find and fix bugs quickly
- **Easier to test** - unit test individual components
- **Easier to extend** - add features without fear
- **Easier to understand** - clear separation of concerns
- **More performant** - optimize at granular level
- **More reliable** - better error handling and logging

This refactoring is an investment in the long-term health and maintainability of the StewardTrack platform.
