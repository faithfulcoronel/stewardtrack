import 'server-only';
import { injectable, inject } from 'inversify';
import { TYPES } from '@/lib/types';
import type { IProductOfferingRepository } from '@/repositories/productOffering.repository';
import type { ILicenseFeatureBundleRepository } from '@/repositories/licenseFeatureBundle.repository';
import type { ISurfaceLicenseBindingRepository } from '@/repositories/surfaceLicenseBinding.repository';
import { tenantUtils } from '@/utils/tenantUtils';
import type {
  ProductOffering,
  ProductOfferingWithFeatures,
  CreateProductOfferingDto,
  UpdateProductOfferingDto,
} from '@/models/productOffering.model';
import type {
  LicenseFeatureBundle,
  LicenseFeatureBundleWithFeatures,
  CreateLicenseFeatureBundleDto,
  UpdateLicenseFeatureBundleDto,
  AssignFeatureToBundleDto,
} from '@/models/licenseFeatureBundle.model';
import type {
  EffectiveSurfaceAccess,
  SurfaceAccessResult,
  UpdateSurfaceLicenseBindingDto,
  UpdateRbacSurfaceLicenseBindingDto,
} from '@/models/surfaceLicenseBinding.model';

/**
 * LicensingService
 *
 * Orchestrates all licensing and product offering operations including:
 * - Product offering management (CRUD operations)
 * - License feature bundle management
 * - Surface license binding management
 * - Access control checks combining RBAC + licensing
 * - Tenant subscription and feature grant queries
 *
 * This service coordinates between multiple repositories to provide
 * a unified interface for licensing operations throughout the application.
 */
@injectable()
export class LicensingService {
  constructor(
    @inject(TYPES.IProductOfferingRepository)
    private productOfferingRepository: IProductOfferingRepository,
    @inject(TYPES.ILicenseFeatureBundleRepository)
    private licenseFeatureBundleRepository: ILicenseFeatureBundleRepository,
    @inject(TYPES.ISurfaceLicenseBindingRepository)
    private surfaceLicenseBindingRepository: ISurfaceLicenseBindingRepository
  ) {}

  /**
   * Resolves the tenant ID from the provided value or current context
   */
  private async resolveTenantId(tenantId?: string): Promise<string> {
    const resolved = tenantId ?? (await tenantUtils.getTenantId());
    if (!resolved) {
      throw new Error('No tenant context available');
    }
    return resolved;
  }

  // ==================== PRODUCT OFFERING METHODS ====================

  /**
   * Creates a new product offering
   */
  async createProductOffering(data: CreateProductOfferingDto): Promise<ProductOffering> {
    return await this.productOfferingRepository.createOffering(data);
  }

  /**
   * Updates an existing product offering
   */
  async updateProductOffering(id: string, data: UpdateProductOfferingDto): Promise<ProductOffering> {
    return await this.productOfferingRepository.updateOffering(id, data);
  }

  /**
   * Deletes a product offering
   */
  async deleteProductOffering(id: string): Promise<void> {
    await this.productOfferingRepository.deleteOffering(id);
  }

  /**
   * Gets a product offering by ID
   */
  async getProductOffering(id: string): Promise<ProductOffering | null> {
    return await this.productOfferingRepository.getOffering(id);
  }

  /**
   * Gets a product offering with its associated features
   */
  async getProductOfferingWithFeatures(id: string): Promise<ProductOfferingWithFeatures | null> {
    return await this.productOfferingRepository.getOfferingWithFeatures(id);
  }

  /**
   * Gets all active product offerings
   */
  async getActiveProductOfferings(): Promise<ProductOffering[]> {
    return await this.productOfferingRepository.getActiveOfferings();
  }

  /**
   * Gets product offerings by tier
   */
  async getProductOfferingsByTier(tier: string): Promise<ProductOffering[]> {
    return await this.productOfferingRepository.getOfferingsByTier(tier);
  }

  /**
   * Adds a feature to a product offering
   */
  async addFeatureToOffering(offeringId: string, featureId: string, isRequired: boolean = true): Promise<void> {
    await this.productOfferingRepository.addFeatureToOffering(offeringId, featureId, isRequired);
  }

