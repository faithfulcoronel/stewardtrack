import { injectable, inject } from 'inversify';
import { BaseRepository } from '@/repositories/base.repository';
import type { IRoleAdapter } from '@/adapters/role.adapter';
import type { Role, CreateRoleDto, UpdateRoleDto, RoleWithPermissions } from '@/models/rbac.model';
import { TYPES } from '@/lib/types';

export interface IRoleRepository extends BaseRepository<Role> {
  createRole(data: CreateRoleDto, tenantId: string): Promise<Role>;
  updateRole(id: string, data: UpdateRoleDto, tenantId: string): Promise<Role>;
  deleteRole(id: string, tenantId: string): Promise<void>;
  getRoles(tenantId: string, includeSystem?: boolean): Promise<Role[]>;
  getRole(roleId: string): Promise<Role | null>;
  getRoleWithPermissions(id: string, tenantId: string): Promise<RoleWithPermissions | null>;
  getRoleStatistics(tenantId: string, includeSystem?: boolean): Promise<Role[]>;
  findByMetadataKey(tenantId: string, metadataKey: string): Promise<Role | null>;
  /** Find role by metadata key with elevated access (bypasses RLS) - FOR SUPER ADMIN USE ONLY */
  findByMetadataKeyWithElevatedAccess(tenantId: string, metadataKey: string): Promise<Role | null>;
  /** Create role with elevated access (bypasses RLS) - FOR SUPER ADMIN USE ONLY */
  createRoleWithElevatedAccess(data: CreateRoleDto, tenantId: string): Promise<Role>;
}

@injectable()
export class RoleRepository extends BaseRepository<Role> implements IRoleRepository {
  constructor(@inject(TYPES.IRoleAdapter) private readonly roleAdapter: IRoleAdapter) {
    super(roleAdapter);
  }

  async createRole(data: CreateRoleDto, tenantId: string): Promise<Role> {
    return await this.roleAdapter.createRole(data, tenantId);
  }

  async updateRole(id: string, data: UpdateRoleDto, tenantId: string): Promise<Role> {
    return await this.roleAdapter.updateRole(id, data, tenantId);
  }

  async deleteRole(id: string, tenantId: string): Promise<void> {
    return await this.roleAdapter.deleteRole(id, tenantId);
  }

  async getRoles(tenantId: string, includeSystem: boolean = true): Promise<Role[]> {
    return await this.roleAdapter.getRoles(tenantId, includeSystem);
  }

  async getRole(roleId: string): Promise<Role | null> {
    return await this.roleAdapter.getRole(roleId);
  }

  async getRoleWithPermissions(id: string, tenantId: string): Promise<RoleWithPermissions | null> {
    return await this.roleAdapter.getRoleWithPermissions(id, tenantId);
  }

  async getRoleStatistics(tenantId: string, includeSystem: boolean = true): Promise<Role[]> {
    return await this.roleAdapter.getRoleStatistics(tenantId, includeSystem);
  }

  async findByMetadataKey(tenantId: string, metadataKey: string): Promise<Role | null> {
    return await this.roleAdapter.findByMetadataKey(tenantId, metadataKey);
  }

  /**
   * Find role by metadata key with elevated access (bypasses RLS).
   * FOR SUPER ADMIN USE ONLY - Used during license assignment to find tenant roles.
   */
  async findByMetadataKeyWithElevatedAccess(tenantId: string, metadataKey: string): Promise<Role | null> {
    return await this.roleAdapter.findByMetadataKeyWithElevatedAccess(tenantId, metadataKey);
  }

  /**
   * Create role with elevated access (bypasses RLS).
   * FOR SUPER ADMIN USE ONLY - Used during license assignment to create tenant roles.
   */
  async createRoleWithElevatedAccess(data: CreateRoleDto, tenantId: string): Promise<Role> {
    return await this.roleAdapter.createRoleWithElevatedAccess(data, tenantId);
  }
}
