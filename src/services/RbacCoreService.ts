import 'server-only';
import { injectable, inject } from 'inversify';
import { TYPES } from '@/lib/types';
import type { IRoleRepository } from '@/repositories/role.repository';
import type { IPermissionRepository } from '@/repositories/permission.repository';
import type { IPermissionBundleRepository } from '@/repositories/permissionBundle.repository';
import type { IUserRoleManagementRepository } from '@/repositories/userRole.repository';
import { tenantUtils } from '@/utils/tenantUtils';
import type {
  Role,
  Permission,
  PermissionBundle,
  UserRole,
  RoleWithPermissions,
  BundleWithPermissions,
  UserWithRoles,
  CreateRoleDto,
  UpdateRoleDto,
  CreatePermissionBundleDto,
  UpdatePermissionBundleDto,
  AssignRoleDto
} from '@/models/rbac.model';

/**
 * RbacCoreService
 *
 * Orchestrates all core RBAC operations including:
 * - Role management (create, update, delete, query)
 * - Permission bundle management
 * - User-role assignments
 * - Permission queries and effective permission calculation
 * - Multi-role support and conflict analysis
 *
 * This service coordinates between multiple repositories to provide
 * a unified interface for RBAC operations throughout the application.
 */
@injectable()
export class RbacCoreService {
  constructor(
    @inject(TYPES.IRoleRepository)
    private roleRepository: IRoleRepository,
    @inject(TYPES.IPermissionRepository)
    private permissionRepository: IPermissionRepository,
    @inject(TYPES.IPermissionBundleRepository)
    private bundleRepository: IPermissionBundleRepository,
    @inject(TYPES.IUserRoleManagementRepository)
    private userRoleRepository: IUserRoleManagementRepository
    // TODO: Inject RbacAuditService when it's created
    // @inject(TYPES.RbacAuditService)
    // private auditService: RbacAuditService
  ) {}

  /**
   * Resolves the tenant ID from the provided value or current context
   */
  private async resolveTenantId(tenantId?: string): Promise<string> {
    const resolved = tenantId ?? (await tenantUtils.getTenantId());
    return resolved ?? '550e8400-e29b-41d4-a716-446655440000'; // Valid UUID fallback for testing
  }

  // ==================== ROLE METHODS ====================

  /**
   * Creates a new role with the specified configuration
   */
  async createRole(data: CreateRoleDto, tenantId?: string): Promise<Role> {
    const effectiveTenantId = await this.resolveTenantId(tenantId);
    const role = await this.roleRepository.createRole(data, effectiveTenantId);

    // TODO: Log audit event when RbacAuditService is available
    // await this.auditService.logAuditEvent({
    //   tenant_id: effectiveTenantId,
    //   user_id: 'system',
    //   action: 'CREATE_ROLE',
    //   resource_type: 'role',
    //   resource_id: role.id,
    //   new_values: data
    // });

    return role;
  }

  /**
   * Updates an existing role
   */
  async updateRole(id: string, data: UpdateRoleDto, tenantId?: string): Promise<Role> {
    const effectiveTenantId = tenantId || await tenantUtils.getTenantId();
    if (!effectiveTenantId) {
      throw new Error('No tenant context available');
    }

    // Get old values for audit
    const oldRole = await this.roleRepository.getRoleWithPermissions(id, effectiveTenantId);

    const role = await this.roleRepository.updateRole(id, data, effectiveTenantId);

    // TODO: Log audit event when RbacAuditService is available
    // await this.auditService.logAuditEvent({
    //   tenant_id: effectiveTenantId,
    //   user_id: 'system',
    //   action: 'UPDATE_ROLE',
    //   resource_type: 'role',
    //   resource_id: role.id,
    //   old_values: oldRole,
    //   new_values: data
    // });

    return role;
  }

  /**
   * Deletes a role
   */
  async deleteRole(id: string, tenantId?: string): Promise<void> {
    const effectiveTenantId = tenantId || await tenantUtils.getTenantId();
    if (!effectiveTenantId) {
      throw new Error('No tenant context available');
    }

    // Get role data for audit before deletion
    const role = await this.roleRepository.getRoleWithPermissions(id, effectiveTenantId);

    await this.roleRepository.deleteRole(id, effectiveTenantId);

    // TODO: Log audit event when RbacAuditService is available
    // await this.auditService.logAuditEvent({
    //   tenant_id: effectiveTenantId,
    //   user_id: 'system',
    //   action: 'DELETE_ROLE',
    //   resource_type: 'role',
    //   resource_id: id,
    //   old_values: role
    // });
  }

