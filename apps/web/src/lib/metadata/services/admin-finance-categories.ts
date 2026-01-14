/**
 * Admin Finance Categories - Service Handlers
 *
 * Handles data resolution for income, expense, and budget category pages.
 */

import type { ServiceDataSourceHandler } from './types';
import { container } from '@/lib/container';
import { TYPES } from '@/lib/types';
import type { TenantService } from '@/services/TenantService';
import type { ICategoryRepository } from '@/repositories/category.repository';
import type { IIncomeExpenseTransactionRepository } from '@/repositories/incomeExpenseTransaction.repository';
import { getTenantCurrency, formatCurrency } from './finance-utils';

// Helper to get user-friendly transaction type display
const getTransactionTypeDisplay = (type: string): { label: string; variant: string } => {
  switch (type) {
    case 'income':
      return { label: 'Income', variant: 'positive' };
    case 'expense':
      return { label: 'Expense', variant: 'negative' };
    case 'transfer':
      return { label: 'Transfer', variant: 'informative' };
    case 'adjustment':
      return { label: 'Adjustment', variant: 'warning' };
    case 'opening_balance':
      return { label: 'Opening Balance', variant: 'informative' };
    case 'closing_entry':
      return { label: 'Closing Entry', variant: 'secondary' };
    case 'fund_rollover':
      return { label: 'Fund Rollover', variant: 'informative' };
    case 'reversal':
      return { label: 'Reversal', variant: 'warning' };
    case 'allocation':
      return { label: 'Allocation', variant: 'informative' };
    case 'reclass':
      return { label: 'Reclass', variant: 'secondary' };
    case 'refund':
      return { label: 'Refund', variant: 'warning' };
    default:
      return { label: type, variant: 'secondary' };
  }
};

// ==================== SHARED UTILITIES ====================

type CategoryType = 'income_transaction' | 'expense_transaction' | 'budget';

