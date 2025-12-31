import { BaseModel } from './base.model';

export interface PerformanceMetric extends BaseModel {
  metric_name: string;
  metric_value: number;
  metric_unit: 'ms' | 'seconds' | 'count' | 'percentage';
  user_id?: string;
  metadata?: Record<string, any>;
  recorded_at: string;
}
