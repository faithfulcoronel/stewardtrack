import 'server-only';
import { injectable, inject } from 'inversify';
import { TYPES } from '@/lib/types';
import { createClient } from '@/utils/supabase/server';
import type { AuditService } from './AuditService';

/**
 * LicenseMonitoringService
 *
 * Tracks and monitors license utilization, feature adoption, and system health.
 * Generates alerts for:
 * - License expiration approaching
 * - Seat limit exceeded
 * - RBAC-license misalignment
 * - Onboarding abandonment
 * - Feature adoption anomalies
 */

export interface LicenseUtilization {
  tenant_id: string;
  tenant_name: string;
  offering_name: string;
  total_seats: number;
  used_seats: number;
  available_seats: number;
  utilization_percentage: number;
  expires_at: string | null;
  days_until_expiration: number | null;
  status: 'active' | 'expiring_soon' | 'expired' | 'over_limit';
}

export interface FeatureAdoption {
  feature_id: string;
  feature_name: string;
  total_tenants: number;
  active_tenants: number;
  adoption_rate: number;
  avg_usage_per_tenant: number;
}

export interface LicenseAnomaly {
  type: 'seat_exceeded' | 'expiring_soon' | 'rbac_mismatch' | 'orphaned_permission' | 'onboarding_abandoned';
  severity: 'low' | 'medium' | 'high' | 'critical';
  tenant_id: string | null;
  description: string;
  detected_at: Date;
  metadata: Record<string, any>;
}

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

export interface SystemHealthMetrics {
  total_active_subscriptions: number;
  subscriptions_by_tier: Record<string, number>;
  total_licensed_features: number;
  total_active_tenants: number;
  avg_license_utilization: number;
  critical_alerts: number;
  warning_alerts: number;
  materialized_view_health: {
    view_name: string;
    last_refresh: string | null;
    is_stale: boolean;
  }[];
}

@injectable()
export class LicenseMonitoringService {
  constructor(
    @inject(TYPES.AuditService) private auditService: AuditService
  ) {}

  /**
   * Get license utilization metrics for all tenants
   */
  async getLicenseUtilization(): Promise<LicenseUtilization[]> {
    const supabase = await createClient();

    const { data, error } = await supabase.rpc('get_license_utilization_metrics');

    if (error) {
      console.error('Error getting license utilization:', error);
      throw error;
    }

    return data || [];
  }

  /**
   * Get license utilization for a specific tenant
   */
  async getTenantLicenseUtilization(tenantId: string): Promise<LicenseUtilization | null> {
    const all = await this.getLicenseUtilization();
    return all.find(u => u.tenant_id === tenantId) || null;
  }

  /**
   * Get feature adoption metrics across all tenants
   */
  async getFeatureAdoption(): Promise<FeatureAdoption[]> {
    const supabase = await createClient();

    const { data, error } = await supabase.rpc('get_feature_adoption_metrics');

    if (error) {
      console.error('Error getting feature adoption:', error);
      throw error;
    }

    return data || [];
  }

