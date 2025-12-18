import 'server-only';
import { injectable, inject } from 'inversify';
import { BaseRepository } from '@/repositories/base.repository';
import { MaterializedViewRefreshJob } from '@/models/materializedViewRefreshJob.model';
import { TYPES } from '@/lib/types';
import type { IMaterializedViewRefreshJobAdapter } from '@/adapters/materializedViewRefreshJob.adapter';

export interface RefreshMetrics {
  viewName: string;
  startTime: Date;
  endTime: Date;
  durationMs: number;
  rowCount: number | null;
  success: boolean;
  error?: string;
  concurrent: boolean;
}

export interface IMaterializedViewRefreshJobRepository extends BaseRepository<MaterializedViewRefreshJob> {
  refreshTenantLicenseSummary(): Promise<RefreshMetrics>;
  refreshEffectiveSurfaceAccess(): Promise<RefreshMetrics>;
  refreshTenantUserEffectivePermissions(): Promise<RefreshMetrics>;
  getRefreshHistory(viewName: string, limit?: number): Promise<MaterializedViewRefreshJob[]>;
  getLatestRefreshMetrics(): Promise<MaterializedViewRefreshJob[]>;
  getStaleViews(maxAgeMinutes?: number): Promise<string[]>;
}

@injectable()
export class MaterializedViewRefreshJobRepository
  extends BaseRepository<MaterializedViewRefreshJob>
  implements IMaterializedViewRefreshJobRepository
{
  constructor(@inject(TYPES.IMaterializedViewRefreshJobAdapter) private mvAdapter: IMaterializedViewRefreshJobAdapter) {
    super(mvAdapter);
  }

  /**
   * Refreshes the tenant license summary materialized view
   */
  async refreshTenantLicenseSummary(): Promise<RefreshMetrics> {
    return this.refreshView(
      'tenant_license_summary',
      'refresh_tenant_license_summary_concurrent',
      'refresh_tenant_license_summary'
    );
  }

  /**
   * Refreshes the effective surface access materialized view
   */
  async refreshEffectiveSurfaceAccess(): Promise<RefreshMetrics> {
    return this.refreshView(
      'effective_surface_access',
      'refresh_effective_surface_access_concurrent',
      'refresh_effective_surface_access'
    );
  }

  /**
   * Refreshes the tenant user effective permissions materialized view
   */
  async refreshTenantUserEffectivePermissions(): Promise<RefreshMetrics> {
    const viewName = 'tenant_user_effective_permissions';
    const startTime = new Date();
    let success = false;
    let error: string | undefined;
    let concurrent = true;
    let rowCount: number | null = null;

    try {
      await this.mvAdapter.refreshView('refresh_tenant_user_effective_permissions_safe');
      success = true;
      concurrent = true;

      rowCount = await this.mvAdapter.getViewRowCount(viewName);
    } catch (err: any) {
      success = false;
      error = err.message;
      console.error(`Error refreshing ${viewName}:`, err);
    }

    const endTime = new Date();
    const durationMs = endTime.getTime() - startTime.getTime();

    const metrics: RefreshMetrics = {
      viewName,
      startTime,
      endTime,
      durationMs,
      rowCount,
      success,
      error,
      concurrent,
    };

    await this.logRefreshOperation(metrics);

    return metrics;
  }

  /**
   * Gets the refresh history for a specific view
   */
  async getRefreshHistory(viewName: string, limit: number = 50): Promise<MaterializedViewRefreshJob[]> {
    const { data } = await this.adapter.fetch({
      filters: {
        view_name: viewName,
      },
      order: { column: 'started_at', ascending: false },
      pagination: { page: 1, pageSize: limit },
    });

    return data;
  }

  /**
   * Gets the latest refresh metrics for all views
   */
  async getLatestRefreshMetrics(): Promise<MaterializedViewRefreshJob[]> {
    const { data } = await this.adapter.fetch({
      order: { column: 'started_at', ascending: false },
      pagination: { page: 1, pageSize: 100 },
    });

    // Get the latest for each view
    const viewMap = new Map<string, MaterializedViewRefreshJob>();

    for (const record of data) {
      if (!viewMap.has(record.view_name)) {
        viewMap.set(record.view_name, record);
      }
    }

    return Array.from(viewMap.values());
  }

  /**
   * Checks if any view needs refresh based on staleness threshold
   */
  async getStaleViews(maxAgeMinutes: number = 60): Promise<string[]> {
    const latest = await this.getLatestRefreshMetrics();
    const staleViews: string[] = [];
    const now = new Date();
    const thresholdMs = maxAgeMinutes * 60 * 1000;

    const allViews = [
      'tenant_user_effective_permissions',
      'tenant_license_summary',
      'effective_surface_access',
    ];

    for (const viewName of allViews) {
      const record = latest.find(r => r.view_name === viewName);

      if (!record) {
        staleViews.push(viewName);
      } else {
        const completedAt = record.completed_at ? new Date(record.completed_at) : null;
        if (!completedAt || (now.getTime() - completedAt.getTime()) > thresholdMs) {
          staleViews.push(viewName);
        }
      }
    }

    return staleViews;
  }

  /**
   * Generic refresh view method
   */
  private async refreshView(
    viewName: string,
    concurrentRpcName: string,
    regularRpcName: string
  ): Promise<RefreshMetrics> {
    const startTime = new Date();
    let success = false;
    let error: string | undefined;
    let concurrent = true;
    let rowCount: number | null = null;

    try {
      // Try concurrent refresh first
      try {
        await this.mvAdapter.refreshView(concurrentRpcName);
        concurrent = true;
        success = true;
      } catch (err: any) {
        console.warn(`Concurrent refresh failed for ${viewName}, falling back to regular refresh:`, err.message);
        concurrent = false;

        await this.mvAdapter.refreshView(regularRpcName);
        success = true;
      }

      rowCount = await this.mvAdapter.getViewRowCount(viewName);
    } catch (err: any) {
      success = false;
      error = err.message;
      console.error(`Error refreshing ${viewName}:`, err);
    }

    const endTime = new Date();
    const durationMs = endTime.getTime() - startTime.getTime();

    const metrics: RefreshMetrics = {
      viewName,
      startTime,
      endTime,
      durationMs,
      rowCount,
      success,
      error,
      concurrent,
    };

    await this.logRefreshOperation(metrics);

    return metrics;
  }

  /**
   * Logs a refresh operation to the database
   */
  private async logRefreshOperation(metrics: RefreshMetrics): Promise<void> {
    try {
      const userId = await this.mvAdapter.getCurrentUserId();

      await this.create({
        view_name: metrics.viewName,
        started_at: metrics.startTime.toISOString(),
        completed_at: metrics.endTime.toISOString(),
        duration_ms: metrics.durationMs,
        row_count: metrics.rowCount,
        success: metrics.success,
        error_message: metrics.error || null,
        concurrent: metrics.concurrent,
        triggered_by: userId,
      } as Partial<MaterializedViewRefreshJob>);
    } catch (err) {
      console.error('Error logging refresh operation:', err);
      // Don't throw - logging failure shouldn't fail the refresh
    }
  }
}
