import { BaseModel } from '@/models/base.model';

export interface LicenseFeatureBundle extends BaseModel {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  bundle_type: 'core' | 'add-on' | 'module' | 'custom';
  category: string;
  is_active: boolean;
  is_system: boolean;
  sort_order: number;
  metadata?: Record<string, any>;
  deleted_at?: string | null;
}

export interface LicenseFeatureBundleItem {
  id: string;
  bundle_id: string;
  feature_id: string;
  is_required: boolean;
  display_order: number;
  created_at: string;
}

export interface CreateLicenseFeatureBundleDto {
  code: string;
  name: string;
  description?: string | null;
  bundle_type: 'core' | 'add-on' | 'module' | 'custom';
  category?: string;
  is_active?: boolean;
  is_system?: boolean;
  sort_order?: number;
  metadata?: Record<string, any>;
}

export interface UpdateLicenseFeatureBundleDto {
  name?: string;
  description?: string | null;
  bundle_type?: 'core' | 'add-on' | 'module' | 'custom';
  category?: string;
  is_active?: boolean;
  sort_order?: number;
  metadata?: Record<string, any>;
}

export interface LicenseFeatureBundleWithFeatures extends LicenseFeatureBundle {
  features?: Array<{
    id: string;
    code: string;
    name: string;
    category: string;
    is_required: boolean;
    display_order: number;
  }>;
  feature_count?: number;
}

export interface AssignFeatureToBundleDto {
  feature_id: string;
  is_required?: boolean;
  display_order?: number;
}
