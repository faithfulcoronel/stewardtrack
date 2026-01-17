# Metadata Services Directory - Architecture & Patterns

## Overview

The `services/` directory contains **service handler functions** that provide data to XML-based metadata pages. These handlers are invoked by the metadata framework to fetch and transform data for components like `AdminDataGridSection`, `HeroSection`, and forms.

**Key Principle:** All data for XML-driven pages flows through service handlers. Components should NOT fetch their own data.

## Service Handler Structure

### Handler Naming Convention

```
admin-<module>.<area>.<page>.<section>
```

**Examples:**
- `admin-finance.transactions.list.table` - Transaction list table data
- `admin-finance.transactions.list.hero` - Transaction list hero section
- `admin-community.members.list.table` - Member list table data

### Handler Pattern

```typescript
const resolveMyPageTable: ServiceDataSourceHandler = async (request) => {
  // 1. Get tenant context
  const tenantService = container.get<TenantService>(TYPES.TenantService);
  const tenant = await tenantService.getCurrentTenant();
  if (!tenant) {
    throw new Error('No tenant context available');
  }

  // 2. Fetch data from repositories
  const myRepo = container.get<IMyRepository>(TYPES.IMyRepository);
  const data = await myRepo.findAll();

  // 3. Transform to rows
  const rows = data.map((item) => ({
    id: item.id,
    name: item.name,
    // ... other fields
  }));

  // 4. Define columns
  const columns = [
    { field: 'name', headerName: 'Name', type: 'text', flex: 1 },
    // ... other columns
  ];

  return { rows, columns };
};
```

## Common Patterns & Fixes

### AdminDataGridSection Column Types

**IMPORTANT FIX:** When using `formatCurrency()` to pre-format amounts in service handlers, use `type: 'text'` for the column, NOT `type: 'currency'`.

```typescript
// WRONG: Using 'currency' type with pre-formatted string
const rows = data.map((item) => ({
  amount: formatCurrency(item.amount, currency), // Returns "₱10,643.00"
}));

const columns = [
  { field: 'amount', headerName: 'Amount', type: 'currency', flex: 0.8 }, // ❌ Shows "—"
];

// CORRECT: Using 'text' type with pre-formatted string
const rows = data.map((item) => ({
  amount: formatCurrency(item.amount, currency), // Returns "₱10,643.00"
}));

const columns = [
  { field: 'amount', headerName: 'Amount', type: 'text', flex: 0.8 }, // ✅ Shows "₱10,643.00"
];
```

**Why?** The `type: 'currency'` expects a numeric value and applies its own formatting. When you pass a pre-formatted string, it fails to parse and displays "—".

**Options:**
1. Use `type: 'text'` and pre-format with `formatCurrency()` (recommended for custom currency)
2. Use `type: 'currency'` and pass raw numeric value (uses default formatting)

### Batch Queries with RPC Functions

When displaying aggregated data (like transaction totals), use RPC functions for efficient batch queries:

```typescript
// Get all header IDs for efficient batch query
const headerIds = allHeaders.map((h) => h.id);

// Fetch amounts for all headers in one query using RPC
const headerAmounts = await ieRepo.getHeaderAmounts(tenant.id, headerIds);

// Build a map for O(1) lookups
const amountMap = new Map<string, { totalAmount: number }>();
for (const row of headerAmounts) {
  amountMap.set(row.header_id, { totalAmount: Number(row.total_amount) || 0 });
}

// Use map when building rows
const rows = allHeaders.map((header) => {
  const amountInfo = amountMap.get(header.id);
  return {
    id: header.id,
    amount: formatCurrency(amountInfo?.totalAmount || 0, currency),
  };
});
```

### Date Range Filters

To add a date range filter to an `AdminDataGridSection`, use filter type `'daterange'` with a `field` that references the raw date value in the row data:

```typescript
// In service handler
const rows = allHeaders.map((header) => ({
  id: header.id,
  date: formatDate(new Date(header.transaction_date), timezone), // Formatted for display
  rawDate: header.transaction_date, // ISO string for filtering
  // ... other fields
}));

const filters = [
  {
    id: 'dateRange',
    type: 'daterange',  // Renders as DatePicker with range mode
    field: 'rawDate',   // Field to filter on (use raw date, not formatted)
    placeholder: 'Filter by date',
  },
  // ... other filters
];
```

**Key Points:**
- Use `type: 'daterange'` for the filter configuration
- The `field` should reference the raw date string (ISO format), not the formatted display value
- The filter uses the `DatePicker` component with `mode="range"`
- Date comparison is done at day granularity (start of day)

### Date Formatting

Use the `formatDate` utility with tenant timezone:

```typescript
import { getTenantTimezone, formatDate } from './datetime-utils';

const timezone = await getTenantTimezone();
const formattedDate = formatDate(new Date(item.date), timezone);
```

### Currency Formatting

Use the `formatCurrency` utility with tenant currency:

```typescript
import { getTenantCurrency, formatCurrency } from './finance-utils';

const currency = await getTenantCurrency();
const formattedAmount = formatCurrency(amount, currency);
```

## File Organization

```
services/
├── admin-finance.ts              # Finance module handlers (aggregator)
├── admin-finance-transactions.ts # Transaction handlers
├── admin-finance-budgets.ts      # Budget handlers
├── admin-community.ts            # Community module handlers (aggregator)
├── admin-community-members.ts    # Member handlers
├── admin-community-planning.ts   # Planning handlers
├── finance-utils.ts              # Currency utilities
├── datetime-utils.ts             # Date/time utilities
├── types.ts                      # Handler type definitions
└── CLAUDE.md                     # This file
```

## Registering Handlers

Handlers are exported and aggregated in module-level files:

```typescript
// admin-finance-transactions.ts
export const adminFinanceTransactionsHandlers: Record<string, ServiceDataSourceHandler> = {
  'admin-finance.transactions.list.hero': resolveTransactionsListHero,
  'admin-finance.transactions.list.table': resolveTransactionsListTable,
};

// admin-finance.ts (aggregator)
import { adminFinanceTransactionsHandlers } from './admin-finance-transactions';

export const adminFinanceHandlers: Record<string, ServiceDataSourceHandler> = {
  ...adminFinanceTransactionsHandlers,
  // ... other finance handlers
};
```

## Related Documentation

- **Metadata System:** `src/lib/metadata/CLAUDE.md`
- **Adapters:** `src/adapters/CLAUDE.md`
- **Repositories:** `src/repositories/CLAUDE.md`
