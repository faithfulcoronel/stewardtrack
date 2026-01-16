import 'server-only';
import 'reflect-metadata';
import { injectable, inject } from 'inversify';
import { BaseAdapter, type IBaseAdapter, QueryOptions } from '@/adapters/base.adapter';
import { ProductOffering, ProductOfferingWithFeatures, ProductOfferingWithBundles, ProductOfferingComplete } from '@/models/productOffering.model';
import type { AuditService } from '@/services/AuditService';
import { TYPES } from '@/lib/types';

export interface IProductOfferingAdapter extends IBaseAdapter<ProductOffering> {
  getOfferingWithFeatures(offeringId: string): Promise<ProductOfferingWithFeatures | null>;
  getActiveOfferings(): Promise<ProductOffering[]>;
  getOfferingsByTier(tier: string): Promise<ProductOffering[]>;
  getPublicProductOfferings(options: {
    includeFeatures: boolean;
    includeBundles: boolean;
    tier: string | null;
    targetId?: string | null;
    targetCurrency?: string;
  }): Promise<Array<Record<string, any>>>;
  getPublicProductOffering(options: {
    id: string;
    includeFeatures: boolean;
    includeBundles: boolean;
    includeComplete: boolean;
    targetCurrency?: string;
  }): Promise<Record<string, any> | null>;
  addFeatureToOffering(offeringId: string, featureId: string, isRequired: boolean): Promise<void>;
  removeFeatureFromOffering(offeringId: string, featureId: string): Promise<void>;
  getOfferingFeatures(offeringId: string): Promise<Array<{ id: string; code: string; name: string; category: string; is_required: boolean }>>;
  getAllOfferingFeatures(offeringId: string): Promise<Array<{ id: string; code: string; name: string; category: string; source: string; source_id: string; is_required: boolean }>>;
  addBundleToOffering(offeringId: string, bundleId: string, isRequired: boolean, displayOrder?: number): Promise<void>;
  removeBundleFromOffering(offeringId: string, bundleId: string): Promise<void>;
  getOfferingBundles(offeringId: string): Promise<Array<{ id: string; code: string; name: string; bundle_type: string; category: string; is_required: boolean; display_order: number; feature_count: number }>>;
  getOfferingWithBundles(offeringId: string): Promise<ProductOfferingWithBundles | null>;
  getOfferingComplete(offeringId: string): Promise<ProductOfferingComplete | null>;
}

