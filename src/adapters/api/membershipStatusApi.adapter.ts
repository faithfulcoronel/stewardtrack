import 'reflect-metadata';
import { injectable } from 'inversify';
import { ApiBaseAdapter } from './apiBase.adapter';
import { MembershipStatus } from '../../models/membershipStatus.model';
import type { IMembershipStatusAdapter } from '../membershipStatus.adapter';


@injectable()
export class MembershipStatusApiAdapter
  extends ApiBaseAdapter<MembershipStatus>
  implements IMembershipStatusAdapter
{
  protected basePath = '/membershipstatuses';

  protected mapFromApi(data: any): MembershipStatus {
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
    } as MembershipStatus;
  }

  protected mapToApi(data: Partial<MembershipStatus>) {
    return {
      id: data.id,
      code: data.code,
      name: data.name,
      description: data.description,
      isSystem: data.is_system,
      isActive: data.is_active,
      sortOrder: data.sort_order
    };
  }

  protected override async onBeforeCreate(
    data: Partial<MembershipStatus>
  ): Promise<Partial<MembershipStatus>> {
    if (data.is_active === undefined) {
      data.is_active = true;
    }
    return data;
  }
}
