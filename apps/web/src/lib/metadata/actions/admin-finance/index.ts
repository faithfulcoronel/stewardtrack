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

// ==================== FUND ACTIONS ====================

async function handleSaveFund(
  execution: MetadataActionExecution
): Promise<MetadataActionResult> {
  const config = execution.config ?? {};
  const payload = execution.input as Record<string, unknown>;

  const serviceHandler = adminFinanceHandlers['admin-finance.funds.save'];
  if (!serviceHandler) {
    throw new Error('Service handler not found: admin-finance.funds.save');
  }

  try {
    const result = (await serviceHandler({
      params: payload,
      context: execution.context,
    })) as { success: boolean; message: string; fundId?: string; redirectUrl?: string };

    if (!result.success) {
      return {
        success: false,
        status: 400,
        message: result.message || 'Failed to save fund.',
        errors: {},
      };
    }

    const context: Record<string, unknown> = {
      fundId: result.fundId,
      params: execution.context.params,
      data: payload,
    };

    const redirectTemplate =
      toOptionalString(config.redirectUrl) ??
      toOptionalString(config.redirectTemplate) ??
      null;
    const redirectUrl = result.redirectUrl ?? buildRedirectUrl(redirectTemplate, context);

    return {
      success: true,
      status: 200,
      message: result.message || 'Fund saved successfully.',
      redirectUrl,
      data: { fundId: result.fundId },
    };
  } catch (error) {
    console.error('[handleSaveFund] Failed:', error);
    return {
      success: false,
      status: 500,
      message: 'Failed to save fund. Please try again.',
      errors: {},
    };
  }
}