  /**
   * Detect license and RBAC anomalies
   */
  async detectAnomalies(): Promise<LicenseAnomaly[]> {
    const anomalies: LicenseAnomaly[] = [];

    // Check for seat limit exceeded
    const utilization = await this.getLicenseUtilization();

    for (const util of utilization) {
      if (util.utilization_percentage > 100) {
        anomalies.push({
          type: 'seat_exceeded',
          severity: 'critical',
          tenant_id: util.tenant_id,
          description: `Tenant ${util.tenant_name} has exceeded seat limit: ${util.used_seats}/${util.total_seats} (${util.utilization_percentage.toFixed(1)}%)`,
          detected_at: new Date(),
          metadata: {
            tenant_name: util.tenant_name,
            used_seats: util.used_seats,
            total_seats: util.total_seats,
            utilization_percentage: util.utilization_percentage,
          },
        });
      } else if (util.utilization_percentage > 90) {
        anomalies.push({
          type: 'seat_exceeded',
          severity: 'high',
          tenant_id: util.tenant_id,
          description: `Tenant ${util.tenant_name} is approaching seat limit: ${util.used_seats}/${util.total_seats} (${util.utilization_percentage.toFixed(1)}%)`,
          detected_at: new Date(),
          metadata: {
            tenant_name: util.tenant_name,
            used_seats: util.used_seats,
            total_seats: util.total_seats,
            utilization_percentage: util.utilization_percentage,
          },
        });
      }

      // Check for expiring licenses
      if (util.days_until_expiration !== null) {
        if (util.days_until_expiration < 0) {
          anomalies.push({
            type: 'expiring_soon',
            severity: 'critical',
            tenant_id: util.tenant_id,
            description: `Tenant ${util.tenant_name} license has expired`,
            detected_at: new Date(),
            metadata: {
              tenant_name: util.tenant_name,
              expired_at: util.expires_at,
              days_overdue: Math.abs(util.days_until_expiration),
            },
          });
        } else if (util.days_until_expiration <= 7) {
          anomalies.push({
            type: 'expiring_soon',
            severity: 'high',
            tenant_id: util.tenant_id,
            description: `Tenant ${util.tenant_name} license expires in ${util.days_until_expiration} days`,
            detected_at: new Date(),
            metadata: {
              tenant_name: util.tenant_name,
              expires_at: util.expires_at,
              days_until_expiration: util.days_until_expiration,
            },
          });
        } else if (util.days_until_expiration <= 30) {
          anomalies.push({
            type: 'expiring_soon',
            severity: 'medium',
            tenant_id: util.tenant_id,
            description: `Tenant ${util.tenant_name} license expires in ${util.days_until_expiration} days`,
            detected_at: new Date(),
            metadata: {
              tenant_name: util.tenant_name,
              expires_at: util.expires_at,
              days_until_expiration: util.days_until_expiration,
            },
          });
        }
      }
    }

    // Check for RBAC-license misalignment
    const rbacMismatches = await this.detectRbacLicenseMismatches();
    anomalies.push(...rbacMismatches);

    // Check for onboarding abandonment
    const onboardingIssues = await this.detectOnboardingAbandonment();
    anomalies.push(...onboardingIssues);

    // Log anomalies
    if (anomalies.length > 0) {
      await this.auditService.logAuditEvent(
        'create',
        'license_anomaly_detection',
        'system',
        {
          anomalies_detected: anomalies.length,
          critical: anomalies.filter(a => a.severity === 'critical').length,
          high: anomalies.filter(a => a.severity === 'high').length,
          medium: anomalies.filter(a => a.severity === 'medium').length,
          low: anomalies.filter(a => a.severity === 'low').length,
        }
      );
    }

    return anomalies;
  }

  /**
   * Detect RBAC surfaces that require licenses but tenant doesn't have them
   */
  private async detectRbacLicenseMismatches(): Promise<LicenseAnomaly[]> {
    const supabase = await createClient();
    const anomalies: LicenseAnomaly[] = [];

    const { data, error } = await supabase.rpc('detect_rbac_license_mismatches');

    if (error) {
      console.error('Error detecting RBAC mismatches:', error);
      return anomalies;
    }

    for (const mismatch of data || []) {
      anomalies.push({
        type: 'rbac_mismatch',
        severity: 'high',
        tenant_id: mismatch.tenant_id,
        description: `Tenant has RBAC access to surface '${mismatch.surface_title}' but missing required license: ${mismatch.required_bundle}`,
        detected_at: new Date(),
        metadata: {
          surface_id: mismatch.surface_id,
          surface_title: mismatch.surface_title,
          required_bundle: mismatch.required_bundle,
          role_name: mismatch.role_name,
        },
      });
    }

    return anomalies;
  }

  /**
   * Detect tenants with abandoned onboarding processes
   */
  private async detectOnboardingAbandonment(): Promise<LicenseAnomaly[]> {
    const supabase = await createClient();
    const anomalies: LicenseAnomaly[] = [];

    // Get onboarding progress for incomplete tenants
    const { data, error } = await supabase
      .from('onboarding_progress')
      .select('*')
      .eq('completed', false)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error detecting onboarding abandonment:', error);
      return anomalies;
    }

    const now = new Date();

    for (const progress of data || []) {
      const createdAt = new Date(progress.created_at);
      const hoursSinceStart = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60);

