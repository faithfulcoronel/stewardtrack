import 'server-only';
import 'reflect-metadata';
import { injectable, inject } from 'inversify';
import { BaseAdapter, type IBaseAdapter, QueryOptions } from '@/adapters/base.adapter';
import { ReligiousDenomination } from '@/models/religiousDenomination.model';
import type { AuditService } from '@/services/AuditService';
import { TYPES } from '@/lib/types';

export type IReligiousDenominationAdapter = IBaseAdapter<ReligiousDenomination>;

@injectable()
export class ReligiousDenominationAdapter
  extends BaseAdapter<ReligiousDenomination>
  implements IReligiousDenominationAdapter
{
  constructor(@inject(TYPES.AuditService) private auditService: AuditService) {
    super();
  }

  protected tableName = 'religious_denominations';

  protected defaultSelect = `
    id,
    tenant_id,
    code,
    name,
    description,
    sort_order,
    is_active,
    created_at,
    updated_at
  `;

  protected defaultRelationships: QueryOptions['relationships'] = [];

  protected override async onBeforeCreate(
    data: Partial<ReligiousDenomination>
  ): Promise<Partial<ReligiousDenomination>> {
    if (data.is_active === undefined) {
      data.is_active = true;
    }
    // Generate code from name if not provided
    if (!data.code && data.name) {
      data.code = data.name.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
    }
    return data;
  }

  protected override async onAfterCreate(data: ReligiousDenomination): Promise<void> {
    await this.auditService.logAuditEvent('create', 'religious_denominations', data.id, data);
  }

  protected override async onAfterUpdate(data: ReligiousDenomination): Promise<void> {
    await this.auditService.logAuditEvent('update', 'religious_denominations', data.id, data);
  }

  protected override async onBeforeDelete(id: string): Promise<void> {
    const supabase = await this.getSupabaseClient();
    const { data: members, error } = await supabase
      .from('members')
      .select('id')
      .eq('denomination_id', id)
      .limit(1);
    if (error) throw error;
    if (members?.length) {
      throw new Error('Cannot delete denomination with existing members');
    }
  }

  protected override async onAfterDelete(id: string): Promise<void> {
    await this.auditService.logAuditEvent('delete', 'religious_denominations', id, { id });
  }
}
