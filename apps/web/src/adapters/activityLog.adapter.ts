import 'server-only';
import 'reflect-metadata';
import { injectable } from 'inversify';
import { BaseAdapter, type IBaseAdapter } from '@/adapters/base.adapter';
import type { ActivityLog, CreateActivityLogInput } from '@/models/activityLog.model';

export interface IActivityLogAdapter extends IBaseAdapter<ActivityLog> {
  createActivityLog(input: CreateActivityLogInput): Promise<void>;
}

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

  async createActivityLog(input: CreateActivityLogInput): Promise<void> {
    const supabase = await this.getSupabaseClient();

    const { error} = await supabase
      .from(this.tableName)
      .insert([input]);

    if (error) {
      throw new Error(`Failed to create activity log: ${error.message}`);
    }
  }
}
