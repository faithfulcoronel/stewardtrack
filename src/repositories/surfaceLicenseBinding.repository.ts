import { injectable, inject } from 'inversify';
import { BaseRepository } from '@/repositories/base.repository';
import type { ISurfaceLicenseBindingAdapter } from '@/adapters/surfaceLicenseBinding.adapter';
import type {
  EffectiveSurfaceAccess,
  SurfaceAccessResult,
  UpdateSurfaceLicenseBindingDto,
  UpdateRbacSurfaceLicenseBindingDto,
} from '@/models/surfaceLicenseBinding.model';
import { TYPES } from '@/lib/types';

export interface ISurfaceLicenseBindingRepository extends BaseRepository<EffectiveSurfaceAccess> {
  getEffectiveSurfaceAccess(tenantId: string): Promise<EffectiveSurfaceAccess[]>;
  checkSurfaceAccess(userId: string, tenantId: string, surfaceId: string): Promise<SurfaceAccessResult>;
  updateSurfaceLicenseRequirement(surfaceId: string, data: UpdateSurfaceLicenseBindingDto): Promise<void>;
  updateRbacBindingLicenseRequirement(
    tenantId: string,
    roleId: string,
    surfaceId: string,
    data: UpdateRbacSurfaceLicenseBindingDto
  ): Promise<void>;
  getSurfacesByLicenseBundle(bundleId: string): Promise<Array<{ surface_id: string; surface_title: string; surface_route: string }>>;
  getTenantLicensedSurfaces(tenantId: string): Promise<string[]>;
}

@injectable()
export class SurfaceLicenseBindingRepository
  extends BaseRepository<EffectiveSurfaceAccess>
  implements ISurfaceLicenseBindingRepository
{
  constructor(
    @inject(TYPES.ISurfaceLicenseBindingAdapter)
    private readonly surfaceLicenseBindingAdapter: ISurfaceLicenseBindingAdapter
  ) {
    super(surfaceLicenseBindingAdapter);
  }

  async getEffectiveSurfaceAccess(tenantId: string): Promise<EffectiveSurfaceAccess[]> {
    return await this.surfaceLicenseBindingAdapter.getEffectiveSurfaceAccess(tenantId);
  }

  async checkSurfaceAccess(userId: string, tenantId: string, surfaceId: string): Promise<SurfaceAccessResult> {
    return await this.surfaceLicenseBindingAdapter.checkSurfaceAccess(userId, tenantId, surfaceId);
  }

  async updateSurfaceLicenseRequirement(surfaceId: string, data: UpdateSurfaceLicenseBindingDto): Promise<void> {
    await this.surfaceLicenseBindingAdapter.updateSurfaceLicenseRequirement(
      surfaceId,
      data.required_license_bundle_id ?? null,
      data.required_features ?? [],
      data.license_tier_min ?? null
    );
  }

  async updateRbacBindingLicenseRequirement(
    tenantId: string,
    roleId: string,
    surfaceId: string,
    data: UpdateRbacSurfaceLicenseBindingDto
  ): Promise<void> {
    await this.surfaceLicenseBindingAdapter.updateRbacBindingLicenseRequirement(
      tenantId,
      roleId,
      surfaceId,
      data.required_license_bundle_id ?? null,
      data.enforces_license ?? false
    );
  }

  async getSurfacesByLicenseBundle(bundleId: string): Promise<Array<{ surface_id: string; surface_title: string; surface_route: string }>> {
    return await this.surfaceLicenseBindingAdapter.getSurfacesByLicenseBundle(bundleId);
  }

  async getTenantLicensedSurfaces(tenantId: string): Promise<string[]> {
    return await this.surfaceLicenseBindingAdapter.getTenantLicensedSurfaces(tenantId);
  }
}