async function handleDeleteFund(
  execution: MetadataActionExecution
): Promise<MetadataActionResult> {
  const payload = execution.input as Record<string, unknown>;

  const serviceHandler = adminFinanceHandlers['admin-finance.funds.delete'];
  if (!serviceHandler) {
    throw new Error('Service handler not found: admin-finance.funds.delete');
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
        message: result.message || 'Failed to delete fund.',
        errors: {},
      };
    }

    return {
      success: true,
      status: 200,
      message: result.message || 'Fund deleted successfully.',
    };
  } catch (error) {
    console.error('[handleDeleteFund] Failed:', error);
    return {
      success: false,
      status: 500,
      message: 'Failed to delete fund. Please try again.',
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

async function handleCreateBudgetCategory(
  execution: MetadataActionExecution
): Promise<MetadataActionResult> {
  const payload = execution.input as Record<string, unknown>;

  const serviceHandler = adminFinanceHandlers['admin-finance.budgets.category.create'];
  if (!serviceHandler) {
    throw new Error('Service handler not found: admin-finance.budgets.category.create');
  }

  try {
    const result = (await serviceHandler({
      params: payload,
      context: execution.context,
    })) as { success: boolean; message: string; option?: { id: string; value: string } };

    if (!result.success) {
      return {
        success: false,
        status: 400,
        message: result.message || 'Failed to create category.',
        errors: {},
      };
    }

    return {
      success: true,
      status: 200,
      message: result.message || 'Category created successfully.',
      data: {
        option: result.option,
      },
    };
  } catch (error) {
    console.error('[handleCreateBudgetCategory] Failed:', error);
    return {
      success: false,
      status: 500,
      message: 'Failed to create category. Please try again.',
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

// ==================== INCOME CATEGORY ACTIONS ====================

async function handleSaveIncomeCategory(
  execution: MetadataActionExecution
): Promise<MetadataActionResult> {
  const config = execution.config ?? {};
  const payload = execution.input as Record<string, unknown>;

  const serviceHandler = adminFinanceHandlers['admin-finance.income-categories.save'];
  if (!serviceHandler) {
    throw new Error('Service handler not found: admin-finance.income-categories.save');
  }

  try {
    const result = (await serviceHandler({
      params: payload,
      context: execution.context,
    })) as { success: boolean; message: string; categoryId?: string; redirectUrl?: string };

    if (!result.success) {
      return {
        success: false,
        status: 400,
        message: result.message || 'Failed to save income category.',
        errors: {},
      };
    }

    const context: Record<string, unknown> = {
      categoryId: result.categoryId,
      params: execution.context.params,
      data: payload,
    };

    const redirectTemplate =
      toOptionalString(config.redirectUrl) ??
      toOptionalString(config.redirectTemplate) ??
      null;
    const redirectUrl = result.redirectUrl ?? buildRedirectUrl(redirectTemplate, context);

    return {
      success: true,
      status: 200,
      message: result.message || 'Income category saved successfully.',
      redirectUrl,
      data: { categoryId: result.categoryId },
    };
  } catch (error) {
    console.error('[handleSaveIncomeCategory] Failed:', error);
    return {
      success: false,
      status: 500,
      message: 'Failed to save income category. Please try again.',
      errors: {},
    };
  }
}

async function handleDeleteIncomeCategory(
  execution: MetadataActionExecution
): Promise<MetadataActionResult> {
  const payload = execution.input as Record<string, unknown>;

  const serviceHandler = adminFinanceHandlers['admin-finance.income-categories.delete'];
  if (!serviceHandler) {
    throw new Error('Service handler not found: admin-finance.income-categories.delete');
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
        message: result.message || 'Failed to delete income category.',
        errors: {},
      };
    }

    return {
      success: true,
      status: 200,
      message: result.message || 'Income category deleted successfully.',
    };
  } catch (error) {
    console.error('[handleDeleteIncomeCategory] Failed:', error);
    return {
      success: false,
      status: 500,
      message: 'Failed to delete income category. Please try again.',
      errors: {},
    };
  }
}

// ==================== EXPENSE CATEGORY ACTIONS ====================

async function handleSaveExpenseCategory(
  execution: MetadataActionExecution
): Promise<MetadataActionResult> {
  const config = execution.config ?? {};
  const payload = execution.input as Record<string, unknown>;

  const serviceHandler = adminFinanceHandlers['admin-finance.expense-categories.save'];
  if (!serviceHandler) {
    throw new Error('Service handler not found: admin-finance.expense-categories.save');
  }

  try {
    const result = (await serviceHandler({
      params: payload,
      context: execution.context,
    })) as { success: boolean; message: string; categoryId?: string; redirectUrl?: string };

    if (!result.success) {
      return {
        success: false,
        status: 400,
        message: result.message || 'Failed to save expense category.',
        errors: {},
      };
    }

    const context: Record<string, unknown> = {
      categoryId: result.categoryId,
      params: execution.context.params,
      data: payload,
    };

    const redirectTemplate =
      toOptionalString(config.redirectUrl) ??
      toOptionalString(config.redirectTemplate) ??
      null;
    const redirectUrl = result.redirectUrl ?? buildRedirectUrl(redirectTemplate, context);

    return {
      success: true,
      status: 200,
      message: result.message || 'Expense category saved successfully.',
      redirectUrl,
      data: { categoryId: result.categoryId },
    };
  } catch (error) {
    console.error('[handleSaveExpenseCategory] Failed:', error);
    return {
      success: false,
      status: 500,
      message: 'Failed to save expense category. Please try again.',
      errors: {},
    };
  }
}

async function handleDeleteExpenseCategory(
  execution: MetadataActionExecution
): Promise<MetadataActionResult> {
  const payload = execution.input as Record<string, unknown>;

  const serviceHandler = adminFinanceHandlers['admin-finance.expense-categories.delete'];
  if (!serviceHandler) {
    throw new Error('Service handler not found: admin-finance.expense-categories.delete');
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
        message: result.message || 'Failed to delete expense category.',
        errors: {},
      };
    }

    return {
      success: true,
      status: 200,
      message: result.message || 'Expense category deleted successfully.',
    };
  } catch (error) {
    console.error('[handleDeleteExpenseCategory] Failed:', error);
    return {
      success: false,
      status: 500,
      message: 'Failed to delete expense category. Please try again.',
      errors: {},
    };
  }
}

// ==================== FISCAL YEAR ACTIONS ====================

async function handleSaveFiscalYear(
  execution: MetadataActionExecution
): Promise<MetadataActionResult> {
  const config = execution.config ?? {};
  const payload = execution.input as Record<string, unknown>;

  const serviceHandler = adminFinanceHandlers['admin-finance.fiscal-years.save'];
  if (!serviceHandler) {
    throw new Error('Service handler not found: admin-finance.fiscal-years.save');
  }

  try {
    const result = (await serviceHandler({
      params: payload,
      context: execution.context,
    })) as { success: boolean; message: string; fiscalYearId?: string; redirectUrl?: string };

    if (!result.success) {
      return {
        success: false,
        status: 400,
        message: result.message || 'Failed to save fiscal year.',
        errors: {},
      };
    }

    const context: Record<string, unknown> = {
      fiscalYearId: result.fiscalYearId,
      params: execution.context.params,
      data: payload,
    };

    const redirectTemplate =
      toOptionalString(config.redirectUrl) ??
      toOptionalString(config.redirectTemplate) ??
      null;
    const redirectUrl = result.redirectUrl ?? buildRedirectUrl(redirectTemplate, context);

    return {
      success: true,
      status: 200,
      message: result.message || 'Fiscal year saved successfully.',
      redirectUrl,
      data: { fiscalYearId: result.fiscalYearId },
    };
  } catch (error) {
    console.error('[handleSaveFiscalYear] Failed:', error);
    return {
      success: false,
      status: 500,
      message: 'Failed to save fiscal year. Please try again.',
      errors: {},
    };
  }
}

async function handleDeleteFiscalYear(
  execution: MetadataActionExecution
): Promise<MetadataActionResult> {
  const payload = execution.input as Record<string, unknown>;

  const serviceHandler = adminFinanceHandlers['admin-finance.fiscal-years.delete'];
  if (!serviceHandler) {
    throw new Error('Service handler not found: admin-finance.fiscal-years.delete');
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
        message: result.message || 'Failed to delete fiscal year.',
        errors: {},
      };
    }

    return {
      success: true,
      status: 200,
      message: result.message || 'Fiscal year deleted successfully.',
    };
  } catch (error) {
    console.error('[handleDeleteFiscalYear] Failed:', error);
    return {
      success: false,
      status: 500,
      message: 'Failed to delete fiscal year. Please try again.',
      errors: {},
    };
  }
}

