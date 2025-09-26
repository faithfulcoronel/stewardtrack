import 'server-only';
import { injectable, inject } from 'inversify';
import { TYPES } from '@/lib/types';
import { RbacRepository } from '@/repositories/rbac.repository';
import { tenantUtils } from '@/utils/tenantUtils';
import {
  Role,
  PermissionBundle,
  Permission,
  UserRole,
  MetadataSurface,
  RbacSurfaceBinding,
  FeatureCatalog,
  TenantFeatureGrant,
  RoleWithPermissions,
  BundleWithPermissions,
  UserWithRoles,
  CreateRoleDto,
  UpdateRoleDto,
  CreatePermissionBundleDto,
  UpdatePermissionBundleDto,
  AssignRoleDto,
  CreateSurfaceBindingDto,
  RbacAuditLog,
  DelegatedContext,
  MultiRoleContext
} from '@/models/rbac.model';

@injectable()
export class RbacService {
  constructor(
    @inject(TYPES.RbacRepository)
    private rbacRepository: RbacRepository
  ) {}

  // Role management
  async createRole(data: CreateRoleDto, tenantId?: string): Promise<Role> {
    const effectiveTenantId = tenantId || await tenantUtils.getTenantId();
    if (!effectiveTenantId) {
      throw new Error('No tenant context available');
    }

    const role = await this.rbacRepository.createRole(data, effectiveTenantId);

    // Log the action
    await this.logAuditEvent({
      tenant_id: effectiveTenantId,
      user_id: 'system', // This would come from auth context
      action: 'CREATE_ROLE',
      resource_type: 'role',
      resource_id: role.id,
      new_values: data
    });

    return role;
  }

  async updateRole(id: string, data: UpdateRoleDto, tenantId?: string): Promise<Role> {
    const effectiveTenantId = tenantId || await tenantUtils.getTenantId();
    if (!effectiveTenantId) {
      throw new Error('No tenant context available');
    }

    // Get old values for audit
    const oldRole = await this.rbacRepository.getRoleWithPermissions(id, effectiveTenantId);

    const role = await this.rbacRepository.updateRole(id, data, effectiveTenantId);

    // Log the action
    await this.logAuditEvent({
      tenant_id: effectiveTenantId,
      user_id: 'system',
      action: 'UPDATE_ROLE',
      resource_type: 'role',
      resource_id: role.id,
      old_values: oldRole,
      new_values: data
    });

    return role;
  }

  async deleteRole(id: string, tenantId?: string): Promise<void> {
    const effectiveTenantId = tenantId || await tenantUtils.getTenantId();
    if (!effectiveTenantId) {
      throw new Error('No tenant context available');
    }

    // Get role data for audit before deletion
    const role = await this.rbacRepository.getRoleWithPermissions(id, effectiveTenantId);

    await this.rbacRepository.deleteRole(id, effectiveTenantId);

    // Log the action
    await this.logAuditEvent({
      tenant_id: effectiveTenantId,
      user_id: 'system',
      action: 'DELETE_ROLE',
      resource_type: 'role',
      resource_id: id,
      old_values: role
    });
  }

  async getRoles(tenantId?: string, includeSystem = true): Promise<Role[]> {
    const effectiveTenantId = tenantId || await tenantUtils.getTenantId();
    if (!effectiveTenantId) {
      throw new Error('No tenant context available');
    }

    return await this.rbacRepository.getRoles(effectiveTenantId, includeSystem);
  }

  async getRoleWithPermissions(id: string, tenantId?: string): Promise<RoleWithPermissions | null> {
    const effectiveTenantId = tenantId || await tenantUtils.getTenantId();
    if (!effectiveTenantId) {
      throw new Error('No tenant context available');
    }

    return await this.rbacRepository.getRoleWithPermissions(id, effectiveTenantId);
  }

  // Permission Bundle management
  async createPermissionBundle(data: CreatePermissionBundleDto, tenantId?: string): Promise<PermissionBundle> {
    const effectiveTenantId = tenantId || await tenantUtils.getTenantId();
    if (!effectiveTenantId) {
      throw new Error('No tenant context available');
    }

    const bundle = await this.rbacRepository.createPermissionBundle(data, effectiveTenantId);

    // Log the action
    await this.logAuditEvent({
      tenant_id: effectiveTenantId,
      user_id: 'system',
      action: 'CREATE_BUNDLE',
      resource_type: 'permission_bundle',
      resource_id: bundle.id,
      new_values: data
    });

    return bundle;
  }

