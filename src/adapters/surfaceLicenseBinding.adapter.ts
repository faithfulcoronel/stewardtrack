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

    return mapEffectiveSurfaceAccess(data);
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

    const normalizedDetails = accessDetails ? toEffectiveSurfaceAccess(accessDetails) : null;

    const missingFeatures =
      normalizedDetails && !normalizedDetails.has_required_features
        ? normalizedDetails.surface_required_features
        : undefined;

    return {
      can_access: canAccess,
      has_rbac_access: Boolean(canAccess),
      has_license_access:
        (normalizedDetails?.has_required_features ?? false) && (normalizedDetails?.has_required_bundle ?? false),
      missing_features: missingFeatures && missingFeatures.length > 0 ? missingFeatures : undefined,
      missing_bundles:
        normalizedDetails && !normalizedDetails.has_required_bundle && normalizedDetails.surface_required_bundle_id
          ? [normalizedDetails.surface_required_bundle_id]
          : undefined,
      required_tier: normalizedDetails?.license_tier_min ?? undefined,
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
      .select('tenant_id, surface_id, has_required_features, has_required_bundle')
      .eq('tenant_id', tenantId)
      .eq('has_required_features', true)
      .eq('has_required_bundle', true);

    if (error) {
      throw new Error(`Failed to get tenant licensed surfaces: ${error.message}`);
    }

    const records = mapEffectiveSurfaceAccess(data);
    const surfaceIds = records
      .filter(record => record.has_required_features && record.has_required_bundle)
      .map(record => record.surface_id)
      .filter((value): value is string => typeof value === 'string' && value.length > 0);

    return Array.from(new Set(surfaceIds));
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

function mapEffectiveSurfaceAccess(data: unknown[] | null): EffectiveSurfaceAccess[] {
  if (!data?.length) {
    return [];
  }

  return data.map(toEffectiveSurfaceAccess);
}

function toEffectiveSurfaceAccess(value: unknown): EffectiveSurfaceAccess {
  if (!value || typeof value !== 'object') {
    throw new Error('Invalid effective surface access record received');
  }

  const record = value as Record<string, unknown>;
  const tenantId = typeof record.tenant_id === 'string' ? record.tenant_id : undefined;

  if (!tenantId) {
    throw new Error('Effective surface access records must include a tenant identifier');
  }

  const surfaceId = typeof record.surface_id === 'string' ? record.surface_id : null;
  const roleId = typeof record.role_id === 'string' ? record.role_id : null;
  const bundleId = typeof record.bundle_id === 'string' ? record.bundle_id : null;

  const surfaceRequiredFeatures = Array.isArray(record.surface_required_features)
    ? record.surface_required_features.filter((feature): feature is string => typeof feature === 'string')
    : undefined;

  const idComponents = [tenantId, roleId ?? 'role', surfaceId ?? 'surface', bundleId ?? 'bundle'];

  return {
    id: idComponents.join(':'),
    tenant_id: tenantId,
    role_id: roleId,
    bundle_id: bundleId,
    menu_item_id: typeof record.menu_item_id === 'string' ? record.menu_item_id : null,
    metadata_blueprint_id: typeof record.metadata_blueprint_id === 'string' ? record.metadata_blueprint_id : null,
    surface_id: surfaceId,
    surface_title: typeof record.surface_title === 'string' ? record.surface_title : null,
    surface_route: typeof record.surface_route === 'string' ? record.surface_route : null,
    surface_feature_code: typeof record.surface_feature_code === 'string' ? record.surface_feature_code : null,
    required_license_bundle_id:
      typeof record.required_license_bundle_id === 'string' ? record.required_license_bundle_id : null,
    enforces_license: Boolean(record.enforces_license),
    surface_required_bundle_id:
      typeof record.surface_required_bundle_id === 'string' ? record.surface_required_bundle_id : null,
    surface_required_features: surfaceRequiredFeatures,
    license_tier_min: typeof record.license_tier_min === 'string' ? record.license_tier_min : null,
    has_required_features: Boolean(record.has_required_features),
    has_required_bundle: Boolean(record.has_required_bundle),
  };
}
