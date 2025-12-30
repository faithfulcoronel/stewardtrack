import 'server-only';
import 'reflect-metadata';
import { injectable } from 'inversify';
import { createSupabaseServerClient } from '@/lib/supabase/server';

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

export interface OnboardingProgress {
  id: string;
  tenant_id: string;
  completed: boolean;
  created_at: string;
  [key: string]: any;
}

export interface TenantLicenseSummary {
  tenant_id: string;
  offering_id: string;
  offering_name: string;
  expires_at: string | null;
  [key: string]: any;
}

export interface MaterializedViewRefreshJob {
  id: string;
  view_name: string;
  started_at: string;
  completed_at: string | null;
  duration_ms: number | null;
  row_count: number | null;
  success: boolean;
  error_message: string | null;
  [key: string]: any;
}

export interface TenantAdminUser {
  user_id: string;
  email: string | null;
}

export interface LicensingAnalyticsSummary {
  totalOfferings: number;
  activeOfferings: number;
  totalBundles: number;
  totalFeatures: number;
  activeSubscriptions: number;
  subscriptionsByTier: Array<{ tier: string; count: number }>;
  featureAdoption: Array<{ feature_code: string; feature_name: string; tenant_count: number }>;
  manualAssignments: {
    total: number;
    last30Days: number;
    byTier: Array<{ tier: string; count: number }>;
    recent: Array<{
      assignment_id: string;
      assigned_at: string;
      tenant_name: string;
      offering_name: string;
      offering_tier: string;
    }>;
  };
}

/**
 * LicenseMonitoringAdapter
 *
 * This adapter provides access to multiple tables and RPC functions for license monitoring
 * It handles all Supabase queries for monitoring operations
 */
@injectable()
export class LicenseMonitoringAdapter {
  /**
   * Call RPC function to get license utilization metrics
   */
  async callGetLicenseUtilizationMetrics(): Promise<LicenseUtilization[]> {
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase.rpc('get_license_utilization_metrics');

    if (error) throw error;
    return data || [];
  }

  /**
   * Call RPC function to get feature adoption metrics
   */
  async callGetFeatureAdoptionMetrics(): Promise<FeatureAdoption[]> {
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase.rpc('get_feature_adoption_metrics');

    if (error) throw error;
    return data || [];
  }

  /**
   * Call RPC function to detect RBAC license mismatches
   */
  async callDetectRbacLicenseMismatches(tenantId?: string): Promise<any[]> {
    const supabase = await createSupabaseServerClient();

    const params = tenantId ? { p_tenant_id: tenantId } : {};
    const { data, error } = await supabase.rpc('detect_rbac_license_mismatches', params);

    if (error) throw error;
    return data || [];
  }

  /**
   * Fetch incomplete onboarding progress records
   */
  async fetchIncompleteOnboardingProgress(): Promise<OnboardingProgress[]> {
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from('onboarding_progress')
      .select('*')
      .eq('completed', false)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  /**
   * Fetch all onboarding progress records
   */
  async fetchAllOnboardingProgress(): Promise<OnboardingProgress[]> {
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from('onboarding_progress')
      .select('*');

    if (error) throw error;
    return data || [];
  }

  /**
   * Fetch tenant license summary records
   */
  async fetchTenantLicenseSummary(): Promise<TenantLicenseSummary[]> {
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from('tenant_license_summary')
      .select('*');

    if (error) throw error;
    return data || [];
  }

  /**
   * Count active tenant feature grants
   */
  async countActiveTenantFeatureGrants(): Promise<number> {
    const supabase = await createSupabaseServerClient();

    const { count, error } = await supabase
      .from('tenant_feature_grants')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true);

    if (error) throw error;
    return count || 0;
  }

  /**
   * Count active tenants
   */
  async countActiveTenants(): Promise<number> {
    const supabase = await createSupabaseServerClient();

    const { count, error } = await supabase
      .from('tenants')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true);

