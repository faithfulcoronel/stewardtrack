import 'server-only';
import { injectable, inject } from 'inversify';
import { TYPES } from '@/lib/types';
import { RbacRepository } from '@/repositories/rbac.repository';
import { tenantUtils } from '@/utils/tenantUtils';
import type {
  PublishingJobSnapshot,
  PublishingStatsSnapshot,
  QueuePublishingJobResult,
  TenantPublishingStatusSnapshot
} from '@/lib/rbac/publishing-store';
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
  CreateRbacAuditLogInput,
  RbacAuditOperation,
  DelegatedContext,
  MultiRoleContext
} from '@/models/rbac.model';

@injectable()
export class RbacService {
  constructor(
    @inject(TYPES.RbacRepository)
    private rbacRepository: RbacRepository
  ) {}

  private async resolveTenantId(tenantId?: string): Promise<string> {
    const resolved = tenantId ?? (await tenantUtils.getTenantId());
    return resolved ?? 'mock-tenant';
  }

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

    const existingBinding = await this.rbacRepository.getSurfaceBinding(id, effectiveTenantId);
    if (!existingBinding) {
      throw new Error('Surface binding not found');
    }

    const binding = await this.rbacRepository.updateSurfaceBinding(id, data, effectiveTenantId);

    // Log the action
    await this.logAuditEvent({
      tenant_id: effectiveTenantId,
      user_id: 'system',
      action: 'UPDATE_SURFACE_BINDING',
      resource_type: 'rbac_surface_binding',
      resource_id: binding.id,
      old_values: existingBinding,
      new_values: binding,
      notes: `Updated surface binding ${id} for tenant ${effectiveTenantId}`
    });

