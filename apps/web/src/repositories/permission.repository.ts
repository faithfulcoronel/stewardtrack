import { injectable, inject } from 'inversify';
import { BaseRepository } from '@/repositories/base.repository';
import type { IPermissionAdapter } from '@/adapters/permission.adapter';
import type { Permission } from '@/models/rbac.model';
import { TYPES } from '@/lib/types';

export interface IPermissionRepository extends BaseRepository<Permission> {
  getPermissions(tenantId: string, module?: string): Promise<Permission[]>;
  getPermission(id: string): Promise<Permission | null>;
  findByCode(tenantId: string, code: string): Promise<Permission | null>;
  getByTenantId(tenantId: string): Promise<Permission[]>;
  /** Create permission with elevated access (bypasses RLS) - FOR SUPER ADMIN USE ONLY */
  createWithElevatedAccess(data: Partial<Permission>): Promise<Permission>;
  /** Update permission with elevated access (bypasses RLS) - FOR SUPER ADMIN USE ONLY */
  updateWithElevatedAccess(id: string, data: Partial<Permission>): Promise<Permission>;
  /** Find permission by code with elevated access (bypasses RLS) - FOR SUPER ADMIN USE ONLY */
  findByCodeWithElevatedAccess(tenantId: string, code: string): Promise<Permission | null>;
}

@injectable()
export class PermissionRepository extends BaseRepository<Permission> implements IPermissionRepository {
  constructor(@inject(TYPES.IPermissionAdapter) private readonly permissionAdapter: IPermissionAdapter) {
    super(permissionAdapter);
  }

  async getPermissions(tenantId: string, module?: string): Promise<Permission[]> {
    return await this.permissionAdapter.getPermissions(tenantId, module);
  }

  async getPermission(id: string): Promise<Permission | null> {
    return await this.permissionAdapter.getPermission(id);
  }

  async findByCode(tenantId: string, code: string): Promise<Permission | null> {
    return await this.permissionAdapter.findByCode(tenantId, code);
  }

  async getByTenantId(tenantId: string): Promise<Permission[]> {
    return await this.permissionAdapter.getByTenantId(tenantId);
  }

  /**
   * Create permission with elevated access (bypasses RLS).
   * FOR SUPER ADMIN USE ONLY - Used during license assignment to deploy permissions to tenants.
   */
  async createWithElevatedAccess(data: Partial<Permission>): Promise<Permission> {
    return await this.permissionAdapter.createWithElevatedAccess(data);
  }

  /**
   * Update permission with elevated access (bypasses RLS).
   * FOR SUPER ADMIN USE ONLY - Used during license assignment to update permissions in tenants.
   */
  async updateWithElevatedAccess(id: string, data: Partial<Permission>): Promise<Permission> {
    return await this.permissionAdapter.updateWithElevatedAccess(id, data);
  }

  /**
   * Find permission by code with elevated access (bypasses RLS).
   * FOR SUPER ADMIN USE ONLY - Used during license assignment to check existing permissions.
   */
  async findByCodeWithElevatedAccess(tenantId: string, code: string): Promise<Permission | null> {
    return await this.permissionAdapter.findByCodeWithElevatedAccess(tenantId, code);
  }
}
