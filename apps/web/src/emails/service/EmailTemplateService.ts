/**
 * ================================================================================
 * EMAIL TEMPLATE SERVICE
 * ================================================================================
 *
 * Service for rendering email templates with React Email.
 * Integrates with the notification system's EmailChannel.
 *
 * ================================================================================
 */

import 'server-only';
import * as React from 'react';
import { renderEmail } from '../render';

// General Templates
import { NotificationEmail } from '../templates/NotificationEmail';
import { WelcomeEmail } from '../templates/WelcomeEmail';
import { InviteEmail } from '../templates/InviteEmail';
import { PasswordResetEmail } from '../templates/PasswordResetEmail';
import { EmailVerificationEmail } from '../templates/EmailVerificationEmail';

// Member Templates
import { MemberJoinedEmail } from '../templates/MemberJoinedEmail';
import { MemberUpdatedEmail } from '../templates/MemberUpdatedEmail';

// Care Plan Templates
import { CarePlanAssignedEmail } from '../templates/CarePlanAssignedEmail';
import { CarePlanFollowUpEmail } from '../templates/CarePlanFollowUpEmail';
import { CarePlanMemberNotificationEmail } from '../templates/CarePlanMemberNotificationEmail';
import { CarePlanUpdatedEmail } from '../templates/CarePlanUpdatedEmail';
import { CarePlanClosedEmail } from '../templates/CarePlanClosedEmail';

// Discipleship Plan Templates
import { DiscipleshipPlanCreatedEmail } from '../templates/DiscipleshipPlanCreatedEmail';
import { DiscipleshipPlanUpdatedEmail } from '../templates/DiscipleshipPlanUpdatedEmail';
import { DiscipleshipPlanCompletedEmail } from '../templates/DiscipleshipPlanCompletedEmail';
import { DiscipleshipMilestoneEmail } from '../templates/DiscipleshipMilestoneEmail';
import { DiscipleshipMilestoneDueEmail } from '../templates/DiscipleshipMilestoneDueEmail';

// Finance Templates
import { DonationReceivedEmail } from '../templates/DonationReceivedEmail';
import { PledgeReminderEmail } from '../templates/PledgeReminderEmail';
import { BudgetAlertEmail } from '../templates/BudgetAlertEmail';

// Event Templates
import { EventReminderEmail } from '../templates/EventReminderEmail';
import { EventCancelledEmail } from '../templates/EventCancelledEmail';
import { EventUpdatedEmail } from '../templates/EventUpdatedEmail';

// RBAC Templates
import { RoleAssignedEmail } from '../templates/RoleAssignedEmail';
import { RoleRevokedEmail } from '../templates/RoleRevokedEmail';
import { PermissionChangedEmail } from '../templates/PermissionChangedEmail';
import { DelegationAssignedEmail } from '../templates/DelegationAssignedEmail';
import { DelegationExpiringEmail } from '../templates/DelegationExpiringEmail';
import { DelegationExpiredEmail } from '../templates/DelegationExpiredEmail';

// License Templates
import { LicenseExpiringEmail } from '../templates/LicenseExpiringEmail';
import { LicenseExpiredEmail } from '../templates/LicenseExpiredEmail';
import { LicenseUpgradedEmail } from '../templates/LicenseUpgradedEmail';

// Goals & Objectives Templates
import { GoalAssignedEmail } from '../templates/GoalAssignedEmail';
import { GoalStatusChangedEmail } from '../templates/GoalStatusChangedEmail';
import { ObjectiveAssignedEmail } from '../templates/ObjectiveAssignedEmail';
import { KeyResultUpdateDueEmail } from '../templates/KeyResultUpdateDueEmail';
import { KeyResultCompletedEmail } from '../templates/KeyResultCompletedEmail';

// Birthday & Anniversary Templates
import { BirthdayGreetingEmail } from '../templates/BirthdayGreetingEmail';
import { AnniversaryGreetingEmail } from '../templates/AnniversaryGreetingEmail';

// System Templates
import { SystemMaintenanceEmail } from '../templates/SystemMaintenanceEmail';
import { SystemAnnouncementEmail } from '../templates/SystemAnnouncementEmail';
import { ErrorReportEmail } from '../templates/ErrorReportEmail';

// Subscription Templates
import { TenantSubscriptionWelcomeEmail } from '../templates/TenantSubscriptionWelcomeEmail';
import { SubscriptionGracePeriodEmail } from '../templates/SubscriptionGracePeriodEmail';

/** Default base URL for email assets */
const DEFAULT_BASE_URL = 'https://stewardtrack.com';

export interface EmailRenderOptions {
  recipientName?: string;
  tenantName?: string;
  tenantLogoUrl?: string;
  /** Base URL for assets (logos, links). Defaults to https://stewardtrack.com */
  baseUrl?: string;
}

// =============================================================================
// General Email Data Interfaces
// =============================================================================

export interface NotificationEmailData {
  title: string;
  body: string;
  actionUrl?: string;
  actionLabel?: string;
  category?: string;
}

export interface WelcomeEmailData {
  recipientName: string;
  tenantName: string;
  loginUrl: string;
  tenantLogoUrl?: string;
  customMessage?: string;
  baseUrl?: string;
}

export interface InviteEmailData {
  recipientName?: string;
  inviterName: string;
  tenantName: string;
  roleName?: string;
  invitationUrl: string;
  tenantLogoUrl?: string;
  expiresIn?: string;
  personalMessage?: string;
  baseUrl?: string;
}

export interface PasswordResetEmailData {
  recipientName?: string;
  resetUrl: string;
  expiresIn?: string;
  baseUrl?: string;
}

export interface EmailVerificationEmailData {
  recipientName: string;
  verificationUrl: string;
  churchName: string;
  expiresIn?: string;
  baseUrl?: string;
}

// =============================================================================
// Member Email Data Interfaces
// =============================================================================

export interface MemberJoinedEmailData {
  recipientName: string;
  memberName: string;
  joinedDate: string;
  membershipType?: string;
  welcomeMessage?: string;
  profileUrl?: string;
}

export interface MemberUpdatedEmailData {
  recipientName: string;
  memberName: string;
  updatedDate: string;
  updatedBy?: string;
  changedFields?: string[];
  profileUrl?: string;
}

// =============================================================================
// Care Plan Email Data Interfaces
// =============================================================================

export interface CarePlanAssignedEmailData {
  recipientName: string;
  memberName: string;
  followUpDate?: string;
  careContext?: string;
  carePlanUrl: string;
}

export interface CarePlanFollowUpEmailData {
  recipientName: string;
  memberName: string;
  followUpDate: string;
  daysUntilFollowUp: number;
  carePlanUrl: string;
}

export interface CarePlanMemberNotificationEmailData {
  recipientName: string;
  caregiverName?: string;
  followUpDate?: string;
  carePlanUrl?: string;
}

