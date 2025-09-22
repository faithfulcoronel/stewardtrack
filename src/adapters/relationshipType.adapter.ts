import 'reflect-metadata';
import { injectable, inject } from 'inversify';
import { BaseAdapter, type IBaseAdapter, QueryOptions } from './base.adapter';
import { RelationshipType } from '../models/relationshipType.model';
import type { AuditService } from '../services/AuditService';
import { TYPES } from '../lib/types';

export type IRelationshipTypeAdapter = IBaseAdapter<RelationshipType>;

@injectable()
export class RelationshipTypeAdapter
  extends BaseAdapter<RelationshipType>
  implements IRelationshipTypeAdapter
{
  constructor(@inject(TYPES.AuditService) private auditService: AuditService) {
    super();
  }

  protected tableName = 'categories';

  protected defaultSelect = `
    id,
    code,
    name,
    description,
    is_system,
    is_active,
    sort_order,
    created_by,
    updated_by,
    created_at,
    updated_at
  `;

  protected defaultRelationships: QueryOptions['relationships'] = [];

  protected override async buildSecureQuery(options: QueryOptions = {}) {
    options.filters = {
      ...(options.filters || {}),
      type: { operator: 'eq', value: 'relationship_type' }
    };
    return super.buildSecureQuery(options);
  }

  protected override async onBeforeCreate(
    data: Partial<RelationshipType>
  ): Promise<Partial<RelationshipType>> {
    if (data.is_active === undefined) {
      data.is_active = true;
    }
    return { ...data, type: 'relationship_type' };
  }

  protected override async onAfterCreate(data: RelationshipType): Promise<void> {
    await this.auditService.logAuditEvent('create', 'category', data.id, data);
  }

  protected override async onAfterUpdate(data: RelationshipType): Promise<void> {
    await this.auditService.logAuditEvent('update', 'category', data.id, data);
  }

  protected override async onBeforeDelete(id: string): Promise<void> {
    const { data: relationships, error } = await this.supabase
      .from('family_relationships')
      .select('id')
      .eq('relationship_category_id', id)
      .limit(1);
    if (error) throw error;
    if (relationships?.length) {
      throw new Error('Cannot delete relationship type with existing relationships');
    }
  }

  protected override async onAfterDelete(id: string): Promise<void> {
    await this.auditService.logAuditEvent('delete', 'category', id, { id });
  }
}
