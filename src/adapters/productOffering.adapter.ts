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
    base_price,
    currency,
    max_users,
    max_tenants,
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

    if (!offering) {
      return null;
    }

    const normalizedOffering = toProductOffering(offering);
    const features = await this.getOfferingFeatures(offeringId);

    return {
      ...normalizedOffering,
      features,
      feature_count: features.length,
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

    return mapProductOfferings(data);
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

    return mapProductOfferings(data);
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

    if (!offering) {
      return null;
    }

    const normalizedOffering = toProductOffering(offering);
    const bundles = await this.getOfferingBundles(offeringId);

    return {
      ...normalizedOffering,
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

    if (!offering) {
      return null;
    }

    const normalizedOffering = toProductOffering(offering);

    const [bundles, directFeatures, allFeatures] = await Promise.all([
      this.getOfferingBundles(offeringId),
      this.getOfferingFeatures(offeringId),
      this.getAllOfferingFeatures(offeringId),
    ]);

    return {
      ...normalizedOffering,
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

function mapProductOfferings(data: unknown[] | null): ProductOffering[] {
  if (!data?.length) {
    return [];
  }

  return data.map(toProductOffering);
}

function toProductOffering(value: unknown): ProductOffering {
  if (!isProductOffering(value)) {
    throw new Error('Invalid product offering data received');
  }

  return {
    ...value,
    description: value.description ?? null,
    billing_cycle: value.billing_cycle ?? null,
    base_price: value.base_price ?? null,
    max_users: value.max_users ?? null,
    metadata: value.metadata ?? undefined,
    deleted_at: value.deleted_at ?? null,
  };
}

function isProductOffering(value: unknown): value is ProductOffering {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const record = value as Partial<ProductOffering>;

  return (
    typeof record.id === 'string' &&
    typeof record.code === 'string' &&
    typeof record.name === 'string' &&
    typeof record.offering_type === 'string' &&
    typeof record.tier === 'string' &&
    typeof record.is_active === 'boolean' &&
    typeof record.is_featured === 'boolean' &&
    typeof record.sort_order === 'number'
  );
}
