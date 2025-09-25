import { injectable, inject } from 'inversify';
import { BaseRepository } from '@/repositories/base.repository';
import { MenuItem } from '@/models/menuItem.model';
import { TYPES } from '@/lib/types';
import type { IMenuItemAdapter } from '@/adapters/menuItem.adapter';

export type IMenuItemRepository = BaseRepository<MenuItem>;

@injectable()
export class MenuItemRepository
  extends BaseRepository<MenuItem>
  implements IMenuItemRepository
{
  constructor(@inject(TYPES.IMenuItemAdapter) adapter: IMenuItemAdapter) {
    super(adapter);
  }
}
