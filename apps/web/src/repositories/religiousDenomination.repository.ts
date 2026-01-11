import { injectable, inject } from 'inversify';

import { BaseRepository } from '@/repositories/base.repository';
import { ReligiousDenomination } from '@/models/religiousDenomination.model';
import { NotificationService } from '@/services/NotificationService';
import { TYPES } from '@/lib/types';
import type { IReligiousDenominationAdapter } from '@/adapters/religiousDenomination.adapter';

export type IReligiousDenominationRepository = BaseRepository<ReligiousDenomination>;

@injectable()
export class ReligiousDenominationRepository
  extends BaseRepository<ReligiousDenomination>
  implements IReligiousDenominationRepository
{
  constructor(@inject(TYPES.IReligiousDenominationAdapter) adapter: IReligiousDenominationAdapter) {
    super(adapter);
  }

  protected override async beforeCreate(
    data: Partial<ReligiousDenomination>
  ): Promise<Partial<ReligiousDenomination>> {
    return this.formatData(data);
  }

  protected override async afterCreate(data: ReligiousDenomination): Promise<void> {
    NotificationService.showSuccess(`Denomination "${data.name}" created successfully`);
  }

  protected override async beforeUpdate(
    id: string,
    data: Partial<ReligiousDenomination>
  ): Promise<Partial<ReligiousDenomination>> {
    return this.formatData(data);
  }

  protected override async afterUpdate(data: ReligiousDenomination): Promise<void> {
    NotificationService.showSuccess(`Denomination "${data.name}" updated successfully`);
  }

  private formatData(data: Partial<ReligiousDenomination>): Partial<ReligiousDenomination> {
    return {
      ...data,
      code: data.code?.trim() || '',
      name: data.name?.trim() || '',
    };
  }
}
