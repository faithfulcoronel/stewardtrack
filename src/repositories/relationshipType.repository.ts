import { injectable, inject } from 'inversify';
import { BaseRepository } from './base.repository';
import { BaseAdapter } from '../adapters/base.adapter';
import { RelationshipType } from '../models/relationshipType.model';
import type { IRelationshipTypeAdapter } from '../adapters/relationshipType.adapter';
import { NotificationService } from '../services/NotificationService';

export type IRelationshipTypeRepository = BaseRepository<RelationshipType>;

@injectable()
export class RelationshipTypeRepository
  extends BaseRepository<RelationshipType>
  implements IRelationshipTypeRepository
{
  constructor(@inject('IRelationshipTypeAdapter') adapter: BaseAdapter<RelationshipType>) {
    super(adapter);
  }

  protected override async beforeCreate(
    data: Partial<RelationshipType>
  ): Promise<Partial<RelationshipType>> {
    return this.formatData(data);
  }

  protected override async afterCreate(data: RelationshipType): Promise<void> {
    NotificationService.showSuccess(`Relationship Type "${data.name}" created successfully`);
  }

  protected override async beforeUpdate(
    id: string,
    data: Partial<RelationshipType>
  ): Promise<Partial<RelationshipType>> {
    void id;
    return this.formatData(data);
  }

  protected override async afterUpdate(data: RelationshipType): Promise<void> {
    NotificationService.showSuccess(`Relationship Type "${data.name}" updated successfully`);
  }

  private formatData(data: Partial<RelationshipType>): Partial<RelationshipType> {
    return {
      ...data,
      code: data.code?.trim() || '',
      name: data.name?.trim() || '',
    };
  }
}
