import 'server-only';
import { injectable } from 'inversify';
import { BaseAdapter } from './base.adapter';
import type {
  LicenseChangeRecord,
  LicensingDriftReport,
  LicenseAuditQueryOptions
} from '@/models/licenseAudit.model';

export interface ILicenseAuditAdapter {
  getLicenseChangeHistory(
    tenantId: string,
    options: LicenseAuditQueryOptions
  ): Promise<LicenseChangeRecord[]>;

  getUserRoleHistory(
    userId: string,
    tenantId?: string
  ): Promise<any[]>;

  getFeatureGrantHistory(
    tenantId: string,
    options: LicenseAuditQueryOptions
  ): Promise<any[]>;

  getRoleAssignmentCount(
    tenantId: string,
    startDate: Date,
    endDate: Date
  ): Promise<number>;

  getFeatureGrantCount(
    tenantId: string,
    startDate: Date,
    endDate: Date
  ): Promise<number>;

  getSecurityEventsCount(
    tenantId: string,
    startDate: Date,
    endDate: Date
  ): Promise<number>;

  getUserAccessLog(
    userId: string,
    tenantId: string,
    options: LicenseAuditQueryOptions
  ): Promise<LicenseChangeRecord[]>;

  getLicensingDriftReport(
    tenantId: string
  ): Promise<LicensingDriftReport>;
}

@injectable()
export class LicenseAuditAdapter
  extends BaseAdapter<LicenseChangeRecord>
  implements ILicenseAuditAdapter
{
  constructor() {
    super();
  }

  async getLicenseChangeHistory(
    tenantId: string,
    options: LicenseAuditQueryOptions = {}
  ): Promise<LicenseChangeRecord[]> {
    const supabase = await this.getSupabaseClient();

    let query = supabase
      .from('rbac_audit_log')
      .select('*')
      .eq('tenant_id', tenantId)
      .in('table_name', [
        'tenant_feature_grants',
        'product_offerings',
        'license_feature_bundles',
        'surface_license_bindings',
      ])
      .order('created_at', { ascending: false });

    if (options.startDate) {
      query = query.gte('created_at', options.startDate.toISOString());
    }

    if (options.endDate) {
      query = query.lte('created_at', options.endDate.toISOString());
    }

    if (options.operation) {
      query = query.eq('operation', options.operation);
    }

    if (options.limit) {
      query = query.limit(options.limit);
    }

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    return data || [];
  }

  async getUserRoleHistory(
    userId: string,
    tenantId?: string
  ): Promise<any[]> {
    const supabase = await this.getSupabaseClient();

    let query = supabase
      .from('rbac_audit_log')
      .select('*')
      .eq('table_name', 'user_roles')
      .eq('new_values->>user_id', userId)
      .order('created_at', { ascending: false });

    if (tenantId) {
      query = query.eq('tenant_id', tenantId);
    }

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    return data || [];
  }

  async getFeatureGrantHistory(
    tenantId: string,
    options: LicenseAuditQueryOptions = {}
  ): Promise<any[]> {
    const supabase = await this.getSupabaseClient();

    let query = supabase
      .from('rbac_audit_log')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('table_name', 'tenant_feature_grants')
      .order('created_at', { ascending: false });

    if (options.startDate) {
      query = query.gte('created_at', options.startDate.toISOString());
    }

    if (options.endDate) {
      query = query.lte('created_at', options.endDate.toISOString());
    }

    if (options.limit) {
      query = query.limit(options.limit);
    }

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    return data || [];
  }

  async getRoleAssignmentCount(
    tenantId: string,
    startDate: Date,
    endDate: Date
  ): Promise<number> {
    const supabase = await this.getSupabaseClient();

    const { count } = await supabase
      .from('rbac_audit_log')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .eq('table_name', 'user_roles')
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString());

    return count || 0;
  }

  async getFeatureGrantCount(
    tenantId: string,
    startDate: Date,
    endDate: Date
  ): Promise<number> {
    const supabase = await this.getSupabaseClient();

    const { count } = await supabase
      .from('rbac_audit_log')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .eq('table_name', 'tenant_feature_grants')
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString());

    return count || 0;
  }

  async getSecurityEventsCount(
    tenantId: string,
    startDate: Date,
    endDate: Date
  ): Promise<number> {
    const supabase = await this.getSupabaseClient();

    const { count } = await supabase
      .from('rbac_audit_log')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .in('security_impact', ['high', 'critical'])
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString());

    return count || 0;
  }

  async getUserAccessLog(
    userId: string,
    tenantId: string,
    options: LicenseAuditQueryOptions = {}
  ): Promise<LicenseChangeRecord[]> {
    const supabase = await this.getSupabaseClient();

    let query = supabase
      .from('rbac_audit_log')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('user_id', userId)
      .eq('operation', 'ACCESS')
      .order('created_at', { ascending: false });

    if (options.startDate) {
      query = query.gte('created_at', options.startDate.toISOString());
    }

    if (options.endDate) {
      query = query.lte('created_at', options.endDate.toISOString());
    }

    if (options.limit) {
      query = query.limit(options.limit);
    }

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    return data || [];
  }

  async getLicensingDriftReport(
    tenantId: string
  ): Promise<LicensingDriftReport> {
    const supabase = await this.getSupabaseClient();

    const { data, error } = await supabase.rpc('get_licensing_drift_report', {
      p_tenant_id: tenantId,
    });

    if (error) {
      throw error;
    }

    return data || {
      total_surfaces: 0,
      licensed_surfaces: 0,
      unlicensed_surfaces: 0,
      drift_items: [],
    };
  }
}
