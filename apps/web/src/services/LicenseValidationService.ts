import 'server-only';
import { injectable, inject } from 'inversify';
import { TYPES } from '@/lib/types';
import type { LicenseValidationRepository, ValidationIssue, ValidationReport } from '@/repositories/licenseValidation.repository';

/**
 * LicenseValidationService
 *
 * Validates license states across all tenants and detects issues:
 * - Expired licenses
 * - Overlapping feature grants
 * - RBAC surface bindings without license coverage
 * - Orphaned permissions
 */

export type { ValidationIssue, ValidationReport };

@injectable()
export class LicenseValidationService {
  constructor(
    @inject(TYPES.LicenseValidationRepository) private validationRepository: LicenseValidationRepository
  ) {}
  /**
   * Validate a specific tenant's license state
   */
  async validateTenant(tenantId: string): Promise<ValidationReport> {
    const issues: ValidationIssue[] = [];

    // Check for expired licenses
    issues.push(...await this.validationRepository.checkExpiredLicenses(tenantId));

    // Check for overlapping feature grants
    issues.push(...await this.validationRepository.checkOverlappingGrants(tenantId));

    // Check for RBAC bindings without licenses
    issues.push(...await this.validationRepository.checkMissingLicenses(tenantId));

    // Check for orphaned permissions
    issues.push(...await this.validationRepository.checkOrphanedPermissions(tenantId));

    // Check for invalid surface bindings
    issues.push(...await this.validationRepository.checkInvalidBindings(tenantId));

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
    const tenants = await this.validationRepository.getAllActiveTenants();

    const reports: ValidationReport[] = [];

    for (const tenant of tenants) {
      const report = await this.validateTenant(tenant.id);
      reports.push(report);
    }

    return reports;
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
