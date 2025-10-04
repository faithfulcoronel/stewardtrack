import 'server-only';
import { injectable, inject } from 'inversify';
import { BaseAdapter, type IBaseAdapter } from '@/adapters/base.adapter';
import { TYPES } from '@/lib/types';
import type { AuditService } from '@/services/AuditService';
import type { MetadataSurface } from '@/models/rbac.model';

export interface IMetadataSurfaceAdapter extends IBaseAdapter<MetadataSurface> {
  getMetadataSurfaces(
    tenantId: string,
    filters?: {
      module?: string;
      phase?: string;
      surface_type?: string;
    }
  ): Promise<MetadataSurface[]>;
  createMetadataSurface(data: {
    module: string;
    route?: string;
    blueprint_path: string;
    surface_type: string;
    phase: string;
    title?: string;
    description?: string;
    feature_code?: string;
    rbac_role_keys?: string[];
    rbac_bundle_keys?: string[];
    default_menu_code?: string;
    supports_mobile: boolean;
    supports_desktop: boolean;
    is_system: boolean;
  }): Promise<MetadataSurface>;
}

@injectable()
export class MetadataSurfaceAdapter extends BaseAdapter<MetadataSurface> implements IMetadataSurfaceAdapter {
  constructor(
    @inject(TYPES.AuditService) private auditService: AuditService
  ) {
    super();
  }

  protected tableName = 'metadata_surfaces';
  protected defaultSelect = `*`;

  async getMetadataSurfaces(
    _tenantId: string,
    filters?: {
      module?: string;
      phase?: string;
      surface_type?: string;
    }
  ): Promise<MetadataSurface[]> {
    const supabase = await this.getSupabaseClient();

    let query = supabase
      .from(this.tableName)
      .select('*');

    if (filters?.module) {
      query = query.eq('module', filters.module);
    }

    if (filters?.phase) {
      query = query.eq('phase', filters.phase);
    }

    if (filters?.surface_type) {
      query = query.eq('surface_type', filters.surface_type);
    }

    const { data, error } = await query
      .order('module', { ascending: true })
      .order('title', { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch metadata surfaces: ${error.message}`);
    }

    return data || [];
  }

  async createMetadataSurface(surfaceData: {
    module: string;
    route?: string;
    blueprint_path: string;
    surface_type: string;
    phase: string;
    title?: string;
    description?: string;
    feature_code?: string;
    rbac_role_keys?: string[];
    rbac_bundle_keys?: string[];
    default_menu_code?: string;
    supports_mobile: boolean;
    supports_desktop: boolean;
    is_system: boolean;
  }): Promise<MetadataSurface> {
    const supabase = await this.getSupabaseClient();

    const { data, error } = await supabase
      .from(this.tableName)
      .insert({
        ...surfaceData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create metadata surface: ${error.message}`);
    }

    if (!data) {
      throw new Error('Failed to create metadata surface: missing response payload');
    }

    return data;
  }
}
