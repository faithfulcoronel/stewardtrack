import 'server-only';
import { container } from '@/lib/container';
import { TYPES } from '@/lib/types';
import type { LicenseAuditService } from '@/services/LicenseAuditService';
import type {
  LicenseChangeRecord,
  RoleAssignmentHistory,
  FeatureGrantHistory,
  ComplianceReport,
  LicensingDriftReport,
  LicenseAuditQueryOptions
} from '@/models/licenseAudit.model';

/**
 * License Audit Query Helpers
 *
 * Pre-built queries for common license audit scenarios:
 * - License change history
 * - Role assignment history
 * - Feature grant/revoke tracking
 * - Compliance report generation
 *
 * All functions now use LicenseAuditService following the architectural pattern:
 * Utility → Service → Repository → Adapter → Supabase
 */

// Re-export types for backward compatibility
export type {
  LicenseChangeRecord,
  RoleAssignmentHistory,
  FeatureGrantHistory,
  ComplianceReport,
  LicensingDriftReport,
  LicenseAuditQueryOptions
};

/**
 * Get license change history for a tenant
 */
export async function getLicenseChangeHistory(
  tenantId: string,
  options: LicenseAuditQueryOptions = {}
): Promise<LicenseChangeRecord[]> {
  const service = container.get<LicenseAuditService>(TYPES.LicenseAuditService);
  return service.getLicenseChangeHistory(tenantId, options);
}

/**
 * Get role assignment history for a user
 */
export async function getUserRoleHistory(
  userId: string,
  tenantId?: string
): Promise<RoleAssignmentHistory[]> {
  const service = container.get<LicenseAuditService>(TYPES.LicenseAuditService);
  return service.getUserRoleHistory(userId, tenantId);
}

/**
 * Get feature grant/revoke history for a tenant
 */
export async function getFeatureGrantHistory(
  tenantId: string,
  options: LicenseAuditQueryOptions = {}
): Promise<FeatureGrantHistory[]> {
  const service = container.get<LicenseAuditService>(TYPES.LicenseAuditService);
  return service.getFeatureGrantHistory(tenantId, options);
}

/**
 * Get compliance report for a date range
 */
export async function getComplianceReport(
  tenantId: string,
  startDate: Date,
  endDate: Date
): Promise<ComplianceReport> {
  const service = container.get<LicenseAuditService>(TYPES.LicenseAuditService);
  return service.getComplianceReport(tenantId, startDate, endDate);
}

/**
 * Get permission access logs for a user
 */
export async function getUserAccessLog(
  userId: string,
  tenantId: string,
  options: LicenseAuditQueryOptions = {}
): Promise<LicenseChangeRecord[]> {
  const service = container.get<LicenseAuditService>(TYPES.LicenseAuditService);
  return service.getUserAccessLog(userId, tenantId, options);
}

/**
 * Get licensing drift report (surfaces with RBAC access but no license)
 */
export async function getLicensingDriftReport(
  tenantId: string
): Promise<LicensingDriftReport> {
  const service = container.get<LicenseAuditService>(TYPES.LicenseAuditService);
  return service.getLicensingDriftReport(tenantId);
}

/**
 * Export audit trail to JSON
 */
export async function exportAuditTrail(
  tenantId: string,
  startDate: Date,
  endDate: Date
): Promise<string> {
  const service = container.get<LicenseAuditService>(TYPES.LicenseAuditService);
  return service.exportAuditTrail(tenantId, startDate, endDate);
}

/**
 * Export audit trail to CSV
 */
export async function exportAuditTrailCSV(
  tenantId: string,
  startDate: Date,
  endDate: Date
): Promise<string> {
  const service = container.get<LicenseAuditService>(TYPES.LicenseAuditService);
  return service.exportAuditTrailCSV(tenantId, startDate, endDate);
}
