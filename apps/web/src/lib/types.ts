export const TYPES = {
  AuditService: Symbol.for('AuditService'),
  AuthService: Symbol.for('AuthService'),
  RbacRegistryService: Symbol.for('RbacRegistryService'),
  RbacService: Symbol.for('RbacService'),
  RbacRepository: Symbol.for('RbacRepository'),

  // RBAC Specialized Services
  RbacCoreService: Symbol.for('RbacCoreService'),
  RbacFeatureService: Symbol.for('RbacFeatureService'),
  RbacDelegationService: Symbol.for('RbacDelegationService'),
  RbacAuditService: Symbol.for('RbacAuditService'),
  RbacPublishingService: Symbol.for('RbacPublishingService'),
  RbacStatisticsService: Symbol.for('RbacStatisticsService'),

  // Licensing Services
  LicensingService: Symbol.for('LicensingService'),
  PermissionValidationService: Symbol.for('PermissionValidationService'),
  FeaturePermissionService: Symbol.for('FeaturePermissionService'),
  PermissionDeploymentService: Symbol.for('PermissionDeploymentService'),
  ProductOfferingDeploymentService: Symbol.for('ProductOfferingDeploymentService'),

  // Registration Service
  RegistrationService: Symbol.for('RegistrationService'),
  PublicMemberRegistrationService: Symbol.for('PublicMemberRegistrationService'),

  // Email Verification Service (for registration flow)
  EmailVerificationService: Symbol.for('EmailVerificationService'),
  IPendingRegistrationAdapter: Symbol.for('IPendingRegistrationAdapter'),
  IPendingRegistrationRepository: Symbol.for('IPendingRegistrationRepository'),

  // Authorization Service
  AuthorizationService: Symbol.for('AuthorizationService'),
  UserRoleAdapter: Symbol.for('UserRoleAdapter'),
  RolePermissionService: Symbol.for('RolePermissionService'),
  
  // Payment Services (Xendit Integration)
  XenditService: Symbol.for('XenditService'),
  PaymentService: Symbol.for('PaymentService'),
  PaymentSubscriptionService: Symbol.for('PaymentSubscriptionService'),

  // Payment Adapters & Repositories
  ISubscriptionPaymentAdapter: Symbol.for('ISubscriptionPaymentAdapter'),
  ISubscriptionPaymentRepository: Symbol.for('ISubscriptionPaymentRepository'),

  // Phase 5 Optimization & Monitoring Services
  MaterializedViewRefreshService: Symbol.for('MaterializedViewRefreshService'),
  LicenseMonitoringService: Symbol.for('LicenseMonitoringService'),
  LicenseValidationService: Symbol.for('LicenseValidationService'),
  MetricsService: Symbol.for('MetricsService'),
  LicenseAuditService: Symbol.for('LicenseAuditService'),

  // Phase 5 Optimization & Monitoring Adapters
  IPerformanceMetricAdapter: Symbol.for('IPerformanceMetricAdapter'),
  IMaterializedViewRefreshJobAdapter: Symbol.for('IMaterializedViewRefreshJobAdapter'),
  LicenseValidationAdapter: Symbol.for('LicenseValidationAdapter'),
  LicenseMonitoringAdapter: Symbol.for('LicenseMonitoringAdapter'),
  UserMemberLinkAdapter: Symbol.for('UserMemberLinkAdapter'),
  ILicenseAuditAdapter: Symbol.for('ILicenseAuditAdapter'),

  // Phase 5 Optimization & Monitoring Repositories
  IPerformanceMetricRepository: Symbol.for('IPerformanceMetricRepository'),
  IMaterializedViewRefreshJobRepository: Symbol.for('IMaterializedViewRefreshJobRepository'),
  LicenseValidationRepository: Symbol.for('LicenseValidationRepository'),
  LicenseMonitoringRepository: Symbol.for('LicenseMonitoringRepository'),
  ILicenseAuditRepository: Symbol.for('ILicenseAuditRepository'),

  // Encryption Services
  EncryptionService: Symbol.for('EncryptionService'),
  EncryptionKeyManager: Symbol.for('EncryptionKeyManager'),
  EncryptionStrategy: Symbol.for('EncryptionStrategy'),
  IEncryptionKeyAdapter: Symbol.for('IEncryptionKeyAdapter'),
  IEncryptionKeyRepository: Symbol.for('IEncryptionKeyRepository'),

  // Adapters
  MemberAdapter: Symbol.for('MemberAdapter'),
  UserAdapter: Symbol.for('UserAdapter'),

  // User Role Service
  UserRoleService: Symbol.for('UserRoleService'),

  // RBAC Adapters
  IRoleAdapter: Symbol.for('IRoleAdapter'),
  IPermissionAdapter: Symbol.for('IPermissionAdapter'),
  IRolePermissionAdapter: Symbol.for('IRolePermissionAdapter'),
  IUserRoleManagementAdapter: Symbol.for('IUserRoleManagementAdapter'),
  IFeatureCatalogAdapter: Symbol.for('IFeatureCatalogAdapter'),
  ITenantFeatureGrantAdapter: Symbol.for('ITenantFeatureGrantAdapter'),
  IDelegationAdapter: Symbol.for('IDelegationAdapter'),
  IRbacAuditAdapter: Symbol.for('IRbacAuditAdapter'),
  IPublishingAdapter: Symbol.for('IPublishingAdapter'),

  // Licensing Adapters
  IProductOfferingAdapter: Symbol.for('IProductOfferingAdapter'),
  IProductOfferingPriceAdapter: Symbol.for('IProductOfferingPriceAdapter'),
  ILicenseFeatureBundleAdapter: Symbol.for('ILicenseFeatureBundleAdapter'),
  ILicenseAssignmentAdapter: Symbol.for('ILicenseAssignmentAdapter'),
  IFeaturePermissionAdapter: Symbol.for('IFeaturePermissionAdapter'),
  IPermissionRoleTemplateAdapter: Symbol.for('IPermissionRoleTemplateAdapter'),

  // RBAC Repositories
  IRoleRepository: Symbol.for('IRoleRepository'),
  IPermissionRepository: Symbol.for('IPermissionRepository'),
  IUserRoleManagementRepository: Symbol.for('IUserRoleManagementRepository'),
  IRolePermissionRepository: Symbol.for('IRolePermissionRepository'),
  IFeatureCatalogRepository: Symbol.for('IFeatureCatalogRepository'),
  ITenantFeatureGrantRepository: Symbol.for('ITenantFeatureGrantRepository'),
  IDelegationRepository: Symbol.for('IDelegationRepository'),
  IRbacAuditRepository: Symbol.for('IRbacAuditRepository'),
  IPublishingRepository: Symbol.for('IPublishingRepository'),

  // Licensing Repositories
  IProductOfferingRepository: Symbol.for('IProductOfferingRepository'),
  IProductOfferingPriceRepository: Symbol.for('IProductOfferingPriceRepository'),
  ILicenseFeatureBundleRepository: Symbol.for('ILicenseFeatureBundleRepository'),
  ILicenseAssignmentRepository: Symbol.for('ILicenseAssignmentRepository'),
  IFeaturePermissionRepository: Symbol.for('IFeaturePermissionRepository'),
  IPermissionRoleTemplateRepository: Symbol.for('IPermissionRoleTemplateRepository'),

  // Onboarding
  IOnboardingProgressAdapter: Symbol.for('IOnboardingProgressAdapter'),
  IOnboardingProgressRepository: Symbol.for('IOnboardingProgressRepository'),

  ChartOfAccountService: Symbol.for('ChartOfAccountService'),
  IAccountAdapter: Symbol.for('IAccountAdapter'),
  IAccountRepository: Symbol.for('IAccountRepository'),
  AccountService: Symbol.for('AccountService'),
  IAnnouncementAdapter: Symbol.for('IAnnouncementAdapter'),
  IActivityLogAdapter: Symbol.for('IActivityLogAdapter'),
  IActivityLogRepository: Symbol.for('IActivityLogRepository'),
  IAnnouncementRepository: Symbol.for('IAnnouncementRepository'),
  IAuthAdapter: Symbol.for('IAuthAdapter'),
  IAuthUserAdapter: Symbol.for('IAuthUserAdapter'),
  IAuthRepository: Symbol.for('IAuthRepository'),
  IBudgetAdapter: Symbol.for('IBudgetAdapter'),
  IBudgetRepository: Symbol.for('IBudgetRepository'),
  BudgetService: Symbol.for('BudgetService'),
  ICategoryAdapter: Symbol.for('ICategoryAdapter'),
  ICategoryRepository: Symbol.for('ICategoryRepository'),
  IChartOfAccountAdapter: Symbol.for('IChartOfAccountAdapter'),
  IChartOfAccountRepository: Symbol.for('IChartOfAccountRepository'),
  IErrorLogAdapter: Symbol.for('IErrorLogAdapter'),
  IErrorLogRepository: Symbol.for('IErrorLogRepository'),
  IFamilyRelationshipAdapter: Symbol.for('IFamilyRelationshipAdapter'),
  IFamilyRelationshipRepository: Symbol.for('IFamilyRelationshipRepository'),
  IFinanceDashboardAdapter: Symbol.for('IFinanceDashboardAdapter'),
  IFinanceDashboardRepository: Symbol.for('IFinanceDashboardRepository'),
  IFinancialReportAdapter: Symbol.for('IFinancialReportAdapter'),
  IFinancialReportRepository: Symbol.for('IFinancialReportRepository'),
  IFinancialSourceAdapter: Symbol.for('IFinancialSourceAdapter'),
  IFinancialSourceRepository: Symbol.for('IFinancialSourceRepository'),
  FinancialSourceService: Symbol.for('FinancialSourceService'),
  IFinancialTransactionAdapter: Symbol.for('IFinancialTransactionAdapter'),
  IFinancialTransactionHeaderRepository: Symbol.for('IFinancialTransactionHeaderRepository'),
  IFinancialTransactionHeaderAdapter: Symbol.for('IFinancialTransactionHeaderAdapter'),
  IFinancialTransactionRepository: Symbol.for('IFinancialTransactionRepository'),
  IFiscalPeriodAdapter: Symbol.for('IFiscalPeriodAdapter'),
  IFiscalPeriodRepository: Symbol.for('IFiscalPeriodRepository'),
  IFiscalYearAdapter: Symbol.for('IFiscalYearAdapter'),
  IFiscalYearRepository: Symbol.for('IFiscalYearRepository'),
  FiscalYearService: Symbol.for('FiscalYearService'),
  IFundBalanceAdapter: Symbol.for('IFundBalanceAdapter'),
  IFundBalanceRepository: Symbol.for('IFundBalanceRepository'),
  IFundAdapter: Symbol.for('IFundAdapter'),
  IFundRepository: Symbol.for('IFundRepository'),
  FundService: Symbol.for('FundService'),
  IIncomeDashboardAdapter: Symbol.for('IIncomeDashboardAdapter'),
  IIncomeDashboardRepository: Symbol.for('IIncomeDashboardRepository'),
  IIncomeExpenseTransactionAdapter: Symbol.for('IIncomeExpenseTransactionAdapter'),
  IIncomeExpenseTransactionMappingRepository: Symbol.for('IIncomeExpenseTransactionMappingRepository'),
  IIncomeExpenseTransactionMappingAdapter: Symbol.for('IIncomeExpenseTransactionMappingAdapter'),
  IIncomeExpenseTransactionRepository: Symbol.for('IIncomeExpenseTransactionRepository'),
  IIncomeExpenseTransactionRpcAdapter: Symbol.for('IIncomeExpenseTransactionRpcAdapter'),
  IIncomeExpenseTransactionRpcRepository: Symbol.for('IIncomeExpenseTransactionRpcRepository'),
  ILicenseAdapter: Symbol.for('ILicenseAdapter'),
  ILicenseFeatureAdapter: Symbol.for('ILicenseFeatureAdapter'),
  ILicenseFeatureRepository: Symbol.for('ILicenseFeatureRepository'),
  // ILicensePlanAdapter: REMOVED - feature_packages table dropped (legacy licensing)
  // ILicensePlanRepository: REMOVED - feature_packages table dropped (legacy licensing)
  ILicenseRepository: Symbol.for('ILicenseRepository'),
  IMemberAdapter: Symbol.for('IMemberAdapter'),
  IMemberRepository: Symbol.for('IMemberRepository'),
  IMemberHouseholdAdapter: Symbol.for('IMemberHouseholdAdapter'),
  IMemberHouseholdRepository: Symbol.for('IMemberHouseholdRepository'),
  IMembersDashboardAdapter: Symbol.for('IMembersDashboardAdapter'),
  IMembersDashboardRepository: Symbol.for('IMembersDashboardRepository'),
  MembersDashboardService: Symbol.for('MembersDashboardService'),
  IMembershipStageAdapter: Symbol.for('IMembershipStageAdapter'),
  IMembershipStageRepository: Symbol.for('IMembershipStageRepository'),
  IMembershipCenterAdapter: Symbol.for('IMembershipCenterAdapter'),
  IMembershipCenterRepository: Symbol.for('IMembershipCenterRepository'),
  IMembershipStageHistoryAdapter: Symbol.for('IMembershipStageHistoryAdapter'),
  IMembershipStageHistoryRepository: Symbol.for('IMembershipStageHistoryRepository'),
  IMemberCarePlanAdapter: Symbol.for('IMemberCarePlanAdapter'),
  IMemberCarePlanRepository: Symbol.for('IMemberCarePlanRepository'),
  // IMemberServingAssignmentAdapter: REMOVED - table dropped, using ministry_teams instead
  // IMemberServingAssignmentRepository: REMOVED - table dropped, using ministry_teams instead
  IMemberDiscipleshipPlanAdapter: Symbol.for('IMemberDiscipleshipPlanAdapter'),
  IMemberDiscipleshipPlanRepository: Symbol.for('IMemberDiscipleshipPlanRepository'),
  IDiscipleshipPathwayAdapter: Symbol.for('IDiscipleshipPathwayAdapter'),
  IDiscipleshipPathwayRepository: Symbol.for('IDiscipleshipPathwayRepository'),
  IMemberDiscipleshipMilestoneAdapter: Symbol.for('IMemberDiscipleshipMilestoneAdapter'),
  IMemberDiscipleshipMilestoneRepository: Symbol.for('IMemberDiscipleshipMilestoneRepository'),
  IMemberGivingProfileAdapter: Symbol.for('IMemberGivingProfileAdapter'),
  IMemberGivingProfileRepository: Symbol.for('IMemberGivingProfileRepository'),
  IMemberProfileAdapter: Symbol.for('IMemberProfileAdapter'),
  IMemberProfileRepository: Symbol.for('IMemberProfileRepository'),
  IMemberTagAdapter: Symbol.for('IMemberTagAdapter'),
  IMemberTagRepository: Symbol.for('IMemberTagRepository'),
  IMemberReportsAdapter: Symbol.for('IMemberReportsAdapter'),
  IMemberReportsRepository: Symbol.for('IMemberReportsRepository'),
  MemberReportsService: Symbol.for('MemberReportsService'),
  IMemberTimelineEventAdapter: Symbol.for('IMemberTimelineEventAdapter'),
  IMemberTimelineEventRepository: Symbol.for('IMemberTimelineEventRepository'),
  IMemberInvitationAdapter: Symbol.for('IMemberInvitationAdapter'),
  IMembershipTypeAdapter: Symbol.for('IMembershipTypeAdapter'),
  IMembershipTypeRepository: Symbol.for('IMembershipTypeRepository'),
  IMessageAdapter: Symbol.for('IMessageAdapter'),
  IMessageThreadAdapter: Symbol.for('IMessageThreadAdapter'),
  INotificationAdapter: Symbol.for('INotificationAdapter'),
  INotificationRepository: Symbol.for('INotificationRepository'),
  INotificationQueueAdapter: Symbol.for('INotificationQueueAdapter'),
  INotificationQueueRepository: Symbol.for('INotificationQueueRepository'),
  INotificationPreferenceAdapter: Symbol.for('INotificationPreferenceAdapter'),
  INotificationPreferenceRepository: Symbol.for('INotificationPreferenceRepository'),
  INotificationTemplateAdapter: Symbol.for('INotificationTemplateAdapter'),
  INotificationTemplateRepository: Symbol.for('INotificationTemplateRepository'),
  NotificationBusService: Symbol.for('NotificationBusService'),
  NotificationService: Symbol.for('NotificationService'),
  NotificationQueueService: Symbol.for('NotificationQueueService'),
  ChannelDispatcher: Symbol.for('ChannelDispatcher'),
  InAppChannel: Symbol.for('InAppChannel'),
  EmailChannel: Symbol.for('EmailChannel'),
  SmsChannel: Symbol.for('SmsChannel'),
  PushChannel: Symbol.for('PushChannel'),
  WebhookChannel: Symbol.for('WebhookChannel'),
  INotificationService: Symbol.for('INotificationService'),
  INotificationQueueService: Symbol.for('INotificationQueueService'),

  // Push Device Token (Firebase)
  IPushDeviceTokenAdapter: Symbol.for('IPushDeviceTokenAdapter'),
  IPushDeviceTokenRepository: Symbol.for('IPushDeviceTokenRepository'),
  IPushDeviceTokenService: Symbol.for('IPushDeviceTokenService'),

  IOfferingBatchAdapter: Symbol.for('IOfferingBatchAdapter'),
  IOpeningBalanceRepository: Symbol.for('IOpeningBalanceRepository'),
  IOpeningBalanceAdapter: Symbol.for('IOpeningBalanceAdapter'),
  OpeningBalanceService: Symbol.for('OpeningBalanceService'),
  IRelationshipTypeAdapter: Symbol.for('IRelationshipTypeAdapter'),
  IRelationshipTypeRepository: Symbol.for('IRelationshipTypeRepository'),
  ISettingAdapter: Symbol.for('ISettingAdapter'),
  ISettingRepository: Symbol.for('ISettingRepository'),
  SettingService: Symbol.for('SettingService'),
  ISourceRecentTransactionAdapter: Symbol.for('ISourceRecentTransactionAdapter'),
  ISubscriptionAdapter: Symbol.for('ISubscriptionAdapter'),
  ISubscriptionRepository: Symbol.for('ISubscriptionRepository'),
  ITenantAdapter: Symbol.for('ITenantAdapter'),
  ITenantRepository: Symbol.for('ITenantRepository'),
  IUiModuleRepository: Symbol.for('IUiModuleRepository'),
  IncomeExpenseTransactionService: Symbol.for('IncomeExpenseTransactionService'),
  LicenseFeatureService: Symbol.for('LicenseFeatureService'),
  MemberHouseholdService: Symbol.for('MemberHouseholdService'),

  // Family Management
  IFamilyAdapter: Symbol.for('IFamilyAdapter'),
  IFamilyRepository: Symbol.for('IFamilyRepository'),
  IFamilyMemberAdapter: Symbol.for('IFamilyMemberAdapter'),
  IFamilyMemberRepository: Symbol.for('IFamilyMemberRepository'),
  FamilyService: Symbol.for('FamilyService'),
  MemberProfileService: Symbol.for('MemberProfileService'),
  MemberCarePlanService: Symbol.for('MemberCarePlanService'),
  MemberDiscipleshipPlanService: Symbol.for('MemberDiscipleshipPlanService'),
  DiscipleshipPathwayService: Symbol.for('DiscipleshipPathwayService'),
  MemberDiscipleshipMilestoneService: Symbol.for('MemberDiscipleshipMilestoneService'),
  RequestContext: Symbol.for('RequestContext'),
  TenantService: Symbol.for('TenantService'),
  MemberService: Symbol.for('MemberService'),
  MembershipTypeService: Symbol.for('MembershipTypeService'),
  MembershipStageService: Symbol.for('MembershipStageService'),
  UserMemberLinkService: Symbol.for('UserMemberLinkService'),

  // Religious Denomination
  IReligiousDenominationAdapter: Symbol.for('IReligiousDenominationAdapter'),
  IReligiousDenominationRepository: Symbol.for('IReligiousDenominationRepository'),
  ReligiousDenominationService: Symbol.for('ReligiousDenominationService'),
  UserMemberLinkRepository: Symbol.for('UserMemberLinkRepository'),
  MemberInvitationRepository: Symbol.for('MemberInvitationRepository'),

  // Feature Onboarding Services & Plugins
  FeatureOnboardingOrchestratorService: Symbol.for('FeatureOnboardingOrchestratorService'),
  MembershipOnboardingPlugin: Symbol.for('MembershipOnboardingPlugin'),

  // Planning Calendar Feature
  ICalendarCategoryAdapter: Symbol.for('ICalendarCategoryAdapter'),
  ICalendarCategoryRepository: Symbol.for('ICalendarCategoryRepository'),
  ICalendarEventAdapter: Symbol.for('ICalendarEventAdapter'),
  ICalendarEventRepository: Symbol.for('ICalendarEventRepository'),
  PlanningService: Symbol.for('PlanningService'),

  // Planning Notebooks Feature (OneNote-style)
  INotebookAdapter: Symbol.for('INotebookAdapter'),
  INotebookRepository: Symbol.for('INotebookRepository'),
  NotebookService: Symbol.for('NotebookService'),

  // Admin Dashboard Feature
  IAdminDashboardAdapter: Symbol.for('IAdminDashboardAdapter'),
  IAdminDashboardRepository: Symbol.for('IAdminDashboardRepository'),
  AdminDashboardService: Symbol.for('AdminDashboardService'),

  // Discount System
  IDiscountAdapter: Symbol.for('IDiscountAdapter'),
  IDiscountRepository: Symbol.for('IDiscountRepository'),
  DiscountService: Symbol.for('DiscountService'),

  // Goals & Objectives Feature
  IGoalCategoryAdapter: Symbol.for('IGoalCategoryAdapter'),
  IGoalCategoryRepository: Symbol.for('IGoalCategoryRepository'),
  IGoalAdapter: Symbol.for('IGoalAdapter'),
  IGoalRepository: Symbol.for('IGoalRepository'),
  IObjectiveAdapter: Symbol.for('IObjectiveAdapter'),
  IObjectiveRepository: Symbol.for('IObjectiveRepository'),
  IKeyResultAdapter: Symbol.for('IKeyResultAdapter'),
  IKeyResultRepository: Symbol.for('IKeyResultRepository'),
  IKeyResultProgressUpdateAdapter: Symbol.for('IKeyResultProgressUpdateAdapter'),
  IKeyResultProgressUpdateRepository: Symbol.for('IKeyResultProgressUpdateRepository'),
  GoalCategoryService: Symbol.for('GoalCategoryService'),
  GoalsService: Symbol.for('GoalsService'),
  GoalMetricsService: Symbol.for('GoalMetricsService'),

  // Scheduler Feature - Ministry Management
  IMinistryAdapter: Symbol.for('IMinistryAdapter'),
  IMinistryRepository: Symbol.for('IMinistryRepository'),
  IMinistryTeamAdapter: Symbol.for('IMinistryTeamAdapter'),
  IMinistryTeamRepository: Symbol.for('IMinistryTeamRepository'),
  IMinistryScheduleAdapter: Symbol.for('IMinistryScheduleAdapter'),
  IMinistryScheduleRepository: Symbol.for('IMinistryScheduleRepository'),

  // Scheduler Feature - Schedule Occurrences
  IScheduleOccurrenceAdapter: Symbol.for('IScheduleOccurrenceAdapter'),
  IScheduleOccurrenceRepository: Symbol.for('IScheduleOccurrenceRepository'),
  IScheduleTeamAssignmentAdapter: Symbol.for('IScheduleTeamAssignmentAdapter'),
  IScheduleTeamAssignmentRepository: Symbol.for('IScheduleTeamAssignmentRepository'),

  // Scheduler Feature - Registrations & Attendance
  IScheduleRegistrationAdapter: Symbol.for('IScheduleRegistrationAdapter'),
  IScheduleRegistrationRepository: Symbol.for('IScheduleRegistrationRepository'),
  IScheduleAttendanceAdapter: Symbol.for('IScheduleAttendanceAdapter'),
  IScheduleAttendanceRepository: Symbol.for('IScheduleAttendanceRepository'),

  // Scheduler Services
  MinistryService: Symbol.for('MinistryService'),
  SchedulerService: Symbol.for('SchedulerService'),
  ScheduleOccurrenceService: Symbol.for('ScheduleOccurrenceService'),
  ScheduleRegistrationService: Symbol.for('ScheduleRegistrationService'),
  ScheduleAttendanceService: Symbol.for('ScheduleAttendanceService'),
  ScheduleRegistrationPaymentService: Symbol.for('ScheduleRegistrationPaymentService'),

  // Background Job Services
  ScheduledEventsService: Symbol.for('ScheduledEventsService'),

  // Category Services
  IncomeCategoryService: Symbol.for('IncomeCategoryService'),

  // Excel Import Service (Onboarding)
  ExcelImportService: Symbol.for('ExcelImportService'),

  // Feature Import (Licensing)
  IFeatureImportAdapter: Symbol.for('IFeatureImportAdapter'),
  IFeatureImportRepository: Symbol.for('IFeatureImportRepository'),
  FeatureImportService: Symbol.for('FeatureImportService'),

  // Member Import (Bulk)
  IMemberImportAdapter: Symbol.for('IMemberImportAdapter'),
  IMemberImportRepository: Symbol.for('IMemberImportRepository'),
  MemberImportService: Symbol.for('MemberImportService'),

  // Scheduled Notification (Background Jobs)
  IScheduledNotificationAdapter: Symbol.for('IScheduledNotificationAdapter'),
  IScheduledNotificationRepository: Symbol.for('IScheduledNotificationRepository'),

  // Storage
  IStorageAdapter: Symbol.for('IStorageAdapter'),
  IStorageRepository: Symbol.for('IStorageRepository'),
  StorageService: Symbol.for('StorageService'),

  // Media Gallery
  IMediaAdapter: Symbol.for('IMediaAdapter'),
  IMediaRepository: Symbol.for('IMediaRepository'),
  MediaService: Symbol.for('MediaService'),

  // Donation System (Online Giving with Xendit)
  IDonationAdapter: Symbol.for('IDonationAdapter'),
  IDonationRepository: Symbol.for('IDonationRepository'),
  DonationService: Symbol.for('DonationService'),

  ICampaignAdapter: Symbol.for('ICampaignAdapter'),
  ICampaignRepository: Symbol.for('ICampaignRepository'),
  CampaignService: Symbol.for('CampaignService'),

  IDonorPaymentMethodAdapter: Symbol.for('IDonorPaymentMethodAdapter'),
  IDonorPaymentMethodRepository: Symbol.for('IDonorPaymentMethodRepository'),
  DonorPaymentMethodService: Symbol.for('DonorPaymentMethodService'),

  IDonationWebhookAdapter: Symbol.for('IDonationWebhookAdapter'),
  IDonationWebhookRepository: Symbol.for('IDonationWebhookRepository'),
  DonationWebhookService: Symbol.for('DonationWebhookService'),

  IDonationFeeConfigAdapter: Symbol.for('IDonationFeeConfigAdapter'),
  IDonationFeeConfigRepository: Symbol.for('IDonationFeeConfigRepository'),
  DonationFeeService: Symbol.for('DonationFeeService'),
  DonationConfigService: Symbol.for('DonationConfigService'),

  // Recurring Donation Service
  RecurringDonationService: Symbol.for('RecurringDonationService'),

  // Recurring Charge History
  IRecurringChargeHistoryAdapter: Symbol.for('IRecurringChargeHistoryAdapter'),
  IRecurringChargeHistoryRepository: Symbol.for('IRecurringChargeHistoryRepository'),

  // Disbursement System (Automated Payouts)
  IDisbursementAdapter: Symbol.for('IDisbursementAdapter'),
  IDisbursementRepository: Symbol.for('IDisbursementRepository'),
  DisbursementService: Symbol.for('DisbursementService'),

  // XenPlatform Integration (Multi-tenant sub-accounts)
  XenPlatformService: Symbol.for('XenPlatformService'),

  // AI Credits System
  AICreditService: Symbol.for('AICreditService'),
  AICreditPackageService: Symbol.for('AICreditPackageService'),
  AICreditPurchaseService: Symbol.for('AICreditPurchaseService'),
  AICreditTransactionService: Symbol.for('AICreditTransactionService'),

  // AI Credits Repositories
  IAICreditRepository: Symbol.for('IAICreditRepository'),
  IAICreditPackageRepository: Symbol.for('IAICreditPackageRepository'),
  IAICreditPurchaseRepository: Symbol.for('IAICreditPurchaseRepository'),
  IAICreditTransactionRepository: Symbol.for('IAICreditTransactionRepository'),

  // AI Credits Adapters
  IAICreditAdapter: Symbol.for('IAICreditAdapter'),
  IAICreditPackageAdapter: Symbol.for('IAICreditPackageAdapter'),
  IAICreditPurchaseAdapter: Symbol.for('IAICreditPurchaseAdapter'),
  IAICreditTransactionAdapter: Symbol.for('IAICreditTransactionAdapter'),

  // ==================== Communication Module ====================
  // Note: These are separate from the Donation Campaign system

  // Communication Services
  CommunicationService: Symbol.for('CommunicationService'),
  CommCampaignService: Symbol.for('CommCampaignService'),
  TemplateService: Symbol.for('TemplateService'),
  RecipientService: Symbol.for('RecipientService'),
  DeliveryService: Symbol.for('DeliveryService'),
  CommunicationAIService: Symbol.for('CommunicationAIService'),
  FacebookChannelService: Symbol.for('FacebookChannelService'),

  // Communication Adapters
  ICommCampaignAdapter: Symbol.for('ICommCampaignAdapter'),
  ITemplateAdapter: Symbol.for('ITemplateAdapter'),
  IRecipientAdapter: Symbol.for('IRecipientAdapter'),
  IPreferenceAdapter: Symbol.for('IPreferenceAdapter'),

  // Communication Repositories
  ICommCampaignRepository: Symbol.for('ICommCampaignRepository'),
  ITemplateRepository: Symbol.for('ITemplateRepository'),
  IRecipientRepository: Symbol.for('IRecipientRepository'),
  IPreferenceRepository: Symbol.for('IPreferenceRepository'),

  // ==================== Global Search ====================
  ISearchAdapter: Symbol.for('ISearchAdapter'),
  ISearchRepository: Symbol.for('ISearchRepository'),
  SearchService: Symbol.for('SearchService'),
} as const;

export type TypeBindings = typeof TYPES;
export type TypeKey = keyof TypeBindings;
