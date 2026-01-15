/**
 * ================================================================================
 * EMAIL TEMPLATES BARREL EXPORT
 * ================================================================================
 *
 * Central export for all email templates and components.
 *
 * Usage:
 *   import { NotificationEmail, WelcomeEmail, InviteEmail } from '@/emails';
 *   import { renderEmail } from '@/emails';
 *
 * ================================================================================
 */

// Components
export { EmailLayout } from './components/EmailLayout';
export { EmailButton } from './components/EmailButton';

// =============================================================================
// General Templates
// =============================================================================

export { NotificationEmail } from './templates/NotificationEmail';
export type { NotificationEmailProps } from './templates/NotificationEmail';

export { WelcomeEmail } from './templates/WelcomeEmail';
export type { WelcomeEmailProps } from './templates/WelcomeEmail';

export { InviteEmail } from './templates/InviteEmail';
export type { InviteEmailProps } from './templates/InviteEmail';

// =============================================================================
// Member Templates
// =============================================================================

export { MemberJoinedEmail } from './templates/MemberJoinedEmail';
export type { MemberJoinedEmailProps } from './templates/MemberJoinedEmail';

export { MemberUpdatedEmail } from './templates/MemberUpdatedEmail';
export type { MemberUpdatedEmailProps } from './templates/MemberUpdatedEmail';

// =============================================================================
// Care Plan Templates
// =============================================================================

export { CarePlanAssignedEmail } from './templates/CarePlanAssignedEmail';
export type { CarePlanAssignedEmailProps } from './templates/CarePlanAssignedEmail';

export { CarePlanFollowUpEmail } from './templates/CarePlanFollowUpEmail';
export type { CarePlanFollowUpEmailProps } from './templates/CarePlanFollowUpEmail';

export { CarePlanMemberNotificationEmail } from './templates/CarePlanMemberNotificationEmail';
export type { CarePlanMemberNotificationEmailProps } from './templates/CarePlanMemberNotificationEmail';

export { CarePlanUpdatedEmail } from './templates/CarePlanUpdatedEmail';
export type { CarePlanUpdatedEmailProps } from './templates/CarePlanUpdatedEmail';

export { CarePlanClosedEmail } from './templates/CarePlanClosedEmail';
export type { CarePlanClosedEmailProps } from './templates/CarePlanClosedEmail';

// =============================================================================
// Discipleship Plan Templates
// =============================================================================

export { DiscipleshipPlanCreatedEmail } from './templates/DiscipleshipPlanCreatedEmail';
export type { DiscipleshipPlanCreatedEmailProps } from './templates/DiscipleshipPlanCreatedEmail';

export { DiscipleshipPlanUpdatedEmail } from './templates/DiscipleshipPlanUpdatedEmail';
export type { DiscipleshipPlanUpdatedEmailProps } from './templates/DiscipleshipPlanUpdatedEmail';

export { DiscipleshipPlanCompletedEmail } from './templates/DiscipleshipPlanCompletedEmail';
export type { DiscipleshipPlanCompletedEmailProps } from './templates/DiscipleshipPlanCompletedEmail';

export { DiscipleshipMilestoneEmail } from './templates/DiscipleshipMilestoneEmail';
export type { DiscipleshipMilestoneEmailProps } from './templates/DiscipleshipMilestoneEmail';

export { DiscipleshipMilestoneDueEmail } from './templates/DiscipleshipMilestoneDueEmail';
export type { DiscipleshipMilestoneDueEmailProps } from './templates/DiscipleshipMilestoneDueEmail';

// =============================================================================
// Finance Templates
// =============================================================================

export { DonationReceivedEmail } from './templates/DonationReceivedEmail';
export type { DonationReceivedEmailProps } from './templates/DonationReceivedEmail';

export { PledgeReminderEmail } from './templates/PledgeReminderEmail';
export type { PledgeReminderEmailProps } from './templates/PledgeReminderEmail';

export { BudgetAlertEmail } from './templates/BudgetAlertEmail';
export type { BudgetAlertEmailProps } from './templates/BudgetAlertEmail';