  /**
   * Retrieves all roles for a tenant
   */
  async getRoles(tenantId?: string, includeSystem = true): Promise<Role[]> {
    const effectiveTenantId = await this.resolveTenantId(tenantId);
    return await this.roleRepository.getRoles(effectiveTenantId, includeSystem);
  }

  /**
   * Retrieves a role with its associated permissions and bundles
   */
  async getRoleWithPermissions(id: string, tenantId?: string): Promise<RoleWithPermissions | null> {
    const effectiveTenantId = tenantId || await tenantUtils.getTenantId();
    if (!effectiveTenantId) {
      throw new Error('No tenant context available');
    }

    return await this.roleRepository.getRoleWithPermissions(id, effectiveTenantId);
  }

  // ==================== PERMISSION BUNDLE METHODS ====================

  /**
   * Creates a new permission bundle
   */
  async createPermissionBundle(data: CreatePermissionBundleDto, tenantId?: string): Promise<PermissionBundle> {
    const effectiveTenantId = tenantId || await tenantUtils.getTenantId();
    if (!effectiveTenantId) {
      throw new Error('No tenant context available');
    }

    const bundle = await this.bundleRepository.createPermissionBundle(data, effectiveTenantId);

    // TODO: Log audit event when RbacAuditService is available
    // await this.auditService.logAuditEvent({
    //   tenant_id: effectiveTenantId,
    //   user_id: 'system',
    //   action: 'CREATE_BUNDLE',
    //   resource_type: 'permission_bundle',
    //   resource_id: bundle.id,
    //   new_values: data
    // });

    return bundle;
  }

  /**
   * Updates an existing permission bundle
   */
  async updatePermissionBundle(id: string, data: UpdatePermissionBundleDto, tenantId?: string): Promise<PermissionBundle> {
    const effectiveTenantId = tenantId || await tenantUtils.getTenantId();
    if (!effectiveTenantId) {
      throw new Error('No tenant context available');
    }

    const oldBundle = await this.bundleRepository.getBundleWithPermissions(id, effectiveTenantId);
    const bundle = await this.bundleRepository.updatePermissionBundle(id, data, effectiveTenantId);

    // TODO: Log audit event when RbacAuditService is available
    // await this.auditService.logAuditEvent({
    //   tenant_id: effectiveTenantId,
    //   user_id: 'system',
    //   action: 'UPDATE_BUNDLE',
    //   resource_type: 'permission_bundle',
    //   resource_id: bundle.id,
    //   old_values: oldBundle,
    //   new_values: data
    // });

    return bundle;
  }

  /**
   * Deletes a permission bundle
   */
  async deletePermissionBundle(id: string, tenantId?: string): Promise<void> {
    const effectiveTenantId = tenantId || await tenantUtils.getTenantId();
    if (!effectiveTenantId) {
      throw new Error('No tenant context available');
    }

    const bundle = await this.bundleRepository.getBundleWithPermissions(id, effectiveTenantId);
    await this.bundleRepository.deletePermissionBundle(id, effectiveTenantId);

    // TODO: Log audit event when RbacAuditService is available
    // await this.auditService.logAuditEvent({
    //   tenant_id: effectiveTenantId,
    //   user_id: 'system',
    //   action: 'DELETE_BUNDLE',
    //   resource_type: 'permission_bundle',
    //   resource_id: id,
    //   old_values: bundle
    // });
  }

  /**
   * Retrieves all permission bundles for a tenant, optionally filtered by scope
   */
  async getPermissionBundles(tenantId?: string, scopeFilter?: string): Promise<PermissionBundle[]> {
    const effectiveTenantId = tenantId || await tenantUtils.getTenantId();
    if (!effectiveTenantId) {
      throw new Error('No tenant context available');
    }

    return await this.bundleRepository.getPermissionBundles(effectiveTenantId, scopeFilter);
  }