export interface CarePlanUpdatedEmailData {
  recipientName: string;
  memberName: string;
  updateSummary?: string;
  newStatus?: string;
  updatedBy?: string;
  carePlanUrl?: string;
}

export interface CarePlanClosedEmailData {
  recipientName: string;
  memberName: string;
  closureReason?: string;
  summary?: string;
  closedBy?: string;
  dashboardUrl?: string;
}

// =============================================================================
// Discipleship Plan Email Data Interfaces
// =============================================================================

export interface DiscipleshipPlanCreatedEmailData {
  recipientName: string;
  isRecipientMember?: boolean;
  memberName: string;
  pathwayName: string;
  mentorName?: string;
  nextStep?: string;
  planUrl: string;
}

export interface DiscipleshipPlanUpdatedEmailData {
  recipientName: string;
  memberName: string;
  pathwayName: string;
  updateSummary?: string;
  updatedBy?: string;
  planUrl?: string;
}

export interface DiscipleshipPlanCompletedEmailData {
  recipientName: string;
  memberName: string;
  pathwayName: string;
  completionDate: string;
  milestonesCompleted?: number;
  mentorName?: string;
  nextStepsUrl?: string;
}

export interface DiscipleshipMilestoneEmailData {
  recipientName: string;
  isRecipientMember?: boolean;
  memberName: string;
  milestoneName: string;
  pathwayName: string;
  message?: string;
  planUrl: string;
}

export interface DiscipleshipMilestoneDueEmailData {
  recipientName: string;
  memberName: string;
  milestoneName: string;
  pathwayName: string;
  dueDate: string;
  isOverdue?: boolean;
  planUrl?: string;
}

// =============================================================================
// Finance Email Data Interfaces
// =============================================================================

export interface DonationReceivedEmailData {
  recipientName: string;
  amount: string;
  donationDate: string;
  fundName?: string;
  transactionId?: string;
  isRecurring?: boolean;
  receiptUrl?: string;
}

export interface PledgeReminderEmailData {
  recipientName: string;
  pledgeName: string;
  totalPledged: string;
  amountPaid: string;
  amountRemaining: string;
  nextPaymentDate?: string;
  nextPaymentAmount?: string;
  isOverdue?: boolean;
  giveUrl?: string;
}

export interface BudgetAlertEmailData {
  recipientName: string;
  budgetName: string;
  alertType: 'warning' | 'exceeded' | 'info';
  currentSpend: string;
  budgetLimit: string;
  percentUsed: number;
  remainingBudget?: string;
  periodName?: string;
  budgetUrl?: string;
}

// =============================================================================
// Event Email Data Interfaces
// =============================================================================

export interface EventReminderEmailData {
  recipientName: string;
  eventTitle: string;
  eventDate: string;
  eventTime?: string;
  eventLocation?: string;
  eventDescription?: string;
  reminderType?: 'day_before' | 'hour_before' | 'week_before';
  eventUrl?: string;
}

export interface EventCancelledEmailData {
  recipientName: string;
  eventTitle: string;
  originalDate: string;
  originalTime?: string;
  cancellationReason?: string;
  refundInfo?: string;
  alternativeEventUrl?: string;
  calendarUrl?: string;
}

export interface EventUpdatedEmailData {
  recipientName: string;
  eventTitle: string;
  changes: Array<{
    field: string;
    oldValue?: string;
    newValue: string;
  }>;
  eventDate: string;
  eventTime?: string;
  eventLocation?: string;
  eventUrl?: string;
}

// =============================================================================
// RBAC Email Data Interfaces
// =============================================================================

export interface RoleAssignedEmailData {
  recipientName: string;
  roleName: string;
  roleDescription?: string;
  assignedBy?: string;
  effectiveDate?: string;
  permissions?: string[];
  dashboardUrl?: string;
}

export interface RoleRevokedEmailData {
  recipientName: string;
  roleName: string;
  reason?: string;
  revokedBy?: string;
  effectiveDate?: string;
  remainingRoles?: string[];
  contactUrl?: string;
}

export interface PermissionChangedEmailData {
  recipientName: string;
  roleName: string;
  addedPermissions?: string[];
  removedPermissions?: string[];
  changedBy?: string;
  effectiveDate?: string;
  dashboardUrl?: string;
}

export interface DelegationAssignedEmailData {
  recipientName: string;
  delegatorName: string;
  roleName: string;
  scope?: string;
  startDate: string;
  endDate: string;
  permissions?: string[];
  dashboardUrl?: string;
}

export interface DelegationExpiringEmailData {
  recipientName: string;
  delegatorName: string;
  roleName: string;
  expirationDate: string;
  daysRemaining: number;
  dashboardUrl?: string;
}

export interface DelegationExpiredEmailData {
  recipientName: string;
  delegatorName: string;
  roleName: string;
  scope?: string;
  expiredDate: string;
  contactUrl?: string;
}

// =============================================================================
// License Email Data Interfaces
// =============================================================================

export interface LicenseExpiringEmailData {
  recipientName: string;
  licenseTier: string;
  expirationDate: string;
  daysRemaining: number;
  renewalUrl?: string;
  features?: string[];
}

export interface LicenseExpiredEmailData {
  recipientName: string;
  licenseTier: string;
  expiredDate: string;
  gracePeriodDays?: number;
  renewalUrl?: string;
  supportEmail?: string;
}

export interface LicenseUpgradedEmailData {
  recipientName: string;
  previousTier: string;
  newTier: string;
  effectiveDate: string;
  newFeatures?: string[];
  dashboardUrl?: string;
}

// =============================================================================
// Goals & Objectives Email Data Interfaces
// =============================================================================

export interface GoalAssignedEmailData {
  recipientName: string;
  goalTitle: string;
  goalDescription?: string;
  assignedBy?: string;
  dueDate?: string;
  objectivesCount?: number;
  goalUrl?: string;
}

export interface GoalStatusChangedEmailData {
  recipientName: string;
  goalTitle: string;
  previousStatus: string;
  newStatus: string;
  changedBy?: string;
  progressPercent?: number;
  goalUrl?: string;
}

export interface ObjectiveAssignedEmailData {
  recipientName: string;
  objectiveTitle: string;
  goalTitle: string;
  assignedBy?: string;
  dueDate?: string;
  keyResultsCount?: number;
  objectiveUrl?: string;
}

export interface KeyResultUpdateDueEmailData {
  recipientName: string;
  keyResultTitle: string;
  objectiveTitle: string;
  goalTitle: string;
  currentValue?: number;
  targetValue?: number;
  unit?: string;
  dueDate: string;
  isOverdue?: boolean;
  updateUrl?: string;
}

export interface KeyResultCompletedEmailData {
  recipientName: string;
  keyResultTitle: string;
  objectiveTitle: string;
  goalTitle?: string;
  completedDate: string;
  completedBy?: string;
  finalValue?: string;
  targetValue?: string;
  objectiveUrl?: string;
}

