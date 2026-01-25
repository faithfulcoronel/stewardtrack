import { injectable, inject } from 'inversify';
import { TYPES } from '@/lib/types';
import type {
  IMediaAdapter,
  TenantMedia,
  CreateMediaDto,
  MediaQueryOptions,
  StorageUsage,
  MediaDependency,
} from '@/adapters/media.adapter';

// =============================================================================
// Interface
// =============================================================================
export interface IMediaRepository {
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
export class MediaRepository implements IMediaRepository {
  constructor(
    @inject(TYPES.IMediaAdapter)
    private readonly mediaAdapter: IMediaAdapter
  ) {}

  async createMedia(data: CreateMediaDto, tenantId: string): Promise<TenantMedia> {
    return await this.mediaAdapter.createMedia(data, tenantId);
  }

  async findByTenant(tenantId: string, options?: MediaQueryOptions): Promise<TenantMedia[]> {
    return await this.mediaAdapter.findByTenant(tenantId, options);
  }

  async findById(id: string, tenantId: string): Promise<TenantMedia | null> {
    return await this.mediaAdapter.findById(id, tenantId);
  }

  async findByPublicUrl(publicUrl: string, tenantId: string): Promise<TenantMedia | null> {
    return await this.mediaAdapter.findByPublicUrl(publicUrl, tenantId);
  }

  async softDelete(id: string, tenantId: string): Promise<void> {
    return await this.mediaAdapter.softDelete(id, tenantId);
  }

  async hardDelete(id: string, tenantId: string): Promise<void> {
    return await this.mediaAdapter.hardDelete(id, tenantId);
  }

  async updateEntityLink(
    id: string,
    tenantId: string,
    entityType: string | null,
    entityId: string | null,
    entityField: string | null
  ): Promise<TenantMedia> {
    return await this.mediaAdapter.updateEntityLink(id, tenantId, entityType, entityId, entityField);
  }

  async getStorageUsage(tenantId: string): Promise<StorageUsage> {
    return await this.mediaAdapter.getStorageUsage(tenantId);
  }

  async getDependencies(publicUrl: string, tenantId: string): Promise<MediaDependency[]> {
    return await this.mediaAdapter.getDependencies(publicUrl, tenantId);
  }

  async countByTenant(tenantId: string, options?: MediaQueryOptions): Promise<number> {
    return await this.mediaAdapter.countByTenant(tenantId, options);
  }
}
