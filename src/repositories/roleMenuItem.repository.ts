import { injectable, inject } from 'inversify';
import { BaseRepository } from './base.repository';
import { RoleMenuItem } from '../models/roleMenuItem.model';
import type { IRoleMenuItemAdapter } from '../adapters/roleMenuItem.adapter';
import { TYPES } from '../lib/types';
import { handleError } from '../utils/errorHandler';

export interface IRoleMenuItemRepository extends BaseRepository<RoleMenuItem> {
  replaceRoleMenuItems(roleId: string, menuItemIds: string[]): Promise<void>;
}

@injectable()
export class RoleMenuItemRepository
  extends BaseRepository<RoleMenuItem>
  implements IRoleMenuItemRepository
{
  constructor(
    @inject(TYPES.IRoleMenuItemAdapter)
    private roleMenuItemAdapter: IRoleMenuItemAdapter
  ) {
    super(roleMenuItemAdapter as any);
  }

  async replaceRoleMenuItems(roleId: string, menuItemIds: string[]): Promise<void> {
    try {
      await this.roleMenuItemAdapter.replaceRoleMenuItems(roleId, menuItemIds);
    } catch (error) {
      throw handleError(error, {
        context: 'replaceRoleMenuItems',
        roleId,
        menuItemIds,
      });
    }
  }
}