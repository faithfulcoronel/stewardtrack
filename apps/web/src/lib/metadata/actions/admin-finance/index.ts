/**
 * Admin Finance Module - Action Handlers
 *
 * This file exports all action handlers for the admin-finance module.
 * Action handlers execute mutations and return results to the client.
 */

import type { MetadataActionExecution, MetadataActionResult } from '../types';
import { adminFinanceHandlers } from '@/lib/metadata/services/admin-finance';

// ==================== HELPER FUNCTIONS ====================

function toOptionalString(value: unknown): string | null {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
  return null;
}

function buildRedirectUrl(
  template: string | null,
  context: Record<string, unknown>
): string | null {
  if (!template) {
    return null;
  }

  let missing = false;
  const rendered = template.replace(/{{\s*([^}]+?)\s*}}/g, (_, expression: string) => {
    const value = resolvePath(context, expression.trim());
    if (value === undefined || value === null) {
      missing = true;
      return '';
    }
    const asString = String(value);
    if (!asString) {
      missing = true;
    }
    return asString;
  });

  if (missing) {
    return null;
  }

  return rendered;
}

function resolvePath(source: Record<string, unknown>, path: string): unknown {
  const segments = path
    .split('.')
    .map((segment) => segment.trim())
    .filter(Boolean);

  let current: unknown = source;
  for (const segment of segments) {
    if (!current || typeof current !== 'object' || Array.isArray(current)) {
      return undefined;
    }
    current = (current as Record<string, unknown>)[segment];
  }

  return current;
}

// ==================== CHART OF ACCOUNTS ACTIONS ====================

async function handleSaveAccount(
  execution: MetadataActionExecution
): Promise<MetadataActionResult> {
  const config = execution.config ?? {};
  const payload = execution.input as Record<string, unknown>;

  const serviceHandler = adminFinanceHandlers['admin-finance.accounts.save'];
  if (!serviceHandler) {
    throw new Error('Service handler not found: admin-finance.accounts.save');
  }

  try {
    const result = (await serviceHandler({
      params: payload,
      context: execution.context,
    })) as { success: boolean; message: string; accountId?: string };

    if (!result.success) {
      return {
        success: false,
        status: 400,
        message: result.message || 'Failed to save account.',
        errors: {},
      };
    }

    const context: Record<string, unknown> = {
      accountId: result.accountId,
      params: execution.context.params,
      data: payload,
    };

    const redirectTemplate =
      toOptionalString(config.redirectUrl) ??
      toOptionalString(config.redirectTemplate) ??
      null;
    const redirectUrl = buildRedirectUrl(redirectTemplate, context);

    return {
      success: true,
      status: 200,
      message: result.message || 'Account saved successfully.',
      redirectUrl,
      data: { accountId: result.accountId },
    };
  } catch (error) {
    console.error('[handleSaveAccount] Failed:', error);
    return {
      success: false,
      status: 500,
      message: 'Failed to save account. Please try again.',
      errors: {},
    };
  }
}

async function handleDeleteAccount(
  execution: MetadataActionExecution
): Promise<MetadataActionResult> {
  const payload = execution.input as Record<string, unknown>;

  const serviceHandler = adminFinanceHandlers['admin-finance.accounts.delete'];
  if (!serviceHandler) {
    throw new Error('Service handler not found: admin-finance.accounts.delete');
  }

  try {
    const result = (await serviceHandler({
      params: payload,
      context: execution.context,
    })) as { success: boolean; message: string };

    if (!result.success) {
      return {
        success: false,
        status: 400,
        message: result.message || 'Failed to delete account.',
        errors: {},
      };
    }

    return {
      success: true,
      status: 200,
      message: result.message || 'Account deleted successfully.',
    };
  } catch (error) {
    console.error('[handleDeleteAccount] Failed:', error);
    return {
      success: false,
      status: 500,
      message: 'Failed to delete account. Please try again.',
      errors: {},
    };
  }
}

