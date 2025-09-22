import 'server-only';
import 'reflect-metadata';
import { injectable } from 'inversify';
import { BaseAdapter, type IBaseAdapter } from '@/adapters/base.adapter';
import { ActivityLog } from '@/models/activityLog.model';

export type IActivityLogAdapter = IBaseAdapter<ActivityLog>;

@injectable()
export class ActivityLogAdapter
  extends BaseAdapter<ActivityLog>
  implements IActivityLogAdapter
{
  protected tableName = 'audit_logs';

  protected defaultSelect = `
    id,
    action,
    entity_type,
    entity_id,
    changes,
    created_at,
    performed_by
  `;

  protected defaultRelationships = [
    {
      table: 'auth.users',
      alias: 'auth_users',
      foreignKey: 'performed_by',
      select: ['id', 'email', 'raw_user_meta_data'],
    },
  ];
}
