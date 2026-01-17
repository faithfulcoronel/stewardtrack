import type { ServiceDataSourceHandler } from './types';
import { container } from '@/lib/container';
import { TYPES } from '@/lib/types';
import type { TenantService } from '@/services/TenantService';
import type { IOpeningBalanceRepository } from '@/repositories/openingBalance.repository';
import type { IFiscalYearRepository } from '@/repositories/fiscalYear.repository';
import type { IFundRepository } from '@/repositories/fund.repository';
import type { IFinancialSourceRepository } from '@/repositories/financialSource.repository';
import type { OpeningBalanceService } from '@/services/OpeningBalanceService';
import type { OpeningBalance } from '@/models/openingBalance.model';
import type { FiscalYear } from '@/models/fiscalYear.model';
import type { Fund } from '@/models/fund.model';
import type { FinancialSource } from '@/models/financialSource.model';
import { getTenantCurrency, formatCurrency } from './finance-utils';
import { getTenantTimezone, formatDate } from './datetime-utils';

// ==================== LIST PAGE HANDLERS ====================

const resolveOpeningBalancesListHero: ServiceDataSourceHandler = async (_request) => {
  const tenantService = container.get<TenantService>(TYPES.TenantService);
  const openingBalanceRepo = container.get<IOpeningBalanceRepository>(TYPES.IOpeningBalanceRepository);

  const tenant = await tenantService.getCurrentTenant();
  if (!tenant) {
    throw new Error('No tenant context available');
  }

  const currency = await getTenantCurrency();

  const balances = await openingBalanceRepo.findAll();
  const allBalances = (balances.data || []) as OpeningBalance[];

  const totalAmount = allBalances.reduce((sum, b) => sum + (b.amount || 0), 0);
  const postedCount = allBalances.filter((b) => b.status === 'posted').length;
  const pendingCount = allBalances.filter((b) => ['draft', 'submitted', 'approved'].includes(b.status)).length;

  return {
    eyebrow: 'Finance setup',
    headline: 'Opening balances',
    description: 'Set initial fund balances for each fiscal year.',
    metrics: [
      {
        label: 'Total entries',
        value: allBalances.length.toString(),
        caption: 'Opening balances',
      },
      {
        label: 'Total amount',
        value: formatCurrency(totalAmount, currency),
        caption: 'All balances',
      },
      {
        label: 'Posted',
        value: postedCount.toString(),
        caption: 'Completed',
      },
      {
        label: 'Pending',
        value: pendingCount.toString(),
        caption: 'In process',
      },
    ],
  };
};

const resolveOpeningBalancesListStatusSummary: ServiceDataSourceHandler = async (_request) => {
  const tenantService = container.get<TenantService>(TYPES.TenantService);
  const openingBalanceRepo = container.get<IOpeningBalanceRepository>(TYPES.IOpeningBalanceRepository);

  const tenant = await tenantService.getCurrentTenant();
  if (!tenant) {
    throw new Error('No tenant context available');
  }

  const currency = await getTenantCurrency();

  const balances = await openingBalanceRepo.findAll();
  const allBalances = (balances.data || []) as OpeningBalance[];

  const statusGroups = {
    draft: { count: 0, amount: 0 },
    submitted: { count: 0, amount: 0 },
    approved: { count: 0, amount: 0 },
    posted: { count: 0, amount: 0 },
    voided: { count: 0, amount: 0 },
  };

  allBalances.forEach((b) => {
    if (statusGroups[b.status]) {
      statusGroups[b.status].count++;
      statusGroups[b.status].amount += b.amount || 0;
    }
  });

  return {
    items: [
      {
        id: 'draft',
        label: 'Draft',
        value: formatCurrency(statusGroups.draft.amount, currency),
        change: statusGroups.draft.count.toString(),
        changeLabel: 'entries',
        trend: 'flat',
        tone: 'neutral',
        description: 'Not yet submitted for review.',
      },
      {
        id: 'submitted',
        label: 'Submitted',
        value: formatCurrency(statusGroups.submitted.amount, currency),
        change: statusGroups.submitted.count.toString(),
        changeLabel: 'entries',
        trend: 'flat',
        tone: 'informative',
        description: 'Awaiting approval.',
      },
      {
        id: 'approved',
        label: 'Approved',
        value: formatCurrency(statusGroups.approved.amount, currency),
        change: statusGroups.approved.count.toString(),
        changeLabel: 'entries',
        trend: 'flat',
        tone: 'warning',
        description: 'Ready to be posted.',
      },
      {
        id: 'posted',
        label: 'Posted',
        value: formatCurrency(statusGroups.posted.amount, currency),
        change: statusGroups.posted.count.toString(),
        changeLabel: 'entries',
        trend: 'flat',
        tone: 'positive',
        description: 'Recorded in the ledger.',
      },
    ],
  };
};