// ==================== FINANCIAL SOURCES ACTIONS ====================

async function handleSaveSource(
  execution: MetadataActionExecution
): Promise<MetadataActionResult> {
  const config = execution.config ?? {};
  const payload = execution.input as Record<string, unknown>;

  const serviceHandler = adminFinanceHandlers['admin-finance.sources.save'];
  if (!serviceHandler) {
    throw new Error('Service handler not found: admin-finance.sources.save');
  }

  try {
    const result = (await serviceHandler({
      params: payload,
      context: execution.context,
    })) as { success: boolean; message: string; sourceId?: string };

    if (!result.success) {
      return {
        success: false,
        status: 400,
        message: result.message || 'Failed to save source.',
        errors: {},
      };
    }

    const context: Record<string, unknown> = {
      sourceId: result.sourceId,
      params: execution.context.params,
      data: payload,
    };

    const redirectTemplate =
      toOptionalString(config.redirectUrl) ??
      toOptionalString(config.redirectTemplate) ??
      null;
    const redirectUrl = buildRedirectUrl(redirectTemplate, context);

    return {
      success: true,
      status: 200,
      message: result.message || 'Source saved successfully.',
      redirectUrl,
      data: { sourceId: result.sourceId },
    };
  } catch (error) {
    console.error('[handleSaveSource] Failed:', error);
    return {
      success: false,
      status: 500,
      message: 'Failed to save source. Please try again.',
      errors: {},
    };
  }
}

async function handleDeleteSource(
  execution: MetadataActionExecution
): Promise<MetadataActionResult> {
  const payload = execution.input as Record<string, unknown>;

  const serviceHandler = adminFinanceHandlers['admin-finance.sources.delete'];
  if (!serviceHandler) {
    throw new Error('Service handler not found: admin-finance.sources.delete');
  }

  try {
    const result = (await serviceHandler({
      params: payload,
      context: execution.context,
    })) as { success: boolean; message: string };

    if (!result.success) {
      return {
        success: false,
        status: 400,
        message: result.message || 'Failed to delete source.',
        errors: {},
      };
    }

    return {
      success: true,
      status: 200,
      message: result.message || 'Source deleted successfully.',
    };
  } catch (error) {
    console.error('[handleDeleteSource] Failed:', error);
    return {
      success: false,
      status: 500,
      message: 'Failed to delete source. Please try again.',
      errors: {},
    };
  }
}

// ==================== BUDGET ACTIONS ====================

async function handleSaveBudget(
  execution: MetadataActionExecution
): Promise<MetadataActionResult> {
  const config = execution.config ?? {};
  const payload = execution.input as Record<string, unknown>;

  const serviceHandler = adminFinanceHandlers['admin-finance.budgets.save'];
  if (!serviceHandler) {
    throw new Error('Service handler not found: admin-finance.budgets.save');
  }

  try {
    const result = (await serviceHandler({
      params: payload,
      context: execution.context,
    })) as { success: boolean; message: string; budgetId?: string };

    if (!result.success) {
      return {
        success: false,
        status: 400,
        message: result.message || 'Failed to save budget.',
        errors: {},
      };
    }

    const context: Record<string, unknown> = {
      budgetId: result.budgetId,
      params: execution.context.params,
      data: payload,
    };

    const redirectTemplate =
      toOptionalString(config.redirectUrl) ??
      toOptionalString(config.redirectTemplate) ??
      null;
    const redirectUrl = buildRedirectUrl(redirectTemplate, context);

    return {
      success: true,
      status: 200,
      message: result.message || 'Budget saved successfully.',
      redirectUrl,
      data: { budgetId: result.budgetId },
    };
  } catch (error) {
    console.error('[handleSaveBudget] Failed:', error);
    return {
      success: false,
      status: 500,
      message: 'Failed to save budget. Please try again.',
      errors: {},
    };
  }
}

