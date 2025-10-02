import 'server-only';
import { injectable, inject } from 'inversify';
import { TYPES } from '@/lib/types';
import type { IMetadataSurfaceRepository } from '@/repositories/metadataSurface.repository';
import type { ISurfaceBindingRepository } from '@/repositories/surfaceBinding.repository';
import type { IPermissionRepository } from '@/repositories/permission.repository';
import { tenantUtils } from '@/utils/tenantUtils';
import type {
  MetadataSurface,
  RbacSurfaceBinding,
  Permission,
  CreateSurfaceBindingDto,
  CreateRbacAuditLogInput,
  RbacAuditOperation
} from '@/models/rbac.model';

@injectable()
export class RbacMetadataService {
  constructor(
    @inject(TYPES.IMetadataSurfaceRepository)
    private metadataSurfaceRepository: IMetadataSurfaceRepository,
    @inject(TYPES.ISurfaceBindingRepository)
    private surfaceBindingRepository: ISurfaceBindingRepository,
    @inject(TYPES.IPermissionRepository)
    private permissionRepository: IPermissionRepository
  ) {}

  private async resolveTenantId(tenantId?: string): Promise<string> {
    const resolved = tenantId ?? (await tenantUtils.getTenantId());
    return resolved ?? '550e8400-e29b-41d4-a716-446655440000'; // Valid UUID fallback for testing
  }

  // Surface Binding Management
  async createSurfaceBinding(data: CreateSurfaceBindingDto, tenantId?: string): Promise<RbacSurfaceBinding> {
    const effectiveTenantId = tenantId || await tenantUtils.getTenantId();
    if (!effectiveTenantId) {
      throw new Error('No tenant context available');
    }

    const binding = await this.surfaceBindingRepository.createSurfaceBinding(data, effectiveTenantId);

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

    const existingBinding = await this.surfaceBindingRepository.getSurfaceBinding(id, effectiveTenantId);
    if (!existingBinding) {
      throw new Error('Surface binding not found');
    }

    const binding = await this.surfaceBindingRepository.updateSurfaceBinding(id, data, effectiveTenantId);

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

    const binding = await this.surfaceBindingRepository.getSurfaceBinding(id, effectiveTenantId);
    if (!binding) {
      throw new Error('Surface binding not found');
    }

    await this.surfaceBindingRepository.deleteSurfaceBinding(id, effectiveTenantId);

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

    return await this.surfaceBindingRepository.getSurfaceBindings(effectiveTenantId);
  }

  // Metadata Surface Management
  async getMetadataSurfaces(
    filters?: {
      module?: string;
      phase?: string;
      surface_type?: string;
    },
    tenantId?: string
  ): Promise<MetadataSurface[]> {
    const effectiveTenantId = await this.resolveTenantId(tenantId);
    return await this.metadataSurfaceRepository.getMetadataSurfaces(effectiveTenantId, filters);
  }

  async getMetadataSurfacesByPhase(phase: string, tenantId?: string): Promise<MetadataSurface[]> {
    return await this.getMetadataSurfaces({ phase }, tenantId);
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
    const surface = await this.metadataSurfaceRepository.createMetadataSurface(data);

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

  // Metadata-driven role/bundle resolution
  async resolveMetadataKeys(userId: string, tenantId?: string): Promise<string[]> {
    const effectiveTenantId = tenantId || await tenantUtils.getTenantId();
    if (!effectiveTenantId) {
      return [];
    }

    // This would integrate with the role repository to get user roles
    // For now, returning empty array as roles are managed by RbacService
    return [];
  }

  // Bundle composition wizard support
  async getPermissionsByModule(tenantId?: string): Promise<Record<string, Permission[]>> {
    const effectiveTenantId = tenantId || await tenantUtils.getTenantId();
    if (!effectiveTenantId) {
      throw new Error('No tenant context available');
    }

    const permissions = await this.permissionRepository.getPermissions(effectiveTenantId);
    const groupedPermissions: Record<string, Permission[]> = {};

    for (const permission of permissions) {
      if (!groupedPermissions[permission.module]) {
        groupedPermissions[permission.module] = [];
      }
      groupedPermissions[permission.module].push(permission);
    }

    return groupedPermissions;
  }

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

  // Audit logging helper
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
      // This would integrate with the audit service
      // For now, just console log in development
      console.log('Audit event:', log);
    } catch (error) {
      console.error('Failed to log RBAC audit event:', error);
      // Don't throw - audit logging should not break the main operation
    }
  }
}
