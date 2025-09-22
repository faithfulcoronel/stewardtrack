import { injectable, inject } from 'inversify';
import { BaseRepository } from '@/repositories/base.repository';
import { BaseAdapter } from '@/adapters/base.adapter';
import { Role } from '@/models/role.model';
import { NotificationService } from '@/services/NotificationService';
import { RoleValidator } from '@/validators/role.validator';
import { handleError } from '@/utils/errorHandler';
import type { IMenuPermissionRepository } from '@/repositories/menuPermission.repository';
import type { IRoleMenuItemRepository } from '@/repositories/roleMenuItem.repository';
import type { IPermissionRepository } from '@/repositories/permission.repository';
import { TYPES } from '@/lib/types';

export interface IRoleRepository extends BaseRepository<Role> {
  updateRolePermissions(id: string, permissionIds: string[]): Promise<void>;
}

@injectable()
export class RoleRepository
  extends BaseRepository<Role>
  implements IRoleRepository
{
  constructor(
    @inject(TYPES.IRoleAdapter) adapter: BaseAdapter<Role>,
    @inject(TYPES.IPermissionRepository)
    private permissionRepository: IPermissionRepository,
    @inject(TYPES.IMenuPermissionRepository)
    private menuPermissionRepository?: IMenuPermissionRepository,
    @inject(TYPES.IRoleMenuItemRepository)
    private roleMenuItemRepository?: IRoleMenuItemRepository
  ) {
    super(adapter);
  }

  protected override async beforeCreate(
    data: Partial<Role>
  ): Promise<Partial<Role>> {
    await RoleValidator.validate(data, this, undefined, this.permissionRepository);
    return this.formatData(data);
  }

  protected override async afterCreate(data: Role): Promise<void> {
    NotificationService.showSuccess(`Role "${data.name}" created successfully`);
  }

  protected override async beforeUpdate(
    id: string,
    data: Partial<Role>
  ): Promise<Partial<Role>> {
    await RoleValidator.validate(data, this, id, this.permissionRepository);
    return this.formatData(data);
  }

  protected override async afterUpdate(data: Role): Promise<void> {
    NotificationService.showSuccess(`Role "${data.name}" updated successfully`);
  }

  private formatData(data: Partial<Role>): Partial<Role> {
    return {
      ...data,
      name: data.name?.trim().toLowerCase(),
      description: data.description?.trim() || null
    };
  }

  async updateRolePermissions(id: string, permissionIds: string[]): Promise<void> {
    try {
      const { data: menuRows } = await this.menuPermissionRepository!.find({
        select: 'menu_item_id',
        filters: {
          permission_id: { operator: 'isAnyOf', value: permissionIds },
        },
      });

      const menuItemIds = Array.from(
        new Set((menuRows || []).map(m => (m as any).menu_item_id))
      );

      await this.roleMenuItemRepository!.replaceRoleMenuItems(id, menuItemIds);
    } catch (error) {
      throw handleError(error, {
        context: 'updateRolePermissions',
        id,
        permissionIds,
      });
    }
  }
}
