import 'server-only';
import { injectable, inject } from 'inversify';
import { TYPES } from '@/lib/types';
import type { ILicenseAuditAdapter } from '@/adapters/licenseAudit.adapter';
import type {
  LicenseChangeRecord,
  RoleAssignmentHistory,
  FeatureGrantHistory,
  ComplianceReport,
  LicensingDriftReport,
  LicenseAuditQueryOptions
} from '@/models/licenseAudit.model';

export interface ILicenseAuditRepository {
  getLicenseChangeHistory(
    tenantId: string,
    options?: LicenseAuditQueryOptions
  ): Promise<LicenseChangeRecord[]>;

  getUserRoleHistory(
    userId: string,
    tenantId?: string
  ): Promise<RoleAssignmentHistory[]>;

  getFeatureGrantHistory(
    tenantId: string,
    options?: LicenseAuditQueryOptions
  ): Promise<FeatureGrantHistory[]>;

  getComplianceReport(
    tenantId: string,
    startDate: Date,
    endDate: Date
  ): Promise<ComplianceReport>;

  getUserAccessLog(
    userId: string,
    tenantId: string,
    options?: LicenseAuditQueryOptions
  ): Promise<LicenseChangeRecord[]>;

  getLicensingDriftReport(
    tenantId: string
  ): Promise<LicensingDriftReport>;
}

@injectable()
export class LicenseAuditRepository implements ILicenseAuditRepository {
  constructor(
    @inject(TYPES.ILicenseAuditAdapter)
    private adapter: ILicenseAuditAdapter
  ) {}

  async getLicenseChangeHistory(
    tenantId: string,
    options: LicenseAuditQueryOptions = {}
  ): Promise<LicenseChangeRecord[]> {
    return this.adapter.getLicenseChangeHistory(tenantId, options);
  }

  async getUserRoleHistory(
    userId: string,
    tenantId?: string
  ): Promise<RoleAssignmentHistory[]> {
    const data = await this.adapter.getUserRoleHistory(userId, tenantId);

    // Transform audit records into role history
    const history: RoleAssignmentHistory[] = [];

    for (const record of data) {
      const newValues = record.new_values || {};
      const oldValues = record.old_values || {};

      if (record.operation === 'CREATE' || record.operation === 'INSERT') {
        history.push({
          user_id: userId,
          user_email: newValues.user_email || '',
          role_id: newValues.role_id,
          role_name: newValues.role_name || '',
          tenant_id: record.tenant_id,
          assigned_at: record.created_at,
          assigned_by: record.user_id,
          revoked_at: null,
          revoked_by: null,
          is_active: true,
        });
      } else if (record.operation === 'DELETE') {
        history.push({
          user_id: userId,
          user_email: oldValues.user_email || '',
          role_id: oldValues.role_id,
          role_name: oldValues.role_name || '',
          tenant_id: record.tenant_id,
          assigned_at: oldValues.created_at || record.created_at,
          assigned_by: null,
          revoked_at: record.created_at,
          revoked_by: record.user_id,
          is_active: false,
        });
      }
    }

    return history;
  }

  async getFeatureGrantHistory(
    tenantId: string,
    options: LicenseAuditQueryOptions = {}
  ): Promise<FeatureGrantHistory[]> {
    const data = await this.adapter.getFeatureGrantHistory(tenantId, options);

    // Transform audit records into grant history
    const history: FeatureGrantHistory[] = [];

    for (const record of data) {
      const newValues = record.new_values || {};
      const oldValues = record.old_values || {};

      if (options.featureId && newValues.feature_id !== options.featureId) {
        continue;
      }

      if (record.operation === 'CREATE' || record.operation === 'GRANT') {
        history.push({
          tenant_id: tenantId,
          feature_id: newValues.feature_id,
          feature_name: newValues.feature_name || '',
          granted_at: record.created_at,
          granted_by: record.user_id,
          revoked_at: null,
          revoked_by: null,
          is_active: newValues.is_active !== false,
          source: newValues.source || 'manual',
        });
      } else if (record.operation === 'DELETE' || record.operation === 'REVOKE') {
        history.push({
          tenant_id: tenantId,
          feature_id: oldValues.feature_id,
          feature_name: oldValues.feature_name || '',
          granted_at: oldValues.granted_at || record.created_at,
          granted_by: null,
          revoked_at: record.created_at,
          revoked_by: record.user_id,
          is_active: false,
          source: oldValues.source || 'manual',
        });
      }
    }

    return history;
  }

  async getComplianceReport(
    tenantId: string,
    startDate: Date,
    endDate: Date
  ): Promise<ComplianceReport> {
    // Get all license changes
    const license_changes = await this.getLicenseChangeHistory(tenantId, {
      startDate,
      endDate,
    });

    // Get role assignment count
    const role_assignments = await this.adapter.getRoleAssignmentCount(
      tenantId,
      startDate,
      endDate
    );

    // Get feature grant count
    const feature_grants = await this.adapter.getFeatureGrantCount(
      tenantId,
      startDate,
      endDate
    );

    // Get security events count
    const security_events = await this.adapter.getSecurityEventsCount(
      tenantId,
      startDate,
      endDate
    );

    // Get high impact changes
    const high_impact_changes = license_changes.filter(
      change => change.security_impact === 'high' || change.security_impact === 'critical'
    );

    return {
      license_changes,
      role_assignments,
      feature_grants,
      security_events,
      high_impact_changes,
    };
  }

  async getUserAccessLog(
    userId: string,
    tenantId: string,
    options: LicenseAuditQueryOptions = {}
  ): Promise<LicenseChangeRecord[]> {
    return this.adapter.getUserAccessLog(userId, tenantId, options);
  }

  async getLicensingDriftReport(
    tenantId: string
  ): Promise<LicensingDriftReport> {
    return this.adapter.getLicensingDriftReport(tenantId);
  }
}
