import { injectable, inject } from 'inversify';
import { BaseRepository } from '@/repositories/base.repository';
import type { IPermissionBundleAdapter } from '@/adapters/permissionBundle.adapter';
import type {
  PermissionBundle,
  CreatePermissionBundleDto,
  UpdatePermissionBundleDto,
  BundleWithPermissions
} from '@/models/rbac.model';
import { TYPES } from '@/lib/types';

export interface IPermissionBundleRepository extends BaseRepository<PermissionBundle> {
  createPermissionBundle(data: CreatePermissionBundleDto, tenantId: string): Promise<PermissionBundle>;
  updatePermissionBundle(id: string, data: UpdatePermissionBundleDto, tenantId: string): Promise<PermissionBundle>;
  deletePermissionBundle(id: string, tenantId: string): Promise<void>;
  getPermissionBundles(tenantId: string, scopeFilter?: string): Promise<PermissionBundle[]>;
  getBundleWithPermissions(id: string, tenantId: string): Promise<BundleWithPermissions | null>;
  addPermissionsToBundle(bundleId: string, permissionIds: string[], tenantId: string): Promise<void>;
  removePermissionsFromBundle(bundleId: string, permissionIds: string[], tenantId: string): Promise<void>;
  getBundlePermissions(bundleId: string, tenantId: string): Promise<any[]>;
  getBundleStatistics(tenantId: string, scopeFilter?: string): Promise<PermissionBundle[]>;
}

@injectable()
export class PermissionBundleRepository extends BaseRepository<PermissionBundle> implements IPermissionBundleRepository {
  constructor(@inject(TYPES.IPermissionBundleAdapter) private readonly bundleAdapter: IPermissionBundleAdapter) {
    super(bundleAdapter);
  }

  async createPermissionBundle(data: CreatePermissionBundleDto, tenantId: string): Promise<PermissionBundle> {
    return await this.bundleAdapter.createPermissionBundle(data, tenantId);
  }

  async updatePermissionBundle(id: string, data: UpdatePermissionBundleDto, tenantId: string): Promise<PermissionBundle> {
    return await this.bundleAdapter.updatePermissionBundle(id, data, tenantId);
  }

  async deletePermissionBundle(id: string, tenantId: string): Promise<void> {
    return await this.bundleAdapter.deletePermissionBundle(id, tenantId);
  }

  async getPermissionBundles(tenantId: string, scopeFilter?: string): Promise<PermissionBundle[]> {
    return await this.bundleAdapter.getPermissionBundles(tenantId, scopeFilter);
  }

  async getBundleWithPermissions(id: string, tenantId: string): Promise<BundleWithPermissions | null> {
    return await this.bundleAdapter.getBundleWithPermissions(id, tenantId);
  }

  async addPermissionsToBundle(bundleId: string, permissionIds: string[], tenantId: string): Promise<void> {
    return await this.bundleAdapter.addPermissionsToBundle(bundleId, permissionIds, tenantId);
  }

  async removePermissionsFromBundle(bundleId: string, permissionIds: string[], tenantId: string): Promise<void> {
    return await this.bundleAdapter.removePermissionsFromBundle(bundleId, permissionIds, tenantId);
  }

  async getBundlePermissions(bundleId: string, tenantId: string): Promise<any[]> {
    return await this.bundleAdapter.getBundlePermissions(bundleId, tenantId);
  }

  async getBundleStatistics(tenantId: string, scopeFilter?: string): Promise<PermissionBundle[]> {
    return await this.bundleAdapter.getBundleStatistics(tenantId, scopeFilter);
  }
}
