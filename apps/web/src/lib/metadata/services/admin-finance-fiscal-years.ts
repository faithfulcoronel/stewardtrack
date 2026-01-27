import type { ServiceDataSourceHandler } from './types';
import { container } from '@/lib/container';
import { TYPES } from '@/lib/types';
import type { TenantService } from '@/services/TenantService';
import type { FiscalYearService } from '@/services/FiscalYearService';
import type { FiscalYear } from '@/models/fiscalYear.model';
import { getTenantTimezone, formatDate } from './datetime-utils';
import { getCurrentUserId } from '@/lib/server/context';
import { PermissionGate } from '@/lib/access-gate';

// ==================== LIST PAGE HANDLERS ====================

const resolveFiscalYearsListHero: ServiceDataSourceHandler = async (_request) => {
  const tenantService = container.get<TenantService>(TYPES.TenantService);
  const fiscalYearService = container.get<FiscalYearService>(TYPES.FiscalYearService);

  const tenant = await tenantService.getCurrentTenant();
  if (!tenant) {
    throw new Error('No tenant context available');
  }

  const fiscalYears = await fiscalYearService.findAll();
  const allFiscalYears = (fiscalYears.data || []) as FiscalYear[];
  const openCount = allFiscalYears.filter((fy) => fy.status === 'open').length;
  const closedCount = allFiscalYears.filter((fy) => fy.status === 'closed').length;

  return {
    eyebrow: 'Finance configuration',
    headline: 'Fiscal years',
    description: 'Manage fiscal year periods for financial reporting and budgeting.',
    metrics: [
      {
        label: 'Total fiscal years',
        value: allFiscalYears.length.toString(),
        caption: 'Defined periods',
      },
      {
        label: 'Open',
        value: openCount.toString(),
        caption: 'Active periods',
      },
      {
        label: 'Closed',
        value: closedCount.toString(),
        caption: 'Completed periods',
      },
    ],
  };
};

const resolveFiscalYearsListTable: ServiceDataSourceHandler = async (_request) => {
  const tenantService = container.get<TenantService>(TYPES.TenantService);
  const fiscalYearService = container.get<FiscalYearService>(TYPES.FiscalYearService);

  const tenant = await tenantService.getCurrentTenant();
  if (!tenant) {
    throw new Error('No tenant context available');
  }

  const timezone = await getTenantTimezone();

  // Check user permissions for action visibility using PermissionGate
  const userId = await getCurrentUserId({ optional: true });

  let canManage = false;
  let canDelete = false;

  if (userId && tenant) {
    const [manageResult, deleteResult] = await Promise.all([
      new PermissionGate('finance:manage').check(userId, tenant.id),
      new PermissionGate('finance:delete').check(userId, tenant.id),
    ]);
    canManage = manageResult.allowed;
    canDelete = deleteResult.allowed;
  }

  const fiscalYears = await fiscalYearService.findAll();
  const allFiscalYears = (fiscalYears.data || []) as FiscalYear[];

  const rows = allFiscalYears.map((fy: FiscalYear) => ({
    id: fy.id,
    name: fy.name || 'Unnamed',
    startDate: fy.start_date ? formatDate(new Date(fy.start_date), timezone) : '—',
    endDate: fy.end_date ? formatDate(new Date(fy.end_date), timezone) : '—',
    status: fy.status === 'open' ? 'Open' : 'Closed',
    statusVariant: fy.status === 'open' ? 'success' : 'neutral',
    closedAt: fy.closed_at ? formatDate(new Date(fy.closed_at), timezone) : '—',
  }));

  const columns = [
    {
      field: 'name',
      headerName: 'Fiscal year',
      type: 'text',
      flex: 1.5,
    },
    {
      field: 'startDate',
      headerName: 'Start date',
      type: 'text',
      flex: 1,
      hideOnMobile: true,
    },
    {
      field: 'endDate',
      headerName: 'End date',
      type: 'text',
      flex: 1,
      hideOnMobile: true,
    },
    {
      field: 'status',
      headerName: 'Status',
      type: 'badge',
      badgeVariantField: 'statusVariant',
      flex: 0.7,
    },
    {
      field: 'closedAt',
      headerName: 'Closed on',
      type: 'text',
      flex: 1,
      hideOnMobile: true,
    },
    {
      field: 'actions',
      headerName: 'Actions',
      type: 'actions',
      actions: [
        {
          id: 'view-record',
          label: 'View',
          intent: 'view',
          urlTemplate: '/admin/finance/fiscal-years/{{id}}',
          variant: 'ghost',
        },
        ...(canManage
          ? [
              {
                id: 'edit-record',
                label: 'Edit',
                intent: 'edit',
                urlTemplate: '/admin/finance/fiscal-years/manage?fiscalYearId={{id}}',
                variant: 'secondary',
              },
            ]
          : []),
        ...(canDelete
          ? [
              {
                id: 'delete-record',
                label: 'Delete',
                intent: 'delete',
                handler: 'admin-finance.fiscal-years.delete',
                confirmTitle: 'Delete fiscal year',
                confirmDescription: 'Are you sure you want to delete "{{name}}"? This cannot be undone.',
                confirmLabel: 'Delete',
                cancelLabel: 'Cancel',
                successMessage: '{{name}} was deleted.',
                variant: 'destructive',
              },
            ]
          : []),
      ],
    },
  ];

  const filters = [
    {
      id: 'search',
      type: 'search',
      placeholder: 'Search fiscal years...',
    },
    {
      id: 'status',
      type: 'select',
      placeholder: 'Status',
      options: [
        { label: 'All', value: 'all' },
        { label: 'Open', value: 'open' },
        { label: 'Closed', value: 'closed' },
      ],
    },
  ];

  return {
    rows,
    columns,
    filters,
  };
};