    return binding;
  }

  async deleteSurfaceBinding(id: string, tenantId?: string): Promise<void> {
    const effectiveTenantId = tenantId || await tenantUtils.getTenantId();
    if (!effectiveTenantId) {
      throw new Error('No tenant context available');
    }

    const binding = await this.rbacRepository.getSurfaceBinding(id, effectiveTenantId);
    if (!binding) {
      throw new Error('Surface binding not found');
    }

    await this.rbacRepository.deleteSurfaceBinding(id, effectiveTenantId);

    // Log the action
    await this.logAuditEvent({
      tenant_id: effectiveTenantId,
      user_id: 'system',
      action: 'DELETE_SURFACE_BINDING',
      resource_type: 'rbac_surface_binding',
      resource_id: id,
      old_values: binding,
      notes: `Deleted surface binding ${id} for tenant ${effectiveTenantId}`
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
  async getMetadataSurfaces(
    filters?: {
      module?: string;
      phase?: string;
      surface_type?: string;
    },
    tenantId?: string
  ): Promise<MetadataSurface[]> {
    const effectiveTenantId = await this.resolveTenantId(tenantId);
    return await this.rbacRepository.getMetadataSurfaces(effectiveTenantId, filters);
  }

  async getMetadataSurfacesByPhase(phase: string, tenantId?: string): Promise<MetadataSurface[]> {
    return await this.getMetadataSurfaces({ phase }, tenantId);
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
  private async logAuditEvent(log: {
    tenant_id: string;
    user_id?: string;
    action: string;
    resource_type: string;
    resource_id?: string;
    old_values?: Record<string, unknown>;
    new_values?: Record<string, unknown>;
    ip_address?: string;
    user_agent?: string;
    notes?: string;
  }): Promise<void> {
    try {
      const payload = this.buildAuditLogPayload(log);
      await this.rbacRepository.createAuditLog(payload);
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
    const resolvedTenantId = await this.resolveTenantId(tenantId);

    return await this.rbacRepository.getDelegatedContext(userId, resolvedTenantId);
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

  private buildAuditLogPayload(log: {
    tenant_id: string;
    user_id?: string;
    action: string;
    resource_type: string;
    resource_id?: string;
    old_values?: Record<string, unknown>;
    new_values?: Record<string, unknown>;
    ip_address?: string;
    user_agent?: string;
    notes?: string;
  }): CreateRbacAuditLogInput {
    const actionLabel = log.action;
    const normalizedAction = actionLabel?.toUpperCase() ?? '';
    const operation = this.mapActionToOperation(normalizedAction);
    const tableName = this.mapResourceToTableName(log.resource_type);
    const resourceIdentifier = log.resource_id ?? null;
    const recordId = this.tryNormalizeUuid(resourceIdentifier);
    const userId = this.tryNormalizeUuid(log.user_id);

    return {
      tenant_id: log.tenant_id,
      table_name: tableName,
      operation,
      record_id: recordId,
      resource_identifier: resourceIdentifier,
      old_values: log.old_values ?? null,
      new_values: log.new_values ?? null,
      user_id: userId,
      ip_address: log.ip_address ?? null,
      user_agent: log.user_agent ?? null,
      security_impact: this.deriveSecurityImpact(normalizedAction),
      action_label: actionLabel,
      notes: log.notes ?? null
    };
  }

  private mapActionToOperation(action: string): RbacAuditOperation {
    const normalized = (action ?? '').toUpperCase();

    if (normalized.startsWith('CREATE')) return 'CREATE';
    if (normalized.startsWith('UPDATE')) return 'UPDATE';
    if (normalized.startsWith('DELETE')) return 'DELETE';
    if (normalized.startsWith('ASSIGN') || normalized.startsWith('GRANT') || normalized.startsWith('ADD')) {
      return 'GRANT';
    }
    if (normalized.startsWith('REVOKE') || normalized.startsWith('REMOVE')) {
      return 'REVOKE';
    }
    if (normalized.startsWith('LOGIN')) return 'LOGIN';
    if (normalized.startsWith('LOGOUT')) return 'LOGOUT';
    if (normalized.startsWith('ACCESS')) return 'ACCESS';
    if (normalized.startsWith('REFRESH')) return 'REFRESH';
    if (normalized.startsWith('ERROR')) return 'ERROR';

    return 'SYSTEM';
  }

  private mapResourceToTableName(resourceType: string): string {
    const normalized = resourceType.toLowerCase();

    switch (normalized) {
      case 'role':
        return 'roles';
      case 'permission_bundle':
        return 'permission_bundles';
      case 'user_role':
        return 'user_roles';
      case 'rbac_surface_binding':
        return 'rbac_surface_bindings';
      default:
        return resourceType;
    }
  }

  private deriveSecurityImpact(action: string): string {
    const normalized = (action ?? '').toUpperCase();

    if (normalized.includes('PERMISSION') || normalized.includes('ROLE')) {
      if (normalized.startsWith('DELETE') || normalized.startsWith('REVOKE') || normalized.startsWith('REMOVE')) {
        return 'high';
      }
      if (normalized.startsWith('ASSIGN') || normalized.startsWith('GRANT') || normalized.startsWith('ADD')) {
        return 'high';
      }
      return 'medium';
    }

    if (normalized.startsWith('DELETE')) {
      return 'high';
    }

    if (normalized.startsWith('CREATE') || normalized.startsWith('UPDATE')) {
      return 'medium';
    }

    return 'low';
  }

  private tryNormalizeUuid(value?: string | null): string | null {
    if (!value) {
      return null;
    }

    const trimmed = value.trim();
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(trimmed) ? trimmed : null;
  }

  // Statistics methods
  async getRoleStatistics(tenantId?: string, includeSystem = true): Promise<Role[]> {
    const effectiveTenantId = tenantId || await tenantUtils.getTenantId();
    if (!effectiveTenantId) {
      throw new Error('No tenant context available');
    }

    return await this.rbacRepository.getRoleStatistics(effectiveTenantId, includeSystem);
  }

  async getBundleStatistics(tenantId?: string, scopeFilter?: string): Promise<PermissionBundle[]> {
    const effectiveTenantId = tenantId || await tenantUtils.getTenantId();
    if (!effectiveTenantId) {
      throw new Error('No tenant context available');
    }

    return await this.rbacRepository.getBundleStatistics(effectiveTenantId, scopeFilter);
  }

  async getDashboardStatistics(tenantId?: string): Promise<{
    totalRoles: number;
    totalBundles: number;
    totalUsers: number;
    activeUsers: number;
    surfaceBindings: number;
    systemRoles: number;
    customBundles: number;
    recentChanges: number;
    pendingApprovals: number;
  }> {
    const effectiveTenantId = tenantId || await tenantUtils.getTenantId();
    if (!effectiveTenantId) {
      throw new Error('No tenant context available');
    }

    const baseStats = await this.rbacRepository.getDashboardStatistics(effectiveTenantId);

    // Get recent changes count from audit logs
    const recentLogs = await this.rbacRepository.getAuditLogs(effectiveTenantId, 100, 0);
    const recentChanges = recentLogs.length;

    // Get pending approvals (would need to be implemented based on workflow)
    const pendingApprovals = 0; // Placeholder for future approval workflow

    return {
      ...baseStats,
      recentChanges,
      pendingApprovals
    };
  }

  async createMetadataSurface(data: {
    module: string;
    route?: string;
    blueprint_path: string;
    surface_type: string;
    phase: string;
    title?: string;
    description?: string;
    feature_code?: string;
    rbac_role_keys?: string[];
    rbac_bundle_keys?: string[];
    default_menu_code?: string;
    supports_mobile: boolean;
    supports_desktop: boolean;
    is_system: boolean;
  }): Promise<MetadataSurface> {
    const surface = await this.rbacRepository.createMetadataSurface(data);

    // Log the action
    await this.logAuditEvent({
      tenant_id: 'system', // Metadata surfaces are typically system-level
      action: 'CREATE_METADATA_SURFACE',
      resource_type: 'metadata_surface',
      resource_id: surface.id,
      new_values: data,
      notes: `Created metadata surface: ${data.title || data.blueprint_path}`
    });

    return surface;
  }

  async getFeatures(filters?: {
    category?: string;
    phase?: string;
    is_active?: boolean;
  }): Promise<FeatureCatalog[]> {
    return await this.rbacRepository.getFeatures(filters);
  }

  async createFeature(data: {
    code: string;
    name: string;
    category: string;
    description?: string;
    phase: string;
    is_delegatable: boolean;
    is_active: boolean;
  }): Promise<FeatureCatalog> {
    const feature = await this.rbacRepository.createFeature(data);

    // Log the action
    await this.logAuditEvent({
      tenant_id: 'system', // Features are system-level
      action: 'CREATE_FEATURE',
      resource_type: 'feature_catalog',
      resource_id: feature.id,
      new_values: data,
      notes: `Created feature: ${data.name} (${data.code})`
    });

    return feature;
  }

  // Phase D - Delegated Console Methods
  async getDelegationScopes(userId: string, tenantId?: string): Promise<any[]> {
    const resolvedTenantId = await this.resolveTenantId(tenantId);

    const delegatedContext = await this.getDelegatedContext(userId, resolvedTenantId);
    if (!delegatedContext) {
      return [];
    }

    return await this.rbacRepository.getDelegationScopes(delegatedContext);
  }

  async getDelegatedUsers(userId: string, tenantId?: string): Promise<any[]> {
    const resolvedTenantId = await this.resolveTenantId(tenantId);

    const delegatedContext = await this.getDelegatedContext(userId, resolvedTenantId);
    if (!delegatedContext) {
      return [];
    }

    return await this.rbacRepository.getDelegatedUsers(delegatedContext);
  }

  async getDelegationRoles(userId: string, tenantId?: string): Promise<Role[]> {
    const resolvedTenantId = await this.resolveTenantId(tenantId);

    const delegatedContext = await this.getDelegatedContext(userId, resolvedTenantId);
    if (!delegatedContext) {
      return [];
    }

    return await this.rbacRepository.getDelegationRoles(delegatedContext);
  }

  async getDelegationStats(userId: string, tenantId?: string): Promise<{
    totalUsers: number;
    activeUsers: number;
    totalRoles: number;
    delegatableRoles: number;
    scopeCount: number;
    recentChanges: number;
  }> {
    const resolvedTenantId = await this.resolveTenantId(tenantId);

    const delegatedContext = await this.getDelegatedContext(userId, resolvedTenantId);
    if (!delegatedContext) {
      return {
        totalUsers: 0,
        activeUsers: 0,
        totalRoles: 0,
        delegatableRoles: 0,
        scopeCount: 0,
        recentChanges: 0
      };
    }

    return await this.rbacRepository.getDelegationStats(delegatedContext);
  }

  async assignDelegatedRole(delegatorId: string, payload: { user_id: string; role_id: string; scope_id?: string }, tenantId?: string): Promise<{ success: boolean; assignment: Partial<UserRole> & { scope_id?: string | null } }> {
    const resolvedTenantId = await this.resolveTenantId(tenantId);

    const delegatedContext = await this.getDelegatedContext(delegatorId, resolvedTenantId);
    if (!delegatedContext) {
      throw new Error('No delegation permissions found');
    }

    if (!delegatedContext.allowed_roles.includes(payload.role_id)) {
      throw new Error('Role is not delegatable for this context');
    }

    const result = await this.rbacRepository.assignDelegatedRole({
      delegatorId,
      delegateeId: payload.user_id,
      roleId: payload.role_id,
      scopeId: payload.scope_id,
      context: delegatedContext
    });

    await this.logAuditEvent({
      tenant_id: resolvedTenantId,
      user_id: delegatorId,
      action: 'ASSIGN_DELEGATED_ROLE',
      resource_type: 'user_role',
      resource_id: payload.user_id,
      new_values: { role_id: payload.role_id, scope_id: payload.scope_id },
      notes: 'Delegated role ' + payload.role_id + ' to ' + payload.user_id
    });

    return result;
  }

  async revokeDelegatedRole(delegatorId: string, payload: { user_id: string; role_id: string }, tenantId?: string): Promise<{ success: boolean }> {
    const resolvedTenantId = await this.resolveTenantId(tenantId);

    const delegatedContext = await this.getDelegatedContext(delegatorId, resolvedTenantId);
    if (!delegatedContext) {
      throw new Error('No delegation permissions found');
    }

    const result = await this.rbacRepository.revokeDelegatedRole({
      delegatorId,
      delegateeId: payload.user_id,
      roleId: payload.role_id,
      context: delegatedContext
    });

    await this.logAuditEvent({
      tenant_id: resolvedTenantId,
      user_id: delegatorId,
      action: 'REVOKE_DELEGATED_ROLE',
      resource_type: 'user_role',
      resource_id: payload.user_id,
      old_values: { role_id: payload.role_id },
      notes: 'Revoked delegated role ' + payload.role_id + ' from ' + payload.user_id
    });

    return result;
  }

  // Multi-Role Assignment Methods
  async getMultiRoleUsers(tenantId?: string): Promise<any[]> {
    const effectiveTenantId = tenantId || await tenantUtils.getTenantId();
    if (!effectiveTenantId) {
      throw new Error('No tenant context available');
    }

    return await this.rbacRepository.getMultiRoleUsers(effectiveTenantId);
  }

  async removeUserRole(userId: string, roleId: string, tenantId?: string): Promise<any> {
    const effectiveTenantId = tenantId || await tenantUtils.getTenantId();
    if (!effectiveTenantId) {
      throw new Error('No tenant context available');
    }

    const result = await this.rbacRepository.removeUserRole(userId, roleId, effectiveTenantId);

    // Log the action
    await this.logAuditEvent({
      tenant_id: effectiveTenantId,
      action: 'REMOVE_USER_ROLE',
      resource_type: 'user_role',
      resource_id: userId,
      old_values: { role_id: roleId },
      notes: `Removed role ${roleId} from user: ${userId}`
    });

    return result;
  }

  async assignMultipleRoles(userId: string, roleIds: string[], overrideConflicts = false, tenantId?: string): Promise<any> {
    const effectiveTenantId = tenantId || await tenantUtils.getTenantId();
    if (!effectiveTenantId) {
      throw new Error('No tenant context available');
    }

    // Analyze conflicts if not overriding
    if (!overrideConflicts) {
      const conflicts = await this.analyzeRoleConflicts(roleIds);
      const highSeverityConflicts = conflicts.filter(c => c.severity === 'high');

      if (highSeverityConflicts.length > 0) {
        throw new Error(`High-severity role conflicts detected: ${highSeverityConflicts.map(c => c.description).join(', ')}`);
      }
    }

    const result = await this.rbacRepository.assignMultipleRoles(userId, roleIds, effectiveTenantId);

    // Log the action
    await this.logAuditEvent({
      tenant_id: effectiveTenantId,
      action: 'ASSIGN_MULTIPLE_ROLES',
      resource_type: 'user_role',
      resource_id: userId,
      new_values: { role_ids: roleIds, override_conflicts: overrideConflicts },
      notes: `Assigned ${roleIds.length} roles to user: ${userId}`
    });

    return result;
  }

  async analyzeRoleConflicts(roleIds: string[]): Promise<any[]> {
    if (roleIds.length < 2) {
      return [];
    }

    const roles = await Promise.all(
      roleIds.map(id => this.rbacRepository.getRole(id))
    );

    const conflicts = [];

    for (let i = 0; i < roles.length; i++) {
      for (let j = i + 1; j < roles.length; j++) {
        const role1 = roles[i];
        const role2 = roles[j];

        if (!role1 || !role2) continue;

        // Check scope conflicts
        if (role1.scope !== role2.scope &&
            (role1.scope === 'system' || role2.scope === 'system')) {
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

  // Delegation permission management
  async getDelegationPermissions(tenantId?: string): Promise<any[]> {
    const resolvedTenantId = await this.resolveTenantId(tenantId);

    return await this.rbacRepository.getDelegationPermissions(resolvedTenantId);
  }

  async createDelegationPermission(permissionData: any, tenantId?: string): Promise<any> {
    const resolvedTenantId = await this.resolveTenantId(tenantId);

    return await this.rbacRepository.createDelegationPermission(permissionData, resolvedTenantId);
  }

  async updateDelegationPermission(id: string, permissionData: any, tenantId?: string): Promise<any> {
    const resolvedTenantId = await this.resolveTenantId(tenantId);

    return await this.rbacRepository.updateDelegationPermission(id, permissionData, resolvedTenantId);
  }

  async revokeDelegationPermission(id: string, tenantId?: string): Promise<void> {
    const resolvedTenantId = await this.resolveTenantId(tenantId);

    return await this.rbacRepository.revokeDelegationPermission(id, resolvedTenantId);
  }

  async getPermissionTemplates(tenantId?: string): Promise<any[]> {
    const resolvedTenantId = await this.resolveTenantId(tenantId);

    return await this.rbacRepository.getPermissionTemplates(resolvedTenantId);
  }

  async getUsers(tenantId?: string): Promise<any[]> {
    const resolvedTenantId = await this.resolveTenantId(tenantId);

    return await this.rbacRepository.getUsers(resolvedTenantId);
  }

  // Phase E - Operational Dashboards & Automation

  // RBAC Health Metrics
  async getRbacHealthMetrics(tenantId?: string): Promise<any> {
    const resolvedTenantId = await this.resolveTenantId(tenantId);

    return await this.rbacRepository.getRbacHealthMetrics(resolvedTenantId);
  }

  // Materialized View Monitoring
  async getMaterializedViewStatus(tenantId?: string): Promise<any> {
    const resolvedTenantId = await this.resolveTenantId(tenantId);

    const status = await this.rbacRepository.getMaterializedViewStatus(resolvedTenantId);

    // Log access to materialized view monitoring (only if we have a valid tenant context)
    if (resolvedTenantId && resolvedTenantId !== 'unknown') {
      // Using fire-and-forget pattern for audit logging to avoid blocking the response
      this.logAuditEvent({
        tenant_id: resolvedTenantId,
        user_id: 'system',
        action: 'VIEW_MATERIALIZED_STATUS',
        resource_type: 'materialized_view',
        security_impact: 'low',
        notes: 'Platform engineer accessed materialized view status monitoring'
      }).catch(error => {
        console.warn('Audit logging failed for materialized view access:', error.message);
      });
    }

    return status;
  }

  async refreshMaterializedViews(tenantId?: string): Promise<any> {
    const resolvedTenantId = await this.resolveTenantId(tenantId);

    const startTime = new Date();

    try {
      const result = await this.rbacRepository.refreshMaterializedViews(resolvedTenantId);

      // Log successful refresh
      await this.logAuditEvent({
        tenant_id: resolvedTenantId,
        user_id: 'system',
        action: 'REFRESH_MATERIALIZED_VIEWS',
        resource_type: 'materialized_view',
        security_impact: 'medium',
        new_values: {
          start_time: startTime,
          duration_ms: Date.now() - startTime.getTime(),
          status: 'success'
        },
        notes: 'Manual materialized view refresh initiated by platform engineer'
      });

      return result;
    } catch (error) {
      // Log failed refresh
      await this.logAuditEvent({
        tenant_id: resolvedTenantId,
        user_id: 'system',
        action: 'REFRESH_MATERIALIZED_VIEWS_FAILED',
        resource_type: 'materialized_view',
        security_impact: 'high',
        new_values: {
          start_time: startTime,
          error: error instanceof Error ? error.message : 'Unknown error',
          status: 'failed'
        },
        notes: 'Materialized view refresh failed - requires investigation'
      });

      throw error;
    }
  }

  // Metadata Publishing Controls
  async getPublishingJobs(tenantId?: string): Promise<PublishingJobSnapshot[]> {
    const resolvedTenantId = await this.resolveTenantId(tenantId);
    return this.rbacRepository.getPublishingJobs(resolvedTenantId);
  }

  async getPublishingStats(tenantId?: string): Promise<PublishingStatsSnapshot> {
    const resolvedTenantId = await this.resolveTenantId(tenantId);
    return this.rbacRepository.getPublishingStats(resolvedTenantId);
  }

  async getTenantPublishingStatuses(tenantId?: string): Promise<TenantPublishingStatusSnapshot[]> {
    const resolvedTenantId = await this.resolveTenantId(tenantId);
    return this.rbacRepository.getTenantPublishingStatuses(resolvedTenantId);
  }

  async queueMetadataCompilationJob(tenantId?: string): Promise<QueuePublishingJobResult> {
    const resolvedTenantId = await this.resolveTenantId(tenantId);
    const result = await this.rbacRepository.queueMetadataCompilationJob(resolvedTenantId);

    await this.logAuditEvent({
      tenant_id: resolvedTenantId,
      user_id: 'system',
      action: 'QUEUE_METADATA_COMPILATION',
      resource_type: 'metadata_publishing',
      security_impact: 'medium',
      new_values: {
        job_id: result.job.id,
        job_type: result.job.type,
        entity_count: result.job.metadata.entity_count,
        status: 'queued',
      },
      notes: 'Metadata compilation job queued via publishing controls',
    });

    return result;
  }

  async queuePermissionSyncJob(tenantId?: string): Promise<PublishingJobSnapshot> {
    const resolvedTenantId = await this.resolveTenantId(tenantId);
    const job = await this.rbacRepository.queuePermissionSyncJob(resolvedTenantId);

    await this.logAuditEvent({
      tenant_id: resolvedTenantId,
      user_id: 'system',
      action: 'QUEUE_PERMISSION_SYNC',
      resource_type: 'metadata_publishing',
      security_impact: 'medium',
      new_values: {
        job_id: job.id,
        status: 'queued',
      },
      notes: 'Permission sync job queued via publishing controls',
    });

    return job;
  }

  async queueLicenseValidationJob(tenantId?: string): Promise<PublishingJobSnapshot> {
    const resolvedTenantId = await this.resolveTenantId(tenantId);
    const job = await this.rbacRepository.queueLicenseValidationJob(resolvedTenantId);

    await this.logAuditEvent({
      tenant_id: resolvedTenantId,
      user_id: 'system',
      action: 'QUEUE_LICENSE_VALIDATION',
      resource_type: 'metadata_publishing',
      security_impact: 'low',
      new_values: {
        job_id: job.id,
        status: 'queued',
      },
      notes: 'License validation job queued via publishing controls',
    });

    return job;
  }

  async cancelPublishingJob(jobId: string, tenantId?: string): Promise<PublishingJobSnapshot> {
    const resolvedTenantId = await this.resolveTenantId(tenantId);
    const job = await this.rbacRepository.cancelPublishingJob(jobId, resolvedTenantId);

    await this.logAuditEvent({
      tenant_id: resolvedTenantId,
      user_id: 'system',
      action: 'CANCEL_PUBLISHING_JOB',
      resource_type: 'metadata_publishing',
      security_impact: 'medium',
      new_values: {
        job_id: job.id,
        status: job.status,
      },
      notes: 'Publishing job cancelled via publishing controls',
    });

    return job;
  }
  async getMetadataPublishingStatus(tenantId?: string): Promise<any> {
    const resolvedTenantId = await this.resolveTenantId(tenantId);

    const status = await this.rbacRepository.getMetadataPublishingStatus(resolvedTenantId);

    // Log access to publishing dashboard
    await this.logAuditEvent({
      tenant_id: resolvedTenantId,
      user_id: 'system',
      action: 'VIEW_PUBLISHING_STATUS',
      resource_type: 'metadata_publishing',
      security_impact: 'low',
      notes: 'Release manager accessed metadata publishing dashboard'
    });

    return status;
  }

  async compileMetadata(tenantId?: string, metadata?: any): Promise<any> {
    const resolvedTenantId = await this.resolveTenantId(tenantId);

    const startTime = new Date();

    try {
      const result = await this.rbacRepository.compileMetadata(resolvedTenantId, metadata);

      // Log successful compilation
      await this.logAuditEvent({
        tenant_id: resolvedTenantId,
        user_id: 'system',
        action: 'COMPILE_METADATA',
        resource_type: 'metadata_compilation',
        security_impact: 'medium',
        new_values: {
          start_time: startTime,
          duration_ms: Date.now() - startTime.getTime(),
          status: 'success',
          metadata_keys: metadata?.keys || []
        },
        notes: 'Metadata compilation completed successfully'
      });

      return result;
    } catch (error) {
      // Log failed compilation
      await this.logAuditEvent({
        tenant_id: resolvedTenantId,
        user_id: 'system',
        action: 'COMPILE_METADATA_FAILED',
        resource_type: 'metadata_compilation',
        security_impact: 'high',
        new_values: {
          start_time: startTime,
          error: error instanceof Error ? error.message : 'Unknown error',
          status: 'failed'
        },
        notes: 'Metadata compilation failed - requires investigation'
      });

      throw error;
    }
  }

  async validateMetadata(tenantId?: string, metadata?: any): Promise<any> {
    const resolvedTenantId = await this.resolveTenantId(tenantId);

    const result = await this.rbacRepository.validateMetadata(resolvedTenantId, metadata);

    // Log validation activity
    await this.logAuditEvent({
      tenant_id: resolvedTenantId,
      user_id: 'system',
      action: 'VALIDATE_METADATA',
      resource_type: 'metadata_validation',
      security_impact: 'low',
      new_values: {
        validation_status: result.isValid ? 'success' : 'failed',
        errors: result.errors || [],
        warnings: result.warnings || []
      },
      notes: `Metadata validation ${result.isValid ? 'passed' : 'failed'} with ${result.errors?.length || 0} errors`
    });

    return result;
  }

  async publishMetadata(tenantId?: string, metadata?: any): Promise<any> {
    const resolvedTenantId = await this.resolveTenantId(tenantId);

    const startTime = new Date();

    try {
      const result = await this.rbacRepository.publishMetadata(resolvedTenantId, metadata);

      // Log successful publishing
      await this.logAuditEvent({
        tenant_id: resolvedTenantId,
        user_id: 'system',
        action: 'PUBLISH_METADATA',
        resource_type: 'metadata_publishing',
        security_impact: 'high',
        new_values: {
          start_time: startTime,
          duration_ms: Date.now() - startTime.getTime(),
          status: 'success',
          published_surfaces: result.publishedSurfaces || [],
          deployment_id: result.deploymentId
        },
        notes: 'Metadata published successfully - system updated with new RBAC configuration'
      });

      return result;
    } catch (error) {
      // Log failed publishing
      await this.logAuditEvent({
        tenant_id: resolvedTenantId,
        user_id: 'system',
        action: 'PUBLISH_METADATA_FAILED',
        resource_type: 'metadata_publishing',
        security_impact: 'critical',
        new_values: {
          start_time: startTime,
          error: error instanceof Error ? error.message : 'Unknown error',
          status: 'failed'
        },
        notes: 'Metadata publishing failed - system may be in inconsistent state'
      });

      throw error;
    }
  }

  // Enhanced Compliance Features
  async getAuditTimelineForCompliance(tenantId?: string, options?: {
    startDate?: string;
    endDate?: string;
    userId?: string;
    impactLevels?: string[];
    resourceTypes?: string[];
  }): Promise<any> {
    const resolvedTenantId = await this.resolveTenantId(tenantId);

    const timeline = await this.rbacRepository.getAuditTimelineForCompliance(resolvedTenantId, options);

    // Log compliance audit access
    await this.logAuditEvent({
      tenant_id: resolvedTenantId,
      user_id: 'system',
      action: 'ACCESS_COMPLIANCE_AUDIT',
      resource_type: 'audit_timeline',
      security_impact: 'low',
      new_values: {
        search_criteria: options,
        results_count: timeline.length
      },
      notes: 'Compliance officer accessed audit timeline for review'
    });

    return timeline;
  }

  async generateComplianceReport(tenantId?: string, reportType: string = 'access_review'): Promise<any> {
    const resolvedTenantId = await this.resolveTenantId(tenantId);

    const report = await this.rbacRepository.generateComplianceReport(resolvedTenantId, reportType);

    // Log compliance report generation
    await this.logAuditEvent({
      tenant_id: resolvedTenantId,
      user_id: 'system',
      action: 'GENERATE_COMPLIANCE_REPORT',
      resource_type: 'compliance_report',
      security_impact: 'medium',
      new_values: {
        report_type: reportType,
        generated_at: new Date(),
        report_id: report.id
      },
      notes: `Generated ${reportType} compliance report for audit purposes`
    });

    return report;
  }
}
















