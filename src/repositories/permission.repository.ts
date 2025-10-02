import { injectable, inject } from 'inversify';
import { BaseRepository } from '@/repositories/base.repository';
import type { IPermissionAdapter } from '@/adapters/permission.adapter';
import type { Permission } from '@/models/rbac.model';
import { TYPES } from '@/lib/types';

export interface IPermissionRepository extends BaseRepository<Permission> {
  getPermissions(tenantId: string, module?: string): Promise<Permission[]>;
  getPermission(id: string): Promise<Permission | null>;
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
}
