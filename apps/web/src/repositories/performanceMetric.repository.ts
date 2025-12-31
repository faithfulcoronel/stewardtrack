import 'server-only';
import { injectable, inject } from 'inversify';
import { BaseRepository } from '@/repositories/base.repository';
import { PerformanceMetric } from '@/models/performanceMetric.model';
import { TYPES } from '@/lib/types';
import type { IPerformanceMetricAdapter } from '@/adapters/performanceMetric.adapter';

export interface IPerformanceMetricRepository extends BaseRepository<PerformanceMetric> {
  getLatencyPercentiles(
    metricName: string,
    options?: {
      startDate?: Date;
      endDate?: Date;
      tenantId?: string;
    }
  ): Promise<{
    p50: number;
    p95: number;
    p99: number;
    avg: number;
    min: number;
    max: number;
    count: number;
  }>;
  cleanupOldMetrics(retentionDays: number): Promise<number>;
}

@injectable()
export class PerformanceMetricRepository
  extends BaseRepository<PerformanceMetric>
  implements IPerformanceMetricRepository
{
  constructor(@inject(TYPES.IPerformanceMetricAdapter) adapter: IPerformanceMetricAdapter) {
    super(adapter);
  }

  /**
   * Get latency percentiles for a metric
   */
  async getLatencyPercentiles(
    metricName: string,
    options: {
      startDate?: Date;
      endDate?: Date;
      tenantId?: string;
    } = {}
  ): Promise<{
    p50: number;
    p95: number;
    p99: number;
    avg: number;
    min: number;
    max: number;
    count: number;
  }> {
    const filters: Record<string, any> = {
      metric_name: metricName,
    };

    if (options.tenantId) {
      filters.tenant_id = options.tenantId;
    }

    if (options.startDate) {
      filters.recorded_at = { operator: 'gte', value: options.startDate.toISOString() };
    }

    if (options.endDate) {
      if (filters.recorded_at) {
        // Need to handle multiple conditions on same field
        // For now, we'll query all and filter in memory
      } else {
        filters.recorded_at = { operator: 'lte', value: options.endDate.toISOString() };
      }
    }

    const { data } = await this.adapter.fetchAll({
      filters,
      order: { column: 'metric_value', ascending: true },
    });

    // Filter by date range if needed (both start and end)
    let values = data.map(d => d.metric_value);

    if (options.startDate && options.endDate) {
      const startTime = options.startDate.getTime();
      const endTime = options.endDate.getTime();

      values = data
        .filter(d => {
          const recordedTime = new Date(d.recorded_at).getTime();
          return recordedTime >= startTime && recordedTime <= endTime;
        })
        .map(d => d.metric_value);
    }

    values = values.sort((a, b) => a - b);
    const count = values.length;

    if (count === 0) {
      return {
        p50: 0,
        p95: 0,
        p99: 0,
        avg: 0,
        min: 0,
        max: 0,
        count: 0,
      };
    }

    const p50Index = Math.floor(count * 0.5);
    const p95Index = Math.floor(count * 0.95);
    const p99Index = Math.floor(count * 0.99);

    const sum = values.reduce((a, b) => a + b, 0);

    return {
      p50: values[p50Index] || 0,
      p95: values[p95Index] || 0,
      p99: values[p99Index] || 0,
      avg: sum / count,
      min: values[0] || 0,
      max: values[count - 1] || 0,
      count,
    };
  }

  /**
   * Clean up old metrics (retention policy)
   */
  async cleanupOldMetrics(retentionDays: number = 90): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    // Note: BaseRepository doesn't have bulk delete with filters
    // We need to get access to the adapter's underlying client
    // For now, we'll fetch and delete individually (not optimal but follows architecture)

    const { data } = await this.adapter.fetchAll({
      filters: {
        recorded_at: { operator: 'lt', value: cutoffDate.toISOString() },
      },
    });

    for (const metric of data) {
      await this.delete(metric.id);
    }

    return data.length;
  }
}