// ==================== MANAGE PAGE HANDLERS ====================

// Helper to validate UUID format
const isValidUUID = (str: string): boolean => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
};

const resolveFiscalYearManageHeader: ServiceDataSourceHandler = async (request) => {
  const fiscalYearId = request.params?.fiscalYearId as string;

  // Treat invalid UUIDs (like template strings "{{id}}") as create mode
  if (!fiscalYearId || !isValidUUID(fiscalYearId)) {
    return {
      eyebrow: 'Finance configuration',
      headline: 'Create fiscal year',
      description: 'Define a new fiscal year period for financial tracking.',
    };
  }

  const fiscalYearService = container.get<FiscalYearService>(TYPES.FiscalYearService);
  const fiscalYear = await fiscalYearService.findById(fiscalYearId);

  if (!fiscalYear) {
    throw new Error('Fiscal year not found');
  }

  return {
    eyebrow: 'Edit fiscal year',
    headline: `Update ${fiscalYear.name || 'fiscal year'}`,
    description: 'Modify the fiscal year name and date range.',
  };
};

const resolveFiscalYearManageForm: ServiceDataSourceHandler = async (request) => {
  const fiscalYearIdRaw = request.params?.fiscalYearId as string;
  // Only use fiscalYearId if it's a valid UUID
  const fiscalYearId = fiscalYearIdRaw && isValidUUID(fiscalYearIdRaw) ? fiscalYearIdRaw : undefined;

  const tenantService = container.get<TenantService>(TYPES.TenantService);
  const fiscalYearService = container.get<FiscalYearService>(TYPES.FiscalYearService);

  const tenant = await tenantService.getCurrentTenant();
  if (!tenant) {
    throw new Error('No tenant context available');
  }

  let fiscalYear: Partial<FiscalYear> = {};

  if (fiscalYearId) {
    const existing = await fiscalYearService.findById(fiscalYearId);
    if (existing) {
      fiscalYear = existing;
    }
  }

  return {
    fields: [
      ...(fiscalYearId
        ? [
            {
              name: 'fiscalYearId',
              type: 'hidden' as const,
            },
          ]
        : []),
      {
        name: 'name',
        label: 'Fiscal year name',
        type: 'text',
        colSpan: 'full',
        placeholder: 'e.g., FY 2026',
        helperText: 'A descriptive name for this fiscal year',
        required: true,
      },
      {
        name: 'startDate',
        label: 'Start date',
        type: 'date',
        colSpan: 'half',
        required: true,
        helperText: 'First day of the fiscal year',
      },
      {
        name: 'endDate',
        label: 'End date',
        type: 'date',
        colSpan: 'half',
        required: true,
        helperText: 'Last day of the fiscal year',
      },
      {
        name: 'status',
        label: 'Status',
        type: 'select',
        colSpan: 'half',
        required: true,
        options: [
          { label: 'Open', value: 'open' },
          { label: 'Closed', value: 'closed' },
        ],
        helperText: 'Open fiscal years accept transactions',
      },
    ],
    values: {
      ...(fiscalYearId ? { fiscalYearId: fiscalYear.id } : {}),
      name: fiscalYear.name || '',
      startDate: fiscalYear.start_date || '',
      endDate: fiscalYear.end_date || '',
      status: fiscalYear.status || 'open',
    },
    validation: {
      name: { required: true, minLength: 1 },
      startDate: { required: true },
      endDate: { required: true },
      status: { required: true },
    },
  };
};

