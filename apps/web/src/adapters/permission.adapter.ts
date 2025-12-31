import 'server-only';
import { injectable, inject } from 'inversify';
import { BaseAdapter, type IBaseAdapter } from '@/adapters/base.adapter';
import { TYPES } from '@/lib/types';
import type { AuditService } from '@/services/AuditService';
import type { Permission } from '@/models/rbac.model';

/**
 * Permission Adapter - Handles permission queries
 * Permissions are mostly read-only in the RBAC system
 */
export interface IPermissionAdapter extends IBaseAdapter<Permission> {
  getPermissions(tenantId: string, module?: string): Promise<Permission[]>;
  getPermission(id: string): Promise<Permission | null>;
  findByCode(tenantId: string, code: string): Promise<Permission | null>;
  getByTenantId(tenantId: string): Promise<Permission[]>;
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
}
