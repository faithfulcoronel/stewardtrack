import 'server-only';
import { injectable, inject } from 'inversify';
import { randomUUID } from 'crypto';
import { TYPES } from '@/lib/types';
import type { IDelegationRepository } from '@/repositories/delegation.repository';
import type { IRoleRepository } from '@/repositories/role.repository';
import { tenantUtils } from '@/utils/tenantUtils';
import type {
  DelegatedContext,
  UserWithRoles,
  Role,
  UserRole,
} from '@/models/rbac.model';
import type { INotificationBusService } from '@/services/notification/NotificationBusService';
import { NotificationEventType } from '@/models/notification/notificationEvent.model';

/**
 * RbacDelegationService
 *
 * Handles all delegation-related RBAC operations including:
 * - Delegated context management
 * - Delegated user and role queries
 * - Delegation permission management
 * - Delegated role assignment and revocation
 * - Delegation statistics and reporting
 *
 * This service enables campus and ministry leaders to manage
 * permissions within their delegated scopes.
 */
@injectable()
export class RbacDelegationService {
  constructor(
    @inject(TYPES.IDelegationRepository)
    private delegationRepository: IDelegationRepository,
    @inject(TYPES.IRoleRepository)
    private roleRepository: IRoleRepository,
    @inject(TYPES.NotificationBusService)
    private notificationBus: INotificationBusService
  ) {}

  private async resolveTenantId(tenantId?: string): Promise<string> {
    const resolved = tenantId ?? (await tenantUtils.getTenantId());
    return resolved ?? '550e8400-e29b-41d4-a716-446655440000';
  }

  async getDelegatedContext(userId: string, tenantId?: string): Promise<DelegatedContext | null> {
    const resolvedTenantId = await this.resolveTenantId(tenantId);
    return await this.delegationRepository.getDelegatedContext(userId, resolvedTenantId);
  }

  async getUsersInDelegatedScope(delegatedContext: DelegatedContext): Promise<UserWithRoles[]> {
    return await this.delegationRepository.getUsersInDelegatedScope(delegatedContext);
  }

  async getDelegationScopes(userId: string, tenantId?: string): Promise<any[]> {
    const resolvedTenantId = await this.resolveTenantId(tenantId);
    const delegatedContext = await this.getDelegatedContext(userId, resolvedTenantId);
    if (!delegatedContext) return [];
    return await this.delegationRepository.getDelegationScopes(delegatedContext);
  }

  async getDelegatedUsers(userId: string, tenantId?: string): Promise<any[]> {
    const resolvedTenantId = await this.resolveTenantId(tenantId);
    const delegatedContext = await this.getDelegatedContext(userId, resolvedTenantId);
    if (!delegatedContext) return [];
    return await this.delegationRepository.getDelegatedUsers(delegatedContext);
  }

  async getDelegationRoles(userId: string, tenantId?: string): Promise<Role[]> {
    const resolvedTenantId = await this.resolveTenantId(tenantId);
    const delegatedContext = await this.getDelegatedContext(userId, resolvedTenantId);
    if (!delegatedContext) return [];
    return await this.delegationRepository.getDelegationRoles(delegatedContext);
  }

  async canDelegateRole(userId: string, roleId: string, tenantId?: string): Promise<boolean> {
    const effectiveTenantId = tenantId || await tenantUtils.getTenantId();
    if (!effectiveTenantId) return false;

    const targetRole = await this.roleRepository.getRoleWithPermissions(roleId, effectiveTenantId);
    if (!targetRole || !targetRole.is_delegatable) return false;

    const delegatedContext = await this.getDelegatedContext(userId, effectiveTenantId);
    return delegatedContext !== null && delegatedContext.allowed_roles.includes(roleId);
  }

