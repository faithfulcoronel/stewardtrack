import { NextRequest, NextResponse } from 'next/server';
import { container } from '@/lib/container';
import { LicenseMonitoringService } from '@/services/LicenseMonitoringService';
import { LicenseValidationService } from '@/services/LicenseValidationService';
import { createSupabaseServerClient } from '@/lib/supabase/server';

/**
 * GET /api/admin/monitoring/license-health
 *
 * Returns comprehensive license health metrics:
 * - Active subscriptions by tier
 * - License utilization percentage
 * - Feature adoption rates
 * - Onboarding completion rates
 * - RBAC drift (misaligned surfaces)
 * - System anomalies and alerts
 */
export async function GET(request: NextRequest) {
  try {
    // Check admin authorization
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if user has admin role
    const { data: userRoles } = await supabase
      .from('user_roles')
      .select('role_id, roles(code)')
      .eq('user_id', user.id);

    const isAdmin = userRoles?.some((ur: any) =>
      ['super_admin', 'admin', 'system_admin'].includes(ur.roles?.code)
    );

    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Forbidden: Admin access required' },
        { status: 403 }
      );
    }

    // Get monitoring and validation services
    const monitoringService = container.get<LicenseMonitoringService>(
      LicenseMonitoringService
    );
    const validationService = container.get<LicenseValidationService>(
      LicenseValidationService
    );

    // Gather all health metrics
    const [
      systemHealth,
      licenseUtilization,
      featureAdoption,
      onboardingMetrics,
      anomalies,
      validationSummary,
    ] = await Promise.all([
      monitoringService.getSystemHealthMetrics(),
      monitoringService.getLicenseUtilization(),
      monitoringService.getFeatureAdoption(),
      monitoringService.getOnboardingMetrics(),
      monitoringService.detectAnomalies(),
      validationService.getValidationSummary(),
    ]);

    // Calculate health score (0-100)
    const healthScore = calculateHealthScore({
      systemHealth,
      anomalies,
      validationSummary,
      onboardingMetrics,
    });

    return NextResponse.json({
      success: true,
      health_score: healthScore,
      timestamp: new Date().toISOString(),
      system_health: systemHealth,
      license_utilization: {
        tenants: licenseUtilization,
        summary: {
          total_tenants: licenseUtilization.length,
          over_limit: licenseUtilization.filter(u => u.utilization_percentage > 100).length,
          near_limit: licenseUtilization.filter(u => u.utilization_percentage > 90 && u.utilization_percentage <= 100).length,
          healthy: licenseUtilization.filter(u => u.utilization_percentage <= 90).length,
        },
      },
      feature_adoption: {
        features: featureAdoption,
        summary: {
          total_features: featureAdoption.length,
          avg_adoption_rate: featureAdoption.reduce((sum, f) => sum + f.adoption_rate, 0) / (featureAdoption.length || 1),
        },
      },
      onboarding: onboardingMetrics,
      anomalies: {
        items: anomalies,
        summary: {
          total: anomalies.length,
          critical: anomalies.filter(a => a.severity === 'critical').length,
          high: anomalies.filter(a => a.severity === 'high').length,
          medium: anomalies.filter(a => a.severity === 'medium').length,
          low: anomalies.filter(a => a.severity === 'low').length,
        },
      },
      validation: validationSummary,
    });
  } catch (error: any) {
    console.error('Error getting license health metrics:', error);
    return NextResponse.json(
      {
        error: 'Failed to get license health metrics',
        details: error.message,
      },
      { status: 500 }
    );
  }
}

/**
 * Calculate overall health score based on various metrics
 */
function calculateHealthScore(metrics: {
  systemHealth: any;
  anomalies: any[];
  validationSummary: any;
  onboardingMetrics: any;
}): number {
  let score = 100;

  // Deduct for critical anomalies
  score -= metrics.anomalies.filter(a => a.severity === 'critical').length * 10;

  // Deduct for high severity anomalies
  score -= metrics.anomalies.filter(a => a.severity === 'high').length * 5;

  // Deduct for medium severity anomalies
  score -= metrics.anomalies.filter(a => a.severity === 'medium').length * 2;

  // Deduct for validation issues
  score -= metrics.validationSummary.total_critical_issues * 10;
  score -= metrics.validationSummary.total_high_issues * 5;

  // Deduct for stale materialized views
  const staleViews = metrics.systemHealth.materialized_view_health.filter(
    (v: any) => v.is_stale
  ).length;
  score -= staleViews * 5;

  // Bonus for high onboarding completion rate
  if (metrics.onboardingMetrics.completion_rate > 80) {
    score += 5;
  }

  // Ensure score is between 0 and 100
  return Math.max(0, Math.min(100, score));
}