      // Flag if onboarding hasn't been completed in 24 hours
      if (hoursSinceStart > 24) {
        const severity = hoursSinceStart > 72 ? 'high' : 'medium';

        anomalies.push({
          type: 'onboarding_abandoned',
          severity,
          tenant_id: progress.tenant_id,
          description: `Tenant onboarding abandoned at step '${progress.current_step}' for ${Math.floor(hoursSinceStart)} hours`,
          detected_at: new Date(),
          metadata: {
            tenant_id: progress.tenant_id,
            current_step: progress.current_step,
            hours_since_start: hoursSinceStart,
            completed_steps: progress.completed_steps,
          },
        });
      }
    }

    return anomalies;
  }

  /**
   * Get onboarding metrics
   */
  async getOnboardingMetrics(): Promise<OnboardingMetrics> {
    const supabase = await createClient();

    const { data: allProgress } = await supabase
      .from('onboarding_progress')
      .select('*');

    const total_started = allProgress?.length || 0;
    const total_completed = allProgress?.filter(p => p.completed).length || 0;
    const total_abandoned = allProgress?.filter(p => !p.completed).length || 0;

    // Calculate completion rate
    const completion_rate = total_started > 0 ? (total_completed / total_started) * 100 : 0;

    // Calculate average completion time for completed onboardings
    const completedOnboardings = allProgress?.filter(p => p.completed && p.completed_at) || [];
    let avg_completion_time_hours = 0;

    if (completedOnboardings.length > 0) {
      const totalHours = completedOnboardings.reduce((sum, p) => {
        const start = new Date(p.created_at);
        const end = new Date(p.completed_at!);
        const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
        return sum + hours;
      }, 0);

      avg_completion_time_hours = totalHours / completedOnboardings.length;
    }

    // Get abandoned tenants
    const abandoned_tenants = (allProgress?.filter(p => !p.completed) || []).map(p => {
      const start = new Date(p.created_at);
      const now = new Date();
      const hours_since_start = (now.getTime() - start.getTime()) / (1000 * 60 * 60);

      return {
        tenant_id: p.tenant_id,
        started_at: p.created_at,
        last_step: p.current_step,
        hours_since_start: Math.floor(hours_since_start),
      };
    });

    return {
      total_started,
      total_completed,
      total_abandoned,
      completion_rate,
      avg_completion_time_hours,
      abandoned_tenants,
    };
  }

  /**
   * Get comprehensive system health metrics
   */
  async getSystemHealthMetrics(): Promise<SystemHealthMetrics> {
    const supabase = await createClient();

    // Get subscription metrics
    const { data: subscriptions } = await supabase
      .from('tenant_license_summary')
      .select('*');

    const total_active_subscriptions = subscriptions?.length || 0;

    // Count by tier
    const subscriptions_by_tier: Record<string, number> = {};
    for (const sub of subscriptions || []) {
      const tier = sub.offering_tier || 'unknown';
      subscriptions_by_tier[tier] = (subscriptions_by_tier[tier] || 0) + 1;
    }

    // Get feature grants
    const { count: total_licensed_features } = await supabase
      .from('tenant_feature_grants')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true);

    // Get active tenants
    const { count: total_active_tenants } = await supabase
      .from('tenants')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true);

    // Calculate average utilization
    const utilization = await this.getLicenseUtilization();
    const avg_license_utilization = utilization.length > 0
      ? utilization.reduce((sum, u) => sum + u.utilization_percentage, 0) / utilization.length
      : 0;

    // Get anomalies for alerts
    const anomalies = await this.detectAnomalies();
    const critical_alerts = anomalies.filter(a => a.severity === 'critical').length;
    const warning_alerts = anomalies.filter(a => a.severity === 'high' || a.severity === 'medium').length;

    // Check materialized view health
    const { data: refreshJobs } = await supabase
      .from('materialized_view_refresh_jobs')
      .select('*')
      .order('started_at', { ascending: false })
      .limit(100);

    const viewHealthMap = new Map<string, any>();
    for (const job of refreshJobs || []) {
      if (!viewHealthMap.has(job.view_name)) {
        const completedAt = job.completed_at ? new Date(job.completed_at) : null;
        const isStale = completedAt
          ? (new Date().getTime() - completedAt.getTime()) > (60 * 60 * 1000) // 1 hour
          : true;

        viewHealthMap.set(job.view_name, {
          view_name: job.view_name,
          last_refresh: job.completed_at,
          is_stale: isStale,
        });
      }
    }

    return {
      total_active_subscriptions,
      subscriptions_by_tier,
      total_licensed_features: total_licensed_features || 0,
      total_active_tenants: total_active_tenants || 0,
      avg_license_utilization,
      critical_alerts,
      warning_alerts,
      materialized_view_health: Array.from(viewHealthMap.values()),
    };
  }

  /**
   * Generate alert notifications for critical issues
   */
  async generateAlerts(): Promise<LicenseAnomaly[]> {
    const anomalies = await this.detectAnomalies();

    // Filter for high and critical severity
    const alerts = anomalies.filter(a => a.severity === 'high' || a.severity === 'critical');

    // Log alerts
    for (const alert of alerts) {
      await this.auditService.logAuditEvent(
        'create',
        'license_alert',
        alert.tenant_id || 'system',
        {
          type: alert.type,
          severity: alert.severity,
          description: alert.description,
          metadata: alert.metadata,
        }
      );
    }

    return alerts;
  }
}
