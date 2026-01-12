import { Container } from 'inversify';
import { TYPES } from './types';

// Services
import { AuthServiceImpl, type AuthService } from '@/services/AuthService';
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
import { ProductOfferingDeploymentService } from '@/services/ProductOfferingDeploymentService';
import { RegistrationService } from '@/services/RegistrationService';
import { PublicMemberRegistrationService } from '@/services/PublicMemberRegistrationService';
import { AuthorizationService } from '@/services/AuthorizationService';
import { MaterializedViewRefreshService } from '@/services/MaterializedViewRefreshService';
import { LicenseMonitoringService } from '@/services/LicenseMonitoringService';
import { LicenseValidationService } from '@/services/LicenseValidationService';
import { MetricsService } from '@/services/MetricsService';
import { LicenseAuditService } from '@/services/LicenseAuditService';
import { UserRoleService } from '@/services/UserRoleService';
import { TenantService } from '@/services/TenantService';
import { SupabaseSettingService, type SettingService } from '@/services/SettingService';
import { MemberHouseholdService } from '@/services/MemberHouseholdService';
import { FamilyService } from '@/services/FamilyService';
import { MemberCarePlanService } from '@/services/MemberCarePlanService';
import { MemberDiscipleshipPlanService } from '@/services/MemberDiscipleshipPlanService';
import { DiscipleshipPathwayService } from '@/services/DiscipleshipPathwayService';
import { MemberDiscipleshipMilestoneService } from '@/services/MemberDiscipleshipMilestoneService';
import { MembersDashboardService } from '@/services/MembersDashboardService';
import { MemberService } from '@/services/MemberService';
import { MembershipTypeService } from '@/services/MembershipTypeService';
import { MembershipStageService } from '@/services/MembershipStageService';
import { MemberProfileService } from '@/services/MemberProfileService';
import { RolePermissionService } from '@/services/RolePermissionService';
import { FeatureOnboardingOrchestratorService } from '@/services/FeatureOnboardingOrchestratorService';

// Feature Onboarding Plugins
import { MembershipOnboardingPlugin } from '@/lib/onboarding/plugins/features/MembershipOnboardingPlugin';

// Planning Calendar Feature
import { CalendarCategoryAdapter, type ICalendarCategoryAdapter } from '@/adapters/calendarCategory.adapter';
import { CalendarEventAdapter, type ICalendarEventAdapter } from '@/adapters/calendarEvent.adapter';
import { CalendarCategoryRepository, type ICalendarCategoryRepository } from '@/repositories/calendarCategory.repository';
import { CalendarEventRepository, type ICalendarEventRepository } from '@/repositories/calendarEvent.repository';
import { PlanningService } from '@/services/PlanningService';

// Admin Dashboard Feature
import { AdminDashboardAdapter, type IAdminDashboardAdapter } from '@/adapters/adminDashboard.adapter';
import { AdminDashboardRepository, type IAdminDashboardRepository } from '@/repositories/adminDashboard.repository';
import { AdminDashboardService } from '@/services/AdminDashboardService';

// Discount System
import { DiscountAdapter, type IDiscountAdapter } from '@/adapters/discount.adapter';
import { DiscountRepository, type IDiscountRepository } from '@/repositories/discount.repository';
import { DiscountService } from '@/services/DiscountService';

