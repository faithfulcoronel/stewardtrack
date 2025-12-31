import { injectable, inject } from 'inversify';
import { BaseRepository } from '@/repositories/base.repository';
import { FamilyRelationship } from '@/models/familyRelationship.model';
import { TYPES } from '@/lib/types';
import type { IFamilyRelationshipAdapter } from '@/adapters/familyRelationship.adapter';

export type IFamilyRelationshipRepository = BaseRepository<FamilyRelationship>;

@injectable()
export class FamilyRelationshipRepository
  extends BaseRepository<FamilyRelationship>
  implements IFamilyRelationshipRepository
{
  constructor(
    @inject(TYPES.IFamilyRelationshipAdapter) adapter: IFamilyRelationshipAdapter,
  ) {
    super(adapter);
  }
}
