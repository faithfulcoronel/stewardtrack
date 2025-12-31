/**
 * Feature Permission Models
 *
 * Defines TypeScript interfaces for feature permissions and permission role templates
 * Part of: Feature Creation with Surface ID & Permission Definition
 */

import type { BaseModel } from './base.model';

// =====================================================================================
// Feature Permission Interfaces
// =====================================================================================

/**
 * Feature Permission - Defines a required permission for a feature
 * E.g., members:view, finance:delete
 */
export interface FeaturePermission extends BaseModel {
  id: string;
  feature_id: string;
  permission_code: string;  // Format: {category}:{action}
  display_name: string;
  description?: string;
  category: string;
  action: string;
  is_required: boolean;
  display_order: number;
  created_by?: string;
  updated_by?: string;
  created_at?: string;
  updated_at?: string;
}

/**
 * Feature Permission with Default Role Templates
 * Includes the permission and its suggested role assignments
 */
export interface FeaturePermissionWithTemplates extends FeaturePermission {
  default_role_templates: PermissionRoleTemplate[];
}

/**
 * Permission Role Template - Default role assignment for a permission
 * Suggests which roles should have this permission by default
 */
export interface PermissionRoleTemplate extends BaseModel {
  id: string;
  feature_permission_id: string;
  role_key: string;          // E.g., 'tenant_admin', 'staff', 'volunteer'
  is_recommended: boolean;
  reason?: string;
  created_by?: string;
  updated_by?: string;
  created_at?: string;
  updated_at?: string;
}

// =====================================================================================
// DTOs (Data Transfer Objects)
// =====================================================================================

/**
 * DTO for creating a feature permission
 */
export interface CreateFeaturePermissionDto {
  feature_id: string;
  permission_code: string;
  display_name: string;
  description?: string;
  is_required?: boolean;
  display_order?: number;
}

/**
 * DTO for updating a feature permission
 */
export interface UpdateFeaturePermissionDto {
  permission_code?: string;
  display_name?: string;
  description?: string;
  is_required?: boolean;
  display_order?: number;
}

/**
 * DTO for creating a permission role template
 */
export interface CreatePermissionRoleTemplateDto {
  feature_permission_id: string;
  role_key: string;
  is_recommended?: boolean;
  reason?: string;
}

/**
 * DTO for bulk permission creation with templates
 * Used when Product Owner creates a feature with permissions
 */
export interface BulkCreatePermissionDto {
  permission_code: string;
  display_name: string;
  description?: string;
  is_required?: boolean;
  default_roles?: string[];  // Role keys that should have this permission
}

// =====================================================================================
// Extended Feature Catalog Interface
// =====================================================================================

/**
 * Feature Catalog Entry with Surface and Permissions
 * Extends base feature catalog with new surface and permission fields
 */
export interface FeatureCatalogWithSurface {
  id: string;
  code: string;
  name: string;
  category: string;
  description?: string;
  phase: 'alpha' | 'beta' | 'ga';
  is_delegatable: boolean;
  is_active: boolean;

  // NEW: Surface association fields
  surface_id?: string;
  surface_type?: 'page' | 'dashboard' | 'wizard' | 'manager' | 'console' | 'audit' | 'overlay';
  module?: string;

  // Related data
  permissions?: FeaturePermission[];

  created_by?: string;
  updated_by?: string;
  created_at?: string;
  updated_at?: string;
}

// =====================================================================================
// Validation Interfaces
// =====================================================================================

/**
 * Validation result for permission codes and configurations
 */
export interface PermissionValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

// =====================================================================================
// Tenant Permission Configuration Interfaces
// =====================================================================================

/**
 * Permission with assigned roles for a tenant
 * Used by Tenant Admins to see and manage permission assignments
 */
export interface PermissionWithRoles {
  id: string;
  code: string;
  name: string;
  description?: string;
  category: string;
  is_required: boolean;
  assigned_roles: Array<{
    id: string;
    key: string;
    name: string;
  }>;
}

/**
 * Feature with permissions for tenant view
 * Used in Tenant Admin feature management UI
 */
export interface TenantFeatureWithPermissions {
  feature_id: string;
  feature_code: string;
  feature_name: string;
  surface_id?: string;
  permissions: Array<{
    code: string;
    name: string;
    description?: string;
    is_required: boolean;
    category: string;
    action: string;
  }>;
}

// =====================================================================================
// Database Function Result Types
// =====================================================================================

/**
 * Result from get_feature_permissions_with_templates() database function
 */
export interface DbFeaturePermissionWithTemplates {
  result_permission_id: string;
  result_permission_code: string;
  result_display_name: string;
  result_description?: string;
  result_category: string;
  result_action: string;
  result_is_required: boolean;
  result_default_roles: Array<{
    role_key: string;
    is_recommended: boolean;
    reason?: string;
  }>;
}

/**
 * Result from get_tenant_licensed_features_with_permissions() database function
 */
export interface DbTenantLicensedFeature {
  result_feature_id: string;
  result_feature_code: string;
  result_feature_name: string;
  result_surface_id?: string;
  result_permissions: Array<{
    code: string;
    name: string;
    description?: string;
    is_required: boolean;
    category: string;
    action: string;
  }>;
}

/**
 * Result from get_features_with_surfaces() database function
 */
export interface DbFeatureWithSurface {
  result_feature_id: string;
  result_feature_code: string;
  result_feature_name: string;
  result_surface_id: string;
  result_surface_type: string;
  result_module: string;
}