// =============================================================================
// Birthday & Anniversary Email Data Interfaces
// =============================================================================

export interface BirthdayGreetingEmailData {
  recipientName: string;
  memberPhotoUrl?: string;
  customMessage?: string;
  age?: number;
  profileUrl?: string;
}

export interface AnniversaryGreetingEmailData {
  recipientName: string;
  spouseName?: string;
  years?: number;
  customMessage?: string;
  profileUrl?: string;
}

// =============================================================================
// System Email Data Interfaces
// =============================================================================

export interface SystemMaintenanceEmailData {
  recipientName: string;
  maintenanceType: string;
  scheduledStart: string;
  scheduledEnd?: string;
  expectedDuration?: string;
  affectedServices?: string[];
  reason?: string;
  statusPageUrl?: string;
}

export interface SystemAnnouncementEmailData {
  recipientName: string;
  announcementTitle: string;
  announcementBody: string;
  announcementType?: 'info' | 'update' | 'feature' | 'important';
  effectiveDate?: string;
  actionUrl?: string;
  actionLabel?: string;
}

export interface ErrorReportEmailData {
  errorMessage: string;
  stackTrace?: string;
  componentStack?: string;
  userFeedback?: string;
  userEmail?: string;
  userName?: string;
  tenantName?: string;
  errorUrl?: string;
  userAgent?: string;
  timestamp: string;
  errorId?: string;
}

// =============================================================================
// Subscription Email Data Interfaces
// =============================================================================

export interface TenantSubscriptionWelcomeEmailData {
  adminName: string;
  tenantName: string;
  subscriptionTier: string;
  isTrial?: boolean;
  trialDays?: number;
  dashboardUrl: string;
  baseUrl?: string;
}

export interface SubscriptionGracePeriodEmailData {
  recipientName: string;
  tenantName: string;
  subscriptionTier: string;
  daysRemaining: number;
  gracePeriodEndDate: string;
  paymentUrl?: string;
  supportEmail?: string;
}

// =============================================================================
// General Email Render Functions
// =============================================================================

/**
 * Renders a notification email template to HTML.
 */
export async function renderNotificationEmail(
  data: NotificationEmailData,
  options: EmailRenderOptions = {}
): Promise<string> {
  const element = React.createElement(NotificationEmail, {
    recipientName: options.recipientName,
    title: data.title,
    body: data.body,
    actionUrl: data.actionUrl,
    actionLabel: data.actionLabel,
    tenantName: options.tenantName,
    tenantLogoUrl: options.tenantLogoUrl,
    category: data.category,
    baseUrl: options.baseUrl || DEFAULT_BASE_URL,
  });

  return await renderEmail(element);
}

/**
 * Renders a welcome email template to HTML.
 */
export async function renderWelcomeEmail(
  data: WelcomeEmailData,
  options: EmailRenderOptions = {}
): Promise<string> {
  const element = React.createElement(WelcomeEmail, {
    recipientName: data.recipientName,
    tenantName: data.tenantName,
    tenantLogoUrl: data.tenantLogoUrl || options.tenantLogoUrl,
    loginUrl: data.loginUrl,
    customMessage: data.customMessage,
    baseUrl: data.baseUrl || options.baseUrl || DEFAULT_BASE_URL,
  });

  return await renderEmail(element);
}

/**
 * Renders an invite email template to HTML.
 */
export async function renderInviteEmail(
  data: InviteEmailData,
  options: EmailRenderOptions = {}
): Promise<string> {
  const element = React.createElement(InviteEmail, {
    recipientName: data.recipientName,
    inviterName: data.inviterName,
    tenantName: data.tenantName,
    tenantLogoUrl: data.tenantLogoUrl || options.tenantLogoUrl,
    roleName: data.roleName,
    invitationUrl: data.invitationUrl,
    expiresIn: data.expiresIn,
    personalMessage: data.personalMessage,
    baseUrl: data.baseUrl || options.baseUrl || DEFAULT_BASE_URL,
  });

  return await renderEmail(element);
}

/**
 * Renders a password reset email template to HTML.
 */
export async function renderPasswordResetEmail(
  data: PasswordResetEmailData,
  options: EmailRenderOptions = {}
): Promise<string> {
  const element = React.createElement(PasswordResetEmail, {
    recipientName: data.recipientName || options.recipientName,
    resetUrl: data.resetUrl,
    expiresIn: data.expiresIn,
    baseUrl: data.baseUrl || options.baseUrl || DEFAULT_BASE_URL,
  });

  return await renderEmail(element);
}

/**
 * Renders an email verification email template to HTML.
 * Sent to new users during registration to verify their email address.
 */
export async function renderEmailVerificationEmail(
  data: EmailVerificationEmailData,
  options: EmailRenderOptions = {}
): Promise<string> {
  const element = React.createElement(EmailVerificationEmail, {
    recipientName: data.recipientName,
    verificationUrl: data.verificationUrl,
    churchName: data.churchName,
    expiresIn: data.expiresIn,
    baseUrl: data.baseUrl || options.baseUrl || DEFAULT_BASE_URL,
  });

  return await renderEmail(element);
}

// =============================================================================
// Member Email Render Functions
// =============================================================================

/**
 * Renders a member joined email template to HTML.
 */
export async function renderMemberJoinedEmail(
  data: MemberJoinedEmailData,
  options: EmailRenderOptions = {}
): Promise<string> {
  const element = React.createElement(MemberJoinedEmail, {
    recipientName: data.recipientName,
    memberName: data.memberName,
    joinedDate: data.joinedDate,
    membershipType: data.membershipType,
    welcomeMessage: data.welcomeMessage,
    profileUrl: data.profileUrl,
    tenantName: options.tenantName,
    baseUrl: options.baseUrl || DEFAULT_BASE_URL,
  });

  return await renderEmail(element);
}

/**
 * Renders a member updated email template to HTML.
 */
export async function renderMemberUpdatedEmail(
  data: MemberUpdatedEmailData,
  options: EmailRenderOptions = {}
): Promise<string> {
  const element = React.createElement(MemberUpdatedEmail, {
    recipientName: data.recipientName,
    memberName: data.memberName,
    updatedDate: data.updatedDate,
    updatedBy: data.updatedBy,
    changedFields: data.changedFields,
    profileUrl: data.profileUrl,
    tenantName: options.tenantName,
    baseUrl: options.baseUrl || DEFAULT_BASE_URL,
  });

  return await renderEmail(element);
}

// =============================================================================
// Care Plan Email Render Functions
// =============================================================================

/**
 * Renders a care plan assigned email template to HTML.
 */
export async function renderCarePlanAssignedEmail(
  data: CarePlanAssignedEmailData,
  options: EmailRenderOptions = {}
): Promise<string> {
  const element = React.createElement(CarePlanAssignedEmail, {
    recipientName: data.recipientName,
    memberName: data.memberName,
    followUpDate: data.followUpDate,
    careContext: data.careContext,
    carePlanUrl: data.carePlanUrl,
    tenantName: options.tenantName,
    baseUrl: options.baseUrl || DEFAULT_BASE_URL,
  });

  return await renderEmail(element);
}

