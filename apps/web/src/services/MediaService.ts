import 'server-only';
import { injectable, inject } from 'inversify';
import { TYPES } from '@/lib/types';
import { tenantUtils } from '@/utils/tenantUtils';
import type { IMediaRepository } from '@/repositories/media.repository';
import type { IStorageRepository } from '@/repositories/storage.repository';
import type {
  TenantMedia,
  CreateMediaDto,
  MediaQueryOptions,
  StorageUsage,
  MediaDependency,
  MediaCategory,
} from '@/adapters/media.adapter';

// =============================================================================
// DTOs & Result Types
// =============================================================================
export interface TrackMediaDto {
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

export interface GalleryOptions {
  category?: MediaCategory;
  search?: string;
  limit?: number;
  offset?: number;
  orderBy?: 'uploaded_at' | 'file_size_bytes' | 'original_filename';
  orderDirection?: 'asc' | 'desc';
}

export interface MediaGalleryResult {
  items: TenantMedia[];
  total: number;
  hasMore: boolean;
}

export interface DeleteMediaResult {
  success: boolean;
  message: string;
  dependencies?: MediaDependency[];
  deletedFromStorage?: boolean;
}

export interface StorageUsageResult extends StorageUsage {
  formatted: {
    totalFiles: string;
    totalBytes: string;
    byCategory: Record<string, { count: string; bytes: string }>;
  };
}

// =============================================================================
// Interface
// =============================================================================
export interface IMediaService {
  trackUpload(data: TrackMediaDto, tenantId?: string): Promise<TenantMedia>;
  deleteMedia(id: string, tenantId?: string, force?: boolean): Promise<DeleteMediaResult>;
  getGallery(tenantId?: string, options?: GalleryOptions): Promise<MediaGalleryResult>;
  getStorageUsage(tenantId?: string): Promise<StorageUsageResult>;
  getDependencies(mediaId: string, tenantId?: string): Promise<MediaDependency[]>;
  getMediaById(id: string, tenantId?: string): Promise<TenantMedia | null>;
  updateEntityLink(
    mediaId: string,
    entityType: string | null,
    entityId: string | null,
    entityField: string | null,
    tenantId?: string
  ): Promise<TenantMedia>;
}

// =============================================================================
// Implementation
// =============================================================================
@injectable()
export class MediaService implements IMediaService {
  constructor(
    @inject(TYPES.IMediaRepository)
    private mediaRepository: IMediaRepository,
    @inject(TYPES.IStorageRepository)
    private storageRepository: IStorageRepository
  ) {}

  /**
   * Resolve tenant ID from parameter or current context
   */
  private async resolveTenantId(tenantId?: string): Promise<string> {
    const resolved = tenantId ?? (await tenantUtils.getTenantId());
    if (!resolved) {
      throw new Error('No tenant context available');
    }
    return resolved;
  }

  /**
   * Format bytes to human-readable string
   */
  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';

    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Format number with thousands separator
   */
  private formatNumber(num: number): string {
    return num.toLocaleString();
  }

  /**
   * Track a new media upload in the tenant_media table
   */
  async trackUpload(data: TrackMediaDto, tenantId?: string): Promise<TenantMedia> {
    const effectiveTenantId = await this.resolveTenantId(tenantId);

    const createData: CreateMediaDto = {
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
    };

    return await this.mediaRepository.createMedia(createData, effectiveTenantId);
  }