  async updatePermissionBundle(id: string, data: UpdatePermissionBundleDto, tenantId?: string): Promise<PermissionBundle> {
    const effectiveTenantId = tenantId || await tenantUtils.getTenantId();
    if (!effectiveTenantId) {
      throw new Error('No tenant context available');
    }

    const oldBundle = await this.rbacRepository.getBundleWithPermissions(id, effectiveTenantId);
    const bundle = await this.rbacRepository.updatePermissionBundle(id, data, effectiveTenantId);

    // Log the action
    await this.logAuditEvent({
      tenant_id: effectiveTenantId,
      user_id: 'system',
      action: 'UPDATE_BUNDLE',
      resource_type: 'permission_bundle',
      resource_id: bundle.id,
      old_values: oldBundle,
      new_values: data
    });

    return bundle;
  }

  async deletePermissionBundle(id: string, tenantId?: string): Promise<void> {
    const effectiveTenantId = tenantId || await tenantUtils.getTenantId();
    if (!effectiveTenantId) {
      throw new Error('No tenant context available');
    }

    const bundle = await this.rbacRepository.getBundleWithPermissions(id, effectiveTenantId);
    await this.rbacRepository.deletePermissionBundle(id, effectiveTenantId);

    // Log the action
    await this.logAuditEvent({
      tenant_id: effectiveTenantId,
      user_id: 'system',
      action: 'DELETE_BUNDLE',
      resource_type: 'permission_bundle',
      resource_id: id,
      old_values: bundle
    });
  }

  async getPermissionBundles(tenantId?: string, scopeFilter?: string): Promise<PermissionBundle[]> {
    const effectiveTenantId = tenantId || await tenantUtils.getTenantId();
    if (!effectiveTenantId) {
      throw new Error('No tenant context available');
    }

    return await this.rbacRepository.getPermissionBundles(effectiveTenantId, scopeFilter);
  }

  async getBundleWithPermissions(id: string, tenantId?: string): Promise<BundleWithPermissions | null> {
    const effectiveTenantId = tenantId || await tenantUtils.getTenantId();
    if (!effectiveTenantId) {
      throw new Error('No tenant context available');
    }

    return await this.rbacRepository.getBundleWithPermissions(id, effectiveTenantId);
  }

  async addPermissionsToBundle(bundleId: string, permissionIds: string[], tenantId?: string): Promise<void> {
    const effectiveTenantId = tenantId || await tenantUtils.getTenantId();
    if (!effectiveTenantId) {
      throw new Error('No tenant context available');
    }

    await this.rbacRepository.addPermissionsToBundle(bundleId, permissionIds, effectiveTenantId);

    // Log the action
    await this.logAuditEvent({
      tenant_id: effectiveTenantId,
      user_id: 'system',
      action: 'ADD_PERMISSIONS_TO_BUNDLE',
      resource_type: 'permission_bundle',
      resource_id: bundleId,
      new_values: { permission_ids: permissionIds }
    });
  }

  async removePermissionsFromBundle(bundleId: string, permissionIds: string[], tenantId?: string): Promise<void> {
    const effectiveTenantId = tenantId || await tenantUtils.getTenantId();
    if (!effectiveTenantId) {
      throw new Error('No tenant context available');
    }

    await this.rbacRepository.removePermissionsFromBundle(bundleId, permissionIds, effectiveTenantId);

    // Log the action
    await this.logAuditEvent({
      tenant_id: effectiveTenantId,
      user_id: 'system',
      action: 'REMOVE_PERMISSIONS_FROM_BUNDLE',
      resource_type: 'permission_bundle',
      resource_id: bundleId,
      old_values: { permission_ids: permissionIds }
    });
  }

  // User Role assignment
  async assignRole(data: AssignRoleDto, tenantId?: string, assignedBy?: string): Promise<UserRole> {
    const effectiveTenantId = tenantId || await tenantUtils.getTenantId();
    if (!effectiveTenantId) {
      throw new Error('No tenant context available');
    }

    const userRole = await this.rbacRepository.assignRole(data, effectiveTenantId, assignedBy);

    // Log the action
    await this.logAuditEvent({
      tenant_id: effectiveTenantId,
      user_id: assignedBy || 'system',
      action: 'ASSIGN_ROLE',
      resource_type: 'user_role',
      resource_id: userRole.id,
      new_values: data
    });

    return userRole;
  }

