import 'server-only';
import 'reflect-metadata';
import { injectable } from 'inversify';
import { BaseAdapter, type IBaseAdapter, QueryOptions } from '@/adapters/base.adapter';
import { PerformanceMetric } from '@/models/performanceMetric.model';

export type IPerformanceMetricAdapter = IBaseAdapter<PerformanceMetric>;

@injectable()
export class PerformanceMetricAdapter
  extends BaseAdapter<PerformanceMetric>
  implements IPerformanceMetricAdapter
{
  protected tableName = 'performance_metrics';

  protected defaultSelect = `
    id,
    metric_name,
    metric_value,
    metric_unit,
    tenant_id,
    user_id,
    metadata,
    recorded_at,
    created_at,
    updated_at
  `;

  protected defaultRelationships: QueryOptions['relationships'] = [];
}
