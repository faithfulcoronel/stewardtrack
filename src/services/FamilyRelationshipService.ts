import { injectable, inject } from 'inversify';
import { TYPES } from '../lib/types';
import type { IFamilyRelationshipRepository } from '../repositories/familyRelationship.repository';
import type { FamilyRelationship } from '../models/familyRelationship.model';
import type { QueryOptions } from '../adapters/base.adapter';
import type { CrudService } from './CrudService';

@injectable()
export class FamilyRelationshipService
  implements CrudService<FamilyRelationship>
{
  constructor(
    @inject(TYPES.IFamilyRelationshipRepository)
    private repo: IFamilyRelationshipRepository,
  ) {}

  find(options: QueryOptions = {}) {
    return this.repo.find(options);
  }

  findAll(options: Omit<QueryOptions, 'pagination'> = {}) {
    return this.repo.findAll(options);
  }

  findById(id: string, options: Omit<QueryOptions, 'pagination'> = {}) {
    return this.repo.findById(id, options);
  }

  create(
    data: Partial<FamilyRelationship>,
    relations?: Record<string, any[]>,
    fieldsToRemove: string[] = [],
  ) {
    return this.repo.create(data, relations, fieldsToRemove);
  }

  update(
    id: string,
    data: Partial<FamilyRelationship>,
    relations?: Record<string, any[]>,
    fieldsToRemove: string[] = [],
  ) {
    return this.repo.update(id, data, relations, fieldsToRemove);
  }

  delete(id: string) {
    return this.repo.delete(id);
  }
}