@injectable()
export class ProductOfferingAdapter
  extends BaseAdapter<ProductOffering>
  implements IProductOfferingAdapter
{
  constructor(@inject(TYPES.AuditService) private auditService: AuditService) {
    super();
  }

  protected tableName = 'product_offerings';

  protected defaultSelect = `
    id,
    code,
    name,
    description,
    offering_type,
    tier,
    billing_cycle,
    max_users,
    max_tenants,
    max_members,
    max_sms_per_month,
    max_emails_per_month,
    max_storage_mb,
    max_admin_users,
    is_active,
    is_featured,
    sort_order,
    metadata,
    created_by,
    updated_by,
    created_at,
    updated_at,
    deleted_at
  `;

  protected defaultRelationships: QueryOptions['relationships'] = [];

  /**
   * Override fetchById to skip tenant_id filter.
   * product_offerings is a global table without tenant_id column.
   */
  public async fetchById(id: string): Promise<ProductOffering | null> {
    const supabase = await this.getSupabaseClient();

    // Use 'any' to bypass strict typing since product_offerings is not in the typed schema
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from(this.tableName)
      .select(this.defaultSelect)
      .eq('id', id)
      .is('deleted_at', null)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No rows returned - not found
        return null;
      }
      throw new Error(`Failed to fetch product offering: ${error.message}`);
    }

    return data as ProductOffering;
  }

  /**
   * Override fetch to skip tenant_id filter.
   * product_offerings is a global table without tenant_id column.
   */
  public async fetch(options: QueryOptions = {}): Promise<{ data: ProductOffering[]; count: number | null }> {
    const supabase = await this.getSupabaseClient();

    // Build the query without tenant_id filter (global table)
    // Use 'any' to bypass strict typing since product_offerings is not in the typed schema
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let query: any = (supabase as any)
      .from(this.tableName)
      .select(options.select || this.defaultSelect, { count: 'exact' })
      .is('deleted_at', null);

    if (options.filters) {
      Object.entries(options.filters).forEach(([key, filter]) => {
        if (filter !== undefined && filter !== null) {
          if (typeof filter === 'object' && 'operator' in filter) {
            const op = filter.operator;
            const value = filter.value as string;
            const arrayValue = filter.value as string[];
            if (op === 'eq') query = query.eq(key, value);
            else if (op === 'neq') query = query.neq(key, value);
            else if (op === 'gt') query = query.gt(key, value);
            else if (op === 'gte') query = query.gte(key, value);
            else if (op === 'lt') query = query.lt(key, value);
            else if (op === 'lte') query = query.lte(key, value);
            else if (op === 'like') query = query.like(key, value);
            else if (op === 'ilike') query = query.ilike(key, value);
            else if (op === 'in') query = query.in(key, arrayValue);
          } else {
            query = query.eq(key, filter);
          }
        }
      });
    }

    if (options.order) {
      query = query.order(options.order.column, {
        ascending: options.order.ascending ?? true
      });
    }

    if (options.pagination) {
      const { page, pageSize } = options.pagination;
      const start = (page - 1) * pageSize;
      query = query.range(start, start + pageSize - 1);
    }

    const { data, error, count } = await query;

    if (error) {
      throw new Error(`Failed to fetch product offerings: ${error.message}`);
    }

    return { data: (data || []) as ProductOffering[], count };
  }

  private normalizeCount(value: unknown): number | null {
    if (value === null || value === undefined) {
      return null;
    }

    if (typeof value === 'number') {
      return value;
    }

    const parsed = Number(value);
    return Number.isNaN(parsed) ? null : parsed;
  }

  private mapPublicOfferingRow(row: unknown) {
    const base = row && typeof row === 'object' && !Array.isArray(row)
      ? (row as Record<string, any>)
      : {};

    // Parse prices from JSONB - ensure it's an array of objects with correct types
    let prices: Array<{ id: string; currency: string; price: number; is_active: boolean }> = [];
    if (Array.isArray((base as any)?.prices)) {
      prices = ((base as any).prices as any[]).map(p => ({
        id: p.id,
        currency: p.currency,
        price: typeof p.price === 'string' ? parseFloat(p.price) : (p.price ?? 0),
        is_active: p.is_active ?? true,
      }));
    }

    return {
      ...base,
      features: Array.isArray((base as any)?.features) ? (base as any).features : [],
      bundles: Array.isArray((base as any)?.bundles) ? (base as any).bundles : [],
      prices,
      resolved_price: typeof (base as any)?.resolved_price === 'string'
        ? parseFloat((base as any).resolved_price)
        : ((base as any)?.resolved_price ?? null),
      resolved_currency: (base as any)?.resolved_currency ?? null,
      feature_count: this.normalizeCount((base as any)?.feature_count),
      bundle_count: this.normalizeCount((base as any)?.bundle_count),
    };
  }

  async getPublicProductOfferings(options: {
    includeFeatures: boolean;
    includeBundles: boolean;
    tier: string | null;
    targetId?: string | null;
    targetCurrency?: string;
  }): Promise<Array<Record<string, any>>> {
    const supabase = await this.getSupabaseClient();
    const { includeFeatures, includeBundles, tier, targetId } = options;

    const { data, error } = await supabase.rpc('get_public_product_offerings', {
      include_features: includeFeatures,
      include_bundles: includeBundles,
      target_tier: tier,
      target_id: targetId ?? null,
    });

    if (error) {
      throw new Error(`Failed to load public product offerings: ${error.message}`);
    }

    const rows = Array.isArray(data) ? data : [];
    return rows.map(row => this.mapPublicOfferingRow(row));
  }

  async getPublicProductOffering(options: {
    id: string;
    includeFeatures: boolean;
    includeBundles: boolean;
    includeComplete: boolean;
    targetCurrency?: string;
  }): Promise<Record<string, any> | null> {
    const { id, includeFeatures, includeBundles, includeComplete } = options;
    const supabase = await this.getSupabaseClient();

    const { data, error } = await supabase.rpc('get_public_product_offerings', {
      include_features: includeFeatures || includeComplete,
      include_bundles: includeBundles || includeComplete,
      target_tier: null,
      target_id: id,
    });

    if (error) {
      throw new Error(`Failed to load public product offering: ${error.message}`);
    }

    const rows = Array.isArray(data) ? data : [];
    if (!rows.length) {
      return null;
    }

    return this.mapPublicOfferingRow(rows[0]);
  }

  async getOfferingWithFeatures(offeringId: string): Promise<ProductOfferingWithFeatures | null> {
    const supabase = await this.getSupabaseClient();

    const { data: offering, error: offeringError } = await supabase
      .from(this.tableName)
      .select(this.defaultSelect)
      .eq('id', offeringId)
      .is('deleted_at', null)
      .single();

    if (offeringError) {
      throw new Error(`Failed to get product offering: ${offeringError.message}`);
    }

    if (!offering || typeof offering !== 'object' || Array.isArray(offering)) {
      return null;
    }

    const features = await this.getOfferingFeatures(offeringId);

    return {
      ...(offering as ProductOffering),
      features,
    };
  }

  async getActiveOfferings(): Promise<ProductOffering[]> {
    const supabase = await this.getSupabaseClient();

    const { data, error } = await supabase
      .from(this.tableName)
      .select(this.defaultSelect)
      .eq('is_active', true)
      .is('deleted_at', null)
      .order('sort_order', { ascending: true })
      .order('name', { ascending: true });

    if (error) {
      throw new Error(`Failed to get active product offerings: ${error.message}`);
    }

    if (!data) {
      return [];
    }

    return (data as unknown as ProductOffering[]).filter(Boolean);
  }

  async getOfferingsByTier(tier: string): Promise<ProductOffering[]> {
    const supabase = await this.getSupabaseClient();

    const { data, error } = await supabase
      .from(this.tableName)
      .select(this.defaultSelect)
      .eq('tier', tier)
      .eq('is_active', true)
      .is('deleted_at', null)
      .order('sort_order', { ascending: true });

    if (error) {
      throw new Error(`Failed to get product offerings by tier: ${error.message}`);
    }

    if (!data) {
      return [];
    }

    return (data as unknown as ProductOffering[]).filter(Boolean);
  }

  async addFeatureToOffering(offeringId: string, featureId: string, isRequired: boolean = true): Promise<void> {
    const supabase = await this.getSupabaseClient();

    const { error } = await supabase
      .from('product_offering_features')
      .insert({
        offering_id: offeringId,
        feature_id: featureId,
        is_required: isRequired,
      });

    if (error) {
      throw new Error(`Failed to add feature to offering: ${error.message}`);
    }

    await this.auditService.logAuditEvent('create', 'product_offering_features', offeringId, {
      offering_id: offeringId,
      feature_id: featureId,
      is_required: isRequired,
    });
  }

  async removeFeatureFromOffering(offeringId: string, featureId: string): Promise<void> {
    const supabase = await this.getSupabaseClient();

    const { error } = await supabase
      .from('product_offering_features')
      .delete()
      .eq('offering_id', offeringId)
      .eq('feature_id', featureId);

    if (error) {
      throw new Error(`Failed to remove feature from offering: ${error.message}`);
    }

    await this.auditService.logAuditEvent('delete', 'product_offering_features', offeringId, {
      offering_id: offeringId,
      feature_id: featureId,
    });
  }

  async getOfferingFeatures(offeringId: string): Promise<Array<{ id: string; code: string; name: string; category: string; is_required: boolean }>> {
    const supabase = await this.getSupabaseClient();

    const { data, error } = await supabase
      .from('product_offering_features')
      .select(`
        feature_id,
        is_required,
        feature_catalog (
          id,
          code,
          name,
          category
        )
      `)
      .eq('offering_id', offeringId);

    if (error) {
      throw new Error(`Failed to get offering features: ${error.message}`);
    }

    return (data || []).map((item: any) => ({
      id: item.feature_catalog.id,
      code: item.feature_catalog.code,
      name: item.feature_catalog.name,
      category: item.feature_catalog.category,
      is_required: item.is_required,
    }));
  }

  async addBundleToOffering(offeringId: string, bundleId: string, isRequired: boolean = true, displayOrder?: number): Promise<void> {
    const supabase = await this.getSupabaseClient();

    // Calculate display_order if not provided
    let finalDisplayOrder = displayOrder;
    if (finalDisplayOrder === undefined) {
      const { data: maxOrderData } = await supabase
        .from('product_offering_bundles')
        .select('display_order')
        .eq('offering_id', offeringId)
        .order('display_order', { ascending: false })
        .limit(1)
        .single();

      finalDisplayOrder = maxOrderData ? (maxOrderData.display_order || 0) + 1 : 0;
    }

    const { error } = await supabase
      .from('product_offering_bundles')
      .insert({
        offering_id: offeringId,
        bundle_id: bundleId,
        is_required: isRequired,
        display_order: finalDisplayOrder,
      });

    if (error) {
      throw new Error(`Failed to add bundle to offering: ${error.message}`);
    }

    await this.auditService.logAuditEvent('create', 'product_offering_bundles', offeringId, {
      offering_id: offeringId,
      bundle_id: bundleId,
      is_required: isRequired,
      display_order: finalDisplayOrder,
    });
  }

  async removeBundleFromOffering(offeringId: string, bundleId: string): Promise<void> {
    const supabase = await this.getSupabaseClient();

    const { error } = await supabase
      .from('product_offering_bundles')
      .delete()
      .eq('offering_id', offeringId)
      .eq('bundle_id', bundleId);

    if (error) {
      throw new Error(`Failed to remove bundle from offering: ${error.message}`);
    }

    await this.auditService.logAuditEvent('delete', 'product_offering_bundles', offeringId, {
      offering_id: offeringId,
      bundle_id: bundleId,
    });
  }

  async getOfferingBundles(offeringId: string): Promise<Array<{ id: string; code: string; name: string; bundle_type: string; category: string; is_required: boolean; display_order: number; feature_count: number }>> {
    const supabase = await this.getSupabaseClient();

    const { data, error } = await supabase
      .from('product_offering_bundles')
      .select(`
        bundle_id,
        is_required,
        display_order,
        license_feature_bundles (
          id,
          code,
          name,
          bundle_type,
          category
        )
      `)
      .eq('offering_id', offeringId)
      .order('display_order', { ascending: true });

    if (error) {
      throw new Error(`Failed to get offering bundles: ${error.message}`);
    }

    // Get feature counts for each bundle
    const bundlesWithCounts = await Promise.all(
      (data || []).map(async (item: any) => {
        const bundle = item.license_feature_bundles;

        const { count } = await supabase
          .from('license_feature_bundle_items')
          .select('*', { count: 'exact', head: true })
          .eq('bundle_id', bundle.id);

        return {
          id: bundle.id,
          code: bundle.code,
          name: bundle.name,
          bundle_type: bundle.bundle_type,
          category: bundle.category,
          is_required: item.is_required,
          display_order: item.display_order,
          feature_count: count || 0,
        };
      })
    );

    return bundlesWithCounts;
  }

  async getOfferingWithBundles(offeringId: string): Promise<ProductOfferingWithBundles | null> {
    const supabase = await this.getSupabaseClient();

    const { data: offering, error: offeringError } = await supabase
      .from(this.tableName)
      .select(this.defaultSelect)
      .eq('id', offeringId)
      .is('deleted_at', null)
      .single();

    if (offeringError) {
      throw new Error(`Failed to get product offering: ${offeringError.message}`);
    }

    if (!offering || typeof offering !== 'object' || Array.isArray(offering)) {
      return null;
    }

    const bundles = await this.getOfferingBundles(offeringId);

    return {
      ...(offering as ProductOffering),
      bundles,
    };
  }

  async getAllOfferingFeatures(offeringId: string): Promise<Array<{ id: string; code: string; name: string; category: string; source: string; source_id: string; is_required: boolean }>> {
    const supabase = await this.getSupabaseClient();

    const { data, error } = await supabase.rpc('get_offering_all_features', {
      p_offering_id: offeringId,
    });

    if (error) {
      throw new Error(`Failed to get all offering features: ${error.message}`);
    }

    return (data || []).map((item: any) => ({
      id: item.feature_id,
      code: item.feature_code,
      name: item.feature_name,
      category: item.feature_category,
      source: item.source,
      source_id: item.source_id,
      is_required: item.is_required,
    }));
  }

  async getOfferingComplete(offeringId: string): Promise<ProductOfferingComplete | null> {
    const supabase = await this.getSupabaseClient();

    const { data: offering, error: offeringError } = await supabase
      .from(this.tableName)
      .select(this.defaultSelect)
      .eq('id', offeringId)
      .is('deleted_at', null)
      .single();

    if (offeringError) {
      throw new Error(`Failed to get product offering: ${offeringError.message}`);
    }

    if (!offering || typeof offering !== 'object' || Array.isArray(offering)) {
      return null;
    }

    const [bundles, directFeatures, allFeatures] = await Promise.all([
      this.getOfferingBundles(offeringId),
      this.getOfferingFeatures(offeringId),
      this.getAllOfferingFeatures(offeringId),
    ]);

    return {
      ...(offering as ProductOffering),
      bundles,
      features: directFeatures,
      bundle_count: bundles.length,
      feature_count: allFeatures.length,
    };
  }

  protected override async onAfterCreate(data: ProductOffering): Promise<void> {
    await this.auditService.logAuditEvent('create', this.tableName, data.id, data);
  }

  protected override async onAfterUpdate(data: ProductOffering): Promise<void> {
    await this.auditService.logAuditEvent('update', this.tableName, data.id, data);
  }

  protected override async onAfterDelete(id: string): Promise<void> {
    await this.auditService.logAuditEvent('delete', this.tableName, id, { id });
  }
}
