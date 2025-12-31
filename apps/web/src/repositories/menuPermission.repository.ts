import { injectable, inject } from 'inversify';
import { BaseRepository } from '@/repositories/base.repository';
import { MenuPermission } from '@/models/menuPermission.model';
import { TYPES } from '@/lib/types';
import type { IMenuPermissionAdapter } from '@/adapters/menuPermission.adapter';

export type IMenuPermissionRepository = BaseRepository<MenuPermission>;

@injectable()
export class MenuPermissionRepository
  extends BaseRepository<MenuPermission>
  implements IMenuPermissionRepository
{
  constructor(@inject(TYPES.IMenuPermissionAdapter) adapter: IMenuPermissionAdapter) {
    super(adapter);
  }
}
