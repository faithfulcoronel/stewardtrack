import 'server-only';
import { injectable } from 'inversify';
import { createClient } from '@/utils/supabase/server';

/**
 * LicenseValidationService
 *
 * Validates license states across all tenants and detects issues:
 * - Expired licenses
 * - Overlapping feature grants
 * - RBAC surface bindings without license coverage
 * - Orphaned permissions
 */

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

@injectable()
export class LicenseValidationService {
  /**
   * Validate a specific tenant's license state
   */
  async validateTenant(tenantId: string): Promise<ValidationReport> {
    const issues: ValidationIssue[] = [];

    // Check for expired licenses
    issues.push(...await this.checkExpiredLicenses(tenantId));

    // Check for overlapping feature grants
    issues.push(...await this.checkOverlappingGrants(tenantId));

    // Check for RBAC bindings without licenses
    issues.push(...await this.checkMissingLicenses(tenantId));

    // Check for orphaned permissions
    issues.push(...await this.checkOrphanedPermissions(tenantId));

    // Check for invalid surface bindings
    issues.push(...await this.checkInvalidBindings(tenantId));

    const critical_issues = issues.filter(i => i.severity === 'critical').length;
    const high_issues = issues.filter(i => i.severity === 'high').length;
    const medium_issues = issues.filter(i => i.severity === 'medium').length;
    const low_issues = issues.filter(i => i.severity === 'low').length;

    return {
      tenant_id: tenantId,
      validated_at: new Date(),
      total_issues: issues.length,
      critical_issues,
      high_issues,
      medium_issues,
      low_issues,
      issues,
      is_healthy: critical_issues === 0 && high_issues === 0,
    };
  }

  /**
   * Validate all tenants
   */
  async validateAllTenants(): Promise<ValidationReport[]> {
    const supabase = await createClient();

    const { data: tenants } = await supabase
      .from('tenants')
      .select('id')
      .eq('is_active', true);

    const reports: ValidationReport[] = [];

    for (const tenant of tenants || []) {
      const report = await this.validateTenant(tenant.id);
      reports.push(report);
    }

    return reports;
  }

  /**
   * Check for expired licenses
   */
  private async checkExpiredLicenses(tenantId: string): Promise<ValidationIssue[]> {
    const supabase = await createClient();
    const issues: ValidationIssue[] = [];

    const { data } = await supabase
      .from('tenant_license_summary')
      .select('*')
      .eq('tenant_id', tenantId);

    for (const license of data || []) {
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
  private async checkOverlappingGrants(tenantId: string): Promise<ValidationIssue[]> {
    const supabase = await createClient();
    const issues: ValidationIssue[] = [];

    // Find features granted multiple times
    const { data } = await supabase
      .from('tenant_feature_grants')
      .select('feature_id')
      .eq('tenant_id', tenantId)
      .eq('is_active', true);

    const featureCounts = new Map<string, number>();

    for (const grant of data || []) {
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
  private async checkMissingLicenses(tenantId: string): Promise<ValidationIssue[]> {
    const supabase = await createClient();
    const issues: ValidationIssue[] = [];

    const { data } = await supabase.rpc('detect_rbac_license_mismatches', {
      p_tenant_id: tenantId,
    });

    for (const mismatch of data || []) {
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
   * Check for orphaned permissions (permissions assigned but no role bindings)
   */
  private async checkOrphanedPermissions(tenantId: string): Promise<ValidationIssue[]> {
    const supabase = await createClient();
    const issues: ValidationIssue[] = [];

    // Find permissions not linked to any role
    const { data: orphanedPerms } = await supabase
      .from('permissions')
      .select('id, code, name')
      .eq('tenant_id', tenantId)
      .not('id', 'in', `(
        SELECT DISTINCT permission_id
        FROM role_permissions
        WHERE tenant_id = '${tenantId}'
      )`);

    for (const perm of orphanedPerms || []) {
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
  private async checkInvalidBindings(tenantId: string): Promise<ValidationIssue[]> {
    const supabase = await createClient();
    const issues: ValidationIssue[] = [];

    // Find surface bindings with invalid bundle references
    const { data: bindings } = await supabase
      .from('surface_license_bindings')
      .select(`
        *,
        metadata_surfaces(id, title),
        license_feature_bundles(id, name)
      `)
      .eq('is_active', true);

    for (const binding of bindings || []) {
      if (binding.required_bundle_id && !binding.license_feature_bundles) {
        issues.push({
          type: 'invalid_binding',
          severity: 'medium',
          tenant_id: null, // System-wide issue
          description: `Surface '${binding.metadata_surfaces?.title}' references non-existent bundle ${binding.required_bundle_id}`,
          fix_suggestion: 'Update the binding to reference a valid bundle or remove the binding',
          metadata: {
            surface_id: binding.surface_id,
            surface_title: binding.metadata_surfaces?.title,
            invalid_bundle_id: binding.required_bundle_id,
          },
        });
      }
    }

    return issues;
  }

  /**
   * Get validation summary for all tenants
   */
  async getValidationSummary(): Promise<{
    total_tenants: number;
    healthy_tenants: number;
    tenants_with_issues: number;
    total_critical_issues: number;
    total_high_issues: number;
    total_medium_issues: number;
    total_low_issues: number;
  }> {
    const reports = await this.validateAllTenants();

    return {
      total_tenants: reports.length,
      healthy_tenants: reports.filter(r => r.is_healthy).length,
      tenants_with_issues: reports.filter(r => !r.is_healthy).length,
      total_critical_issues: reports.reduce((sum, r) => sum + r.critical_issues, 0),
      total_high_issues: reports.reduce((sum, r) => sum + r.high_issues, 0),
      total_medium_issues: reports.reduce((sum, r) => sum + r.medium_issues, 0),
      total_low_issues: reports.reduce((sum, r) => sum + r.low_issues, 0),
    };
  }
}
