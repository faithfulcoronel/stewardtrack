import 'server-only';
import { injectable, inject } from 'inversify';
import { TYPES } from '@/lib/types';
import type { AuditService } from './AuditService';
import { createClient } from '@/utils/supabase/server';

/**
 * MaterializedViewRefreshService
 *
 * Manages all materialized view refresh operations for the application.
 * Provides:
 * - Manual and scheduled refresh capabilities
 * - Performance metrics tracking
 * - Error handling and retry logic
 * - Audit logging of refresh operations
 *
 * Supported materialized views:
 * - tenant_user_effective_permissions (RBAC permissions)
 * - tenant_license_summary (License grants and subscriptions)
 * - effective_surface_access (Combined RBAC + Licensing access)
 */

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

export interface RefreshJobRecord {
  id: string;
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

@injectable()
export class MaterializedViewRefreshService {
  constructor(
    @inject(TYPES.AuditService) private auditService: AuditService
  ) {}

  /**
   * Refreshes the tenant license summary materialized view
   * This view aggregates all license grants and subscription data per tenant
   */
  async refreshTenantLicenseSummary(): Promise<RefreshMetrics> {
    const viewName = 'tenant_license_summary';
    const startTime = new Date();
    let success = false;
    let error: string | undefined;
    let concurrent = true;
    let rowCount: number | null = null;

    try {
      const supabase = await createClient();

      // Try concurrent refresh first (doesn't lock the view)
      try {
        await supabase.rpc('refresh_tenant_license_summary_concurrent');
        concurrent = true;
        success = true;
      } catch (err: any) {
        // Fall back to regular refresh if concurrent fails
        console.warn(`Concurrent refresh failed for ${viewName}, falling back to regular refresh:`, err.message);
        concurrent = false;

        await supabase.rpc('refresh_tenant_license_summary');
        success = true;
      }

      // Get row count
      const { count } = await supabase
        .from(viewName)
        .select('*', { count: 'exact', head: true });

      rowCount = count;

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

    // Log the refresh operation
    await this.logRefreshOperation(metrics);

    // Audit log
    await this.auditService.logAuditEvent(
      'update',
      'materialized_view',
      viewName,
      {
        operation: 'refresh',
        duration_ms: durationMs,
        row_count: rowCount,
        success,
        concurrent,
        error,
      }
    );

    return metrics;
  }

  /**
   * Refreshes the effective surface access materialized view
   * This view combines RBAC permissions with license grants
   */
  async refreshEffectiveSurfaceAccess(): Promise<RefreshMetrics> {
    const viewName = 'effective_surface_access';
    const startTime = new Date();
    let success = false;
    let error: string | undefined;
    let concurrent = true;
    let rowCount: number | null = null;

    try {
      const supabase = await createClient();

      // Try concurrent refresh first
      try {
        await supabase.rpc('refresh_effective_surface_access_concurrent');
        concurrent = true;
        success = true;
      } catch (err: any) {
        // Fall back to regular refresh
        console.warn(`Concurrent refresh failed for ${viewName}, falling back to regular refresh:`, err.message);
        concurrent = false;

        await supabase.rpc('refresh_effective_surface_access');
        success = true;
      }

      // Get row count
      const { count } = await supabase
        .from(viewName)
        .select('*', { count: 'exact', head: true });

      rowCount = count;

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

    // Log the refresh operation
    await this.logRefreshOperation(metrics);

    // Audit log
    await this.auditService.logAuditEvent(
      'update',
      'materialized_view',
      viewName,
      {
        operation: 'refresh',
        duration_ms: durationMs,
        row_count: rowCount,
        success,
        concurrent,
        error,
      }
    );

    return metrics;
  }

  /**
   * Refreshes the tenant user effective permissions materialized view
   * This is the core RBAC view used for permission checks
   */
  async refreshTenantUserEffectivePermissions(): Promise<RefreshMetrics> {
    const viewName = 'tenant_user_effective_permissions';
    const startTime = new Date();
    let success = false;
    let error: string | undefined;
    let concurrent = true;
    let rowCount: number | null = null;

    try {
      const supabase = await createClient();

      // Use the safe refresh function that's already implemented
      const { data, error: rpcError } = await supabase.rpc('refresh_tenant_user_effective_permissions_safe');

      if (rpcError) {
        throw rpcError;
      }

      success = true;
      concurrent = true; // The safe function tries concurrent first

      // Get row count
      const { count } = await supabase
        .from(viewName)
        .select('*', { count: 'exact', head: true });

      rowCount = count;

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

    // Log the refresh operation
    await this.logRefreshOperation(metrics);

    // Audit log
    await this.auditService.logAuditEvent(
      'update',
      'materialized_view',
      viewName,
      {
        operation: 'refresh',
        duration_ms: durationMs,
        row_count: rowCount,
        success,
        concurrent,
        error,
      }
    );

    return metrics;
  }

  /**
   * Refreshes all materialized views in sequence
   * Returns metrics for each view
   */
  async refreshAllViews(): Promise<RefreshMetrics[]> {
    const results: RefreshMetrics[] = [];

    // Refresh in dependency order (most foundational first)
    results.push(await this.refreshTenantUserEffectivePermissions());
    results.push(await this.refreshTenantLicenseSummary());
    results.push(await this.refreshEffectiveSurfaceAccess());

    return results;
  }

  /**
   * Gets the refresh history for a specific view
   */
  async getRefreshHistory(viewName: string, limit: number = 50): Promise<RefreshJobRecord[]> {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('materialized_view_refresh_jobs')
      .select('*')
      .eq('view_name', viewName)
      .order('started_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching refresh history:', error);
      return [];
    }

    return data || [];
  }

  /**
   * Gets the latest refresh metrics for all views
   */
  async getLatestRefreshMetrics(): Promise<RefreshJobRecord[]> {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('materialized_view_refresh_jobs')
      .select('*')
      .order('started_at', { ascending: false })
      .limit(100);

    if (error) {
      console.error('Error fetching latest refresh metrics:', error);
      return [];
    }

    // Get the latest for each view
    const viewMap = new Map<string, RefreshJobRecord>();

    for (const record of data || []) {
      if (!viewMap.has(record.view_name)) {
        viewMap.set(record.view_name, record);
      }
    }

    return Array.from(viewMap.values());
  }

  /**
   * Checks if any view needs refresh based on staleness threshold
   * Returns list of views that should be refreshed
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
        // Never refreshed
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
   * Logs a refresh operation to the database
   */
  private async logRefreshOperation(metrics: RefreshMetrics): Promise<void> {
    try {
      const supabase = await createClient();

      const { data: { user } } = await supabase.auth.getUser();

      await supabase
        .from('materialized_view_refresh_jobs')
        .insert({
          view_name: metrics.viewName,
          started_at: metrics.startTime.toISOString(),
          completed_at: metrics.endTime.toISOString(),
          duration_ms: metrics.durationMs,
          row_count: metrics.rowCount,
          success: metrics.success,
          error_message: metrics.error || null,
          concurrent: metrics.concurrent,
          triggered_by: user?.id || null,
        });

    } catch (err) {
      console.error('Error logging refresh operation:', err);
      // Don't throw - logging failure shouldn't fail the refresh
    }
  }
}