// ==================== OPENING BALANCE ACTIONS ====================

async function handleSaveOpeningBalance(
  execution: MetadataActionExecution
): Promise<MetadataActionResult> {
  const config = execution.config ?? {};
  const payload = execution.input as Record<string, unknown>;

  const serviceHandler = adminFinanceHandlers['admin-finance.opening-balances.save'];
  if (!serviceHandler) {
    throw new Error('Service handler not found: admin-finance.opening-balances.save');
  }

  try {
    const result = (await serviceHandler({
      params: payload,
      context: execution.context,
    })) as { success: boolean; message: string; openingBalanceId?: string; redirectUrl?: string };

    if (!result.success) {
      return {
        success: false,
        status: 400,
        message: result.message || 'Failed to save opening balance.',
        errors: {},
      };
    }

    const context: Record<string, unknown> = {
      openingBalanceId: result.openingBalanceId,
      params: execution.context.params,
      data: payload,
    };

    const redirectTemplate =
      toOptionalString(config.redirectUrl) ??
      toOptionalString(config.redirectTemplate) ??
      null;
    const redirectUrl = result.redirectUrl ?? buildRedirectUrl(redirectTemplate, context);

    return {
      success: true,
      status: 200,
      message: result.message || 'Opening balance saved successfully.',
      redirectUrl,
      data: { openingBalanceId: result.openingBalanceId },
    };
  } catch (error) {
    console.error('[handleSaveOpeningBalance] Failed:', error);
    return {
      success: false,
      status: 500,
      message: 'Failed to save opening balance. Please try again.',
      errors: {},
    };
  }
}

async function handleDeleteOpeningBalance(
  execution: MetadataActionExecution
): Promise<MetadataActionResult> {
  const payload = execution.input as Record<string, unknown>;

  const serviceHandler = adminFinanceHandlers['admin-finance.opening-balances.delete'];
  if (!serviceHandler) {
    throw new Error('Service handler not found: admin-finance.opening-balances.delete');
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
        message: result.message || 'Failed to delete opening balance.',
        errors: {},
      };
    }

    return {
      success: true,
      status: 200,
      message: result.message || 'Opening balance deleted successfully.',
    };
  } catch (error) {
    console.error('[handleDeleteOpeningBalance] Failed:', error);
    return {
      success: false,
      status: 500,
      message: 'Failed to delete opening balance. Please try again.',
      errors: {},
    };
  }
}