// Goals & Objectives Feature
import {
  GoalCategoryAdapter,
  GoalAdapter,
  ObjectiveAdapter,
  KeyResultAdapter,
  KeyResultProgressUpdateAdapter,
  type IGoalCategoryAdapter,
  type IGoalAdapter,
  type IObjectiveAdapter,
  type IKeyResultAdapter,
  type IKeyResultProgressUpdateAdapter,
} from '@/adapters/goals';
import {
  MinistryAdapter,
  type IMinistryAdapter,
} from '@/adapters/ministry.adapter';
import {
  MinistryTeamAdapter,
  type IMinistryTeamAdapter,
} from '@/adapters/ministryTeam.adapter';
import {
  MinistryScheduleAdapter,
  type IMinistryScheduleAdapter,
} from '@/adapters/ministrySchedule.adapter';
import {
  ScheduleOccurrenceAdapter,
  type IScheduleOccurrenceAdapter,
} from '@/adapters/scheduleOccurrence.adapter';
import {
  ScheduleTeamAssignmentAdapter,
  type IScheduleTeamAssignmentAdapter,
} from '@/adapters/scheduleTeamAssignment.adapter';
import {
  ScheduleRegistrationAdapter,
  type IScheduleRegistrationAdapter,
} from '@/adapters/scheduleRegistration.adapter';
import {
  ScheduleAttendanceAdapter,
  type IScheduleAttendanceAdapter,
} from '@/adapters/scheduleAttendance.adapter';
import {
  GoalCategoryRepository,
  GoalRepository,
  ObjectiveRepository,
  KeyResultRepository,
  KeyResultProgressUpdateRepository,
  type IGoalCategoryRepository,
  type IGoalRepository,
  type IObjectiveRepository,
  type IKeyResultRepository,
  type IKeyResultProgressUpdateRepository,
} from '@/repositories/goals';
import {
  MinistryRepository,
  type IMinistryRepository,
} from '@/repositories/ministry.repository';
import {
  MinistryTeamRepository,
  type IMinistryTeamRepository,
} from '@/repositories/ministryTeam.repository';
import {
  MinistryScheduleRepository,
  type IMinistryScheduleRepository,
} from '@/repositories/ministrySchedule.repository';
import {
  ScheduleOccurrenceRepository,
  type IScheduleOccurrenceRepository,
} from '@/repositories/scheduleOccurrence.repository';
import {
  ScheduleTeamAssignmentRepository,
  type IScheduleTeamAssignmentRepository,
} from '@/repositories/scheduleTeamAssignment.repository';
import {
  ScheduleRegistrationRepository,
  type IScheduleRegistrationRepository,
} from '@/repositories/scheduleRegistration.repository';
import {
  ScheduleAttendanceRepository,
  type IScheduleAttendanceRepository,
} from '@/repositories/scheduleAttendance.repository';
// Scheduler Services
import { MinistryService, type IMinistryService } from '@/services/MinistryService';
import { SchedulerService, type ISchedulerService } from '@/services/SchedulerService';
import { ScheduleOccurrenceService, type IScheduleOccurrenceService } from '@/services/ScheduleOccurrenceService';
import { ScheduleRegistrationService, type IScheduleRegistrationService } from '@/services/ScheduleRegistrationService';
import { ScheduleAttendanceService, type IScheduleAttendanceService } from '@/services/ScheduleAttendanceService';
import {
  GoalCategoryService,
  GoalsService,
  GoalMetricsService,
  type IGoalCategoryService,
  type IGoalsService,
  type IGoalMetricsService,
} from '@/services/goals';

// Notification System
import { NotificationAdapter, type INotificationAdapter } from '@/adapters/notification.adapter';
import { NotificationQueueAdapter, type INotificationQueueAdapter } from '@/adapters/notificationQueue.adapter';
import { NotificationPreferenceAdapter, type INotificationPreferenceAdapter } from '@/adapters/notificationPreference.adapter';
import { NotificationTemplateAdapter, type INotificationTemplateAdapter } from '@/adapters/notificationTemplate.adapter';
import { NotificationRepository, type INotificationRepository } from '@/repositories/notification.repository';
import { NotificationQueueRepository, type INotificationQueueRepository } from '@/repositories/notificationQueue.repository';
import { NotificationPreferenceRepository, type INotificationPreferenceRepository } from '@/repositories/notificationPreference.repository';
import { NotificationTemplateRepository, type INotificationTemplateRepository } from '@/repositories/notificationTemplate.repository';
import { NotificationService, type INotificationService } from '@/services/notification/NotificationService';
import { NotificationQueueService, type INotificationQueueService } from '@/services/notification/NotificationQueueService';
import { NotificationBusService, type INotificationBusService } from '@/services/notification/NotificationBusService';
import { ChannelDispatcher } from '@/services/notification/ChannelDispatcher';
import { InAppChannel } from '@/services/notification/channels/InAppChannel';
import { EmailChannel } from '@/services/notification/channels/EmailChannel';
import { SmsChannel } from '@/services/notification/channels/SmsChannel';
import { PushChannel } from '@/services/notification/channels/PushChannel';
import { WebhookChannel } from '@/services/notification/channels/WebhookChannel';
import { PushDeviceTokenAdapter, type IPushDeviceTokenAdapter } from '@/adapters/pushDeviceToken.adapter';
import { PushDeviceTokenRepository, type IPushDeviceTokenRepository } from '@/repositories/pushDeviceToken.repository';
import { PushDeviceTokenService, type IPushDeviceTokenService } from '@/services/PushDeviceTokenService';

// Phase 5 Optimization & Monitoring Adapters
import { PerformanceMetricAdapter, type IPerformanceMetricAdapter } from '@/adapters/performanceMetric.adapter';
import { MaterializedViewRefreshJobAdapter, type IMaterializedViewRefreshJobAdapter } from '@/adapters/materializedViewRefreshJob.adapter';
import { LicenseValidationAdapter } from '@/adapters/licenseValidation.adapter';
import { LicenseMonitoringAdapter } from '@/adapters/licenseMonitoring.adapter';
import { UserMemberLinkAdapter } from '@/adapters/userMemberLink.adapter';
import { LicenseAuditAdapter, type ILicenseAuditAdapter } from '@/adapters/licenseAudit.adapter';
import { ActivityLogAdapter, type IActivityLogAdapter } from '@/adapters/activityLog.adapter';