  async assignDelegatedRole(
    delegatorId: string,
    payload: { user_id: string; role_id: string; scope_id?: string },
    tenantId?: string
  ): Promise<{ success: boolean; assignment: Partial<UserRole> & { scope_id?: string | null } }> {
    const resolvedTenantId = await this.resolveTenantId(tenantId);
    const delegatedContext = await this.getDelegatedContext(delegatorId, resolvedTenantId);

    if (!delegatedContext) throw new Error('No delegation permissions found');
    if (!delegatedContext.allowed_roles.includes(payload.role_id)) {
      throw new Error('Role is not delegatable for this context');
    }

    const result = await this.delegationRepository.assignDelegatedRole({
      delegatorId,
      delegateeId: payload.user_id,
      roleId: payload.role_id,
      scopeId: payload.scope_id,
      context: delegatedContext
    });

    // Send notification to the delegatee
    if (result.success) {
      await this.sendDelegationAssignedNotification(
        payload.user_id,
        payload.role_id,
        resolvedTenantId,
        payload.scope_id
      );
    }

    return result;
  }

  async revokeDelegatedRole(
    delegatorId: string,
    payload: { user_id: string; role_id: string },
    tenantId?: string
  ): Promise<{ success: boolean }> {
    const resolvedTenantId = await this.resolveTenantId(tenantId);
    const delegatedContext = await this.getDelegatedContext(delegatorId, resolvedTenantId);

    if (!delegatedContext) throw new Error('No delegation permissions found');

    return await this.delegationRepository.revokeDelegatedRole({
      delegatorId,
      delegateeId: payload.user_id,
      roleId: payload.role_id,
      context: delegatedContext
    });
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

    return await this.delegationRepository.getDelegationStats(delegatedContext);
  }

  async getDelegationPermissions(tenantId?: string): Promise<any[]> {
    const resolvedTenantId = await this.resolveTenantId(tenantId);
    return await this.delegationRepository.getDelegationPermissions(resolvedTenantId);
  }

  async createDelegationPermission(permissionData: any, tenantId?: string): Promise<any> {
    const resolvedTenantId = await this.resolveTenantId(tenantId);
    return await this.delegationRepository.createDelegationPermission(permissionData, resolvedTenantId);
  }

  async updateDelegationPermission(id: string, permissionData: any, tenantId?: string): Promise<any> {
    const resolvedTenantId = await this.resolveTenantId(tenantId);
    return await this.delegationRepository.updateDelegationPermission(id, permissionData, resolvedTenantId);
  }

  async revokeDelegationPermission(id: string, tenantId?: string): Promise<void> {
    const resolvedTenantId = await this.resolveTenantId(tenantId);
    return await this.delegationRepository.revokeDelegationPermission(id, resolvedTenantId);
  }

  async getPermissionTemplates(tenantId?: string): Promise<any[]> {
    const resolvedTenantId = await this.resolveTenantId(tenantId);
    return await this.delegationRepository.getPermissionTemplates(resolvedTenantId);
  }

  /**
   * Send notification when a role is delegated to a user
   */
  private async sendDelegationAssignedNotification(
    userId: string,
    roleId: string,
    tenantId: string,
    scopeId?: string
  ): Promise<void> {
    try {
      // Get role details
      const role = await this.roleRepository.getRoleWithPermissions(roleId, tenantId);
      const roleName = role?.name || 'a new role';

      await this.notificationBus.publish({
        id: randomUUID(),
        eventType: NotificationEventType.DELEGATION_ASSIGNED,
        category: 'security',
        priority: 'high',
        tenantId,
        recipient: {
          userId,
        },
        payload: {
          title: 'Role Delegated',
          message: `You have been assigned the "${roleName}" role${scopeId ? ' with scoped access' : ''}. You can now perform actions associated with this role.`,
          roleId,
          roleName,
          scopeId,
          actionType: 'redirect',
          actionPayload: '/admin/rbac/delegated-console',
        },
        channels: ['in_app', 'email'],
      });
    } catch (error) {
      console.error('Failed to send delegation assigned notification:', error);
    }
  }
}