async function handleDeleteBudget(
  execution: MetadataActionExecution
): Promise<MetadataActionResult> {
  const payload = execution.input as Record<string, unknown>;

  const serviceHandler = adminFinanceHandlers['admin-finance.budgets.delete'];
  if (!serviceHandler) {
    throw new Error('Service handler not found: admin-finance.budgets.delete');
  }

  try {
    const result = (await serviceHandler({
      params: payload,
      context: execution.context,
    })) as { success: boolean; message: string };

    if (!result.success) {
      return {
        success: false,
        status: 400,
        message: result.message || 'Failed to delete budget.',
        errors: {},
      };
    }

    return {
      success: true,
      status: 200,
      message: result.message || 'Budget deleted successfully.',
    };
  } catch (error) {
    console.error('[handleDeleteBudget] Failed:', error);
    return {
      success: false,
      status: 500,
      message: 'Failed to delete budget. Please try again.',
      errors: {},
    };
  }
}

// ==================== TRANSACTION ACTIONS ====================

async function handleSubmitTransaction(
  execution: MetadataActionExecution
): Promise<MetadataActionResult> {
  const config = execution.config ?? {};
  const payload = execution.input as Record<string, unknown>;

  const serviceHandler = adminFinanceHandlers['admin-finance.transactions.submit'];
  if (!serviceHandler) {
    throw new Error('Service handler not found: admin-finance.transactions.submit');
  }

  try {
    const result = (await serviceHandler({
      params: payload,
      context: execution.context,
    })) as { success: boolean; message: string; transactionId?: string };

    if (!result.success) {
      return {
        success: false,
        status: 400,
        message: result.message || 'Failed to submit transaction.',
        errors: {},
      };
    }

    const context: Record<string, unknown> = {
      transactionId: result.transactionId,
      params: execution.context.params,
      data: payload,
    };

    const redirectTemplate =
      toOptionalString(config.redirectUrl) ??
      toOptionalString(config.redirectTemplate) ??
      null;
    const redirectUrl = buildRedirectUrl(redirectTemplate, context);

    return {
      success: true,
      status: 200,
      message: result.message || 'Transaction submitted successfully.',
      redirectUrl,
      data: { transactionId: result.transactionId },
    };
  } catch (error) {
    console.error('[handleSubmitTransaction] Failed:', error);
    return {
      success: false,
      status: 500,
      message: 'Failed to submit transaction. Please try again.',
      errors: {},
    };
  }
}

async function handleSaveDraftTransaction(
  execution: MetadataActionExecution
): Promise<MetadataActionResult> {
  const config = execution.config ?? {};
  const payload = execution.input as Record<string, unknown>;

  const serviceHandler = adminFinanceHandlers['admin-finance.transactions.saveDraft'];
  if (!serviceHandler) {
    throw new Error('Service handler not found: admin-finance.transactions.saveDraft');
  }

  try {
    const result = (await serviceHandler({
      params: payload,
      context: execution.context,
    })) as { success: boolean; message: string; transactionId?: string };

    if (!result.success) {
      return {
        success: false,
        status: 400,
        message: result.message || 'Failed to save draft.',
        errors: {},
      };
    }

    const context: Record<string, unknown> = {
      transactionId: result.transactionId,
      params: execution.context.params,
      data: payload,
    };

    const redirectTemplate =
      toOptionalString(config.redirectUrl) ??
      toOptionalString(config.redirectTemplate) ??
      null;
    const redirectUrl = buildRedirectUrl(redirectTemplate, context);

    return {
      success: true,
      status: 200,
      message: result.message || 'Draft saved successfully.',
      redirectUrl,
      data: { transactionId: result.transactionId },
    };
  } catch (error) {
    console.error('[handleSaveDraftTransaction] Failed:', error);
    return {
      success: false,
      status: 500,
      message: 'Failed to save draft. Please try again.',
      errors: {},
    };
  }
}