// ==================== ACTION HANDLERS ====================

const saveFiscalYear: ServiceDataSourceHandler = async (request) => {
  const params = request.params as Record<string, unknown>;
  // Form values are wrapped in 'values' by AdminFormSubmitHandler
  const values = (params.values ?? params) as Record<string, unknown>;
  const fiscalYearId = (values.fiscalYearId ?? params.fiscalYearId) as string | undefined;

  console.log('[saveFiscalYear] Saving fiscal year. ID:', fiscalYearId);

  try {
    const tenantService = container.get<TenantService>(TYPES.TenantService);
    const fiscalYearService = container.get<FiscalYearService>(TYPES.FiscalYearService);

    const tenant = await tenantService.getCurrentTenant();
    if (!tenant) {
      throw new Error('No tenant context available');
    }

    const fiscalYearData: Partial<FiscalYear> = {
      name: values.name as string,
      start_date: values.startDate as string,
      end_date: values.endDate as string,
      status: values.status as 'open' | 'closed',
    };

    let fiscalYear: FiscalYear;

    if (fiscalYearId) {
      fiscalYear = await fiscalYearService.update(fiscalYearId, fiscalYearData);
    } else {
      fiscalYear = await fiscalYearService.create(fiscalYearData);
    }

    console.log('[saveFiscalYear] Fiscal year saved:', fiscalYear.id);

    return {
      success: true,
      message: fiscalYearId ? 'Fiscal year updated successfully' : 'Fiscal year created successfully',
      fiscalYearId: fiscalYear.id,
      redirectUrl: '/admin/finance/fiscal-years',
    };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to save fiscal year';
    console.error('[saveFiscalYear] Failed:', error);

    return {
      success: false,
      message: errorMessage,
    };
  }
};

const deleteFiscalYear: ServiceDataSourceHandler = async (request) => {
  const fiscalYearId = request.params?.id as string;

  if (!fiscalYearId) {
    return {
      success: false,
      message: 'Fiscal year ID is required',
    };
  }

  console.log('[deleteFiscalYear] Deleting fiscal year:', fiscalYearId);

  try {
    const fiscalYearService = container.get<FiscalYearService>(TYPES.FiscalYearService);
    await fiscalYearService.delete(fiscalYearId);

    console.log('[deleteFiscalYear] Fiscal year deleted:', fiscalYearId);

    return {
      success: true,
      message: 'Fiscal year deleted successfully',
    };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to delete fiscal year';
    console.error('[deleteFiscalYear] Failed:', error);

    // Provide user-friendly messages for common errors
    let userMessage = errorMessage;
    if (errorMessage.includes('transaction(s) exist')) {
      userMessage = 'Cannot delete this fiscal year because it has associated transactions. Close the fiscal year instead.';
    } else if (errorMessage.includes('Closed fiscal years cannot be deleted')) {
      userMessage = 'Cannot delete a closed fiscal year. Closed fiscal years are retained for audit purposes.';
    }

    return {
      success: false,
      message: userMessage,
    };
  }
};

// ==================== PROFILE PAGE HANDLERS ====================

