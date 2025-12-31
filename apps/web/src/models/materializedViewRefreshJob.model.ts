import { BaseModel } from './base.model';

export interface MaterializedViewRefreshJob extends BaseModel {
  view_name: string;
  started_at: string;
  completed_at: string | null;
  duration_ms: number | null;
  row_count: number | null;
  success: boolean;
  error_message: string | null;
  concurrent: boolean;
  triggered_by: string | null;
}