/**
 * Renders a care plan follow-up reminder email template to HTML.
 */
export async function renderCarePlanFollowUpEmail(
  data: CarePlanFollowUpEmailData,
  options: EmailRenderOptions = {}
): Promise<string> {
  const element = React.createElement(CarePlanFollowUpEmail, {
    recipientName: data.recipientName,
    memberName: data.memberName,
    followUpDate: data.followUpDate,
    daysUntilFollowUp: data.daysUntilFollowUp,
    carePlanUrl: data.carePlanUrl,
    tenantName: options.tenantName,
    baseUrl: options.baseUrl || DEFAULT_BASE_URL,
  });

  return await renderEmail(element);
}

/**
 * Renders a care plan member notification email template to HTML.
 * Sent to the member who is receiving care.
 */
export async function renderCarePlanMemberNotificationEmail(
  data: CarePlanMemberNotificationEmailData,
  options: EmailRenderOptions = {}
): Promise<string> {
  const element = React.createElement(CarePlanMemberNotificationEmail, {
    recipientName: data.recipientName,
    caregiverName: data.caregiverName,
    followUpDate: data.followUpDate,
    carePlanUrl: data.carePlanUrl,
    tenantName: options.tenantName,
    baseUrl: options.baseUrl || DEFAULT_BASE_URL,
  });

  return await renderEmail(element);
}

/**
 * Renders a care plan updated email template to HTML.
 */
export async function renderCarePlanUpdatedEmail(
  data: CarePlanUpdatedEmailData,
  options: EmailRenderOptions = {}
): Promise<string> {
  const element = React.createElement(CarePlanUpdatedEmail, {
    recipientName: data.recipientName,
    memberName: data.memberName,
    updateSummary: data.updateSummary,
    newStatus: data.newStatus,
    updatedBy: data.updatedBy,
    carePlanUrl: data.carePlanUrl,
    tenantName: options.tenantName,
    baseUrl: options.baseUrl || DEFAULT_BASE_URL,
  });

  return await renderEmail(element);
}

/**
 * Renders a care plan closed email template to HTML.
 */
export async function renderCarePlanClosedEmail(
  data: CarePlanClosedEmailData,
  options: EmailRenderOptions = {}
): Promise<string> {
  const element = React.createElement(CarePlanClosedEmail, {
    recipientName: data.recipientName,
    memberName: data.memberName,
    closureReason: data.closureReason,
    summary: data.summary,
    closedBy: data.closedBy,
    dashboardUrl: data.dashboardUrl,
    tenantName: options.tenantName,
    baseUrl: options.baseUrl || DEFAULT_BASE_URL,
  });

  return await renderEmail(element);
}

// =============================================================================
// Discipleship Plan Email Render Functions
// =============================================================================

/**
 * Renders a discipleship plan created email template to HTML.
 */
export async function renderDiscipleshipPlanCreatedEmail(
  data: DiscipleshipPlanCreatedEmailData,
  options: EmailRenderOptions = {}
): Promise<string> {
  const element = React.createElement(DiscipleshipPlanCreatedEmail, {
    recipientName: data.recipientName,
    isRecipientMember: data.isRecipientMember,
    memberName: data.memberName,
    pathwayName: data.pathwayName,
    mentorName: data.mentorName,
    nextStep: data.nextStep,
    planUrl: data.planUrl,
    tenantName: options.tenantName,
    baseUrl: options.baseUrl || DEFAULT_BASE_URL,
  });

  return await renderEmail(element);
}

/**
 * Renders a discipleship plan updated email template to HTML.
 */
export async function renderDiscipleshipPlanUpdatedEmail(
  data: DiscipleshipPlanUpdatedEmailData,
  options: EmailRenderOptions = {}
): Promise<string> {
  const element = React.createElement(DiscipleshipPlanUpdatedEmail, {
    recipientName: data.recipientName,
    memberName: data.memberName,
    pathwayName: data.pathwayName,
    updateSummary: data.updateSummary,
    updatedBy: data.updatedBy,
    planUrl: data.planUrl,
    tenantName: options.tenantName,
    baseUrl: options.baseUrl || DEFAULT_BASE_URL,
  });

  return await renderEmail(element);
}

/**
 * Renders a discipleship plan completed email template to HTML.
 */
export async function renderDiscipleshipPlanCompletedEmail(
  data: DiscipleshipPlanCompletedEmailData,
  options: EmailRenderOptions = {}
): Promise<string> {
  const element = React.createElement(DiscipleshipPlanCompletedEmail, {
    recipientName: data.recipientName,
    memberName: data.memberName,
    pathwayName: data.pathwayName,
    completionDate: data.completionDate,
    milestonesCompleted: data.milestonesCompleted,
    mentorName: data.mentorName,
    nextStepsUrl: data.nextStepsUrl,
    tenantName: options.tenantName,
    baseUrl: options.baseUrl || DEFAULT_BASE_URL,
  });

  return await renderEmail(element);
}

/**
 * Renders a discipleship milestone email template to HTML.
 */
export async function renderDiscipleshipMilestoneEmail(
  data: DiscipleshipMilestoneEmailData,
  options: EmailRenderOptions = {}
): Promise<string> {
  const element = React.createElement(DiscipleshipMilestoneEmail, {
    recipientName: data.recipientName,
    isRecipientMember: data.isRecipientMember,
    memberName: data.memberName,
    milestoneName: data.milestoneName,
    pathwayName: data.pathwayName,
    message: data.message,
    planUrl: data.planUrl,
    tenantName: options.tenantName,
    baseUrl: options.baseUrl || DEFAULT_BASE_URL,
  });

  return await renderEmail(element);
}

/**
 * Renders a discipleship milestone due email template to HTML.
 */
export async function renderDiscipleshipMilestoneDueEmail(
  data: DiscipleshipMilestoneDueEmailData,
  options: EmailRenderOptions = {}
): Promise<string> {
  const element = React.createElement(DiscipleshipMilestoneDueEmail, {
    recipientName: data.recipientName,
    memberName: data.memberName,
    milestoneName: data.milestoneName,
    pathwayName: data.pathwayName,
    dueDate: data.dueDate,
    isOverdue: data.isOverdue,
    planUrl: data.planUrl,
    tenantName: options.tenantName,
    baseUrl: options.baseUrl || DEFAULT_BASE_URL,
  });

  return await renderEmail(element);
}

// =============================================================================
// Finance Email Render Functions
// =============================================================================

/**
 * Renders a donation received email template to HTML.
 */
