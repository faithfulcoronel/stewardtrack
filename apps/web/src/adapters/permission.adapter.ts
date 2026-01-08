import 'server-only';
import { injectable, inject } from 'inversify';
import { BaseAdapter, type IBaseAdapter } from '@/adapters/base.adapter';
import { TYPES } from '@/lib/types';
import type { AuditService } from '@/services/AuditService';
import type { Permission } from '@/models/rbac.model';
import { getSupabaseServiceClient } from '@/lib/supabase/service';
import { isCachedSuperAdmin } from '@/lib/auth/authCache';
import { UnauthorizedError } from '@/utils/errorHandler';

/**
 * Permission Adapter - Handles permission queries
 * Permissions are mostly read-only in the RBAC system
 */
export interface IPermissionAdapter extends IBaseAdapter<Permission> {
  getPermissions(tenantId: string, module?: string): Promise<Permission[]>;
  getPermission(id: string): Promise<Permission | null>;
  findByCode(tenantId: string, code: string): Promise<Permission | null>;
  getByTenantId(tenantId: string): Promise<Permission[]>;
  /** Create permission with elevated access (bypasses RLS) for super admin operations */
  createWithElevatedAccess(data: Partial<Permission>): Promise<Permission>;
  /** Update permission with elevated access (bypasses RLS) for super admin operations */
  updateWithElevatedAccess(id: string, data: Partial<Permission>): Promise<Permission>;
  /** Find permission by code with elevated access (bypasses RLS) for super admin operations */
  findByCodeWithElevatedAccess(tenantId: string, code: string): Promise<Permission | null>;
}

@injectable()
export class PermissionAdapter extends BaseAdapter<Permission> implements IPermissionAdapter {
  constructor(
    @inject(TYPES.AuditService) private auditService: AuditService
  ) {
    super();
  }

  protected tableName = 'permissions';
  protected defaultSelect = `*`;

  async getPermissions(tenantId: string, module?: string): Promise<Permission[]> {
    const supabase = await this.getSupabaseClient();
    let query = supabase
      .from(this.tableName)
      .select('*')
      .eq('tenant_id', tenantId);

    if (module) {
      query = query.eq('module', module);
    }

    const { data, error } = await query.order('module', { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch permissions: ${error.message}`);
    }

    return data || [];
  }

  async getPermission(id: string): Promise<Permission | null> {
    const supabase = await this.getSupabaseClient();

    const { data, error } = await supabase
      .from(this.tableName)
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      throw new Error(`Failed to fetch permission: ${error.message}`);
    }

    return data;
  }

  async findByCode(tenantId: string, code: string): Promise<Permission | null> {
    const supabase = await this.getSupabaseClient();

    const { data, error } = await supabase
      .from(this.tableName)
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('code', code)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to find permission by code: ${error.message}`);
    }

    return data;
  }

  async getByTenantId(tenantId: string): Promise<Permission[]> {
    const supabase = await this.getSupabaseClient();

    const { data, error } = await supabase
      .from(this.tableName)
      .select('*')
      .eq('tenant_id', tenantId)
      .order('code', { ascending: true });

    if (error) {
      throw new Error(`Failed to get permissions by tenant: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Create permission with elevated access (bypasses RLS) for super admin operations.
   * This allows creating permissions for any tenant, not just the current user's tenant.
   * @throws UnauthorizedError if the current user is not a super admin
   */
  async createWithElevatedAccess(data: Partial<Permission>): Promise<Permission> {
    const isSuperAdmin = await isCachedSuperAdmin();
    if (!isSuperAdmin) {
      throw new UnauthorizedError('Creating permissions with elevated access requires super admin privileges');
    }

    const supabase = await getSupabaseServiceClient();

    const { data: result, error } = await supabase
      .from(this.tableName)
      .insert(data)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create permission with elevated access: ${error.message}`);
    }

    return result as Permission;
  }

  /**
   * Update permission with elevated access (bypasses RLS) for super admin operations.
   * This allows updating permissions for any tenant, not just the current user's tenant.
   * @throws UnauthorizedError if the current user is not a super admin
   */
  async updateWithElevatedAccess(id: string, data: Partial<Permission>): Promise<Permission> {
    const isSuperAdmin = await isCachedSuperAdmin();
    if (!isSuperAdmin) {
      throw new UnauthorizedError('Updating permissions with elevated access requires super admin privileges');
    }

    const supabase = await getSupabaseServiceClient();

    const { data: result, error } = await supabase
      .from(this.tableName)
      .update(data)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update permission with elevated access: ${error.message}`);
    }

    return result as Permission;
  }

  /**
   * Find permission by code with elevated access (bypasses RLS) for super admin operations.
   * This allows querying permissions for any tenant.
   * @throws UnauthorizedError if the current user is not a super admin
   */
  async findByCodeWithElevatedAccess(tenantId: string, code: string): Promise<Permission | null> {
    const isSuperAdmin = await isCachedSuperAdmin();
    if (!isSuperAdmin) {
      throw new UnauthorizedError('Finding permissions with elevated access requires super admin privileges');
    }

    const supabase = await getSupabaseServiceClient();

    const { data, error } = await supabase
      .from(this.tableName)
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('code', code)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to find permission by code with elevated access: ${error.message}`);
    }

    return data;
  }
}
