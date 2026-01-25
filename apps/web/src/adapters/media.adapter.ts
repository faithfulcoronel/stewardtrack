import 'server-only';
import { injectable } from 'inversify';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseServiceClient } from '@/lib/supabase/service';

// =============================================================================
// Media Category Type (matches database enum)
// =============================================================================
export type MediaCategory =
  | 'church_logos'
  | 'church_images'
  | 'member_photos'
  | 'editor_images'
  | 'schedule_covers'
  | 'other';

// =============================================================================
// Domain Models
// =============================================================================
export interface TenantMedia {
  id: string;
  tenant_id: string;
  bucket_name: string;
  file_path: string;
  public_url: string;
  original_filename: string | null;
  mime_type: string;
  file_size_bytes: number;
  category: MediaCategory;
  entity_type: string | null;
  entity_id: string | null;
  entity_field: string | null;
  uploaded_by: string | null;
  uploaded_at: string;
  deleted_at: string | null;
}

export interface CreateMediaDto {
  bucket_name: string;
  file_path: string;
  public_url: string;
  original_filename?: string | null;
  mime_type: string;
  file_size_bytes: number;
  category: MediaCategory;
  entity_type?: string | null;
  entity_id?: string | null;
  entity_field?: string | null;
  uploaded_by?: string | null;
}

export interface MediaQueryOptions {
  category?: MediaCategory;
  includeDeleted?: boolean;
  limit?: number;
  offset?: number;
  orderBy?: 'uploaded_at' | 'file_size_bytes' | 'original_filename';
  orderDirection?: 'asc' | 'desc';
}

export interface StorageUsage {
  total_files: number;
  total_bytes: number;
  by_category: Record<string, { count: number; bytes: number }>;
}

export interface MediaDependency {
  entity_type: string;
  entity_id: string;
  entity_name: string;
  entity_field: string;
}

// =============================================================================
// Interface
// =============================================================================
export interface IMediaAdapter {
  createMedia(data: CreateMediaDto, tenantId: string): Promise<TenantMedia>;
  findByTenant(tenantId: string, options?: MediaQueryOptions): Promise<TenantMedia[]>;
  findById(id: string, tenantId: string): Promise<TenantMedia | null>;
  findByPublicUrl(publicUrl: string, tenantId: string): Promise<TenantMedia | null>;
  softDelete(id: string, tenantId: string): Promise<void>;
  hardDelete(id: string, tenantId: string): Promise<void>;
  updateEntityLink(
    id: string,
    tenantId: string,
    entityType: string | null,
    entityId: string | null,
    entityField: string | null
  ): Promise<TenantMedia>;
  getStorageUsage(tenantId: string): Promise<StorageUsage>;
  getDependencies(publicUrl: string, tenantId: string): Promise<MediaDependency[]>;
  countByTenant(tenantId: string, options?: MediaQueryOptions): Promise<number>;
}

// =============================================================================
// Implementation
// =============================================================================
@injectable()
export class MediaAdapter implements IMediaAdapter {
  private supabase: SupabaseClient | null = null;

  private async getSupabaseClient(): Promise<SupabaseClient> {
    if (!this.supabase) {
      this.supabase = await getSupabaseServiceClient();
    }
    return this.supabase;
  }

  async createMedia(data: CreateMediaDto, tenantId: string): Promise<TenantMedia> {
    const supabase = await this.getSupabaseClient();

    const { data: result, error } = await supabase
      .from('tenant_media')
      .insert({
        tenant_id: tenantId,
        bucket_name: data.bucket_name,
        file_path: data.file_path,
        public_url: data.public_url,
        original_filename: data.original_filename ?? null,
        mime_type: data.mime_type,
        file_size_bytes: data.file_size_bytes,
        category: data.category,
        entity_type: data.entity_type ?? null,
        entity_id: data.entity_id ?? null,
        entity_field: data.entity_field ?? null,
        uploaded_by: data.uploaded_by ?? null,
      })
      .select('*')
      .single();

    if (error) {
      // Handle unique constraint violation (file already tracked)
      if (error.code === '23505') {
        // Return existing record instead
        const existing = await this.findByPublicUrl(data.public_url, tenantId);
        if (existing) {
          return existing;
        }
      }
      throw new Error(`Failed to create media record: ${error.message}`);
    }

    if (!result) {
      throw new Error('Failed to create media record: missing response payload');
    }

    return result as unknown as TenantMedia;
  }

