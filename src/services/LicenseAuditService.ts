import 'server-only';
import { injectable, inject } from 'inversify';
import { TYPES } from '@/lib/types';
import type { ILicenseAuditRepository } from '@/repositories/licenseAudit.repository';
import type {
  LicenseChangeRecord,
  RoleAssignmentHistory,
  FeatureGrantHistory,
  ComplianceReport,
  LicensingDriftReport,
  LicenseAuditQueryOptions
} from '@/models/licenseAudit.model';

@injectable()
export class LicenseAuditService {
  constructor(
    @inject(TYPES.ILicenseAuditRepository)
    private repository: ILicenseAuditRepository
  ) {}

  /**
   * Get license change history for a tenant
   */
  async getLicenseChangeHistory(
    tenantId: string,
    options: LicenseAuditQueryOptions = {}
  ): Promise<LicenseChangeRecord[]> {
    return this.repository.getLicenseChangeHistory(tenantId, options);
  }

  /**
   * Get role assignment history for a user
   */
  async getUserRoleHistory(
    userId: string,
    tenantId?: string
  ): Promise<RoleAssignmentHistory[]> {
    return this.repository.getUserRoleHistory(userId, tenantId);
  }

  /**
   * Get feature grant/revoke history for a tenant
   */
  async getFeatureGrantHistory(
    tenantId: string,
    options: LicenseAuditQueryOptions = {}
  ): Promise<FeatureGrantHistory[]> {
    return this.repository.getFeatureGrantHistory(tenantId, options);
  }

  /**
   * Get compliance report for a date range
   */
  async getComplianceReport(
    tenantId: string,
    startDate: Date,
    endDate: Date
  ): Promise<ComplianceReport> {
    return this.repository.getComplianceReport(tenantId, startDate, endDate);
  }

  /**
   * Get permission access logs for a user
   */
  async getUserAccessLog(
    userId: string,
    tenantId: string,
    options: LicenseAuditQueryOptions = {}
  ): Promise<LicenseChangeRecord[]> {
    return this.repository.getUserAccessLog(userId, tenantId, options);
  }

  /**
   * Get licensing drift report (surfaces with RBAC access but no license)
   */
  async getLicensingDriftReport(
    tenantId: string
  ): Promise<LicensingDriftReport> {
    return this.repository.getLicensingDriftReport(tenantId);
  }

  /**
   * Export audit trail to JSON
   */
  async exportAuditTrail(
    tenantId: string,
    startDate: Date,
    endDate: Date
  ): Promise<string> {
    const report = await this.repository.getComplianceReport(tenantId, startDate, endDate);
    return JSON.stringify(report, null, 2);
  }

  /**
   * Export audit trail to CSV
   */
  async exportAuditTrailCSV(
    tenantId: string,
    startDate: Date,
    endDate: Date
  ): Promise<string> {
    const changes = await this.repository.getLicenseChangeHistory(tenantId, {
      startDate,
      endDate,
    });

    const headers = [
      'Date',
      'Operation',
      'Table',
      'Record ID',
      'User ID',
      'Security Impact',
      'Changes',
      'Notes',
    ];

    const rows = changes.map(change => [
      change.created_at,
      change.operation,
      change.table_name,
      change.record_id,
      change.user_id || 'system',
      change.security_impact,
      JSON.stringify({ old: change.old_values, new: change.new_values }),
      change.notes || '',
    ]);

    const csv = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
    ].join('\n');

    return csv;
  }
}
