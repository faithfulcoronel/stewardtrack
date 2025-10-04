import { Container } from 'inversify';
import { TYPES } from './types';

// Services
import { RbacService } from '@/services/rbac.service';
import { RbacRegistryService } from '@/services/RbacRegistryService';
import { RbacCoreService } from '@/services/RbacCoreService';
import { RbacMetadataService } from '@/services/rbacMetadata.service';
import { RbacFeatureService } from '@/services/rbacFeature.service';
import { RbacDelegationService } from '@/services/RbacDelegationService';
import { RbacAuditService } from '@/services/RbacAuditService';
import { RbacPublishingService } from '@/services/RbacPublishingService';
import { RbacStatisticsService } from '@/services/RbacStatisticsService';
import { UserMemberLinkService } from '@/services/UserMemberLinkService';
import { SupabaseAuditService, type AuditService } from '@/services/AuditService';
import { LicenseFeatureService } from '@/services/LicenseFeatureService';
import { LicensingService } from '@/services/LicensingService';
import { UserRoleService } from '@/services/UserRoleService';
import { SidebarService } from '@/services/SidebarService';

// Repositories
import { RbacRepository } from '@/repositories/rbac.repository';
import { RoleRepository } from '@/repositories/role.repository';
import { PermissionRepository } from '@/repositories/permission.repository';
import { PermissionBundleRepository } from '@/repositories/permissionBundle.repository';
import { UserRoleManagementRepository } from '@/repositories/userRole.repository';
import { MetadataSurfaceRepository } from '@/repositories/metadataSurface.repository';
import { SurfaceBindingRepository } from '@/repositories/surfaceBinding.repository';
import { FeatureCatalogRepository } from '@/repositories/featureCatalog.repository';
import { TenantFeatureGrantRepository } from '@/repositories/tenantFeatureGrant.repository';
import { DelegationRepository } from '@/repositories/delegation.repository';
import { RbacAuditRepository } from '@/repositories/rbacAudit.repository';
import { PublishingRepository } from '@/repositories/publishing.repository';
import { UserMemberLinkRepository } from '@/repositories/userMemberLink.repository';
import { MemberInvitationRepository } from '@/repositories/memberInvitation.repository';
import { LicenseRepository } from '@/repositories/license.repository';
import { LicenseFeatureRepository } from '@/repositories/licenseFeature.repository';
import { LicensePlanRepository } from '@/repositories/licensePlan.repository';
import { ProductOfferingRepository } from '@/repositories/productOffering.repository';
import { LicenseFeatureBundleRepository } from '@/repositories/licenseFeatureBundle.repository';
import { SurfaceLicenseBindingRepository } from '@/repositories/surfaceLicenseBinding.repository';

// Repository Interfaces
import type { IRoleRepository } from '@/repositories/role.repository';
import type { IPermissionRepository } from '@/repositories/permission.repository';
import type { IPermissionBundleRepository } from '@/repositories/permissionBundle.repository';
import type { IUserRoleManagementRepository } from '@/repositories/userRole.repository';
import type { IMetadataSurfaceRepository } from '@/repositories/metadataSurface.repository';
import type { ISurfaceBindingRepository } from '@/repositories/surfaceBinding.repository';
import type { IFeatureCatalogRepository } from '@/repositories/featureCatalog.repository';
import type { ITenantFeatureGrantRepository } from '@/repositories/tenantFeatureGrant.repository';
import type { IDelegationRepository } from '@/repositories/delegation.repository';
import type { IRbacAuditRepository } from '@/repositories/rbacAudit.repository';
import type { IPublishingRepository } from '@/repositories/publishing.repository';
import type { ILicenseRepository } from '@/repositories/license.repository';
import type { ILicenseFeatureRepository } from '@/repositories/licenseFeature.repository';
import type { ILicensePlanRepository } from '@/repositories/licensePlan.repository';
import type { IProductOfferingRepository } from '@/repositories/productOffering.repository';
import type { ILicenseFeatureBundleRepository } from '@/repositories/licenseFeatureBundle.repository';
import type { ISurfaceLicenseBindingRepository } from '@/repositories/surfaceLicenseBinding.repository';

// Adapters
import { RoleAdapter } from '@/adapters/role.adapter';
import { PermissionAdapter } from '@/adapters/permission.adapter';
import { UserRoleManagementAdapter } from '@/adapters/userRoleManagement.adapter';
import { PermissionBundleAdapter } from '@/adapters/permissionBundle.adapter';
import { MetadataSurfaceAdapter } from '@/adapters/metadataSurface.adapter';
import { SurfaceBindingAdapter } from '@/adapters/surfaceBinding.adapter';
import { FeatureCatalogAdapter } from '@/adapters/featureCatalog.adapter';
import { TenantFeatureGrantAdapter } from '@/adapters/tenantFeatureGrant.adapter';
import { DelegationAdapter } from '@/adapters/delegation.adapter';
import { RbacAuditAdapter } from '@/adapters/rbacAudit.adapter';
import { PublishingAdapter } from '@/adapters/publishing.adapter';
import { LicenseAdapter } from '@/adapters/license.adapter';
import { LicenseFeatureAdapter } from '@/adapters/licenseFeature.adapter';
import { LicensePlanAdapter } from '@/adapters/licensePlan.adapter';
import { ProductOfferingAdapter } from '@/adapters/productOffering.adapter';
import { LicenseFeatureBundleAdapter } from '@/adapters/licenseFeatureBundle.adapter';
import { SurfaceLicenseBindingAdapter } from '@/adapters/surfaceLicenseBinding.adapter';

