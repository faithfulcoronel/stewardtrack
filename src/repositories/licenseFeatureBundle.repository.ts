import { injectable, inject } from 'inversify';
import { BaseRepository } from '@/repositories/base.repository';
import type { ILicenseFeatureBundleAdapter } from '@/adapters/licenseFeatureBundle.adapter';
import type {
  LicenseFeatureBundle,
  LicenseFeatureBundleWithFeatures,
  CreateLicenseFeatureBundleDto,
  UpdateLicenseFeatureBundleDto,
  AssignFeatureToBundleDto,
} from '@/models/licenseFeatureBundle.model';
import { TYPES } from '@/lib/types';

export interface ILicenseFeatureBundleRepository extends BaseRepository<LicenseFeatureBundle> {
  createBundle(data: CreateLicenseFeatureBundleDto): Promise<LicenseFeatureBundle>;
  updateBundle(id: string, data: UpdateLicenseFeatureBundleDto): Promise<LicenseFeatureBundle>;
  deleteBundle(id: string): Promise<void>;
  getBundle(id: string): Promise<LicenseFeatureBundle | null>;
  getBundleWithFeatures(id: string): Promise<LicenseFeatureBundleWithFeatures | null>;
  getActiveBundles(): Promise<LicenseFeatureBundle[]>;
  getBundlesByCategory(category: string): Promise<LicenseFeatureBundle[]>;
  getBundlesByType(bundleType: string): Promise<LicenseFeatureBundle[]>;
  addFeatureToBundle(bundleId: string, data: AssignFeatureToBundleDto): Promise<void>;
  removeFeatureFromBundle(bundleId: string, featureId: string): Promise<void>;
  updateFeatureOrder(bundleId: string, featureId: string, displayOrder: number): Promise<void>;
}

@injectable()
export class LicenseFeatureBundleRepository
  extends BaseRepository<LicenseFeatureBundle>
  implements ILicenseFeatureBundleRepository
{
  constructor(
    @inject(TYPES.ILicenseFeatureBundleAdapter)
    private readonly licenseFeatureBundleAdapter: ILicenseFeatureBundleAdapter
  ) {
    super(licenseFeatureBundleAdapter);
  }

  async createBundle(data: CreateLicenseFeatureBundleDto): Promise<LicenseFeatureBundle> {
    const bundle = await this.licenseFeatureBundleAdapter.create(data);
    return bundle;
  }

  async updateBundle(id: string, data: UpdateLicenseFeatureBundleDto): Promise<LicenseFeatureBundle> {
    const bundle = await this.licenseFeatureBundleAdapter.update(id, data);
    if (!bundle) {
      throw new Error(`License feature bundle with id ${id} not found`);
    }
    return bundle;
  }

  async deleteBundle(id: string): Promise<void> {
    await this.licenseFeatureBundleAdapter.delete(id);
  }

  async getBundle(id: string): Promise<LicenseFeatureBundle | null> {
    return await this.licenseFeatureBundleAdapter.findById(id);
  }

  async getBundleWithFeatures(id: string): Promise<LicenseFeatureBundleWithFeatures | null> {
    return await this.licenseFeatureBundleAdapter.getBundleWithFeatures(id);
  }

  async getActiveBundles(): Promise<LicenseFeatureBundle[]> {
    return await this.licenseFeatureBundleAdapter.getActiveBundles();
  }

  async getBundlesByCategory(category: string): Promise<LicenseFeatureBundle[]> {
    return await this.licenseFeatureBundleAdapter.getBundlesByCategory(category);
  }

  async getBundlesByType(bundleType: string): Promise<LicenseFeatureBundle[]> {
    return await this.licenseFeatureBundleAdapter.getBundlesByType(bundleType);
  }

  async addFeatureToBundle(bundleId: string, data: AssignFeatureToBundleDto): Promise<void> {
    await this.licenseFeatureBundleAdapter.addFeatureToBundle(
      bundleId,
      data.feature_id,
      data.is_required ?? true,
      data.display_order
    );
  }

  async removeFeatureFromBundle(bundleId: string, featureId: string): Promise<void> {
    await this.licenseFeatureBundleAdapter.removeFeatureFromBundle(bundleId, featureId);
  }

  async updateFeatureOrder(bundleId: string, featureId: string, displayOrder: number): Promise<void> {
    await this.licenseFeatureBundleAdapter.updateFeatureOrder(bundleId, featureId, displayOrder);
  }
}
