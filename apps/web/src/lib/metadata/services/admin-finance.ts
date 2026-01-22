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
import { adminFinanceFiscalYearsHandlers } from './admin-finance-fiscal-years';
import { adminFinanceFundsHandlers } from './admin-finance-funds';
import { adminFinanceOpeningBalancesHandlers } from './admin-finance-opening-balances';
import { adminFinanceCategoriesHandlers } from './admin-finance-categories';
import { adminFinanceDonationsHandlers } from './admin-finance-donations';

// Aggregate all finance handlers
export const adminFinanceHandlers = {
  ...adminFinanceDashboardHandlers,
  ...adminFinanceAccountsHandlers,
  ...adminFinanceSourcesHandlers,
  ...adminFinanceTransactionsHandlers,
  ...adminFinanceBudgetsHandlers,
  ...adminFinanceReportsHandlers,
  ...adminFinanceFiscalYearsHandlers,
  ...adminFinanceFundsHandlers,
  ...adminFinanceOpeningBalancesHandlers,
  ...adminFinanceCategoriesHandlers,
  ...adminFinanceDonationsHandlers,
};