const resolveFiscalYearProfileHeader: ServiceDataSourceHandler = async (request) => {
  const fiscalYearId = request.params?.fiscalYearId as string;

  if (!fiscalYearId) {
    throw new Error('Fiscal year ID is required');
  }

  const fiscalYearService = container.get<FiscalYearService>(TYPES.FiscalYearService);
  const timezone = await getTenantTimezone();

  const fiscalYear = await fiscalYearService.findById(fiscalYearId);
  if (!fiscalYear) {
    throw new Error('Fiscal year not found');
  }

  const startDate = fiscalYear.start_date ? formatDate(new Date(fiscalYear.start_date), timezone) : '—';
  const endDate = fiscalYear.end_date ? formatDate(new Date(fiscalYear.end_date), timezone) : '—';

  return {
    eyebrow: fiscalYear.status === 'open' ? 'Open fiscal year' : 'Closed fiscal year',
    headline: fiscalYear.name,
    description: `${startDate} — ${endDate}`,
    metrics: [
      {
        label: 'Status',
        value: fiscalYear.status === 'open' ? 'Open' : 'Closed',
        caption: fiscalYear.status === 'open' ? 'Accepting transactions' : 'Period closed',
      },
      {
        label: 'Start date',
        value: startDate,
        caption: 'Period begins',
      },
      {
        label: 'End date',
        value: endDate,
        caption: 'Period ends',
      },
    ],
  };
};

const resolveFiscalYearProfileDetails: ServiceDataSourceHandler = async (request) => {
  const fiscalYearId = request.params?.fiscalYearId as string;

  if (!fiscalYearId) {
    throw new Error('Fiscal year ID is required');
  }

  const fiscalYearService = container.get<FiscalYearService>(TYPES.FiscalYearService);
  const timezone = await getTenantTimezone();

  const fiscalYear = await fiscalYearService.findById(fiscalYearId);
  if (!fiscalYear) {
    throw new Error('Fiscal year not found');
  }

  return {
    panels: [
      {
        id: 'general-info',
        title: 'General information',
        items: [
          { label: 'Name', value: fiscalYear.name },
          { label: 'Status', value: fiscalYear.status === 'open' ? 'Open' : 'Closed' },
          { label: 'Start date', value: fiscalYear.start_date ? formatDate(new Date(fiscalYear.start_date), timezone) : '—' },
          { label: 'End date', value: fiscalYear.end_date ? formatDate(new Date(fiscalYear.end_date), timezone) : '—' },
        ],
      },
      {
        id: 'closure-info',
        title: 'Closure information',
        items: [
          { label: 'Closed at', value: fiscalYear.closed_at ? formatDate(new Date(fiscalYear.closed_at), timezone) : 'Not closed' },
          { label: 'Closed by', value: fiscalYear.closed_by || 'N/A' },
        ],
      },
    ],
  };
};

const resolveFiscalYearPeriodSummary: ServiceDataSourceHandler = async (request) => {
  const fiscalYearId = request.params?.fiscalYearId as string;

  if (!fiscalYearId) {
    return {
      items: [
        {
          id: 'periods',
          label: 'Fiscal periods',
          value: 'N/A',
          change: '',
          changeLabel: '',
          trend: 'flat',
          tone: 'neutral',
          description: 'No fiscal year specified.',
        },
      ],
    };
  }

  try {
    // Use repository pattern - import types dynamically to avoid circular deps
    const { TYPES: T } = await import('@/lib/types');
    const { container: c } = await import('@/lib/container');
    type FPRepo = import('@/repositories/fiscalPeriod.repository').IFiscalPeriodRepository;
    const fiscalPeriodRepo = c.get<FPRepo>(T.IFiscalPeriodRepository);

    // Query fiscal periods for this fiscal year using repository
    const result = await fiscalPeriodRepo.findAll({
      filters: {
        fiscal_year_id: { operator: 'eq', value: fiscalYearId },
      },
      order: { column: 'start_date', ascending: true },
    });

    const periods = result.data || [];
    const totalPeriods = periods.length;
    const openPeriods = periods.filter((p) => p.status === 'open').length;
    const closedPeriods = periods.filter((p) => p.status === 'closed').length;

    if (totalPeriods === 0) {
      return {
        items: [
          {
            id: 'periods',
            label: 'Fiscal periods',
            value: '0',
            change: '',
            changeLabel: '',
            trend: 'flat',
            tone: 'neutral',
            description: 'No fiscal periods defined. Periods should be auto-created when a fiscal year is created.',
          },
        ],
      };
    }

    return {
      items: [
        {
          id: 'total-periods',
          label: 'Total periods',
          value: totalPeriods.toString(),
          change: '',
          changeLabel: '',
          trend: 'flat',
          tone: 'informative',
          description: 'Monthly periods in this fiscal year.',
        },
        {
          id: 'open-periods',
          label: 'Open periods',
          value: openPeriods.toString(),
          change: '',
          changeLabel: '',
          trend: 'flat',
          tone: 'positive',
          description: 'Periods accepting transactions.',
        },
        {
          id: 'closed-periods',
          label: 'Closed periods',
          value: closedPeriods.toString(),
          change: '',
          changeLabel: '',
          trend: 'flat',
          tone: 'neutral',
          description: 'Completed periods.',
        },
      ],
    };
  } catch (error) {
    console.error('[resolveFiscalYearPeriodSummary] Error fetching periods:', error);
    return {
      items: [
        {
          id: 'periods',
          label: 'Fiscal periods',
          value: 'Error',
          change: '',
          changeLabel: '',
          trend: 'flat',
          tone: 'critical',
          description: 'Failed to load fiscal periods.',
        },
      ],
    };
  }
};

