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
import { RegistrationService } from '@/services/RegistrationService';
import { AuthorizationService } from '@/services/AuthorizationService';
import { MaterializedViewRefreshService } from '@/services/MaterializedViewRefreshService';
import { LicenseMonitoringService } from '@/services/LicenseMonitoringService';
import { LicenseValidationService } from '@/services/LicenseValidationService';
import { MetricsService } from '@/services/MetricsService';
import { UserRoleService } from '@/services/UserRoleService';
import { TenantService } from '@/services/TenantService';
import { RolePermissionService } from '@/services/RolePermissionService';

// Phase 5 Optimization & Monitoring Adapters
import { PerformanceMetricAdapter, type IPerformanceMetricAdapter } from '@/adapters/performanceMetric.adapter';
import { MaterializedViewRefreshJobAdapter, type IMaterializedViewRefreshJobAdapter } from '@/adapters/materializedViewRefreshJob.adapter';
import { LicenseValidationAdapter } from '@/adapters/licenseValidation.adapter';
import { LicenseMonitoringAdapter } from '@/adapters/licenseMonitoring.adapter';
import { UserMemberLinkAdapter } from '@/adapters/userMemberLink.adapter';

// Phase 5 Optimization & Monitoring Repositories
import { PerformanceMetricRepository, type IPerformanceMetricRepository } from '@/repositories/performanceMetric.repository';
import { MaterializedViewRefreshJobRepository, type IMaterializedViewRefreshJobRepository } from '@/repositories/materializedViewRefreshJob.repository';
import { LicenseValidationRepository } from '@/repositories/licenseValidation.repository';
import { LicenseMonitoringRepository } from '@/repositories/licenseMonitoring.repository';

// Encryption Services
import { EncryptionService } from '@/lib/encryption/EncryptionService';
import { EncryptionKeyManager } from '@/lib/encryption/EncryptionKeyManager';
import { AES256GCMStrategy } from '@/lib/encryption/strategies/AES256GCMStrategy';
import type { IEncryptionStrategy } from '@/lib/encryption/strategies/IEncryptionStrategy';

// Adapters
import { MemberAdapter, type IMemberAdapter } from '@/adapters/member.adapter';
import { UserAdapter } from '@/adapters/user.adapter';
import { MemberInvitationAdapter, type IMemberInvitationAdapter } from '@/adapters/memberInvitation.adapter';
import { OnboardingProgressAdapter, type IOnboardingProgressAdapter } from '@/adapters/onboardingProgress.adapter';

// Repositories
import { MemberRepository, type IMemberRepository } from '@/repositories/member.repository';
import { AuthRepository } from '@/repositories/auth.repository';
import { TenantRepository } from '@/repositories/tenant.repository';
import { OnboardingProgressRepository, type IOnboardingProgressRepository } from '@/repositories/onboardingProgress.repository';
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
// LicensePlanRepository removed - feature_packages table dropped (legacy licensing)
import { ProductOfferingRepository } from '@/repositories/productOffering.repository';
import { LicenseFeatureBundleRepository } from '@/repositories/licenseFeatureBundle.repository';
import { LicenseAssignmentRepository } from '@/repositories/licenseAssignment.repository';
import { FeaturePermissionRepository } from '@/repositories/featurePermission.repository';
import { PermissionRoleTemplateRepository } from '@/repositories/permissionRoleTemplate.repository';

// Repository Interfaces
import type { IAuthRepository } from '@/repositories/auth.repository';
import type { ITenantRepository } from '@/repositories/tenant.repository';
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
// ILicensePlanRepository removed - feature_packages table dropped (legacy licensing)
import type { IProductOfferingRepository } from '@/repositories/productOffering.repository';
import type { ILicenseFeatureBundleRepository } from '@/repositories/licenseFeatureBundle.repository';
import type { ILicenseAssignmentRepository } from '@/repositories/licenseAssignment.repository';
import type { IFeaturePermissionRepository } from '@/repositories/featurePermission.repository';
import type { IPermissionRoleTemplateRepository } from '@/repositories/permissionRoleTemplate.repository';

// Adapters
import { AuthAdapter } from '@/adapters/auth.adapter';
import { TenantAdapter } from '@/adapters/tenant.adapter';
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
// LicensePlanAdapter removed - feature_packages table dropped (legacy licensing)
import { ProductOfferingAdapter } from '@/adapters/productOffering.adapter';
import { LicenseFeatureBundleAdapter } from '@/adapters/licenseFeatureBundle.adapter';
import { LicenseAssignmentAdapter } from '@/adapters/licenseAssignment.adapter';
import { FeaturePermissionAdapter } from '@/adapters/featurePermission.adapter';
import { PermissionRoleTemplateAdapter } from '@/adapters/permissionRoleTemplate.adapter';

// Adapter Interfaces
import type { IAuthAdapter } from '@/adapters/auth.adapter';
import type { ITenantAdapter } from '@/adapters/tenant.adapter';
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
// ILicensePlanAdapter removed - feature_packages table dropped (legacy licensing)
import type { IProductOfferingAdapter } from '@/adapters/productOffering.adapter';
import type { ILicenseFeatureBundleAdapter } from '@/adapters/licenseFeatureBundle.adapter';
import type { ILicenseAssignmentAdapter } from '@/adapters/licenseAssignment.adapter';
import type { IFeaturePermissionAdapter } from '@/adapters/featurePermission.adapter';
import type { IPermissionRoleTemplateAdapter } from '@/adapters/permissionRoleTemplate.adapter';

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

container
  .bind<RegistrationService>(TYPES.RegistrationService)
  .to(RegistrationService)
  .inRequestScope();

