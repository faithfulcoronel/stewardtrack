# Finance Module - Architecture & Implementation Guide

## Executive Summary

The StewardTrack Finance Module is a **church-focused accounting system** designed for non-profit financial management. It implements double-entry bookkeeping, fund accounting, and GAAP-compliant financial reporting.

**Current Status:** Database layer 95% complete | Application layer **100% complete** ✅

**Implementation Progress:**
- ✅ Phase 1: Core Transaction Processing - Complete
- ✅ Phase 2: Financial Reports - Complete (with proper layered architecture)
- ✅ Phase 3: Dashboard & Analytics - Complete (with proper layered architecture)
- ✅ Phase 4: Sensitive Data Encryption - Complete (accounts table encrypted)
- ✅ Phase 5: UX & Mobile-First Design - Complete (responsive columns, empty states)
- ✅ Phase 6: Role-Based Access Control - Complete (Maker-Checker workflow enforced)
- ✅ Phase 7: Notifications System - Complete (Toast + in-app + workflow notifications)
- ✅ Phase 8: Advanced Features - Complete (Fiscal year closing, Budget vs Actual)

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Database Schema](#2-database-schema)
3. [Accounting Model](#3-accounting-model)
4. [Service Handlers](#4-service-handlers)
5. [Action Handlers](#5-action-handlers)
6. [Current Implementation Status](#6-current-implementation-status)
7. [Gap Analysis](#7-gap-analysis)
8. [Implementation Plan](#8-implementation-plan)
9. [Code Examples](#9-code-examples)
10. [Testing Strategy](#10-testing-strategy)
11. [Sensitive Data Encryption](#11-sensitive-data-encryption)
12. [User Experience & Design](#12-user-experience--design)
13. [Role-Based Access Control](#13-role-based-access-control)
14. [Notifications System](#14-notifications-system)

---

## 1. Architecture Overview

### 1.1 System Layers

```
┌─────────────────────────────────────────────────────────────────┐
│                     PRESENTATION LAYER                          │
│  XML Blueprints → JSON → React Components (Metadata-Driven)     │
├─────────────────────────────────────────────────────────────────┤
│                     SERVICE HANDLER LAYER                       │
│  admin-finance-*.ts files (Data resolution for UI components)   │
├─────────────────────────────────────────────────────────────────┤
│                     ACTION HANDLER LAYER                        │
│  admin-finance/index.ts (Mutation operations)                   │
├─────────────────────────────────────────────────────────────────┤
│                     BUSINESS SERVICE LAYER                      │
│  *Service.ts files (Business logic, validation)                 │
├─────────────────────────────────────────────────────────────────┤
│                     REPOSITORY LAYER                            │
│  *.repository.ts files (Data access abstraction)                │
├─────────────────────────────────────────────────────────────────┤
│                     DATABASE LAYER                              │
│  PostgreSQL + Supabase (Tables, Views, Functions, Triggers)     │
└─────────────────────────────────────────────────────────────────┘
```

### 1.2 Module Components

| Component | Location | Purpose |
|-----------|----------|---------|
| XML Blueprints | `metadata/authoring/blueprints/admin-finance/` | Page definitions |
| Service Handlers | `src/lib/metadata/services/admin-finance-*.ts` | UI data resolution |
| Action Handlers | `src/lib/metadata/actions/admin-finance/` | Mutation handling |
| Business Services | `src/services/*Service.ts` | Business logic |
| Repositories | `src/repositories/*.repository.ts` | Data access |
| Models | `src/models/*.model.ts` | Type definitions |
| DB Migrations | `supabase/migrations/` | Schema definitions |

### 1.3 Finance Submodules

```
Finance Module
├── Chart of Accounts (GL Accounts)
├── Financial Sources (Income sources - tithes, offerings, etc.)
├── Funds (Restricted/Unrestricted fund accounting)
├── Categories (Income/Expense/Budget categorization)
├── Accounts (Entity accounts - vendors, donors)
├── Budgets (Budget planning and tracking)
├── Fiscal Years & Periods (Accounting periods)
├── Opening Balances (Period initialization)
├── Transactions (Journal entries, income/expense)
└── Reports (Trial Balance, Income Statement, Balance Sheet)
```

---

## 2. Database Schema

### 2.1 Core Tables

#### Chart of Accounts (General Ledger)
```sql
CREATE TABLE chart_of_accounts (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  code TEXT NOT NULL,                    -- Account number (e.g., "1101")
  name TEXT NOT NULL,                    -- Account name (e.g., "Cash")
  description TEXT,
  account_type TEXT NOT NULL,            -- 'asset'|'liability'|'equity'|'revenue'|'expense'
  account_subtype TEXT,                  -- Sub-classification
  is_active BOOLEAN DEFAULT TRUE,
  parent_id UUID REFERENCES chart_of_accounts(id),  -- Hierarchical structure
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ,
  UNIQUE(tenant_id, code)
);
```

#### Financial Transaction Headers (Journal Entry Headers)
```sql
CREATE TABLE financial_transaction_headers (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  transaction_number TEXT NOT NULL,      -- Auto-generated (e.g., "JE-20240115001")
  transaction_date DATE NOT NULL,
  description TEXT NOT NULL,
  reference TEXT,                        -- External reference (check #, invoice #)
  source_id UUID REFERENCES financial_sources(id),
  status transaction_status NOT NULL,    -- 'draft'|'submitted'|'approved'|'posted'|'voided'
  posted_at TIMESTAMPTZ,
  posted_by UUID REFERENCES auth.users(id),
  voided_at TIMESTAMPTZ,
  voided_by UUID REFERENCES auth.users(id),
  void_reason TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ
);
```

#### Financial Transactions (Journal Entry Lines)
```sql
CREATE TABLE financial_transactions (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  header_id UUID REFERENCES financial_transaction_headers(id),
  type transaction_type,                 -- 'income'|'expense'|'transfer'|'adjustment'|etc.
  description TEXT NOT NULL,
  date DATE NOT NULL,
  coa_id UUID REFERENCES chart_of_accounts(id),   -- GL Account (renamed from account_id)
  account_id UUID REFERENCES accounts(id),        -- Entity account (vendor/donor)
  fund_id UUID REFERENCES funds(id),
  category_id UUID REFERENCES categories(id),
  budget_id UUID REFERENCES budgets(id),
  batch_id UUID REFERENCES offering_batches(id),
  source_id UUID REFERENCES financial_sources(id),
  debit NUMERIC(12,2) DEFAULT 0,         -- Debit amount
  credit NUMERIC(12,2) DEFAULT 0,        -- Credit amount
  is_reconciled BOOLEAN DEFAULT FALSE,
  reconciled_at TIMESTAMPTZ,
  reconciled_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ
);
```

#### Funds (Fund Accounting)
```sql
CREATE TABLE funds (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  type fund_type NOT NULL,               -- 'restricted'|'unrestricted'
  coa_id UUID REFERENCES chart_of_accounts(id),  -- Linked equity account
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ,
  UNIQUE(tenant_id, code)
);
```

#### Fiscal Years & Periods
```sql
CREATE TABLE fiscal_years (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  name TEXT NOT NULL,                    -- e.g., "FY 2024"
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',   -- 'open'|'closed'
  closed_at TIMESTAMPTZ,
  closed_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ,
  UNIQUE(tenant_id, name)
);

CREATE TABLE fiscal_periods (
  id UUID PRIMARY KEY,
  fiscal_year_id UUID REFERENCES fiscal_years(id),
  name TEXT NOT NULL,                    -- e.g., "Jan 2024"
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',   -- 'open'|'closed'
  closed_at TIMESTAMPTZ,
  closed_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ
);
```

### 2.2 Database Views

#### Fund Balances View
```sql
CREATE VIEW fund_balances_view AS
SELECT
  f.tenant_id,
  f.id,
  f.name,
  COALESCE(
    SUM(
      CASE
        WHEN t.type = 'income' THEN t.credit
        WHEN t.type = 'expense' THEN -t.debit
        ELSE COALESCE(t.credit,0) - COALESCE(t.debit,0)
      END
    ),
    0
  ) AS balance
FROM funds f
LEFT JOIN financial_transactions t ON t.fund_id = f.id
GROUP BY f.tenant_id, f.id, f.name;
```

#### Finance Monthly Stats View
```sql
CREATE VIEW finance_monthly_stats AS
SELECT
  tenant_id,
  SUM(CASE WHEN type = 'income' THEN total ELSE 0 END) AS monthly_income,
  SUM(CASE WHEN type = 'expense' THEN total ELSE 0 END) AS monthly_expenses,
  active_budgets,
  income_by_category,
  expenses_by_category
FROM (
  SELECT tenant_id, type, category_name,
    SUM(CASE WHEN type = 'income' THEN credit WHEN type = 'expense' THEN debit ELSE 0 END) AS total
  FROM financial_transactions ft
  LEFT JOIN categories c ON c.id = ft.category_id
  WHERE date_trunc('month', ft.date) = date_trunc('month', CURRENT_DATE)
  GROUP BY tenant_id, type, category_name
) tx
GROUP BY tenant_id;
```

### 2.3 Database Functions

#### Trial Balance Generation
```sql
CREATE FUNCTION generate_trial_balance(p_end_date date)
RETURNS TABLE (
  account_id uuid,
  account_code text,
  account_name text,
  account_type text,
  debit_balance numeric,
  credit_balance numeric
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    a.id, a.code, a.name, a.account_type,
    COALESCE(SUM(ft.debit), 0) AS debit_balance,
    COALESCE(SUM(ft.credit), 0) AS credit_balance
  FROM chart_of_accounts a
  LEFT JOIN financial_transactions ft
    ON ft.coa_id = a.id AND ft.date <= p_end_date
  WHERE a.tenant_id = get_user_tenant_id()
  GROUP BY a.id, a.code, a.name, a.account_type;
END;
$$ LANGUAGE plpgsql;
```

#### Income Statement Generation
```sql
CREATE FUNCTION generate_income_statement(p_start_date date, p_end_date date)
RETURNS TABLE (
  account_id uuid,
  account_code text,
  account_name text,
  account_type text,
  amount numeric
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    a.id, a.code, a.name, a.account_type,
    SUM(
      CASE
        WHEN a.account_type = 'revenue' THEN COALESCE(ft.credit,0) - COALESCE(ft.debit,0)
        WHEN a.account_type = 'expense' THEN COALESCE(ft.debit,0) - COALESCE(ft.credit,0)
        ELSE 0
      END
    ) AS amount
  FROM chart_of_accounts a
  LEFT JOIN financial_transactions ft
    ON ft.coa_id = a.id AND ft.date BETWEEN p_start_date AND p_end_date
  WHERE a.tenant_id = get_user_tenant_id()
    AND a.account_type IN ('revenue','expense')
  GROUP BY a.id, a.code, a.name, a.account_type;
END;
$$ LANGUAGE plpgsql;
```

#### Balance Sheet Generation
```sql
CREATE FUNCTION generate_balance_sheet(p_end_date date)
RETURNS TABLE (
  account_id uuid,
  account_code text,
  account_name text,
  account_type text,
  balance numeric
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    a.id, a.code, a.name, a.account_type,
    SUM(
      CASE
        WHEN a.account_type = 'asset' THEN COALESCE(ft.debit,0) - COALESCE(ft.credit,0)
        WHEN a.account_type IN ('liability','equity') THEN COALESCE(ft.credit,0) - COALESCE(ft.debit,0)
        ELSE 0
      END
    ) AS balance
  FROM chart_of_accounts a
  LEFT JOIN financial_transactions ft
    ON ft.coa_id = a.id AND ft.date <= p_end_date
  WHERE a.tenant_id = get_user_tenant_id()
    AND a.account_type IN ('asset','liability','equity')
  GROUP BY a.id, a.code, a.name, a.account_type;
END;
$$ LANGUAGE plpgsql;
```

#### Journal Entry Balance Validation
```sql
CREATE FUNCTION is_transaction_balanced(p_header_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_total_debits NUMERIC(12,2);
  v_total_credits NUMERIC(12,2);
BEGIN
  SELECT COALESCE(SUM(debit), 0) INTO v_total_debits
  FROM financial_transactions WHERE header_id = p_header_id;

  SELECT COALESCE(SUM(credit), 0) INTO v_total_credits
  FROM financial_transactions WHERE header_id = p_header_id;

  RETURN v_total_debits = v_total_credits;
END;
$$ LANGUAGE plpgsql;
```

### 2.4 Database Triggers

#### Fiscal Year Lock
```sql
-- Prevents transactions in closed fiscal years
CREATE TRIGGER enforce_fiscal_year_open_tx
BEFORE INSERT OR UPDATE ON financial_transactions
FOR EACH ROW EXECUTE FUNCTION enforce_fiscal_year_open();
```

#### Transaction Posting Validation
```sql
-- Validates journal entry before posting
CREATE TRIGGER validate_transaction_before_posting_trigger
BEFORE UPDATE ON financial_transaction_headers
FOR EACH ROW
WHEN (NEW.status = 'posted' AND OLD.status IN ('draft', 'approved'))
EXECUTE FUNCTION validate_transaction_before_posting();
```

#### Restricted Fund Balance Protection
```sql
-- Prevents negative balance in restricted funds
CREATE TRIGGER check_fund_balance_trigger
BEFORE INSERT OR UPDATE ON financial_transactions
FOR EACH ROW EXECUTE FUNCTION check_fund_balance();
```

---

## 3. Accounting Model

### 3.1 Account Types & Normal Balances

| Account Type | Normal Balance | Increase | Decrease |
|--------------|---------------|----------|----------|
| Asset | Debit | Debit | Credit |
| Liability | Credit | Credit | Debit |
| Equity | Credit | Credit | Debit |
| Revenue | Credit | Credit | Debit |
| Expense | Debit | Debit | Credit |

**Implementation:** `src/utils/accounting.ts`
```typescript
const debitNormal = new Set(['asset', 'expense']);

export function calculateAccountBalance(
  accountType: string | null | undefined,
  transactions: TransactionLike[] = []
): number {
  const totals = transactions.reduce(
    (acc, tx) => {
      acc.debit += Number(tx.debit ?? 0);
      acc.credit += Number(tx.credit ?? 0);
      return acc;
    },
    { debit: 0, credit: 0 }
  );

  // Debit-normal accounts: Assets, Expenses
  if (accountType && debitNormal.has(accountType.toLowerCase())) {
    return totals.debit - totals.credit;
  }

  // Credit-normal accounts: Liabilities, Equity, Revenue
  return totals.credit - totals.debit;
}
```

### 3.2 Transaction Types

```typescript
export type TransactionType =
  | 'income'          // Revenue transaction
  | 'expense'         // Expense transaction
  | 'transfer'        // Fund-to-fund transfer
  | 'adjustment'      // Adjusting entry
  | 'opening_balance' // Period opening balance
  | 'closing_entry'   // Year-end closing entry
  | 'fund_rollover'   // Fund balance rollover
  | 'reversal'        // Reversal of posted entry
  | 'allocation'      // Cost allocation
  | 'reclass'         // Account reclassification
  | 'refund';         // Refund transaction
```

### 3.3 Transaction Workflow

```
┌─────────┐    Submit    ┌───────────┐   Approve   ┌──────────┐    Post     ┌────────┐
│  DRAFT  │ ──────────▶  │ SUBMITTED │ ──────────▶ │ APPROVED │ ──────────▶ │ POSTED │
└─────────┘              └───────────┘             └──────────┘             └────────┘
     │                         │                        │                        │
     │                         │                        │                        │
     ▼                         ▼                        ▼                        ▼
  Save as                   Reject                   Reject                   Void
   draft                  (→ Draft)               (→ Draft)               (→ Voided)
```

### 3.4 Fund Accounting Model

```
┌──────────────────────────────────────────────────────────────┐
│                    FUND ACCOUNTING                           │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────────────┐      ┌──────────────────┐              │
│  │   UNRESTRICTED  │      │    RESTRICTED    │              │
│  │      FUND       │      │       FUND       │              │
│  ├─────────────────┤      ├──────────────────┤              │
│  │ General Fund    │      │ Building Fund    │              │
│  │ Operations      │      │ Mission Fund     │              │
│  │                 │      │ Youth Fund       │              │
│  └─────────────────┘      └──────────────────┘              │
│                                   │                          │
│                                   ▼                          │
│                    ┌──────────────────────────┐              │
│                    │ Cannot have negative     │              │
│                    │ balance (DB enforced)    │              │
│                    └──────────────────────────┘              │
└──────────────────────────────────────────────────────────────┘
```

---

## 4. Service Handlers

### 4.1 Handler Naming Convention

```
admin-finance.{submodule}.{page}.{section}

Examples:
- admin-finance.accounts.list.hero
- admin-finance.accounts.list.table
- admin-finance.accounts.manage.header
- admin-finance.accounts.manage.form
- admin-finance.transactions.entry.lineItems
- admin-finance.reports.trialBalance.data
```

### 4.2 Service Handler Files

| File | Submodule | Status |
|------|-----------|--------|
| `admin-finance-accounts.ts` | Chart of Accounts | ✓ Complete |
| `admin-finance-sources.ts` | Financial Sources | ✓ Complete |
| `admin-finance-funds.ts` | Fund Management | ✓ Complete |
| `admin-finance-categories.ts` | Income/Expense/Budget Categories | ✓ Complete |
| `admin-finance-budgets.ts` | Budget Management | ✓ Complete |
| `admin-finance-fiscal-years.ts` | Fiscal Years & Periods | ✓ Complete |
| `admin-finance-opening-balances.ts` | Opening Balances | ✓ Complete |
| `admin-finance-transactions.ts` | Transaction Entry & List | ⚠ Incomplete |
| `admin-finance-reports.ts` | Financial Reports | ⚠ Incomplete |
| `admin-finance-dashboard.ts` | Finance Dashboard | ⚠ Incomplete |

### 4.3 Handler Aggregation

**File:** `admin-finance.ts`
```typescript
import { adminFinanceAccountsHandlers } from './admin-finance-accounts';
import { adminFinanceSourcesHandlers } from './admin-finance-sources';
import { adminFinanceFundsHandlers } from './admin-finance-funds';
import { adminFinanceCategoriesHandlers } from './admin-finance-categories';
import { adminFinanceBudgetsHandlers } from './admin-finance-budgets';
import { adminFinanceFiscalYearsHandlers } from './admin-finance-fiscal-years';
import { adminFinanceOpeningBalancesHandlers } from './admin-finance-opening-balances';
import { adminFinanceTransactionsHandlers } from './admin-finance-transactions';
import { adminFinanceReportsHandlers } from './admin-finance-reports';
import { adminFinanceDashboardHandlers } from './admin-finance-dashboard';

export const adminFinanceHandlers = {
  ...adminFinanceDashboardHandlers,
  ...adminFinanceAccountsHandlers,
  ...adminFinanceSourcesHandlers,
  ...adminFinanceFundsHandlers,
  ...adminFinanceCategoriesHandlers,
  ...adminFinanceBudgetsHandlers,
  ...adminFinanceFiscalYearsHandlers,
  ...adminFinanceOpeningBalancesHandlers,
  ...adminFinanceTransactionsHandlers,
  ...adminFinanceReportsHandlers,
};
```

---

## 5. Action Handlers

### 5.1 Action Handler Architecture

```
XML Blueprint (kind="submit")
         │
         ▼
┌─────────────────────────┐
│  executeMetadataAction  │  (src/lib/metadata/actions/execute.ts)
│  - Routes to handler    │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│   Action Handler        │  (admin-finance/index.ts)
│   - Formats request     │
│   - Calls service       │
│   - Returns result      │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│   Service Handler       │  (admin-finance-*.ts)
│   - Business logic      │
│   - Database operations │
└─────────────────────────┘
```

### 5.2 Registered Action Handlers

**File:** `src/lib/metadata/actions/admin-finance/index.ts`

| Handler ID | Purpose | Status |
|------------|---------|--------|
| `admin-finance.accounts.save` | Save GL account | ✓ |
| `admin-finance.accounts.delete` | Delete GL account | ✓ |
| `admin-finance.sources.save` | Save financial source | ✓ |
| `admin-finance.sources.delete` | Delete financial source | ✓ |
| `admin-finance.funds.save` | Save fund | ✓ |
| `admin-finance.funds.delete` | Delete fund | ✓ |
| `admin-finance.budgets.save` | Save budget | ✓ |
| `admin-finance.budgets.delete` | Delete budget | ✓ |
| `admin-finance.income-categories.save` | Save income category | ✓ |
| `admin-finance.income-categories.delete` | Delete income category | ✓ |
| `admin-finance.expense-categories.save` | Save expense category | ✓ |
| `admin-finance.expense-categories.delete` | Delete expense category | ✓ |
| `admin-finance.budget-categories.save` | Save budget category | ✓ |
| `admin-finance.budget-categories.delete` | Delete budget category | ✓ |
| `admin-finance.fiscal-years.save` | Save fiscal year | ✓ |
| `admin-finance.fiscal-years.delete` | Delete fiscal year | ✓ |
| `admin-finance.opening-balances.save` | Save opening balance | ✓ |
| `admin-finance.opening-balances.delete` | Delete opening balance | ✓ |
| `admin-finance.transactions.submit` | Submit transaction | ⚠ Stub |
| `admin-finance.transactions.saveDraft` | Save draft | ⚠ Stub |
| `admin-finance.transactions.approve` | Approve transaction | ⚠ Stub |
| `admin-finance.transactions.void` | Void transaction | ⚠ Stub |
| `admin-finance.reports.export` | Export report | ⚠ Stub |

---

## 6. Current Implementation Status

### 6.1 Submodule Status Matrix

| Submodule | XML Blueprint | Service Handler | Action Handler | Repository | Status |
|-----------|--------------|-----------------|----------------|------------|--------|
| Chart of Accounts | ✓ | ✓ | ✓ | ✓ | **Complete** |
| Financial Sources | ✓ | ✓ | ✓ | ✓ | **Complete** |
| Funds | ✓ | ✓ | ✓ | ✓ | **Complete** |
| Income Categories | ✓ | ✓ | ✓ | ✓ | **Complete** |
| Expense Categories | ✓ | ✓ | ✓ | ✓ | **Complete** |
| Budget Categories | ✓ | ✓ | ✓ | ✓ | **Complete** |
| Budgets | ✓ | ✓ | ✓ | ✓ | **Complete** |
| Fiscal Years | ✓ | ✓ | ✓ | ✓ | **Complete** |
| Opening Balances | ✓ | ✓ | ✓ | ✓ | **Complete** |
| Transactions | ✓ | ✓ | ✓ | ✓ | **Complete** |
| Reports | ✓ | ✓ | ✓ | ✓ | **Complete** |
| Dashboard | ✓ | ✓ | - | ✓ | **Complete** |

### 6.2 Database vs Application Gap

| Feature | Database Layer | Application Layer |
|---------|---------------|-------------------|
| Double-entry validation | ✓ `is_transaction_balanced()` | ✓ Called via adapter |
| Trial balance report | ✓ `report_trial_balance()` | ✓ **Complete** (via repository) |
| Income statement | ✓ `report_income_statement()` | ✓ **Complete** (via repository) |
| Balance sheet | ✓ Derived from trial balance | ✓ **Complete** (via repository) |
| Monthly stats | ✓ `finance_monthly_stats` view | ✓ **Complete** (via repository) |
| Fund balances | ✓ `fund_balances_view` | ✓ **Complete** (via repository) |
| Fiscal year lock | ✓ `enforce_fiscal_year_open()` | N/A (DB-level) |
| Transaction posting | ✓ Trigger validation | ✓ **Complete** (via adapter) |

### 6.3 Architecture Pattern (Implemented)

Financial Reports and Dashboard follow the proper layered architecture:

```
Service Handler → Repository → Adapter → Supabase RPC
```

**Financial Reports:**
- `financialReport.adapter.ts` - Makes RPC calls to database functions
- `financialReport.repository.ts` - Business logic (totals, subtotals, balance verification)
- `admin-finance-reports.ts` - Service handlers use repository via DI container

**Finance Dashboard:**
- `financeDashboard.adapter.ts` - Fetches monthly trends, stats, source balances, recent transactions
- `financeDashboard.repository.ts` - Aggregates dashboard summary, transforms transaction rows
- `admin-finance-dashboard.ts` - Service handlers use repository via DI container

---

## 7. Gap Analysis

### 7.1 Critical Gaps - All Resolved

#### Gap 1: Transaction Entry Not Functional - ✅ RESOLVED
**Status:** Complete (Phase 1)

**Implementation:**
- `FinancialTransactionAdapter` handles transaction creation via Supabase
- `FinancialTransactionRepository` provides data access abstraction
- Action handlers in `admin-finance/index.ts` parse form data and create transactions
- Double-entry validation via `is_transaction_balanced()` trigger

#### Gap 2: Reports Return Empty Data - ✅ RESOLVED
**Status:** Complete (Phase 2)

**Implementation:**
- `FinancialReportAdapter` calls `report_trial_balance()` and `report_income_statement()` RPCs
- `FinancialReportRepository` calculates totals, subtotals, and balance verification
- Service handlers use repository via DI container for proper architecture

#### Gap 3: Dashboard Shows Zeros - ✅ RESOLVED
**Status:** Complete (Phase 3)

**Implementation:**
- `FinanceDashboardAdapter` fetches from `finance_monthly_stats` RPC and views
- `FinanceDashboardRepository` aggregates dashboard summary with balance sheet, monthly stats
- Service handlers now display real data from database
- Recent transactions shown via `source_recent_transactions_view`

### 7.2 High Priority Gaps

| Gap | Description | Effort | Status |
|-----|-------------|--------|--------|
| Transaction approval workflow | Implement submit → approve → post flow | Medium | Pending |
| Void transaction | Implement reversal entry creation | Medium | Pending |
| ~~Budget vs Actual report~~ | ~~Compare budgets to transactions~~ | ~~Medium~~ | ✅ Resolved |
| ~~Opening balance posting~~ | ~~Call `post_fund_opening_balances()`~~ | ~~Low~~ | ✅ Resolved |

### 7.3 Medium Priority Gaps

| Gap | Description | Effort | Status |
|-----|-------------|--------|--------|
| Cash flow statement | New report type | High | Pending |
| Bank reconciliation | Match transactions to bank records | High | Pending |
| ~~Year-end closing~~ | ~~Automate closing entries~~ | ~~Medium~~ | ✅ Resolved |
| Fund-level statements | Statement of Activities by fund | Medium | Pending |

---

## 8. Implementation Plan

### Phase 1: Core Transaction Processing (Week 1-2)

#### 8.1.1 Implement Transaction Submission

**File:** `admin-finance-transactions.ts`

```typescript
const submitTransaction: ServiceDataSourceHandler = async (request) => {
  const tenantService = container.get<TenantService>(TYPES.TenantService);
  const headerRepo = container.get<IFinancialTransactionHeaderRepository>(
    TYPES.IFinancialTransactionHeaderRepository
  );
  const transactionRepo = container.get<IFinancialTransactionRepository>(
    TYPES.IFinancialTransactionRepository
  );

  const tenant = await tenantService.getCurrentTenant();
  if (!tenant) throw new Error('No tenant context available');

  const params = request.params as Record<string, unknown>;
  const values = (params.values ?? params) as Record<string, unknown>;

  // 1. Create header
  const header = await headerRepo.create({
    tenant_id: tenant.id,
    transaction_number: await generateTransactionNumber(tenant.id),
    transaction_date: values.transactionDate as string,
    description: values.description as string,
    reference: values.reference as string | null,
    source_id: values.sourceId as string | null,
    status: 'submitted',
  });

  // 2. Create line items with journal entries
  const lineItems = values.lineItems as Array<{
    categoryId: string;
    fundId: string;
    amount: number;
    description: string;
  }>;

  const transactionType = values.transactionType as 'income' | 'expense';

  for (const line of lineItems) {
    // Get category's linked GL account
    const category = await getCategoryWithGLAccount(line.categoryId);

    if (transactionType === 'income') {
      // Income: DR Cash, CR Revenue
      await createJournalEntry(header.id, tenant.id, {
        cashAccount: { debit: line.amount, credit: 0 },
        revenueAccount: { debit: 0, credit: line.amount },
        fundId: line.fundId,
        description: line.description,
      });
    } else {
      // Expense: DR Expense, CR Cash
      await createJournalEntry(header.id, tenant.id, {
        expenseAccount: { debit: line.amount, credit: 0 },
        cashAccount: { debit: 0, credit: line.amount },
        fundId: line.fundId,
        description: line.description,
      });
    }
  }

  return {
    success: true,
    message: 'Transaction submitted successfully',
    transactionId: header.id,
    redirectUrl: '/admin/finance/transactions',
  };
};
```

#### 8.1.2 Implement Transaction Approval

```typescript
const approveTransaction: ServiceDataSourceHandler = async (request) => {
  const params = request.params as Record<string, unknown>;
  const headerId = params.id as string;

  const headerRepo = container.get<IFinancialTransactionHeaderRepository>(
    TYPES.IFinancialTransactionHeaderRepository
  );

  // Validate transaction is balanced (calls DB function)
  const isBalanced = await validateTransactionBalanced(headerId);
  if (!isBalanced) {
    return {
      success: false,
      message: 'Transaction is not balanced. Debits must equal credits.',
    };
  }

  // Update status to approved
  await headerRepo.update(headerId, {
    status: 'approved',
    updated_at: new Date().toISOString(),
  });

  return {
    success: true,
    message: 'Transaction approved successfully',
  };
};
```

### Phase 2: Financial Reports (Week 2-3)

#### 8.2.1 Connect Trial Balance to Database

**File:** `admin-finance-reports.ts`

```typescript
const resolveTrialBalanceData: ServiceDataSourceHandler = async (request) => {
  const supabase = await createClient();
  const currency = await getTenantCurrency();

  const asOfDate = (request.params?.asOfDate as string) ||
    new Date().toISOString().split('T')[0];

  // Call PostgreSQL function
  const { data: trialBalance, error } = await supabase
    .rpc('generate_trial_balance', { p_end_date: asOfDate });

  if (error) throw error;

  // Transform to UI format
  const rows = trialBalance.map((row: any) => ({
    id: row.account_id,
    code: row.account_code,
    name: row.account_name,
    type: row.account_type,
    debit: formatCurrency(row.debit_balance, currency),
    credit: formatCurrency(row.credit_balance, currency),
  }));

  // Calculate subtotals by account type
  const subtotals = calculateSubtotalsByType(trialBalance, currency);

  // Calculate grand totals
  const totalDebits = trialBalance.reduce(
    (sum: number, row: any) => sum + Number(row.debit_balance), 0
  );
  const totalCredits = trialBalance.reduce(
    (sum: number, row: any) => sum + Number(row.credit_balance), 0
  );

  return {
    rows,
    columns: [...],
    subtotals,
    grandTotal: {
      debit: formatCurrency(totalDebits, currency),
      credit: formatCurrency(totalCredits, currency),
      balanced: Math.abs(totalDebits - totalCredits) < 0.01,
    },
  };
};
```

#### 8.2.2 Connect Income Statement to Database

```typescript
const resolveIncomeStatementRevenue: ServiceDataSourceHandler = async (request) => {
  const supabase = await createClient();
  const currency = await getTenantCurrency();

  const startDate = request.params?.startDate as string;
  const endDate = request.params?.endDate as string;

  const { data, error } = await supabase
    .rpc('generate_income_statement', {
      p_start_date: startDate,
      p_end_date: endDate
    });

  if (error) throw error;

  // Filter revenue accounts only
  const revenueAccounts = data.filter(
    (row: any) => row.account_type === 'revenue'
  );

  const rows = revenueAccounts.map((row: any) => ({
    id: row.account_id,
    code: row.account_code,
    name: row.account_name,
    amount: formatCurrency(row.amount, currency),
  }));

  const totalRevenue = revenueAccounts.reduce(
    (sum: number, row: any) => sum + Number(row.amount), 0
  );

  return {
    rows,
    columns: [...],
    subtotal: {
      label: 'Total Revenue',
      amount: formatCurrency(totalRevenue, currency),
    },
  };
};
```

### Phase 3: Dashboard & Analytics (Week 3-4)

#### 8.3.1 Connect Dashboard to Monthly Stats

```typescript
const resolveDashboardMetrics: ServiceDataSourceHandler = async (_request) => {
  const supabase = await createClient();
  const currency = await getTenantCurrency();

  // Query monthly stats view
  const { data: stats, error } = await supabase
    .from('finance_monthly_stats')
    .select('*')
    .single();

  if (error && error.code !== 'PGRST116') throw error;

  const monthlyIncome = stats?.monthly_income || 0;
  const monthlyExpenses = stats?.monthly_expenses || 0;
  const netCashFlow = monthlyIncome - monthlyExpenses;

  return {
    metrics: [
      {
        label: 'Monthly Income',
        value: formatCurrency(monthlyIncome, currency),
        trend: 'up',
        caption: 'This month',
      },
      {
        label: 'Monthly Expenses',
        value: formatCurrency(monthlyExpenses, currency),
        trend: 'flat',
        caption: 'This month',
      },
      {
        label: 'Net Cash Flow',
        value: formatCurrency(netCashFlow, currency),
        trend: netCashFlow >= 0 ? 'up' : 'down',
        caption: 'Income - Expenses',
      },
    ],
  };
};
```

### Phase 4: Advanced Features (Week 4+)

#### 8.4.1 Year-End Closing Procedure

```typescript
const closefiscalYear: ServiceDataSourceHandler = async (request) => {
  const supabase = await createClient();
  const fiscalYearId = request.params?.fiscalYearId as string;

  // 1. Verify all periods are closed
  const { data: openPeriods } = await supabase
    .from('fiscal_periods')
    .select('id')
    .eq('fiscal_year_id', fiscalYearId)
    .eq('status', 'open');

  if (openPeriods && openPeriods.length > 0) {
    return {
      success: false,
      message: 'All fiscal periods must be closed before closing the year',
    };
  }

  // 2. Generate closing entries
  // DR Revenue accounts → CR Retained Earnings
  // DR Retained Earnings → CR Expense accounts
  await generateClosingEntries(fiscalYearId);

  // 3. Create opening balances for next year
  await rolloverBalancesToNextYear(fiscalYearId);

  // 4. Update fiscal year status
  await supabase
    .from('fiscal_years')
    .update({
      status: 'closed',
      closed_at: new Date().toISOString(),
      closed_by: auth.uid(),
    })
    .eq('id', fiscalYearId);

  return {
    success: true,
    message: 'Fiscal year closed successfully',
  };
};
```

---

## 9. Code Examples

### 9.1 Complete Service Handler Pattern

```typescript
// admin-finance-{submodule}.ts

import type { ServiceDataSourceHandler } from './types';
import { container } from '@/lib/container';
import { TYPES } from '@/lib/types';
import type { TenantService } from '@/services/TenantService';
import { getTenantCurrency, formatCurrency } from './finance-utils';
import { getTenantTimezone, formatDate } from './datetime-utils';

// ==================== LIST PAGE HANDLERS ====================

const resolveListHero: ServiceDataSourceHandler = async (_request) => {
  const tenantService = container.get<TenantService>(TYPES.TenantService);
  const tenant = await tenantService.getCurrentTenant();
  if (!tenant) throw new Error('No tenant context available');

  const currency = await getTenantCurrency();

  // Fetch actual data from repository/view
  const metrics = await fetchMetrics(tenant.id);

  return {
    eyebrow: 'Module name',
    headline: 'Page title',
    description: 'Page description.',
    metrics: [
      {
        label: 'Metric 1',
        value: formatCurrency(metrics.total, currency),
        caption: 'Description',
      },
    ],
  };
};

const resolveListTable: ServiceDataSourceHandler = async (_request) => {
  const repository = container.get<IMyRepository>(TYPES.IMyRepository);
  const currency = await getTenantCurrency();
  const timezone = await getTenantTimezone();

  const { data } = await repository.findAll();

  const rows = data.map((item) => ({
    id: item.id,
    name: item.name,
    amount: formatCurrency(item.amount, currency),
    date: formatDate(new Date(item.date), timezone),
    // ... map other fields
  }));

  const columns = [
    { field: 'name', headerName: 'Name', type: 'text', flex: 1 },
    { field: 'amount', headerName: 'Amount', type: 'currency', flex: 0.8 },
    { field: 'date', headerName: 'Date', type: 'text', flex: 0.7 },
    {
      field: 'actions',
      headerName: 'Actions',
      type: 'actions',
      actions: [
        {
          id: 'edit-record',
          label: 'Edit',
          intent: 'edit',
          urlTemplate: '/admin/finance/module/manage?id={{id}}',
          variant: 'secondary',
        },
        {
          id: 'delete-record',
          label: 'Delete',
          intent: 'delete',
          handler: 'admin-finance.module.delete',
          confirmTitle: 'Delete Item',
          confirmDescription: 'Are you sure you want to delete "{{name}}"?',
          variant: 'destructive',
        },
      ],
    },
  ];

  return { rows, columns, filters: [] };
};

// ==================== MANAGE PAGE HANDLERS ====================

const resolveManageForm: ServiceDataSourceHandler = async (request) => {
  const itemId = request.params?.itemId as string;
  const repository = container.get<IMyRepository>(TYPES.IMyRepository);

  let item: Partial<MyModel> = {};

  if (itemId) {
    const existing = await repository.findById(itemId);
    if (existing) item = existing;
  }

  return {
    fields: [
      {
        name: 'name',
        label: 'Name',
        type: 'text',
        colSpan: 'half',
        required: true,
      },
      {
        name: 'amount',
        label: 'Amount',
        type: 'currency',
        colSpan: 'half',
        required: true,
      },
    ],
    values: {
      ...(itemId ? { itemId: item.id } : {}),
      name: item.name || '',
      amount: item.amount || 0,
    },
    validation: {
      name: { required: true },
      amount: { required: true, min: 0 },
    },
  };
};

// ==================== ACTION HANDLERS ====================

const saveItem: ServiceDataSourceHandler = async (request) => {
  const params = request.params as Record<string, unknown>;
  const values = (params.values ?? params) as Record<string, unknown>;
  const itemId = (values.itemId ?? params.itemId) as string | undefined;

  const repository = container.get<IMyRepository>(TYPES.IMyRepository);

  const data: Partial<MyModel> = {
    name: values.name as string,
    amount: parseFloat(values.amount as string) || 0,
  };

  let item: MyModel;

  if (itemId) {
    item = await repository.update(itemId, data);
  } else {
    item = await repository.create(data);
  }

  return {
    success: true,
    message: itemId ? 'Item updated successfully' : 'Item created successfully',
    itemId: item.id,
    redirectUrl: '/admin/finance/module',
  };
};

// ==================== EXPORT ====================

export const adminFinanceModuleHandlers: Record<string, ServiceDataSourceHandler> = {
  'admin-finance.module.list.hero': resolveListHero,
  'admin-finance.module.list.table': resolveListTable,
  'admin-finance.module.manage.header': resolveManageHeader,
  'admin-finance.module.manage.form': resolveManageForm,
  'admin-finance.module.save': saveItem,
  'admin-finance.module.delete': deleteItem,
};
```

### 9.2 Action Handler Pattern

```typescript
// admin-finance/index.ts

async function handleSaveItem(
  execution: MetadataActionExecution
): Promise<MetadataActionResult> {
  const config = execution.config ?? {};
  const payload = execution.input as Record<string, unknown>;

  const serviceHandler = adminFinanceHandlers['admin-finance.module.save'];
  if (!serviceHandler) {
    throw new Error('Service handler not found');
  }

  try {
    const result = (await serviceHandler({
      params: payload,
      context: execution.context,
    })) as { success: boolean; message: string; itemId?: string; redirectUrl?: string };

    if (!result.success) {
      return {
        success: false,
        status: 400,
        message: result.message || 'Failed to save item.',
        errors: {},
      };
    }

    const redirectUrl = result.redirectUrl ?? buildRedirectUrl(
      config.redirectTemplate as string | null,
      { itemId: result.itemId }
    );

    return {
      success: true,
      status: 200,
      message: result.message,
      redirectUrl,
      data: { itemId: result.itemId },
    };
  } catch (error) {
    console.error('[handleSaveItem] Failed:', error);
    return {
      success: false,
      status: 500,
      message: 'Failed to save item. Please try again.',
      errors: {},
    };
  }
}
```

---

## 10. Testing Strategy

### 10.1 Database Function Testing

```sql
-- Test trial balance generation
SELECT * FROM generate_trial_balance('2024-12-31'::date);

-- Test income statement
SELECT * FROM generate_income_statement('2024-01-01'::date, '2024-12-31'::date);

-- Test balance sheet
SELECT * FROM generate_balance_sheet('2024-12-31'::date);

-- Test transaction balancing
SELECT is_transaction_balanced('header-uuid-here');
```

### 10.2 Service Handler Testing

```typescript
// __tests__/admin-finance-reports.test.ts

describe('resolveTrialBalanceData', () => {
  it('should return formatted trial balance data', async () => {
    const request = {
      params: { asOfDate: '2024-12-31' },
      context: { tenantId: 'test-tenant' },
    };

    const result = await resolveTrialBalanceData(request);

    expect(result.rows).toBeDefined();
    expect(result.grandTotal.balanced).toBe(true);
  });
});
```

### 10.3 E2E Testing Checklist

- [ ] Create fiscal year → periods auto-generated
- [ ] Create chart of account → appears in list
- [ ] Create fund → appears in dropdown
- [ ] Record income transaction → creates journal entries
- [ ] Record expense transaction → creates journal entries
- [ ] Submit transaction → status changes to submitted
- [ ] Approve transaction → status changes to approved
- [ ] Post transaction → balance updates
- [ ] Generate trial balance → debits = credits
- [ ] Generate income statement → shows revenue and expenses
- [ ] Generate balance sheet → assets = liabilities + equity
- [ ] Close fiscal period → blocks new transactions
- [ ] Close fiscal year → creates closing entries

---

## 11. Sensitive Data Encryption

### 11.1 Overview

The Finance Module handles sensitive financial data that requires encryption at rest. StewardTrack provides a comprehensive field-level encryption infrastructure using **AES-256-GCM** with tenant-specific keys.

**Encryption Algorithm:** AES-256-GCM (Authenticated Encryption)
**Key Management:** Tenant-specific master keys with field-level key derivation
**Key Rotation:** Versioned keys with automatic rotation support
**Audit Logging:** All encryption operations logged for compliance

### 11.2 Financial Fields Requiring Encryption

#### High Sensitivity (Must Encrypt)

| Entity | Field | Data Type | Reason |
|--------|-------|-----------|--------|
| `accounts` (vendors/donors) | `bank_account_number` | String | PII - Bank Details |
| `accounts` | `routing_number` | String | PII - Bank Details |
| `accounts` | `tax_id` | String | PII - Government ID |
| `accounts` | `ssn` | String | PII - Social Security |
| `accounts` | `contact_name` | String | PII - Individual Name |
| `accounts` | `contact_email` | String | PII - Email Address |
| `accounts` | `contact_phone` | String | PII - Phone Number |
| `financial_transactions` | `check_number` | String | Financial Identifier |
| `financial_transactions` | `external_reference` | String | May contain PII |

#### Medium Sensitivity (Recommend Encrypt)

| Entity | Field | Data Type | Reason |
|--------|-------|-----------|--------|
| `accounts` | `address_line1` | String | PII - Address |
| `accounts` | `address_line2` | String | PII - Address |
| `accounts` | `notes` | String | May contain PII |
| `financial_transaction_headers` | `notes` | String | May contain PII |

### 11.3 Database Schema for Encryption

The `accounts` table (vendors, donors, and other entity accounts) supports encryption:

```sql
CREATE TABLE accounts (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  account_number TEXT NOT NULL,
  name TEXT NOT NULL,
  type account_type NOT NULL,        -- 'vendor'|'customer'|'donor'|'employee'

  -- Encrypted PII fields
  bank_account_number TEXT,          -- ← Encrypted
  routing_number TEXT,               -- ← Encrypted
  tax_id TEXT,                       -- ← Encrypted
  contact_name TEXT,                 -- ← Encrypted
  contact_email TEXT,                -- ← Encrypted
  contact_phone TEXT,                -- ← Encrypted
  address_line1 TEXT,                -- ← Encrypted
  address_line2 TEXT,                -- ← Encrypted

  -- Encryption metadata
  encrypted_fields TEXT[],           -- List of encrypted field names
  encryption_key_version INTEGER,    -- Key version for re-encryption

  -- Standard fields
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ
);
```

### 11.4 Encryption Infrastructure

#### Database Tables

**`encryption_keys`** - Stores tenant master keys:
```sql
CREATE TABLE encryption_keys (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  key_version INTEGER NOT NULL,
  encrypted_key TEXT NOT NULL,       -- Master key encrypted with system key
  key_type TEXT DEFAULT 'tenant',
  is_active BOOLEAN DEFAULT TRUE,
  rotated_at TIMESTAMPTZ,
  rotated_by UUID,
  created_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  UNIQUE(tenant_id, key_version)
);
```

**`field_encryption_metadata`** - Tracks which fields are encrypted:
```sql
CREATE TABLE field_encryption_metadata (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  table_name TEXT NOT NULL,
  field_name TEXT NOT NULL,
  encryption_enabled BOOLEAN DEFAULT TRUE,
  key_version INTEGER,
  last_rotation_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ,
  UNIQUE(tenant_id, table_name, field_name)
);
```

**`encryption_audit_log`** - Compliance audit trail:
```sql
CREATE TABLE encryption_audit_log (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL,
  user_id UUID,
  operation TEXT NOT NULL,           -- 'encrypt'|'decrypt'|'rotate'
  table_name TEXT NOT NULL,
  field_name TEXT NOT NULL,
  record_id UUID,
  key_version INTEGER,
  success BOOLEAN DEFAULT TRUE,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 11.5 Implementation Pattern

#### Encryption Service Usage

```typescript
import { container } from '@/lib/container';
import { TYPES } from '@/lib/types';
import type { EncryptionService } from '@/lib/encryption/EncryptionService';
import type { FieldEncryptionConfig } from '@/types/encryption';

// Define field configuration for accounts
const ACCOUNT_ENCRYPTION_CONFIG: FieldEncryptionConfig[] = [
  { fieldName: 'bank_account_number', required: true },
  { fieldName: 'routing_number', required: true },
  { fieldName: 'tax_id', required: true },
  { fieldName: 'contact_name', required: false },
  { fieldName: 'contact_email', required: false },
  { fieldName: 'contact_phone', required: false },
  { fieldName: 'address_line1', required: false },
  { fieldName: 'address_line2', required: false },
];
```

#### Encrypting on Save

```typescript
// In account.adapter.ts
async create(data: CreateAccountDto, tenantId: string): Promise<Account> {
  const encryptionService = container.get<EncryptionService>(
    TYPES.EncryptionService
  );

  // Encrypt sensitive fields before saving
  const encryptedData = await encryptionService.encryptFields(
    data,
    tenantId,
    ACCOUNT_ENCRYPTION_CONFIG
  );

  // Track which fields are encrypted
  const encryptedFields = ACCOUNT_ENCRYPTION_CONFIG
    .filter(config => encryptedData[config.fieldName])
    .map(config => config.fieldName);

  const { data: account, error } = await supabase
    .from('accounts')
    .insert({
      ...encryptedData,
      tenant_id: tenantId,
      encrypted_fields: encryptedFields,
      encryption_key_version: 1, // Current key version
    })
    .select()
    .single();

  if (error) throw error;
  return account;
}
```

#### Decrypting on Read

```typescript
// In account.adapter.ts
async findById(id: string, tenantId: string): Promise<Account | null> {
  const encryptionService = container.get<EncryptionService>(
    TYPES.EncryptionService
  );

  const { data: account, error } = await supabase
    .from('accounts')
    .select('*')
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .single();

  if (error || !account) return null;

  // Decrypt sensitive fields after reading
  const decryptedAccount = await encryptionService.decryptFields(
    account,
    tenantId,
    ACCOUNT_ENCRYPTION_CONFIG
  );

  return decryptedAccount;
}
```

#### Batch Decryption

```typescript
// In account.adapter.ts
async findAll(tenantId: string): Promise<Account[]> {
  const encryptionService = container.get<EncryptionService>(
    TYPES.EncryptionService
  );

  const { data: accounts, error } = await supabase
    .from('accounts')
    .select('*')
    .eq('tenant_id', tenantId);

  if (error) throw error;

  // Batch decrypt all records
  const decryptedAccounts = await encryptionService.decryptRecords(
    accounts,
    tenantId,
    ACCOUNT_ENCRYPTION_CONFIG
  );

  return decryptedAccounts;
}
```

### 11.6 Encrypted Value Format

Encrypted values follow the format:
```
{keyVersion}.{iv}.{authTag}.{ciphertext}
```

**Example:**
```
1.a3f2c4d5e6f7a8b9.1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d.8f3a2c1b9e7d6f4a...
```

**Components:**
- `keyVersion`: Integer indicating which key version was used
- `iv`: Base64-encoded initialization vector (12 bytes)
- `authTag`: Base64-encoded authentication tag (16 bytes)
- `ciphertext`: Base64-encoded encrypted data

### 11.7 Key Rotation Process

When encryption keys are rotated:

1. **Generate New Key Version**
   ```sql
   INSERT INTO encryption_keys (tenant_id, key_version, encrypted_key)
   SELECT tenant_id, key_version + 1, NEW_ENCRYPTED_KEY
   FROM encryption_keys WHERE is_active = TRUE;
   ```

2. **Re-encrypt All Fields**
   ```typescript
   async rotateKeys(tenantId: string): Promise<void> {
     // Decrypt with old key, encrypt with new key
     const accounts = await accountRepository.findAll(tenantId);

     for (const account of accounts) {
       // decryptFields uses key version from encrypted value
       // encryptFields uses current active key version
       const decrypted = await encryptionService.decryptFields(
         account, tenantId, ACCOUNT_ENCRYPTION_CONFIG
       );
       const reEncrypted = await encryptionService.encryptFields(
         decrypted, tenantId, ACCOUNT_ENCRYPTION_CONFIG
       );
       await accountRepository.update(account.id, reEncrypted, tenantId);
     }
   }
   ```

3. **Deactivate Old Key**
   ```sql
   UPDATE encryption_keys
   SET is_active = FALSE, rotated_at = NOW()
   WHERE tenant_id = $1 AND key_version < $2;
   ```

### 11.8 Compliance Considerations

#### Regulatory Requirements

| Regulation | Requirement | Implementation |
|------------|-------------|----------------|
| **GDPR** | Data minimization, encryption | Field-level encryption, audit logs |
| **PCI-DSS** | Cardholder data protection | Bank account encryption |
| **SOC 2** | Access controls, audit trail | Encryption audit log, key versioning |
| **HIPAA** | PHI protection (if applicable) | Field-level encryption for health data |

#### Audit Requirements

- **Log All Operations:** Every encrypt/decrypt operation is logged
- **Track User Actions:** User ID recorded with each operation
- **Key Version Tracking:** Enables re-encryption audit
- **Retention Policy:** Audit logs retained per compliance requirements

#### Best Practices

1. **Never log plaintext values** - Only log field names and record IDs
2. **Encrypt in adapters** - Keep encryption layer close to database
3. **Decrypt on demand** - Don't decrypt until data is needed
4. **Use field-specific keys** - Derive unique keys per field
5. **Monitor key expiration** - Set up alerts for key rotation
6. **Test decryption** - Include decryption tests in CI/CD

### 11.9 Finance Module Encryption Tasks

#### Fields to Encrypt (Priority Order)

1. **Phase 1:** Vendor/Donor bank details
   - `accounts.bank_account_number`
   - `accounts.routing_number`
   - `accounts.tax_id`

2. **Phase 2:** Contact information
   - `accounts.contact_name`
   - `accounts.contact_email`
   - `accounts.contact_phone`
   - `accounts.address_line1`
   - `accounts.address_line2`

3. **Phase 3:** Transaction references
   - `financial_transactions.check_number`
   - `financial_transaction_headers.external_reference`

#### Implementation Checklist

- [ ] Add encryption to account adapter (create/update)
- [ ] Add decryption to account adapter (findById/findAll)
- [ ] Add `encrypted_fields` column tracking
- [ ] Add `encryption_key_version` column
- [ ] Create field encryption metadata records
- [ ] Test encrypt/decrypt round-trip
- [ ] Add encryption audit logging
- [ ] Document encryption for compliance audits

---

## 12. User Experience & Design

### 12.1 Design Principles

**User Experience is the #1 Priority.** Every design decision must prioritize ease of use, especially for non-technical church staff and volunteers.

#### Core Principles

| Principle | Description | Implementation |
|-----------|-------------|----------------|
| **Mobile-First** | Design for mobile, enhance for desktop | Responsive layouts, touch-friendly targets |
| **Progressive Disclosure** | Show only what's needed | Collapsible sections, wizard flows |
| **Immediate Feedback** | Confirm every action | Toast notifications, inline validation |
| **Error Prevention** | Prevent mistakes before they happen | Confirmation dialogs, validation hints |
| **Accessibility** | WCAG 2.1 AA compliance | Semantic HTML, ARIA labels, keyboard nav |

### 12.2 Mobile-First Design

#### Responsive Breakpoints

```typescript
// Tailwind breakpoints (mobile-first)
const breakpoints = {
  'sm': '640px',   // Small tablets
  'md': '768px',   // Tablets
  'lg': '1024px',  // Laptops
  'xl': '1280px',  // Desktops
  '2xl': '1536px', // Large monitors
};

// Mobile-first CSS pattern
// Default styles for mobile, then add complexity
```

#### Mobile-First Component Patterns

**Navigation:**
```xml
<!-- Mobile: Bottom navigation bar -->
<Component id="mobileNav" type="BottomNavigation" rbac:minWidth="0" rbac:maxWidth="767">
  <Props>
    <Prop name="items" kind="static">[
      { "icon": "home", "label": "Dashboard", "href": "/admin/finance" },
      { "icon": "receipt", "label": "Transactions", "href": "/admin/finance/transactions" },
      { "icon": "chart", "label": "Reports", "href": "/admin/finance/reports" },
      { "icon": "settings", "label": "Settings", "href": "/admin/finance/settings" }
    ]</Prop>
  </Props>
</Component>

<!-- Desktop: Sidebar navigation -->
<Component id="desktopNav" type="Sidebar" rbac:minWidth="768">
  <!-- Full sidebar with nested menu items -->
</Component>
```

**Data Tables:**
```xml
<!-- Mobile: Card-based list view -->
<Component id="transactionsMobile" type="CardList" rbac:maxWidth="767">
  <Props>
    <Prop name="variant" kind="static">compact</Prop>
    <Prop name="swipeActions" kind="static">true</Prop>
  </Props>
</Component>

<!-- Desktop: Full data grid -->
<Component id="transactionsDesktop" type="AdminDataGridSection" rbac:minWidth="768">
  <!-- Full table with all columns -->
</Component>
```

**Forms:**
```xml
<!-- Mobile: Stacked form fields -->
<Component id="transactionForm" type="FormSection">
  <Props>
    <Prop name="layout" kind="static">stacked</Prop>
    <Prop name="fieldSpacing" kind="static">comfortable</Prop>
  </Props>
</Component>
```

#### Touch-Friendly Design

| Element | Minimum Size | Recommendation |
|---------|--------------|----------------|
| Buttons | 44x44px | 48x48px for primary actions |
| Form inputs | 44px height | 48px for better touch |
| List items | 48px height | 56px with swipe actions |
| Icon buttons | 44x44px | Include padding around icon |
| Spacing | 8px minimum | 12-16px between touch targets |

### 12.3 Modern Design Patterns

#### Design System Components

**Dashboard Cards (Stats Panel):**
```typescript
interface StatCard {
  label: string;
  value: string;
  trend: 'up' | 'down' | 'flat';
  trendValue?: string;
  icon?: string;
  color?: 'default' | 'success' | 'warning' | 'danger';
}

// Example usage
const dashboardStats: StatCard[] = [
  {
    label: 'Monthly Income',
    value: '$45,230.00',
    trend: 'up',
    trendValue: '+12.5%',
    icon: 'trending-up',
    color: 'success',
  },
  {
    label: 'Monthly Expenses',
    value: '$32,150.00',
    trend: 'down',
    trendValue: '-5.2%',
    icon: 'trending-down',
    color: 'default',
  },
];
```

**Action Sheets (Mobile):**
```typescript
interface ActionSheetItem {
  id: string;
  label: string;
  icon?: string;
  variant?: 'default' | 'destructive';
  disabled?: boolean;
}

// Transaction actions on mobile
const transactionActions: ActionSheetItem[] = [
  { id: 'view', label: 'View Details', icon: 'eye' },
  { id: 'edit', label: 'Edit Transaction', icon: 'edit' },
  { id: 'approve', label: 'Approve', icon: 'check', variant: 'default' },
  { id: 'void', label: 'Void Transaction', icon: 'x', variant: 'destructive' },
];
```

**Skeleton Loading States:**
```xml
<Component id="loadingState" type="SkeletonLoader">
  <Props>
    <Prop name="variant" kind="static">table</Prop>
    <Prop name="rows" kind="static">5</Prop>
    <Prop name="animated" kind="static">true</Prop>
  </Props>
</Component>
```

#### Visual Hierarchy

```
┌─────────────────────────────────────────────────────────────┐
│  HEADER                                                      │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ Eyebrow Text (small, muted)                             ││
│  │ Main Headline (large, bold)                             ││
│  │ Description (medium, muted)                             ││
│  └─────────────────────────────────────────────────────────┘│
├─────────────────────────────────────────────────────────────┤
│  STATS ROW (4 cards on desktop, 2x2 grid on mobile)         │
│  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐               │
│  │ Metric │ │ Metric │ │ Metric │ │ Metric │               │
│  └────────┘ └────────┘ └────────┘ └────────┘               │
├─────────────────────────────────────────────────────────────┤
│  CONTENT AREA                                                │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ Data Table / Card List / Form                           ││
│  │ (Scrollable, with sticky header)                        ││
│  └─────────────────────────────────────────────────────────┘│
├─────────────────────────────────────────────────────────────┤
│  FOOTER / ACTIONS (Sticky on mobile)                         │
│  [Cancel]                                    [Save Changes] │
└─────────────────────────────────────────────────────────────┘
```

### 12.4 Interaction Patterns

#### Confirmation Dialogs

**Always confirm destructive actions:**
```typescript
interface ConfirmDialog {
  title: string;
  description: string;
  confirmLabel: string;
  confirmVariant: 'default' | 'destructive';
  cancelLabel: string;
  requireInput?: string; // For extra confirmation (e.g., type "DELETE")
}

// Void transaction confirmation
const voidConfirmation: ConfirmDialog = {
  title: 'Void Transaction',
  description: 'This will create a reversal entry and mark the transaction as voided. This action cannot be undone.',
  confirmLabel: 'Void Transaction',
  confirmVariant: 'destructive',
  cancelLabel: 'Cancel',
};

// Delete account confirmation with input
const deleteConfirmation: ConfirmDialog = {
  title: 'Delete Account',
  description: 'This will permanently delete the account and all associated data.',
  confirmLabel: 'Delete',
  confirmVariant: 'destructive',
  cancelLabel: 'Cancel',
  requireInput: 'DELETE', // User must type "DELETE" to confirm
};
```

#### Form Validation

**Inline validation with helpful messages:**
```typescript
interface FieldValidation {
  required?: { message: string };
  min?: { value: number; message: string };
  max?: { value: number; message: string };
  pattern?: { value: RegExp; message: string };
  custom?: (value: any) => string | null;
}

// Transaction amount validation
const amountValidation: FieldValidation = {
  required: { message: 'Amount is required' },
  min: { value: 0.01, message: 'Amount must be at least $0.01' },
  max: { value: 999999999.99, message: 'Amount exceeds maximum allowed' },
};

// Account number validation
const accountNumberValidation: FieldValidation = {
  required: { message: 'Account number is required' },
  pattern: {
    value: /^[A-Z0-9-]+$/i,
    message: 'Account number can only contain letters, numbers, and hyphens',
  },
};
```

#### Empty States

**Provide helpful empty states with clear actions:**
```typescript
interface EmptyState {
  icon: string;
  title: string;
  description: string;
  action?: {
    label: string;
    href?: string;
    handler?: string;
  };
}

// No transactions empty state
const noTransactionsState: EmptyState = {
  icon: 'receipt',
  title: 'No Transactions Yet',
  description: 'Start by recording your first income or expense transaction.',
  action: {
    label: 'Record Transaction',
    href: '/admin/finance/transactions/entry',
  },
};

// No search results empty state
const noResultsState: EmptyState = {
  icon: 'search',
  title: 'No Results Found',
  description: 'Try adjusting your search or filters to find what you\'re looking for.',
  action: {
    label: 'Clear Filters',
    handler: 'clearFilters',
  },
};
```

### 12.5 Accessibility Requirements

#### WCAG 2.1 AA Compliance

| Requirement | Implementation |
|-------------|----------------|
| **Color Contrast** | 4.5:1 for text, 3:1 for UI components |
| **Focus Indicators** | Visible focus ring on all interactive elements |
| **Keyboard Navigation** | All functionality accessible via keyboard |
| **Screen Readers** | Proper ARIA labels and live regions |
| **Motion** | Respect `prefers-reduced-motion` |
| **Text Sizing** | Support up to 200% zoom without loss of functionality |

#### Accessible Component Patterns

```xml
<!-- Accessible form field -->
<Component id="amountField" type="FormField">
  <Props>
    <Prop name="name" kind="static">amount</Prop>
    <Prop name="label" kind="static">Transaction Amount</Prop>
    <Prop name="type" kind="static">currency</Prop>
    <Prop name="required" kind="static">true</Prop>
    <Prop name="aria-describedby" kind="static">amount-hint</Prop>
    <Prop name="hint" kind="static">Enter the total amount in dollars</Prop>
    <Prop name="errorId" kind="static">amount-error</Prop>
  </Props>
</Component>

<!-- Accessible data table -->
<Component id="transactionTable" type="AdminDataGridSection">
  <Props>
    <Prop name="aria-label" kind="static">Financial transactions list</Prop>
    <Prop name="caption" kind="static">Recent transactions for the current period</Prop>
    <Prop name="sortable" kind="static">true</Prop>
    <Prop name="aria-sort" kind="binding" contract="currentSort"/>
  </Props>
</Component>
```

---

## 13. Role-Based Access Control

### 13.1 Existing Role Personas

StewardTrack uses an **11-role church-specific persona model** with a **Maker-Checker pattern** for finance. The Finance Module integrates with these existing personas rather than creating separate finance roles.

#### Church Role Personas

```
┌─────────────────────────────────────────────────────────────┐
│              CHURCH ROLE PERSONAS (11 Roles)                 │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ADMINISTRATIVE                                              │
│  ┌─────────────────┐  ┌─────────────────┐                   │
│  │  tenant_admin   │  │    secretary    │                   │
│  │ (Full Control)  │  │ (Admin Support) │                   │
│  └─────────────────┘  └─────────────────┘                   │
│                                                              │
│  PASTORAL                                                    │
│  ┌─────────────────┐  ┌─────────────────┐                   │
│  │  senior_pastor  │  │associate_pastor │                   │
│  │ (Primary Leader)│  │ (Pastoral Staff)│                   │
│  └─────────────────┘  └─────────────────┘                   │
│                                                              │
│  FINANCE (Maker-Checker Pattern)                             │
│  ┌─────────────────┐  ┌─────────────────┐                   │
│  │   treasurer     │──│     auditor     │                   │
│  │   (MAKER)       │  │   (CHECKER)     │                   │
│  │ Creates entries │  │ Approves/Posts  │                   │
│  └─────────────────┘  └─────────────────┘                   │
│                                                              │
│  GOVERNANCE                                                  │
│  ┌─────────────────┐                                        │
│  │  deacon_elder   │  Budget approval, oversight            │
│  │ (Board Member)  │                                        │
│  └─────────────────┘                                        │
│                                                              │
│  MINISTRY & VOLUNTEER                                        │
│  ┌─────────────────┐  ┌─────────────────┐                   │
│  │ ministry_leader │  │    volunteer    │                   │
│  │ (Group Leader)  │  │ (Task Access)   │                   │
│  └─────────────────┘  └─────────────────┘                   │
│                                                              │
│  CONGREGATION                                                │
│  ┌─────────────────┐  ┌─────────────────┐                   │
│  │     member      │  │     visitor     │                   │
│  │ (Self-Service)  │  │ (Public Access) │                   │
│  └─────────────────┘  └─────────────────┘                   │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

#### Finance-Specific Roles

| Persona | Finance Responsibility | Key Permissions |
|---------|----------------------|-----------------|
| **treasurer** | **MAKER** - Creates financial transactions, journal entries | `finance:create`, `finance:edit`, `finance:view` |
| **auditor** | **CHECKER** - Approves and posts transactions | `finance:approve`, `finance:view`, `reports:view` |
| **deacon_elder** | Budget approval, financial oversight | `budgets:approve`, `finance:view_summary`, `reports:view` |
| **tenant_admin** | Full administrative access | All finance permissions |
| **senior_pastor** | Operational oversight | `finance:view`, `reports:view`, `budgets:view` |

### 13.2 Maker-Checker Pattern

The Finance Module implements **segregation of duties** through the Maker-Checker pattern:

```
┌─────────────────────────────────────────────────────────────┐
│                  MAKER-CHECKER WORKFLOW                      │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  TREASURER (Maker)              AUDITOR (Checker)            │
│  ┌──────────────┐               ┌──────────────┐            │
│  │ 1. Create    │               │ 3. Review    │            │
│  │    Draft     │───Submit───▶  │    Entry     │            │
│  └──────────────┘               └──────┬───────┘            │
│                                        │                     │
│                                        ▼                     │
│                                 ┌──────────────┐            │
│                                 │ 4. Approve   │            │
│                                 │    or Reject │            │
│                                 └──────┬───────┘            │
│                                        │                     │
│                          ┌─────────────┴─────────────┐      │
│                          ▼                           ▼      │
│                   ┌──────────────┐          ┌──────────────┐│
│                   │ 5. Posted    │          │ Return to    ││
│                   │ (Final)      │          │ Treasurer    ││
│                   └──────────────┘          └──────────────┘│
│                                                              │
│  DEACON/ELDER: Budget approval authority                    │
│  TENANT_ADMIN: Override capability for exceptional cases    │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 13.3 Permission Matrix by Persona

| Permission | tenant_admin | senior_pastor | treasurer | auditor | deacon_elder | secretary | member |
|------------|:------------:|:-------------:|:---------:|:-------:|:------------:|:---------:|:------:|
| **Dashboard** |
| View dashboard metrics | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✗ |
| View fund balances | ✓ | ✓ | ✓ | ✓ | ✓ | ✗ | ✗ |
| **Transactions** |
| View transactions | ✓ | ✓ | ✓ | ✓ | ✓ | ✗ | ✗ |
| Create transaction (Maker) | ✓ | ✗ | ✓ | ✗ | ✗ | ✗ | ✗ |
| Edit draft transaction | ✓ | ✗ | ✓ | ✗ | ✗ | ✗ | ✗ |
| Submit for approval | ✓ | ✗ | ✓ | ✗ | ✗ | ✗ | ✗ |
| Approve transaction (Checker) | ✓ | ✗ | ✗ | ✓ | ✗ | ✗ | ✗ |
| Post transaction | ✓ | ✗ | ✗ | ✓ | ✗ | ✗ | ✗ |
| Void transaction | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| **Reports** |
| View financial reports | ✓ | ✓ | ✓ | ✓ | ✓ | ✗ | ✗ |
| View summary only | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Export reports | ✓ | ✓ | ✓ | ✓ | ✓ | ✗ | ✗ |
| **Configuration** |
| Manage chart of accounts | ✓ | ✗ | ✓ | ✓ | ✗ | ✗ | ✗ |
| Manage funds | ✓ | ✗ | ✓ | ✓ | ✗ | ✗ | ✗ |
| Manage categories | ✓ | ✗ | ✓ | ✓ | ✗ | ✗ | ✗ |
| Manage fiscal years | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| Close fiscal year | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| **Budgets** |
| View budgets | ✓ | ✓ | ✓ | ✓ | ✓ | ✗ | ✗ |
| Create/edit budgets | ✓ | ✗ | ✓ | ✗ | ✗ | ✗ | ✗ |
| Approve budgets | ✓ | ✗ | ✗ | ✗ | ✓ | ✗ | ✗ |
| **Giving (Member Self-Service)** |
| View own giving history | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Download giving statement | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| **Administration** |
| Manage opening balances | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| View audit logs | ✓ | ✗ | ✗ | ✓ | ✗ | ✗ | ✗ |

### 13.4 RBAC Implementation in XML

#### Component-Level Access Control

```xml
<!-- Only show to users with approve permission (Auditor role) -->
<Component id="approveButton" type="Button" rbac:permission="finance:approve">
  <Props>
    <Prop name="label" kind="static">Approve</Prop>
    <Prop name="variant" kind="static">primary</Prop>
    <Prop name="handler" kind="static">admin-finance.transactions.approve</Prop>
  </Props>
</Component>

<!-- Only show void button to tenant_admin -->
<Component id="voidButton" type="Button" rbac:roles="tenant_admin">
  <Props>
    <Prop name="label" kind="static">Void Transaction</Prop>
    <Prop name="variant" kind="static">destructive</Prop>
    <Prop name="handler" kind="static">admin-finance.transactions.void</Prop>
  </Props>
</Component>

<!-- Create button only for Treasurer (Maker) -->
<Component id="createButton" type="Button" rbac:permission="finance:create">
  <Props>
    <Prop name="label" kind="static">New Transaction</Prop>
    <Prop name="variant" kind="static">primary</Prop>
    <Prop name="href" kind="static">/admin/finance/transactions/entry</Prop>
  </Props>
</Component>

<!-- Budget approval only for Deacon/Elder -->
<Component id="approveBudgetButton" type="Button" rbac:permission="budgets:approve">
  <Props>
    <Prop name="label" kind="static">Approve Budget</Prop>
    <Prop name="variant" kind="static">primary</Prop>
    <Prop name="handler" kind="static">admin-finance.budgets.approve</Prop>
  </Props>
</Component>

<!-- Configuration section for Treasurer and Auditor -->
<Region id="configSection" rbac:roles="tenant_admin,treasurer,auditor">
  <!-- Chart of accounts, funds, categories management -->
</Region>
```

#### Action-Level Permission Checking

```typescript
// In action handler - uses existing RBAC service
async function handleApproveTransaction(
  execution: MetadataActionExecution
): Promise<MetadataActionResult> {
  const rbacService = container.get<RbacCoreService>(TYPES.RbacCoreService);

  // Check if user has finance:approve permission (Auditor role)
  const permissions = await rbacService.getUserEffectivePermissions(
    execution.context.userId,
    execution.context.tenantId
  );

  if (!permissions.some(p => p.code === 'finance:approve')) {
    return {
      success: false,
      status: 403,
      message: 'Only the Auditor can approve transactions.',
      errors: {},
    };
  }

  // Proceed with approval...
}
```

### 13.5 Persona-Specific User Experience

#### Tenant Admin Dashboard

```
┌─────────────────────────────────────────────────────────────┐
│  TENANT ADMIN VIEW                                           │
├─────────────────────────────────────────────────────────────┤
│  Quick Actions:                                              │
│  [+ New Transaction] [Approve Pending] [Run Reports]        │
│  [Close Period] [Year-End Close] [Audit Log]                │
├─────────────────────────────────────────────────────────────┤
│  System Alerts:                                              │
│  ⚠️ 5 transactions pending approval                          │
│  ⚠️ Fiscal period closing in 3 days                          │
│  ✓ All accounts reconciled                                   │
├─────────────────────────────────────────────────────────────┤
│  Full administrative access - override capability           │
└─────────────────────────────────────────────────────────────┘
```

#### Treasurer Dashboard (Maker)

```
┌─────────────────────────────────────────────────────────────┐
│  TREASURER VIEW (Maker)                                      │
├─────────────────────────────────────────────────────────────┤
│  Quick Actions:                                              │
│  [+ New Transaction] [My Drafts] [Submit for Approval]      │
├─────────────────────────────────────────────────────────────┤
│  My Activity:                                                │
│  • 3 drafts pending submission                               │
│  • 2 transactions returned for revision                      │
│  • 15 transactions submitted this month                      │
├─────────────────────────────────────────────────────────────┤
│  Focus: Transaction entry and submission                    │
│  Cannot: Approve or post transactions (Maker-Checker)       │
└─────────────────────────────────────────────────────────────┘
```

#### Auditor Dashboard (Checker)

```
┌─────────────────────────────────────────────────────────────┐
│  AUDITOR VIEW (Checker)                                      │
├─────────────────────────────────────────────────────────────┤
│  Pending Approvals:                                          │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ 5 transactions awaiting your approval                  │ │
│  │ [Review All] [Filter by Amount]                        │ │
│  └────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────┤
│  Quick Actions:                                              │
│  [Review Queue] [Audit Log] [Financial Reports]             │
├─────────────────────────────────────────────────────────────┤
│  Focus: Review, approve, and post transactions              │
│  Cannot: Create transactions (Maker-Checker separation)     │
└─────────────────────────────────────────────────────────────┘
```

#### Deacon/Elder Dashboard (Governance)

```
┌─────────────────────────────────────────────────────────────┐
│  DEACON/ELDER VIEW (Board Oversight)                         │
├─────────────────────────────────────────────────────────────┤
│  Financial Summary:                                          │
│  • YTD Income: $542,300                                      │
│  • YTD Expenses: $398,150                                    │
│  • Net: $144,150                                             │
├─────────────────────────────────────────────────────────────┤
│  Budget Approvals Needed:                                    │
│  • Q2 Ministry Budget - $45,000 [Review]                     │
│  • Building Fund Allocation - $12,000 [Review]               │
├─────────────────────────────────────────────────────────────┤
│  Quick Reports:                                              │
│  [Income Statement] [Balance Sheet] [Budget vs Actual]      │
├─────────────────────────────────────────────────────────────┤
│  Focus: Budget approval and financial oversight             │
└─────────────────────────────────────────────────────────────┘
```

#### Member Dashboard (Self-Service)

```
┌─────────────────────────────────────────────────────────────┐
│  MEMBER VIEW (Self-Service Giving)                           │
├─────────────────────────────────────────────────────────────┤
│  My Giving This Year: $2,450.00                              │
├─────────────────────────────────────────────────────────────┤
│  Quick Actions:                                              │
│  [View Giving History] [Download Statement] [Give Online]   │
├─────────────────────────────────────────────────────────────┤
│  Recent Contributions:                                       │
│  • Jan 7, 2026 - Tithe - $200.00                             │
│  • Jan 14, 2026 - Building Fund - $50.00                     │
│  • Jan 14, 2026 - Tithe - $200.00                            │
├─────────────────────────────────────────────────────────────┤
│  Limited view: Own giving history only                      │
└─────────────────────────────────────────────────────────────┘
```

### 13.6 Permission Checking Utilities

```typescript
// Permission check utilities using existing permission codes
interface FinancePermissions {
  // View permissions
  canViewDashboard: boolean;
  canViewTransactions: boolean;
  canViewSummaryOnly: boolean;
  canViewReports: boolean;
  canViewBudgets: boolean;
  canViewAuditLog: boolean;

  // Maker permissions (Treasurer)
  canCreateTransaction: boolean;
  canEditTransaction: boolean;
  canCreateBudget: boolean;

  // Checker permissions (Auditor)
  canApproveTransaction: boolean;

  // Governance permissions (Deacon/Elder)
  canApproveBudget: boolean;

  // Admin permissions
  canVoidTransaction: boolean;
  canManageFiscalYears: boolean;
  canExportReports: boolean;

  // Self-service (Member)
  canViewOwnGiving: boolean;
}

async function getFinancePermissions(
  userId: string,
  tenantId: string
): Promise<FinancePermissions> {
  const rbacService = container.get<RbacCoreService>(TYPES.RbacCoreService);
  const permissions = await rbacService.getUserEffectivePermissions(userId, tenantId);
  const permCodes = permissions.map(p => p.code);

  return {
    // View permissions
    canViewDashboard: permCodes.includes('finance:view'),
    canViewTransactions: permCodes.includes('finance:view'),
    canViewSummaryOnly: permCodes.includes('finance:view_summary'),
    canViewReports: permCodes.includes('reports:view'),
    canViewBudgets: permCodes.includes('budgets:view'),
    canViewAuditLog: permCodes.includes('rbac:audit_view'),

    // Maker permissions (Treasurer)
    canCreateTransaction: permCodes.includes('finance:create'),
    canEditTransaction: permCodes.includes('finance:edit'),
    canCreateBudget: permCodes.includes('budgets:create'),

    // Checker permissions (Auditor)
    canApproveTransaction: permCodes.includes('finance:approve'),

    // Governance permissions (Deacon/Elder)
    canApproveBudget: permCodes.includes('budgets:approve'),

    // Admin permissions
    canVoidTransaction: permCodes.includes('finance:delete'),
    canManageFiscalYears: permCodes.includes('settings:edit'),
    canExportReports: permCodes.includes('reports:export_advanced'),

    // Self-service (Member)
    canViewOwnGiving: permCodes.includes('giving:view'),
  };
}

// Helper to check if user is in a specific persona role
async function getUserPersona(
  userId: string,
  tenantId: string
): Promise<string | null> {
  const rbacService = container.get<RbacCoreService>(TYPES.RbacCoreService);
  const userRoles = await rbacService.getUserRoles(userId, tenantId);

  // Return primary finance-related persona
  const financePersonas = ['tenant_admin', 'treasurer', 'auditor', 'deacon_elder'];
  const userPersona = userRoles.find(r =>
    financePersonas.includes(r.metadata_key?.replace('role_', '') || '')
  );

  return userPersona?.metadata_key?.replace('role_', '') || null;
}
```

---

## 14. Notifications System

**Implementation Status: ✅ Complete**

The finance module integrates with StewardTrack's existing notification infrastructure:
- **Toast notifications** via sonner library (already in app layout)
- **In-app notifications** via `NotificationService` and `NotificationBell` component
- **Workflow notifications** via `finance-notifications.ts` helper module
- **Email notifications** ready via `EmailChannel` and `notification_templates` table

**Key Implementation Files:**
- `src/lib/metadata/services/finance-notifications.ts` - Finance workflow notification helpers
- `src/lib/metadata/services/admin-finance-transactions.ts` - Action handlers with toast + notification integration
- `src/services/notification/NotificationService.ts` - Core notification service
- `src/components/notifications/NotificationBell.tsx` - Header notification bell with unread count

### 14.1 Notification Types

#### Toast Notifications (Immediate Feedback)

```typescript
interface ToastNotification {
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  description?: string;
  duration?: number; // ms, default 5000
  action?: {
    label: string;
    handler: () => void;
  };
}

// Success notification
const transactionSaved: ToastNotification = {
  type: 'success',
  title: 'Transaction Saved',
  description: 'Transaction #TXN-20260115-001 has been saved as draft.',
  duration: 5000,
  action: {
    label: 'View',
    handler: () => navigate('/admin/finance/transactions/view/123'),
  },
};

// Error notification with retry
const saveFailed: ToastNotification = {
  type: 'error',
  title: 'Save Failed',
  description: 'Unable to save transaction. Please try again.',
  duration: 0, // Persist until dismissed
  action: {
    label: 'Retry',
    handler: () => retryAction(),
  },
};
```

#### In-App Notifications (Persistent)

```typescript
interface AppNotification {
  id: string;
  type: 'approval_required' | 'task_assigned' | 'deadline' | 'system';
  title: string;
  message: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  actionUrl?: string;
  createdAt: Date;
  readAt?: Date;
  expiresAt?: Date;
}

// Pending approval notification
const approvalNotification: AppNotification = {
  id: 'notif-123',
  type: 'approval_required',
  title: 'Transaction Pending Approval',
  message: '5 transactions are waiting for your approval.',
  priority: 'high',
  actionUrl: '/admin/finance/transactions?status=submitted',
  createdAt: new Date(),
};
```

### 14.2 Notification Triggers

#### Transaction Workflow Notifications

| Event | Recipients | Notification Type |
|-------|------------|-------------------|
| Transaction submitted | Approvers | In-app + Email (optional) |
| Transaction approved | Creator | Toast + In-app |
| Transaction rejected | Creator | Toast + In-app |
| Transaction posted | Creator, Approver | Toast |
| Transaction voided | Creator, Approver | In-app + Email |

#### Financial Alert Notifications

| Event | Recipients | Notification Type |
|-------|------------|-------------------|
| Budget threshold reached (80%) | Budget owner | In-app |
| Budget exceeded (100%) | Admin, Budget owner | In-app + Email |
| Fiscal period closing soon | All finance users | In-app |
| Fiscal year end approaching | Admin | In-app + Email |
| Restricted fund low balance | Admin | In-app |

### 14.3 Notification Implementation

#### Service Handler Integration

```typescript
// In transaction submit handler
const submitTransaction: ServiceDataSourceHandler = async (request) => {
  // ... create transaction logic

  // Send notification to approvers
  await sendNotification({
    type: 'approval_required',
    title: 'New Transaction Pending Approval',
    message: `Transaction ${transactionNumber} for ${formatCurrency(amount)} requires approval.`,
    recipients: await getApprovers(tenantId),
    priority: 'high',
    actionUrl: `/admin/finance/transactions/view/${transactionId}`,
  });

  return {
    success: true,
    message: 'Transaction submitted for approval.',
    toast: {
      type: 'success',
      title: 'Transaction Submitted',
      description: 'Your transaction has been submitted for approval.',
    },
  };
};
```

#### Toast Component Integration

```xml
<!-- Toast container in layout -->
<Component id="toastContainer" type="ToastProvider">
  <Props>
    <Prop name="position" kind="static">bottom-right</Prop>
    <Prop name="mobilePosition" kind="static">bottom-center</Prop>
    <Prop name="maxToasts" kind="static">3</Prop>
    <Prop name="swipeToDismiss" kind="static">true</Prop>
  </Props>
</Component>
```

### 14.4 Notification Bell Component

```xml
<!-- Notification bell in header -->
<Component id="notificationBell" type="NotificationBell">
  <Props>
    <Prop name="unreadCount" kind="binding" contract="notifications.unreadCount"/>
    <Prop name="notifications" kind="binding" contract="notifications.recent"/>
    <Prop name="onMarkAsRead" kind="static">notifications.markAsRead</Prop>
    <Prop name="onMarkAllAsRead" kind="static">notifications.markAllAsRead</Prop>
    <Prop name="viewAllUrl" kind="static">/admin/notifications</Prop>
  </Props>
</Component>
```

### 14.5 Email Notification Templates

#### Transaction Approval Request

```
Subject: [StewardTrack] Transaction Pending Your Approval

Hi {{approverName}},

A new transaction requires your approval:

Transaction: {{transactionNumber}}
Amount: {{amount}}
Type: {{transactionType}}
Description: {{description}}
Submitted by: {{submitterName}}
Date: {{submissionDate}}

[Review Transaction] {{actionUrl}}

---
This is an automated message from StewardTrack.
To manage your notification preferences, visit Settings > Notifications.
```

#### Budget Alert

```
Subject: [StewardTrack] Budget Alert: {{budgetName}} at {{percentage}}%

Hi {{recipientName}},

The budget "{{budgetName}}" has reached {{percentage}}% of its allocated amount.

Budget: {{budgetName}}
Allocated: {{allocatedAmount}}
Spent: {{spentAmount}}
Remaining: {{remainingAmount}}
Period: {{periodName}}

[View Budget Details] {{actionUrl}}

---
This is an automated message from StewardTrack.
```

### 14.6 Notification Preferences

```typescript
interface NotificationPreferences {
  // In-app notifications (always enabled)
  inApp: {
    approvalRequests: boolean;  // Default: true
    taskAssignments: boolean;   // Default: true
    deadlines: boolean;         // Default: true
    systemAlerts: boolean;      // Default: true
  };

  // Email notifications
  email: {
    approvalRequests: boolean;  // Default: true
    transactionVoided: boolean; // Default: true
    budgetAlerts: boolean;      // Default: true
    fiscalYearAlerts: boolean;  // Default: true
    weeklyDigest: boolean;      // Default: false
  };

  // Push notifications (mobile)
  push: {
    enabled: boolean;           // Default: false
    approvalRequests: boolean;  // Default: true
    urgentAlerts: boolean;      // Default: true
  };
}
```

---

## Appendix A: File Reference

### Service Handler Files

| File | Line Count | Last Updated |
|------|------------|--------------|
| `admin-finance.ts` | ~50 | Aggregator |
| `admin-finance-accounts.ts` | ~400 | Complete |
| `admin-finance-sources.ts` | ~350 | Complete |
| `admin-finance-funds.ts` | ~400 | Complete |
| `admin-finance-categories.ts` | ~600 | Complete |
| `admin-finance-budgets.ts` | ~550 | Complete |
| `admin-finance-fiscal-years.ts` | ~530 | Complete |
| `admin-finance-opening-balances.ts` | ~770 | Complete |
| `admin-finance-transactions.ts` | ~530 | Incomplete |
| `admin-finance-reports.ts` | ~490 | Incomplete |
| `admin-finance-dashboard.ts` | ~200 | Incomplete |

### Database Migration Files

| Migration | Purpose |
|-----------|---------|
| `20250410150725_fierce_temple.sql` | Transaction validation functions |
| `20250620130000_accounting_reports.sql` | Report generation functions |
| `20250628000000_funds.sql` | Fund accounting tables |
| `20250708000000_rerun_double_entry_functions.sql` | Double-entry helpers |
| `20250820000000_fiscal_years.sql` | Fiscal year/period management |
| `20250931000006_rbac_audit_monitoring.sql` | Audit logging |

---

## Appendix B: Glossary

| Term | Definition |
|------|------------|
| **Chart of Accounts (COA)** | Master list of GL accounts organized by type |
| **Double-Entry Bookkeeping** | Every transaction has equal debits and credits |
| **Fund Accounting** | Tracking restricted vs unrestricted funds |
| **Fiscal Year** | 12-month accounting period |
| **Fiscal Period** | Monthly subdivision of fiscal year |
| **Journal Entry** | Transaction record with debit and credit lines |
| **Trial Balance** | Report showing all account balances |
| **Income Statement** | Report showing revenue minus expenses |
| **Balance Sheet** | Report showing assets = liabilities + equity |
| **Opening Balance** | Beginning balance for a new fiscal period |
| **Closing Entry** | Year-end entry to zero out income/expense |

---

*Last Updated: January 2026*
*Author: Claude (CPA Review)*