// Adapter Interfaces
import type { IRoleAdapter } from '@/adapters/role.adapter';
import type { IPermissionAdapter } from '@/adapters/permission.adapter';
import type { IUserRoleManagementAdapter } from '@/adapters/userRoleManagement.adapter';
import type { IPermissionBundleAdapter } from '@/adapters/permissionBundle.adapter';
import type { IMetadataSurfaceAdapter } from '@/adapters/metadataSurface.adapter';
import type { ISurfaceBindingAdapter } from '@/adapters/surfaceBinding.adapter';
import type { IFeatureCatalogAdapter } from '@/adapters/featureCatalog.adapter';
import type { ITenantFeatureGrantAdapter } from '@/adapters/tenantFeatureGrant.adapter';
import type { IDelegationAdapter } from '@/adapters/delegation.adapter';
import type { IRbacAuditAdapter } from '@/adapters/rbacAudit.adapter';
import type { IPublishingAdapter } from '@/adapters/publishing.adapter';
import type { ILicenseAdapter } from '@/adapters/license.adapter';
import type { ILicenseFeatureAdapter } from '@/adapters/licenseFeature.adapter';
import type { ILicensePlanAdapter } from '@/adapters/licensePlan.adapter';
import type { IProductOfferingAdapter } from '@/adapters/productOffering.adapter';
import type { ILicenseFeatureBundleAdapter } from '@/adapters/licenseFeatureBundle.adapter';
import type { ISurfaceLicenseBindingAdapter } from '@/adapters/surfaceLicenseBinding.adapter';

const container = new Container();

// ==================== CORE SERVICES ====================
container.bind<AuditService>(TYPES.AuditService).to(SupabaseAuditService).inRequestScope();

// ==================== RBAC SERVICES ====================
container.bind<RbacService>(TYPES.RbacService).to(RbacService).inRequestScope();
container.bind<RbacRegistryService>(TYPES.RbacRegistryService).to(RbacRegistryService).inRequestScope();

// RBAC Specialized Services
container.bind<RbacCoreService>(TYPES.RbacCoreService).to(RbacCoreService).inRequestScope();
container.bind<RbacMetadataService>(TYPES.RbacMetadataService).to(RbacMetadataService).inRequestScope();
container.bind<RbacFeatureService>(TYPES.RbacFeatureService).to(RbacFeatureService).inRequestScope();
container.bind<RbacDelegationService>(TYPES.RbacDelegationService).to(RbacDelegationService).inRequestScope();
container.bind<RbacAuditService>(TYPES.RbacAuditService).to(RbacAuditService).inRequestScope();
container.bind<RbacPublishingService>(TYPES.RbacPublishingService).to(RbacPublishingService).inRequestScope();
container.bind<RbacStatisticsService>(TYPES.RbacStatisticsService).to(RbacStatisticsService).inRequestScope();

// ==================== LICENSE SERVICES ====================
container
  .bind<LicenseFeatureService>(TYPES.LicenseFeatureService)
  .to(LicenseFeatureService)
  .inRequestScope();

container
  .bind<LicensingService>(TYPES.LicensingService)
  .to(LicensingService)
  .inRequestScope();

// ==================== USER ROLE SERVICE ====================
container
  .bind<UserRoleService>(TYPES.UserRoleService)
  .to(UserRoleService)
  .inRequestScope();

// ==================== SIDEBAR SERVICE ====================
container
  .bind<SidebarService>(TYPES.SidebarService)
  .to(SidebarService)
  .inRequestScope();

// ==================== RBAC REPOSITORIES ====================
// Legacy RBAC Repository (will be phased out)
container.bind<RbacRepository>(TYPES.RbacRepository).to(RbacRepository).inRequestScope();

