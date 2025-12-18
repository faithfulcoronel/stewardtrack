import 'server-only';
import { injectable, inject } from 'inversify';
import { TYPES } from '@/lib/types';
import { LicenseMonitoringAdapter, type LicenseUtilization, type FeatureAdoption } from '@/adapters/licenseMonitoring.adapter';

// Re-export types from adapter for convenience
export type { LicenseUtilization, FeatureAdoption };

export interface OnboardingMetrics {
  total_started: number;
  total_completed: number;
  total_abandoned: number;
  completion_rate: number;
  avg_completion_time_hours: number;
  abandoned_tenants: Array<{
    tenant_id: string;
    started_at: string;
    last_step: string;
    hours_since_start: number;
  }>;
}

/**
 * LicenseMonitoringRepository
 *
 * Provides data access for license monitoring and health metrics.
 * This repository handles complex cross-table queries and RPC calls for monitoring via the adapter.
 */
@injectable()
export class LicenseMonitoringRepository {
  constructor(
    @inject(TYPES.LicenseMonitoringAdapter) private adapter: LicenseMonitoringAdapter
  ) {}

  /**
   * Get license utilization metrics for all tenants
   */
  async getLicenseUtilization(): Promise<LicenseUtilization[]> {
    return this.adapter.callGetLicenseUtilizationMetrics();
  }

  /**
   * Get feature adoption metrics across all tenants
   */
  async getFeatureAdoption(): Promise<FeatureAdoption[]> {
    return this.adapter.callGetFeatureAdoptionMetrics();
  }

  /**
   * Detect RBAC surfaces that require licenses but tenant doesn't have them
   */
  async detectRbacLicenseMismatches(tenantId?: string): Promise<any[]> {
    return this.adapter.callDetectRbacLicenseMismatches(tenantId);
  }

  /**
   * Get onboarding progress for all tenants
   */
  async getOnboardingProgress(): Promise<any[]> {
    return this.adapter.fetchIncompleteOnboardingProgress();
  }

  /**
   * Get all onboarding progress records
   */
  async getAllOnboardingProgress(): Promise<any[]> {
    return this.adapter.fetchAllOnboardingProgress();
  }

  /**
   * Get subscription metrics
   */
  async getSubscriptionMetrics(): Promise<any[]> {
    return this.adapter.fetchTenantLicenseSummary();
  }

  /**
   * Get active tenant feature grants count
   */
  async getActiveTenantFeatureGrantsCount(): Promise<number> {
    return this.adapter.countActiveTenantFeatureGrants();
  }

  /**
   * Get active tenants count
   */
  async getActiveTenantsCount(): Promise<number> {
    return this.adapter.countActiveTenants();
  }

  /**
   * Get materialized view refresh jobs
   */
  async getMaterializedViewRefreshJobs(limit: number = 100): Promise<any[]> {
    return this.adapter.fetchMaterializedViewRefreshJobs(limit);
  }
}