export async function renderDonationReceivedEmail(
  data: DonationReceivedEmailData,
  options: EmailRenderOptions = {}
): Promise<string> {
  const element = React.createElement(DonationReceivedEmail, {
    recipientName: data.recipientName,
    amount: data.amount,
    donationDate: data.donationDate,
    fundName: data.fundName,
    transactionId: data.transactionId,
    isRecurring: data.isRecurring,
    receiptUrl: data.receiptUrl,
    tenantName: options.tenantName,
    baseUrl: options.baseUrl || DEFAULT_BASE_URL,
  });

  return await renderEmail(element);
}

/**
 * Renders a pledge reminder email template to HTML.
 */
export async function renderPledgeReminderEmail(
  data: PledgeReminderEmailData,
  options: EmailRenderOptions = {}
): Promise<string> {
  const element = React.createElement(PledgeReminderEmail, {
    recipientName: data.recipientName,
    pledgeName: data.pledgeName,
    totalPledged: data.totalPledged,
    amountPaid: data.amountPaid,
    amountRemaining: data.amountRemaining,
    nextPaymentDate: data.nextPaymentDate,
    nextPaymentAmount: data.nextPaymentAmount,
    isOverdue: data.isOverdue,
    giveUrl: data.giveUrl,
    tenantName: options.tenantName,
    baseUrl: options.baseUrl || DEFAULT_BASE_URL,
  });

  return await renderEmail(element);
}

/**
 * Renders a budget alert email template to HTML.
 */
export async function renderBudgetAlertEmail(
  data: BudgetAlertEmailData,
  options: EmailRenderOptions = {}
): Promise<string> {
  const element = React.createElement(BudgetAlertEmail, {
    recipientName: data.recipientName,
    budgetName: data.budgetName,
    alertType: data.alertType,
    currentSpend: data.currentSpend,
    budgetLimit: data.budgetLimit,
    percentUsed: data.percentUsed,
    remainingBudget: data.remainingBudget,
    periodName: data.periodName,
    budgetUrl: data.budgetUrl,
    tenantName: options.tenantName,
    baseUrl: options.baseUrl || DEFAULT_BASE_URL,
  });

  return await renderEmail(element);
}

// =============================================================================
// Event Email Render Functions
// =============================================================================

/**
 * Renders an event reminder email template to HTML.
 */
export async function renderEventReminderEmail(
  data: EventReminderEmailData,
  options: EmailRenderOptions = {}
): Promise<string> {
  const element = React.createElement(EventReminderEmail, {
    recipientName: data.recipientName,
    eventTitle: data.eventTitle,
    eventDate: data.eventDate,
    eventTime: data.eventTime,
    eventLocation: data.eventLocation,
    eventDescription: data.eventDescription,
    reminderType: data.reminderType,
    eventUrl: data.eventUrl,
    tenantName: options.tenantName,
    baseUrl: options.baseUrl || DEFAULT_BASE_URL,
  });

  return await renderEmail(element);
}

/**
 * Renders an event cancelled email template to HTML.
 */
export async function renderEventCancelledEmail(
  data: EventCancelledEmailData,
  options: EmailRenderOptions = {}
): Promise<string> {
  const element = React.createElement(EventCancelledEmail, {
    recipientName: data.recipientName,
    eventTitle: data.eventTitle,
    originalDate: data.originalDate,
    originalTime: data.originalTime,
    cancellationReason: data.cancellationReason,
    refundInfo: data.refundInfo,
    alternativeEventUrl: data.alternativeEventUrl,
    calendarUrl: data.calendarUrl,
    tenantName: options.tenantName,
    baseUrl: options.baseUrl || DEFAULT_BASE_URL,
  });

  return await renderEmail(element);
}

/**
 * Renders an event updated email template to HTML.
 */
export async function renderEventUpdatedEmail(
  data: EventUpdatedEmailData,
  options: EmailRenderOptions = {}
): Promise<string> {
  const element = React.createElement(EventUpdatedEmail, {
    recipientName: data.recipientName,
    eventTitle: data.eventTitle,
    changes: data.changes,
    eventDate: data.eventDate,
    eventTime: data.eventTime,
    eventLocation: data.eventLocation,
    eventUrl: data.eventUrl,
    tenantName: options.tenantName,
    baseUrl: options.baseUrl || DEFAULT_BASE_URL,
  });

  return await renderEmail(element);
}

// =============================================================================
// RBAC Email Render Functions
// =============================================================================

/**
 * Renders a role assigned email template to HTML.
 */
export async function renderRoleAssignedEmail(
  data: RoleAssignedEmailData,
  options: EmailRenderOptions = {}
): Promise<string> {
  const element = React.createElement(RoleAssignedEmail, {
    recipientName: data.recipientName,
    roleName: data.roleName,
    roleDescription: data.roleDescription,
    assignedBy: data.assignedBy,
    effectiveDate: data.effectiveDate,
    permissions: data.permissions,
    dashboardUrl: data.dashboardUrl,
    tenantName: options.tenantName,
    baseUrl: options.baseUrl || DEFAULT_BASE_URL,
  });

  return await renderEmail(element);
}

/**
 * Renders a role revoked email template to HTML.
 */
export async function renderRoleRevokedEmail(
  data: RoleRevokedEmailData,
  options: EmailRenderOptions = {}
): Promise<string> {
  const element = React.createElement(RoleRevokedEmail, {
    recipientName: data.recipientName,
    roleName: data.roleName,
    reason: data.reason,
    revokedBy: data.revokedBy,
    effectiveDate: data.effectiveDate,
    remainingRoles: data.remainingRoles,
    contactUrl: data.contactUrl,
    tenantName: options.tenantName,
    baseUrl: options.baseUrl || DEFAULT_BASE_URL,
  });

  return await renderEmail(element);
}

/**
 * Renders a permission changed email template to HTML.
 */
export async function renderPermissionChangedEmail(
  data: PermissionChangedEmailData,
  options: EmailRenderOptions = {}
): Promise<string> {
  const element = React.createElement(PermissionChangedEmail, {
    recipientName: data.recipientName,
    roleName: data.roleName,
    addedPermissions: data.addedPermissions,
    removedPermissions: data.removedPermissions,
    changedBy: data.changedBy,
    effectiveDate: data.effectiveDate,
    dashboardUrl: data.dashboardUrl,
    tenantName: options.tenantName,
    baseUrl: options.baseUrl || DEFAULT_BASE_URL,
  });

  return await renderEmail(element);
}

/**
 * Renders a delegation assigned email template to HTML.
 */
export async function renderDelegationAssignedEmail(
  data: DelegationAssignedEmailData,
  options: EmailRenderOptions = {}
): Promise<string> {
  const element = React.createElement(DelegationAssignedEmail, {
    recipientName: data.recipientName,
    delegatorName: data.delegatorName,
    roleName: data.roleName,
    scope: data.scope,
    startDate: data.startDate,
    endDate: data.endDate,
    permissions: data.permissions,
    dashboardUrl: data.dashboardUrl,
    tenantName: options.tenantName,
    baseUrl: options.baseUrl || DEFAULT_BASE_URL,
  });

  return await renderEmail(element);
}

