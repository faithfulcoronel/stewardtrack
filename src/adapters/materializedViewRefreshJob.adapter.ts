import 'server-only';
import 'reflect-metadata';
import { injectable } from 'inversify';
import { BaseAdapter, type IBaseAdapter, QueryOptions } from '@/adapters/base.adapter';
import { MaterializedViewRefreshJob } from '@/models/materializedViewRefreshJob.model';

export interface IMaterializedViewRefreshJobAdapter extends IBaseAdapter<MaterializedViewRefreshJob> {
  refreshView(rpcFunction: string): Promise<void>;
  getViewRowCount(viewName: string): Promise<number | null>;
  getCurrentUserId(): Promise<string | null>;
}

@injectable()
export class MaterializedViewRefreshJobAdapter
  extends BaseAdapter<MaterializedViewRefreshJob>
  implements IMaterializedViewRefreshJobAdapter
{
  protected tableName = 'materialized_view_refresh_jobs';

  protected defaultSelect = `
    id,
    view_name,
    started_at,
    completed_at,
    duration_ms,
    row_count,
    success,
    error_message,
    concurrent,
    triggered_by,
    created_at,
    updated_at
  `;

  protected defaultRelationships: QueryOptions['relationships'] = [];

  /**
   * Execute RPC function to refresh a materialized view
   */
  async refreshView(rpcFunction: string): Promise<void> {
    const supabase = await this.getSupabaseClient();
    const { error } = await supabase.rpc(rpcFunction);

    if (error) {
      throw error;
    }
  }

  /**
   * Get row count from a materialized view
   */
  async getViewRowCount(viewName: string): Promise<number | null> {
    const supabase = await this.getSupabaseClient();
    const { count } = await supabase
      .from(viewName)
      .select('*', { count: 'exact', head: true });

    return count;
  }

  /**
   * Get current user ID
   */
  async getCurrentUserId(): Promise<string | null> {
    const supabase = await this.getSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    return user?.id || null;
  }
}