const resolveFiscalYearOpeningBalances: ServiceDataSourceHandler = async (request) => {
  const fiscalYearId = request.params?.fiscalYearId as string;

  if (!fiscalYearId) {
    return { rows: [], columns: [] };
  }

  const tenantService = container.get<TenantService>(TYPES.TenantService);
  const tenant = await tenantService.getCurrentTenant();
  if (!tenant) {
    throw new Error('No tenant context available');
  }

  // Import opening balance repository dynamically to avoid circular deps
  const { TYPES: T } = await import('@/lib/types');
  const { container: c } = await import('@/lib/container');
  type OBRepo = import('@/repositories/openingBalance.repository').IOpeningBalanceRepository;
  const obRepo = c.get<OBRepo>(T.IOpeningBalanceRepository);

  const currency = (await import('./finance-utils')).getTenantCurrency();
  const { formatCurrency } = await import('./finance-utils');
  const currencyCode = await currency;

  const result = await obRepo.findAll({
    filters: {
      fiscal_year_id: { operator: 'eq', value: fiscalYearId },
    },
    select: '*, fund:funds(id,name,code)',
  });

  const balances = (result.data || []) as import('@/models/openingBalance.model').OpeningBalance[];

  const rows = balances.map((b) => ({
    id: b.id,
    fund: b.fund?.name || '—',
    fundCode: b.fund?.code || '',
    amount: formatCurrency(b.amount || 0, currencyCode),
    status: b.status,
  }));

  const columns = [
    { field: 'fund', headerName: 'Fund', type: 'text', subtitleField: 'fundCode', flex: 1.5 },
    { field: 'amount', headerName: 'Amount', type: 'currency', flex: 1 },
    { field: 'status', headerName: 'Status', type: 'badge', flex: 0.7 },
  ];

  return { rows, columns };
};

// Export all handlers
export const adminFinanceFiscalYearsHandlers: Record<string, ServiceDataSourceHandler> = {
  // List page handlers
  'admin-finance.fiscal-years.list.hero': resolveFiscalYearsListHero,
  'admin-finance.fiscal-years.list.table': resolveFiscalYearsListTable,
  // Manage page handlers
  'admin-finance.fiscal-years.manage.header': resolveFiscalYearManageHeader,
  'admin-finance.fiscal-years.manage.form': resolveFiscalYearManageForm,
  // Profile page handlers
  'admin-finance.fiscal-years.profile.header': resolveFiscalYearProfileHeader,
  'admin-finance.fiscal-years.profile.details': resolveFiscalYearProfileDetails,
  'admin-finance.fiscal-years.profile.periodSummary': resolveFiscalYearPeriodSummary,
  'admin-finance.fiscal-years.profile.openingBalances': resolveFiscalYearOpeningBalances,
  // Action handlers
  'admin-finance.fiscal-years.save': saveFiscalYear,
  'admin-finance.fiscal-years.delete': deleteFiscalYear,
};
