import type { ServiceDataSourceHandler } from './types';
import { container } from '@/lib/container';
import { TYPES } from '@/lib/types';
import type { TenantService } from '@/services/TenantService';
import type { BudgetService } from '@/services/BudgetService';
import type { Budget } from '@/models/budget.model';
import type { ICategoryRepository } from '@/repositories/category.repository';
import type { Category } from '@/models/category.model';
import { getTenantCurrency, formatCurrency } from './finance-utils';
import { getTenantTimezone, formatDate } from './datetime-utils';

// ==================== LIST PAGE HANDLERS ====================

const resolveBudgetsListHero: ServiceDataSourceHandler = async (_request) => {
  const tenantService = container.get<TenantService>(TYPES.TenantService);
  const budgetService = container.get<BudgetService>(TYPES.BudgetService);

  const tenant = await tenantService.getCurrentTenant();
  if (!tenant) {
    throw new Error('No tenant context available');
  }

  // Get tenant currency (cached)
  const currency = await getTenantCurrency();

  const budgets = await budgetService.findAll();
  const allBudgets = (budgets.data || []) as Budget[];
  const totalBudgeted = allBudgets.reduce((sum: number, b: Budget) => sum + (b.amount || 0), 0);

  return {
    eyebrow: 'Budget management',
    headline: 'Track spending against budget',
    description: 'Monitor budget allocations and spending to maintain fiscal discipline.',
    metrics: [
      {
        label: 'Total budgets',
        value: allBudgets.length.toString(),
        caption: 'Budget allocations',
      },
      {
        label: 'Total budgeted',
        value: formatCurrency(totalBudgeted, currency),
        caption: 'Planned spending',
      },
      {
        label: 'Remaining',
        value: formatCurrency(totalBudgeted, currency),
        caption: 'Available to spend',
      },
    ],
  };
};

const resolveBudgetsListPerformance: ServiceDataSourceHandler = async (_request) => {
  // Get tenant currency (cached)
  const currency = await getTenantCurrency();

  return {
    items: [
      {
        id: 'total-budgeted',
        label: 'Total budgeted',
        value: formatCurrency(0, currency),
        change: '',
        changeLabel: 'annual budget',
        trend: 'flat',
        tone: 'informative',
        description: 'Total planned spending.',
      },
      {
        id: 'spent-to-date',
        label: 'Spent to date',
        value: formatCurrency(0, currency),
        change: '0%',
        changeLabel: 'of budget',
        trend: 'flat',
        tone: 'neutral',
        description: 'Actual spending so far.',
      },
      {
        id: 'remaining',
        label: 'Remaining',
        value: formatCurrency(0, currency),
        change: '100%',
        changeLabel: 'available',
        trend: 'flat',
        tone: 'positive',
        description: 'Budget remaining.',
      },
      {
        id: 'variance',
        label: 'Variance',
        value: formatCurrency(0, currency),
        change: '',
        changeLabel: 'vs budget',
        trend: 'flat',
        tone: 'informative',
        description: 'Under/over budget.',
      },
    ],
  };
};

const resolveBudgetsListTable: ServiceDataSourceHandler = async (_request) => {
  const tenantService = container.get<TenantService>(TYPES.TenantService);
  const budgetService = container.get<BudgetService>(TYPES.BudgetService);

  const tenant = await tenantService.getCurrentTenant();
  if (!tenant) {
    throw new Error('No tenant context available');
  }

  // Get tenant currency and timezone (cached)
  const currency = await getTenantCurrency();
  const timezone = await getTenantTimezone();

  const budgets = await budgetService.findAll();
  const allBudgets = (budgets.data || []) as Budget[];

  const rows = allBudgets.map((budget: Budget) => ({
    id: budget.id,
    name: budget.name || 'Unnamed Budget',
    category: budget.category?.name || '—',
    startDate: budget.start_date ? formatDate(new Date(budget.start_date), timezone) : '—',
    endDate: budget.end_date ? formatDate(new Date(budget.end_date), timezone) : '—',
    budgeted: formatCurrency(budget.amount || 0, currency),
    spent: formatCurrency(0, currency),
    remaining: formatCurrency(budget.amount || 0, currency),
    percentUsed: 0,
    status: 'On track',
    statusVariant: 'success',
    description: budget.description || '',
  }));

  const columns = [
    {
      field: 'name',
      headerName: 'Budget name',
      type: 'text',
      subtitleField: 'description',
      flex: 1.5,
    },
    {
      field: 'category',
      headerName: 'Category',
      type: 'text',
      flex: 1,
    },
    {
      field: 'startDate',
      headerName: 'Start',
      type: 'text',
      flex: 0.7,
    },
    {
      field: 'endDate',
      headerName: 'End',
      type: 'text',
      flex: 0.7,
    },
    {
      field: 'budgeted',
      headerName: 'Budgeted',
      type: 'currency',
      flex: 0.8,
    },
    {
      field: 'spent',
      headerName: 'Spent',
      type: 'currency',
      flex: 0.8,
    },
    {
      field: 'remaining',
      headerName: 'Remaining',
      type: 'currency',
      flex: 0.8,
    },
    {
      field: 'status',
      headerName: 'Status',
      type: 'badge',
      badgeVariantField: 'statusVariant',
      flex: 0.6,
    },
    {
      field: 'actions',
      headerName: 'Actions',
      type: 'actions',
      actions: [
        {
          id: 'edit-record',
          label: 'Edit',
          intent: 'edit',
          urlTemplate: '/admin/finance/budgets/manage?budgetId={{id}}',
          variant: 'secondary',
        },
        {
          id: 'delete-record',
          label: 'Delete',
          intent: 'delete',
          handler: 'admin-finance.budgets.delete',
          confirmTitle: 'Delete Budget',
          confirmDescription: 'Are you sure you want to delete "{{name}}"?',
          confirmLabel: 'Delete',
          cancelLabel: 'Cancel',
          successMessage: '{{name}} was deleted.',
          variant: 'destructive',
        },
      ],
    },
  ];

  const filters = [
    {
      id: 'search',
      type: 'search',
      placeholder: 'Search budgets...',
    },
    {
      id: 'category',
      type: 'select',
      placeholder: 'Category',
      options: [{ label: 'All categories', value: 'all' }],
    },
  ];

  return {
    rows,
    columns,
    filters,
  };
};