// =============================================================================
// Event Templates
// =============================================================================

export { EventReminderEmail } from './templates/EventReminderEmail';
export type { EventReminderEmailProps } from './templates/EventReminderEmail';

export { EventCancelledEmail } from './templates/EventCancelledEmail';
export type { EventCancelledEmailProps } from './templates/EventCancelledEmail';

export { EventUpdatedEmail } from './templates/EventUpdatedEmail';
export type { EventUpdatedEmailProps } from './templates/EventUpdatedEmail';

// =============================================================================
// RBAC Templates
// =============================================================================

export { RoleAssignedEmail } from './templates/RoleAssignedEmail';
export type { RoleAssignedEmailProps } from './templates/RoleAssignedEmail';

export { RoleRevokedEmail } from './templates/RoleRevokedEmail';
export type { RoleRevokedEmailProps } from './templates/RoleRevokedEmail';

export { PermissionChangedEmail } from './templates/PermissionChangedEmail';
export type { PermissionChangedEmailProps } from './templates/PermissionChangedEmail';

export { DelegationAssignedEmail } from './templates/DelegationAssignedEmail';
export type { DelegationAssignedEmailProps } from './templates/DelegationAssignedEmail';

export { DelegationExpiringEmail } from './templates/DelegationExpiringEmail';
export type { DelegationExpiringEmailProps } from './templates/DelegationExpiringEmail';

export { DelegationExpiredEmail } from './templates/DelegationExpiredEmail';
export type { DelegationExpiredEmailProps } from './templates/DelegationExpiredEmail';

// =============================================================================
// License Templates
// =============================================================================

export { LicenseExpiringEmail } from './templates/LicenseExpiringEmail';
export type { LicenseExpiringEmailProps } from './templates/LicenseExpiringEmail';

export { LicenseExpiredEmail } from './templates/LicenseExpiredEmail';
export type { LicenseExpiredEmailProps } from './templates/LicenseExpiredEmail';

export { LicenseUpgradedEmail } from './templates/LicenseUpgradedEmail';
export type { LicenseUpgradedEmailProps } from './templates/LicenseUpgradedEmail';

// =============================================================================
// Goals & Objectives Templates
// =============================================================================

export { GoalAssignedEmail } from './templates/GoalAssignedEmail';
export type { GoalAssignedEmailProps } from './templates/GoalAssignedEmail';

export { GoalStatusChangedEmail } from './templates/GoalStatusChangedEmail';
export type { GoalStatusChangedEmailProps } from './templates/GoalStatusChangedEmail';

export { ObjectiveAssignedEmail } from './templates/ObjectiveAssignedEmail';
export type { ObjectiveAssignedEmailProps } from './templates/ObjectiveAssignedEmail';

export { KeyResultUpdateDueEmail } from './templates/KeyResultUpdateDueEmail';
export type { KeyResultUpdateDueEmailProps } from './templates/KeyResultUpdateDueEmail';

export { KeyResultCompletedEmail } from './templates/KeyResultCompletedEmail';
export type { KeyResultCompletedEmailProps } from './templates/KeyResultCompletedEmail';

// =============================================================================
// Birthday & Anniversary Templates
// =============================================================================

export { BirthdayGreetingEmail } from './templates/BirthdayGreetingEmail';
export type { BirthdayGreetingEmailProps } from './templates/BirthdayGreetingEmail';

export { AnniversaryGreetingEmail } from './templates/AnniversaryGreetingEmail';
export type { AnniversaryGreetingEmailProps } from './templates/AnniversaryGreetingEmail';

// =============================================================================
// System Templates
// =============================================================================

export { SystemMaintenanceEmail } from './templates/SystemMaintenanceEmail';
export type { SystemMaintenanceEmailProps } from './templates/SystemMaintenanceEmail';

export { SystemAnnouncementEmail } from './templates/SystemAnnouncementEmail';
export type { SystemAnnouncementEmailProps } from './templates/SystemAnnouncementEmail';

