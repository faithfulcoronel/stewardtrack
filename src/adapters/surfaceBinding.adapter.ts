import 'server-only';
import { injectable, inject } from 'inversify';
import { BaseAdapter, type IBaseAdapter } from '@/adapters/base.adapter';
import { TYPES } from '@/lib/types';
import type { AuditService } from '@/services/AuditService';
import type { RbacSurfaceBinding, CreateSurfaceBindingDto } from '@/models/rbac.model';

export interface ISurfaceBindingAdapter extends IBaseAdapter<RbacSurfaceBinding> {
  createSurfaceBinding(data: CreateSurfaceBindingDto, tenantId: string): Promise<RbacSurfaceBinding>;
  updateSurfaceBinding(id: string, data: Partial<CreateSurfaceBindingDto>, tenantId: string): Promise<RbacSurfaceBinding>;
  deleteSurfaceBinding(id: string, tenantId: string): Promise<void>;
  getSurfaceBindings(tenantId: string): Promise<RbacSurfaceBinding[]>;
  getSurfaceBinding(id: string, tenantId: string): Promise<RbacSurfaceBinding | null>;
}

@injectable()
export class SurfaceBindingAdapter extends BaseAdapter<RbacSurfaceBinding> implements ISurfaceBindingAdapter {
  constructor(
    @inject(TYPES.AuditService) private auditService: AuditService
  ) {
    super();
  }

  protected tableName = 'rbac_surface_bindings';
  protected defaultSelect = `*`;

  async createSurfaceBinding(data: CreateSurfaceBindingDto, tenantId: string): Promise<RbacSurfaceBinding> {
    const supabase = await this.getSupabaseClient();
    const { data: result, error } = await supabase
      .from(this.tableName)
      .insert({
        ...data,
        tenant_id: tenantId,
        is_active: true
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create surface binding: ${error.message}`);
    }

    if (!result) {
      throw new Error('Failed to create surface binding: missing response payload');
    }

    return result;
  }

  async updateSurfaceBinding(
    id: string,
    data: Partial<CreateSurfaceBindingDto>,
    tenantId: string
  ): Promise<RbacSurfaceBinding> {
    const supabase = await this.getSupabaseClient();
    const { data: result, error } = await supabase
      .from(this.tableName)
      .update({
        ...data,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .select()
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to update surface binding: ${error.message}`);
    }

    if (!result) {
      throw new Error('Surface binding not found');
    }

    return result;
  }

  async deleteSurfaceBinding(id: string, tenantId: string): Promise<void> {
    const supabase = await this.getSupabaseClient();
    const { data, error } = await supabase
      .from(this.tableName)
      .delete()
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .select('id')
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to delete surface binding: ${error.message}`);
    }

    if (!data) {
      throw new Error('Surface binding not found');
    }
  }

  async getSurfaceBindings(tenantId: string): Promise<RbacSurfaceBinding[]> {
    const supabase = await this.getSupabaseClient();
    const { data, error } = await supabase
      .from(this.tableName)
      .select(`
        *,
        role:roles (id, name),
        bundle:permission_bundles (id, name)
      `)
      .eq('tenant_id', tenantId)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch surface bindings: ${error.message}`);
    }

    return data || [];
  }

  async getSurfaceBinding(id: string, tenantId: string): Promise<RbacSurfaceBinding | null> {
    const supabase = await this.getSupabaseClient();
    const { data, error } = await supabase
      .from(this.tableName)
      .select('*')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }

      throw new Error(`Failed to fetch surface binding: ${error.message}`);
    }

    return data ?? null;
  }
}
