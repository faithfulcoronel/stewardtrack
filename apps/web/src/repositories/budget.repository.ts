import { injectable, inject } from 'inversify';
import { BaseRepository } from '@/repositories/base.repository';
import { Budget } from '@/models/budget.model';
import { NotificationService } from '@/services/NotificationService';
import { TYPES } from '@/lib/types';
import type { IBudgetAdapter } from '@/adapters/budget.adapter';

export type IBudgetRepository = BaseRepository<Budget>;

@injectable()
export class BudgetRepository
  extends BaseRepository<Budget>
  implements IBudgetRepository
{
  constructor(@inject(TYPES.IBudgetAdapter) adapter: IBudgetAdapter) {
    super(adapter);
  }

  protected override async beforeCreate(data: Partial<Budget>): Promise<Partial<Budget>> {
    return this.formatData(data);
  }

  protected override async beforeUpdate(id: string, data: Partial<Budget>): Promise<Partial<Budget>> {
    return this.formatData(data);
  }

  protected override async afterCreate(data: Budget): Promise<void> {
    NotificationService.showSuccess(`Budget "${data.name}" created successfully`);
  }

  protected override async afterUpdate(data: Budget): Promise<void> {
    NotificationService.showSuccess(`Budget "${data.name}" updated successfully`);
  }

  private formatData(data: Partial<Budget>): Partial<Budget> {
    return {
      ...data,
      name: data.name?.trim(),
      description: data.description?.trim() ?? null,
    };
  }
}
