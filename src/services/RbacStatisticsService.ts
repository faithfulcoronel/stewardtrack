import 'server-only';
import { injectable, inject } from 'inversify';
import { TYPES } from '@/lib/types';
import type { IRoleRepository } from '@/repositories/role.repository';
import type { IPublishingRepository } from '@/repositories/publishing.repository';
import type { IRbacAuditRepository } from '@/repositories/rbacAudit.repository';
import type { IUserRoleManagementRepository } from '@/repositories/userRole.repository';
import { tenantUtils } from '@/utils/tenantUtils';
import type {
  Role
} from '@/models/rbac.model';

@injectable()
export class RbacStatisticsService {
  constructor(
    @inject(TYPES.IRoleRepository)
    private roleRepository: IRoleRepository,
    @inject(TYPES.IPublishingRepository)
    private publishingRepository: IPublishingRepository,
    @inject(TYPES.IRbacAuditRepository)
    private auditRepository: IRbacAuditRepository,
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

  async getDashboardStatistics(tenantId?: string): Promise<{
    totalRoles: number;
    totalUsers: number;
    activeUsers: number;
    systemRoles: number;
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
      systemRoles,
      recentLogs
    ] = await Promise.all([
      this.roleRepository.getRoles(effectiveTenantId, true),
      this.roleRepository.getRoles(effectiveTenantId, true).then(roles => roles.filter(r => r.scope === 'system')),
      this.auditRepository.getAuditLogs(effectiveTenantId, 100, 0)
    ]);

    // Get user counts
    const users = await this.userRoleRepository.getUsers(effectiveTenantId);

    // Count active users (users with at least one role)
    const usersWithRoles = new Set(users.map((u: any) => u.id));

    return {
      totalRoles: allRoles.length,
      totalUsers: users.length,
      activeUsers: usersWithRoles.size,
      systemRoles: systemRoles.length,
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