    if (error) throw error;
    return count || 0;
  }

  /**
   * Fetch materialized view refresh jobs
   */
  async fetchMaterializedViewRefreshJobs(limit: number = 100): Promise<MaterializedViewRefreshJob[]> {
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from('materialized_view_refresh_jobs')
      .select('*')
      .order('started_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  }

  /**
   * Fetch system-wide licensing analytics (super admin view)
   */
  async fetchSystemAnalytics(): Promise<LicensingAnalyticsSummary> {
    const supabase = await createSupabaseServerClient();
    const nowIso = new Date().toISOString();

    const { count: totalOfferings } = await supabase
      .from('product_offerings')
      .select('*', { count: 'exact', head: true });

    const { count: activeOfferings } = await supabase
      .from('product_offerings')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true);

    const { count: totalBundles } = await supabase
      .from('feature_bundles')
      .select('*', { count: 'exact', head: true });

    const { count: totalFeatures } = await supabase
      .from('bundle_features')
      .select('*', { count: 'exact', head: true });

    const { count: activeSubscriptions } = await supabase
      .from('tenant_product_offerings')
      .select('*', { count: 'exact', head: true })
      .lte('starts_at', nowIso)
      .or(`expires_at.is.null,expires_at.gte.${nowIso}`);

    const { data: subscriptionsByTier } = await supabase
      .from('tenant_product_offerings')
      .select(`
        product_offering_id,
        product_offerings!inner(tier)
      `)
      .lte('starts_at', nowIso)
      .or(`expires_at.is.null,expires_at.gte.${nowIso}`);

    const tierCounts: Record<string, number> = {};
    subscriptionsByTier?.forEach((sub: any) => {
      const tier = sub.product_offerings?.tier || 'Unknown';
      tierCounts[tier] = (tierCounts[tier] || 0) + 1;
    });

    const formattedTierData = Object.entries(tierCounts).map(([tier, count]) => ({
      tier,
      count,
    }));

    const { data: featureAdoption } = await supabase
      .from('tenant_feature_grants')
      .select(`
        feature_id,
        features!inner(feature_code, feature_name)
      `)
      .lte('starts_at', nowIso)
      .or(`expires_at.is.null,expires_at.gte.${nowIso}`);

    const featureCounts: Record<string, { feature_code: string; feature_name: string; count: number }> = {};
    featureAdoption?.forEach((grant: any) => {
      const featureId = grant.feature_id;
      const feature = grant.features;
      if (feature) {
        if (!featureCounts[featureId]) {
          featureCounts[featureId] = {
            feature_code: feature.feature_code,
            feature_name: feature.feature_name,
            count: 0,
          };
        }
        featureCounts[featureId].count++;
      }
    });

    const formattedFeatureAdoption = Object.values(featureCounts)
      .sort((a, b) => b.count - a.count)
      .map(f => ({
        feature_code: f.feature_code,
        feature_name: f.feature_name,
        tenant_count: f.count,
      }));

    const { count: totalAssignments } = await supabase
      .from('license_assignments')
      .select('*', { count: 'exact', head: true });

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const { count: recentAssignments } = await supabase
      .from('license_assignments')
      .select('*', { count: 'exact', head: true })
      .gte('assigned_at', thirtyDaysAgo.toISOString());

    const { data: assignmentsByTier } = await supabase
      .from('license_assignments')
      .select(`
        offering_id,
        product_offerings!inner(tier)
      `)
      .gte('assigned_at', thirtyDaysAgo.toISOString());

    const assignmentTierCounts: Record<string, number> = {};
    assignmentsByTier?.forEach((assignment: any) => {
      const tier = assignment.product_offerings?.tier || 'Unknown';
      assignmentTierCounts[tier] = (assignmentTierCounts[tier] || 0) + 1;
    });

    const formattedAssignmentsByTier = Object.entries(assignmentTierCounts).map(([tier, count]) => ({
      tier,
      count,
    }));

    const { data: recentAssignmentDetails } = await supabase
      .from('license_assignments')
      .select(`
        id,
        assigned_at,
        tenants!inner(name),
        product_offerings!inner(name, tier)
      `)
      .order('assigned_at', { ascending: false })
      .limit(10);

    const formattedRecentAssignments = recentAssignmentDetails?.map((assignment: any) => ({
      assignment_id: assignment.id,
      assigned_at: assignment.assigned_at,
      tenant_name: assignment.tenants?.name || 'Unknown',
      offering_name: assignment.product_offerings?.name || 'Unknown',
      offering_tier: assignment.product_offerings?.tier || 'Unknown',
    })) || [];

    return {
      totalOfferings: totalOfferings || 0,
      activeOfferings: activeOfferings || 0,
      totalBundles: totalBundles || 0,
      totalFeatures: totalFeatures || 0,
      activeSubscriptions: activeSubscriptions || 0,
      subscriptionsByTier: formattedTierData,
      featureAdoption: formattedFeatureAdoption,
      manualAssignments: {
        total: totalAssignments || 0,
        last30Days: recentAssignments || 0,
        byTier: formattedAssignmentsByTier,
        recent: formattedRecentAssignments,
      },
    };
  }

  /**
   * Fetch admin users for a specific tenant (for notifications)
   */
  async fetchTenantAdminUsers(tenantId: string): Promise<TenantAdminUser[]> {
    const supabase = await createSupabaseServerClient();

    // Get users with 'tenant_admin' or 'admin' roles for this tenant
    const { data, error } = await supabase
      .from('user_roles')
      .select(`
        user_id,
        profiles!inner(email),
        roles!inner(name)
      `)
      .eq('tenant_id', tenantId)
      .in('roles.name', ['tenant_admin', 'admin']);

    if (error) {
      console.error('Failed to fetch tenant admin users:', error);
      return [];
    }

    // Deduplicate by user_id
    const userMap = new Map<string, TenantAdminUser>();
    data?.forEach((row: any) => {
      if (!userMap.has(row.user_id)) {
        userMap.set(row.user_id, {
          user_id: row.user_id,
          email: row.profiles?.email || null,
        });
      }
    });

    return Array.from(userMap.values());
  }
}
