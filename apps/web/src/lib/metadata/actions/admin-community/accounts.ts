import type { MetadataActionExecution, MetadataActionResult } from '../types';
import { adminCommunityAccountsHandlers } from '@/lib/metadata/services/admin-community-accounts';

/**
 * Sync Members to Accounts Action Handler
 * Creates accounts for all members who don't have linked accounts
 */
async function handleSyncMembersToAccounts(
  execution: MetadataActionExecution
): Promise<MetadataActionResult> {
  console.log('[handleSyncMembersToAccounts] Starting sync action...');

  const serviceHandler = adminCommunityAccountsHandlers['admin-community.accounts.dashboard.syncMembers'];
  if (!serviceHandler) {
    throw new Error('Service handler not found: admin-community.accounts.dashboard.syncMembers');
  }

  try {
    const serviceResultRaw = await serviceHandler({
      id: 'admin-community.accounts.dashboard.syncMembers',
      role: execution.context.role ?? 'guest',
      config: execution.config ?? {},
      params: execution.context.params ?? {},
    });

    const serviceResult = serviceResultRaw as {
      success?: boolean;
      message?: string;
      created?: number;
      failed?: number;
      errors?: string[];
    };

    console.log('[handleSyncMembersToAccounts] Service result:', serviceResult);

    if (serviceResult.success) {
      return {
        success: true,
        status: 200,
        message: serviceResult.message ?? 'Sync completed successfully.',
        data: {
          created: serviceResult.created ?? 0,
          failed: serviceResult.failed ?? 0,
          errors: serviceResult.errors ?? [],
        },
      } satisfies MetadataActionResult;
    } else {
      return {
        success: false,
        status: 400,
        message: serviceResult.message ?? 'Sync failed.',
        data: {
          created: serviceResult.created ?? 0,
          failed: serviceResult.failed ?? 0,
          errors: serviceResult.errors ?? [],
        },
      } satisfies MetadataActionResult;
    }
  } catch (error) {
    console.error('[handleSyncMembersToAccounts] Failed:', error);
    return {
      success: false,
      status: 500,
      message: 'Failed to sync members to accounts. Please try again.',
      errors: {},
    } satisfies MetadataActionResult;
  }
}

/**
 * Save Account Action Handler
 * Handles create/update of an account via the manage form
 */
async function handleSaveAccount(
  execution: MetadataActionExecution
): Promise<MetadataActionResult> {
  console.log('[handleSaveAccount] Starting save action...', execution);

  const serviceHandler = adminCommunityAccountsHandlers['admin-community.accounts.manage.save'];
  if (!serviceHandler) {
    throw new Error('Service handler not found: admin-community.accounts.manage.save');
  }

  try {
    const serviceResultRaw = await serviceHandler({
      id: 'admin-community.accounts.manage.save',
      role: execution.context.role ?? 'guest',
      config: execution.config ?? {},
      params: execution.input ?? {},
    });

    const serviceResult = serviceResultRaw as {
      success?: boolean;
      message?: string;
      accountId?: string;
      redirectUrl?: string;
    };

    console.log('[handleSaveAccount] Service result:', serviceResult);

    if (serviceResult.success) {
      return {
        success: true,
        status: 200,
        message: serviceResult.message ?? 'Account saved successfully.',
        data: {
          accountId: serviceResult.accountId,
        },
        redirectUrl: serviceResult.redirectUrl ?? '/admin/community/accounts',
      } satisfies MetadataActionResult;
    } else {
      return {
        success: false,
        status: 400,
        message: serviceResult.message ?? 'Failed to save account.',
        data: {},
      } satisfies MetadataActionResult;
    }
  } catch (error) {
    console.error('[handleSaveAccount] Failed:', error);
    return {
      success: false,
      status: 500,
      message: 'Failed to save account. Please try again.',
      errors: {},
    } satisfies MetadataActionResult;
  }
}

/**
 * Delete Account Action Handler
 */
async function handleDeleteAccount(
  execution: MetadataActionExecution
): Promise<MetadataActionResult> {
  console.log('[handleDeleteAccount] Starting delete action...', execution);

  const serviceHandler = adminCommunityAccountsHandlers['admin-community.accounts.delete'];
  if (!serviceHandler) {
    throw new Error('Service handler not found: admin-community.accounts.delete');
  }

  try {
    const serviceResultRaw = await serviceHandler({
      id: 'admin-community.accounts.delete',
      role: execution.context.role ?? 'guest',
      config: execution.config ?? {},
      params: execution.context.params ?? {},
    });

    const serviceResult = serviceResultRaw as {
      success?: boolean;
      message?: string;
    };

    console.log('[handleDeleteAccount] Service result:', serviceResult);

    if (serviceResult.success) {
      return {
        success: true,
        status: 200,
        message: serviceResult.message ?? 'Account deleted successfully.',
        data: {},
      } satisfies MetadataActionResult;
    } else {
      return {
        success: false,
        status: 400,
        message: serviceResult.message ?? 'Failed to delete account.',
        data: {},
      } satisfies MetadataActionResult;
    }
  } catch (error) {
    console.error('[handleDeleteAccount] Failed:', error);
    return {
      success: false,
      status: 500,
      message: 'Failed to delete account. Please try again.',
      errors: {},
    } satisfies MetadataActionResult;
  }
}

export const accountsActionHandlers: Record<
  string,
  (execution: MetadataActionExecution) => Promise<MetadataActionResult>
> = {
  'admin-community.accounts.syncMembers': handleSyncMembersToAccounts,
  'admin-community.accounts.manage.save': handleSaveAccount,
  'admin-community.accounts.delete': handleDeleteAccount,
};