  async revokeRole(userId: string, roleId: string, tenantId?: string): Promise<void> {
    const effectiveTenantId = tenantId || await tenantUtils.getTenantId();
    if (!effectiveTenantId) {
      throw new Error('No tenant context available');
    }

    await this.rbacRepository.revokeRole(userId, roleId, effectiveTenantId);

    // Log the action
    await this.logAuditEvent({
      tenant_id: effectiveTenantId,
      user_id: 'system',
      action: 'REVOKE_ROLE',
      resource_type: 'user_role',
      resource_id: `${userId}-${roleId}`,
      old_values: { user_id: userId, role_id: roleId }
    });
  }

  async getUserRoles(userId: string, tenantId?: string): Promise<Role[]> {
    const effectiveTenantId = tenantId || await tenantUtils.getTenantId();
    if (!effectiveTenantId) {
      throw new Error('No tenant context available');
    }

    return await this.rbacRepository.getUserRoles(userId, effectiveTenantId);
  }

  async getUserWithRoles(userId: string, tenantId?: string): Promise<UserWithRoles | null> {
    const effectiveTenantId = tenantId || await tenantUtils.getTenantId();
    if (!effectiveTenantId) {
      throw new Error('No tenant context available');
    }

    return await this.rbacRepository.getUserWithRoles(userId, effectiveTenantId);
  }

  async getUserEffectivePermissions(userId: string, tenantId?: string): Promise<Permission[]> {
    const effectiveTenantId = tenantId || await tenantUtils.getTenantId();
    if (!effectiveTenantId) {
      throw new Error('No tenant context available');
    }

    return await this.rbacRepository.getUserEffectivePermissions(userId, effectiveTenantId);
  }

  // Permission management
  async getPermissions(tenantId?: string, module?: string): Promise<Permission[]> {
    const effectiveTenantId = tenantId || await tenantUtils.getTenantId();
    if (!effectiveTenantId) {
      throw new Error('No tenant context available');
    }

    return await this.rbacRepository.getPermissions(effectiveTenantId, module);
  }

  // Surface Binding management
  async createSurfaceBinding(data: CreateSurfaceBindingDto, tenantId?: string): Promise<RbacSurfaceBinding> {
    const effectiveTenantId = tenantId || await tenantUtils.getTenantId();
    if (!effectiveTenantId) {
      throw new Error('No tenant context available');
    }

    const binding = await this.rbacRepository.createSurfaceBinding(data, effectiveTenantId);

    // Log the action
    await this.logAuditEvent({
      tenant_id: effectiveTenantId,
      user_id: 'system',
      action: 'CREATE_SURFACE_BINDING',
      resource_type: 'rbac_surface_binding',
      resource_id: binding.id,
      new_values: data
    });

    return binding;
  }

  async updateSurfaceBinding(id: string, data: Partial<CreateSurfaceBindingDto>, tenantId?: string): Promise<RbacSurfaceBinding> {
    const effectiveTenantId = tenantId || await tenantUtils.getTenantId();
    if (!effectiveTenantId) {
      throw new Error('No tenant context available');
    }

    const binding = await this.rbacRepository.updateSurfaceBinding(id, data, effectiveTenantId);

    // Log the action
    await this.logAuditEvent({
      tenant_id: effectiveTenantId,
      user_id: 'system',
      action: 'UPDATE_SURFACE_BINDING',
      resource_type: 'rbac_surface_binding',
      resource_id: binding.id,
      new_values: data
    });

    return binding;
  }

  async deleteSurfaceBinding(id: string, tenantId?: string): Promise<void> {
    const effectiveTenantId = tenantId || await tenantUtils.getTenantId();
    if (!effectiveTenantId) {
      throw new Error('No tenant context available');
    }

    await this.rbacRepository.deleteSurfaceBinding(id, effectiveTenantId);

    // Log the action
    await this.logAuditEvent({
      tenant_id: effectiveTenantId,
      user_id: 'system',
      action: 'DELETE_SURFACE_BINDING',
      resource_type: 'rbac_surface_binding',
      resource_id: id
    });
  }

  async getSurfaceBindings(tenantId?: string): Promise<RbacSurfaceBinding[]> {
    const effectiveTenantId = tenantId || await tenantUtils.getTenantId();
    if (!effectiveTenantId) {
      throw new Error('No tenant context available');
    }

    return await this.rbacRepository.getSurfaceBindings(effectiveTenantId);
  }

  // Metadata Surface management
  async getMetadataSurfaces(): Promise<MetadataSurface[]> {
    return await this.rbacRepository.getMetadataSurfaces();
  }

  async getMetadataSurfacesByPhase(phase: string): Promise<MetadataSurface[]> {
    const surfaces = await this.getMetadataSurfaces();
    return surfaces.filter(surface => surface.phase === phase);
  }

  // Feature management
  async getFeatureCatalog(): Promise<FeatureCatalog[]> {
    return await this.rbacRepository.getFeatureCatalog();
  }

