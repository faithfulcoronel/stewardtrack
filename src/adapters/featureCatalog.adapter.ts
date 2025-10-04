import 'server-only';
import { injectable, inject } from 'inversify';
import { BaseAdapter, type IBaseAdapter } from '@/adapters/base.adapter';
import { TYPES } from '@/lib/types';
import type { AuditService } from '@/services/AuditService';
import type { FeatureCatalog } from '@/models/rbac.model';

export interface IFeatureCatalogAdapter extends IBaseAdapter<FeatureCatalog> {
  getFeatureCatalog(): Promise<FeatureCatalog[]>;
  getFeatures(filters?: {
    category?: string;
    phase?: string;
    is_active?: boolean;
  }): Promise<FeatureCatalog[]>;
  createFeature(data: {
    code: string;
    name: string;
    category: string;
    description?: string;
    phase: string;
    is_delegatable: boolean;
    is_active: boolean;
  }): Promise<FeatureCatalog>;
}

@injectable()
export class FeatureCatalogAdapter extends BaseAdapter<FeatureCatalog> implements IFeatureCatalogAdapter {
  constructor(
    @inject(TYPES.AuditService) private auditService: AuditService
  ) {
    super();
  }

  protected tableName = 'feature_catalog';
  protected defaultSelect = `*`;

  async getFeatureCatalog(): Promise<FeatureCatalog[]> {
    const supabase = await this.getSupabaseClient();
    const { data, error } = await supabase
      .from(this.tableName)
      .select('*')
      .eq('is_active', true)
      .order('category', { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch feature catalog: ${error.message}`);
    }

    return data || [];
  }

  async getFeatures(filters?: {
    category?: string;
    phase?: string;
    is_active?: boolean;
  }): Promise<FeatureCatalog[]> {
    const supabase = await this.getSupabaseClient();

    let query = supabase
      .from(this.tableName)
      .select('*');

    if (filters?.category) {
      query = query.eq('category', filters.category);
    }
    if (filters?.phase) {
      query = query.eq('phase', filters.phase);
    }
    if (filters?.is_active !== undefined) {
      query = query.eq('is_active', filters.is_active);
    }

    const { data, error } = await query.order('category').order('name');

    if (error) {
      throw new Error(`Failed to fetch features: ${error.message}`);
    }

    return data || [];
  }

  async createFeature(featureData: {
    code: string;
    name: string;
    category: string;
    description?: string;
    phase: string;
    is_delegatable: boolean;
    is_active: boolean;
  }): Promise<FeatureCatalog> {
    const supabase = await this.getSupabaseClient();

    const { data, error } = await supabase
      .from(this.tableName)
      .insert({
        ...featureData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create feature: ${error.message}`);
    }

    if (!data) {
      throw new Error('Failed to create feature: missing response payload');
    }

    return data;
  }
}
