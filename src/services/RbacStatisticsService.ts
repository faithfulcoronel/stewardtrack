import 'server-only';
import { injectable, inject } from 'inversify';
import { TYPES } from '@/lib/types';
import type { IRoleRepository } from '@/repositories/role.repository';
import type { IPermissionBundleRepository } from '@/repositories/permissionBundle.repository';
import type { IPublishingRepository } from '@/repositories/publishing.repository';
import type { IRbacAuditRepository } from '@/repositories/rbacAudit.repository';
import type { ISurfaceBindingRepository } from '@/repositories/surfaceBinding.repository';
import type { IUserRoleManagementRepository } from '@/repositories/userRole.repository';
import { tenantUtils } from '@/utils/tenantUtils';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import type {
  Role,
  PermissionBundle
} from '@/models/rbac.model';

@injectable()
export class RbacStatisticsService {
  constructor(
    @inject(TYPES.IRoleRepository)
    private roleRepository: IRoleRepository,
    @inject(TYPES.IPermissionBundleRepository)
    private bundleRepository: IPermissionBundleRepository,
    @inject(TYPES.IPublishingRepository)
    private publishingRepository: IPublishingRepository,
    @inject(TYPES.IRbacAuditRepository)
    private auditRepository: IRbacAuditRepository,
    @inject(TYPES.ISurfaceBindingRepository)
    private surfaceBindingRepository: ISurfaceBindingRepository,
    @inject(TYPES.IUserRoleManagementRepository)
    private userRoleRepository: IUserRoleManagementRepository
  ) {}

  private async resolveTenantId(tenantId?: string): Promise<string> {
    const resolved = tenantId ?? (await tenantUtils.getTenantId());
    return resolved ?? '550e8400-e29b-41d4-a716-446655440000';
  }

  async getRoleStatistics(tenantId?: string, includeSystem = true): Promise<Role[]> {
    const effectiveTenantId = tenantId || await tenantUtils.getTenantId();
    if (!effectiveTenantId) {
      throw new Error('No tenant context available');
    }

    return await this.roleRepository.getRoleStatistics(effectiveTenantId, includeSystem);
  }

  async getBundleStatistics(tenantId?: string, scopeFilter?: string): Promise<PermissionBundle[]> {
    const effectiveTenantId = tenantId || await tenantUtils.getTenantId();
    if (!effectiveTenantId) {
      throw new Error('No tenant context available');
    }

    return await this.bundleRepository.getBundleStatistics(effectiveTenantId, scopeFilter);
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

    const supabase = await createSupabaseServerClient();

    // Get all statistics in parallel
    const [
      { count: totalRoles },
      { count: totalBundles },
      { count: totalUsers },
      { count: activeUsers },
      { count: surfaceBindings },
      { count: systemRoles },
      { count: customBundles }
    ] = await Promise.all([
      // Total roles
      supabase
        .from('roles')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', effectiveTenantId)
        .is('deleted_at', null),

      // Total bundles
      supabase
        .from('permission_bundles')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', effectiveTenantId),

      // Total users in tenant
      supabase
        .from('tenant_users')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', effectiveTenantId),

      // Active users (users with roles)
      supabase
        .from('user_roles')
        .select('user_id', { count: 'exact', head: true })
        .eq('tenant_id', effectiveTenantId),

      // Surface bindings
      supabase
        .from('rbac_surface_bindings')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', effectiveTenantId)
        .eq('is_active', true),

      // System roles
      supabase
        .from('roles')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', effectiveTenantId)
        .eq('scope', 'system')
        .is('deleted_at', null),

      // Custom bundles (non-template bundles)
      supabase
        .from('permission_bundles')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', effectiveTenantId)
        .eq('is_template', false)
    ]);

    // Get recent audit logs
    const recentLogs = await this.auditRepository.getAuditLogs(effectiveTenantId, 100, 0);
    const recentChanges = recentLogs.length;

    // Placeholder for future approval workflow
    const pendingApprovals = 0;

    return {
      totalRoles: totalRoles || 0,
      totalBundles: totalBundles || 0,
      totalUsers: totalUsers || 0,
      activeUsers: activeUsers || 0,
      surfaceBindings: surfaceBindings || 0,
      systemRoles: systemRoles || 0,
      customBundles: customBundles || 0,
      recentChanges,
      pendingApprovals
    };
  }

  async getRbacHealthMetrics(tenantId?: string): Promise<any> {
    const resolvedTenantId = await this.resolveTenantId(tenantId);
    return await this.publishingRepository.getRbacHealthMetrics(resolvedTenantId);
  }

  async getMaterializedViewStatus(tenantId?: string): Promise<any> {
    const resolvedTenantId = await this.resolveTenantId(tenantId);
    return await this.publishingRepository.getMaterializedViewStatus(resolvedTenantId);
  }

  async refreshMaterializedViews(tenantId?: string): Promise<any> {
    const resolvedTenantId = await this.resolveTenantId(tenantId);
    return await this.publishingRepository.refreshMaterializedViews(resolvedTenantId);
  }

  async getMultiRoleStats(tenantId?: string): Promise<any> {
    const resolvedTenantId = await this.resolveTenantId(tenantId);
    return await this.publishingRepository.getMultiRoleStats(resolvedTenantId);
  }
}