// Phase 5 Optimization & Monitoring Repositories
import { PerformanceMetricRepository, type IPerformanceMetricRepository } from '@/repositories/performanceMetric.repository';
import { MaterializedViewRefreshJobRepository, type IMaterializedViewRefreshJobRepository } from '@/repositories/materializedViewRefreshJob.repository';
import { LicenseValidationRepository } from '@/repositories/licenseValidation.repository';
import { LicenseMonitoringRepository } from '@/repositories/licenseMonitoring.repository';
import { LicenseAuditRepository, type ILicenseAuditRepository } from '@/repositories/licenseAudit.repository';
import { ActivityLogRepository, type IActivityLogRepository } from '@/repositories/activityLog.repository';

// Payment Services (Xendit Integration)
import { XenditService } from '@/services/XenditService';
import { PaymentService } from '@/services/PaymentService';
import { PaymentSubscriptionService } from '@/services/PaymentSubscriptionService';

// Payment Adapters & Repositories
import { SubscriptionPaymentAdapter, type ISubscriptionPaymentAdapter } from '@/adapters/subscriptionPayment.adapter';
import { SubscriptionPaymentRepository, type ISubscriptionPaymentRepository } from '@/repositories/subscriptionPayment.repository';

// Encryption Services
import { EncryptionService } from '@/lib/encryption/EncryptionService';
import { EncryptionKeyManager } from '@/lib/encryption/EncryptionKeyManager';
import { AES256GCMStrategy } from '@/lib/encryption/strategies/AES256GCMStrategy';
import type { IEncryptionStrategy } from '@/lib/encryption/strategies/IEncryptionStrategy';
import { EncryptionKeyAdapter, type IEncryptionKeyAdapter } from '@/adapters/encryptionKey.adapter';
import { EncryptionKeyRepository, type IEncryptionKeyRepository } from '@/repositories/encryptionKey.repository';

// Adapters
import { MemberAdapter, type IMemberAdapter } from '@/adapters/member.adapter';
import { MemberHouseholdAdapter, type IMemberHouseholdAdapter } from '@/adapters/memberHousehold.adapter';
import { FamilyAdapter, type IFamilyAdapter } from '@/adapters/family.adapter';
import { FamilyMemberAdapter, type IFamilyMemberAdapter } from '@/adapters/familyMember.adapter';
import { MemberCarePlanAdapter, type IMemberCarePlanAdapter } from '@/adapters/memberCarePlan.adapter';
import { MemberDiscipleshipPlanAdapter, type IMemberDiscipleshipPlanAdapter } from '@/adapters/memberDiscipleshipPlan.adapter';
import { DiscipleshipPathwayAdapter, type IDiscipleshipPathwayAdapter } from '@/adapters/discipleshipPathway.adapter';
import { MemberDiscipleshipMilestoneAdapter, type IMemberDiscipleshipMilestoneAdapter } from '@/adapters/memberDiscipleshipMilestone.adapter';
import { MembersDashboardAdapter, type IMembersDashboardAdapter } from '@/adapters/membersDashboard.adapter';
import { MemberProfileAdapter, type IMemberProfileAdapter } from '@/adapters/memberProfile.adapter';
import { UserAdapter } from '@/adapters/user.adapter';
import { MemberInvitationAdapter, type IMemberInvitationAdapter } from '@/adapters/memberInvitation.adapter';
import { OnboardingProgressAdapter, type IOnboardingProgressAdapter } from '@/adapters/onboardingProgress.adapter';
import { MembershipTypeAdapter, type IMembershipTypeAdapter } from '@/adapters/membershipType.adapter';
import { MembershipStageAdapter, type IMembershipStageAdapter } from '@/adapters/membershipStage.adapter';
import { SettingAdapter, type ISettingAdapter } from '@/adapters/setting.adapter';