async function handleApproveTransaction(
  execution: MetadataActionExecution
): Promise<MetadataActionResult> {
  const payload = execution.input as Record<string, unknown>;

  const serviceHandler = adminFinanceHandlers['admin-finance.transactions.approve'];
  if (!serviceHandler) {
    throw new Error('Service handler not found: admin-finance.transactions.approve');
  }

  try {
    const result = (await serviceHandler({
      params: payload,
      context: execution.context,
    })) as { success: boolean; message: string };

    if (!result.success) {
      return {
        success: false,
        status: 400,
        message: result.message || 'Failed to approve transaction.',
        errors: {},
      };
    }

    return {
      success: true,
      status: 200,
      message: result.message || 'Transaction approved successfully.',
    };
  } catch (error) {
    console.error('[handleApproveTransaction] Failed:', error);
    return {
      success: false,
      status: 500,
      message: 'Failed to approve transaction. Please try again.',
      errors: {},
    };
  }
}

async function handleVoidTransaction(
  execution: MetadataActionExecution
): Promise<MetadataActionResult> {
  const payload = execution.input as Record<string, unknown>;

  const serviceHandler = adminFinanceHandlers['admin-finance.transactions.void'];
  if (!serviceHandler) {
    throw new Error('Service handler not found: admin-finance.transactions.void');
  }

  try {
    const result = (await serviceHandler({
      params: payload,
      context: execution.context,
    })) as { success: boolean; message: string };

    if (!result.success) {
      return {
        success: false,
        status: 400,
        message: result.message || 'Failed to void transaction.',
        errors: {},
      };
    }

    return {
      success: true,
      status: 200,
      message: result.message || 'Transaction voided successfully.',
    };
  } catch (error) {
    console.error('[handleVoidTransaction] Failed:', error);
    return {
      success: false,
      status: 500,
      message: 'Failed to void transaction. Please try again.',
      errors: {},
    };
  }
}

// ==================== REPORT ACTIONS ====================

async function handleExportReport(
  execution: MetadataActionExecution
): Promise<MetadataActionResult> {
  const payload = execution.input as Record<string, unknown>;

  const serviceHandler = adminFinanceHandlers['admin-finance.reports.export'];
  if (!serviceHandler) {
    throw new Error('Service handler not found: admin-finance.reports.export');
  }

  try {
    const result = (await serviceHandler({
      params: payload,
      context: execution.context,
    })) as { success: boolean; message: string; downloadUrl?: string };

    if (!result.success) {
      return {
        success: false,
        status: 400,
        message: result.message || 'Failed to export report.',
        errors: {},
      };
    }

    return {
      success: true,
      status: 200,
      message: result.message || 'Report exported successfully.',
      data: { downloadUrl: result.downloadUrl },
    };
  } catch (error) {
    console.error('[handleExportReport] Failed:', error);
    return {
      success: false,
      status: 500,
      message: 'Failed to export report. Please try again.',
      errors: {},
    };
  }
}

// ==================== EXPORT ====================

export const adminFinanceActionHandlers: Record<
  string,
  (execution: MetadataActionExecution) => Promise<MetadataActionResult>
> = {
  // Chart of Accounts actions
  'admin-finance.accounts.save': handleSaveAccount,
  'admin-finance.accounts.delete': handleDeleteAccount,
  // Financial Sources actions
  'admin-finance.sources.save': handleSaveSource,
  'admin-finance.sources.delete': handleDeleteSource,
  // Budget actions
  'admin-finance.budgets.save': handleSaveBudget,
  'admin-finance.budgets.delete': handleDeleteBudget,
  // Transaction actions
  'admin-finance.transactions.submit': handleSubmitTransaction,
  'admin-finance.transactions.saveDraft': handleSaveDraftTransaction,
  'admin-finance.transactions.approve': handleApproveTransaction,
  'admin-finance.transactions.void': handleVoidTransaction,
  // Report actions
  'admin-finance.reports.export': handleExportReport,
};
