import { BaseModel } from '@/models/base.model';
import { LicenseTier, ProductOfferingType } from '@/enums/licensing.enums';
import { SupportedCurrency } from '@/enums/currency.enums';

export interface ProductOffering extends BaseModel {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  offering_type: ProductOfferingType | string;
  tier: LicenseTier | string;
  billing_cycle?: 'monthly' | 'annual' | 'lifetime' | null;
  max_users?: number | null;
  max_tenants?: number;
  /** Maximum church members allowed. NULL = unlimited, 0 = not available */
  max_members?: number | null;
  /** Monthly SMS credits limit. NULL = unlimited, 0 = not available */
  max_sms_per_month?: number | null;
  /** Monthly email limit. NULL = unlimited, 0 = not available */
  max_emails_per_month?: number | null;
  /** Storage limit in megabytes. NULL = unlimited, 0 = not available */
  max_storage_mb?: number | null;
  /** Maximum admin/staff users allowed. NULL = unlimited, 0 = not available */
  max_admin_users?: number | null;
  is_active: boolean;
  is_featured: boolean;
  sort_order: number;
  metadata?: Record<string, any>;
  deleted_at?: string | null;
}

/**
 * Multi-currency pricing for a product offering
 */
export interface ProductOfferingPrice {
  id: string;
  offering_id: string;
  currency: SupportedCurrency | string;
  price: number;
  is_active: boolean;
  created_by?: string;
  updated_by?: string;
  created_at: string;
  updated_at: string;
}

/**
 * Supported currency reference data
 */
export interface SupportedCurrencyInfo {
  code: string;
  name: string;
  symbol: string;
  symbol_position: 'before' | 'after';
  decimal_places: number;
  locale: string;
  region: string;
  xendit_supported: boolean;
  min_amount: number;
  is_active: boolean;
  sort_order: number;
}

/**
 * Country to currency mapping
 */
export interface CountryCurrencyMapping {
  country_code: string;
  country_name: string;
  currency_code: string;
  is_active: boolean;
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
  max_users?: number | null;
  max_tenants?: number;
  /** Maximum church members allowed. NULL = unlimited */
  max_members?: number | null;
  /** Monthly SMS credits limit. NULL = unlimited */
  max_sms_per_month?: number | null;
  /** Monthly email limit. NULL = unlimited */
  max_emails_per_month?: number | null;
  /** Storage limit in megabytes. NULL = unlimited */
  max_storage_mb?: number | null;
  /** Maximum admin/staff users allowed. NULL = unlimited */
  max_admin_users?: number | null;
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
  max_users?: number | null;
  max_tenants?: number;
  /** Maximum church members allowed. NULL = unlimited */
  max_members?: number | null;
  /** Monthly SMS credits limit. NULL = unlimited */
  max_sms_per_month?: number | null;
  /** Monthly email limit. NULL = unlimited */
  max_emails_per_month?: number | null;
  /** Storage limit in megabytes. NULL = unlimited */
  max_storage_mb?: number | null;
  /** Maximum admin/staff users allowed. NULL = unlimited */
  max_admin_users?: number | null;
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
  /** Multi-currency prices */
  prices?: ProductOfferingPrice[];
}

/**
 * Product offering with resolved price for a specific currency
 */
export interface ProductOfferingWithPrice extends ProductOffering {
  /** Resolved price in the requested currency */
  resolved_price?: number;
  /** The currency the price is in */
  resolved_currency?: string;
  /** Whether the price is from currency-specific pricing or converted */
  price_source?: 'currency_specific' | 'converted';
}

/**
 * DTO for creating/updating currency-specific prices
 */
export interface UpsertOfferingPriceDto {
  currency: string;
  price: number;
  is_active?: boolean;
}

/**
 * DTO for bulk price updates
 */
export interface BulkUpsertOfferingPricesDto {
  offering_id: string;
  prices: UpsertOfferingPriceDto[];
}