// Repositories
import { MemberRepository, type IMemberRepository } from '@/repositories/member.repository';
import { MemberHouseholdRepository, type IMemberHouseholdRepository } from '@/repositories/memberHousehold.repository';
import { FamilyRepository, type IFamilyRepository } from '@/repositories/family.repository';
import { FamilyMemberRepository, type IFamilyMemberRepository } from '@/repositories/familyMember.repository';
import { MemberCarePlanRepository, type IMemberCarePlanRepository } from '@/repositories/memberCarePlan.repository';
import { MemberDiscipleshipPlanRepository, type IMemberDiscipleshipPlanRepository } from '@/repositories/memberDiscipleshipPlan.repository';
import { DiscipleshipPathwayRepository, type IDiscipleshipPathwayRepository } from '@/repositories/discipleshipPathway.repository';
import { MemberDiscipleshipMilestoneRepository, type IMemberDiscipleshipMilestoneRepository } from '@/repositories/memberDiscipleshipMilestone.repository';
import { MembersDashboardRepository, type IMembersDashboardRepository } from '@/repositories/membersDashboard.repository';
import { MemberProfileRepository, type IMemberProfileRepository } from '@/repositories/memberProfile.repository';
import { AuthRepository } from '@/repositories/auth.repository';
import { TenantRepository } from '@/repositories/tenant.repository';
import { OnboardingProgressRepository, type IOnboardingProgressRepository } from '@/repositories/onboardingProgress.repository';
import { MembershipTypeRepository, type IMembershipTypeRepository } from '@/repositories/membershipType.repository';
import { MembershipStageRepository, type IMembershipStageRepository } from '@/repositories/membershipStage.repository';
import { SettingRepository, type ISettingRepository } from '@/repositories/setting.repository';
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
import { ProductOfferingPriceRepository, type IProductOfferingPriceRepository } from '@/repositories/productOfferingPrice.repository';
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
import { ProductOfferingPriceAdapter, type IProductOfferingPriceAdapter } from '@/adapters/productOfferingPrice.adapter';
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
container.bind<AuthService>(TYPES.AuthService).to(AuthServiceImpl).inRequestScope();

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
  .bind<ProductOfferingDeploymentService>(TYPES.ProductOfferingDeploymentService)
  .to(ProductOfferingDeploymentService)
  .inRequestScope();

container
  .bind<RegistrationService>(TYPES.RegistrationService)
  .to(RegistrationService)
  .inRequestScope();

container
  .bind<PublicMemberRegistrationService>(TYPES.PublicMemberRegistrationService)
  .to(PublicMemberRegistrationService)
  .inRequestScope();

container
  .bind<AuthorizationService>(TYPES.AuthorizationService)
  .to(AuthorizationService)
  .inRequestScope();

container
  .bind<TenantService>(TYPES.TenantService)
  .to(TenantService)
  .inRequestScope();

// ==================== SETTING SERVICE ====================
container.bind<ISettingAdapter>(TYPES.ISettingAdapter).to(SettingAdapter).inRequestScope();
container.bind<ISettingRepository>(TYPES.ISettingRepository).to(SettingRepository).inRequestScope();
container.bind<SettingService>(TYPES.SettingService).to(SupabaseSettingService).inRequestScope();

container
  .bind<RolePermissionService>(TYPES.RolePermissionService)
  .to(RolePermissionService)
// ==================== PAYMENT SERVICES (XENDIT INTEGRATION) ====================
// Adapters
container
  .bind<ISubscriptionPaymentAdapter>(TYPES.ISubscriptionPaymentAdapter)
  .to(SubscriptionPaymentAdapter)
  .inRequestScope();

// Repositories
container
  .bind<ISubscriptionPaymentRepository>(TYPES.ISubscriptionPaymentRepository)
  .to(SubscriptionPaymentRepository)
  .inRequestScope();

// Services
container
  .bind<XenditService>(TYPES.XenditService)
  .to(XenditService)
  .inRequestScope();

container
  .bind<PaymentService>(TYPES.PaymentService)
  .to(PaymentService)
  .inRequestScope();

container
  .bind<PaymentSubscriptionService>(TYPES.PaymentSubscriptionService)
  .to(PaymentSubscriptionService)
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

container
  .bind<LicenseAuditService>(TYPES.LicenseAuditService)
  .to(LicenseAuditService)
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

container
  .bind<ILicenseAuditAdapter>(TYPES.ILicenseAuditAdapter)
  .to(LicenseAuditAdapter)
  .inRequestScope();

container
  .bind<IActivityLogAdapter>(TYPES.IActivityLogAdapter)
  .to(ActivityLogAdapter)
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

container
  .bind<ILicenseAuditRepository>(TYPES.ILicenseAuditRepository)
  .to(LicenseAuditRepository)
  .inRequestScope();

container
  .bind<IActivityLogRepository>(TYPES.IActivityLogRepository)
  .to(ActivityLogRepository)
  .inRequestScope();

// ==================== ENCRYPTION SERVICES ====================
// Bind encryption adapter and repository
container
  .bind<IEncryptionKeyAdapter>(TYPES.IEncryptionKeyAdapter)
  .to(EncryptionKeyAdapter)
  .inRequestScope();

container
  .bind<IEncryptionKeyRepository>(TYPES.IEncryptionKeyRepository)
  .to(EncryptionKeyRepository)
  .inRequestScope();