// ==================== MANAGE PAGE HANDLERS ====================

const resolveBudgetManageHeader: ServiceDataSourceHandler = async (request) => {
  const budgetId = request.params?.budgetId as string;

  if (!budgetId) {
    return {
      eyebrow: 'Budget management',
      headline: 'Create new budget',
      description: 'Define a new budget allocation for expense tracking.',
    };
  }

  const budgetService = container.get<BudgetService>(TYPES.BudgetService);
  const budget = await budgetService.findById(budgetId);

  if (!budget) {
    throw new Error('Budget not found');
  }

  return {
    eyebrow: 'Edit budget',
    headline: `Update ${budget.name || 'budget'}`,
    description: 'Modify the budget allocation and period.',
  };
};

const resolveBudgetManageForm: ServiceDataSourceHandler = async (request) => {
  const budgetId = request.params?.budgetId as string;
  const _isCreate = !budgetId;

  const tenantService = container.get<TenantService>(TYPES.TenantService);
  const budgetService = container.get<BudgetService>(TYPES.BudgetService);
  const categoryRepository = container.get<ICategoryRepository>(TYPES.ICategoryRepository);

  const tenant = await tenantService.getCurrentTenant();
  if (!tenant) {
    throw new Error('No tenant context available');
  }

  let budget: Partial<Budget> = {};

  if (budgetId) {
    const existing = await budgetService.findById(budgetId);
    if (existing) {
      budget = existing;
    }
  }

  // Fetch budget categories (type = 'budget')
  const categoriesResult = await categoryRepository.find({
    filters: {
      type: { operator: 'eq', value: 'budget' },
    },
    order: { column: 'name', ascending: true },
  });
  const budgetCategories = (categoriesResult.data || []) as Category[];
  const categoryOptions = budgetCategories.map((cat) => ({
    label: cat.name,
    value: cat.id,
  }));

  return {
    fields: [
      ...(budgetId
        ? [
            {
              name: 'budgetId',
              type: 'hidden' as const,
            },
          ]
        : []),
      {
        name: 'name',
        label: 'Budget name',
        type: 'text',
        colSpan: 'half',
        placeholder: 'e.g., Office Supplies Budget',
        helperText: 'Descriptive name for this budget',
        required: true,
      },
      {
        name: 'amount',
        label: 'Budget amount',
        type: 'currency',
        colSpan: 'half',
        placeholder: '0.00',
        helperText: 'Total amount allocated',
        required: true,
      },
      {
        name: 'categoryId',
        label: 'Category',
        type: 'select',
        colSpan: 'half',
        helperText: 'Expense category for this budget',
        required: true,
        options: categoryOptions,
        lookupId: 'budget.category',
        quickCreate: {
          label: 'Add category',
          description: 'Create a new budget category. The code will be auto-generated from the name.',
          submitLabel: 'Save category',
          successMessage: 'Budget category created',
          action: {
            id: 'admin-finance.budgets.category.create',
            kind: 'metadata.service',
            config: {
              handler: 'admin-finance.budgets.category.create',
            },
          },
        },
      },
      {
        name: 'startDate',
        label: 'Start date',
        type: 'date',
        colSpan: 'quarter',
        required: true,
      },
      {
        name: 'endDate',
        label: 'End date',
        type: 'date',
        colSpan: 'quarter',
        required: true,
      },
      {
        name: 'description',
        label: 'Description',
        type: 'textarea',
        colSpan: 'full',
        placeholder: 'Notes about this budget...',
        helperText: 'Optional description',
        rows: 3,
      },
    ],
    values: {
      ...(budgetId ? { budgetId: budget.id } : {}),
      name: budget.name || '',
      amount: budget.amount || 0,
      categoryId: budget.category_id || '',
      startDate: budget.start_date || '',
      endDate: budget.end_date || '',
      description: budget.description || '',
    },
    validation: {
      name: { required: true, minLength: 1 },
      amount: { required: true, min: 0 },
      categoryId: { required: true },
      startDate: { required: true },
      endDate: { required: true },
    },
  };
};

