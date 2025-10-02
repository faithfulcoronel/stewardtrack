import 'server-only';
import { injectable, inject } from 'inversify';
import { BaseAdapter, type IBaseAdapter } from '@/adapters/base.adapter';
import { TYPES } from '@/lib/types';
import type { AuditService } from '@/services/audit.service';
import type {
  PermissionBundle,
  CreatePermissionBundleDto,
  UpdatePermissionBundleDto,
  BundleWithPermissions
} from '@/models/rbac.model';

/**
 * PermissionBundle Adapter - Handles permission bundle operations
 * Extracted from rbac.repository.ts for Phase 1 RBAC refactoring
 */
export interface IPermissionBundleAdapter extends IBaseAdapter<PermissionBundle> {
  createPermissionBundle(data: CreatePermissionBundleDto, tenantId: string): Promise<PermissionBundle>;
  updatePermissionBundle(id: string, data: UpdatePermissionBundleDto, tenantId: string): Promise<PermissionBundle>;
  deletePermissionBundle(id: string, tenantId: string): Promise<void>;
  getPermissionBundles(tenantId: string, scopeFilter?: string): Promise<PermissionBundle[]>;
  getBundleWithPermissions(id: string, tenantId: string): Promise<BundleWithPermissions | null>;
  addPermissionsToBundle(bundleId: string, permissionIds: string[], tenantId: string): Promise<void>;
  removePermissionsFromBundle(bundleId: string, permissionIds: string[], tenantId: string): Promise<void>;
  getBundlePermissions(bundleId: string, tenantId: string): Promise<any[]>;
  getBundleStatistics(tenantId: string, scopeFilter?: string): Promise<PermissionBundle[]>;
}

@injectable()
export class PermissionBundleAdapter extends BaseAdapter<PermissionBundle> implements IPermissionBundleAdapter {
  constructor(
    @inject(TYPES.AuditService) private auditService: AuditService
  ) {
    super();
  }

  protected tableName = 'permission_bundles';
  protected defaultSelect = `*`;

  async createPermissionBundle(data: CreatePermissionBundleDto, tenantId: string): Promise<PermissionBundle> {
    const supabase = await this.getSupabaseClient();
    const { permission_ids, ...bundleData } = data;

    // Auto-generate code from name if not provided
    const code = bundleData.code || bundleData.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');

    const { data: result, error } = await supabase
      .from('permission_bundles')
      .insert({
        ...bundleData,
        code,
        tenant_id: tenantId,
        is_template: bundleData.is_template || false
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create permission bundle: ${error.message}`);
    }

    // Add permissions to bundle if provided
    if (permission_ids && permission_ids.length > 0) {
      await this.addPermissionsToBundle(result.id, permission_ids, tenantId);
    }

    return result;
  }

  async updatePermissionBundle(id: string, data: UpdatePermissionBundleDto, tenantId: string): Promise<PermissionBundle> {
    const supabase = await this.getSupabaseClient();
    const { data: result, error } = await supabase
      .from('permission_bundles')
      .update({
        ...data,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update permission bundle: ${error.message}`);
    }

    return result;
  }

  async deletePermissionBundle(id: string, tenantId: string): Promise<void> {
    const supabase = await this.getSupabaseClient();
    const { error } = await supabase
      .from('permission_bundles')
      .delete()
      .eq('id', id)
      .eq('tenant_id', tenantId);

    if (error) {
      throw new Error(`Failed to delete permission bundle: ${error.message}`);
    }
  }

  async getPermissionBundles(tenantId: string, scopeFilter?: string): Promise<PermissionBundle[]> {
    const supabase = await this.getSupabaseClient();
    let query = supabase
      .from('permission_bundles')
      .select('*')
      .eq('tenant_id', tenantId);

    if (scopeFilter) {
      query = query.eq('scope', scopeFilter);
    }

    const { data, error } = await query.order('name');

    if (error) {
      throw new Error(`Failed to fetch permission bundles: ${error.message}`);
    }

    return data || [];
  }

