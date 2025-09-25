import { injectable, inject } from 'inversify';
import { BaseRepository } from '@/repositories/base.repository';
import { Category } from '@/models/category.model';
import { NotificationService } from '@/services/NotificationService';
import { CategoryValidator } from '@/validators/category.validator';
import { TYPES } from '@/lib/types';
import type { ICategoryAdapter } from '@/adapters/category.adapter';

export type ICategoryRepository = BaseRepository<Category>;

@injectable()
export class CategoryRepository
  extends BaseRepository<Category>
  implements ICategoryRepository
{
  constructor(@inject(TYPES.ICategoryAdapter) adapter: ICategoryAdapter) {
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
