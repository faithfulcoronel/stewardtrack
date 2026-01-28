/**
 * Finance Workflow Notifications
 *
 * This module provides notification helpers for finance workflow events:
 * - Transaction submitted → notify approvers
 * - Transaction approved → notify creator
 * - Transaction posted → notify creator
 * - Transaction voided → notify creator and admins
 * - Budget threshold reached → notify budget owners
 */

import { container } from '@/lib/container';
import { TYPES } from '@/lib/types';
import type { INotificationService } from '@/services/notification/NotificationService';
import type { CreateNotificationDto } from '@/models/notification/notification.model';
import type { IUserRoleManagementRepository } from '@/repositories/userRole.repository';

/**
 * Transaction notification data
 */
interface TransactionNotificationData {
  transactionId: string;
  transactionNumber: string;
  amount: string;
  description: string;
  creatorId: string;
  creatorName?: string;
  tenantId: string;
}

/**
 * Get users with a specific permission in a tenant using the repository layer
 */
async function getUsersWithPermission(
  permissionCode: string,
  tenantId: string
): Promise<string[]> {
  try {
    const userRoleRepository = container.get<IUserRoleManagementRepository>(
      TYPES.IUserRoleManagementRepository
    );
    return await userRoleRepository.getUsersWithPermission(permissionCode, tenantId);
  } catch (error) {
    console.error('[finance-notifications] Error getting users with permission:', error);
    return [];
  }
}

/**
 * Send notification to multiple users
 */
async function sendNotificationToUsers(
  userIds: string[],
  notification: Omit<CreateNotificationDto, 'user_id'>
): Promise<void> {
  if (userIds.length === 0) {
    console.log('[finance-notifications] No users to notify');
    return;
  }

  try {
    const notificationService = container.get<INotificationService>(TYPES.INotificationService);

    for (const userId of userIds) {
      try {
        await notificationService.createNotification({
          ...notification,
          user_id: userId,
        });
        console.log(`[finance-notifications] Notification sent to user: ${userId}`);
      } catch (error) {
        console.error(`[finance-notifications] Failed to send notification to user ${userId}:`, error);
        // Continue with other users even if one fails
      }
    }
  } catch (error) {
    console.error('[finance-notifications] Error in sendNotificationToUsers:', error);
  }
}

/**
 * Notify approvers when a transaction is submitted
 * Approvers are users with 'finance:approve' permission (typically Auditors)
 */
export async function notifyTransactionSubmitted(data: TransactionNotificationData): Promise<void> {
  console.log('[finance-notifications] Notifying approvers of submitted transaction:', data.transactionNumber);

  // Get users with approve permission (Auditors)
  const approverIds = await getUsersWithPermission('finance:approve', data.tenantId);

  // Exclude the creator from notifications (they already know they submitted it)
  const recipientIds = approverIds.filter(id => id !== data.creatorId);

  if (recipientIds.length === 0) {
    console.log('[finance-notifications] No approvers to notify');
    return;
  }

  await sendNotificationToUsers(recipientIds, {
    tenant_id: data.tenantId,
    title: 'Transaction pending approval',
    message: `Transaction ${data.transactionNumber} (${data.amount}) has been submitted for your approval. ${data.description}`,
    type: 'info',
    category: 'finance',
    priority: 'normal',
    action_type: 'redirect',
    action_payload: `/admin/finance/transactions/${data.transactionId}`,
    metadata: {
      transaction_id: data.transactionId,
      transaction_number: data.transactionNumber,
      amount: data.amount,
      workflow_event: 'submitted',
    },
  });
}

/**
 * Notify the transaction creator when their transaction is approved
 */
export async function notifyTransactionApproved(
  data: TransactionNotificationData,
  approverId: string,
  approverName?: string
): Promise<void> {
  console.log('[finance-notifications] Notifying creator of approved transaction:', data.transactionNumber);

  await sendNotificationToUsers([data.creatorId], {
    tenant_id: data.tenantId,
    title: 'Transaction approved',
    message: `Your transaction ${data.transactionNumber} (${data.amount}) has been approved${approverName ? ` by ${approverName}` : ''}. It is now ready to be posted.`,
    type: 'success',
    category: 'finance',
    priority: 'normal',
    action_type: 'redirect',
    action_payload: `/admin/finance/transactions/${data.transactionId}`,
    metadata: {
      transaction_id: data.transactionId,
      transaction_number: data.transactionNumber,
      amount: data.amount,
      approver_id: approverId,
      workflow_event: 'approved',
    },
  });
}

/**
 * Notify the transaction creator when their transaction is posted
 */
