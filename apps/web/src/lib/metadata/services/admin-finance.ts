/**
 * Admin Finance Module - Service Handler Aggregator
 *
 * This file exports all service handlers for the admin-finance module.
 * Handlers are organized by page and section.
 */

import { adminFinanceDashboardHandlers } from './admin-finance-dashboard';
import { adminFinanceAccountsHandlers } from './admin-finance-accounts';
import { adminFinanceSourcesHandlers } from './admin-finance-sources';
import { adminFinanceTransactionsHandlers } from './admin-finance-transactions';
import { adminFinanceBudgetsHandlers } from './admin-finance-budgets';
import { adminFinanceReportsHandlers } from './admin-finance-reports';

// Aggregate all finance handlers
export const adminFinanceHandlers = {
  ...adminFinanceDashboardHandlers,
  ...adminFinanceAccountsHandlers,
  ...adminFinanceSourcesHandlers,
  ...adminFinanceTransactionsHandlers,
  ...adminFinanceBudgetsHandlers,
  ...adminFinanceReportsHandlers,
};
