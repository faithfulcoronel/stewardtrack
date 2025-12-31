import { BaseModel } from '@/models/base.model';
import { LicenseTier, ProductOfferingType } from '@/enums/licensing.enums';

export interface ProductOffering extends BaseModel {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  offering_type: ProductOfferingType | string;
  tier: LicenseTier | string;
  billing_cycle?: 'monthly' | 'annual' | 'lifetime' | null;
  base_price?: number | null;
  currency?: string;
  max_users?: number | null;
  max_tenants?: number;
  is_active: boolean;
  is_featured: boolean;
  sort_order: number;
  metadata?: Record<string, any>;
  deleted_at?: string | null;
}

export interface ProductOfferingFeature {
  id: string;
  offering_id: string;
  feature_id: string;
  is_required: boolean;
  created_at: string;
}

export interface CreateProductOfferingDto {
  code: string;
  name: string;
  description?: string | null;
  offering_type: ProductOfferingType | string;
  tier: LicenseTier | string;
  billing_cycle?: 'monthly' | 'annual' | 'lifetime' | null;
  base_price?: number | null;
  currency?: string;
  max_users?: number | null;
  max_tenants?: number;
  is_active?: boolean;
  is_featured?: boolean;
  sort_order?: number;
  metadata?: Record<string, any>;
}

export interface UpdateProductOfferingDto {
  name?: string;
  description?: string | null;
  offering_type?: ProductOfferingType | string;
  tier?: LicenseTier | string;
  billing_cycle?: 'monthly' | 'annual' | 'lifetime' | null;
  base_price?: number | null;
  currency?: string;
  max_users?: number | null;
  max_tenants?: number;
  is_active?: boolean;
  is_featured?: boolean;
  sort_order?: number;
  metadata?: Record<string, any>;
}

export interface ProductOfferingBundle {
  id: string;
  offering_id: string;
  bundle_id: string;
  is_required: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export interface AssignBundleToOfferingDto {
  bundle_id: string;
  is_required?: boolean;
  display_order?: number;
}

export interface ProductOfferingWithFeatures extends ProductOffering {
  features?: Array<{
    id: string;
    code: string;
    name: string;
    category: string;
    is_required: boolean;
  }>;
}

export interface ProductOfferingWithBundles extends ProductOffering {
  bundles?: Array<{
    id: string;
    code: string;
    name: string;
    bundle_type: string;
    category: string;
    is_required: boolean;
    display_order: number;
    feature_count: number;
  }>;
}

export interface ProductOfferingComplete extends ProductOffering {
  bundles?: Array<{
    id: string;
    code: string;
    name: string;
    bundle_type: string;
    category: string;
    is_required: boolean;
    display_order: number;
    feature_count: number;
  }>;
  features?: Array<{
    id: string;
    code: string;
    name: string;
    category: string;
    is_required: boolean;
  }>;
  bundle_count?: number;
  feature_count?: number;
}