/**
 * Renders a delegation expiring email template to HTML.
 */
export async function renderDelegationExpiringEmail(
  data: DelegationExpiringEmailData,
  options: EmailRenderOptions = {}
): Promise<string> {
  const element = React.createElement(DelegationExpiringEmail, {
    recipientName: data.recipientName,
    delegatorName: data.delegatorName,
    roleName: data.roleName,
    expirationDate: data.expirationDate,
    daysRemaining: data.daysRemaining,
    dashboardUrl: data.dashboardUrl,
    tenantName: options.tenantName,
    baseUrl: options.baseUrl || DEFAULT_BASE_URL,
  });

  return await renderEmail(element);
}

/**
 * Renders a delegation expired email template to HTML.
 */
export async function renderDelegationExpiredEmail(
  data: DelegationExpiredEmailData,
  options: EmailRenderOptions = {}
): Promise<string> {
  const element = React.createElement(DelegationExpiredEmail, {
    recipientName: data.recipientName,
    delegatorName: data.delegatorName,
    roleName: data.roleName,
    scope: data.scope,
    expiredDate: data.expiredDate,
    contactUrl: data.contactUrl,
    tenantName: options.tenantName,
    baseUrl: options.baseUrl || DEFAULT_BASE_URL,
  });

  return await renderEmail(element);
}

// =============================================================================
// License Email Render Functions
// =============================================================================

/**
 * Renders a license expiring email template to HTML.
 */
export async function renderLicenseExpiringEmail(
  data: LicenseExpiringEmailData,
  options: EmailRenderOptions = {}
): Promise<string> {
  const element = React.createElement(LicenseExpiringEmail, {
    recipientName: data.recipientName,
    licenseTier: data.licenseTier,
    expirationDate: data.expirationDate,
    daysRemaining: data.daysRemaining,
    renewalUrl: data.renewalUrl,
    features: data.features,
    tenantName: options.tenantName,
    baseUrl: options.baseUrl || DEFAULT_BASE_URL,
  });

  return await renderEmail(element);
}

/**
 * Renders a license expired email template to HTML.
 */
export async function renderLicenseExpiredEmail(
  data: LicenseExpiredEmailData,
  options: EmailRenderOptions = {}
): Promise<string> {
  const element = React.createElement(LicenseExpiredEmail, {
    recipientName: data.recipientName,
    licenseTier: data.licenseTier,
    expiredDate: data.expiredDate,
    gracePeriodDays: data.gracePeriodDays,
    renewalUrl: data.renewalUrl,
    supportEmail: data.supportEmail,
    tenantName: options.tenantName,
    baseUrl: options.baseUrl || DEFAULT_BASE_URL,
  });

  return await renderEmail(element);
}

/**
 * Renders a license upgraded email template to HTML.
 */
export async function renderLicenseUpgradedEmail(
  data: LicenseUpgradedEmailData,
  options: EmailRenderOptions = {}
): Promise<string> {
  const element = React.createElement(LicenseUpgradedEmail, {
    recipientName: data.recipientName,
    previousTier: data.previousTier,
    newTier: data.newTier,
    effectiveDate: data.effectiveDate,
    newFeatures: data.newFeatures,
    dashboardUrl: data.dashboardUrl,
    tenantName: options.tenantName,
    baseUrl: options.baseUrl || DEFAULT_BASE_URL,
  });

  return await renderEmail(element);
}

// =============================================================================
// Goals & Objectives Email Render Functions
// =============================================================================

/**
 * Renders a goal assigned email template to HTML.
 */
export async function renderGoalAssignedEmail(
  data: GoalAssignedEmailData,
  options: EmailRenderOptions = {}
): Promise<string> {
  const element = React.createElement(GoalAssignedEmail, {
    recipientName: data.recipientName,
    goalTitle: data.goalTitle,
    goalDescription: data.goalDescription,
    assignedBy: data.assignedBy,
    dueDate: data.dueDate,
    objectivesCount: data.objectivesCount,
    goalUrl: data.goalUrl,
    tenantName: options.tenantName,
    baseUrl: options.baseUrl || DEFAULT_BASE_URL,
  });

  return await renderEmail(element);
}

/**
 * Renders a goal status changed email template to HTML.
 */
export async function renderGoalStatusChangedEmail(
  data: GoalStatusChangedEmailData,
  options: EmailRenderOptions = {}
): Promise<string> {
  const element = React.createElement(GoalStatusChangedEmail, {
    recipientName: data.recipientName,
    goalTitle: data.goalTitle,
    previousStatus: data.previousStatus,
    newStatus: data.newStatus,
    changedBy: data.changedBy,
    progressPercent: data.progressPercent,
    goalUrl: data.goalUrl,
    tenantName: options.tenantName,
    baseUrl: options.baseUrl || DEFAULT_BASE_URL,
  });

  return await renderEmail(element);
}

/**
 * Renders an objective assigned email template to HTML.
 */
export async function renderObjectiveAssignedEmail(
  data: ObjectiveAssignedEmailData,
  options: EmailRenderOptions = {}
): Promise<string> {
  const element = React.createElement(ObjectiveAssignedEmail, {
    recipientName: data.recipientName,
    objectiveTitle: data.objectiveTitle,
    goalTitle: data.goalTitle,
    assignedBy: data.assignedBy,
    dueDate: data.dueDate,
    keyResultsCount: data.keyResultsCount,
    objectiveUrl: data.objectiveUrl,
    tenantName: options.tenantName,
    baseUrl: options.baseUrl || DEFAULT_BASE_URL,
  });

  return await renderEmail(element);
}

/**
 * Renders a key result update due email template to HTML.
 */
export async function renderKeyResultUpdateDueEmail(
  data: KeyResultUpdateDueEmailData,
  options: EmailRenderOptions = {}
): Promise<string> {
  const element = React.createElement(KeyResultUpdateDueEmail, {
    recipientName: data.recipientName,
    keyResultTitle: data.keyResultTitle,
    objectiveTitle: data.objectiveTitle,
    goalTitle: data.goalTitle,
    currentValue: data.currentValue,
    targetValue: data.targetValue,
    unit: data.unit,
    dueDate: data.dueDate,
    isOverdue: data.isOverdue,
    updateUrl: data.updateUrl,
    tenantName: options.tenantName,
    baseUrl: options.baseUrl || DEFAULT_BASE_URL,
  });

  return await renderEmail(element);
}

/**
 * Renders a key result completed email template to HTML.
 */
export async function renderKeyResultCompletedEmail(
  data: KeyResultCompletedEmailData,
  options: EmailRenderOptions = {}
): Promise<string> {
  const element = React.createElement(KeyResultCompletedEmail, {
    recipientName: data.recipientName,
    keyResultTitle: data.keyResultTitle,
    objectiveTitle: data.objectiveTitle,
    goalTitle: data.goalTitle,
    completedDate: data.completedDate,
    completedBy: data.completedBy,
    finalValue: data.finalValue,
    targetValue: data.targetValue,
    objectiveUrl: data.objectiveUrl,
    tenantName: options.tenantName,
    baseUrl: options.baseUrl || DEFAULT_BASE_URL,
  });

  return await renderEmail(element);
}

