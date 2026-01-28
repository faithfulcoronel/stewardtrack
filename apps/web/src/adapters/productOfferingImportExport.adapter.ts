import 'server-only';
import 'reflect-metadata';
import { injectable } from 'inversify';

/**
 * Raw row returned from the export RPC
 */
export interface ProductOfferingExportRow {
  id: string;
  code: string;
  name: string;
  description: string | null;
  offering_type: string;
  tier: string;
  billing_cycle: string | null;
  max_members: number | null;
  max_admin_users: number | null;
  max_sms_per_month: number | null;
  max_emails_per_month: number | null;
  max_storage_mb: number | null;
  max_transactions_per_month: number | null;
  max_ai_credits_per_month: number | null;
  trial_days: number | null;
  is_active: boolean;
  is_featured: boolean;
  sort_order: number;
  metadata: Record<string, any> | null;
  feature_codes: string | null;
  bundle_codes: string | null;
  price_php: number | null;
  price_usd: number | null;
  created_at: string;
  updated_at: string;
}

/**
 * Offering data for bulk upsert
 */
export interface ProductOfferingUpsertData {
  code: string;
  name: string;
  description?: string | null;
  offering_type: string;
  tier: string;
  billing_cycle?: string | null;
  max_members?: number | null;
  max_admin_users?: number | null;
  max_sms_per_month?: number | null;
  max_emails_per_month?: number | null;
  max_storage_mb?: number | null;
  max_transactions_per_month?: number | null;
  max_ai_credits_per_month?: number | null;
  trial_days?: number | null;
  is_active: boolean;
  is_featured: boolean;
  sort_order?: number | null;
  feature_codes?: string[];
  bundle_codes?: string[];
  prices?: Record<string, number>;
  metadata?: Record<string, any>;
}

/**
 * Result from bulk upsert RPC
 */
export interface BulkUpsertResult {
  success: boolean;
  processed: number;
  created: number;
  updated: number;
  errors: Array<{ code: string; error: string }>;
  results: Array<{
    code: string;
    status: 'created' | 'updated' | 'error';
    id?: string;
    error?: string;
  }>;
}

/**
 * Existing offering with prices for preview comparison
 */
export interface ExistingOfferingWithPrices {
  id: string;
  code: string;
  name: string;
  description: string | null;
  offering_type: string;
  tier: string;
  billing_cycle: string | null;
  max_members: number | null;
  max_admin_users: number | null;
  max_sms_per_month: number | null;
  max_emails_per_month: number | null;
  max_storage_mb: number | null;
  max_transactions_per_month: number | null;
  max_ai_credits_per_month: number | null;
  trial_days: number | null;
  is_active: boolean;
  is_featured: boolean;
  sort_order: number;
  prices: Array<{
    currency: string;
    price: number;
    is_active: boolean;
  }>;
}

/**
 * Feature catalog entry
 */
export interface FeatureCatalogEntry {
  code: string;
  name: string;
  tier: string;
}

/**
 * Bundle entry
 */
export interface BundleEntry {
  code: string;
  name: string;
  bundle_type: string;
}

export interface IProductOfferingImportExportAdapter {
  /**
   * Get all product offerings formatted for export
   */
  getAllOfferingsForExport(): Promise<ProductOfferingExportRow[]>;

  /**
   * Get existing offerings by codes for preview comparison
   */
  getExistingOfferingsByCodes(codes: string[]): Promise<ExistingOfferingWithPrices[]>;

  /**
   * Execute bulk upsert via RPC
   */
  executeBulkUpsert(offerings: ProductOfferingUpsertData[], userId: string): Promise<BulkUpsertResult>;

  /**
   * Get all feature codes for reference data
   */
  getAllFeatureCodes(): Promise<FeatureCatalogEntry[]>;

  /**
   * Get all bundle codes for reference data
   */
  getAllBundleCodes(): Promise<BundleEntry[]>;
}

@injectable()
export class ProductOfferingImportExportAdapter implements IProductOfferingImportExportAdapter {
  /**
   * Gets the service role Supabase client for elevated permissions.
   * This adapter requires service role access for super admin operations.
   */
  private async getSupabaseClient() {
    const { getSupabaseServiceClient } = await import('@/lib/supabase/service');
    return await getSupabaseServiceClient();
  }

  async getAllOfferingsForExport(): Promise<ProductOfferingExportRow[]> {
    const supabase = await this.getSupabaseClient();

    const { data, error } = await supabase.rpc('get_all_product_offerings_for_export');

    if (error) {
      throw new Error(`Failed to fetch offerings for export: ${error.message}`);
    }

    return (data || []) as ProductOfferingExportRow[];
  }

  async getExistingOfferingsByCodes(codes: string[]): Promise<ExistingOfferingWithPrices[]> {
    if (codes.length === 0) {
      return [];
    }

    const supabase = await this.getSupabaseClient();

    const { data, error } = await supabase
      .from('product_offerings')
      .select(`
        id,
        code,
        name,
        description,
        offering_type,
        tier,
        billing_cycle,
        max_members,
        max_admin_users,
        max_sms_per_month,
        max_emails_per_month,
        max_storage_mb,
        max_transactions_per_month,
        max_ai_credits_per_month,
        trial_days,
        is_active,
        is_featured,
        sort_order,
        prices:product_offering_prices(currency, price, is_active)
      `)
      .in('code', codes)
      .is('deleted_at', null);

    if (error) {
      throw new Error(`Failed to fetch existing offerings: ${error.message}`);
    }

    return (data || []) as ExistingOfferingWithPrices[];
  }

  async executeBulkUpsert(offerings: ProductOfferingUpsertData[], userId: string): Promise<BulkUpsertResult> {
    const supabase = await this.getSupabaseClient();

    const { data, error } = await supabase.rpc('bulk_upsert_product_offerings', {
      p_offerings: offerings,
      p_user_id: userId,
    });

    if (error) {
      throw new Error(`Failed to execute bulk upsert: ${error.message}`);
    }

    return data as BulkUpsertResult;
  }

  async getAllFeatureCodes(): Promise<FeatureCatalogEntry[]> {
    const supabase = await this.getSupabaseClient();

    const { data, error } = await supabase
      .from('feature_catalog')
      .select('code, name, tier')
      .is('deleted_at', null)
      .order('code');

    if (error) {
      throw new Error(`Failed to fetch feature codes: ${error.message}`);
    }

    return (data || []) as FeatureCatalogEntry[];
  }

  async getAllBundleCodes(): Promise<BundleEntry[]> {
    const supabase = await this.getSupabaseClient();

    const { data, error } = await supabase
      .from('license_feature_bundles')
      .select('code, name, bundle_type')
      .order('code');

    if (error) {
      throw new Error(`Failed to fetch bundle codes: ${error.message}`);
    }

    return (data || []) as BundleEntry[];
  }
}