// ==================== ACTION HANDLERS ====================

const saveBudget: ServiceDataSourceHandler = async (request) => {
  const params = request.params as any;
  const budgetId = params.budgetId as string | undefined;

  console.log('[saveBudget] Saving budget. ID:', budgetId);

  try {
    const tenantService = container.get<TenantService>(TYPES.TenantService);
    const budgetService = container.get<BudgetService>(TYPES.BudgetService);

    const tenant = await tenantService.getCurrentTenant();
    if (!tenant) {
      throw new Error('No tenant context available');
    }

    const budgetData: Partial<Budget> = {
      name: params.name as string,
      amount: parseFloat(params.amount) || 0,
      category_id: params.categoryId as string,
      start_date: params.startDate as string,
      end_date: params.endDate as string,
      description: params.description ? (params.description as string) : null,
    };

    let budget: Budget;

    if (budgetId) {
      budget = await budgetService.update(budgetId, budgetData);
    } else {
      budget = await budgetService.create(budgetData);
    }

    console.log('[saveBudget] Budget saved:', budget.id);

    return {
      success: true,
      message: budgetId ? 'Budget updated successfully' : 'Budget created successfully',
      budgetId: budget.id,
    };
  } catch (error: any) {
    console.error('[saveBudget] Failed:', error);

    return {
      success: false,
      message: error?.message || 'Failed to save budget',
    };
  }
};

const deleteBudget: ServiceDataSourceHandler = async (request) => {
  const budgetId = request.params?.id as string;

  if (!budgetId) {
    return {
      success: false,
      message: 'Budget ID is required',
    };
  }

  console.log('[deleteBudget] Deleting budget:', budgetId);

  try {
    const budgetService = container.get<BudgetService>(TYPES.BudgetService);
    await budgetService.delete(budgetId);

    console.log('[deleteBudget] Budget deleted:', budgetId);

    return {
      success: true,
      message: 'Budget deleted successfully',
    };
  } catch (error: any) {
    console.error('[deleteBudget] Failed:', error);

    return {
      success: false,
      message: error?.message || 'Failed to delete budget',
    };
  }
};

// ==================== CATEGORY QUICK CREATE HANDLER ====================

const createBudgetCategory: ServiceDataSourceHandler = async (request) => {
  const params = request.params as Record<string, unknown>;
  const name = (params.name as string)?.trim();
  const code = (params.code as string)?.trim();

  if (!name) {
    return {
      success: false,
      message: 'Category name is required',
    };
  }

  if (!code) {
    return {
      success: false,
      message: 'Category code is required',
    };
  }

  console.log('[createBudgetCategory] Creating category:', { name, code });

  try {
    const categoryRepository = container.get<ICategoryRepository>(TYPES.ICategoryRepository);

    // Create the category with type 'budget'
    const newCategory = await categoryRepository.create({
      name,
      code,
      type: 'budget',
      is_system: false,
      is_active: true,
      sort_order: 0,
    } as Partial<Category>);

    console.log('[createBudgetCategory] Category created:', newCategory.id);

    return {
      success: true,
      message: 'Category created successfully',
      option: {
        id: newCategory.id,
        value: newCategory.name,
      },
    };
  } catch (error: any) {
    console.error('[createBudgetCategory] Failed:', error);

    // Check for duplicate code/name error
    if (error?.message?.includes('duplicate') || error?.code === '23505') {
      return {
        success: false,
        message: 'A category with this code or name already exists',
      };
    }

    return {
      success: false,
      message: error?.message || 'Failed to create category',
    };
  }
};

// Export all handlers
export const adminFinanceBudgetsHandlers: Record<string, ServiceDataSourceHandler> = {
  // List page handlers
  'admin-finance.budgets.list.hero': resolveBudgetsListHero,
  'admin-finance.budgets.list.performance': resolveBudgetsListPerformance,
  'admin-finance.budgets.list.table': resolveBudgetsListTable,
  // Manage page handlers
  'admin-finance.budgets.manage.header': resolveBudgetManageHeader,
  'admin-finance.budgets.manage.form': resolveBudgetManageForm,
  // Action handlers
  'admin-finance.budgets.save': saveBudget,
  'admin-finance.budgets.delete': deleteBudget,
  // Category quick create
  'admin-finance.budgets.category.create': createBudgetCategory,
};
