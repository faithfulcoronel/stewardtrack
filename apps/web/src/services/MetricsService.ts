import 'server-only';
import { injectable, inject } from 'inversify';
import { TYPES } from '@/lib/types';
import type { IPerformanceMetricRepository } from '@/repositories/performanceMetric.repository';

/**
 * MetricsService
 *
 * Tracks and stores performance metrics for the licensing system:
 * - Permission check latency (p50, p95, p99)
 * - API endpoint response times
 * - Materialized view refresh duration
 * - License validation execution time
 * - Onboarding completion time
 */

export interface PerformanceMetric {
  metric_name: string;
  metric_value: number;
  metric_unit: 'ms' | 'seconds' | 'count' | 'percentage';
  tenant_id?: string;
  user_id?: string;
  metadata?: Record<string, any>;
  recorded_at: Date;
}

export interface LatencyPercentiles {
  p50: number;
  p95: number;
  p99: number;
  avg: number;
  min: number;
  max: number;
  count: number;
}

@injectable()
export class MetricsService {
  constructor(
    @inject(TYPES.IPerformanceMetricRepository) private performanceMetricRepository: IPerformanceMetricRepository
  ) {}

  /**
   * Record a performance metric
   */
  async recordMetric(metric: PerformanceMetric): Promise<void> {
    try {
      await this.performanceMetricRepository.create({
        metric_name: metric.metric_name,
        metric_value: metric.metric_value,
        metric_unit: metric.metric_unit,
        tenant_id: metric.tenant_id,
        user_id: metric.user_id,
        metadata: metric.metadata || {},
        recorded_at: metric.recorded_at.toISOString(),
      });
    } catch (error) {
      console.error('Error recording metric:', error);
      // Don't throw - metrics failures shouldn't break the app
    }
  }

  /**
   * Record permission check latency
   */
  async recordPermissionCheckLatency(
    durationMs: number,
    tenantId: string,
    userId: string,
    surfaceId?: string
  ): Promise<void> {
    await this.recordMetric({
      metric_name: 'permission_check_latency',
      metric_value: durationMs,
      metric_unit: 'ms',
      tenant_id: tenantId,
      user_id: userId,
      metadata: { surface_id: surfaceId },
      recorded_at: new Date(),
    });
  }

  /**
   * Record API endpoint response time
   */
  async recordApiLatency(
    endpoint: string,
    method: string,
    durationMs: number,
    statusCode: number
  ): Promise<void> {
    await this.recordMetric({
      metric_name: 'api_latency',
      metric_value: durationMs,
      metric_unit: 'ms',
      metadata: {
        endpoint,
        method,
        status_code: statusCode,
      },
      recorded_at: new Date(),
    });
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
  ): Promise<LatencyPercentiles> {
    return this.performanceMetricRepository.getLatencyPercentiles(metricName, options);
  }

  /**
   * Get metrics summary for dashboard
   */
  async getMetricsSummary(
    startDate?: Date,
    endDate?: Date
  ): Promise<{
    permission_check_latency: LatencyPercentiles;
    api_latency: LatencyPercentiles;
    view_refresh_latency: LatencyPercentiles;
  }> {
    const [permissionLatency, apiLatency, viewRefreshLatency] = await Promise.all([
      this.getLatencyPercentiles('permission_check_latency', { startDate, endDate }),
      this.getLatencyPercentiles('api_latency', { startDate, endDate }),
      this.getLatencyPercentiles('materialized_view_refresh', { startDate, endDate }),
    ]);

    return {
      permission_check_latency: permissionLatency,
      api_latency: apiLatency,
      view_refresh_latency: viewRefreshLatency,
    };
  }

  /**
   * Clean up old metrics (retention policy)
   */
  async cleanupOldMetrics(retentionDays: number = 90): Promise<number> {
    return this.performanceMetricRepository.cleanupOldMetrics(retentionDays);
  }
}