// Bind encryption strategy (singleton for performance)
container
  .bind<IEncryptionStrategy>(TYPES.EncryptionStrategy)
  .to(AES256GCMStrategy)
  .inSingletonScope();

// Bind key manager (request scope to match repository scope)
// Note: Key caching still works within the request context
container
  .bind<EncryptionKeyManager>(TYPES.EncryptionKeyManager)
  .to(EncryptionKeyManager)
  .inRequestScope();

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
  .bind<IProductOfferingPriceRepository>(TYPES.IProductOfferingPriceRepository)
  .to(ProductOfferingPriceRepository)
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
  .bind<IProductOfferingPriceAdapter>(TYPES.IProductOfferingPriceAdapter)
  .to(ProductOfferingPriceAdapter)
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

// ==================== MEMBER HOUSEHOLD ====================
container.bind<IMemberHouseholdAdapter>(TYPES.IMemberHouseholdAdapter).to(MemberHouseholdAdapter).inRequestScope();
container.bind<IMemberHouseholdRepository>(TYPES.IMemberHouseholdRepository).to(MemberHouseholdRepository).inRequestScope();
container.bind<MemberHouseholdService>(TYPES.MemberHouseholdService).to(MemberHouseholdService).inRequestScope();

// ==================== FAMILY MANAGEMENT ====================
container.bind<IFamilyAdapter>(TYPES.IFamilyAdapter).to(FamilyAdapter).inRequestScope();
container.bind<IFamilyRepository>(TYPES.IFamilyRepository).to(FamilyRepository).inRequestScope();
container.bind<IFamilyMemberAdapter>(TYPES.IFamilyMemberAdapter).to(FamilyMemberAdapter).inRequestScope();
container.bind<IFamilyMemberRepository>(TYPES.IFamilyMemberRepository).to(FamilyMemberRepository).inRequestScope();
container.bind<FamilyService>(TYPES.FamilyService).to(FamilyService).inRequestScope();

// ==================== MEMBER CARE PLAN ====================
container.bind<IMemberCarePlanAdapter>(TYPES.IMemberCarePlanAdapter).to(MemberCarePlanAdapter).inRequestScope();
container.bind<IMemberCarePlanRepository>(TYPES.IMemberCarePlanRepository).to(MemberCarePlanRepository).inRequestScope();
container.bind<MemberCarePlanService>(TYPES.MemberCarePlanService).to(MemberCarePlanService).inRequestScope();

// ==================== MEMBER DISCIPLESHIP PLAN ====================
container.bind<IMemberDiscipleshipPlanAdapter>(TYPES.IMemberDiscipleshipPlanAdapter).to(MemberDiscipleshipPlanAdapter).inRequestScope();
container.bind<IMemberDiscipleshipPlanRepository>(TYPES.IMemberDiscipleshipPlanRepository).to(MemberDiscipleshipPlanRepository).inRequestScope();
container.bind<MemberDiscipleshipPlanService>(TYPES.MemberDiscipleshipPlanService).to(MemberDiscipleshipPlanService).inRequestScope();

// ==================== DISCIPLESHIP PATHWAY ====================
container.bind<IDiscipleshipPathwayAdapter>(TYPES.IDiscipleshipPathwayAdapter).to(DiscipleshipPathwayAdapter).inRequestScope();
container.bind<IDiscipleshipPathwayRepository>(TYPES.IDiscipleshipPathwayRepository).to(DiscipleshipPathwayRepository).inRequestScope();
container.bind<DiscipleshipPathwayService>(TYPES.DiscipleshipPathwayService).to(DiscipleshipPathwayService).inRequestScope();

// ==================== DISCIPLESHIP MILESTONE ====================
container.bind<IMemberDiscipleshipMilestoneAdapter>(TYPES.IMemberDiscipleshipMilestoneAdapter).to(MemberDiscipleshipMilestoneAdapter).inRequestScope();
container.bind<IMemberDiscipleshipMilestoneRepository>(TYPES.IMemberDiscipleshipMilestoneRepository).to(MemberDiscipleshipMilestoneRepository).inRequestScope();
container.bind<MemberDiscipleshipMilestoneService>(TYPES.MemberDiscipleshipMilestoneService).to(MemberDiscipleshipMilestoneService).inRequestScope();

// ==================== MEMBERS DASHBOARD ====================
container.bind<IMembersDashboardAdapter>(TYPES.IMembersDashboardAdapter).to(MembersDashboardAdapter).inRequestScope();
container.bind<IMembersDashboardRepository>(TYPES.IMembersDashboardRepository).to(MembersDashboardRepository).inRequestScope();
container.bind<MembersDashboardService>(TYPES.MembersDashboardService).to(MembersDashboardService).inRequestScope();

