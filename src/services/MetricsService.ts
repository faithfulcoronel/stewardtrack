import 'server-only';
import { injectable } from 'inversify';
import { createSupabaseServerClient } from '@/lib/supabase/server';

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
  tenant_id?: string | null;
  user_id?: string | null;
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
  /**
   * Record a performance metric
   */
  async recordMetric(metric: PerformanceMetric): Promise<void> {
    try {
      const supabase = await createSupabaseServerClient();

      await supabase.from('performance_metrics').insert({
        metric_name: metric.metric_name,
        metric_value: metric.metric_value,
        metric_unit: metric.metric_unit,
        tenant_id: metric.tenant_id || null,
        user_id: metric.user_id || null,
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
    const supabase = await createSupabaseServerClient();

    let query = supabase
      .from('performance_metrics')
      .select('metric_value')
      .eq('metric_name', metricName)
      .order('metric_value', { ascending: true });

    if (options.startDate) {
      query = query.gte('recorded_at', options.startDate.toISOString());
    }

    if (options.endDate) {
      query = query.lte('recorded_at', options.endDate.toISOString());
    }

    if (options.tenantId) {
      query = query.eq('tenant_id', options.tenantId);
    }

    const { data, error } = await query;

    if (error || !data || data.length === 0) {
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

    const values = data.map(d => d.metric_value).sort((a, b) => a - b);
    const count = values.length;

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
    const supabase = await createSupabaseServerClient();

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    const { count, error } = await supabase
      .from('performance_metrics')
      .delete()
      .lt('recorded_at', cutoffDate.toISOString());

    if (error) {
      console.error('Error cleaning up old metrics:', error);
      return 0;
    }

    return count || 0;
  }
}
