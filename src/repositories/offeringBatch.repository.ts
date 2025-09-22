import { injectable, inject } from 'inversify';
import { BaseRepository } from './base.repository';
import { BaseAdapter } from '../adapters/base.adapter';
import { OfferingBatch } from '../models/offeringBatch.model';
import type { IOfferingBatchAdapter } from '../adapters/offeringBatch.adapter';
import { NotificationService } from '../services/NotificationService';
import { OfferingBatchValidator } from '../validators/offeringBatch.validator';

export type IOfferingBatchRepository = BaseRepository<OfferingBatch>;

@injectable()
export class OfferingBatchRepository
  extends BaseRepository<OfferingBatch>
  implements IOfferingBatchRepository
{
  constructor(@inject('IOfferingBatchAdapter') adapter: BaseAdapter<OfferingBatch>) {
    super(adapter);
  }

  protected override async beforeCreate(
    data: Partial<OfferingBatch>
  ): Promise<Partial<OfferingBatch>> {
    OfferingBatchValidator.validate(data);
    return data;
  }

  protected override async afterCreate(data: OfferingBatch): Promise<void> {
    NotificationService.showSuccess('Offering batch created successfully');
  }

  protected override async beforeUpdate(
    id: string,
    data: Partial<OfferingBatch>
  ): Promise<Partial<OfferingBatch>> {
    OfferingBatchValidator.validate(data);
    return data;
  }

  protected override async afterUpdate(data: OfferingBatch): Promise<void> {
    NotificationService.showSuccess('Offering batch updated successfully');
  }

  protected override async beforeDelete(id: string): Promise<void> {
    const batch = await this.findById(id);
    if (!batch) {
      throw new Error('Offering batch not found');
    }
  }

  protected override async afterDelete(id: string): Promise<void> {
    NotificationService.showSuccess('Offering batch deleted successfully');
  }
}
