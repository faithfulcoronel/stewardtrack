import { Role } from '../models/role.model';
import type { IRoleRepository } from '../repositories/role.repository';
import type { IPermissionRepository } from '../repositories/permission.repository';

export class RoleValidator {
  static async validate(
    data: Partial<Role>,
    repository?: IRoleRepository,
    currentId?: string,
    permissionRepository?: IPermissionRepository
  ): Promise<void> {
    if (data.name !== undefined && !data.name.trim()) {
      throw new Error('Role name is required');
    }

    if (repository && data.name) {
      const { data: existing } = await repository.find({
        filters: {
          name: { operator: 'eq', value: data.name.trim().toLowerCase() },
          ...(currentId
            ? { id: { operator: 'neq', value: currentId } }
            : {}),
        },
        pagination: { page: 1, pageSize: 1 },
      });
      if (existing.length) {
        throw new Error('A role with this name already exists');
      }
    }

    const permissionIds = (data as any).permissionIds as string[] | undefined;
    if (permissionIds && permissionIds.length) {
      if (!permissionRepository) {
        throw new Error('Permission repository is required');
      }
      const { data: perms } = await permissionRepository.find({
        select: 'id',
        filters: {
          id: { operator: 'isAnyOf', value: permissionIds }
        },
        pagination: { page: 1, pageSize: permissionIds.length }
      });
      const found = perms?.map(p => (p as any).id) || [];
      if (found.length !== permissionIds.length) {
        throw new Error('Invalid permission ids');
      }
    }
  }
}
