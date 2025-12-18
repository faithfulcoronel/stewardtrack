import 'server-only';
import { injectable, inject } from 'inversify';
import { TYPES } from '@/lib/types';
import type { AuditService } from './AuditService';
import type { IMaterializedViewRefreshJobRepository, RefreshMetrics } from '@/repositories/materializedViewRefreshJob.repository';
import type { MaterializedViewRefreshJob } from '@/models/materializedViewRefreshJob.model';

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

export type { RefreshMetrics };
export type RefreshJobRecord = MaterializedViewRefreshJob;

@injectable()
export class MaterializedViewRefreshService {
  constructor(
    @inject(TYPES.AuditService) private auditService: AuditService,
    @inject(TYPES.IMaterializedViewRefreshJobRepository) private viewRefreshRepository: IMaterializedViewRefreshJobRepository
  ) {}

  /**
   * Refreshes the tenant license summary materialized view
   * This view aggregates all license grants and subscription data per tenant
   */
  async refreshTenantLicenseSummary(): Promise<RefreshMetrics> {
    const metrics = await this.viewRefreshRepository.refreshTenantLicenseSummary();

    // Audit log
    await this.auditService.logAuditEvent(
      'update',
      'materialized_view',
      metrics.viewName,
      {
        operation: 'refresh',
        duration_ms: metrics.durationMs,
        row_count: metrics.rowCount,
        success: metrics.success,
        concurrent: metrics.concurrent,
        error: metrics.error,
      }
    );

    return metrics;
  }

  /**
   * Refreshes the effective surface access materialized view
   * This view combines RBAC permissions with license grants
   */
  async refreshEffectiveSurfaceAccess(): Promise<RefreshMetrics> {
    const metrics = await this.viewRefreshRepository.refreshEffectiveSurfaceAccess();

    // Audit log
    await this.auditService.logAuditEvent(
      'update',
      'materialized_view',
      metrics.viewName,
      {
        operation: 'refresh',
        duration_ms: metrics.durationMs,
        row_count: metrics.rowCount,
        success: metrics.success,
        concurrent: metrics.concurrent,
        error: metrics.error,
      }
    );

    return metrics;
  }

  /**
   * Refreshes the tenant user effective permissions materialized view
   * This is the core RBAC view used for permission checks
   */
  async refreshTenantUserEffectivePermissions(): Promise<RefreshMetrics> {
    const metrics = await this.viewRefreshRepository.refreshTenantUserEffectivePermissions();

    // Audit log
    await this.auditService.logAuditEvent(
      'update',
      'materialized_view',
      metrics.viewName,
      {
        operation: 'refresh',
        duration_ms: metrics.durationMs,
        row_count: metrics.rowCount,
        success: metrics.success,
        concurrent: metrics.concurrent,
        error: metrics.error,
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
    return this.viewRefreshRepository.getRefreshHistory(viewName, limit);
  }

  /**
   * Gets the latest refresh metrics for all views
   */
  async getLatestRefreshMetrics(): Promise<RefreshJobRecord[]> {
    return this.viewRefreshRepository.getLatestRefreshMetrics();
  }

  /**
   * Checks if any view needs refresh based on staleness threshold
   * Returns list of views that should be refreshed
   */
  async getStaleViews(maxAgeMinutes: number = 60): Promise<string[]> {
    return this.viewRefreshRepository.getStaleViews(maxAgeMinutes);
  }
}