  /**
   * Removes a feature from a product offering
   */
  async removeFeatureFromOffering(offeringId: string, featureId: string): Promise<void> {
    await this.productOfferingRepository.removeFeatureFromOffering(offeringId, featureId);
  }

  // ==================== LICENSE FEATURE BUNDLE METHODS ====================

  /**
   * Creates a new license feature bundle
   */
  async createLicenseFeatureBundle(data: CreateLicenseFeatureBundleDto): Promise<LicenseFeatureBundle> {
    return await this.licenseFeatureBundleRepository.createBundle(data);
  }

  /**
   * Updates an existing license feature bundle
   */
  async updateLicenseFeatureBundle(id: string, data: UpdateLicenseFeatureBundleDto): Promise<LicenseFeatureBundle> {
    return await this.licenseFeatureBundleRepository.updateBundle(id, data);
  }

  /**
   * Deletes a license feature bundle
   */
  async deleteLicenseFeatureBundle(id: string): Promise<void> {
    await this.licenseFeatureBundleRepository.deleteBundle(id);
  }

  /**
   * Gets a license feature bundle by ID
   */
  async getLicenseFeatureBundle(id: string): Promise<LicenseFeatureBundle | null> {
    return await this.licenseFeatureBundleRepository.getBundle(id);
  }

  /**
   * Gets a license feature bundle with its associated features
   */
  async getLicenseFeatureBundleWithFeatures(id: string): Promise<LicenseFeatureBundleWithFeatures | null> {
    return await this.licenseFeatureBundleRepository.getBundleWithFeatures(id);
  }

  /**
   * Gets all active license feature bundles
   */
  async getActiveLicenseFeatureBundles(): Promise<LicenseFeatureBundle[]> {
    return await this.licenseFeatureBundleRepository.getActiveBundles();
  }

  /**
   * Gets license feature bundles by category
   */
  async getLicenseFeatureBundlesByCategory(category: string): Promise<LicenseFeatureBundle[]> {
    return await this.licenseFeatureBundleRepository.getBundlesByCategory(category);
  }

  /**
   * Gets license feature bundles by type
   */
  async getLicenseFeatureBundlesByType(bundleType: string): Promise<LicenseFeatureBundle[]> {
    return await this.licenseFeatureBundleRepository.getBundlesByType(bundleType);
  }

  /**
   * Adds a feature to a license feature bundle
   */
  async addFeatureToBundle(bundleId: string, data: AssignFeatureToBundleDto): Promise<void> {
    await this.licenseFeatureBundleRepository.addFeatureToBundle(bundleId, data);
  }

  /**
   * Removes a feature from a license feature bundle
   */
  async removeFeatureFromBundle(bundleId: string, featureId: string): Promise<void> {
    await this.licenseFeatureBundleRepository.removeFeatureFromBundle(bundleId, featureId);
  }

  /**
   * Updates the display order of a feature in a bundle
   */
  async updateFeatureOrderInBundle(bundleId: string, featureId: string, displayOrder: number): Promise<void> {
    await this.licenseFeatureBundleRepository.updateFeatureOrder(bundleId, featureId, displayOrder);
  }

  // ==================== SURFACE LICENSE BINDING METHODS ====================

  /**
   * Gets effective surface access for a tenant (combining RBAC + licensing)
   */
  async getEffectiveSurfaceAccess(tenantId?: string): Promise<EffectiveSurfaceAccess[]> {
    const effectiveTenantId = await this.resolveTenantId(tenantId);
    return await this.surfaceLicenseBindingRepository.getEffectiveSurfaceAccess(effectiveTenantId);
  }

  /**
   * Checks if a user can access a specific surface (RBAC + licensing)
   */
  async checkSurfaceAccess(userId: string, surfaceId: string, tenantId?: string): Promise<SurfaceAccessResult> {
    const effectiveTenantId = await this.resolveTenantId(tenantId);
    return await this.surfaceLicenseBindingRepository.checkSurfaceAccess(userId, effectiveTenantId, surfaceId);
  }

  /**
   * Updates license requirements for a metadata surface
   */
  async updateSurfaceLicenseRequirement(surfaceId: string, data: UpdateSurfaceLicenseBindingDto): Promise<void> {
    await this.surfaceLicenseBindingRepository.updateSurfaceLicenseRequirement(surfaceId, data);
  }