  async getBundleWithPermissions(id: string, tenantId: string): Promise<BundleWithPermissions | null> {
    const supabase = await this.getSupabaseClient();
    const { data, error } = await supabase
      .from('permission_bundles')
      .select(`
        *,
        bundle_permissions!inner (
          permissions (*)
        )
      `)
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw new Error(`Failed to fetch bundle: ${error.message}`);
    }

    if (!data) return null;

    // Get role count for this bundle
    const { count } = await supabase
      .from('role_bundles')
      .select('*', { count: 'exact', head: true })
      .eq('bundle_id', id)
      .eq('tenant_id', tenantId);

    return {
      ...data,
      permissions: data.bundle_permissions?.map((bp: any) => bp.permissions) || [],
      role_count: count || 0
    };
  }

  async addPermissionsToBundle(bundleId: string, permissionIds: string[], tenantId: string): Promise<void> {
    const supabase = await this.getSupabaseClient();
    const bundlePermissions = permissionIds.map(permissionId => ({
      bundle_id: bundleId,
      permission_id: permissionId,
      tenant_id: tenantId
    }));

    const { error } = await supabase
      .from('bundle_permissions')
      .insert(bundlePermissions);

    if (error) {
      throw new Error(`Failed to add permissions to bundle: ${error.message}`);
    }
  }

  async removePermissionsFromBundle(bundleId: string, permissionIds: string[], tenantId: string): Promise<void> {
    const supabase = await this.getSupabaseClient();
    const { error } = await supabase
      .from('bundle_permissions')
      .delete()
      .eq('bundle_id', bundleId)
      .eq('tenant_id', tenantId)
      .in('permission_id', permissionIds);

    if (error) {
      throw new Error(`Failed to remove permissions from bundle: ${error.message}`);
    }
  }

  async getBundlePermissions(bundleId: string, tenantId: string): Promise<any[]> {
    const supabase = await this.getSupabaseClient();

    try {
      // Get permissions that belong to this bundle
      const { data: bundlePermissionsData, error: bundlePermissionsError } = await supabase
        .from('bundle_permissions')
        .select(`
          id,
          permission_id,
          bundle_id,
          permissions (
            id,
            name,
            action,
            module,
            description,
            scope
          )
        `)
        .eq('bundle_id', bundleId);

      if (bundlePermissionsError) {
        console.error('Error fetching bundle permissions:', bundlePermissionsError);
        return [];
      }

      if (!bundlePermissionsData || bundlePermissionsData.length === 0) {
        return [];
      }

      // Extract and return the permissions
      return bundlePermissionsData.map(bp => bp.permissions).filter(Boolean);
    } catch (error) {
      console.error('Error in getBundlePermissions:', error);
      return [];
    }
  }

  async getBundleStatistics(tenantId: string, scopeFilter?: string): Promise<PermissionBundle[]> {
    const supabase = await this.getSupabaseClient();
    let bundleQuery = supabase
      .from('permission_bundles')
      .select('*')
      .eq('tenant_id', tenantId);

    if (scopeFilter) {
      bundleQuery = bundleQuery.eq('scope', scopeFilter);
    }

    const { data: bundlesData, error: bundlesError } = await bundleQuery.order('name');

    if (bundlesError) {
      throw new Error(`Failed to fetch bundle statistics: ${bundlesError.message}`);
    }

    const bundles = bundlesData || [];

    // Get role counts and permission counts for each bundle
    for (const bundle of bundles) {
      // Get role count for this bundle
      const { count: roleCount } = await supabase
        .from('role_bundles')
        .select('*', { count: 'exact', head: true })
        .eq('bundle_id', bundle.id)
        .eq('tenant_id', tenantId);

      (bundle as any).role_count = roleCount || 0;

      // Get permission count for this bundle
      const { count: permissionCount } = await supabase
        .from('bundle_permissions')
        .select('*', { count: 'exact', head: true })
        .eq('bundle_id', bundle.id)
        .eq('tenant_id', tenantId);

      (bundle as any).permission_count = permissionCount || 0;
    }

    return bundles;
  }
}