export async function notifyTransactionPosted(
  data: TransactionNotificationData,
  posterId: string,
  posterName?: string
): Promise<void> {
  console.log('[finance-notifications] Notifying creator of posted transaction:', data.transactionNumber);

  await sendNotificationToUsers([data.creatorId], {
    tenant_id: data.tenantId,
    title: 'Transaction posted',
    message: `Transaction ${data.transactionNumber} (${data.amount}) has been posted to the general ledger${posterName ? ` by ${posterName}` : ''}.`,
    type: 'success',
    category: 'finance',
    priority: 'normal',
    action_type: 'redirect',
    action_payload: `/admin/finance/transactions/${data.transactionId}`,
    metadata: {
      transaction_id: data.transactionId,
      transaction_number: data.transactionNumber,
      amount: data.amount,
      poster_id: posterId,
      workflow_event: 'posted',
    },
  });
}

/**
 * Notify the transaction creator and admins when a transaction is voided
 */
export async function notifyTransactionVoided(
  data: TransactionNotificationData,
  voidReason: string,
  voiderId: string,
  voiderName?: string
): Promise<void> {
  console.log('[finance-notifications] Notifying about voided transaction:', data.transactionNumber);

  // Get admins (users with finance:delete permission)
  const adminIds = await getUsersWithPermission('finance:delete', data.tenantId);

  // Combine creator and admins, deduplicate
  const recipientIds = [...new Set([data.creatorId, ...adminIds])];

  // Exclude the voider (they already know)
  const filteredRecipients = recipientIds.filter(id => id !== voiderId);

  if (filteredRecipients.length === 0) {
    console.log('[finance-notifications] No users to notify about voided transaction');
    return;
  }

  await sendNotificationToUsers(filteredRecipients, {
    tenant_id: data.tenantId,
    title: 'Transaction voided',
    message: `Transaction ${data.transactionNumber} (${data.amount}) has been voided${voiderName ? ` by ${voiderName}` : ''}. Reason: ${voidReason}`,
    type: 'warning',
    category: 'finance',
    priority: 'high',
    action_type: 'redirect',
    action_payload: `/admin/finance/transactions/${data.transactionId}`,
    metadata: {
      transaction_id: data.transactionId,
      transaction_number: data.transactionNumber,
      amount: data.amount,
      voider_id: voiderId,
      void_reason: voidReason,
      workflow_event: 'voided',
    },
  });
}

/**
 * Notify budget owners when budget utilization reaches a threshold
 */
export async function notifyBudgetThresholdReached(
  budgetId: string,
  budgetName: string,
  utilizationPercent: number,
  tenantId: string
): Promise<void> {
  console.log(`[finance-notifications] Budget ${budgetName} reached ${utilizationPercent}% utilization`);

  // Get users with budget permissions (typically Treasurers and Auditors)
  const budgetUserIds = await getUsersWithPermission('budgets:view', tenantId);

  if (budgetUserIds.length === 0) {
    console.log('[finance-notifications] No users to notify about budget threshold');
    return;
  }

  const thresholdType = utilizationPercent >= 100 ? 'exceeded' : 'warning';
  const notificationType = utilizationPercent >= 100 ? 'error' : 'warning';
  const priority = utilizationPercent >= 100 ? 'high' : 'normal';

  await sendNotificationToUsers(budgetUserIds, {
    tenant_id: tenantId,
    title: utilizationPercent >= 100 ? 'Budget exceeded' : 'Budget alert',
    message: utilizationPercent >= 100
      ? `Budget "${budgetName}" has exceeded 100% utilization (${utilizationPercent}%). Review spending immediately.`
      : `Budget "${budgetName}" has reached ${utilizationPercent}% utilization. Consider reviewing upcoming expenses.`,
    type: notificationType,
    category: 'finance',
    priority: priority,
    action_type: 'redirect',
    action_payload: `/admin/finance/budgets/${budgetId}`,
    metadata: {
      budget_id: budgetId,
      budget_name: budgetName,
      utilization_percent: utilizationPercent,
      threshold_type: thresholdType,
    },
  });
}

/**
 * Notify admins about fiscal year closing deadline approaching
 */
export async function notifyFiscalYearDeadline(
  fiscalYearId: string,
  fiscalYearName: string,
  daysUntilEnd: number,
  tenantId: string
): Promise<void> {
  console.log(`[finance-notifications] Fiscal year ${fiscalYearName} ending in ${daysUntilEnd} days`);

  // Get users with fiscal year management permission
  const adminIds = await getUsersWithPermission('finance:manage', tenantId);

  if (adminIds.length === 0) {
    console.log('[finance-notifications] No users to notify about fiscal year deadline');
    return;
  }

  await sendNotificationToUsers(adminIds, {
    tenant_id: tenantId,
    title: 'Fiscal year ending soon',
    message: `Fiscal year "${fiscalYearName}" ends in ${daysUntilEnd} days. Ensure all transactions are recorded and reviewed before closing.`,
    type: 'info',
    category: 'finance',
    priority: daysUntilEnd <= 7 ? 'high' : 'normal',
    action_type: 'redirect',
    action_payload: `/admin/finance/fiscal-years/${fiscalYearId}`,
    metadata: {
      fiscal_year_id: fiscalYearId,
      fiscal_year_name: fiscalYearName,
      days_until_end: daysUntilEnd,
    },
  });
}
