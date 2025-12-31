import { injectable, inject } from 'inversify';
import { BaseRepository } from '@/repositories/base.repository';
import type { IProductOfferingAdapter } from '@/adapters/productOffering.adapter';
import type {
  ProductOffering,
  ProductOfferingWithFeatures,
  ProductOfferingWithBundles,
  ProductOfferingComplete,
  CreateProductOfferingDto,
  UpdateProductOfferingDto,
} from '@/models/productOffering.model';
import { TYPES } from '@/lib/types';

export interface IProductOfferingRepository extends BaseRepository<ProductOffering> {
  createOffering(data: CreateProductOfferingDto): Promise<ProductOffering>;
  updateOffering(id: string, data: UpdateProductOfferingDto): Promise<ProductOffering>;
  deleteOffering(id: string): Promise<void>;
  getOffering(id: string): Promise<ProductOffering | null>;
  getOfferingWithFeatures(id: string): Promise<ProductOfferingWithFeatures | null>;
  getActiveOfferings(): Promise<ProductOffering[]>;
  getOfferingsByTier(tier: string): Promise<ProductOffering[]>;
  getPublicProductOfferings(options: {
    includeFeatures: boolean;
    includeBundles: boolean;
    tier: string | null;
    targetId?: string | null;
  }): Promise<Array<Record<string, any>>>;
  getPublicProductOffering(options: {
    id: string;
    includeFeatures: boolean;
    includeBundles: boolean;
    includeComplete: boolean;
  }): Promise<Record<string, any> | null>;
  addFeatureToOffering(offeringId: string, featureId: string, isRequired?: boolean): Promise<void>;
  removeFeatureFromOffering(offeringId: string, featureId: string): Promise<void>;
  addBundleToOffering(offeringId: string, bundleId: string, isRequired?: boolean, displayOrder?: number): Promise<void>;
  removeBundleFromOffering(offeringId: string, bundleId: string): Promise<void>;
  getOfferingBundles(offeringId: string): Promise<Array<{ id: string; code: string; name: string; bundle_type: string; category: string; is_required: boolean; display_order: number; feature_count: number }>>;
  getOfferingWithBundles(offeringId: string): Promise<ProductOfferingWithBundles | null>;
  getOfferingComplete(offeringId: string): Promise<ProductOfferingComplete | null>;
}

@injectable()
export class ProductOfferingRepository
  extends BaseRepository<ProductOffering>
  implements IProductOfferingRepository
{
  constructor(
    @inject(TYPES.IProductOfferingAdapter)
    private readonly productOfferingAdapter: IProductOfferingAdapter
  ) {
    super(productOfferingAdapter);
  }

  async createOffering(data: CreateProductOfferingDto): Promise<ProductOffering> {
    const offering = await this.productOfferingAdapter.create(data);
    return offering;
  }

  async updateOffering(id: string, data: UpdateProductOfferingDto): Promise<ProductOffering> {
    const offering = await this.productOfferingAdapter.update(id, data);
    if (!offering) {
      throw new Error(`Product offering with id ${id} not found`);
    }
    return offering;
  }

  async deleteOffering(id: string): Promise<void> {
    await this.productOfferingAdapter.delete(id);
  }

  async getOffering(id: string): Promise<ProductOffering | null> {
    return await this.findById(id);
  }

  async getOfferingWithFeatures(id: string): Promise<ProductOfferingWithFeatures | null> {
    return await this.productOfferingAdapter.getOfferingWithFeatures(id);
  }

  async getActiveOfferings(): Promise<ProductOffering[]> {
    return await this.productOfferingAdapter.getActiveOfferings();
  }

  async getOfferingsByTier(tier: string): Promise<ProductOffering[]> {
    return await this.productOfferingAdapter.getOfferingsByTier(tier);
  }

  async getPublicProductOfferings(options: {
    includeFeatures: boolean;
    includeBundles: boolean;
    tier: string | null;
    targetId?: string | null;
  }): Promise<Array<Record<string, any>>> {
    return this.productOfferingAdapter.getPublicProductOfferings(options);
  }

  async getPublicProductOffering(options: {
    id: string;
    includeFeatures: boolean;
    includeBundles: boolean;
    includeComplete: boolean;
  }): Promise<Record<string, any> | null> {
    return this.productOfferingAdapter.getPublicProductOffering(options);
  }

  async addFeatureToOffering(offeringId: string, featureId: string, isRequired: boolean = true): Promise<void> {
    await this.productOfferingAdapter.addFeatureToOffering(offeringId, featureId, isRequired);
  }

  async removeFeatureFromOffering(offeringId: string, featureId: string): Promise<void> {
    await this.productOfferingAdapter.removeFeatureFromOffering(offeringId, featureId);
  }

  async addBundleToOffering(offeringId: string, bundleId: string, isRequired: boolean = true, displayOrder?: number): Promise<void> {
    await this.productOfferingAdapter.addBundleToOffering(offeringId, bundleId, isRequired, displayOrder);
  }

  async removeBundleFromOffering(offeringId: string, bundleId: string): Promise<void> {
    await this.productOfferingAdapter.removeBundleFromOffering(offeringId, bundleId);
  }

  async getOfferingBundles(offeringId: string): Promise<Array<{ id: string; code: string; name: string; bundle_type: string; category: string; is_required: boolean; display_order: number; feature_count: number }>> {
    return await this.productOfferingAdapter.getOfferingBundles(offeringId);
  }

  async getOfferingWithBundles(offeringId: string): Promise<ProductOfferingWithBundles | null> {
    return await this.productOfferingAdapter.getOfferingWithBundles(offeringId);
  }

  async getOfferingComplete(offeringId: string): Promise<ProductOfferingComplete | null> {
    return await this.productOfferingAdapter.getOfferingComplete(offeringId);
  }
}
