import 'server-only';
import 'reflect-metadata';
import { injectable, inject } from 'inversify';
import { BaseAdapter, type IBaseAdapter, QueryOptions } from '@/adapters/base.adapter';
import { LicenseFeatureBundle, LicenseFeatureBundleWithFeatures } from '@/models/licenseFeatureBundle.model';
import type { AuditService } from '@/services/AuditService';
import { TYPES } from '@/lib/types';

export interface ILicenseFeatureBundleAdapter extends IBaseAdapter<LicenseFeatureBundle> {
  getBundleWithFeatures(bundleId: string): Promise<LicenseFeatureBundleWithFeatures | null>;
  getActiveBundles(): Promise<LicenseFeatureBundle[]>;
  getBundlesByCategory(category: string): Promise<LicenseFeatureBundle[]>;
  getBundlesByType(bundleType: string): Promise<LicenseFeatureBundle[]>;
  addFeatureToBundle(bundleId: string, featureId: string, isRequired: boolean, displayOrder?: number): Promise<void>;
  removeFeatureFromBundle(bundleId: string, featureId: string): Promise<void>;
  getBundleFeatures(bundleId: string): Promise<Array<{ id: string; code: string; name: string; category: string; is_required: boolean; display_order: number }>>;
  updateFeatureOrder(bundleId: string, featureId: string, displayOrder: number): Promise<void>;
}