const resolveOpeningBalancesListTable: ServiceDataSourceHandler = async (_request) => {
  const tenantService = container.get<TenantService>(TYPES.TenantService);
  const openingBalanceRepo = container.get<IOpeningBalanceRepository>(TYPES.IOpeningBalanceRepository);

  const tenant = await tenantService.getCurrentTenant();
  if (!tenant) {
    throw new Error('No tenant context available');
  }

  const currency = await getTenantCurrency();
  const timezone = await getTenantTimezone();

  const balances = await openingBalanceRepo.findAll({
    select: '*, fiscal_year:fiscal_years(id,name), fund:funds(id,name,code)',
    relationships: [], // Override default relationships since select already has embedded joins
  });
  const allBalances = (balances.data || []) as OpeningBalance[];

  const statusLabels: Record<string, string> = {
    draft: 'Draft',
    submitted: 'Submitted',
    approved: 'Approved',
    posted: 'Posted',
    voided: 'Voided',
  };

  const statusVariants: Record<string, string> = {
    draft: 'neutral',
    submitted: 'informative',
    approved: 'warning',
    posted: 'success',
    voided: 'destructive',
  };

  const rows = allBalances.map((balance: OpeningBalance) => ({
    id: balance.id,
    fiscalYear: balance.fiscal_year?.name || '—',
    fund: balance.fund?.name || '—',
    fundCode: balance.fund?.code || '',
    amount: formatCurrency(balance.amount || 0, currency),
    source: balance.source === 'manual' ? 'Manual' : 'Rollover',
    sourceVariant: balance.source === 'manual' ? 'neutral' : 'informative',
    status: statusLabels[balance.status] || balance.status,
    statusVariant: statusVariants[balance.status] || 'neutral',
    postedAt: balance.posted_at ? formatDate(new Date(balance.posted_at), timezone) : '—',
  }));

  const columns = [
    {
      field: 'fiscalYear',
      headerName: 'Fiscal year',
      type: 'text',
      flex: 1,
    },
    {
      field: 'fund',
      headerName: 'Fund',
      type: 'text',
      subtitleField: 'fundCode',
      flex: 1.2,
    },
    {
      field: 'amount',
      headerName: 'Amount',
      type: 'currency',
      flex: 1,
    },
    {
      field: 'source',
      headerName: 'Source',
      type: 'badge',
      badgeVariantField: 'sourceVariant',
      flex: 0.7,
    },
    {
      field: 'status',
      headerName: 'Status',
      type: 'badge',
      badgeVariantField: 'statusVariant',
      flex: 0.7,
    },
    {
      field: 'postedAt',
      headerName: 'Posted on',
      type: 'text',
      flex: 0.9,
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
          urlTemplate: '/admin/finance/opening-balances/{{id}}',
          variant: 'ghost',
        },
        {
          id: 'edit-record',
          label: 'Edit',
          intent: 'edit',
          urlTemplate: '/admin/finance/opening-balances/manage?openingBalanceId={{id}}',
          variant: 'secondary',
        },
        {
          id: 'delete-record',
          label: 'Delete',
          intent: 'delete',
          handler: 'admin-finance.opening-balances.delete',
          confirmTitle: 'Delete opening balance',
          confirmDescription: 'Are you sure you want to delete this opening balance?',
          confirmLabel: 'Delete',
          cancelLabel: 'Cancel',
          successMessage: 'Opening balance was deleted.',
          variant: 'destructive',
        },
      ],
    },
  ];

  const filters = [
    {
      id: 'search',
      type: 'search',
      placeholder: 'Search...',
    },
    {
      id: 'status',
      type: 'select',
      placeholder: 'Status',
      options: [
        { label: 'All', value: 'all' },
        { label: 'Draft', value: 'draft' },
        { label: 'Submitted', value: 'submitted' },
        { label: 'Approved', value: 'approved' },
        { label: 'Posted', value: 'posted' },
        { label: 'Voided', value: 'voided' },
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

const resolveOpeningBalanceManageHeader: ServiceDataSourceHandler = async (request) => {
  const openingBalanceId = request.params?.openingBalanceId as string;

  if (!openingBalanceId) {
    return {
      eyebrow: 'Finance setup',
      headline: 'Create opening balance',
      description: 'Set an initial balance for a fund in a fiscal year.',
    };
  }

  const openingBalanceRepo = container.get<IOpeningBalanceRepository>(TYPES.IOpeningBalanceRepository);
  const balance = await openingBalanceRepo.findById(openingBalanceId);

  if (!balance) {
    throw new Error('Opening balance not found');
  }

  return {
    eyebrow: 'Edit opening balance',
    headline: 'Update opening balance',
    description: 'Modify the opening balance entry.',
  };
};

const resolveOpeningBalanceManageForm: ServiceDataSourceHandler = async (request) => {
  const openingBalanceId = request.params?.openingBalanceId as string;

  const tenantService = container.get<TenantService>(TYPES.TenantService);
  const openingBalanceRepo = container.get<IOpeningBalanceRepository>(TYPES.IOpeningBalanceRepository);
  const fiscalYearRepo = container.get<IFiscalYearRepository>(TYPES.IFiscalYearRepository);
  const fundRepo = container.get<IFundRepository>(TYPES.IFundRepository);
  const financialSourceRepo = container.get<IFinancialSourceRepository>(TYPES.IFinancialSourceRepository);

  const tenant = await tenantService.getCurrentTenant();
  if (!tenant) {
    throw new Error('No tenant context available');
  }

  let balance: Partial<OpeningBalance> = {};

  if (openingBalanceId) {
    const existing = await openingBalanceRepo.findById(openingBalanceId);
    if (existing) {
      balance = existing;
    }
  }

  // Fetch fiscal years
  const fiscalYearsResult = await fiscalYearRepo.findAll({
    order: { column: 'start_date', ascending: false },
  });
  const fiscalYears = (fiscalYearsResult.data || []) as FiscalYear[];
  const fiscalYearOptions = fiscalYears.map((fy) => ({
    label: fy.name,
    value: fy.id,
  }));

  // Fetch funds
  const fundsResult = await fundRepo.findAll({
    order: { column: 'name', ascending: true },
  });
  const funds = (fundsResult.data || []) as Fund[];
  const fundOptions = funds.map((f) => ({
    label: `${f.code} - ${f.name}`,
    value: f.id,
  }));

  // Fetch financial sources (banks/cash accounts)
  const sourcesResult = await financialSourceRepo.findAll({
    order: { column: 'name', ascending: true },
  });
  const sources = (sourcesResult.data || []) as FinancialSource[];
  const sourceOptions = sources.map((s) => ({
    label: s.name,
    value: s.id,
  }));

  const isPosted = balance.status === 'posted';

  return {
    fields: [
      ...(openingBalanceId
        ? [
            {
              name: 'openingBalanceId',
              type: 'hidden' as const,
            },
          ]
        : []),
      {
        name: 'fiscalYearId',
        label: 'Fiscal year',
        type: 'select',
        colSpan: 'half',
        required: true,
        options: fiscalYearOptions,
        helperText: 'Select the fiscal year for this opening balance',
        disabled: isPosted,
      },
      {
        name: 'fundId',
        label: 'Fund',
        type: 'select',
        colSpan: 'half',
        required: true,
        options: fundOptions,
        helperText: 'Select the fund',
        disabled: isPosted,
      },
      {
        name: 'sourceId',
        label: 'Financial source',
        type: 'select',
        colSpan: 'half',
        required: false,
        options: sourceOptions,
        helperText: 'Bank or cash account (required for posting)',
        disabled: isPosted,
      },
      {
        name: 'amount',
        label: 'Amount',
        type: 'currency',
        colSpan: 'half',
        required: true,
        helperText: 'Opening balance amount',
        disabled: isPosted,
      },
      {
        name: 'source',
        label: 'Entry source',
        type: 'select',
        colSpan: 'half',
        required: true,
        options: [
          { label: 'Manual entry', value: 'manual' },
          { label: 'Rollover from previous year', value: 'rollover' },
        ],
        helperText: 'How was this balance determined',
        disabled: isPosted,
      },
      {
        name: 'status',
        label: 'Status',
        type: 'select',
        colSpan: 'half',
        required: true,
        options: [
          { label: 'Draft', value: 'draft' },
          { label: 'Submitted', value: 'submitted' },
          { label: 'Approved', value: 'approved' },
          { label: 'Posted', value: 'posted' },
          { label: 'Voided', value: 'voided' },
        ],
        helperText: 'Current workflow status',
        disabled: isPosted,
      },
    ],
    values: {
      ...(openingBalanceId ? { openingBalanceId: balance.id } : {}),
      fiscalYearId: balance.fiscal_year_id || '',
      fundId: balance.fund_id || '',
      sourceId: balance.source_id || '',
      amount: balance.amount || 0,
      source: balance.source || 'manual',
      status: balance.status || 'draft',
    },
    validation: {
      fiscalYearId: { required: true },
      fundId: { required: true },
      amount: { required: true, min: 0 },
      source: { required: true },
      status: { required: true },
    },
  };
};

// ==================== ACTION HANDLERS ====================

const saveOpeningBalance: ServiceDataSourceHandler = async (request) => {
  const params = request.params as Record<string, unknown>;
  // Form values are wrapped in 'values' by AdminFormSubmitHandler
  const values = (params.values ?? params) as Record<string, unknown>;
  const openingBalanceId = (values.openingBalanceId ?? params.openingBalanceId) as string | undefined;

  console.log('[saveOpeningBalance] Saving opening balance. ID:', openingBalanceId);

  try {
    const tenantService = container.get<TenantService>(TYPES.TenantService);
    const openingBalanceRepo = container.get<IOpeningBalanceRepository>(TYPES.IOpeningBalanceRepository);
    const openingBalanceService = container.get<OpeningBalanceService>(TYPES.OpeningBalanceService);

    const tenant = await tenantService.getCurrentTenant();
    if (!tenant) {
      throw new Error('No tenant context available');
    }

    const balanceData: Partial<OpeningBalance> = {
      fiscal_year_id: values.fiscalYearId as string,
      fund_id: values.fundId as string,
      source_id: values.sourceId ? (values.sourceId as string) : null,
      amount: parseFloat(String(values.amount)) || 0,
      source: values.source as 'manual' | 'rollover',
      status: values.status as OpeningBalance['status'],
    };

    let balance: OpeningBalance;

    if (openingBalanceId) {
      // Check if trying to modify a posted balance
      const existing = await openingBalanceRepo.findById(openingBalanceId);
      if (existing?.status === 'posted') {
        return {
          success: false,
          message: 'Cannot modify a posted opening balance',
        };
      }

      balance = await openingBalanceRepo.update(openingBalanceId, balanceData);

      // If status changed to posted, trigger posting workflow
      if (balanceData.status === 'posted' && existing?.status !== 'posted') {
        // First update status to approved, then post
        await openingBalanceRepo.update(openingBalanceId, { status: 'approved' });
        await openingBalanceService.post(openingBalanceId);
      }
    } else {
      balance = await openingBalanceRepo.create(balanceData);

      // If creating as posted, need to go through workflow
      if (balanceData.status === 'posted') {
        await openingBalanceService.submit(balance.id);
        await openingBalanceService.approve(balance.id);
        await openingBalanceService.post(balance.id);
      }
    }

    console.log('[saveOpeningBalance] Opening balance saved:', balance.id);

    return {
      success: true,
      message: openingBalanceId ? 'Opening balance updated successfully' : 'Opening balance created successfully',
      openingBalanceId: balance.id,
      redirectUrl: '/admin/finance/opening-balances',
    };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to save opening balance';
    console.error('[saveOpeningBalance] Failed:', error);

    return {
      success: false,
      message: errorMessage,
    };
  }
};

const deleteOpeningBalance: ServiceDataSourceHandler = async (request) => {
  const openingBalanceId = request.params?.id as string;

  if (!openingBalanceId) {
    return {
      success: false,
      message: 'Opening balance ID is required',
    };
  }

  console.log('[deleteOpeningBalance] Deleting opening balance:', openingBalanceId);

  try {
    const openingBalanceRepo = container.get<IOpeningBalanceRepository>(TYPES.IOpeningBalanceRepository);

    // Check if posted
    const existing = await openingBalanceRepo.findById(openingBalanceId);
    if (existing?.status === 'posted') {
      return {
        success: false,
        message: 'Cannot delete a posted opening balance. Void it instead.',
      };
    }

    await openingBalanceRepo.delete(openingBalanceId);

    console.log('[deleteOpeningBalance] Opening balance deleted:', openingBalanceId);

    return {
      success: true,
      message: 'Opening balance deleted successfully',
    };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to delete opening balance';
    console.error('[deleteOpeningBalance] Failed:', error);

    return {
      success: false,
      message: errorMessage,
    };
  }
};

// ==================== PROFILE PAGE HANDLERS ====================

const resolveOpeningBalanceProfileHeader: ServiceDataSourceHandler = async (request) => {
  const openingBalanceId = request.params?.openingBalanceId as string;

  if (!openingBalanceId) {
    throw new Error('Opening balance ID is required');
  }

  const openingBalanceRepo = container.get<IOpeningBalanceRepository>(TYPES.IOpeningBalanceRepository);
  const currency = await getTenantCurrency();

  const balance = await openingBalanceRepo.findById(openingBalanceId, {
    select: '*, fiscal_year:fiscal_years(id,name), fund:funds(id,name,code)',
    relationships: [], // Override default relationships since select already has embedded joins
  });

  if (!balance) {
    throw new Error('Opening balance not found');
  }

  const statusLabels: Record<string, string> = {
    draft: 'Draft',
    submitted: 'Submitted',
    approved: 'Approved',
    posted: 'Posted',
    voided: 'Voided',
  };

  return {
    eyebrow: statusLabels[balance.status] || balance.status,
    headline: `${balance.fund?.name || 'Unknown Fund'} — ${balance.fiscal_year?.name || 'Unknown FY'}`,
    description: `Opening balance: ${formatCurrency(balance.amount || 0, currency)}`,
    metrics: [
      {
        label: 'Amount',
        value: formatCurrency(balance.amount || 0, currency),
        caption: 'Opening balance',
      },
      {
        label: 'Status',
        value: statusLabels[balance.status] || balance.status,
        caption: balance.status === 'posted' ? 'Recorded' : 'In progress',
      },
      {
        label: 'Source',
        value: balance.source === 'manual' ? 'Manual' : 'Rollover',
        caption: 'Entry type',
      },
    ],
  };
};

const resolveOpeningBalanceProfileDetails: ServiceDataSourceHandler = async (request) => {
  const openingBalanceId = request.params?.openingBalanceId as string;

  if (!openingBalanceId) {
    throw new Error('Opening balance ID is required');
  }

  const openingBalanceRepo = container.get<IOpeningBalanceRepository>(TYPES.IOpeningBalanceRepository);
  const timezone = await getTenantTimezone();
  const currency = await getTenantCurrency();

  const balance = await openingBalanceRepo.findById(openingBalanceId, {
    select: '*, fiscal_year:fiscal_years(id,name), fund:funds(id,name,code), financial_source:financial_sources(id,name)',
    relationships: [], // Override default relationships since select already has embedded joins
  });

  if (!balance) {
    throw new Error('Opening balance not found');
  }

  const statusLabels: Record<string, string> = {
    draft: 'Draft',
    submitted: 'Submitted',
    approved: 'Approved',
    posted: 'Posted',
    voided: 'Voided',
  };

  return {
    panels: [
      {
        id: 'balance-info',
        title: 'Balance information',
        items: [
          { label: 'Fiscal year', value: balance.fiscal_year?.name || '—' },
          { label: 'Fund', value: balance.fund ? `${balance.fund.code} - ${balance.fund.name}` : '—' },
          { label: 'Amount', value: formatCurrency(balance.amount || 0, currency) },
          { label: 'Source', value: balance.source === 'manual' ? 'Manual entry' : 'Rollover from previous year' },
          { label: 'Financial source', value: balance.financial_source?.name || 'N/A' },
        ],
      },
      {
        id: 'status-info',
        title: 'Status information',
        items: [
          { label: 'Current status', value: statusLabels[balance.status] || balance.status },
          { label: 'Posted at', value: balance.posted_at ? formatDate(new Date(balance.posted_at), timezone) : 'Not posted' },
          { label: 'Posted by', value: balance.posted_by || 'N/A' },
        ],
      },
    ],
  };
};

const resolveOpeningBalancePostingInfo: ServiceDataSourceHandler = async (request) => {
  const openingBalanceId = request.params?.openingBalanceId as string;

  if (!openingBalanceId) {
    return { items: [] };
  }

  const openingBalanceRepo = container.get<IOpeningBalanceRepository>(TYPES.IOpeningBalanceRepository);
  const timezone = await getTenantTimezone();

  const balance = await openingBalanceRepo.findById(openingBalanceId);

  if (!balance) {
    return { items: [] };
  }

  if (balance.status !== 'posted') {
    return {
      items: [
        {
          id: 'not-posted',
          label: 'Posting status',
          value: 'Not posted',
          change: '',
          changeLabel: '',
          trend: 'flat',
          tone: 'neutral',
          description: 'This opening balance has not been posted yet.',
        },
      ],
    };
  }

  return {
    items: [
      {
        id: 'posted-at',
        label: 'Posted at',
        value: balance.posted_at ? formatDate(new Date(balance.posted_at), timezone) : '—',
        change: '',
        changeLabel: '',
        trend: 'flat',
        tone: 'positive',
        description: 'Date and time of posting.',
      },
      {
        id: 'journal-entry',
        label: 'Journal entry',
        value: balance.header_id ? 'Created' : 'None',
        change: '',
        changeLabel: '',
        trend: 'flat',
        tone: 'informative',
        description: balance.header_id ? 'Journal entry was created.' : 'No journal entry.',
      },
    ],
  };
};

// Export all handlers
export const adminFinanceOpeningBalancesHandlers: Record<string, ServiceDataSourceHandler> = {
  // List page handlers
  'admin-finance.opening-balances.list.hero': resolveOpeningBalancesListHero,
  'admin-finance.opening-balances.list.statusSummary': resolveOpeningBalancesListStatusSummary,
  'admin-finance.opening-balances.list.table': resolveOpeningBalancesListTable,
  // Manage page handlers
  'admin-finance.opening-balances.manage.header': resolveOpeningBalanceManageHeader,
  'admin-finance.opening-balances.manage.form': resolveOpeningBalanceManageForm,
  // Profile page handlers
  'admin-finance.opening-balances.profile.header': resolveOpeningBalanceProfileHeader,
  'admin-finance.opening-balances.profile.details': resolveOpeningBalanceProfileDetails,
  'admin-finance.opening-balances.profile.postingInfo': resolveOpeningBalancePostingInfo,
  // Action handlers
  'admin-finance.opening-balances.save': saveOpeningBalance,
  'admin-finance.opening-balances.delete': deleteOpeningBalance,
};
