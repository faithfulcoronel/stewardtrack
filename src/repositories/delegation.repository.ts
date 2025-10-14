import { injectable, inject } from 'inversify';
import { BaseRepository } from '@/repositories/base.repository';
import type { IDelegationAdapter } from '@/adapters/delegation.adapter';
import type {
  DelegatedContext,
  UserWithRoles,
  Role
} from '@/models/rbac.model';
import { TYPES } from '@/lib/types';

export interface IDelegationRepository extends BaseRepository<any> {
  getDelegatedContext(userId: string, tenantId: string): Promise<DelegatedContext | null>;
  getUsersInDelegatedScope(delegatedContext: DelegatedContext): Promise<UserWithRoles[]>;
  getDelegationScopes(delegatedContext: any): Promise<any[]>;
  getDelegatedUsers(delegatedContext: DelegatedContext): Promise<any[]>;
  getDelegationRoles(delegatedContext: DelegatedContext): Promise<Role[]>;
  getDelegationStats(delegatedContext: DelegatedContext): Promise<{
    totalUsers: number;
    activeUsers: number;
    totalRoles: number;
    delegatableRoles: number;
    scopeCount: number;
    recentChanges: number;
  }>;
  assignDelegatedRole(params: {
    delegatorId: string;
    delegateeId: string;
    roleId: string;
    scopeId?: string;
    context: DelegatedContext;
  }): Promise<{ success: boolean; assignment: any }>;
  revokeDelegatedRole(params: {
    delegatorId: string;
    delegateeId: string;
    roleId: string;
    context: DelegatedContext;
  }): Promise<{ success: boolean }>;
  getDelegationPermissions(tenantId: string): Promise<any[]>;
  createDelegationPermission(permissionData: any, tenantId: string): Promise<any>;
  updateDelegationPermission(id: string, permissionData: any, tenantId: string): Promise<any>;
  revokeDelegationPermission(id: string, tenantId: string): Promise<void>;
  getPermissionTemplates(tenantId: string): Promise<any[]>;
}

@injectable()
export class DelegationRepository extends BaseRepository<any> implements IDelegationRepository {
  constructor(@inject(TYPES.IDelegationAdapter) private readonly delegationAdapter: IDelegationAdapter) {
    super(delegationAdapter);
  }

  async getDelegatedContext(userId: string, tenantId: string): Promise<DelegatedContext | null> {
    return await this.delegationAdapter.getDelegatedContext(userId, tenantId);
  }

  async getUsersInDelegatedScope(delegatedContext: DelegatedContext): Promise<UserWithRoles[]> {
    return await this.delegationAdapter.getUsersInDelegatedScope(delegatedContext);
  }

  async getDelegationScopes(delegatedContext: any): Promise<any[]> {
    return await this.delegationAdapter.getDelegationScopes(delegatedContext);
  }

  async getDelegatedUsers(delegatedContext: DelegatedContext): Promise<any[]> {
    return await this.delegationAdapter.getDelegatedUsers(delegatedContext);
  }

  async getDelegationRoles(delegatedContext: DelegatedContext): Promise<Role[]> {
    return await this.delegationAdapter.getDelegationRoles(delegatedContext);
  }

  async getDelegationStats(delegatedContext: DelegatedContext): Promise<{
    totalUsers: number;
    activeUsers: number;
    totalRoles: number;
    delegatableRoles: number;
    scopeCount: number;
    recentChanges: number;
  }> {
    return await this.delegationAdapter.getDelegationStats(delegatedContext);
  }

  async assignDelegatedRole(params: {
    delegatorId: string;
    delegateeId: string;
    roleId: string;
    scopeId?: string;
    context: DelegatedContext;
  }): Promise<{ success: boolean; assignment: any }> {
    return await this.delegationAdapter.assignDelegatedRole(params);
  }

  async revokeDelegatedRole(params: {
    delegatorId: string;
    delegateeId: string;
    roleId: string;
    context: DelegatedContext;
  }): Promise<{ success: boolean }> {
    return await this.delegationAdapter.revokeDelegatedRole(params);
  }

  async getDelegationPermissions(tenantId: string): Promise<any[]> {
    return await this.delegationAdapter.getDelegationPermissions(tenantId);
  }

  async createDelegationPermission(permissionData: any, tenantId: string): Promise<any> {
    return await this.delegationAdapter.createDelegationPermission(permissionData, tenantId);
  }

  async updateDelegationPermission(id: string, permissionData: any, tenantId: string): Promise<any> {
    return await this.delegationAdapter.updateDelegationPermission(id, permissionData, tenantId);
  }

  async revokeDelegationPermission(id: string, tenantId: string): Promise<void> {
    return await this.delegationAdapter.revokeDelegationPermission(id, tenantId);
  }

  async getPermissionTemplates(tenantId: string): Promise<any[]> {
    return await this.delegationAdapter.getPermissionTemplates(tenantId);
  }
}

