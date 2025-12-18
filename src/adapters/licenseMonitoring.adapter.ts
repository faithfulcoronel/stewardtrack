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
}