// ==================== BUDGET CATEGORY ACTIONS ====================

async function handleSaveBudgetCategoryManage(
  execution: MetadataActionExecution
): Promise<MetadataActionResult> {
  const config = execution.config ?? {};
  const payload = execution.input as Record<string, unknown>;

  const serviceHandler = adminFinanceHandlers['admin-finance.budget-categories.save'];
  if (!serviceHandler) {
    throw new Error('Service handler not found: admin-finance.budget-categories.save');
  }

  try {
    const result = (await serviceHandler({
      params: payload,
      context: execution.context,
    })) as { success: boolean; message: string; categoryId?: string; redirectUrl?: string };

    if (!result.success) {
      return {
        success: false,
        status: 400,
        message: result.message || 'Failed to save budget category.',
        errors: {},
      };
    }

    const context: Record<string, unknown> = {
      categoryId: result.categoryId,
      params: execution.context.params,
      data: payload,
    };

    const redirectTemplate =
      toOptionalString(config.redirectUrl) ??
      toOptionalString(config.redirectTemplate) ??
      null;
    const redirectUrl = result.redirectUrl ?? buildRedirectUrl(redirectTemplate, context);

    return {
      success: true,
      status: 200,
      message: result.message || 'Budget category saved successfully.',
      redirectUrl,
      data: { categoryId: result.categoryId },
    };
  } catch (error) {
    console.error('[handleSaveBudgetCategoryManage] Failed:', error);
    return {
      success: false,
      status: 500,
      message: 'Failed to save budget category. Please try again.',
      errors: {},
    };
  }
}

async function handleDeleteBudgetCategory(
  execution: MetadataActionExecution
): Promise<MetadataActionResult> {
  const payload = execution.input as Record<string, unknown>;

  const serviceHandler = adminFinanceHandlers['admin-finance.budget-categories.delete'];
  if (!serviceHandler) {
    throw new Error('Service handler not found: admin-finance.budget-categories.delete');
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
        message: result.message || 'Failed to delete budget category.',
        errors: {},
      };
    }

    return {
      success: true,
      status: 200,
      message: result.message || 'Budget category deleted successfully.',
    };
  } catch (error) {
    console.error('[handleDeleteBudgetCategory] Failed:', error);
    return {
      success: false,
      status: 500,
      message: 'Failed to delete budget category. Please try again.',
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
  // Fund actions
  'admin-finance.funds.save': handleSaveFund,
  'admin-finance.funds.delete': handleDeleteFund,
  // Budget actions
  'admin-finance.budgets.save': handleSaveBudget,
  'admin-finance.budgets.delete': handleDeleteBudget,
  'admin-finance.budgets.category.create': handleCreateBudgetCategory,
  // Income Category actions
  'admin-finance.income-categories.save': handleSaveIncomeCategory,
  'admin-finance.income-categories.delete': handleDeleteIncomeCategory,
  // Expense Category actions
  'admin-finance.expense-categories.save': handleSaveExpenseCategory,
  'admin-finance.expense-categories.delete': handleDeleteExpenseCategory,
  // Budget Category actions (manage page)
  'admin-finance.budget-categories.save': handleSaveBudgetCategoryManage,
  'admin-finance.budget-categories.delete': handleDeleteBudgetCategory,
  // Fiscal Year actions
  'admin-finance.fiscal-years.save': handleSaveFiscalYear,
  'admin-finance.fiscal-years.delete': handleDeleteFiscalYear,
  // Opening Balance actions
  'admin-finance.opening-balances.save': handleSaveOpeningBalance,
  'admin-finance.opening-balances.delete': handleDeleteOpeningBalance,
  // Transaction actions
  'admin-finance.transactions.submit': handleSubmitTransaction,
  'admin-finance.transactions.saveDraft': handleSaveDraftTransaction,
  'admin-finance.transactions.approve': handleApproveTransaction,
  'admin-finance.transactions.void': handleVoidTransaction,
  // Report actions
  'admin-finance.reports.export': handleExportReport,
};
