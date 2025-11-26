import { Container } from 'inversify';
import { TYPES } from './types';

// Services
import { RbacService } from '@/services/rbac.service';
import { RbacRegistryService } from '@/services/RbacRegistryService';
import { RbacCoreService } from '@/services/RbacCoreService';
import { RbacFeatureService } from '@/services/rbacFeature.service';
import { RbacDelegationService } from '@/services/RbacDelegationService';
import { RbacAuditService } from '@/services/RbacAuditService';
import { RbacPublishingService } from '@/services/RbacPublishingService';
import { RbacStatisticsService } from '@/services/RbacStatisticsService';
import { UserMemberLinkService } from '@/services/UserMemberLinkService';
import { SupabaseAuditService, type AuditService } from '@/services/AuditService';
import { LicenseFeatureService } from '@/services/LicenseFeatureService';
import { LicensingService } from '@/services/LicensingService';
import { PermissionValidationService } from '@/services/PermissionValidationService';
import { FeaturePermissionService } from '@/services/FeaturePermissionService';
import { PermissionDeploymentService } from '@/services/PermissionDeploymentService';
import { MaterializedViewRefreshService } from '@/services/MaterializedViewRefreshService';
import { LicenseMonitoringService } from '@/services/LicenseMonitoringService';
import { LicenseValidationService } from '@/services/LicenseValidationService';
import { MetricsService } from '@/services/MetricsService';
import { UserRoleService } from '@/services/UserRoleService';
import { SidebarService } from '@/services/SidebarService';
import { MenuAccessService } from '@/services/MenuAccessService';
import { MenuRenderingService } from '@/services/MenuRenderingService';
import { MenuManagementService } from '@/services/MenuManagementService';

// Repositories
import { RbacRepository } from '@/repositories/rbac.repository';
import { RoleRepository } from '@/repositories/role.repository';
import { PermissionRepository } from '@/repositories/permission.repository';
import { RolePermissionRepository } from '@/repositories/rolePermission.repository';
import { UserRoleManagementRepository } from '@/repositories/userRole.repository';
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
import { LicenseAssignmentRepository } from '@/repositories/licenseAssignment.repository';
import { FeaturePermissionRepository } from '@/repositories/featurePermission.repository';
import { PermissionRoleTemplateRepository } from '@/repositories/permissionRoleTemplate.repository';
import { MenuItemRepository } from '@/repositories/menuItem.repository';

// Repository Interfaces
import type { IRoleRepository } from '@/repositories/role.repository';
import type { IPermissionRepository } from '@/repositories/permission.repository';
import type { IRolePermissionRepository } from '@/repositories/rolePermission.repository';
import type { IUserRoleManagementRepository } from '@/repositories/userRole.repository';
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
import type { ILicenseAssignmentRepository } from '@/repositories/licenseAssignment.repository';
import type { IFeaturePermissionRepository } from '@/repositories/featurePermission.repository';
import type { IPermissionRoleTemplateRepository } from '@/repositories/permissionRoleTemplate.repository';
import type { IMenuItemRepository } from '@/repositories/menuItem.repository';

// Adapters
import { RoleAdapter } from '@/adapters/role.adapter';
import { PermissionAdapter } from '@/adapters/permission.adapter';
import { RolePermissionAdapter } from '@/adapters/rolePermission.adapter';
import { UserRoleManagementAdapter } from '@/adapters/userRoleManagement.adapter';
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
import { LicenseAssignmentAdapter } from '@/adapters/licenseAssignment.adapter';
import { FeaturePermissionAdapter } from '@/adapters/featurePermission.adapter';
import { PermissionRoleTemplateAdapter } from '@/adapters/permissionRoleTemplate.adapter';
import { MenuItemAdapter } from '@/adapters/menuItem.adapter';

// Adapter Interfaces
import type { IRoleAdapter } from '@/adapters/role.adapter';
import type { IPermissionAdapter } from '@/adapters/permission.adapter';
import type { IRolePermissionAdapter } from '@/adapters/rolePermission.adapter';
import type { IUserRoleManagementAdapter } from '@/adapters/userRoleManagement.adapter';
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
import type { ILicenseAssignmentAdapter } from '@/adapters/licenseAssignment.adapter';
import type { IFeaturePermissionAdapter } from '@/adapters/featurePermission.adapter';
import type { IPermissionRoleTemplateAdapter } from '@/adapters/permissionRoleTemplate.adapter';
import type { IMenuItemAdapter } from '@/adapters/menuItem.adapter';

const container = new Container();

// ==================== CORE SERVICES ====================
container.bind<AuditService>(TYPES.AuditService).to(SupabaseAuditService).inRequestScope();

// ==================== RBAC SERVICES ====================
container.bind<RbacService>(TYPES.RbacService).to(RbacService).inRequestScope();
container.bind<RbacRegistryService>(TYPES.RbacRegistryService).to(RbacRegistryService).inRequestScope();

