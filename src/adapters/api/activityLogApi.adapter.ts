import 'reflect-metadata';
import { injectable } from 'inversify';
import { ApiBaseAdapter } from './apiBase.adapter';
import { ActivityLog } from '../../models/activityLog.model';
import type { IActivityLogAdapter } from '../activityLog.adapter';


@injectable()
export class ActivityLogApiAdapter
  extends ApiBaseAdapter<ActivityLog>
  implements IActivityLogAdapter
{
  protected basePath = '/activitylogs';

  protected mapFromApi(data: any): ActivityLog {
    return {
      id: data.id ?? data.Id,
      action: data.action ?? data.Action,
      entity_type: data.entity_type ?? data.EntityType,
      entity_id: data.entity_id ?? data.EntityId,
      changes: data.changes ?? data.Changes ?? null,
      performed_by: data.performed_by ?? data.PerformedBy,
      tenant_id: data.tenant_id ?? data.TenantId,
      created_at: data.created_at ?? data.CreatedAt,
      updated_at: data.updated_at ?? data.UpdatedAt,
      created_by: data.created_by ?? data.CreatedBy,
      updated_by: data.updated_by ?? data.UpdatedBy,
      deleted_at: data.deleted_at ?? data.DeletedAt,
      auth_users: data.auth_users ?? data.AuthUsers
        ? {
            id: data.auth_users?.id ?? data.AuthUsers?.Id,
            email: data.auth_users?.email ?? data.AuthUsers?.Email,
            raw_user_meta_data:
              data.auth_users?.raw_user_meta_data ?? data.AuthUsers?.RawUserMetaData ?? undefined,
          }
        : undefined,
    } as ActivityLog;
  }

  protected mapToApi(data: Partial<ActivityLog>) {
    return {
      id: data.id,
      action: data.action,
      entityType: data.entity_type,
      entityId: data.entity_id,
      changes: data.changes,
      performedBy: data.performed_by,
    };
  }
}
