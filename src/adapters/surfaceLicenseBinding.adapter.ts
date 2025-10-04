import 'server-only';
import 'reflect-metadata';
import { injectable, inject } from 'inversify';
import { BaseAdapter, type IBaseAdapter, QueryOptions } from '@/adapters/base.adapter';
import { EffectiveSurfaceAccess, SurfaceAccessResult } from '@/models/surfaceLicenseBinding.model';
import type { AuditService } from '@/services/AuditService';
import { TYPES } from '@/lib/types';

export interface ISurfaceLicenseBindingAdapter extends IBaseAdapter<EffectiveSurfaceAccess> {
  getEffectiveSurfaceAccess(tenantId: string): Promise<EffectiveSurfaceAccess[]>;
  checkSurfaceAccess(userId: string, tenantId: string, surfaceId: string): Promise<SurfaceAccessResult>;
  updateSurfaceLicenseRequirement(surfaceId: string, bundleId: string | null, features: string[], tierMin: string | null): Promise<void>;
  updateRbacBindingLicenseRequirement(tenantId: string, roleId: string, surfaceId: string, bundleId: string | null, enforces: boolean): Promise<void>;
  getSurfacesByLicenseBundle(bundleId: string): Promise<Array<{ surface_id: string; surface_title: string; surface_route: string }>>;
  getTenantLicensedSurfaces(tenantId: string): Promise<string[]>;
}

@injectable()
export class SurfaceLicenseBindingAdapter
  extends BaseAdapter<EffectiveSurfaceAccess>
  implements ISurfaceLicenseBindingAdapter
{
  constructor(@inject(TYPES.AuditService) private auditService: AuditService) {
    super();
  }

  protected tableName = 'v_effective_surface_access';

  protected defaultSelect = `
    tenant_id,
    role_id,
    bundle_id,
    menu_item_id,
    metadata_blueprint_id,
    surface_id,
    surface_title,
    surface_route,
    surface_feature_code,
    required_license_bundle_id,
    enforces_license,
    surface_required_bundle_id,
    surface_required_features,
    license_tier_min,
    has_required_features,
    has_required_bundle
  `;

  protected defaultRelationships: QueryOptions['relationships'] = [];

  async getEffectiveSurfaceAccess(tenantId: string): Promise<EffectiveSurfaceAccess[]> {
    const supabase = await this.getSupabaseClient();

    const { data, error } = await supabase
      .from(this.tableName)
      .select(this.defaultSelect)
      .eq('tenant_id', tenantId);

    if (error) {
      throw new Error(`Failed to get effective surface access: ${error.message}`);
    }

    return data || [];
  }

  async checkSurfaceAccess(userId: string, tenantId: string, surfaceId: string): Promise<SurfaceAccessResult> {
    const supabase = await this.getSupabaseClient();

    // Call the database function to check access
    const { data, error } = await supabase.rpc('can_access_surface', {
      p_user_id: userId,
      p_tenant_id: tenantId,
      p_surface_id: surfaceId,
    });

    if (error) {
      throw new Error(`Failed to check surface access: ${error.message}`);
    }

    const canAccess = data as boolean;

    // Get detailed access information
    const { data: accessDetails, error: detailsError } = await supabase
      .from(this.tableName)
      .select(this.defaultSelect)
      .eq('tenant_id', tenantId)
      .eq('surface_id', surfaceId)
      .limit(1)
      .single();

    if (detailsError && detailsError.code !== 'PGRST116') {
      throw new Error(`Failed to get access details: ${detailsError.message}`);
    }

    const hasRbacAccess = canAccess || false;
    const hasLicenseAccess = accessDetails?.has_required_features && accessDetails?.has_required_bundle;
    const missingFeatures = accessDetails?.surface_required_features?.filter((feature: string) => {
      return !accessDetails?.has_required_features;
    }) || [];

    return {
      can_access: canAccess,
      has_rbac_access: hasRbacAccess,
      has_license_access: hasLicenseAccess || false,
      missing_features: missingFeatures.length > 0 ? missingFeatures : undefined,
      missing_bundles: accessDetails && !accessDetails.has_required_bundle && accessDetails.surface_required_bundle_id
        ? [accessDetails.surface_required_bundle_id]
        : undefined,
      required_tier: accessDetails?.license_tier_min || undefined,
    };
  }

  async updateSurfaceLicenseRequirement(
    surfaceId: string,
    bundleId: string | null,
    features: string[] = [],
    tierMin: string | null = null
  ): Promise<void> {
    const supabase = await this.getSupabaseClient();

    const { error } = await supabase
      .from('metadata_surfaces')
      .update({
        required_license_bundle_id: bundleId,
        required_features: features,
        license_tier_min: tierMin,
        updated_at: new Date().toISOString(),
      })
      .eq('id', surfaceId);

    if (error) {
      throw new Error(`Failed to update surface license requirement: ${error.message}`);
    }

    await this.auditService.logAuditEvent('update', 'metadata_surfaces', surfaceId, {
      surface_id: surfaceId,
      required_license_bundle_id: bundleId,
      required_features: features,
      license_tier_min: tierMin,
    });
  }

  async updateRbacBindingLicenseRequirement(
    tenantId: string,
    roleId: string,
    surfaceId: string,
    bundleId: string | null,
    enforces: boolean
  ): Promise<void> {
    const supabase = await this.getSupabaseClient();

    const { error } = await supabase
      .from('rbac_surface_bindings')
      .update({
        required_license_bundle_id: bundleId,
        enforces_license: enforces,
        updated_at: new Date().toISOString(),
      })
      .eq('tenant_id', tenantId)
      .eq('role_id', roleId)
      .eq('metadata_blueprint_id', surfaceId);

    if (error) {
      throw new Error(`Failed to update RBAC binding license requirement: ${error.message}`);
    }

    await this.auditService.logAuditEvent('update', 'rbac_surface_bindings', surfaceId, {
      tenant_id: tenantId,
      role_id: roleId,
      surface_id: surfaceId,
      required_license_bundle_id: bundleId,
      enforces_license: enforces,
    });
  }

  async getSurfacesByLicenseBundle(bundleId: string): Promise<Array<{ surface_id: string; surface_title: string; surface_route: string }>> {
    const supabase = await this.getSupabaseClient();

    const { data, error } = await supabase
      .from('metadata_surfaces')
      .select('id, title, route')
      .eq('required_license_bundle_id', bundleId);

    if (error) {
      throw new Error(`Failed to get surfaces by license bundle: ${error.message}`);
    }

    return (data || []).map((item: any) => ({
      surface_id: item.id,
      surface_title: item.title,
      surface_route: item.route,
    }));
  }

  async getTenantLicensedSurfaces(tenantId: string): Promise<string[]> {
    const supabase = await this.getSupabaseClient();

    const { data, error } = await supabase
      .from(this.tableName)
      .select('surface_id')
      .eq('tenant_id', tenantId)
      .eq('has_required_features', true)
      .eq('has_required_bundle', true);

    if (error) {
      throw new Error(`Failed to get tenant licensed surfaces: ${error.message}`);
    }

    return Array.from(new Set((data || []).map((item: any) => item.surface_id).filter(Boolean)));
  }

  protected override async onAfterCreate(data: EffectiveSurfaceAccess): Promise<void> {
    // This is a view, so no create/update/delete operations
  }

  protected override async onAfterUpdate(data: EffectiveSurfaceAccess): Promise<void> {
    // This is a view, so no create/update/delete operations
  }

  protected override async onAfterDelete(id: string): Promise<void> {
    // This is a view, so no create/update/delete operations
  }
}