// Specialized RBAC Repositories
container.bind<IRoleRepository>(TYPES.IRoleRepository).to(RoleRepository).inRequestScope();
container.bind<IPermissionRepository>(TYPES.IPermissionRepository).to(PermissionRepository).inRequestScope();
container.bind<IPermissionBundleRepository>(TYPES.IPermissionBundleRepository).to(PermissionBundleRepository).inRequestScope();
container.bind<IUserRoleManagementRepository>(TYPES.IUserRoleManagementRepository).to(UserRoleManagementRepository).inRequestScope();
container.bind<IMetadataSurfaceRepository>(TYPES.IMetadataSurfaceRepository).to(MetadataSurfaceRepository).inRequestScope();
container.bind<ISurfaceBindingRepository>(TYPES.ISurfaceBindingRepository).to(SurfaceBindingRepository).inRequestScope();
container.bind<IFeatureCatalogRepository>(TYPES.IFeatureCatalogRepository).to(FeatureCatalogRepository).inRequestScope();
container.bind<ITenantFeatureGrantRepository>(TYPES.ITenantFeatureGrantRepository).to(TenantFeatureGrantRepository).inRequestScope();
container.bind<IDelegationRepository>(TYPES.IDelegationRepository).to(DelegationRepository).inRequestScope();
container.bind<IRbacAuditRepository>(TYPES.IRbacAuditRepository).to(RbacAuditRepository).inRequestScope();
container.bind<IPublishingRepository>(TYPES.IPublishingRepository).to(PublishingRepository).inRequestScope();
container.bind<ILicenseRepository>(TYPES.ILicenseRepository).to(LicenseRepository).inRequestScope();
container
  .bind<ILicenseFeatureRepository>(TYPES.ILicenseFeatureRepository)
  .to(LicenseFeatureRepository)
  .inRequestScope();
container.bind<ILicensePlanRepository>(TYPES.ILicensePlanRepository).to(LicensePlanRepository).inRequestScope();
container
  .bind<IProductOfferingRepository>(TYPES.IProductOfferingRepository)
  .to(ProductOfferingRepository)
  .inRequestScope();
container
  .bind<ILicenseFeatureBundleRepository>(TYPES.ILicenseFeatureBundleRepository)
  .to(LicenseFeatureBundleRepository)
  .inRequestScope();
container
  .bind<ISurfaceLicenseBindingRepository>(TYPES.ISurfaceLicenseBindingRepository)
  .to(SurfaceLicenseBindingRepository)
  .inRequestScope();

// ==================== RBAC ADAPTERS ====================
container.bind<IRoleAdapter>(TYPES.IRoleAdapter).to(RoleAdapter).inRequestScope();
container.bind<IPermissionAdapter>(TYPES.IPermissionAdapter).to(PermissionAdapter).inRequestScope();
container.bind<IUserRoleManagementAdapter>(TYPES.IUserRoleManagementAdapter).to(UserRoleManagementAdapter).inRequestScope();
container.bind<IPermissionBundleAdapter>(TYPES.IPermissionBundleAdapter).to(PermissionBundleAdapter).inRequestScope();
container.bind<IMetadataSurfaceAdapter>(TYPES.IMetadataSurfaceAdapter).to(MetadataSurfaceAdapter).inRequestScope();
container.bind<ISurfaceBindingAdapter>(TYPES.ISurfaceBindingAdapter).to(SurfaceBindingAdapter).inRequestScope();
container.bind<IFeatureCatalogAdapter>(TYPES.IFeatureCatalogAdapter).to(FeatureCatalogAdapter).inRequestScope();
container.bind<ITenantFeatureGrantAdapter>(TYPES.ITenantFeatureGrantAdapter).to(TenantFeatureGrantAdapter).inRequestScope();
container.bind<IDelegationAdapter>(TYPES.IDelegationAdapter).to(DelegationAdapter).inRequestScope();
container.bind<IRbacAuditAdapter>(TYPES.IRbacAuditAdapter).to(RbacAuditAdapter).inRequestScope();
container.bind<IPublishingAdapter>(TYPES.IPublishingAdapter).to(PublishingAdapter).inRequestScope();
container.bind<ILicenseAdapter>(TYPES.ILicenseAdapter).to(LicenseAdapter).inRequestScope();
container
  .bind<ILicenseFeatureAdapter>(TYPES.ILicenseFeatureAdapter)
  .to(LicenseFeatureAdapter)
  .inRequestScope();
container
  .bind<ILicensePlanAdapter>(TYPES.ILicensePlanAdapter)
  .to(LicensePlanAdapter)
  .inRequestScope();
container
  .bind<IProductOfferingAdapter>(TYPES.IProductOfferingAdapter)
  .to(ProductOfferingAdapter)
  .inRequestScope();
container
  .bind<ILicenseFeatureBundleAdapter>(TYPES.ILicenseFeatureBundleAdapter)
  .to(LicenseFeatureBundleAdapter)
  .inRequestScope();
container
  .bind<ISurfaceLicenseBindingAdapter>(TYPES.ISurfaceLicenseBindingAdapter)
  .to(SurfaceLicenseBindingAdapter)
  .inRequestScope();

// ==================== USER MEMBER LINK SERVICES ====================
container.bind<UserMemberLinkService>(TYPES.UserMemberLinkService).to(UserMemberLinkService).inRequestScope();
container.bind<UserMemberLinkRepository>(TYPES.UserMemberLinkRepository).to(UserMemberLinkRepository).inRequestScope();
container.bind<MemberInvitationRepository>(TYPES.MemberInvitationRepository).to(MemberInvitationRepository).inRequestScope();

export { container };
