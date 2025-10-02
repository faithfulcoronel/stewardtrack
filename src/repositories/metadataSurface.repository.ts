import { injectable, inject } from 'inversify';
import { BaseRepository } from '@/repositories/base.repository';
import type { IMetadataSurfaceAdapter } from '@/adapters/metadataSurface.adapter';
import type { MetadataSurface } from '@/models/rbac.model';
import { TYPES } from '@/lib/types';

export interface IMetadataSurfaceRepository extends BaseRepository<MetadataSurface> {
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
export class MetadataSurfaceRepository extends BaseRepository<MetadataSurface> implements IMetadataSurfaceRepository {
  constructor(
    @inject(TYPES.IMetadataSurfaceAdapter) private readonly metadataSurfaceAdapter: IMetadataSurfaceAdapter
  ) {
    super(metadataSurfaceAdapter);
  }

  async getMetadataSurfaces(
    tenantId: string,
    filters?: {
      module?: string;
      phase?: string;
      surface_type?: string;
    }
  ): Promise<MetadataSurface[]> {
    return await this.metadataSurfaceAdapter.getMetadataSurfaces(tenantId, filters);
  }

  async createMetadataSurface(data: {
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
    return await this.metadataSurfaceAdapter.createMetadataSurface(data);
  }
}
