import 'reflect-metadata';
import { injectable } from 'inversify';
import { ApiBaseAdapter } from './apiBase.adapter';
import { RelationshipType } from '../../models/relationshipType.model';
import type { IRelationshipTypeAdapter } from '../relationshipType.adapter';

@injectable()
export class RelationshipTypeApiAdapter
  extends ApiBaseAdapter<RelationshipType>
  implements IRelationshipTypeAdapter
{
  protected basePath = '/relationshiptypes';

  protected mapFromApi(data: any): RelationshipType {
    return {
      id: data.id ?? data.Id,
      code: data.code ?? data.Code,
      name: data.name ?? data.Name,
      description: data.description ?? data.Description ?? null,
      is_system: data.is_system ?? data.IsSystem,
      is_active: data.is_active ?? data.IsActive,
      sort_order: data.sort_order ?? data.SortOrder,
      tenant_id: data.tenant_id ?? data.TenantId,
      created_at: data.created_at ?? data.CreatedAt,
      updated_at: data.updated_at ?? data.UpdatedAt,
      created_by: data.created_by ?? data.CreatedBy,
      updated_by: data.updated_by ?? data.UpdatedBy,
      deleted_at: data.deleted_at ?? data.DeletedAt
    } as RelationshipType;
  }

  protected mapToApi(data: Partial<RelationshipType>) {
    return {
      id: data.id,
      categoryType: 'relationship_type',
      code: data.code,
      name: data.name,
      description: data.description,
      isSystem: data.is_system,
      isActive: data.is_active,
      sortOrder: data.sort_order
    };
  }

  protected override async onBeforeCreate(
    data: Partial<RelationshipType>
  ): Promise<Partial<RelationshipType>> {
    if (data.is_active === undefined) {
      data.is_active = true;
    }
    return { ...data, type: 'relationship_type' };
  }
}