container
  .bind<AuthorizationService>(TYPES.AuthorizationService)
  .to(AuthorizationService)
  .inRequestScope();

container
  .bind<TenantService>(TYPES.TenantService)
  .to(TenantService)
  .inRequestScope();

container
  .bind<RolePermissionService>(TYPES.RolePermissionService)
  .to(RolePermissionService)
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

// ==================== PHASE 5 OPTIMIZATION & MONITORING ADAPTERS ====================
container
  .bind<IPerformanceMetricAdapter>(TYPES.IPerformanceMetricAdapter)
  .to(PerformanceMetricAdapter)
  .inRequestScope();

container
  .bind<IMaterializedViewRefreshJobAdapter>(TYPES.IMaterializedViewRefreshJobAdapter)
  .to(MaterializedViewRefreshJobAdapter)
  .inRequestScope();

container
  .bind<LicenseValidationAdapter>(TYPES.LicenseValidationAdapter)
  .to(LicenseValidationAdapter)
  .inRequestScope();

container
  .bind<LicenseMonitoringAdapter>(TYPES.LicenseMonitoringAdapter)
  .to(LicenseMonitoringAdapter)
  .inRequestScope();

container
  .bind<UserMemberLinkAdapter>(TYPES.UserMemberLinkAdapter)
  .to(UserMemberLinkAdapter)
  .inRequestScope();

// ==================== PHASE 5 OPTIMIZATION & MONITORING REPOSITORIES ====================
container
  .bind<IPerformanceMetricRepository>(TYPES.IPerformanceMetricRepository)
  .to(PerformanceMetricRepository)
  .inRequestScope();

container
  .bind<IMaterializedViewRefreshJobRepository>(TYPES.IMaterializedViewRefreshJobRepository)
  .to(MaterializedViewRefreshJobRepository)
  .inRequestScope();

container
  .bind<LicenseValidationRepository>(TYPES.LicenseValidationRepository)
  .to(LicenseValidationRepository)
  .inRequestScope();

container
  .bind<LicenseMonitoringRepository>(TYPES.LicenseMonitoringRepository)
  .to(LicenseMonitoringRepository)
  .inRequestScope();

// ==================== ENCRYPTION SERVICES ====================
// Bind encryption strategy (singleton for performance)
container
  .bind<IEncryptionStrategy>(TYPES.EncryptionStrategy)
  .to(AES256GCMStrategy)
  .inSingletonScope();

// Bind key manager (singleton for key caching)
container
  .bind<EncryptionKeyManager>(TYPES.EncryptionKeyManager)
  .to(EncryptionKeyManager)
  .inSingletonScope();

// Bind encryption service (request scope for tenant isolation)
container
  .bind<EncryptionService>(TYPES.EncryptionService)
  .to(EncryptionService)
  .inRequestScope();

// ==================== ADAPTERS ====================
// MemberAdapter now has encryption built-in
container
  .bind<MemberAdapter>(TYPES.MemberAdapter)
  .to(MemberAdapter)
  .inRequestScope();

// UserAdapter handles auth user queries via RPC
container
  .bind<UserAdapter>(TYPES.UserAdapter)
  .to(UserAdapter)
  .inRequestScope();

// ==================== USER ROLE SERVICE ====================
container
  .bind<UserRoleService>(TYPES.UserRoleService)
  .to(UserRoleService)
  .inRequestScope();

// ==================== AUTH REPOSITORY ====================
container.bind<IAuthRepository>(TYPES.IAuthRepository).to(AuthRepository).inRequestScope();

// ==================== TENANT REPOSITORY ====================
container.bind<ITenantRepository>(TYPES.ITenantRepository).to(TenantRepository).inRequestScope();

// ==================== RBAC REPOSITORIES ====================
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
// ILicensePlanRepository binding removed - feature_packages table dropped (legacy licensing)
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

// ==================== AUTH ADAPTER ====================
container.bind<IAuthAdapter>(TYPES.IAuthAdapter).to(AuthAdapter).inRequestScope();

// ==================== TENANT ADAPTER ====================
container.bind<ITenantAdapter>(TYPES.ITenantAdapter).to(TenantAdapter).inRequestScope();

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
// ILicensePlanAdapter binding removed - feature_packages table dropped (legacy licensing)
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
// ==================== MEMBER ADAPTER & REPOSITORY ====================
container.bind<IMemberAdapter>(TYPES.IMemberAdapter).to(MemberAdapter).inRequestScope();
container.bind<IMemberRepository>(TYPES.IMemberRepository).to(MemberRepository).inRequestScope();

// ==================== MEMBER INVITATION ====================
container.bind<IMemberInvitationAdapter>(TYPES.IMemberInvitationAdapter).to(MemberInvitationAdapter).inRequestScope();
container.bind<MemberInvitationRepository>(TYPES.MemberInvitationRepository).to(MemberInvitationRepository).inRequestScope();

// ==================== USER MEMBER LINK SERVICES ====================
container.bind<UserMemberLinkService>(TYPES.UserMemberLinkService).to(UserMemberLinkService).inRequestScope();
container.bind<UserMemberLinkRepository>(TYPES.UserMemberLinkRepository).to(UserMemberLinkRepository).inRequestScope();

// ==================== ONBOARDING PROGRESS ====================
container.bind<IOnboardingProgressAdapter>(TYPES.IOnboardingProgressAdapter).to(OnboardingProgressAdapter).inRequestScope();
container.bind<IOnboardingProgressRepository>(TYPES.IOnboardingProgressRepository).to(OnboardingProgressRepository).inRequestScope();

export { container };
