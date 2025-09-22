import { injectable, inject } from 'inversify';
import { BaseRepository } from '@/repositories/base.repository';
import { BaseAdapter } from '@/adapters/base.adapter';
import { MenuPermission } from '@/models/menuPermission.model';
import { TYPES } from '@/lib/types';

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
