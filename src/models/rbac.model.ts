import { BaseModel } from './base.model';

export interface Permission {
  id: string;
  code: string;
  name: string;
  description?: string;
  module: string;
  category: string;
  is_active: boolean;
  tenant_id: string;
  created_at: string;
  updated_at: string;
  created_by?: string;
  updated_by?: string;
}

export interface Role extends BaseModel {
  name: string;
  description?: string;
  metadata_key?: string;
  scope: 'system' | 'tenant' | 'campus' | 'ministry';
  is_system: boolean;
  is_delegatable: boolean;
  tenant_id: string;
}

export interface PermissionBundle extends BaseModel {
  name: string;
  description?: string;
  metadata_key?: string;
  scope: 'system' | 'tenant' | 'campus' | 'ministry';
  is_template: boolean;
  tenant_id: string;
}

export interface PermissionAction {
  id: string;
  code: string;
  name: string;
  description?: string;
  module: string;
  category: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface RolePermission {
  id: string;
  role_id: string;
  permission_id: string;
  granted_at: string;
  granted_by?: string;
  tenant_id: string;
}

export interface RoleBundle {
  id: string;
  role_id: string;
  bundle_id: string;
  tenant_id: string;
  created_at: string;
  created_by?: string;
}

export interface BundlePermission {
  id: string;
  bundle_id: string;
  permission_id: string;
  tenant_id: string;
  created_at: string;
  created_by?: string;
}

export interface UserRole extends BaseModel {
  user_id: string;
  role_id: string;
  tenant_id: string;
  assigned_by?: string;
  assigned_at: string;
  expires_at?: string;
}

export interface MetadataSurface {
  id: string;
  module: string;
  route?: string;
  blueprint_path: string;
  surface_type: 'page' | 'dashboard' | 'wizard' | 'manager' | 'console' | 'audit' | 'overlay';
  phase: 'foundation' | 'role-management' | 'surface-binding' | 'delegated' | 'operations' | 'legacy';
  title?: string;
  description?: string;
  feature_code?: string;
  rbac_role_keys?: string[];
  rbac_bundle_keys?: string[];
  default_menu_code?: string;
  supports_mobile: boolean;
  supports_desktop: boolean;
  is_system: boolean;
  created_by?: string;
  updated_by?: string;
  created_at: string;
  updated_at: string;
}

export interface MetadataSurfaceOverlay {
  id: string;
  surface_id: string;
  persona: string;
  overlay_path: string;
  description?: string;
  scope: 'tenant' | 'campus' | 'global';
  is_template: boolean;
  created_by?: string;
  updated_by?: string;
  created_at: string;
  updated_at: string;
}

export interface RbacSurfaceBinding {
  id: string;
  tenant_id: string;
  role_id?: string;
  bundle_id?: string;
  menu_item_id?: string;
  metadata_blueprint_id?: string;
  required_feature_code?: string;
  is_active: boolean;
  created_by?: string;
  updated_by?: string;
  created_at: string;
  updated_at: string;
}

export interface FeatureCatalog {
  id: string;
  code: string;
  name: string;
  category: string;
  description?: string;
  phase: string;
  is_delegatable: boolean;
  is_active: boolean;
  created_by?: string;
  updated_by?: string;
  created_at: string;
  updated_at: string;
}

export interface TenantFeatureGrant {
  id: string;
  tenant_id: string;
  feature_id: string;
  grant_source: 'package' | 'direct' | 'trial' | 'comp';
  package_id?: string;
  source_reference?: string;
  starts_at?: string;
  expires_at?: string;
  created_by?: string;
  updated_by?: string;
  created_at: string;
  updated_at: string;
}

// DTOs for API operations
export interface CreateRoleDto {
  name: string;
  description?: string;
  metadata_key?: string;
  scope: 'system' | 'tenant' | 'campus' | 'ministry';
  is_delegatable?: boolean;
}

export interface UpdateRoleDto {
  name?: string;
  description?: string;
  metadata_key?: string;
  scope?: 'system' | 'tenant' | 'campus' | 'ministry';
  is_delegatable?: boolean;
}

export interface CreatePermissionBundleDto {
  name: string;
  description?: string;
  metadata_key?: string;
  scope: 'system' | 'tenant' | 'campus' | 'ministry';
  is_template?: boolean;
  permission_ids?: string[];
}

export interface UpdatePermissionBundleDto {
  name?: string;
  description?: string;
  metadata_key?: string;
  scope?: 'system' | 'tenant' | 'campus' | 'ministry';
  is_template?: boolean;
}

export interface AssignRoleDto {
  user_id: string;
  role_id: string;
  expires_at?: string;
}

export interface CreateSurfaceBindingDto {
  role_id?: string;
  bundle_id?: string;
  menu_item_id?: string;
  metadata_blueprint_id?: string;
  required_feature_code?: string;
}

// View models for UI components
export interface RoleWithPermissions extends Role {
  permissions: Permission[];
  bundles: PermissionBundle[];
  user_count: number;
}

export interface BundleWithPermissions extends PermissionBundle {
  permissions: Permission[];
  role_count: number;
}

export interface UserWithRoles {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  roles: Role[];
  effective_permissions: Permission[];
}

export interface RbacAuditLog {
  id: string;
  tenant_id: string;
  user_id: string;
  action: string;
  resource_type: string;
  resource_id: string;
  old_values?: Record<string, any>;
  new_values?: Record<string, any>;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
}

// Delegation context for scoped access
export interface DelegatedContext {
  user_id: string;
  tenant_id: string;
  scope: 'campus' | 'ministry';
  scope_id?: string;
  allowed_roles: string[];
  allowed_bundles: string[];
}

// Multi-role evaluation context
export interface MultiRoleContext {
  user_id: string;
  tenant_id: string;
  role_keys: string[];
  bundle_keys: string[];
  effective_permissions: string[];
  feature_grants: string[];
}