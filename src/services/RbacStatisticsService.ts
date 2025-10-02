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

    // Use repository methods to get counts
    const [
      allRoles,
      allBundles,
      systemRoles,
      customBundles,
      recentLogs
    ] = await Promise.all([
      this.roleRepository.getRoles(effectiveTenantId, true),
      this.bundleRepository.getPermissionBundles(effectiveTenantId),
      this.roleRepository.getRoles(effectiveTenantId, true).then(roles => roles.filter(r => r.scope === 'system')),
      this.bundleRepository.getPermissionBundles(effectiveTenantId).then(bundles => bundles.filter(b => b.is_template === false)),
      this.auditRepository.getAuditLogs(effectiveTenantId, 100, 0)
    ]);

    // For user counts and surface bindings, we need to call the adapters through repositories
    // Since these don't have dedicated methods yet, we'll get counts using the existing methods
    const users = await this.userRoleRepository.getUsers(effectiveTenantId);
    const surfaceBindings = await this.surfaceBindingRepository.getSurfaceBindings(effectiveTenantId);

    // Count active users (users with at least one role)
    const usersWithRoles = new Set(users.map((u: any) => u.id));

    return {
      totalRoles: allRoles.length,
      totalBundles: allBundles.length,
      totalUsers: users.length,
      activeUsers: usersWithRoles.size,
      surfaceBindings: surfaceBindings.length,
      systemRoles: systemRoles.length,
      customBundles: customBundles.length,
      recentChanges: recentLogs.length,
      pendingApprovals: 0
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
