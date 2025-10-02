import { injectable, inject } from 'inversify';
import { BaseRepository } from '@/repositories/base.repository';
import type { ISurfaceBindingAdapter } from '@/adapters/surfaceBinding.adapter';
import type { RbacSurfaceBinding, CreateSurfaceBindingDto } from '@/models/rbac.model';
import { TYPES } from '@/lib/types';

export interface ISurfaceBindingRepository extends BaseRepository<RbacSurfaceBinding> {
  createSurfaceBinding(data: CreateSurfaceBindingDto, tenantId: string): Promise<RbacSurfaceBinding>;
  updateSurfaceBinding(id: string, data: Partial<CreateSurfaceBindingDto>, tenantId: string): Promise<RbacSurfaceBinding>;
  deleteSurfaceBinding(id: string, tenantId: string): Promise<void>;
  getSurfaceBindings(tenantId: string): Promise<RbacSurfaceBinding[]>;
  getSurfaceBinding(id: string, tenantId: string): Promise<RbacSurfaceBinding | null>;
}

@injectable()
export class SurfaceBindingRepository extends BaseRepository<RbacSurfaceBinding> implements ISurfaceBindingRepository {
  constructor(
    @inject(TYPES.ISurfaceBindingAdapter) private readonly surfaceBindingAdapter: ISurfaceBindingAdapter
  ) {
    super(surfaceBindingAdapter);
  }

  async createSurfaceBinding(data: CreateSurfaceBindingDto, tenantId: string): Promise<RbacSurfaceBinding> {
    return await this.surfaceBindingAdapter.createSurfaceBinding(data, tenantId);
  }

  async updateSurfaceBinding(id: string, data: Partial<CreateSurfaceBindingDto>, tenantId: string): Promise<RbacSurfaceBinding> {
    return await this.surfaceBindingAdapter.updateSurfaceBinding(id, data, tenantId);
  }

  async deleteSurfaceBinding(id: string, tenantId: string): Promise<void> {
    return await this.surfaceBindingAdapter.deleteSurfaceBinding(id, tenantId);
  }

  async getSurfaceBindings(tenantId: string): Promise<RbacSurfaceBinding[]> {
    return await this.surfaceBindingAdapter.getSurfaceBindings(tenantId);
  }

  async getSurfaceBinding(id: string, tenantId: string): Promise<RbacSurfaceBinding | null> {
    return await this.surfaceBindingAdapter.getSurfaceBinding(id, tenantId);
  }
}
