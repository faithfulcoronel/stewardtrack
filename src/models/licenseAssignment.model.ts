import { BaseModel } from '@/models/base.model';

/**
 * LicenseAssignment - Tracks manual license assignments to tenants
 */
export interface LicenseAssignment extends BaseModel {
  id: string;
  tenant_id: string;
  offering_id: string;
  previous_offering_id: string | null;
  assigned_at: string;
  assigned_by: string | null;
  notes: string | null;
}

/**
 * LicenseAssignmentWithDetails - Assignment with related offering and user info
 */
export interface LicenseAssignmentWithDetails extends LicenseAssignment {
  offering_name: string;
  offering_tier: string;
  previous_offering_name: string | null;
  assigned_by_email: string | null;
}

/**
 * TenantForAssignment - Tenant data for assignment selection UI
 */
export interface TenantForAssignment {
  tenant_id: string;
  tenant_name: string;
  tenant_subdomain: string;
  tenant_status: string;
  subscription_tier: string;
  subscription_status: string;
  current_offering_id: string | null;
  current_offering_name: string | null;
  current_offering_tier: string | null;
  feature_count: number;
  last_assignment_date: string | null;
}

/**
 * AssignmentResult - Result of license assignment operation
 */
export interface AssignmentResult {
  assignment_id: string;
  tenant_id: string;
  offering_id: string;
  previous_offering_id: string | null;
  assigned_at: string;
  features_granted: number;
  features_revoked: number;
}

/**
 * CreateLicenseAssignmentDto - Data for creating a new license assignment
 */
export interface CreateLicenseAssignmentDto {
  tenant_id: string;
  offering_id: string;
  assigned_by: string;
  notes?: string;
}

/**
 * LicenseHistoryEntry - Entry in tenant's license history
 */
export interface LicenseHistoryEntry {
  assignment_id: string;
  offering_id: string;
  offering_name: string;
  offering_tier: string;
  previous_offering_id: string | null;
  previous_offering_name: string | null;
  assigned_at: string;
  assigned_by: string | null;
  assigned_by_email: string | null;
  notes: string | null;
}

/**
 * FeatureChangeSummary - Summary of features being added/removed
 */
export interface FeatureChangeSummary {
  features_to_add: Array<{
    id: string;
    name: string;
    description: string | null;
  }>;
  features_to_remove: Array<{
    id: string;
    name: string;
    description: string | null;
  }>;
  features_to_keep: Array<{
    id: string;
    name: string;
    description: string | null;
  }>;
}