// ==================== MEMBER PROFILE ====================
container.bind<IMemberProfileAdapter>(TYPES.IMemberProfileAdapter).to(MemberProfileAdapter).inRequestScope();
container.bind<IMemberProfileRepository>(TYPES.IMemberProfileRepository).to(MemberProfileRepository).inRequestScope();
container.bind<MemberProfileService>(TYPES.MemberProfileService).to(MemberProfileService).inRequestScope();

// ==================== MEMBER INVITATION ====================
container.bind<IMemberInvitationAdapter>(TYPES.IMemberInvitationAdapter).to(MemberInvitationAdapter).inRequestScope();
container.bind<MemberInvitationRepository>(TYPES.MemberInvitationRepository).to(MemberInvitationRepository).inRequestScope();

// ==================== USER MEMBER LINK SERVICES ====================
container.bind<UserMemberLinkService>(TYPES.UserMemberLinkService).to(UserMemberLinkService).inRequestScope();
container.bind<UserMemberLinkRepository>(TYPES.UserMemberLinkRepository).to(UserMemberLinkRepository).inRequestScope();

// ==================== ONBOARDING PROGRESS ====================
container.bind<IOnboardingProgressAdapter>(TYPES.IOnboardingProgressAdapter).to(OnboardingProgressAdapter).inRequestScope();
container.bind<IOnboardingProgressRepository>(TYPES.IOnboardingProgressRepository).to(OnboardingProgressRepository).inRequestScope();

// ==================== MEMBERSHIP TYPE & STAGE ====================
container.bind<IMembershipTypeAdapter>(TYPES.IMembershipTypeAdapter).to(MembershipTypeAdapter).inRequestScope();
container.bind<IMembershipTypeRepository>(TYPES.IMembershipTypeRepository).to(MembershipTypeRepository).inRequestScope();
container.bind<MembershipTypeService>(TYPES.MembershipTypeService).to(MembershipTypeService).inRequestScope();
container.bind<IMembershipStageAdapter>(TYPES.IMembershipStageAdapter).to(MembershipStageAdapter).inRequestScope();
container.bind<IMembershipStageRepository>(TYPES.IMembershipStageRepository).to(MembershipStageRepository).inRequestScope();
container.bind<MembershipStageService>(TYPES.MembershipStageService).to(MembershipStageService).inRequestScope();

// ==================== RELIGIOUS DENOMINATION ====================
import { ReligiousDenominationAdapter, type IReligiousDenominationAdapter } from '@/adapters/religiousDenomination.adapter';
import { ReligiousDenominationRepository, type IReligiousDenominationRepository } from '@/repositories/religiousDenomination.repository';
import { ReligiousDenominationService } from '@/services/ReligiousDenominationService';

container.bind<IReligiousDenominationAdapter>(TYPES.IReligiousDenominationAdapter).to(ReligiousDenominationAdapter).inRequestScope();
container.bind<IReligiousDenominationRepository>(TYPES.IReligiousDenominationRepository).to(ReligiousDenominationRepository).inRequestScope();
container.bind<ReligiousDenominationService>(TYPES.ReligiousDenominationService).to(ReligiousDenominationService).inRequestScope();

// ==================== ACCOUNT ADAPTER/REPOSITORY (MemberService dependency) ====================
import { AccountAdapter, type IAccountAdapter } from '@/adapters/account.adapter';
import { AccountRepository, type IAccountRepository } from '@/repositories/account.repository';
container.bind<IAccountAdapter>(TYPES.IAccountAdapter).to(AccountAdapter).inRequestScope();
container.bind<IAccountRepository>(TYPES.IAccountRepository).to(AccountRepository).inRequestScope();

// ==================== FINANCIAL TRANSACTION ADAPTER/REPOSITORY (MemberService dependency) ====================
import { FinancialTransactionAdapter, type IFinancialTransactionAdapter } from '@/adapters/financialTransaction.adapter';
import { FinancialTransactionRepository, type IFinancialTransactionRepository } from '@/repositories/financialTransaction.repository';
container.bind<IFinancialTransactionAdapter>(TYPES.IFinancialTransactionAdapter).to(FinancialTransactionAdapter).inRequestScope();
container.bind<IFinancialTransactionRepository>(TYPES.IFinancialTransactionRepository).to(FinancialTransactionRepository).inRequestScope();

// ==================== MEMBER SERVICE ====================
container.bind<MemberService>(TYPES.MemberService).to(MemberService).inRequestScope();

// ==================== FEATURE ONBOARDING ====================
container.bind<FeatureOnboardingOrchestratorService>(TYPES.FeatureOnboardingOrchestratorService).to(FeatureOnboardingOrchestratorService).inRequestScope();
container.bind<MembershipOnboardingPlugin>(TYPES.MembershipOnboardingPlugin).to(MembershipOnboardingPlugin).inRequestScope();

