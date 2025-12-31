import 'server-only';
import { injectable, inject } from 'inversify';
import { TYPES } from '@/lib/types';
import type { IFeatureCatalogRepository } from '@/repositories/featureCatalog.repository';
import type { ITenantFeatureGrantRepository } from '@/repositories/tenantFeatureGrant.repository';
import { tenantUtils } from '@/utils/tenantUtils';
import type {
  FeatureCatalog,
  TenantFeatureGrant,
  CreateRbacAuditLogInput,
  RbacAuditOperation
} from '@/models/rbac.model';

@injectable()
export class RbacFeatureService {
  constructor(
    @inject(TYPES.IFeatureCatalogRepository)
    private featureCatalogRepository: IFeatureCatalogRepository,
    @inject(TYPES.ITenantFeatureGrantRepository)
    private tenantFeatureGrantRepository: ITenantFeatureGrantRepository
  ) {}

  private async resolveTenantId(tenantId?: string): Promise<string> {
    const resolved = tenantId ?? (await tenantUtils.getTenantId());
    return resolved ?? '550e8400-e29b-41d4-a716-446655440000'; // Valid UUID fallback for testing
  }

  // Feature Catalog Management
  async getFeatureCatalog(): Promise<FeatureCatalog[]> {
    return await this.featureCatalogRepository.getFeatureCatalog();
  }

  async getFeatures(filters?: {
    category?: string;
    phase?: string;
    is_active?: boolean;
  }): Promise<FeatureCatalog[]> {
    return await this.featureCatalogRepository.getFeatures(filters);
  }

  async createFeature(data: {
    code: string;
    name: string;
    category: string;
    description?: string;
    phase: string;
    is_delegatable: boolean;
    is_active: boolean;
  }): Promise<FeatureCatalog> {
    const feature = await this.featureCatalogRepository.createFeature(data);

    // Log the action
    await this.logAuditEvent({
      tenant_id: 'system', // Features are system-level
      action: 'CREATE_FEATURE',
      resource_type: 'feature_catalog',
      resource_id: feature.id,
      new_values: data,
      notes: `Created feature: ${data.name} (${data.code})`
    });

    return feature;
  }

  // Tenant Feature Grant Management
  async getTenantFeatureGrants(tenantId?: string): Promise<TenantFeatureGrant[]> {
    const effectiveTenantId = tenantId || await tenantUtils.getTenantId();
    if (!effectiveTenantId) {
      throw new Error('No tenant context available');
    }

    return await this.tenantFeatureGrantRepository.getTenantFeatureGrants(effectiveTenantId);
  }

  async hasFeatureAccess(featureCode: string, tenantId?: string): Promise<boolean> {
    const effectiveTenantId = tenantId || await tenantUtils.getTenantId();
    if (!effectiveTenantId) {
      return false;
    }

    const grants = await this.getTenantFeatureGrants(effectiveTenantId);
    const now = new Date();

    return grants.some(grant => {
      const feature = (grant as any).feature;
      if (!feature || feature.code !== featureCode) return false;

      // Check if grant is active
      const startsAt = grant.starts_at ? new Date(grant.starts_at) : null;
      const expiresAt = grant.expires_at ? new Date(grant.expires_at) : null;

      if (startsAt && now < startsAt) return false;
      if (expiresAt && now > expiresAt) return false;

      return true;
    });
  }

  // Feature validation and utility methods
  async validateFeatureAccess(
    featureCode: string,
    tenantId?: string
  ): Promise<{
    hasAccess: boolean;
    grant?: TenantFeatureGrant;
    reason?: string;
  }> {
    const effectiveTenantId = tenantId || await tenantUtils.getTenantId();
    if (!effectiveTenantId) {
      return {
        hasAccess: false,
        reason: 'No tenant context available'
      };
    }

    const grants = await this.getTenantFeatureGrants(effectiveTenantId);
    const now = new Date();

    const matchingGrant = grants.find(grant => {
      const feature = (grant as any).feature;
      return feature && feature.code === featureCode;
    });

    if (!matchingGrant) {
      return {
        hasAccess: false,
        reason: 'Feature not granted to tenant'
      };
    }

    // Check if grant is active
    const startsAt = matchingGrant.starts_at ? new Date(matchingGrant.starts_at) : null;
    const expiresAt = matchingGrant.expires_at ? new Date(matchingGrant.expires_at) : null;

    if (startsAt && now < startsAt) {
      return {
        hasAccess: false,
        grant: matchingGrant,
        reason: `Grant starts at ${startsAt.toISOString()}`
      };
    }

    if (expiresAt && now > expiresAt) {
      return {
        hasAccess: false,
        grant: matchingGrant,
        reason: `Grant expired at ${expiresAt.toISOString()}`
      };
    }

    return {
      hasAccess: true,
      grant: matchingGrant
    };
  }

  async getActiveFeaturesByCategory(
    tenantId?: string
  ): Promise<Record<string, FeatureCatalog[]>> {
    const effectiveTenantId = await this.resolveTenantId(tenantId);
    const grants = await this.getTenantFeatureGrants(effectiveTenantId);
    const now = new Date();

    // Get active feature codes
    const activeFeatureCodes = new Set(
      grants
        .filter(grant => {
          const startsAt = grant.starts_at ? new Date(grant.starts_at) : null;
          const expiresAt = grant.expires_at ? new Date(grant.expires_at) : null;

          if (startsAt && now < startsAt) return false;
          if (expiresAt && now > expiresAt) return false;

          return true;
        })
        .map(grant => (grant as any).feature?.code)
        .filter(Boolean)
    );

    // Get all features and filter by active grants
    const allFeatures = await this.getFeatureCatalog();
    const activeFeatures = allFeatures.filter(feature =>
      activeFeatureCodes.has(feature.code)
    );

    // Group by category
    const featuresByCategory: Record<string, FeatureCatalog[]> = {};
    for (const feature of activeFeatures) {
      if (!featuresByCategory[feature.category]) {
        featuresByCategory[feature.category] = [];
      }
      featuresByCategory[feature.category].push(feature);
    }

    return featuresByCategory;
  }

  async getFeaturesByPhase(phase: string): Promise<FeatureCatalog[]> {
    return await this.getFeatures({ phase, is_active: true });
  }

  // Audit logging helper
  private async logAuditEvent(log: {
    tenant_id: string;
    user_id?: string;
    action: string;
    resource_type: string;
    resource_id?: string;
    old_values?: Record<string, unknown>;
    new_values?: Record<string, unknown>;
    ip_address?: string;
    user_agent?: string;
    notes?: string;
  }): Promise<void> {
    try {
      // This would integrate with the audit service
      // For now, just console log in development
      console.log('Audit event:', log);
    } catch (error) {
      console.error('Failed to log RBAC audit event:', error);
      // Don't throw - audit logging should not break the main operation
    }
  }
}