  /**
   * Updates license requirements for an RBAC surface binding
   */
  async updateRbacBindingLicenseRequirement(
    roleId: string,
    surfaceId: string,
    data: UpdateRbacSurfaceLicenseBindingDto,
    tenantId?: string
  ): Promise<void> {
    const effectiveTenantId = await this.resolveTenantId(tenantId);
    await this.surfaceLicenseBindingRepository.updateRbacBindingLicenseRequirement(
      effectiveTenantId,
      roleId,
      surfaceId,
      data
    );
  }

  /**
   * Gets all surfaces that require a specific license bundle
   */
  async getSurfacesByLicenseBundle(bundleId: string): Promise<Array<{ surface_id: string; surface_title: string; surface_route: string }>> {
    return await this.surfaceLicenseBindingRepository.getSurfacesByLicenseBundle(bundleId);
  }

  /**
   * Gets all surfaces that a tenant has licenses for
   */
  async getTenantLicensedSurfaces(tenantId?: string): Promise<string[]> {
    const effectiveTenantId = await this.resolveTenantId(tenantId);
    return await this.surfaceLicenseBindingRepository.getTenantLicensedSurfaces(effectiveTenantId);
  }

  // ==================== CONVENIENCE METHODS ====================

  /**
   * Gets a complete licensing summary for a tenant including:
   * - Active product offerings
   * - Licensed feature bundles
   * - Accessible surfaces
   */
  async getTenantLicensingSummary(tenantId?: string): Promise<{
    tenant_id: string;
    active_offerings: ProductOffering[];
    licensed_bundles: LicenseFeatureBundle[];
    accessible_surfaces: string[];
    effective_access: EffectiveSurfaceAccess[];
  }> {
    const effectiveTenantId = await this.resolveTenantId(tenantId);

    const [activeOfferings, licensedBundles, accessibleSurfaces, effectiveAccess] = await Promise.all([
      this.getActiveProductOfferings(),
      this.getActiveLicenseFeatureBundles(),
      this.getTenantLicensedSurfaces(effectiveTenantId),
      this.getEffectiveSurfaceAccess(effectiveTenantId),
    ]);

    return {
      tenant_id: effectiveTenantId,
      active_offerings: activeOfferings,
      licensed_bundles: licensedBundles,
      accessible_surfaces: accessibleSurfaces,
      effective_access: effectiveAccess,
    };
  }

  // ==================== TENANT PROVISIONING METHODS ====================

  /**
   * Provisions a tenant license by granting all features from a product offering
   * This is called during tenant onboarding/registration
   *
   * @param tenantId - The tenant to provision
   * @param offeringId - The product offering to grant features from
   */
  async provisionTenantLicense(tenantId: string, offeringId: string): Promise<void> {
    try {
      // Get the offering with all its features
      const offering = await this.getProductOfferingWithFeatures(offeringId);

      if (!offering) {
        throw new Error(`Product offering ${offeringId} not found`);
      }

      if (!offering.features || offering.features.length === 0) {
        console.warn(`Product offering ${offeringId} has no features to grant`);
        return;
      }

      // Import the repository here to avoid circular dependency
      const { container } = await import('@/lib/container');
      const { TYPES } = await import('@/lib/types');
      const tenantFeatureGrantRepo = container.get<any>(TYPES.ITenantFeatureGrantRepository);

      // Grant each feature to the tenant
      const featureGrants = offering.features.map(feature => ({
        tenant_id: tenantId,
        feature_id: feature.id,
        granted_at: new Date().toISOString(),
        is_active: true,
      }));

      // Use the repository to create grants
      for (const grant of featureGrants) {
        try {
          await tenantFeatureGrantRepo.create(grant);
        } catch (error) {
          // Log but continue if grant already exists
          console.warn(`Feature grant may already exist for feature ${grant.feature_id}:`, error);
        }
      }

      console.log(`Provisioned ${featureGrants.length} features for tenant ${tenantId} from offering ${offeringId}`);
    } catch (error) {
      console.error('Error provisioning tenant license:', error);
      throw error;
    }
  }
}
