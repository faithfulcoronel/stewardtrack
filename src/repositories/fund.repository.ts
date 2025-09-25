import { injectable, inject } from 'inversify';
import { BaseRepository } from '@/repositories/base.repository';
import { Fund } from '@/models/fund.model';
import type { IFundAdapter } from '@/adapters/fund.adapter';
import { NotificationService } from '@/services/NotificationService';
import { FundValidator } from '@/validators/fund.validator';
import { TYPES } from '@/lib/types';

export type IFundRepository = BaseRepository<Fund>;

@injectable()
export class FundRepository
  extends BaseRepository<Fund>
  implements IFundRepository
{
  constructor(@inject(TYPES.IFundAdapter) adapter: IFundAdapter) {
    super(adapter);
  }

  protected override async beforeCreate(data: Partial<Fund>): Promise<Partial<Fund>> {
    FundValidator.validate(data);
    return this.formatFundData(data);
  }

  protected override async afterCreate(data: Fund): Promise<void> {
    NotificationService.showSuccess(`Fund "${data.name}" created successfully`);
  }

  protected override async beforeUpdate(id: string, data: Partial<Fund>): Promise<Partial<Fund>> {
    FundValidator.validate(data);
    return this.formatFundData(data);
  }

  protected override async afterUpdate(data: Fund): Promise<void> {
    NotificationService.showSuccess(`Fund "${data.name}" updated successfully`);
  }

  private formatFundData(data: Partial<Fund>): Partial<Fund> {
    return {
      ...data,
      code: data.code?.trim().toUpperCase(),
      name: data.name?.trim(),
      description: data.description?.trim(),
    };
  }
}