// ==================== PLANNING CALENDAR ====================
container.bind<ICalendarCategoryAdapter>(TYPES.ICalendarCategoryAdapter).to(CalendarCategoryAdapter).inRequestScope();
container.bind<ICalendarCategoryRepository>(TYPES.ICalendarCategoryRepository).to(CalendarCategoryRepository).inRequestScope();
container.bind<ICalendarEventAdapter>(TYPES.ICalendarEventAdapter).to(CalendarEventAdapter).inRequestScope();
container.bind<ICalendarEventRepository>(TYPES.ICalendarEventRepository).to(CalendarEventRepository).inRequestScope();
container.bind<PlanningService>(TYPES.PlanningService).to(PlanningService).inRequestScope();

// ==================== NOTIFICATION SYSTEM ====================
// Adapters
container.bind<INotificationAdapter>(TYPES.INotificationAdapter).to(NotificationAdapter).inRequestScope();
container.bind<INotificationQueueAdapter>(TYPES.INotificationQueueAdapter).to(NotificationQueueAdapter).inRequestScope();
container.bind<INotificationPreferenceAdapter>(TYPES.INotificationPreferenceAdapter).to(NotificationPreferenceAdapter).inRequestScope();
container.bind<INotificationTemplateAdapter>(TYPES.INotificationTemplateAdapter).to(NotificationTemplateAdapter).inRequestScope();

// Repositories
container.bind<INotificationRepository>(TYPES.INotificationRepository).to(NotificationRepository).inRequestScope();
container.bind<INotificationQueueRepository>(TYPES.INotificationQueueRepository).to(NotificationQueueRepository).inRequestScope();
container.bind<INotificationPreferenceRepository>(TYPES.INotificationPreferenceRepository).to(NotificationPreferenceRepository).inRequestScope();
container.bind<INotificationTemplateRepository>(TYPES.INotificationTemplateRepository).to(NotificationTemplateRepository).inRequestScope();

// Services
container.bind<INotificationService>(TYPES.NotificationService).to(NotificationService).inRequestScope();
container.bind<INotificationService>(TYPES.INotificationService).to(NotificationService).inRequestScope();
container.bind<INotificationQueueService>(TYPES.NotificationQueueService).to(NotificationQueueService).inRequestScope();
container.bind<INotificationQueueService>(TYPES.INotificationQueueService).to(NotificationQueueService).inRequestScope();

// Notification Bus (Multi-Channel Delivery)
container.bind<InAppChannel>(TYPES.InAppChannel).to(InAppChannel).inRequestScope();
container.bind<EmailChannel>(TYPES.EmailChannel).to(EmailChannel).inRequestScope();
container.bind<SmsChannel>(TYPES.SmsChannel).to(SmsChannel).inRequestScope();
container.bind<PushChannel>(TYPES.PushChannel).to(PushChannel).inRequestScope();
container.bind<WebhookChannel>(TYPES.WebhookChannel).to(WebhookChannel).inRequestScope();
container.bind<ChannelDispatcher>(TYPES.ChannelDispatcher).to(ChannelDispatcher).inRequestScope();
container.bind<INotificationBusService>(TYPES.NotificationBusService).to(NotificationBusService).inRequestScope();

// Push Device Token (Firebase)
container.bind<IPushDeviceTokenAdapter>(TYPES.IPushDeviceTokenAdapter).to(PushDeviceTokenAdapter).inRequestScope();
container.bind<IPushDeviceTokenRepository>(TYPES.IPushDeviceTokenRepository).to(PushDeviceTokenRepository).inRequestScope();
container.bind<IPushDeviceTokenService>(TYPES.IPushDeviceTokenService).to(PushDeviceTokenService).inRequestScope();

// ==================== ADMIN DASHBOARD ====================
container.bind<IAdminDashboardAdapter>(TYPES.IAdminDashboardAdapter).to(AdminDashboardAdapter).inRequestScope();
container.bind<IAdminDashboardRepository>(TYPES.IAdminDashboardRepository).to(AdminDashboardRepository).inRequestScope();
container.bind<AdminDashboardService>(TYPES.AdminDashboardService).to(AdminDashboardService).inRequestScope();

// ==================== DISCOUNT SYSTEM ====================
container.bind<IDiscountAdapter>(TYPES.IDiscountAdapter).to(DiscountAdapter).inRequestScope();
container.bind<IDiscountRepository>(TYPES.IDiscountRepository).to(DiscountRepository).inRequestScope();
container.bind<DiscountService>(TYPES.DiscountService).to(DiscountService).inRequestScope();

