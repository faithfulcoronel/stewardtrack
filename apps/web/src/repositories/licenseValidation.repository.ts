import 'server-only';
import { injectable, inject } from 'inversify';
import { TYPES } from '@/lib/types';
import type { LicenseValidationAdapter } from '@/adapters/licenseValidation.adapter';

export interface ValidationIssue {
  type: 'expired_license' | 'overlapping_grant' | 'missing_license' | 'orphaned_permission' | 'invalid_binding';
  severity: 'low' | 'medium' | 'high' | 'critical';
  tenant_id: string | null;
  description: string;
  fix_suggestion: string;
  metadata: Record<string, any>;
}

export interface ValidationReport {
  tenant_id: string;
  validated_at: Date;
  total_issues: number;
  critical_issues: number;
  high_issues: number;
  medium_issues: number;
  low_issues: number;
  issues: ValidationIssue[];
  is_healthy: boolean;
}

/**
 * LicenseValidationRepository
 *
 * Provides data access for license validation operations.
 * This repository handles complex cross-table validation queries via the adapter.
 */
@injectable()
export class LicenseValidationRepository {
  constructor(
    @inject(TYPES.LicenseValidationAdapter) private adapter: LicenseValidationAdapter
  ) {}

  /**
   * Check for expired licenses
   */
  async checkExpiredLicenses(tenantId: string): Promise<ValidationIssue[]> {
    const issues: ValidationIssue[] = [];
    const licenses = await this.adapter.fetchTenantLicenseSummary(tenantId);

    for (const license of licenses) {
      if (license.expires_at) {
        const expiryDate = new Date(license.expires_at);
        const now = new Date();

        if (expiryDate < now) {
          issues.push({
            type: 'expired_license',
            severity: 'critical',
            tenant_id: tenantId,
            description: `License for offering '${license.offering_name}' has expired on ${expiryDate.toISOString()}`,
            fix_suggestion: 'Renew the license or downgrade to a free tier',
            metadata: {
              offering_id: license.offering_id,
              offering_name: license.offering_name,
              expired_at: license.expires_at,
              days_overdue: Math.floor((now.getTime() - expiryDate.getTime()) / (1000 * 60 * 60 * 24)),
            },
          });
        }
      }
    }

    return issues;
  }

  /**
   * Check for overlapping feature grants
   */
  async checkOverlappingGrants(tenantId: string): Promise<ValidationIssue[]> {
    const issues: ValidationIssue[] = [];
    const grants = await this.adapter.fetchActiveFeatureGrants(tenantId);

    const featureCounts = new Map<string, number>();

    for (const grant of grants) {
      const count = featureCounts.get(grant.feature_id) || 0;
      featureCounts.set(grant.feature_id, count + 1);
    }

    for (const [featureId, count] of featureCounts) {
      if (count > 1) {
        issues.push({
          type: 'overlapping_grant',
          severity: 'low',
          tenant_id: tenantId,
          description: `Feature ${featureId} has ${count} active grants (should have 1)`,
          fix_suggestion: 'Remove duplicate feature grants',
          metadata: {
            feature_id: featureId,
            grant_count: count,
          },
        });
      }
    }

    return issues;
  }

  /**
   * Check for RBAC surfaces that require licenses but tenant doesn't have them
   */
  async checkMissingLicenses(tenantId: string): Promise<ValidationIssue[]> {
    const issues: ValidationIssue[] = [];
    const mismatches = await this.adapter.detectRbacLicenseMismatches(tenantId);

    for (const mismatch of mismatches) {
      issues.push({
        type: 'missing_license',
        severity: 'high',
        tenant_id: tenantId,
        description: `Surface '${mismatch.surface_title}' requires bundle '${mismatch.required_bundle}' but tenant doesn't have it`,
        fix_suggestion: 'Grant the required license bundle or remove RBAC access to this surface',
        metadata: {
          surface_id: mismatch.surface_id,
          surface_title: mismatch.surface_title,
          required_bundle: mismatch.required_bundle,
          role_name: mismatch.role_name,
        },
      });
    }

    return issues;
  }

  /**
   * Check for orphaned permissions
   */
  async checkOrphanedPermissions(tenantId: string): Promise<ValidationIssue[]> {
    const issues: ValidationIssue[] = [];
    const orphanedPerms = await this.adapter.fetchOrphanedPermissions(tenantId);

    for (const perm of orphanedPerms) {
      issues.push({
        type: 'orphaned_permission',
        severity: 'low',
        tenant_id: tenantId,
        description: `Permission '${perm.name}' (${perm.code}) is not assigned to any role`,
        fix_suggestion: 'Delete the orphaned permission or assign it to a role',
        metadata: {
          permission_id: perm.id,
          permission_code: perm.code,
          permission_name: perm.name,
        },
      });
    }

    return issues;
  }

  /**
   * Check for invalid surface license bindings
   */
  async checkInvalidBindings(_tenantId: string): Promise<ValidationIssue[]> {
    const issues: ValidationIssue[] = [];
    const bindings = await this.adapter.fetchActiveSurfaceLicenseBindings();

    for (const binding of bindings) {
      if (binding.required_bundle_id && !binding.license_feature_bundles) {
        const surfaceTitle = binding.metadata_surfaces?.[0]?.title || 'Unknown';

        issues.push({
          type: 'invalid_binding',
          severity: 'medium',
          tenant_id: null,
          description: `Surface '${surfaceTitle}' references non-existent bundle ${binding.required_bundle_id}`,
          fix_suggestion: 'Update the binding to reference a valid bundle or remove the binding',
          metadata: {
            surface_id: binding.surface_id,
            surface_title: surfaceTitle,
            invalid_bundle_id: binding.required_bundle_id,
          },
        });
      }
    }

    return issues;
  }

  /**
   * Get all active tenants
   */
  async getAllActiveTenants(): Promise<Array<{ id: string }>> {
    return this.adapter.fetchActiveTenants();
  }
}
