import { injectable, inject } from 'inversify';
import { BaseRepository } from './base.repository';
import { BaseAdapter } from '../adapters/base.adapter';
import { MenuPermission } from '../models/menuPermission.model';
import type { IMenuPermissionAdapter } from '../adapters/menuPermission.adapter';
import { TYPES } from '../lib/types';

export type IMenuPermissionRepository = BaseRepository<MenuPermission>;

@injectable()
export class MenuPermissionRepository
  extends BaseRepository<MenuPermission>
  implements IMenuPermissionRepository
{
  constructor(@inject(TYPES.IMenuPermissionAdapter) adapter: BaseAdapter<MenuPermission>) {
    super(adapter);
  }
}