// RBAC Specialized Services
container.bind<RbacCoreService>(TYPES.RbacCoreService).to(RbacCoreService).inRequestScope();
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

container
  .bind<PermissionValidationService>(TYPES.PermissionValidationService)
  .to(PermissionValidationService)
  .inRequestScope();

container
  .bind<FeaturePermissionService>(TYPES.FeaturePermissionService)
  .to(FeaturePermissionService)
  .inRequestScope();

container
  .bind<PermissionDeploymentService>(TYPES.PermissionDeploymentService)
  .to(PermissionDeploymentService)
  .inRequestScope();

// ==================== PHASE 5 OPTIMIZATION & MONITORING SERVICES ====================
container
  .bind<MaterializedViewRefreshService>(TYPES.MaterializedViewRefreshService)
  .to(MaterializedViewRefreshService)
  .inRequestScope();

container
  .bind<LicenseMonitoringService>(TYPES.LicenseMonitoringService)
  .to(LicenseMonitoringService)
  .inRequestScope();

container
  .bind<LicenseValidationService>(TYPES.LicenseValidationService)
  .to(LicenseValidationService)
  .inRequestScope();

container
  .bind<MetricsService>(TYPES.MetricsService)
  .to(MetricsService)
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

// ==================== MENU SERVICES ====================
container
  .bind<MenuAccessService>(TYPES.MenuAccessService)
  .to(MenuAccessService)
  .inRequestScope();

container
  .bind<MenuRenderingService>(TYPES.MenuRenderingService)
  .to(MenuRenderingService)
  .inRequestScope();

container
  .bind<MenuManagementService>(TYPES.MenuManagementService)
  .to(MenuManagementService)
  .inRequestScope();

// ==================== RBAC REPOSITORIES ====================
// Legacy RBAC Repository (will be phased out)
container.bind<RbacRepository>(TYPES.RbacRepository).to(RbacRepository).inRequestScope();

// Specialized RBAC Repositories
container.bind<IRoleRepository>(TYPES.IRoleRepository).to(RoleRepository).inRequestScope();
container.bind<IPermissionRepository>(TYPES.IPermissionRepository).to(PermissionRepository).inRequestScope();
container.bind<IRolePermissionRepository>(TYPES.IRolePermissionRepository).to(RolePermissionRepository).inRequestScope();
container.bind<IUserRoleManagementRepository>(TYPES.IUserRoleManagementRepository).to(UserRoleManagementRepository).inRequestScope();
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
  .bind<ILicenseAssignmentRepository>(TYPES.ILicenseAssignmentRepository)
  .to(LicenseAssignmentRepository)
  .inRequestScope();
container
  .bind<IFeaturePermissionRepository>(TYPES.IFeaturePermissionRepository)
  .to(FeaturePermissionRepository)
  .inRequestScope();
container
  .bind<IPermissionRoleTemplateRepository>(TYPES.IPermissionRoleTemplateRepository)
  .to(PermissionRoleTemplateRepository)
  .inRequestScope();

// ==================== MENU REPOSITORIES ====================
container
  .bind<IMenuItemRepository>(TYPES.IMenuItemRepository)
  .to(MenuItemRepository)
  .inRequestScope();

// ==================== RBAC ADAPTERS ====================
container.bind<IRoleAdapter>(TYPES.IRoleAdapter).to(RoleAdapter).inRequestScope();
container.bind<IPermissionAdapter>(TYPES.IPermissionAdapter).to(PermissionAdapter).inRequestScope();
container.bind<IRolePermissionAdapter>(TYPES.IRolePermissionAdapter).to(RolePermissionAdapter).inRequestScope();
container.bind<IUserRoleManagementAdapter>(TYPES.IUserRoleManagementAdapter).to(UserRoleManagementAdapter).inRequestScope();
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
  .bind<ILicenseAssignmentAdapter>(TYPES.ILicenseAssignmentAdapter)
  .to(LicenseAssignmentAdapter)
  .inRequestScope();
container
  .bind<IFeaturePermissionAdapter>(TYPES.IFeaturePermissionAdapter)
  .to(FeaturePermissionAdapter)
  .inRequestScope();
container
  .bind<IPermissionRoleTemplateAdapter>(TYPES.IPermissionRoleTemplateAdapter)
  .to(PermissionRoleTemplateAdapter)
  .inRequestScope();

// ==================== MENU ADAPTERS ====================
container
  .bind<IMenuItemAdapter>(TYPES.IMenuItemAdapter)
  .to(MenuItemAdapter)
  .inRequestScope();

// ==================== USER MEMBER LINK SERVICES ====================
container.bind<UserMemberLinkService>(TYPES.UserMemberLinkService).to(UserMemberLinkService).inRequestScope();
container.bind<UserMemberLinkRepository>(TYPES.UserMemberLinkRepository).to(UserMemberLinkRepository).inRequestScope();
container.bind<MemberInvitationRepository>(TYPES.MemberInvitationRepository).to(MemberInvitationRepository).inRequestScope();

export { container };