  /**
   * Retrieves a bundle with its associated permissions
   */
  async getBundleWithPermissions(id: string, tenantId?: string): Promise<BundleWithPermissions | null> {
    const effectiveTenantId = tenantId || await tenantUtils.getTenantId();
    if (!effectiveTenantId) {
      throw new Error('No tenant context available');
    }

    return await this.bundleRepository.getBundleWithPermissions(id, effectiveTenantId);
  }

  /**
   * Adds permissions to a bundle
   */
  async addPermissionsToBundle(bundleId: string, permissionIds: string[], tenantId?: string): Promise<void> {
    const effectiveTenantId = tenantId || await tenantUtils.getTenantId();
    if (!effectiveTenantId) {
      throw new Error('No tenant context available');
    }

    await this.bundleRepository.addPermissionsToBundle(bundleId, permissionIds, effectiveTenantId);

    // TODO: Log audit event when RbacAuditService is available
    // await this.auditService.logAuditEvent({
    //   tenant_id: effectiveTenantId,
    //   user_id: 'system',
    //   action: 'ADD_PERMISSIONS_TO_BUNDLE',
    //   resource_type: 'permission_bundle',
    //   resource_id: bundleId,
    //   new_values: { permission_ids: permissionIds }
    // });
  }

  /**
   * Removes permissions from a bundle
   */
  async removePermissionsFromBundle(bundleId: string, permissionIds: string[], tenantId?: string): Promise<void> {
    const effectiveTenantId = tenantId || await tenantUtils.getTenantId();
    if (!effectiveTenantId) {
      throw new Error('No tenant context available');
    }

    await this.bundleRepository.removePermissionsFromBundle(bundleId, permissionIds, effectiveTenantId);

    // TODO: Log audit event when RbacAuditService is available
    // await this.auditService.logAuditEvent({
    //   tenant_id: effectiveTenantId,
    //   user_id: 'system',
    //   action: 'REMOVE_PERMISSIONS_FROM_BUNDLE',
    //   resource_type: 'permission_bundle',
    //   resource_id: bundleId,
    //   old_values: { permission_ids: permissionIds }
    // });
  }

  /**
   * Retrieves all permissions in a bundle
   */
  async getBundlePermissions(bundleId: string, tenantId?: string): Promise<any[]> {
    const effectiveTenantId = tenantId || await tenantUtils.getTenantId();
    if (!effectiveTenantId) {
      throw new Error('No tenant context available');
    }

    return await this.bundleRepository.getBundlePermissions(bundleId, effectiveTenantId);
  }

  // ==================== USER-ROLE ASSIGNMENT METHODS ====================

  /**
   * Assigns a role to a user
   */
  async assignRole(data: AssignRoleDto, tenantId?: string, assignedBy?: string): Promise<UserRole> {
    const effectiveTenantId = tenantId || await tenantUtils.getTenantId();
    if (!effectiveTenantId) {
      throw new Error('No tenant context available');
    }

    const userRole = await this.userRoleRepository.assignRole(data, effectiveTenantId, assignedBy);

    // TODO: Log audit event when RbacAuditService is available
    // await this.auditService.logAuditEvent({
    //   tenant_id: effectiveTenantId,
    //   user_id: assignedBy || 'system',
    //   action: 'ASSIGN_ROLE',
    //   resource_type: 'user_role',
    //   resource_id: userRole.id,
    //   new_values: data
    // });

    return userRole;
  }

  /**
   * Revokes a role from a user
   */
  async revokeRole(userId: string, roleId: string, tenantId?: string): Promise<void> {
    const effectiveTenantId = tenantId || await tenantUtils.getTenantId();
    if (!effectiveTenantId) {
      throw new Error('No tenant context available');
    }

    await this.userRoleRepository.revokeRole(userId, roleId, effectiveTenantId);

    // TODO: Log audit event when RbacAuditService is available
    // await this.auditService.logAuditEvent({
    //   tenant_id: effectiveTenantId,
    //   user_id: 'system',
    //   action: 'REVOKE_ROLE',
    //   resource_type: 'user_role',
    //   resource_id: `${userId}-${roleId}`,
    //   old_values: { user_id: userId, role_id: roleId }
    // });
  }

  /**
   * Retrieves all roles assigned to a user
   */
  async getUserRoles(userId: string, tenantId?: string): Promise<Role[]> {
    const effectiveTenantId = tenantId || await tenantUtils.getTenantId();
    if (!effectiveTenantId) {
      throw new Error('No tenant context available');
    }

    return await this.userRoleRepository.getUserRoles(userId, effectiveTenantId);
  }