  async getTenantFeatureGrants(tenantId?: string): Promise<TenantFeatureGrant[]> {
    const effectiveTenantId = tenantId || await tenantUtils.getTenantId();
    if (!effectiveTenantId) {
      throw new Error('No tenant context available');
    }

    return await this.rbacRepository.getTenantFeatureGrants(effectiveTenantId);
  }

  async hasFeatureAccess(featureCode: string, tenantId?: string): Promise<boolean> {
    const effectiveTenantId = tenantId || await tenantUtils.getTenantId();
    if (!effectiveTenantId) {
      return false;
    }

    const grants = await this.getTenantFeatureGrants(effectiveTenantId);
    const now = new Date();

    return grants.some(grant => {
      const feature = (grant as any).feature;
      if (!feature || feature.code !== featureCode) return false;

      // Check if grant is active
      const startsAt = grant.starts_at ? new Date(grant.starts_at) : null;
      const expiresAt = grant.expires_at ? new Date(grant.expires_at) : null;

      if (startsAt && now < startsAt) return false;
      if (expiresAt && now > expiresAt) return false;

      return true;
    });
  }

  // Audit logging
  private async logAuditEvent(log: Omit<RbacAuditLog, 'id' | 'created_at'>): Promise<void> {
    try {
      await this.rbacRepository.createAuditLog(log);
    } catch (error) {
      console.error('Failed to log RBAC audit event:', error);
      // Don't throw - audit logging should not break the main operation
    }
  }

  async getAuditLogs(tenantId?: string, limit = 100, offset = 0): Promise<RbacAuditLog[]> {
    const effectiveTenantId = tenantId || await tenantUtils.getTenantId();
    if (!effectiveTenantId) {
      throw new Error('No tenant context available');
    }

    return await this.rbacRepository.getAuditLogs(effectiveTenantId, limit, offset);
  }

  // Delegated access
  async getDelegatedContext(userId: string, tenantId?: string): Promise<DelegatedContext | null> {
    const effectiveTenantId = tenantId || await tenantUtils.getTenantId();
    if (!effectiveTenantId) {
      throw new Error('No tenant context available');
    }

    return await this.rbacRepository.getDelegatedContext(userId, effectiveTenantId);
  }

  async getUsersInDelegatedScope(delegatedContext: DelegatedContext): Promise<UserWithRoles[]> {
    return await this.rbacRepository.getUsersInDelegatedScope(delegatedContext);
  }

  async canDelegateRole(userId: string, roleId: string, tenantId?: string): Promise<boolean> {
    const effectiveTenantId = tenantId || await tenantUtils.getTenantId();
    if (!effectiveTenantId) {
      return false;
    }

    const userRoles = await this.getUserRoles(userId, effectiveTenantId);
    const targetRole = await this.getRoleWithPermissions(roleId, effectiveTenantId);

    if (!targetRole || !targetRole.is_delegatable) {
      return false;
    }

    // Check if user has delegation permissions for this scope
    const delegatedContext = await this.getDelegatedContext(userId, effectiveTenantId);

    return delegatedContext && delegatedContext.allowed_roles.includes(roleId);
  }

  // Multi-role support
  async getUserMultiRoleContext(userId: string, tenantId?: string): Promise<MultiRoleContext | null> {
    const effectiveTenantId = tenantId || await tenantUtils.getTenantId();
    if (!effectiveTenantId) {
      throw new Error('No tenant context available');
    }

    const context = await this.rbacRepository.getUserMultiRoleContext(userId, effectiveTenantId);

    if (!context) return null;

    return {
      user_id: userId,
      tenant_id: effectiveTenantId,
      role_keys: context.role_keys || [],
      bundle_keys: context.bundle_keys || [],
      effective_permissions: context.effective_permissions || [],
      feature_grants: context.feature_grants || []
    };
  }

  // Metadata-driven role/bundle resolution
  async resolveMetadataKeys(userId: string, tenantId?: string): Promise<string[]> {
    const effectiveTenantId = tenantId || await tenantUtils.getTenantId();
    if (!effectiveTenantId) {
      return [];
    }

    const roles = await this.getUserRoles(userId, effectiveTenantId);
    const metadataKeys: string[] = [];

    for (const role of roles) {
      if (role.metadata_key) {
        metadataKeys.push(role.metadata_key);
      }
    }

    return metadataKeys;
  }

  // Bundle composition wizard support
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

  async validateBundleComposition(permissions: Permission[], scope: string): Promise<{ isValid: boolean; warnings: string[] }> {
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