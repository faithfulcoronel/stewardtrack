import { injectable, inject } from 'inversify';
import { BaseRepository } from './base.repository';
import { BaseAdapter } from '../adapters/base.adapter';
import { MenuItem } from '../models/menuItem.model';
import type { IMenuItemAdapter } from '../adapters/menuItem.adapter';
import { TYPES } from '../lib/types';

export type IMenuItemRepository = BaseRepository<MenuItem>;

@injectable()
export class MenuItemRepository
  extends BaseRepository<MenuItem>
  implements IMenuItemRepository
{
  constructor(@inject(TYPES.IMenuItemAdapter) adapter: BaseAdapter<MenuItem>) {
    super(adapter);
  }
}