  /**
   * Retrieves a user with all their assigned roles
   */
  async getUserWithRoles(userId: string, tenantId?: string): Promise<UserWithRoles | null> {
    const effectiveTenantId = tenantId || await tenantUtils.getTenantId();
    if (!effectiveTenantId) {
      throw new Error('No tenant context available');
    }

    return await this.userRoleRepository.getUserWithRoles(userId, effectiveTenantId);
  }

  /**
   * Retrieves all users assigned to a specific role
   */
  async getUsersWithRole(roleId: string, tenantId?: string): Promise<any[]> {
    const effectiveTenantId = tenantId || await tenantUtils.getTenantId();
    if (!effectiveTenantId) {
      throw new Error('No tenant context available');
    }

    return await this.userRoleRepository.getUsersWithRole(roleId, effectiveTenantId);
  }

  // ==================== PERMISSION METHODS ====================

  /**
   * Calculates and retrieves all effective permissions for a user
   * This aggregates permissions from all assigned roles and bundles
   */
  async getUserEffectivePermissions(userId: string, tenantId?: string): Promise<Permission[]> {
    const effectiveTenantId = tenantId || await tenantUtils.getTenantId();
    if (!effectiveTenantId) {
      throw new Error('No tenant context available');
    }

    // Get user's roles
    const userRoles = await this.userRoleRepository.getUserRoles(userId, effectiveTenantId);

    // Collect all permissions from roles
    const permissionMap = new Map<string, Permission>();

    for (const role of userRoles) {
      const roleWithPerms = await this.roleRepository.getRoleWithPermissions(role.id, effectiveTenantId);
      if (roleWithPerms?.permissions) {
        roleWithPerms.permissions.forEach(perm => {
          permissionMap.set(perm.id, perm);
        });
      }
    }

    return Array.from(permissionMap.values());
  }

  /**
   * Retrieves all permissions, optionally filtered by module
   */
  async getPermissions(tenantId?: string, module?: string): Promise<Permission[]> {
    const effectiveTenantId = tenantId || await tenantUtils.getTenantId();
    if (!effectiveTenantId) {
      throw new Error('No tenant context available');
    }

    return await this.permissionRepository.getPermissions(effectiveTenantId, module);
  }

  // ==================== MULTI-ROLE METHODS ====================

  /**
   * Retrieves all users in the tenant with their role assignments
   */
  async getUsers(tenantId?: string): Promise<any[]> {
    const effectiveTenantId = tenantId || await tenantUtils.getTenantId();
    if (!effectiveTenantId) {
      throw new Error('No tenant context available');
    }

    return await this.userRoleRepository.getUsers(effectiveTenantId);
  }

  /**
   * Retrieves all users with multiple role assignments
   */
  async getMultiRoleUsers(tenantId?: string): Promise<any[]> {
    const effectiveTenantId = tenantId || await tenantUtils.getTenantId();
    if (!effectiveTenantId) {
      throw new Error('No tenant context available');
    }

    return await this.userRoleRepository.getMultiRoleUsers(effectiveTenantId);
  }

  /**
   * Removes a specific role from a user
   */
  async removeUserRole(userId: string, roleId: string, tenantId?: string): Promise<any> {
    const effectiveTenantId = tenantId || await tenantUtils.getTenantId();
    if (!effectiveTenantId) {
      throw new Error('No tenant context available');
    }

    const result = await this.userRoleRepository.removeUserRole(userId, roleId, effectiveTenantId);

    // TODO: Log audit event when RbacAuditService is available
    // await this.auditService.logAuditEvent({
    //   tenant_id: effectiveTenantId,
    //   action: 'REMOVE_USER_ROLE',
    //   resource_type: 'user_role',
    //   resource_id: userId,
    //   old_values: { role_id: roleId },
    //   notes: `Removed role ${roleId} from user: ${userId}`
    // });

    return result;
  }

