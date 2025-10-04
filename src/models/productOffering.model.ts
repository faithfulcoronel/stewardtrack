import { BaseModel } from '@/models/base.model';

export interface ProductOffering extends BaseModel {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  offering_type: 'subscription' | 'one-time' | 'trial' | 'enterprise';
  tier: 'starter' | 'professional' | 'enterprise' | 'custom';
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
  offering_type: 'subscription' | 'one-time' | 'trial' | 'enterprise';
  tier: 'starter' | 'professional' | 'enterprise' | 'custom';
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
  offering_type?: 'subscription' | 'one-time' | 'trial' | 'enterprise';
  tier?: 'starter' | 'professional' | 'enterprise' | 'custom';
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

export interface ProductOfferingWithFeatures extends ProductOffering {
  features?: Array<{
    id: string;
    code: string;
    name: string;
    category: string;
    is_required: boolean;
  }>;
}