// =============================================================================
// Birthday & Anniversary Email Render Functions
// =============================================================================

/**
 * Renders a birthday greeting email template to HTML.
 * Includes optional member photo for a personal touch.
 */
export async function renderBirthdayGreetingEmail(
  data: BirthdayGreetingEmailData,
  options: EmailRenderOptions = {}
): Promise<string> {
  const element = React.createElement(BirthdayGreetingEmail, {
    recipientName: data.recipientName,
    memberPhotoUrl: data.memberPhotoUrl,
    customMessage: data.customMessage,
    age: data.age,
    profileUrl: data.profileUrl,
    tenantName: options.tenantName,
    baseUrl: options.baseUrl || DEFAULT_BASE_URL,
  });

  return await renderEmail(element);
}

/**
 * Renders a wedding anniversary greeting email template to HTML.
 * Celebrates marriage milestones with traditional anniversary names.
 */
export async function renderAnniversaryGreetingEmail(
  data: AnniversaryGreetingEmailData,
  options: EmailRenderOptions = {}
): Promise<string> {
  const element = React.createElement(AnniversaryGreetingEmail, {
    recipientName: data.recipientName,
    spouseName: data.spouseName,
    years: data.years,
    customMessage: data.customMessage,
    profileUrl: data.profileUrl,
    tenantName: options.tenantName,
    baseUrl: options.baseUrl || DEFAULT_BASE_URL,
  });

  return await renderEmail(element);
}

// =============================================================================
// System Email Render Functions
// =============================================================================

/**
 * Renders a system maintenance email template to HTML.
 */
export async function renderSystemMaintenanceEmail(
  data: SystemMaintenanceEmailData,
  options: EmailRenderOptions = {}
): Promise<string> {
  const element = React.createElement(SystemMaintenanceEmail, {
    recipientName: data.recipientName,
    maintenanceType: data.maintenanceType,
    scheduledStart: data.scheduledStart,
    scheduledEnd: data.scheduledEnd,
    expectedDuration: data.expectedDuration,
    affectedServices: data.affectedServices,
    reason: data.reason,
    statusPageUrl: data.statusPageUrl,
    tenantName: options.tenantName,
    baseUrl: options.baseUrl || DEFAULT_BASE_URL,
  });

  return await renderEmail(element);
}

/**
 * Renders a system announcement email template to HTML.
 */
export async function renderSystemAnnouncementEmail(
  data: SystemAnnouncementEmailData,
  options: EmailRenderOptions = {}
): Promise<string> {
  const element = React.createElement(SystemAnnouncementEmail, {
    recipientName: data.recipientName,
    announcementTitle: data.announcementTitle,
    announcementBody: data.announcementBody,
    announcementType: data.announcementType,
    effectiveDate: data.effectiveDate,
    actionUrl: data.actionUrl,
    actionLabel: data.actionLabel,
    tenantName: options.tenantName,
    baseUrl: options.baseUrl || DEFAULT_BASE_URL,
  });

  return await renderEmail(element);
}

/**
 * Renders an error report email template to HTML.
 * Used when users report unexpected errors with additional feedback.
 */
export async function renderErrorReportEmail(
  data: ErrorReportEmailData,
  options: EmailRenderOptions = {}
): Promise<string> {
  const element = React.createElement(ErrorReportEmail, {
    errorMessage: data.errorMessage,
    stackTrace: data.stackTrace,
    componentStack: data.componentStack,
    userFeedback: data.userFeedback,
    userEmail: data.userEmail,
    userName: data.userName,
    tenantName: data.tenantName,
    errorUrl: data.errorUrl,
    userAgent: data.userAgent,
    timestamp: data.timestamp,
    errorId: data.errorId,
    baseUrl: options.baseUrl || DEFAULT_BASE_URL,
  });

  return await renderEmail(element);
}

// =============================================================================
// Subscription Email Render Functions
// =============================================================================

/**
 * Renders a tenant subscription welcome email template to HTML.
 * Sent to new tenants when they subscribe/create an account.
 */
export async function renderTenantSubscriptionWelcomeEmail(
  data: TenantSubscriptionWelcomeEmailData,
  options: EmailRenderOptions = {}
): Promise<string> {
  const element = React.createElement(TenantSubscriptionWelcomeEmail, {
    adminName: data.adminName,
    tenantName: data.tenantName,
    subscriptionTier: data.subscriptionTier,
    isTrial: data.isTrial,
    trialDays: data.trialDays,
    dashboardUrl: data.dashboardUrl,
    baseUrl: data.baseUrl || options.baseUrl || DEFAULT_BASE_URL,
  });

  return await renderEmail(element);
}

/**
 * Renders a subscription grace period warning email template to HTML.
 * Sent to tenants when their payment is overdue and they are in the grace period.
 */
export async function renderSubscriptionGracePeriodEmail(
  data: SubscriptionGracePeriodEmailData,
  options: EmailRenderOptions = {}
): Promise<string> {
  const element = React.createElement(SubscriptionGracePeriodEmail, {
    recipientName: data.recipientName,
    tenantName: data.tenantName,
    subscriptionTier: data.subscriptionTier,
    daysRemaining: data.daysRemaining,
    gracePeriodEndDate: data.gracePeriodEndDate,
    paymentUrl: data.paymentUrl,
    supportEmail: data.supportEmail,
    baseUrl: options.baseUrl || DEFAULT_BASE_URL,
  });

  return await renderEmail(element);
}

// =============================================================================
// Dynamic Template Rendering
// =============================================================================

/**
 * Template type for type-safe template selection.
 */
export type EmailTemplateType =
  // General
  | 'notification'
  | 'welcome'
  | 'invite'
  | 'password-reset'
  | 'email-verification'
  // Member
  | 'member-joined'
  | 'member-updated'
  // Care Plan
  | 'care-plan-assigned'
  | 'care-plan-follow-up'
  | 'care-plan-member-notification'
  | 'care-plan-updated'
  | 'care-plan-closed'
  // Discipleship
  | 'discipleship-plan-created'
  | 'discipleship-plan-updated'
  | 'discipleship-plan-completed'
  | 'discipleship-milestone'
  | 'discipleship-milestone-due'
  // Finance
  | 'donation-received'
  | 'pledge-reminder'
  | 'budget-alert'
  // Events
  | 'event-reminder'
  | 'event-cancelled'
  | 'event-updated'
  // RBAC
  | 'role-assigned'
  | 'role-revoked'
  | 'permission-changed'
  | 'delegation-assigned'
  | 'delegation-expiring'
  | 'delegation-expired'
  // License
  | 'license-expiring'
  | 'license-expired'
  | 'license-upgraded'
  // Goals & Objectives
  | 'goal-assigned'
  | 'goal-status-changed'
  | 'objective-assigned'
  | 'key-result-update-due'
  | 'key-result-completed'
  // Birthday & Anniversary
  | 'birthday-greeting'
  | 'anniversary-greeting'
  // System
  | 'system-maintenance'
  | 'system-announcement'
  | 'error-report'
  // Subscription
  | 'tenant-subscription-welcome'
  | 'subscription-grace-period';

