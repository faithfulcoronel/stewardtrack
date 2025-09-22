import { injectable, inject } from 'inversify';
import { BaseRepository } from './base.repository';
import { BaseAdapter } from '../adapters/base.adapter';
import { FamilyRelationship } from '../models/familyRelationship.model';
import type { IFamilyRelationshipAdapter } from '../adapters/familyRelationship.adapter';

export type IFamilyRelationshipRepository = BaseRepository<FamilyRelationship>;

@injectable()
export class FamilyRelationshipRepository
  extends BaseRepository<FamilyRelationship>
  implements IFamilyRelationshipRepository
{
  constructor(
    @inject('IFamilyRelationshipAdapter') adapter: BaseAdapter<FamilyRelationship>,
  ) {
    super(adapter);
  }
}
