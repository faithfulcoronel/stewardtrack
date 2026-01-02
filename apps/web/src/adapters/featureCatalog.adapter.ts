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
    tier?: string | null;
    phase: string;
    is_delegatable: boolean;
    is_active: boolean;
  }): Promise<FeatureCatalog>;
  hardDeleteFeature(id: string): Promise<void>;
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

  /**
   * Override fetchById to bypass tenant filtering
   * feature_catalog is a global/system table with no tenant_id column
   */
  async fetchById(id: string): Promise<FeatureCatalog | null> {
    const supabase = await this.getSupabaseClient();
    const { data, error } = await supabase
      .from(this.tableName)
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // Not found
        return null;
      }
      throw new Error(`Failed to fetch feature by ID: ${error.message}`);
    }

    return data || null;
  }

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
    tier?: string | null;
    phase: string;
    is_delegatable: boolean;
    is_active: boolean;
  }): Promise<FeatureCatalog> {
    const supabase = await this.getSupabaseClient();

    const { data, error } = await supabase
      .from(this.tableName)
      .insert({
        ...featureData,
        tier: featureData.tier ?? null,
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

  /**
   * Override update to bypass tenant filtering
   * feature_catalog is a global/system table with no tenant_id column
   */
  async update(
    id: string,
    data: Partial<FeatureCatalog>,
    _relations?: Record<string, string[]>,
    fieldsToRemove: string[] = []
  ): Promise<FeatureCatalog> {
    const supabase = await this.getSupabaseClient();

    // Run pre-update hook
    let processedData = await this.onBeforeUpdate(id, data);

    // Remove specified fields
    if (fieldsToRemove.length > 0) {
      const sanitized = { ...processedData };
      for (const field of fieldsToRemove) {
        delete (sanitized as any)[field];
      }
      processedData = sanitized;
    }

    // Update record (NO tenant_id filter - global table)
    const userId = await this.getUserId();
    const { data: updated, error: updateError } = await supabase
      .from(this.tableName)
      .update({
        ...processedData,
        updated_by: userId,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      throw new Error(`Failed to update feature: ${updateError.message}`);
    }

    if (!updated) {
      throw new Error('Failed to update feature: no data returned');
    }

    // Run post-update hook
    await this.onAfterUpdate(updated as FeatureCatalog);

    return updated as FeatureCatalog;
  }

  /**
   * Hard delete feature catalog entry (no soft delete)
   */
  async hardDeleteFeature(id: string): Promise<void> {
    const supabase = await this.getSupabaseClient();
    const { error } = await supabase
      .from(this.tableName)
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(`Failed to delete feature: ${error.message}`);
    }
  }
}
