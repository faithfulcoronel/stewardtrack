import { BaseModel } from '@/models/base.model';

export interface SurfaceLicenseBinding extends BaseModel {
  surface_id: string;
  required_license_bundle_id?: string | null;
  required_features?: string[];
  license_tier_min?: 'starter' | 'professional' | 'enterprise' | 'custom' | null;
}

export interface RbacSurfaceLicenseBinding {
  tenant_id: string;
  role_id?: string | null;
  bundle_id?: string | null;
  menu_item_id?: string | null;
  metadata_blueprint_id?: string | null;
  required_license_bundle_id?: string | null;
  enforces_license: boolean;
}

export interface EffectiveSurfaceAccess {
  tenant_id: string;
  role_id?: string | null;
  bundle_id?: string | null;
  menu_item_id?: string | null;
  metadata_blueprint_id?: string | null;
  surface_id?: string | null;
  surface_title?: string | null;
  surface_route?: string | null;
  surface_feature_code?: string | null;
  required_license_bundle_id?: string | null;
  enforces_license: boolean;
  surface_required_bundle_id?: string | null;
  surface_required_features?: string[];
  license_tier_min?: string | null;
  has_required_features: boolean;
  has_required_bundle: boolean;
}

export interface SurfaceAccessCheckDto {
  user_id: string;
  tenant_id: string;
  surface_id: string;
}

export interface SurfaceAccessResult {
  can_access: boolean;
  has_rbac_access: boolean;
  has_license_access: boolean;
  missing_features?: string[];
  missing_bundles?: string[];
  required_tier?: string;
}

export interface UpdateSurfaceLicenseBindingDto {
  required_license_bundle_id?: string | null;
  required_features?: string[];
  license_tier_min?: 'starter' | 'professional' | 'enterprise' | 'custom' | null;
}

export interface UpdateRbacSurfaceLicenseBindingDto {
  required_license_bundle_id?: string | null;
  enforces_license?: boolean;
}