  async findByTenant(tenantId: string, options?: MediaQueryOptions): Promise<TenantMedia[]> {
    const supabase = await this.getSupabaseClient();

    let query = supabase
      .from('tenant_media')
      .select('*')
      .eq('tenant_id', tenantId);

    // Filter by category
    if (options?.category) {
      query = query.eq('category', options.category);
    }

    // Include or exclude deleted
    if (!options?.includeDeleted) {
      query = query.is('deleted_at', null);
    }

    // Ordering
    const orderBy = options?.orderBy || 'uploaded_at';
    const orderDirection = options?.orderDirection || 'desc';
    query = query.order(orderBy, { ascending: orderDirection === 'asc' });

    // Pagination - use range() which handles both offset and limit
    const limit = options?.limit ?? 50;
    const offset = options?.offset ?? 0;
    query = query.range(offset, offset + limit - 1);

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to fetch media: ${error.message}`);
    }

    return (data as unknown as TenantMedia[]) || [];
  }

  async findById(id: string, tenantId: string): Promise<TenantMedia | null> {
    const supabase = await this.getSupabaseClient();

    const { data, error } = await supabase
      .from('tenant_media')
      .select('*')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      throw new Error(`Failed to fetch media by ID: ${error.message}`);
    }

    return data as unknown as TenantMedia;
  }

  async findByPublicUrl(publicUrl: string, tenantId: string): Promise<TenantMedia | null> {
    const supabase = await this.getSupabaseClient();

    const { data, error } = await supabase
      .from('tenant_media')
      .select('*')
      .eq('public_url', publicUrl)
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      throw new Error(`Failed to fetch media by URL: ${error.message}`);
    }

    return data as unknown as TenantMedia;
  }

  async softDelete(id: string, tenantId: string): Promise<void> {
    const supabase = await this.getSupabaseClient();

    const { error } = await supabase
      .from('tenant_media')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)
      .eq('tenant_id', tenantId);

    if (error) {
      throw new Error(`Failed to soft delete media: ${error.message}`);
    }
  }

  async hardDelete(id: string, tenantId: string): Promise<void> {
    const supabase = await this.getSupabaseClient();

    const { error } = await supabase
      .from('tenant_media')
      .delete()
      .eq('id', id)
      .eq('tenant_id', tenantId);

    if (error) {
      throw new Error(`Failed to delete media: ${error.message}`);
    }
  }

  async updateEntityLink(
    id: string,
    tenantId: string,
    entityType: string | null,
    entityId: string | null,
    entityField: string | null
  ): Promise<TenantMedia> {
    const supabase = await this.getSupabaseClient();

    const { data, error } = await supabase
      .from('tenant_media')
      .update({
        entity_type: entityType,
        entity_id: entityId,
        entity_field: entityField,
      })
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .select('*')
      .single();

    if (error) {
      throw new Error(`Failed to update media entity link: ${error.message}`);
    }

    if (!data) {
      throw new Error('Failed to update media entity link: missing response payload');
    }

    return data as unknown as TenantMedia;
  }

  async getStorageUsage(tenantId: string): Promise<StorageUsage> {
    const supabase = await this.getSupabaseClient();

    const { data, error } = await supabase.rpc('get_tenant_storage_usage', {
      p_tenant_id: tenantId,
    });

    if (error) {
      throw new Error(`Failed to get storage usage: ${error.message}`);
    }

    // The RPC returns a single row with the aggregated data
    const result = Array.isArray(data) ? data[0] : data;

    return {
      total_files: result?.total_files ?? 0,
      total_bytes: result?.total_bytes ?? 0,
      by_category: result?.by_category ?? {},
    };
  }

  async getDependencies(publicUrl: string, tenantId: string): Promise<MediaDependency[]> {
    const supabase = await this.getSupabaseClient();

    const { data, error } = await supabase.rpc('get_media_dependencies', {
      p_public_url: publicUrl,
      p_tenant_id: tenantId,
    });

    if (error) {
      throw new Error(`Failed to get media dependencies: ${error.message}`);
    }

    return (data as unknown as MediaDependency[]) || [];
  }

  async countByTenant(tenantId: string, options?: MediaQueryOptions): Promise<number> {
    const supabase = await this.getSupabaseClient();

    let query = supabase
      .from('tenant_media')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId);

    if (options?.category) {
      query = query.eq('category', options.category);
    }

    if (!options?.includeDeleted) {
      query = query.is('deleted_at', null);
    }

    const { count, error } = await query;

    if (error) {
      throw new Error(`Failed to count media: ${error.message}`);
    }

    return count || 0;
  }
}