// ==================== GOALS & OBJECTIVES ====================
// Adapters
container.bind<IGoalCategoryAdapter>(TYPES.IGoalCategoryAdapter).to(GoalCategoryAdapter).inRequestScope();
container.bind<IGoalAdapter>(TYPES.IGoalAdapter).to(GoalAdapter).inRequestScope();
container.bind<IObjectiveAdapter>(TYPES.IObjectiveAdapter).to(ObjectiveAdapter).inRequestScope();
container.bind<IKeyResultAdapter>(TYPES.IKeyResultAdapter).to(KeyResultAdapter).inRequestScope();
container.bind<IKeyResultProgressUpdateAdapter>(TYPES.IKeyResultProgressUpdateAdapter).to(KeyResultProgressUpdateAdapter).inRequestScope();

// Repositories
container.bind<IGoalCategoryRepository>(TYPES.IGoalCategoryRepository).to(GoalCategoryRepository).inRequestScope();
container.bind<IGoalRepository>(TYPES.IGoalRepository).to(GoalRepository).inRequestScope();
container.bind<IObjectiveRepository>(TYPES.IObjectiveRepository).to(ObjectiveRepository).inRequestScope();
container.bind<IKeyResultRepository>(TYPES.IKeyResultRepository).to(KeyResultRepository).inRequestScope();
container.bind<IKeyResultProgressUpdateRepository>(TYPES.IKeyResultProgressUpdateRepository).to(KeyResultProgressUpdateRepository).inRequestScope();

// Services
container.bind<IGoalCategoryService>(TYPES.GoalCategoryService).to(GoalCategoryService).inRequestScope();
container.bind<IGoalsService>(TYPES.GoalsService).to(GoalsService).inRequestScope();
container.bind<IGoalMetricsService>(TYPES.GoalMetricsService).to(GoalMetricsService).inRequestScope();

// ==================== SCHEDULER FEATURE ====================
// Adapters
container.bind<IMinistryAdapter>(TYPES.IMinistryAdapter).to(MinistryAdapter).inRequestScope();
container.bind<IMinistryTeamAdapter>(TYPES.IMinistryTeamAdapter).to(MinistryTeamAdapter).inRequestScope();
container.bind<IMinistryScheduleAdapter>(TYPES.IMinistryScheduleAdapter).to(MinistryScheduleAdapter).inRequestScope();
container.bind<IScheduleOccurrenceAdapter>(TYPES.IScheduleOccurrenceAdapter).to(ScheduleOccurrenceAdapter).inRequestScope();
container.bind<IScheduleTeamAssignmentAdapter>(TYPES.IScheduleTeamAssignmentAdapter).to(ScheduleTeamAssignmentAdapter).inRequestScope();
container.bind<IScheduleRegistrationAdapter>(TYPES.IScheduleRegistrationAdapter).to(ScheduleRegistrationAdapter).inRequestScope();
container.bind<IScheduleAttendanceAdapter>(TYPES.IScheduleAttendanceAdapter).to(ScheduleAttendanceAdapter).inRequestScope();

// Repositories
container.bind<IMinistryRepository>(TYPES.IMinistryRepository).to(MinistryRepository).inRequestScope();
container.bind<IMinistryTeamRepository>(TYPES.IMinistryTeamRepository).to(MinistryTeamRepository).inRequestScope();
container.bind<IMinistryScheduleRepository>(TYPES.IMinistryScheduleRepository).to(MinistryScheduleRepository).inRequestScope();
container.bind<IScheduleOccurrenceRepository>(TYPES.IScheduleOccurrenceRepository).to(ScheduleOccurrenceRepository).inRequestScope();
container.bind<IScheduleTeamAssignmentRepository>(TYPES.IScheduleTeamAssignmentRepository).to(ScheduleTeamAssignmentRepository).inRequestScope();
container.bind<IScheduleRegistrationRepository>(TYPES.IScheduleRegistrationRepository).to(ScheduleRegistrationRepository).inRequestScope();
container.bind<IScheduleAttendanceRepository>(TYPES.IScheduleAttendanceRepository).to(ScheduleAttendanceRepository).inRequestScope();

// Services
container.bind<IMinistryService>(TYPES.MinistryService).to(MinistryService).inRequestScope();
container.bind<ISchedulerService>(TYPES.SchedulerService).to(SchedulerService).inRequestScope();
container.bind<IScheduleOccurrenceService>(TYPES.ScheduleOccurrenceService).to(ScheduleOccurrenceService).inRequestScope();
container.bind<IScheduleRegistrationService>(TYPES.ScheduleRegistrationService).to(ScheduleRegistrationService).inRequestScope();
container.bind<IScheduleAttendanceService>(TYPES.ScheduleAttendanceService).to(ScheduleAttendanceService).inRequestScope();

export { container };