/**
 * Renders an email template by type.
 * Useful for dynamic template selection in the notification system.
 */
export async function renderEmailByType(
  templateType: EmailTemplateType,
  data: Record<string, unknown>,
  options: EmailRenderOptions = {}
): Promise<string> {
  switch (templateType) {
    // General
    case 'notification':
      return await renderNotificationEmail(data as unknown as NotificationEmailData, options);
    case 'welcome':
      return await renderWelcomeEmail(data as unknown as WelcomeEmailData, options);
    case 'invite':
      return await renderInviteEmail(data as unknown as InviteEmailData, options);
    case 'password-reset':
      return await renderPasswordResetEmail(data as unknown as PasswordResetEmailData, options);
    case 'email-verification':
      return await renderEmailVerificationEmail(data as unknown as EmailVerificationEmailData, options);

    // Member
    case 'member-joined':
      return await renderMemberJoinedEmail(data as unknown as MemberJoinedEmailData, options);
    case 'member-updated':
      return await renderMemberUpdatedEmail(data as unknown as MemberUpdatedEmailData, options);

    // Care Plan
    case 'care-plan-assigned':
      return await renderCarePlanAssignedEmail(data as unknown as CarePlanAssignedEmailData, options);
    case 'care-plan-follow-up':
      return await renderCarePlanFollowUpEmail(data as unknown as CarePlanFollowUpEmailData, options);
    case 'care-plan-member-notification':
      return await renderCarePlanMemberNotificationEmail(data as unknown as CarePlanMemberNotificationEmailData, options);
    case 'care-plan-updated':
      return await renderCarePlanUpdatedEmail(data as unknown as CarePlanUpdatedEmailData, options);
    case 'care-plan-closed':
      return await renderCarePlanClosedEmail(data as unknown as CarePlanClosedEmailData, options);

    // Discipleship
    case 'discipleship-plan-created':
      return await renderDiscipleshipPlanCreatedEmail(data as unknown as DiscipleshipPlanCreatedEmailData, options);
    case 'discipleship-plan-updated':
      return await renderDiscipleshipPlanUpdatedEmail(data as unknown as DiscipleshipPlanUpdatedEmailData, options);
    case 'discipleship-plan-completed':
      return await renderDiscipleshipPlanCompletedEmail(data as unknown as DiscipleshipPlanCompletedEmailData, options);
    case 'discipleship-milestone':
      return await renderDiscipleshipMilestoneEmail(data as unknown as DiscipleshipMilestoneEmailData, options);
    case 'discipleship-milestone-due':
      return await renderDiscipleshipMilestoneDueEmail(data as unknown as DiscipleshipMilestoneDueEmailData, options);

    // Finance
    case 'donation-received':
      return await renderDonationReceivedEmail(data as unknown as DonationReceivedEmailData, options);
    case 'pledge-reminder':
      return await renderPledgeReminderEmail(data as unknown as PledgeReminderEmailData, options);
    case 'budget-alert':
      return await renderBudgetAlertEmail(data as unknown as BudgetAlertEmailData, options);

    // Events
    case 'event-reminder':
      return await renderEventReminderEmail(data as unknown as EventReminderEmailData, options);
    case 'event-cancelled':
      return await renderEventCancelledEmail(data as unknown as EventCancelledEmailData, options);
    case 'event-updated':
      return await renderEventUpdatedEmail(data as unknown as EventUpdatedEmailData, options);

    // RBAC
    case 'role-assigned':
      return await renderRoleAssignedEmail(data as unknown as RoleAssignedEmailData, options);
    case 'role-revoked':
      return await renderRoleRevokedEmail(data as unknown as RoleRevokedEmailData, options);
    case 'permission-changed':
      return await renderPermissionChangedEmail(data as unknown as PermissionChangedEmailData, options);
    case 'delegation-assigned':
      return await renderDelegationAssignedEmail(data as unknown as DelegationAssignedEmailData, options);
    case 'delegation-expiring':
      return await renderDelegationExpiringEmail(data as unknown as DelegationExpiringEmailData, options);
    case 'delegation-expired':
      return await renderDelegationExpiredEmail(data as unknown as DelegationExpiredEmailData, options);

    // License
    case 'license-expiring':
      return await renderLicenseExpiringEmail(data as unknown as LicenseExpiringEmailData, options);
    case 'license-expired':
      return await renderLicenseExpiredEmail(data as unknown as LicenseExpiredEmailData, options);
    case 'license-upgraded':
      return await renderLicenseUpgradedEmail(data as unknown as LicenseUpgradedEmailData, options);

    // Goals & Objectives
    case 'goal-assigned':
      return await renderGoalAssignedEmail(data as unknown as GoalAssignedEmailData, options);
    case 'goal-status-changed':
      return await renderGoalStatusChangedEmail(data as unknown as GoalStatusChangedEmailData, options);
    case 'objective-assigned':
      return await renderObjectiveAssignedEmail(data as unknown as ObjectiveAssignedEmailData, options);
    case 'key-result-update-due':
      return await renderKeyResultUpdateDueEmail(data as unknown as KeyResultUpdateDueEmailData, options);
    case 'key-result-completed':
      return await renderKeyResultCompletedEmail(data as unknown as KeyResultCompletedEmailData, options);

    // Birthday & Anniversary
    case 'birthday-greeting':
      return await renderBirthdayGreetingEmail(data as unknown as BirthdayGreetingEmailData, options);
    case 'anniversary-greeting':
      return await renderAnniversaryGreetingEmail(data as unknown as AnniversaryGreetingEmailData, options);

    // System
    case 'system-maintenance':
      return await renderSystemMaintenanceEmail(data as unknown as SystemMaintenanceEmailData, options);
    case 'system-announcement':
      return await renderSystemAnnouncementEmail(data as unknown as SystemAnnouncementEmailData, options);
    case 'error-report':
      return await renderErrorReportEmail(data as unknown as ErrorReportEmailData, options);

    // Subscription
    case 'tenant-subscription-welcome':
      return await renderTenantSubscriptionWelcomeEmail(data as unknown as TenantSubscriptionWelcomeEmailData, options);
    case 'subscription-grace-period':
      return await renderSubscriptionGracePeriodEmail(data as unknown as SubscriptionGracePeriodEmailData, options);

    default:
      throw new Error(`Unknown email template type: ${templateType}`);
  }
}
