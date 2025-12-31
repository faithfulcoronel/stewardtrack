import 'server-only';
import 'reflect-metadata';
import { injectable } from 'inversify';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export interface ValidationIssue {
  type: 'expired_license' | 'overlapping_grant' | 'missing_license' | 'orphaned_permission' | 'invalid_binding';
  severity: 'low' | 'medium' | 'high' | 'critical';
  tenant_id: string | null;
  description: string;
  fix_suggestion: string;
  metadata: Record<string, any>;
}

export interface TenantLicenseSummary {
  tenant_id: string;
  offering_id: string;
  offering_name: string;
  expires_at: string | null;
}

export interface TenantFeatureGrant {
  feature_id: string;
  tenant_id: string;
  is_active: boolean;
}

export interface RbacLicenseMismatch {
  surface_id: string;
  surface_title: string;
  required_bundle: string;
  role_name: string;
}

export interface Permission {
  id: string;
  code: string;
  name: string;
  tenant_id: string;
}

export interface SurfaceLicenseBinding {
  surface_id: string;
  required_bundle_id: string | null;
  is_active: boolean;
  metadata_surfaces?: {
    id: string;
    title: string;
  }[] | null;
  license_feature_bundles?: {
    id: string;
    name: string;
  }[] | null;
}

export interface Tenant {
  id: string;
}

/**
 * LicenseValidationAdapter
 *
 * This adapter provides access to multiple tables for license validation
 * It handles all Supabase queries for license validation operations
 */
@injectable()
export class LicenseValidationAdapter {
  /**
   * Fetch tenant license summary records for a tenant
   */
  async fetchTenantLicenseSummary(tenantId: string): Promise<TenantLicenseSummary[]> {
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from('tenant_license_summary')
      .select('*')
      .eq('tenant_id', tenantId);

    if (error) throw error;
    return data || [];
  }

  /**
   * Fetch active feature grants for a tenant
   */
  async fetchActiveFeatureGrants(tenantId: string): Promise<TenantFeatureGrant[]> {
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from('tenant_feature_grants')
      .select('feature_id, tenant_id, is_active')
      .eq('tenant_id', tenantId)
      .eq('is_active', true);

    if (error) throw error;
    return data || [];
  }

  /**
   * Detect RBAC license mismatches using RPC
   */
  async detectRbacLicenseMismatches(tenantId: string): Promise<RbacLicenseMismatch[]> {
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase.rpc('detect_rbac_license_mismatches', {
      p_tenant_id: tenantId,
    });

    if (error) throw error;
    return data || [];
  }

  /**
   * Fetch permissions not assigned to any role (orphaned)
   */
  async fetchOrphanedPermissions(tenantId: string): Promise<Permission[]> {
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from('permissions')
      .select('id, code, name, tenant_id')
      .eq('tenant_id', tenantId)
      .not('id', 'in', `(
        SELECT DISTINCT permission_id
        FROM role_permissions
        WHERE tenant_id = '${tenantId}'
      )`);

    if (error) throw error;
    return data || [];
  }

  /**
   * Fetch active surface license bindings
   */
  async fetchActiveSurfaceLicenseBindings(): Promise<SurfaceLicenseBinding[]> {
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from('surface_license_bindings')
      .select(`
        surface_id,
        required_bundle_id,
        is_active,
        metadata_surfaces(id, title),
        license_feature_bundles(id, name)
      `)
      .eq('is_active', true);

    if (error) throw error;
    return data || [];
  }

  /**
   * Fetch all active tenants
   */
  async fetchActiveTenants(): Promise<Tenant[]> {
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from('tenants')
      .select('id')
      .eq('is_active', true);

    if (error) throw error;
    return data || [];
  }
}
