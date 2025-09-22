import { injectable, inject } from 'inversify';
import { BaseRepository } from '@/repositories/base.repository';
import { BaseAdapter } from '@/adapters/base.adapter';
import { FamilyRelationship } from '@/models/familyRelationship.model';
import { TYPES } from '@/lib/types';

export type IFamilyRelationshipRepository = BaseRepository<FamilyRelationship>;

@injectable()
export class FamilyRelationshipRepository
  extends BaseRepository<FamilyRelationship>
  implements IFamilyRelationshipRepository
{
  constructor(
    @inject(TYPES.IFamilyRelationshipAdapter) adapter: BaseAdapter<FamilyRelationship>,
  ) {
    super(adapter);
  }
}
