import 'reflect-metadata';
import { injectable } from 'inversify';
import { ApiBaseAdapter } from './apiBase.adapter';
import { Announcement } from '../../models/announcement.model';
import type { IAnnouncementAdapter } from '../announcement.adapter';


@injectable()
export class AnnouncementApiAdapter
  extends ApiBaseAdapter<Announcement>
  implements IAnnouncementAdapter
{
  protected basePath = '/announcements';

  protected mapFromApi(data: any): Announcement {
    return {
      id: data.id ?? data.Id,
      tenant_id: data.tenant_id ?? data.TenantId,
      message: data.message ?? data.Message,
      active: data.active ?? data.Active,
      starts_at: data.starts_at ?? data.StartsAt ?? null,
      ends_at: data.ends_at ?? data.EndsAt ?? null,
      created_at: data.created_at ?? data.CreatedAt,
      updated_at: data.updated_at ?? data.UpdatedAt,
      created_by: data.created_by ?? data.CreatedBy,
      updated_by: data.updated_by ?? data.UpdatedBy,
      deleted_at: data.deleted_at ?? data.DeletedAt,
    } as Announcement;
  }

  protected mapToApi(data: Partial<Announcement>) {
    return {
      id: data.id,
      message: data.message,
      active: data.active,
      startsAt: data.starts_at,
      endsAt: data.ends_at,
    };
  }
}