  /**
   * Delete media with dependency checking
   * Returns success status and any dependencies found
   */
  async deleteMedia(id: string, tenantId?: string, force?: boolean): Promise<DeleteMediaResult> {
    const effectiveTenantId = await this.resolveTenantId(tenantId);

    // Get the media record
    const media = await this.mediaRepository.findById(id, effectiveTenantId);
    if (!media) {
      return {
        success: false,
        message: 'Media not found',
      };
    }

    // Check for dependencies
    const dependencies = await this.mediaRepository.getDependencies(
      media.public_url,
      effectiveTenantId
    );

    // If there are dependencies and force is not set, return warning
    if (dependencies.length > 0 && !force) {
      return {
        success: false,
        message: `This media is used by ${dependencies.length} item(s). Use force=true to delete anyway.`,
        dependencies,
      };
    }

    // Soft delete the record in tenant_media
    await this.mediaRepository.softDelete(id, effectiveTenantId);

    // Optionally delete from storage (only if force and no dependencies, or explicitly requested)
    let deletedFromStorage = false;
    if (force && dependencies.length === 0) {
      try {
        await this.storageRepository.delete(media.bucket_name, [media.file_path]);
        deletedFromStorage = true;
      } catch (error) {
        // Log but don't fail - the record is already soft-deleted
        console.error('Failed to delete from storage:', error);
      }
    }

    return {
      success: true,
      message: dependencies.length > 0
        ? `Media soft-deleted. Note: ${dependencies.length} item(s) still reference this URL.`
        : 'Media deleted successfully',
      dependencies: dependencies.length > 0 ? dependencies : undefined,
      deletedFromStorage,
    };
  }

  /**
   * Get paginated media gallery for a tenant
   */
  async getGallery(tenantId?: string, options?: GalleryOptions): Promise<MediaGalleryResult> {
    const effectiveTenantId = await this.resolveTenantId(tenantId);

    const queryOptions: MediaQueryOptions = {
      category: options?.category,
      limit: options?.limit ?? 50,
      offset: options?.offset ?? 0,
      orderBy: options?.orderBy ?? 'uploaded_at',
      orderDirection: options?.orderDirection ?? 'desc',
      includeDeleted: false,
    };

    // Get items
    const items = await this.mediaRepository.findByTenant(effectiveTenantId, queryOptions);

    // Get total count for pagination
    const total = await this.mediaRepository.countByTenant(effectiveTenantId, {
      category: options?.category,
      includeDeleted: false,
    });

    const limit = options?.limit ?? 50;
    const offset = options?.offset ?? 0;

    return {
      items,
      total,
      hasMore: offset + items.length < total,
    };
  }

  /**
   * Get storage usage statistics for a tenant
   */
  async getStorageUsage(tenantId?: string): Promise<StorageUsageResult> {
    const effectiveTenantId = await this.resolveTenantId(tenantId);

    const usage = await this.mediaRepository.getStorageUsage(effectiveTenantId);

    // Format the results
    const formattedByCategory: Record<string, { count: string; bytes: string }> = {};
    for (const [category, stats] of Object.entries(usage.by_category)) {
      formattedByCategory[category] = {
        count: this.formatNumber(stats.count),
        bytes: this.formatBytes(stats.bytes),
      };
    }

    return {
      ...usage,
      formatted: {
        totalFiles: this.formatNumber(usage.total_files),
        totalBytes: this.formatBytes(usage.total_bytes),
        byCategory: formattedByCategory,
      },
    };
  }

  /**
   * Get dependencies for a specific media item
   */
  async getDependencies(mediaId: string, tenantId?: string): Promise<MediaDependency[]> {
    const effectiveTenantId = await this.resolveTenantId(tenantId);

    // Get the media record first
    const media = await this.mediaRepository.findById(mediaId, effectiveTenantId);
    if (!media) {
      return [];
    }

    return await this.mediaRepository.getDependencies(media.public_url, effectiveTenantId);
  }

  /**
   * Get a single media item by ID
   */
  async getMediaById(id: string, tenantId?: string): Promise<TenantMedia | null> {
    const effectiveTenantId = await this.resolveTenantId(tenantId);
    return await this.mediaRepository.findById(id, effectiveTenantId);
  }

  /**
   * Update the entity link for a media item
   */
  async updateEntityLink(
    mediaId: string,
    entityType: string | null,
    entityId: string | null,
    entityField: string | null,
    tenantId?: string
  ): Promise<TenantMedia> {
    const effectiveTenantId = await this.resolveTenantId(tenantId);
    return await this.mediaRepository.updateEntityLink(
      mediaId,
      effectiveTenantId,
      entityType,
      entityId,
      entityField
    );
  }
}
