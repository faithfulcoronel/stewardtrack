/**
 * License Audit Models
 *
 * Type definitions for license audit tracking
 */

export interface LicenseChangeRecord {
  id: string;
  tenant_id: string;
  table_name: string;
  operation: string;
  record_id: string;
  old_values: any;
  new_values: any;
  user_id: string | null;
  created_at: string;
  security_impact: string;
  notes: string | null;
}

export interface RoleAssignmentHistory {
  user_id: string;
  user_email: string;
  role_id: string;
  role_name: string;
  tenant_id: string;
  assigned_at: string;
  assigned_by: string | null;
  revoked_at: string | null;
  revoked_by: string | null;
  is_active: boolean;
}

export interface FeatureGrantHistory {
  tenant_id: string;
  feature_id: string;
  feature_name: string;
  granted_at: string;
  granted_by: string | null;
  revoked_at: string | null;
  revoked_by: string | null;
  is_active: boolean;
  source: 'product_offering' | 'manual' | 'upgrade';
}

export interface ComplianceReport {
  license_changes: LicenseChangeRecord[];
  role_assignments: number;
  feature_grants: number;
  security_events: number;
  high_impact_changes: LicenseChangeRecord[];
}

export interface LicensingDriftReport {
  total_surfaces: number;
  licensed_surfaces: number;
  unlicensed_surfaces: number;
  drift_items: Array<{
    surface_id: string;
    surface_title: string;
    required_bundle: string;
    has_license: boolean;
    users_affected: number;
  }>;
}

export interface LicenseAuditQueryOptions {
  startDate?: Date;
  endDate?: Date;
  operation?: 'CREATE' | 'UPDATE' | 'DELETE';
  limit?: number;
  featureId?: string;
}
