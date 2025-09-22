import { injectable, inject } from 'inversify';
import { BaseRepository } from './base.repository';
import { BaseAdapter } from '../adapters/base.adapter';
import { Category } from '../models/category.model';
import type { ICategoryAdapter } from '../adapters/category.adapter';
import { NotificationService } from '../services/NotificationService';
import { CategoryValidator } from '../validators/category.validator';

export type ICategoryRepository = BaseRepository<Category>;

@injectable()
export class CategoryRepository
  extends BaseRepository<Category>
  implements ICategoryRepository
{
  constructor(@inject('ICategoryAdapter') adapter: BaseAdapter<Category>) {
    super(adapter);
  }

  protected override async beforeCreate(data: Partial<Category>): Promise<Partial<Category>> {
    CategoryValidator.validate(data);
    return this.formatData(data);
  }

  protected override async afterCreate(data: Category): Promise<void> {
    NotificationService.showSuccess(`Category "${data.name}" created successfully`);
  }

  protected override async beforeUpdate(id: string, data: Partial<Category>): Promise<Partial<Category>> {
    CategoryValidator.validate(data);
    return this.formatData(data);
  }

  protected override async afterUpdate(data: Category): Promise<void> {
    NotificationService.showSuccess(`Category "${data.name}" updated successfully`);
  }

  private formatData(data: Partial<Category>): Partial<Category> {
    return {
      ...data,
      code: data.code?.trim(),
      name: data.name?.trim()
    };
  }
}