interface CategoryRecord {
  id: string;
  name: string;
  code?: string;
  description?: string;
  type?: string;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

const getCategoryLabel = (type: CategoryType): string => {
  switch (type) {
    case 'income_transaction':
      return 'Income';
    case 'expense_transaction':
      return 'Expense';
    case 'budget':
      return 'Budget';
  }
};

const getCategoryRoute = (type: CategoryType): string => {
  switch (type) {
    case 'income_transaction':
      return 'income-categories';
    case 'expense_transaction':
      return 'expense-categories';
    case 'budget':
      return 'budget-categories';
  }
};

// ==================== INCOME CATEGORY HANDLERS ====================

const resolveIncomeCategoriesListHero: ServiceDataSourceHandler = async (_request) => {
  const tenantService = container.get<TenantService>(TYPES.TenantService);
  const categoryRepository = container.get<ICategoryRepository>(TYPES.ICategoryRepository);

  const tenant = await tenantService.getCurrentTenant();
  if (!tenant) {
    throw new Error('No tenant context available');
  }

  const result = await categoryRepository.findAll();
  const categories = (result.data || []) as CategoryRecord[];
  const incomeCategories = categories.filter((cat) => cat.type === 'income_transaction');
  const activeCount = incomeCategories.filter((cat) => cat.isActive !== false).length;

  return {
    eyebrow: 'Finance',
    headline: 'Income categories',
    description: 'Manage categories for tracking income and revenue sources.',
    metrics: [
      {
        label: 'Total categories',
        value: String(incomeCategories.length),
        caption: 'All income categories',
      },
      {
        label: 'Active',
        value: String(activeCount),
        caption: 'Currently active',
      },
      {
        label: 'Inactive',
        value: String(incomeCategories.length - activeCount),
        caption: 'Disabled categories',
      },
    ],
  };
};

const resolveIncomeCategoriesListSummary: ServiceDataSourceHandler = async (_request) => {
  return {
    items: [
      {
        id: 'total-income',
        label: 'Total income YTD',
        value: '$0.00',
        change: '',
        changeLabel: 'year to date',
        trend: 'flat',
        tone: 'positive',
        description: 'Total income recorded this year.',
      },
      {
        id: 'top-category',
        label: 'Top category',
        value: '—',
        change: '',
        changeLabel: 'highest revenue',
        trend: 'flat',
        tone: 'informative',
        description: 'Category with most income.',
      },
      {
        id: 'transactions',
        label: 'Transactions',
        value: '0',
        change: '',
        changeLabel: 'this month',
        trend: 'flat',
        tone: 'neutral',
        description: 'Income transactions recorded.',
      },
    ],
  };
};

const resolveIncomeCategoriesListTable: ServiceDataSourceHandler = async (_request) => {
  const categoryRepository = container.get<ICategoryRepository>(TYPES.ICategoryRepository);
  const tenantService = container.get<TenantService>(TYPES.TenantService);
  const transactionRepository = container.get<IIncomeExpenseTransactionRepository>(TYPES.IIncomeExpenseTransactionRepository);
  const currency = await getTenantCurrency();

  const tenant = await tenantService.getCurrentTenant();
  if (!tenant) {
    throw new Error('No tenant context available');
  }

  const result = await categoryRepository.findAll();
  const categories = (result.data || []) as CategoryRecord[];
  const incomeCategories = categories.filter((cat) => cat.type === 'income_transaction');

  // Fetch balance for each category
  const rows = await Promise.all(
    incomeCategories.map(async (category) => {
      const balance = await transactionRepository.getCategoryBalance(category.id, tenant.id);
      const formattedBalance = balance.balance < 0
        ? `(${formatCurrency(Math.abs(balance.balance), currency)})`
        : formatCurrency(balance.balance, currency);
      return {
        id: category.id,
        name: category.name,
        code: category.code || '—',
        description: category.description || '—',
        balance: formattedBalance,
        transactions: String(balance.transaction_count),
        status: category.isActive !== false ? 'Active' : 'Inactive',
        statusVariant: category.isActive !== false ? 'success' : 'secondary',
      };
    })
  );

  const columns = [
    { field: 'name', headerName: 'Name', type: 'text', flex: 1.2 },
    { field: 'code', headerName: 'Code', type: 'text', flex: 0.5 },
    { field: 'description', headerName: 'Description', type: 'text', flex: 1.2 },
    { field: 'balance', headerName: 'Balance', type: 'text', align: 'right', flex: 0.7 },
    { field: 'transactions', headerName: 'Txns', type: 'text', align: 'right', flex: 0.4 },
    { field: 'status', headerName: 'Status', type: 'badge', badgeVariantField: 'statusVariant', flex: 0.5 },
    {
      field: 'actions',
      headerName: 'Actions',
      type: 'actions',
      actions: [
        {
          id: 'view-record',
          label: 'View',
          intent: 'view',
          urlTemplate: '/admin/finance/income-categories/{{id}}',
        },
        {
          id: 'edit-record',
          label: 'Edit',
          intent: 'edit',
          urlTemplate: '/admin/finance/income-categories/manage?categoryId={{id}}',
          variant: 'secondary',
        },
      ],
    },
  ];

  const filters = [
    {
      id: 'search',
      type: 'search',
      placeholder: 'Search categories...',
    },
    {
      id: 'status',
      type: 'select',
      placeholder: 'Status',
      options: [
        { label: 'All statuses', value: 'all' },
        { label: 'Active', value: 'active' },
        { label: 'Inactive', value: 'inactive' },
      ],
    },
  ];

  return { rows, columns, filters };
};

const resolveIncomeCategoryProfileHeader: ServiceDataSourceHandler = async (request) => {
  const categoryId = request.params?.categoryId as string;
  const categoryRepository = container.get<ICategoryRepository>(TYPES.ICategoryRepository);
  const tenantService = container.get<TenantService>(TYPES.TenantService);
  const transactionRepository = container.get<IIncomeExpenseTransactionRepository>(TYPES.IIncomeExpenseTransactionRepository);
  const currency = await getTenantCurrency();

  if (!categoryId) {
    throw new Error('Category ID is required');
  }

  const tenant = await tenantService.getCurrentTenant();
  if (!tenant) {
    throw new Error('No tenant context available');
  }

  const category = await categoryRepository.findById(categoryId) as CategoryRecord | null;

  if (!category) {
    throw new Error('Category not found');
  }

  // Get real balance data
  const balance = await transactionRepository.getCategoryBalance(categoryId, tenant.id);

  return {
    eyebrow: category.code || 'INC',
    title: category.name,
    subtitle: category.description || 'Income category',
    badge: {
      label: category.isActive !== false ? 'Active' : 'Inactive',
      variant: category.isActive !== false ? 'success' : 'secondary',
    },
    metrics: [
      {
        label: 'Total income',
        value: formatCurrency(balance.total_income, currency),
        caption: 'All time',
      },
      {
        label: 'Total expense',
        value: formatCurrency(balance.total_expense, currency),
        caption: 'All time',
      },
      {
        label: 'Transactions',
        value: String(balance.transaction_count),
        caption: 'Total count',
      },
    ],
    actions: [],
  };
};

const resolveIncomeCategoryProfileDetails: ServiceDataSourceHandler = async (request) => {
  const categoryId = request.params?.categoryId as string;
  const categoryRepository = container.get<ICategoryRepository>(TYPES.ICategoryRepository);

  if (!categoryId) {
    throw new Error('Category ID is required');
  }

  const category = await categoryRepository.findById(categoryId) as CategoryRecord | null;

  if (!category) {
    throw new Error('Category not found');
  }

  return {
    panels: [
      {
        id: 'category-info',
        title: 'Category information',
        description: 'Basic category details',
        columns: 2,
        items: [
          { label: 'Name', value: category.name, type: 'text' },
          { label: 'Code', value: category.code || '—', type: 'text' },
          { label: 'Type', value: 'Income', type: 'badge', badgeVariant: 'positive' },
          { label: 'Status', value: category.isActive !== false ? 'Active' : 'Inactive', type: 'badge', badgeVariant: category.isActive !== false ? 'success' : 'secondary' },
          { label: 'Description', value: category.description || '—', type: 'multiline' },
        ],
      },
    ],
  };
};

const resolveIncomeCategoryProfileUsageSummary: ServiceDataSourceHandler = async (request) => {
  const categoryId = request.params?.categoryId as string;
  const tenantService = container.get<TenantService>(TYPES.TenantService);
  const transactionRepository = container.get<IIncomeExpenseTransactionRepository>(TYPES.IIncomeExpenseTransactionRepository);
  const currency = await getTenantCurrency();

  if (!categoryId) {
    throw new Error('Category ID is required');
  }

  const tenant = await tenantService.getCurrentTenant();
  if (!tenant) {
    throw new Error('No tenant context available');
  }

  // Get real balance data
  const balance = await transactionRepository.getCategoryBalance(categoryId, tenant.id);

  return {
    items: [
      {
        id: 'total-income',
        label: 'Total income',
        value: formatCurrency(balance.total_income, currency),
        change: '',
        changeLabel: 'all time',
        trend: 'flat',
        tone: 'positive',
      },
      {
        id: 'total-expense',
        label: 'Total expense',
        value: formatCurrency(balance.total_expense, currency),
        change: '',
        changeLabel: 'all time',
        trend: 'flat',
        tone: 'negative',
      },
      {
        id: 'transaction-count',
        label: 'Transactions',
        value: String(balance.transaction_count),
        change: '',
        changeLabel: 'total count',
        trend: 'flat',
        tone: 'neutral',
      },
    ],
  };
};

const resolveIncomeCategoryProfileTransactions: ServiceDataSourceHandler = async (request) => {
  const categoryId = request.params?.categoryId as string;
  const tenantService = container.get<TenantService>(TYPES.TenantService);
  const transactionRepository = container.get<IIncomeExpenseTransactionRepository>(TYPES.IIncomeExpenseTransactionRepository);
  const currency = await getTenantCurrency();

  if (!categoryId) {
    throw new Error('Category ID is required');
  }

  const tenant = await tenantService.getCurrentTenant();
  if (!tenant) {
    throw new Error('No tenant context available');
  }

  // Get real transactions
  const transactions = await transactionRepository.getByCategoryId(categoryId, tenant.id);

  const rows = transactions.map((txn) => {
    const typeDisplay = getTransactionTypeDisplay(txn.transaction_type);
    const isDebit = ['expense', 'adjustment', 'allocation', 'closing_entry'].includes(txn.transaction_type);
    const formattedAmount = isDebit
      ? `(${formatCurrency(txn.amount, currency)})`
      : formatCurrency(txn.amount, currency);

    return {
      id: txn.id,
      date: new Date(txn.transaction_date).toLocaleDateString(),
      type: typeDisplay.label,
      typeVariant: typeDisplay.variant,
      description: txn.description || '—',
      fund: txn.fund_name || '—',
      source: txn.source_name || '—',
      amount: formattedAmount,
      reference: txn.reference || '—',
    };
  });

  return {
    rows,
    columns: [
      { field: 'date', headerName: 'Date', type: 'text', flex: 0.7 },
      { field: 'type', headerName: 'Type', type: 'badge', badgeVariantField: 'typeVariant', flex: 0.6 },
      { field: 'description', headerName: 'Description', type: 'text', flex: 1.2 },
      { field: 'fund', headerName: 'Fund', type: 'text', flex: 0.8 },
      { field: 'source', headerName: 'Source', type: 'text', flex: 0.8 },
      { field: 'amount', headerName: 'Amount', type: 'text', align: 'right', flex: 0.8 },
    ],
    emptyState: {
      title: 'No transactions',
      description: 'No transactions have been recorded for this category yet.',
    },
  };
};

const resolveIncomeCategoryManageHeader: ServiceDataSourceHandler = async (request) => {
  const categoryId = request.params?.categoryId as string;

  if (!categoryId) {
    return {
      eyebrow: 'Finance',
      headline: 'Add income category',
      description: 'Create a new category for tracking income.',
    };
  }

  return {
    eyebrow: 'Finance',
    headline: 'Edit income category',
    description: 'Update income category details.',
  };
};

const resolveIncomeCategoryManageForm: ServiceDataSourceHandler = async (request) => {
  const categoryId = request.params?.categoryId as string;
  const categoryRepository = container.get<ICategoryRepository>(TYPES.ICategoryRepository);

  let values = {
    name: '',
    code: '',
    description: '',
    isActive: true,
  };

  if (categoryId) {
    const category = await categoryRepository.findById(categoryId) as CategoryRecord | null;

    if (category) {
      values = {
        name: category.name,
        code: category.code || '',
        description: category.description || '',
        isActive: category.isActive !== false,
      };
    }
  }

  return {
    fields: [
      {
        name: 'name',
        label: 'Category name',
        type: 'text',
        colSpan: 'half',
        required: true,
        placeholder: 'e.g., Tithes, Offerings, Donations',
      },
      {
        name: 'code',
        label: 'Category code',
        type: 'text',
        colSpan: 'half',
        placeholder: 'e.g., INC-001',
      },
      {
        name: 'description',
        label: 'Description',
        type: 'textarea',
        colSpan: 'full',
        placeholder: 'Describe this income category...',
        rows: 3,
      },
      {
        name: 'isActive',
        label: 'Active',
        type: 'toggle',
        colSpan: 'full',
        helperText: 'Inactive categories cannot be used for new transactions.',
      },
    ],
    values,
    validation: {
      name: { required: true },
    },
    submitLabel: categoryId ? 'Update category' : 'Create category',
  };
};

const saveIncomeCategory: ServiceDataSourceHandler = async (request) => {
  const tenantService = container.get<TenantService>(TYPES.TenantService);
  const categoryRepository = container.get<ICategoryRepository>(TYPES.ICategoryRepository);

  const tenant = await tenantService.getCurrentTenant();
  if (!tenant) {
    throw new Error('No tenant context available');
  }

  // Form values are wrapped in 'values' by AdminFormSubmitHandler
  const params = request.params as Record<string, unknown>;
  const values = (params.values ?? params) as Record<string, unknown>;
  const categoryId = (values.categoryId ?? params.categoryId) as string | undefined;

  const formData = {
    name: values.name as string,
    code: values.code as string | undefined,
    description: values.description as string | undefined,
    isActive: values.isActive === true || values.isActive === 'true',
  };

  if (!formData.name) {
    return {
      success: false,
      message: 'Category name is required',
    };
  }

  try {
    if (categoryId) {
      // Update existing category
      await categoryRepository.update(categoryId, {
        name: formData.name,
        code: formData.code || undefined,
        description: formData.description || undefined,
        isActive: formData.isActive !== false,
      } as Partial<CategoryRecord>);

      return {
        success: true,
        message: 'Income category updated successfully',
        redirectUrl: '/admin/finance/income-categories',
      };
    } else {
      // Create new category
      await categoryRepository.create({
        name: formData.name,
        code: formData.code || undefined,
        description: formData.description || undefined,
        type: 'income_transaction',
        isActive: formData.isActive !== false,
        tenant_id: tenant.id,
      } as Partial<CategoryRecord>);

      return {
        success: true,
        message: 'Income category created successfully',
        redirectUrl: '/admin/finance/income-categories',
      };
    }
  } catch (error) {
    console.error('Error saving income category:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to save income category',
    };
  }
};

const deleteIncomeCategory: ServiceDataSourceHandler = async (request) => {
  const categoryRepository = container.get<ICategoryRepository>(TYPES.ICategoryRepository);
  const categoryId = request.params?.categoryId as string;

  if (!categoryId) {
    return {
      success: false,
      message: 'Category ID is required',
    };
  }

  try {
    await categoryRepository.delete(categoryId);
    return {
      success: true,
      message: 'Income category deleted successfully',
      redirectUrl: '/admin/finance/income-categories',
    };
  } catch (error) {
    console.error('Error deleting income category:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to delete income category',
    };
  }
};

// ==================== EXPENSE CATEGORY HANDLERS ====================

const resolveExpenseCategoriesListHero: ServiceDataSourceHandler = async (_request) => {
  const tenantService = container.get<TenantService>(TYPES.TenantService);
  const categoryRepository = container.get<ICategoryRepository>(TYPES.ICategoryRepository);

  const tenant = await tenantService.getCurrentTenant();
  if (!tenant) {
    throw new Error('No tenant context available');
  }

  const result = await categoryRepository.findAll();
  const categories = (result.data || []) as CategoryRecord[];
  const expenseCategories = categories.filter((cat) => cat.type === 'expense_transaction');
  const activeCount = expenseCategories.filter((cat) => cat.isActive !== false).length;

  return {
    eyebrow: 'Finance',
    headline: 'Expense categories',
    description: 'Manage categories for tracking expenses and costs.',
    metrics: [
      {
        label: 'Total categories',
        value: String(expenseCategories.length),
        caption: 'All expense categories',
      },
      {
        label: 'Active',
        value: String(activeCount),
        caption: 'Currently active',
      },
      {
        label: 'Inactive',
        value: String(expenseCategories.length - activeCount),
        caption: 'Disabled categories',
      },
    ],
  };
};

const resolveExpenseCategoriesListSummary: ServiceDataSourceHandler = async (_request) => {
  return {
    items: [
      {
        id: 'total-expenses',
        label: 'Total expenses YTD',
        value: '$0.00',
        change: '',
        changeLabel: 'year to date',
        trend: 'flat',
        tone: 'negative',
        description: 'Total expenses recorded this year.',
      },
      {
        id: 'top-category',
        label: 'Top category',
        value: '—',
        change: '',
        changeLabel: 'highest spending',
        trend: 'flat',
        tone: 'informative',
        description: 'Category with most expenses.',
      },
      {
        id: 'transactions',
        label: 'Transactions',
        value: '0',
        change: '',
        changeLabel: 'this month',
        trend: 'flat',
        tone: 'neutral',
        description: 'Expense transactions recorded.',
      },
    ],
  };
};

const resolveExpenseCategoriesListTable: ServiceDataSourceHandler = async (_request) => {
  const categoryRepository = container.get<ICategoryRepository>(TYPES.ICategoryRepository);
  const tenantService = container.get<TenantService>(TYPES.TenantService);
  const transactionRepository = container.get<IIncomeExpenseTransactionRepository>(TYPES.IIncomeExpenseTransactionRepository);
  const currency = await getTenantCurrency();

  const tenant = await tenantService.getCurrentTenant();
  if (!tenant) {
    throw new Error('No tenant context available');
  }

  const result = await categoryRepository.findAll();
  const categories = (result.data || []) as CategoryRecord[];
  const expenseCategories = categories.filter((cat) => cat.type === 'expense_transaction');

  // Fetch balance for each category
  const rows = await Promise.all(
    expenseCategories.map(async (category) => {
      const balance = await transactionRepository.getCategoryBalance(category.id, tenant.id);
      const formattedBalance = balance.balance < 0
        ? `(${formatCurrency(Math.abs(balance.balance), currency)})`
        : formatCurrency(balance.balance, currency);
      return {
        id: category.id,
        name: category.name,
        code: category.code || '—',
        description: category.description || '—',
        balance: formattedBalance,
        transactions: String(balance.transaction_count),
        status: category.isActive !== false ? 'Active' : 'Inactive',
        statusVariant: category.isActive !== false ? 'success' : 'secondary',
      };
    })
  );

  const columns = [
    { field: 'name', headerName: 'Name', type: 'text', flex: 1.2 },
    { field: 'code', headerName: 'Code', type: 'text', flex: 0.5 },
    { field: 'description', headerName: 'Description', type: 'text', flex: 1.2 },
    { field: 'balance', headerName: 'Balance', type: 'text', align: 'right', flex: 0.7 },
    { field: 'transactions', headerName: 'Txns', type: 'text', align: 'right', flex: 0.4 },
    { field: 'status', headerName: 'Status', type: 'badge', badgeVariantField: 'statusVariant', flex: 0.5 },
    {
      field: 'actions',
      headerName: 'Actions',
      type: 'actions',
      actions: [
        {
          id: 'view-record',
          label: 'View',
          intent: 'view',
          urlTemplate: '/admin/finance/expense-categories/{{id}}',
        },
        {
          id: 'edit-record',
          label: 'Edit',
          intent: 'edit',
          urlTemplate: '/admin/finance/expense-categories/manage?categoryId={{id}}',
          variant: 'secondary',
        },
      ],
    },
  ];

  const filters = [
    {
      id: 'search',
      type: 'search',
      placeholder: 'Search categories...',
    },
    {
      id: 'status',
      type: 'select',
      placeholder: 'Status',
      options: [
        { label: 'All statuses', value: 'all' },
        { label: 'Active', value: 'active' },
        { label: 'Inactive', value: 'inactive' },
      ],
    },
  ];

  return { rows, columns, filters };
};

const resolveExpenseCategoryProfileHeader: ServiceDataSourceHandler = async (request) => {
  const categoryId = request.params?.categoryId as string;
  const categoryRepository = container.get<ICategoryRepository>(TYPES.ICategoryRepository);
  const tenantService = container.get<TenantService>(TYPES.TenantService);
  const transactionRepository = container.get<IIncomeExpenseTransactionRepository>(TYPES.IIncomeExpenseTransactionRepository);
  const currency = await getTenantCurrency();

  if (!categoryId) {
    throw new Error('Category ID is required');
  }

  const tenant = await tenantService.getCurrentTenant();
  if (!tenant) {
    throw new Error('No tenant context available');
  }

  const category = await categoryRepository.findById(categoryId) as CategoryRecord | null;

  if (!category) {
    throw new Error('Category not found');
  }

  // Get real balance data
  const balance = await transactionRepository.getCategoryBalance(categoryId, tenant.id);

  return {
    eyebrow: category.code || 'EXP',
    title: category.name,
    subtitle: category.description || 'Expense category',
    badge: {
      label: category.isActive !== false ? 'Active' : 'Inactive',
      variant: category.isActive !== false ? 'success' : 'secondary',
    },
    metrics: [
      {
        label: 'Total expenses',
        value: formatCurrency(balance.total_expense, currency),
        caption: 'All time',
      },
      {
        label: 'Total income',
        value: formatCurrency(balance.total_income, currency),
        caption: 'All time',
      },
      {
        label: 'Transactions',
        value: String(balance.transaction_count),
        caption: 'Total count',
      },
    ],
    actions: [],
  };
};

const resolveExpenseCategoryProfileDetails: ServiceDataSourceHandler = async (request) => {
  const categoryId = request.params?.categoryId as string;
  const categoryRepository = container.get<ICategoryRepository>(TYPES.ICategoryRepository);

  if (!categoryId) {
    throw new Error('Category ID is required');
  }

  const category = await categoryRepository.findById(categoryId) as CategoryRecord | null;

  if (!category) {
    throw new Error('Category not found');
  }

  return {
    panels: [
      {
        id: 'category-info',
        title: 'Category information',
        description: 'Basic category details',
        columns: 2,
        items: [
          { label: 'Name', value: category.name, type: 'text' },
          { label: 'Code', value: category.code || '—', type: 'text' },
          { label: 'Type', value: 'Expense', type: 'badge', badgeVariant: 'negative' },
          { label: 'Status', value: category.isActive !== false ? 'Active' : 'Inactive', type: 'badge', badgeVariant: category.isActive !== false ? 'success' : 'secondary' },
          { label: 'Description', value: category.description || '—', type: 'multiline' },
        ],
      },
    ],
  };
};

const resolveExpenseCategoryProfileUsageSummary: ServiceDataSourceHandler = async (request) => {
  const categoryId = request.params?.categoryId as string;
  const tenantService = container.get<TenantService>(TYPES.TenantService);
  const transactionRepository = container.get<IIncomeExpenseTransactionRepository>(TYPES.IIncomeExpenseTransactionRepository);
  const currency = await getTenantCurrency();

  if (!categoryId) {
    throw new Error('Category ID is required');
  }

  const tenant = await tenantService.getCurrentTenant();
  if (!tenant) {
    throw new Error('No tenant context available');
  }

  // Get real balance data
  const balance = await transactionRepository.getCategoryBalance(categoryId, tenant.id);

  return {
    items: [
      {
        id: 'total-expenses',
        label: 'Total expenses',
        value: formatCurrency(balance.total_expense, currency),
        change: '',
        changeLabel: 'all time',
        trend: 'flat',
        tone: 'negative',
      },
      {
        id: 'total-income',
        label: 'Total income',
        value: formatCurrency(balance.total_income, currency),
        change: '',
        changeLabel: 'all time',
        trend: 'flat',
        tone: 'positive',
      },
      {
        id: 'transaction-count',
        label: 'Transactions',
        value: String(balance.transaction_count),
        change: '',
        changeLabel: 'total count',
        trend: 'flat',
        tone: 'neutral',
      },
    ],
  };
};

const resolveExpenseCategoryProfileTransactions: ServiceDataSourceHandler = async (request) => {
  const categoryId = request.params?.categoryId as string;
  const tenantService = container.get<TenantService>(TYPES.TenantService);
  const transactionRepository = container.get<IIncomeExpenseTransactionRepository>(TYPES.IIncomeExpenseTransactionRepository);
  const currency = await getTenantCurrency();

  if (!categoryId) {
    throw new Error('Category ID is required');
  }

  const tenant = await tenantService.getCurrentTenant();
  if (!tenant) {
    throw new Error('No tenant context available');
  }

  // Get real transactions
  const transactions = await transactionRepository.getByCategoryId(categoryId, tenant.id);

  const rows = transactions.map((txn) => {
    const typeDisplay = getTransactionTypeDisplay(txn.transaction_type);
    const isDebit = ['expense', 'adjustment', 'allocation', 'closing_entry'].includes(txn.transaction_type);
    const formattedAmount = isDebit
      ? `(${formatCurrency(txn.amount, currency)})`
      : formatCurrency(txn.amount, currency);

    return {
      id: txn.id,
      date: new Date(txn.transaction_date).toLocaleDateString(),
      type: typeDisplay.label,
      typeVariant: typeDisplay.variant,
      description: txn.description || '—',
      fund: txn.fund_name || '—',
      source: txn.source_name || '—',
      amount: formattedAmount,
      reference: txn.reference || '—',
    };
  });

  return {
    rows,
    columns: [
      { field: 'date', headerName: 'Date', type: 'text', flex: 0.7 },
      { field: 'type', headerName: 'Type', type: 'badge', badgeVariantField: 'typeVariant', flex: 0.6 },
      { field: 'description', headerName: 'Description', type: 'text', flex: 1.2 },
      { field: 'fund', headerName: 'Fund', type: 'text', flex: 0.8 },
      { field: 'source', headerName: 'Source', type: 'text', flex: 0.8 },
      { field: 'amount', headerName: 'Amount', type: 'text', align: 'right', flex: 0.8 },
    ],
    emptyState: {
      title: 'No transactions',
      description: 'No transactions have been recorded for this category yet.',
    },
  };
};

const resolveExpenseCategoryManageHeader: ServiceDataSourceHandler = async (request) => {
  const categoryId = request.params?.categoryId as string;

  if (!categoryId) {
    return {
      eyebrow: 'Finance',
      headline: 'Add expense category',
      description: 'Create a new category for tracking expenses.',
    };
  }

  return {
    eyebrow: 'Finance',
    headline: 'Edit expense category',
    description: 'Update expense category details.',
  };
};

const resolveExpenseCategoryManageForm: ServiceDataSourceHandler = async (request) => {
  const categoryId = request.params?.categoryId as string;
  const categoryRepository = container.get<ICategoryRepository>(TYPES.ICategoryRepository);

  let values = {
    name: '',
    code: '',
    description: '',
    isActive: true,
  };

  if (categoryId) {
    const category = await categoryRepository.findById(categoryId) as CategoryRecord | null;

    if (category) {
      values = {
        name: category.name,
        code: category.code || '',
        description: category.description || '',
        isActive: category.isActive !== false,
      };
    }
  }

  return {
    fields: [
      {
        name: 'name',
        label: 'Category name',
        type: 'text',
        colSpan: 'half',
        required: true,
        placeholder: 'e.g., Utilities, Salaries, Supplies',
      },
      {
        name: 'code',
        label: 'Category code',
        type: 'text',
        colSpan: 'half',
        placeholder: 'e.g., EXP-001',
      },
      {
        name: 'description',
        label: 'Description',
        type: 'textarea',
        colSpan: 'full',
        placeholder: 'Describe this expense category...',
        rows: 3,
      },
      {
        name: 'isActive',
        label: 'Active',
        type: 'toggle',
        colSpan: 'full',
        helperText: 'Inactive categories cannot be used for new transactions.',
      },
    ],
    values,
    validation: {
      name: { required: true },
    },
    submitLabel: categoryId ? 'Update category' : 'Create category',
  };
};

const saveExpenseCategory: ServiceDataSourceHandler = async (request) => {
  const tenantService = container.get<TenantService>(TYPES.TenantService);
  const categoryRepository = container.get<ICategoryRepository>(TYPES.ICategoryRepository);

  const tenant = await tenantService.getCurrentTenant();
  if (!tenant) {
    throw new Error('No tenant context available');
  }

  // Form values are wrapped in 'values' by AdminFormSubmitHandler
  const params = request.params as Record<string, unknown>;
  const values = (params.values ?? params) as Record<string, unknown>;
  const categoryId = (values.categoryId ?? params.categoryId) as string | undefined;

  const formData = {
    name: values.name as string,
    code: values.code as string | undefined,
    description: values.description as string | undefined,
    isActive: values.isActive === true || values.isActive === 'true',
  };

  if (!formData.name) {
    return {
      success: false,
      message: 'Category name is required',
    };
  }

  try {
    if (categoryId) {
      // Update existing category
      await categoryRepository.update(categoryId, {
        name: formData.name,
        code: formData.code || undefined,
        description: formData.description || undefined,
        isActive: formData.isActive !== false,
      } as Partial<CategoryRecord>);

      return {
        success: true,
        message: 'Expense category updated successfully',
        redirectUrl: '/admin/finance/expense-categories',
      };
    } else {
      // Create new category
      await categoryRepository.create({
        name: formData.name,
        code: formData.code || undefined,
        description: formData.description || undefined,
        type: 'expense_transaction',
        isActive: formData.isActive !== false,
        tenant_id: tenant.id,
      } as Partial<CategoryRecord>);

      return {
        success: true,
        message: 'Expense category created successfully',
        redirectUrl: '/admin/finance/expense-categories',
      };
    }
  } catch (error) {
    console.error('Error saving expense category:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to save expense category',
    };
  }
};

const deleteExpenseCategory: ServiceDataSourceHandler = async (request) => {
  const categoryRepository = container.get<ICategoryRepository>(TYPES.ICategoryRepository);
  const categoryId = request.params?.categoryId as string;

  if (!categoryId) {
    return {
      success: false,
      message: 'Category ID is required',
    };
  }

  try {
    await categoryRepository.delete(categoryId);
    return {
      success: true,
      message: 'Expense category deleted successfully',
      redirectUrl: '/admin/finance/expense-categories',
    };
  } catch (error) {
    console.error('Error deleting expense category:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to delete expense category',
    };
  }
};

// ==================== BUDGET CATEGORY HANDLERS ====================

const resolveBudgetCategoriesListHero: ServiceDataSourceHandler = async (_request) => {
  const tenantService = container.get<TenantService>(TYPES.TenantService);
  const categoryRepository = container.get<ICategoryRepository>(TYPES.ICategoryRepository);

  const tenant = await tenantService.getCurrentTenant();
  if (!tenant) {
    throw new Error('No tenant context available');
  }

  const result = await categoryRepository.findAll();
  const categories = (result.data || []) as CategoryRecord[];
  const budgetCategories = categories.filter((cat) => cat.type === 'budget');
  const activeCount = budgetCategories.filter((cat) => cat.isActive !== false).length;

  return {
    eyebrow: 'Finance',
    headline: 'Budget categories',
    description: 'Manage categories for organizing budget line items.',
    metrics: [
      {
        label: 'Total categories',
        value: String(budgetCategories.length),
        caption: 'All budget categories',
      },
      {
        label: 'Active',
        value: String(activeCount),
        caption: 'Currently active',
      },
      {
        label: 'Inactive',
        value: String(budgetCategories.length - activeCount),
        caption: 'Disabled categories',
      },
    ],
  };
};

const resolveBudgetCategoriesListSummary: ServiceDataSourceHandler = async (_request) => {
  const currency = await getTenantCurrency();

  return {
    items: [
      {
        id: 'total-budgeted',
        label: 'Total budgeted',
        value: formatCurrency(0, currency),
        change: '',
        changeLabel: 'current fiscal year',
        trend: 'flat',
        tone: 'informative',
        description: 'Total budget allocations.',
      },
      {
        id: 'categories-in-use',
        label: 'In use',
        value: '0',
        change: '',
        changeLabel: 'categories with budget items',
        trend: 'flat',
        tone: 'positive',
        description: 'Categories actively used.',
      },
      {
        id: 'budget-items',
        label: 'Budget items',
        value: '0',
        change: '',
        changeLabel: 'total line items',
        trend: 'flat',
        tone: 'neutral',
        description: 'Budget line items created.',
      },
    ],
  };
};

const resolveBudgetCategoriesListTable: ServiceDataSourceHandler = async (_request) => {
  const categoryRepository = container.get<ICategoryRepository>(TYPES.ICategoryRepository);

  const result = await categoryRepository.findAll();
  const categories = (result.data || []) as CategoryRecord[];
  const budgetCategories = categories.filter((cat) => cat.type === 'budget');

  const rows = budgetCategories.map((category) => ({
    id: category.id,
    name: category.name,
    code: category.code || '—',
    description: category.description || '—',
    status: category.isActive !== false ? 'Active' : 'Inactive',
    statusVariant: category.isActive !== false ? 'success' : 'secondary',
  }));

  const columns = [
    { field: 'name', headerName: 'Name', type: 'text', flex: 1.2 },
    { field: 'code', headerName: 'Code', type: 'text', flex: 0.6 },
    { field: 'description', headerName: 'Description', type: 'text', flex: 1.5 },
    { field: 'status', headerName: 'Status', type: 'badge', badgeVariantField: 'statusVariant', flex: 0.6 },
    {
      field: 'actions',
      headerName: 'Actions',
      type: 'actions',
      actions: [
        {
          id: 'view-record',
          label: 'View',
          intent: 'view',
          urlTemplate: '/admin/finance/budget-categories/{{id}}',
        },
        {
          id: 'edit-record',
          label: 'Edit',
          intent: 'edit',
          urlTemplate: '/admin/finance/budget-categories/manage?categoryId={{id}}',
          variant: 'secondary',
        },
      ],
    },
  ];

  const filters = [
    {
      id: 'search',
      type: 'search',
      placeholder: 'Search categories...',
    },
    {
      id: 'status',
      type: 'select',
      placeholder: 'Status',
      options: [
        { label: 'All statuses', value: 'all' },
        { label: 'Active', value: 'active' },
        { label: 'Inactive', value: 'inactive' },
      ],
    },
  ];

  return { rows, columns, filters };
};

const resolveBudgetCategoryProfileHeader: ServiceDataSourceHandler = async (request) => {
  const categoryId = request.params?.categoryId as string;
  const categoryRepository = container.get<ICategoryRepository>(TYPES.ICategoryRepository);
  const currency = await getTenantCurrency();

  if (!categoryId) {
    throw new Error('Category ID is required');
  }

  const category = await categoryRepository.findById(categoryId) as CategoryRecord | null;

  if (!category) {
    throw new Error('Category not found');
  }

  return {
    eyebrow: category.code || 'BUD',
    title: category.name,
    subtitle: category.description || 'Budget category',
    badge: {
      label: category.isActive !== false ? 'Active' : 'Inactive',
      variant: category.isActive !== false ? 'success' : 'secondary',
    },
    metrics: [
      {
        label: 'Total budgeted',
        value: formatCurrency(0, currency),
        caption: 'Current fiscal year',
      },
      {
        label: 'Actual spent',
        value: formatCurrency(0, currency),
        caption: 'Year to date',
      },
      {
        label: 'Variance',
        value: formatCurrency(0, currency),
        caption: 'Under/over budget',
      },
    ],
    actions: [],
  };
};

const resolveBudgetCategoryProfileDetails: ServiceDataSourceHandler = async (request) => {
  const categoryId = request.params?.categoryId as string;
  const categoryRepository = container.get<ICategoryRepository>(TYPES.ICategoryRepository);

  if (!categoryId) {
    throw new Error('Category ID is required');
  }

  const category = await categoryRepository.findById(categoryId) as CategoryRecord | null;

  if (!category) {
    throw new Error('Category not found');
  }

  return {
    panels: [
      {
        id: 'category-info',
        title: 'Category information',
        description: 'Basic category details',
        columns: 2,
        items: [
          { label: 'Name', value: category.name, type: 'text' },
          { label: 'Code', value: category.code || '—', type: 'text' },
          { label: 'Type', value: 'Budget', type: 'badge', badgeVariant: 'informative' },
          { label: 'Status', value: category.isActive !== false ? 'Active' : 'Inactive', type: 'badge', badgeVariant: category.isActive !== false ? 'success' : 'secondary' },
          { label: 'Description', value: category.description || '—', type: 'multiline' },
        ],
      },
    ],
  };
};

const resolveBudgetCategoryProfileBudgetSummary: ServiceDataSourceHandler = async (_request) => {
  const currency = await getTenantCurrency();

  return {
    items: [
      {
        id: 'total-budgeted',
        label: 'Total budgeted',
        value: formatCurrency(0, currency),
        change: '',
        changeLabel: 'current fiscal year',
        trend: 'flat',
        tone: 'informative',
      },
      {
        id: 'actual-spent',
        label: 'Actual spent',
        value: formatCurrency(0, currency),
        change: '',
        changeLabel: 'year to date',
        trend: 'flat',
        tone: 'neutral',
      },
      {
        id: 'remaining',
        label: 'Remaining',
        value: formatCurrency(0, currency),
        change: '',
        changeLabel: 'available',
        trend: 'flat',
        tone: 'positive',
      },
      {
        id: 'variance-pct',
        label: 'Variance',
        value: '0%',
        change: '',
        changeLabel: 'of budget used',
        trend: 'flat',
        tone: 'neutral',
      },
    ],
  };
};

const resolveBudgetCategoryProfileBudgetItems: ServiceDataSourceHandler = async (_request) => {
  return {
    rows: [],
    columns: [
      { field: 'name', headerName: 'Line item', type: 'text', flex: 1.2 },
      { field: 'budgetedAmount', headerName: 'Budgeted', type: 'currency', flex: 0.8 },
      { field: 'actualAmount', headerName: 'Actual', type: 'currency', flex: 0.8 },
      { field: 'variance', headerName: 'Variance', type: 'currency', flex: 0.8 },
      { field: 'variancePct', headerName: '%', type: 'text', flex: 0.4 },
    ],
  };
};

const resolveBudgetCategoryManageHeader: ServiceDataSourceHandler = async (request) => {
  const categoryId = request.params?.categoryId as string;

  if (!categoryId) {
    return {
      eyebrow: 'Finance',
      headline: 'Add budget category',
      description: 'Create a new category for organizing budget items.',
    };
  }

  return {
    eyebrow: 'Finance',
    headline: 'Edit budget category',
    description: 'Update budget category details.',
  };
};

const resolveBudgetCategoryManageForm: ServiceDataSourceHandler = async (request) => {
  const categoryId = request.params?.categoryId as string;
  const categoryRepository = container.get<ICategoryRepository>(TYPES.ICategoryRepository);

  let values = {
    name: '',
    code: '',
    description: '',
    isActive: true,
  };

  if (categoryId) {
    const category = await categoryRepository.findById(categoryId) as CategoryRecord | null;

    if (category) {
      values = {
        name: category.name,
        code: category.code || '',
        description: category.description || '',
        isActive: category.isActive !== false,
      };
    }
  }

  return {
    fields: [
      {
        name: 'name',
        label: 'Category name',
        type: 'text',
        colSpan: 'half',
        required: true,
        placeholder: 'e.g., Ministry Programs, Operations, Facilities',
      },
      {
        name: 'code',
        label: 'Category code',
        type: 'text',
        colSpan: 'half',
        placeholder: 'e.g., BUD-001',
      },
      {
        name: 'description',
        label: 'Description',
        type: 'textarea',
        colSpan: 'full',
        placeholder: 'Describe this budget category...',
        rows: 3,
      },
      {
        name: 'isActive',
        label: 'Active',
        type: 'toggle',
        colSpan: 'full',
        helperText: 'Inactive categories cannot be used for new budget items.',
      },
    ],
    values,
    validation: {
      name: { required: true },
    },
    submitLabel: categoryId ? 'Update category' : 'Create category',
  };
};

const saveBudgetCategory: ServiceDataSourceHandler = async (request) => {
  const tenantService = container.get<TenantService>(TYPES.TenantService);
  const categoryRepository = container.get<ICategoryRepository>(TYPES.ICategoryRepository);

  const tenant = await tenantService.getCurrentTenant();
  if (!tenant) {
    throw new Error('No tenant context available');
  }

  // Form values are wrapped in 'values' by AdminFormSubmitHandler
  const params = request.params as Record<string, unknown>;
  const values = (params.values ?? params) as Record<string, unknown>;
  const categoryId = (values.categoryId ?? params.categoryId) as string | undefined;

  const formData = {
    name: values.name as string,
    code: values.code as string | undefined,
    description: values.description as string | undefined,
    isActive: values.isActive === true || values.isActive === 'true',
  };

  if (!formData.name) {
    return {
      success: false,
      message: 'Category name is required',
    };
  }

  try {
    if (categoryId) {
      // Update existing category
      await categoryRepository.update(categoryId, {
        name: formData.name,
        code: formData.code || undefined,
        description: formData.description || undefined,
        isActive: formData.isActive !== false,
      } as Partial<CategoryRecord>);

      return {
        success: true,
        message: 'Budget category updated successfully',
        redirectUrl: '/admin/finance/budget-categories',
      };
    } else {
      // Create new category
      await categoryRepository.create({
        name: formData.name,
        code: formData.code || undefined,
        description: formData.description || undefined,
        type: 'budget',
        isActive: formData.isActive !== false,
        tenant_id: tenant.id,
      } as Partial<CategoryRecord>);

      return {
        success: true,
        message: 'Budget category created successfully',
        redirectUrl: '/admin/finance/budget-categories',
      };
    }
  } catch (error) {
    console.error('Error saving budget category:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to save budget category',
    };
  }
};

const deleteBudgetCategory: ServiceDataSourceHandler = async (request) => {
  const categoryRepository = container.get<ICategoryRepository>(TYPES.ICategoryRepository);
  const categoryId = request.params?.categoryId as string;

  if (!categoryId) {
    return {
      success: false,
      message: 'Category ID is required',
    };
  }

  try {
    await categoryRepository.delete(categoryId);
    return {
      success: true,
      message: 'Budget category deleted successfully',
      redirectUrl: '/admin/finance/budget-categories',
    };
  } catch (error) {
    console.error('Error deleting budget category:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to delete budget category',
    };
  }
};

// ==================== EXPORT ALL HANDLERS ====================

export const adminFinanceCategoriesHandlers: Record<string, ServiceDataSourceHandler> = {
  // Income category handlers
  'admin-finance.income-categories.list.hero': resolveIncomeCategoriesListHero,
  'admin-finance.income-categories.list.summary': resolveIncomeCategoriesListSummary,
  'admin-finance.income-categories.list.table': resolveIncomeCategoriesListTable,
  'admin-finance.income-categories.profile.header': resolveIncomeCategoryProfileHeader,
  'admin-finance.income-categories.profile.details': resolveIncomeCategoryProfileDetails,
  'admin-finance.income-categories.profile.usageSummary': resolveIncomeCategoryProfileUsageSummary,
  'admin-finance.income-categories.profile.transactions': resolveIncomeCategoryProfileTransactions,
  'admin-finance.income-categories.manage.header': resolveIncomeCategoryManageHeader,
  'admin-finance.income-categories.manage.form': resolveIncomeCategoryManageForm,
  'admin-finance.income-categories.save': saveIncomeCategory,
  'admin-finance.income-categories.delete': deleteIncomeCategory,

  // Expense category handlers
  'admin-finance.expense-categories.list.hero': resolveExpenseCategoriesListHero,
  'admin-finance.expense-categories.list.summary': resolveExpenseCategoriesListSummary,
  'admin-finance.expense-categories.list.table': resolveExpenseCategoriesListTable,
  'admin-finance.expense-categories.profile.header': resolveExpenseCategoryProfileHeader,
  'admin-finance.expense-categories.profile.details': resolveExpenseCategoryProfileDetails,
  'admin-finance.expense-categories.profile.usageSummary': resolveExpenseCategoryProfileUsageSummary,
  'admin-finance.expense-categories.profile.transactions': resolveExpenseCategoryProfileTransactions,
  'admin-finance.expense-categories.manage.header': resolveExpenseCategoryManageHeader,
  'admin-finance.expense-categories.manage.form': resolveExpenseCategoryManageForm,
  'admin-finance.expense-categories.save': saveExpenseCategory,
  'admin-finance.expense-categories.delete': deleteExpenseCategory,

  // Budget category handlers
  'admin-finance.budget-categories.list.hero': resolveBudgetCategoriesListHero,
  'admin-finance.budget-categories.list.summary': resolveBudgetCategoriesListSummary,
  'admin-finance.budget-categories.list.table': resolveBudgetCategoriesListTable,
  'admin-finance.budget-categories.profile.header': resolveBudgetCategoryProfileHeader,
  'admin-finance.budget-categories.profile.details': resolveBudgetCategoryProfileDetails,
  'admin-finance.budget-categories.profile.budgetSummary': resolveBudgetCategoryProfileBudgetSummary,
  'admin-finance.budget-categories.profile.budgetItems': resolveBudgetCategoryProfileBudgetItems,
  'admin-finance.budget-categories.manage.header': resolveBudgetCategoryManageHeader,
  'admin-finance.budget-categories.manage.form': resolveBudgetCategoryManageForm,
  'admin-finance.budget-categories.save': saveBudgetCategory,
  'admin-finance.budget-categories.delete': deleteBudgetCategory,
};