@injectable()
export class LicenseFeatureBundleAdapter
  extends BaseAdapter<LicenseFeatureBundle>
  implements ILicenseFeatureBundleAdapter
{
  constructor(@inject(TYPES.AuditService) private auditService: AuditService) {
    super();
  }

  protected tableName = 'license_feature_bundles';

  protected defaultSelect = `
    id,
    code,
    name,
    description,
    bundle_type,
    category,
    is_active,
    is_system,
    sort_order,
    metadata,
    created_by,
    updated_by,
    created_at,
    updated_at,
    deleted_at
  `;

  protected defaultRelationships: QueryOptions['relationships'] = [];

  async getBundleWithFeatures(bundleId: string): Promise<LicenseFeatureBundleWithFeatures | null> {
    const supabase = await this.getSupabaseClient();

    const { data: bundle, error: bundleError } = await supabase
      .from(this.tableName)
      .select(this.defaultSelect)
      .eq('id', bundleId)
      .is('deleted_at', null)
      .single();

    if (bundleError) {
      throw new Error(`Failed to get license feature bundle: ${bundleError.message}`);
    }

    if (!bundle) {
      return null;
    }

    const features = await this.getBundleFeatures(bundleId);

    return {
      ...bundle,
      features,
      feature_count: features.length,
    };
  }

  async getActiveBundles(): Promise<LicenseFeatureBundle[]> {
    const supabase = await this.getSupabaseClient();

    const { data, error } = await supabase
      .from(this.tableName)
      .select(this.defaultSelect)
      .eq('is_active', true)
      .is('deleted_at', null)
      .order('sort_order', { ascending: true })
      .order('name', { ascending: true });

    if (error) {
      throw new Error(`Failed to get active license feature bundles: ${error.message}`);
    }

    return data || [];
  }

  async getBundlesByCategory(category: string): Promise<LicenseFeatureBundle[]> {
    const supabase = await this.getSupabaseClient();

    const { data, error } = await supabase
      .from(this.tableName)
      .select(this.defaultSelect)
      .eq('category', category)
      .eq('is_active', true)
      .is('deleted_at', null)
      .order('sort_order', { ascending: true });

    if (error) {
      throw new Error(`Failed to get license feature bundles by category: ${error.message}`);
    }

    return data || [];
  }

  async getBundlesByType(bundleType: string): Promise<LicenseFeatureBundle[]> {
    const supabase = await this.getSupabaseClient();

    const { data, error } = await supabase
      .from(this.tableName)
      .select(this.defaultSelect)
      .eq('bundle_type', bundleType)
      .eq('is_active', true)
      .is('deleted_at', null)
      .order('sort_order', { ascending: true });

    if (error) {
      throw new Error(`Failed to get license feature bundles by type: ${error.message}`);
    }

    return data || [];
  }

  async addFeatureToBundle(bundleId: string, featureId: string, isRequired: boolean = true, displayOrder?: number): Promise<void> {
    const supabase = await this.getSupabaseClient();

    // Get the next display order if not provided
    let order = displayOrder;
    if (order === undefined) {
      const { data: existingItems } = await supabase
        .from('license_feature_bundle_items')
        .select('display_order')
        .eq('bundle_id', bundleId)
        .order('display_order', { ascending: false })
        .limit(1);

      order = existingItems && existingItems.length > 0 ? existingItems[0].display_order + 1 : 0;
    }

    const { error } = await supabase
      .from('license_feature_bundle_items')
      .insert({
        bundle_id: bundleId,
        feature_id: featureId,
        is_required: isRequired,
        display_order: order,
      });

    if (error) {
      throw new Error(`Failed to add feature to bundle: ${error.message}`);
    }

    await this.auditService.logAuditEvent('create', 'license_feature_bundle_items', bundleId, {
      bundle_id: bundleId,
      feature_id: featureId,
      is_required: isRequired,
      display_order: order,
    });
  }

  async removeFeatureFromBundle(bundleId: string, featureId: string): Promise<void> {
    const supabase = await this.getSupabaseClient();

    const { error } = await supabase
      .from('license_feature_bundle_items')
      .delete()
      .eq('bundle_id', bundleId)
      .eq('feature_id', featureId);

    if (error) {
      throw new Error(`Failed to remove feature from bundle: ${error.message}`);
    }

    await this.auditService.logAuditEvent('delete', 'license_feature_bundle_items', bundleId, {
      bundle_id: bundleId,
      feature_id: featureId,
    });
  }

  async getBundleFeatures(bundleId: string): Promise<Array<{ id: string; code: string; name: string; category: string; is_required: boolean; display_order: number }>> {
    const supabase = await this.getSupabaseClient();

    const { data, error } = await supabase
      .from('license_feature_bundle_items')
      .select(`
        feature_id,
        is_required,
        display_order,
        feature_catalog (
          id,
          code,
          name,
          category
        )
      `)
      .eq('bundle_id', bundleId)
      .order('display_order', { ascending: true });

    if (error) {
      throw new Error(`Failed to get bundle features: ${error.message}`);
    }

    return (data || []).map((item: any) => ({
      id: item.feature_catalog.id,
      code: item.feature_catalog.code,
      name: item.feature_catalog.name,
      category: item.feature_catalog.category,
      is_required: item.is_required,
      display_order: item.display_order,
    }));
  }

  async updateFeatureOrder(bundleId: string, featureId: string, displayOrder: number): Promise<void> {
    const supabase = await this.getSupabaseClient();

    const { error } = await supabase
      .from('license_feature_bundle_items')
      .update({ display_order: displayOrder })
      .eq('bundle_id', bundleId)
      .eq('feature_id', featureId);

    if (error) {
      throw new Error(`Failed to update feature order: ${error.message}`);
    }

    await this.auditService.logAuditEvent('update', 'license_feature_bundle_items', bundleId, {
      bundle_id: bundleId,
      feature_id: featureId,
      display_order: displayOrder,
    });
  }

  protected override async onAfterCreate(data: LicenseFeatureBundle): Promise<void> {
    await this.auditService.logAuditEvent('create', this.tableName, data.id, data);
  }

  protected override async onAfterUpdate(data: LicenseFeatureBundle): Promise<void> {
    await this.auditService.logAuditEvent('update', this.tableName, data.id, data);
  }

  protected override async onAfterDelete(id: string): Promise<void> {
    await this.auditService.logAuditEvent('delete', this.tableName, id, { id });
  }
}