// =============================================================================
// Service Exports - Render Functions
// =============================================================================

export {
  // General
  renderNotificationEmail,
  renderWelcomeEmail,
  renderInviteEmail,
  // Member
  renderMemberJoinedEmail,
  renderMemberUpdatedEmail,
  // Care Plan
  renderCarePlanAssignedEmail,
  renderCarePlanFollowUpEmail,
  renderCarePlanMemberNotificationEmail,
  renderCarePlanUpdatedEmail,
  renderCarePlanClosedEmail,
  // Discipleship
  renderDiscipleshipPlanCreatedEmail,
  renderDiscipleshipPlanUpdatedEmail,
  renderDiscipleshipPlanCompletedEmail,
  renderDiscipleshipMilestoneEmail,
  renderDiscipleshipMilestoneDueEmail,
  // Finance
  renderDonationReceivedEmail,
  renderPledgeReminderEmail,
  renderBudgetAlertEmail,
  // Events
  renderEventReminderEmail,
  renderEventCancelledEmail,
  renderEventUpdatedEmail,
  // RBAC
  renderRoleAssignedEmail,
  renderRoleRevokedEmail,
  renderPermissionChangedEmail,
  renderDelegationAssignedEmail,
  renderDelegationExpiringEmail,
  renderDelegationExpiredEmail,
  // License
  renderLicenseExpiringEmail,
  renderLicenseExpiredEmail,
  renderLicenseUpgradedEmail,
  // Goals & Objectives
  renderGoalAssignedEmail,
  renderGoalStatusChangedEmail,
  renderObjectiveAssignedEmail,
  renderKeyResultUpdateDueEmail,
  renderKeyResultCompletedEmail,
  // Birthday & Anniversary
  renderBirthdayGreetingEmail,
  renderAnniversaryGreetingEmail,
  // System
  renderSystemMaintenanceEmail,
  renderSystemAnnouncementEmail,
  // Dynamic
  renderEmailByType,
} from './service/EmailTemplateService';

// =============================================================================
// Service Exports - Data Interfaces
// =============================================================================

export type {
  EmailRenderOptions,
  // General
  NotificationEmailData,
  WelcomeEmailData,
  InviteEmailData,
  // Member
  MemberJoinedEmailData,
  MemberUpdatedEmailData,
  // Care Plan
  CarePlanAssignedEmailData,
  CarePlanFollowUpEmailData,
  CarePlanMemberNotificationEmailData,
  CarePlanUpdatedEmailData,
  CarePlanClosedEmailData,
  // Discipleship
  DiscipleshipPlanCreatedEmailData,
  DiscipleshipPlanUpdatedEmailData,
  DiscipleshipPlanCompletedEmailData,
  DiscipleshipMilestoneEmailData,
  DiscipleshipMilestoneDueEmailData,
  // Finance
  DonationReceivedEmailData,
  PledgeReminderEmailData,
  BudgetAlertEmailData,
  // Events
  EventReminderEmailData,
  EventCancelledEmailData,
  EventUpdatedEmailData,
  // RBAC
  RoleAssignedEmailData,
  RoleRevokedEmailData,
  PermissionChangedEmailData,
  DelegationAssignedEmailData,
  DelegationExpiringEmailData,
  DelegationExpiredEmailData,
  // License
  LicenseExpiringEmailData,
  LicenseExpiredEmailData,
  LicenseUpgradedEmailData,
  // Goals & Objectives
  GoalAssignedEmailData,
  GoalStatusChangedEmailData,
  ObjectiveAssignedEmailData,
  KeyResultUpdateDueEmailData,
  KeyResultCompletedEmailData,
  // Birthday & Anniversary
  BirthdayGreetingEmailData,
  AnniversaryGreetingEmailData,
  // System
  SystemMaintenanceEmailData,
  SystemAnnouncementEmailData,
  // Template Type
  EmailTemplateType,
} from './service/EmailTemplateService';

// =============================================================================
// Render Utility
// =============================================================================

export { renderEmail, renderEmailText } from './render';