  /**
   * Assigns multiple roles to a user at once
   * Optionally analyzes and handles role conflicts
   */
  async assignMultipleRoles(
    userId: string,
    roleIds: string[],
    overrideConflicts = false,
    tenantId?: string
  ): Promise<any> {
    const effectiveTenantId = tenantId || await tenantUtils.getTenantId();
    if (!effectiveTenantId) {
      throw new Error('No tenant context available');
    }

    // Analyze conflicts if not overriding
    if (!overrideConflicts) {
      const conflicts = await this.analyzeRoleConflicts(roleIds);
      const highSeverityConflicts = conflicts.filter(c => c.severity === 'high');

      if (highSeverityConflicts.length > 0) {
        throw new Error(
          `High-severity role conflicts detected: ${highSeverityConflicts.map(c => c.description).join(', ')}`
        );
      }
    }

    const result = await this.userRoleRepository.assignMultipleRoles(userId, roleIds, effectiveTenantId);

    // TODO: Log audit event when RbacAuditService is available
    // await this.auditService.logAuditEvent({
    //   tenant_id: effectiveTenantId,
    //   action: 'ASSIGN_MULTIPLE_ROLES',
    //   resource_type: 'user_role',
    //   resource_id: userId,
    //   new_values: { role_ids: roleIds, override_conflicts: overrideConflicts },
    //   notes: `Assigned ${roleIds.length} roles to user: ${userId}`
    // });

    return result;
  }

  /**
   * Analyzes potential conflicts between multiple roles
   * Returns array of conflict descriptions with severity levels
   */
  async analyzeRoleConflicts(roleIds: string[]): Promise<any[]> {
    if (roleIds.length < 2) {
      return [];
    }

    const roles = await Promise.all(
      roleIds.map(id => this.roleRepository.getRole(id))
    );

    const conflicts = [];

    for (let i = 0; i < roles.length; i++) {
      for (let j = i + 1; j < roles.length; j++) {
        const role1 = roles[i];
        const role2 = roles[j];

        if (!role1 || !role2) continue;

        // Check scope conflicts
        if (
          role1.scope !== role2.scope &&
          (role1.scope === 'system' || role2.scope === 'system')
        ) {
          conflicts.push({
            role1,
            role2,
            conflict_type: 'scope_mismatch',
            severity: 'high',
            description: `System-level role conflicts with ${role1.scope === 'system' ? role2.scope : role1.scope} role`
          });
        }

        // Check for potential permission overlaps
        if (role1.scope === role2.scope && role1.scope !== 'ministry') {
          conflicts.push({
            role1,
            role2,
            conflict_type: 'permission_overlap',
            severity: 'medium',
            description: `Both roles operate in ${role1.scope} scope - review for redundancy`
          });
        }

        // Check delegation conflicts
        if (role1.is_delegatable && role2.is_delegatable && role1.scope !== role2.scope) {
          conflicts.push({
            role1,
            role2,
            conflict_type: 'access_escalation',
            severity: 'medium',
            description: 'Multiple delegatable roles may grant excessive privileges'
          });
        }
      }
    }

    return conflicts;
  }

  // ==================== ADDITIONAL METHODS ====================

  /**
   * Retrieves permissions grouped by module
   * Useful for permission bundle composition wizards
   */
  async getPermissionsByModule(tenantId?: string): Promise<Record<string, Permission[]>> {
    const permissions = await this.getPermissions(tenantId);
    const groupedPermissions: Record<string, Permission[]> = {};

    for (const permission of permissions) {
      if (!groupedPermissions[permission.module]) {
        groupedPermissions[permission.module] = [];
      }
      groupedPermissions[permission.module].push(permission);
    }

    return groupedPermissions;
  }

  /**
   * Validates the composition of a permission bundle
   * Checks for scope consistency and potential security issues
   */
  async validateBundleComposition(
    permissions: Permission[],
    scope: string
  ): Promise<{ isValid: boolean; warnings: string[] }> {
    const warnings: string[] = [];

    // Validate scope consistency
    const moduleScopes = new Set(permissions.map(p => p.module));
    if (moduleScopes.size > 3 && scope === 'campus') {
      warnings.push('Large number of modules may indicate overly broad campus access');
    }

    // Check for conflicting permissions
    const sensitiveModules = ['admin', 'financial', 'security'];
    const hasSensitivePerms = permissions.some(p => sensitiveModules.includes(p.module));
    if (hasSensitivePerms && scope !== 'tenant') {
      warnings.push('Sensitive permissions should typically be limited to tenant scope');
    }

    return {
      isValid: warnings.length === 0,
      warnings
    };
  }
}
