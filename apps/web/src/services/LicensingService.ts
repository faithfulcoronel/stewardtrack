import 'server-only';
import { injectable, inject } from 'inversify';
import { TYPES } from '@/lib/types';
import type { IProductOfferingRepository } from '@/repositories/productOffering.repository';
import type { ILicenseFeatureBundleRepository } from '@/repositories/licenseFeatureBundle.repository';
import type { ILicenseAssignmentRepository } from '@/repositories/licenseAssignment.repository';
import type { ITenantFeatureGrantRepository } from '@/repositories/tenantFeatureGrant.repository';
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
  TenantForAssignment,
  AssignmentResult,
  CreateLicenseAssignmentDto,
  LicenseHistoryEntry,
  FeatureChangeSummary,
} from '@/models/licenseAssignment.model';
import type { TenantFeatureGrant } from '@/models/rbac.model';

interface TenantFeatureGrantWithFeature extends TenantFeatureGrant {
  feature?: {
    id: string;
    code: string;
    name: string;
    category?: string | null;
    description?: string | null;
    tier?: string | null;
  };
}

interface LicensedFeatureSummary {
  id: string;
  code: string;
  name: string;
  category: string;
  description?: string;
  tier?: string | null;
  grant_source: TenantFeatureGrant['grant_source'];
  starts_at?: string;
  expires_at?: string;
}

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
    @inject(TYPES.ITenantFeatureGrantRepository)
    private tenantFeatureGrantRepository: ITenantFeatureGrantRepository,
    @inject(TYPES.ILicenseAssignmentRepository)
    private licenseAssignmentRepository: ILicenseAssignmentRepository
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
   * Gets public product offerings (unauthenticated flow)
   */
  async getPublicProductOfferings(options: {
    includeFeatures: boolean;
    includeBundles: boolean;
    tier: string | null;
    targetId?: string | null;
  }) {
    return this.productOfferingRepository.getPublicProductOfferings(options);
  }

  async getPublicProductOffering(options: {
    id: string;
    includeFeatures: boolean;
    includeBundles: boolean;
    includeComplete: boolean;
  }) {
    return this.productOfferingRepository.getPublicProductOffering(options);
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

  /**
   * Adds a bundle to a product offering
   */
  async addBundleToOffering(offeringId: string, bundleId: string, isRequired: boolean = true, displayOrder?: number): Promise<void> {
    await this.productOfferingRepository.addBundleToOffering(offeringId, bundleId, isRequired, displayOrder);
  }

  /**
   * Removes a bundle from a product offering
   */
  async removeBundleFromOffering(offeringId: string, bundleId: string): Promise<void> {
    await this.productOfferingRepository.removeBundleFromOffering(offeringId, bundleId);
  }

  /**
   * Gets bundles for a product offering
   */
  async getOfferingBundles(offeringId: string): Promise<Array<{ id: string; code: string; name: string; bundle_type: string; category: string; is_required: boolean; display_order: number; feature_count: number }>> {
    return await this.productOfferingRepository.getOfferingBundles(offeringId);
  }

  /**
   * Gets a product offering with its bundles
   */
  async getProductOfferingWithBundles(offeringId: string): Promise<any> {
    return await this.productOfferingRepository.getOfferingWithBundles(offeringId);
  }

  /**
   * Gets a complete product offering with bundles and features
   */
  async getProductOfferingComplete(offeringId: string): Promise<any> {
    return await this.productOfferingRepository.getOfferingComplete(offeringId);
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
    licensed_bundles: LicenseFeatureBundleWithFeatures[];
    licensed_features: LicensedFeatureSummary[];
    accessible_surfaces: string[];
    effective_access: any[];
  }> {
    const effectiveTenantId = await this.resolveTenantId(tenantId);

    const [
      activeOfferings,
      activeBundles,
      tenantFeatureGrants,
    ] = await Promise.all([
      this.getActiveProductOfferings(),
      this.getActiveLicenseFeatureBundles(),
      this.tenantFeatureGrantRepository.getTenantFeatureGrants(effectiveTenantId),
    ]);

    // Get bundles with their features
    const licensedBundles = await Promise.all(
      activeBundles.map(bundle => this.getLicenseFeatureBundleWithFeatures(bundle.id))
    );

    // Filter out any null results
    const validBundles = licensedBundles.filter((b): b is LicenseFeatureBundleWithFeatures => b !== null);

    const licensedFeatures = this.mapTenantFeatureGrantsToLicensedFeatures(
      tenantFeatureGrants
    );

    return {
      tenant_id: effectiveTenantId,
      active_offerings: activeOfferings,
      licensed_bundles: validBundles,
      licensed_features: licensedFeatures,
      accessible_surfaces: [], // Surface bindings removed - always empty
      effective_access: [], // Surface bindings removed - always empty
    };
  }

  private mapTenantFeatureGrantsToLicensedFeatures(
    grants: TenantFeatureGrant[]
  ): LicensedFeatureSummary[] {
    const featuresById = new Map<string, LicensedFeatureSummary>();

    for (const grant of grants as TenantFeatureGrantWithFeature[]) {
      const feature = grant.feature;
      if (!feature || !feature.id) {
        continue;
      }

      const existing = featuresById.get(feature.id);
      if (existing) {
        if (!existing.starts_at && grant.starts_at) {
          existing.starts_at = grant.starts_at;
        }
        if (!existing.expires_at && grant.expires_at) {
          existing.expires_at = grant.expires_at;
        }
        continue;
      }

      featuresById.set(feature.id, {
        id: feature.id,
        code: feature.code,
        name: feature.name,
        category: feature.category ?? 'General',
        description: feature.description ?? undefined,
        tier: feature.tier ?? null,
        grant_source: grant.grant_source,
        starts_at: grant.starts_at ?? undefined,
        expires_at: grant.expires_at ?? undefined,
      });
    }

    return Array.from(featuresById.values()).sort((a, b) =>
      a.name.localeCompare(b.name)
    );
  }

  // ==================== TENANT PROVISIONING METHODS ====================

  /**
   * Provisions a tenant license by granting all features from a product offering
   * This is called during tenant onboarding/registration
   *
   * Now uses the database function get_offering_all_features() to retrieve features
   * from both bundles and direct assignments
   *
   * @param tenantId - The tenant to provision
   * @param offeringId - The product offering to grant features from
   */
  async provisionTenantLicense(tenantId: string, offeringId: string): Promise<void> {
    try {
      // Import the repository here to avoid circular dependency
      const { container } = await import('@/lib/container');
      const { TYPES } = await import('@/lib/types');

      // Get adapter to access Supabase directly
      const productOfferingAdapter = container.get<any>(TYPES.IProductOfferingAdapter);
      const supabase = await productOfferingAdapter.getSupabaseClient();

      // Use the database function to get ALL features (from bundles + direct assignments)
      const { data: features, error } = await supabase.rpc('get_offering_all_features', {
        p_offering_id: offeringId,
      });

      if (error) {
        throw new Error(`Failed to get offering features: ${error.message}`);
      }

      if (!features || features.length === 0) {
        console.warn(`Product offering ${offeringId} has no features to grant`);
        return;
      }

      // ENTERPRISE SOLUTION: De-duplicate features in-memory before insertion
      // The unique index includes COALESCE expressions that can't be matched via Supabase API
      // Index: (tenant_id, feature_id, grant_source, COALESCE(package_id, '00...'), COALESCE(source_reference, ''))
      // So we handle deduplication at the application layer for robustness and idempotency

      // Step 1: Query existing grants for this tenant to avoid conflicts
      const { data: existingGrants, error: queryError } = await supabase
        .from('tenant_feature_grants')
        .select('feature_id, grant_source, package_id, source_reference')
        .eq('tenant_id', tenantId);

      if (queryError) {
        throw new Error(`Failed to query existing feature grants: ${queryError.message}`);
      }

      // Step 2: Create a unique key for each existing grant (matching the unique index logic)
      const existingGrantKeys = new Set(
        (existingGrants || []).map((grant: any) =>
          `${grant.feature_id}|${grant.grant_source}|${grant.package_id || ''}|${grant.source_reference || ''}`
        )
      );

      // Step 3: Build grants to insert, deduplicating by the unique constraint
      const grantsMap = new Map<string, any>();

      for (const feature of features) {
        const packageId = feature.package_id || null;
        const sourceRef = `offering_${offeringId}`;
        const uniqueKey = `${feature.feature_id}|package|${packageId || ''}|${sourceRef}`;

        // Skip if already exists in database
        if (existingGrantKeys.has(uniqueKey)) {
          continue;
        }

        // De-duplicate within the current batch (e.g., feature in multiple bundles)
        if (!grantsMap.has(uniqueKey)) {
          grantsMap.set(uniqueKey, {
            tenant_id: tenantId,
            feature_id: feature.feature_id,
            grant_source: 'package' as const,
            package_id: packageId,
            source_reference: sourceRef,
            starts_at: new Date().toISOString().split('T')[0], // Date only (YYYY-MM-DD)
          });
        }
      }

      const featureGrants = Array.from(grantsMap.values());

      // Step 4: Insert only new grants (idempotent - safe to retry)
      if (featureGrants.length > 0) {
        const { error: insertError } = await supabase
          .from('tenant_feature_grants')
          .insert(featureGrants);

        if (insertError) {
          console.error('Error inserting tenant feature grants:', insertError);
          throw new Error(`Failed to provision feature grants: ${insertError.message}`);
        }

        console.log(`Provisioned ${featureGrants.length} new feature grants for tenant ${tenantId} from offering ${offeringId}`);
      } else {
        console.log(`All ${features.length} features already granted to tenant ${tenantId} - skipping duplicates (idempotent)`);
      }
    } catch (error) {
      console.error('Error provisioning tenant license:', error);
      throw error;
    }
  }

  // ==================== MANUAL LICENSE ASSIGNMENT METHODS ====================

  /**
   * Assigns a product offering to a tenant manually
   * This is used by product owners to assign/change licenses in Licensing Studio
   *
   * @param tenantId - The tenant to assign the license to
   * @param offeringId - The product offering to assign
   * @param assignedBy - The user performing the assignment
   * @param notes - Optional notes about the assignment
   */
  async assignLicenseToTenant(
    tenantId: string,
    offeringId: string,
    assignedBy: string,
    notes?: string
  ): Promise<AssignmentResult> {
    try {
      const data: CreateLicenseAssignmentDto = {
        tenant_id: tenantId,
        offering_id: offeringId,
        assigned_by: assignedBy,
        notes,
      };

      return await this.licenseAssignmentRepository.assignLicenseToTenant(data);
    } catch (error) {
      console.error('Error assigning license to tenant:', error);
      throw error;
    }
  }

  /**
   * Gets all tenants for license assignment selection
   * Returns tenants with their current license information
   */
  async getTenantsForAssignment(): Promise<TenantForAssignment[]> {
    try {
      return await this.licenseAssignmentRepository.getTenantsForAssignment();
    } catch (error) {
      console.error('Error getting tenants for assignment:', error);
      throw error;
    }
  }

  /**
   * Gets the license assignment history for a tenant
   * Shows all previous assignments and changes
   *
   * @param tenantId - The tenant to get history for
   */
  async getTenantLicenseHistory(tenantId: string): Promise<LicenseHistoryEntry[]> {
    try {
      return await this.licenseAssignmentRepository.getTenantLicenseHistory(tenantId);
    } catch (error) {
      console.error('Error getting tenant license history:', error);
      throw error;
    }
  }

  /**
   * Gets a preview of feature changes for a potential assignment
   * Shows which features will be added, removed, and kept
   *
   * @param tenantId - The tenant
   * @param newOfferingId - The new offering being considered
   */
  async getFeatureChangeSummary(
    tenantId: string,
    newOfferingId: string
  ): Promise<FeatureChangeSummary> {
    try {
      return await this.licenseAssignmentRepository.getFeatureChangeSummary(
        tenantId,
        newOfferingId
      );
    } catch (error) {
      console.error('Error getting feature change summary:', error);
      throw error;
    }
  }
}
