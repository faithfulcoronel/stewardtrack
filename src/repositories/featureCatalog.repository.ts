import { injectable, inject } from 'inversify';
import { BaseRepository } from '@/repositories/base.repository';
import type { IFeatureCatalogAdapter } from '@/adapters/featureCatalog.adapter';
import type { FeatureCatalog } from '@/models/rbac.model';
import { TYPES } from '@/lib/types';

export interface IFeatureCatalogRepository extends BaseRepository<FeatureCatalog> {
  getFeatureCatalog(): Promise<FeatureCatalog[]>;
  getFeatures(filters?: {
    category?: string;
    phase?: string;
    is_active?: boolean;
  }): Promise<FeatureCatalog[]>;
  getById(id: string): Promise<FeatureCatalog | null>;
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
  deleteFeature(id: string): Promise<void>;
}

@injectable()
export class FeatureCatalogRepository extends BaseRepository<FeatureCatalog> implements IFeatureCatalogRepository {
  constructor(
    @inject(TYPES.IFeatureCatalogAdapter) private readonly featureCatalogAdapter: IFeatureCatalogAdapter
  ) {
    super(featureCatalogAdapter);
  }

  async getFeatureCatalog(): Promise<FeatureCatalog[]> {
    return await this.featureCatalogAdapter.getFeatureCatalog();
  }

  async getFeatures(filters?: {
    category?: string;
    phase?: string;
    is_active?: boolean;
  }): Promise<FeatureCatalog[]> {
    return await this.featureCatalogAdapter.getFeatures(filters);
  }

  async getById(id: string): Promise<FeatureCatalog | null> {
    return await this.findById(id);
  }

  async createFeature(data: {
    code: string;
    name: string;
    category: string;
    description?: string;
    tier?: string | null;
    phase: string;
    is_delegatable: boolean;
    is_active: boolean;
  }): Promise<FeatureCatalog> {
    return await this.featureCatalogAdapter.createFeature(data);
  }

  async deleteFeature(id: string): Promise<void> {
    return this.featureCatalogAdapter.hardDeleteFeature(id);
  }
}
