import type { ServiceDataSourceHandler } from './types';
import { container } from '@/lib/container';
import { TYPES } from '@/lib/types';
import type { TenantService } from '@/services/TenantService';
import type { DonationService } from '@/services/DonationService';
import type { IDonationRepository } from '@/repositories/donation.repository';
import type { Donation, DonationStatus } from '@/models/donation.model';
import { getTenantCurrency, formatCurrency } from './finance-utils';
import { getTenantTimezone, formatDate } from './datetime-utils';

// ==================== LIST PAGE HANDLERS ====================

const resolveDonationsListHero: ServiceDataSourceHandler = async (_request) => {
  const tenantService = container.get<TenantService>(TYPES.TenantService);
  const donationRepo = container.get<IDonationRepository>(TYPES.IDonationRepository);

  const tenant = await tenantService.getCurrentTenant();
  if (!tenant) {
    throw new Error('No tenant context available');
  }

  // Get tenant currency (cached)
  const currency = await getTenantCurrency();

  // Get all donations for metrics
  const donationsResult = await donationRepo.findAll();
  const donations = (donationsResult?.data || []) as Donation[];
  const totalDonations = donations.length;

  // Calculate total received (paid donations only)
  const paidDonations = donations.filter(d => d.status === 'paid');
  const totalReceived = paidDonations.reduce((sum, d) => sum + (d.amount || 0), 0);

  // Get current month's donations
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const thisMonthDonations = paidDonations.filter(d => {
    const paidDate = d.paid_at ? new Date(d.paid_at) : null;
    return paidDate && paidDate >= monthStart;
  });
  const thisMonthTotal = thisMonthDonations.reduce((sum, d) => sum + (d.amount || 0), 0);

  return {
    eyebrow: 'Online giving',
    headline: 'Donation management',
    description: 'Track and manage all online donations received through the giving portal.',
    metrics: [
      {
        label: 'Total received',
        value: formatCurrency(totalReceived, currency),
        caption: `${paidDonations.length} completed donations`,
      },
      {
        label: 'This month',
        value: formatCurrency(thisMonthTotal, currency),
        caption: `${thisMonthDonations.length} donations`,
      },
      {
        label: 'All donations',
        value: totalDonations.toString(),
        caption: 'All time',
      },
    ],
  };
};

const resolveDonationsListSummary: ServiceDataSourceHandler = async (_request) => {
  const tenantService = container.get<TenantService>(TYPES.TenantService);
  const donationRepo = container.get<IDonationRepository>(TYPES.IDonationRepository);

  const tenant = await tenantService.getCurrentTenant();
  if (!tenant) {
    throw new Error('No tenant context available');
  }

  const currency = await getTenantCurrency();

  // Get all donations
  const donationsResult = await donationRepo.findAll();
  const donations = (donationsResult?.data || []) as Donation[];
  const paidDonations = donations.filter(d => d.status === 'paid');

  // Calculate metrics
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

  // This month
  const thisMonthDonations = paidDonations.filter(d => {
    const paidDate = d.paid_at ? new Date(d.paid_at) : null;
    return paidDate && paidDate >= monthStart;
  });
  const thisMonthTotal = thisMonthDonations.reduce((sum, d) => sum + (d.amount || 0), 0);

  // Last month
  const lastMonthDonations = paidDonations.filter(d => {
    const paidDate = d.paid_at ? new Date(d.paid_at) : null;
    return paidDate && paidDate >= lastMonthStart && paidDate <= lastMonthEnd;
  });
  const lastMonthTotal = lastMonthDonations.reduce((sum, d) => sum + (d.amount || 0), 0);

  // Calculate average donation
  const avgDonation = paidDonations.length > 0
    ? paidDonations.reduce((sum, d) => sum + (d.amount || 0), 0) / paidDonations.length
    : 0;

  // Recurring donations
  const recurringDonations = paidDonations.filter(d => d.is_recurring);
  const recurringTotal = recurringDonations.reduce((sum, d) => sum + (d.amount || 0), 0);

  // Month-over-month change
  const monthChange = lastMonthTotal > 0
    ? ((thisMonthTotal - lastMonthTotal) / lastMonthTotal * 100).toFixed(1)
    : '0';

  return {
    items: [
      {
        id: 'mtd-donations',
        label: 'Month-to-date',
        value: formatCurrency(thisMonthTotal, currency),
        change: `${monthChange}%`,
        changeLabel: 'vs last month',
        trend: Number(monthChange) >= 0 ? 'up' : 'down',
        tone: Number(monthChange) >= 0 ? 'positive' : 'neutral',
        description: `${thisMonthDonations.length} donations this month`,
      },
      {
        id: 'avg-donation',
        label: 'Average donation',
        value: formatCurrency(avgDonation, currency),
        change: '',
        changeLabel: 'all time',
        trend: 'flat',
        tone: 'neutral',
        description: `Based on ${paidDonations.length} donations`,
      },
      {
        id: 'recurring',
        label: 'Recurring giving',
        value: formatCurrency(recurringTotal, currency),
        change: '',
        changeLabel: `${recurringDonations.length} donors`,
        trend: recurringDonations.length > 0 ? 'up' : 'flat',
        tone: recurringDonations.length > 0 ? 'positive' : 'neutral',
        description: 'Total from recurring donors',
      },
    ],
  };
};

const resolveDonationsListStatusOverview: ServiceDataSourceHandler = async (_request) => {
  const tenantService = container.get<TenantService>(TYPES.TenantService);
  const donationRepo = container.get<IDonationRepository>(TYPES.IDonationRepository);

  const tenant = await tenantService.getCurrentTenant();
  if (!tenant) {
    throw new Error('No tenant context available');
  }

  // Get all donations
  const donationsResult = await donationRepo.findAll();
  const donations = (donationsResult?.data || []) as Donation[];

  // Count by status
  const pending = donations.filter(d => d.status === 'pending').length;
  const paid = donations.filter(d => d.status === 'paid').length;
  const failed = donations.filter(d => d.status === 'failed').length;
  const refunded = donations.filter(d => d.status === 'refunded').length;

  return {
    items: [
      {
        id: 'pending',
        label: 'Pending',
        value: pending.toString(),
        change: '',
        changeLabel: 'awaiting payment',
        trend: pending > 0 ? 'up' : 'flat',
        tone: pending > 0 ? 'warning' : 'neutral',
        description: 'Donations awaiting payment completion',
      },
      {
        id: 'completed',
        label: 'Completed',
        value: paid.toString(),
        change: '',
        changeLabel: 'successful payments',
        trend: 'flat',
        tone: 'positive',
        description: 'Successfully processed donations',
      },
      {
        id: 'failed',
        label: 'Failed',
        value: failed.toString(),
        change: '',
        changeLabel: 'payment failures',
        trend: failed > 0 ? 'down' : 'flat',
        tone: failed > 0 ? 'critical' : 'neutral',
        description: 'Donations with payment failures',
      },
      {
        id: 'refunded',
        label: 'Refunded',
        value: refunded.toString(),
        change: '',
        changeLabel: 'refunds issued',
        trend: 'flat',
        tone: 'neutral',
        description: 'Donations that were refunded',
      },
    ],
  };
};

const resolveDonationsListTable: ServiceDataSourceHandler = async (_request) => {
  const tenantService = container.get<TenantService>(TYPES.TenantService);
  const donationService = container.get<DonationService>(TYPES.DonationService);
  const donationRepo = container.get<IDonationRepository>(TYPES.IDonationRepository);

  const tenant = await tenantService.getCurrentTenant();
  if (!tenant) {
    throw new Error('No tenant context available');
  }

  const currency = await getTenantCurrency();
  const timezone = await getTenantTimezone();

  // Get all donations
  const donationsResult = await donationRepo.findAll();
  const donations = (donationsResult?.data || []) as Donation[];

  // Sort by created_at descending (most recent first)
  donations.sort((a, b) => {
    const dateA = new Date(a.created_at || 0).getTime();
    const dateB = new Date(b.created_at || 0).getTime();
    return dateB - dateA;
  });

  // Status badge variants
  const statusVariants: Record<DonationStatus, string> = {
    pending: 'warning',
    paid: 'success',
    failed: 'critical',
    refunded: 'neutral',
    expired: 'neutral',
    cancelled: 'neutral',
  };

  // Payment method display names
  const paymentMethodNames: Record<string, string> = {
    card: 'Credit/Debit Card',
    ewallet: 'E-Wallet',
    bank_transfer: 'Bank Transfer',
    direct_debit: 'Direct Debit',
  };

  // Build table rows - fetch decrypted details for each donation
  const rows = await Promise.all(donations.map(async (donation) => {
    // Get decrypted donor info
    let donorName = 'Anonymous';
    let donorEmail = '—';

    if (!donation.anonymous) {
      try {
        const details = await donationService.getDonationWithDetails(donation.id, tenant.id);
        if (details) {
          donorName = details.donor_name || 'Guest Donor';
          donorEmail = details.donor_email || '—';
        }
      } catch {
        // If decryption fails, show placeholder
        donorName = donation.member_id ? 'Member' : 'Guest Donor';
      }
    }

    const paymentMethod = donation.payment_method_type
      ? paymentMethodNames[donation.payment_method_type] || donation.payment_method_type
      : '—';

    const paidDate = donation.paid_at
      ? formatDate(new Date(donation.paid_at), timezone)
      : '—';

    const createdDate = donation.created_at
      ? formatDate(new Date(donation.created_at), timezone)
      : '—';

    return {
      id: donation.id,
      date: donation.paid_at ? paidDate : createdDate,
      rawDate: donation.paid_at || donation.created_at,
      donor: donorName,
      email: donorEmail,
      amount: formatCurrency(donation.amount, currency),
      totalCharged: formatCurrency(donation.total_charged, currency),
      paymentMethod,
      channel: donation.payment_channel || '—',
      status: donation.status.charAt(0).toUpperCase() + donation.status.slice(1),
      statusVariant: statusVariants[donation.status] || 'neutral',
      isRecurring: donation.is_recurring ? 'Yes' : 'No',
      recurringBadgeVariant: donation.is_recurring ? 'informative' : 'neutral',
      anonymous: donation.anonymous,
    };
  }));

  const columns = [
    { field: 'date', headerName: 'Date', type: 'text', flex: 0.8 },
    { field: 'donor', headerName: 'Donor', type: 'text', flex: 1 },
    { field: 'email', headerName: 'Email', type: 'text', flex: 1.2, hideOnMobile: true },
    { field: 'amount', headerName: 'Amount', type: 'text', flex: 0.7 },
    { field: 'paymentMethod', headerName: 'Payment', type: 'text', flex: 0.9, hideOnMobile: true },
    { field: 'status', headerName: 'Status', type: 'badge', badgeVariantField: 'statusVariant', flex: 0.6 },
    { field: 'isRecurring', headerName: 'Recurring', type: 'badge', badgeVariantField: 'recurringBadgeVariant', flex: 0.5, hideOnMobile: true },
    {
      field: 'actions',
      headerName: 'Actions',
      type: 'actions',
      actions: [
        {
          id: 'view-record',
          label: 'View',
          intent: 'view',
          urlTemplate: '/admin/finance/donations/{{id}}',
        },
        {
          id: 'refund-record',
          label: 'Refund',
          intent: 'action',
          handler: 'admin-finance.donations.refund',
          confirmTitle: 'Issue refund',
          confirmDescription: 'Are you sure you want to refund this donation? This action cannot be undone.',
          confirmLabel: 'Refund',
          cancelLabel: 'Cancel',
          successMessage: 'Refund initiated successfully',
          variant: 'destructive',
          condition: '{{status}} === "Paid"',
        },
      ],
    },
  ];

  const filters = [
    {
      id: 'search',
      type: 'search',
      placeholder: 'Search by donor name or email...',
    },
    {
      id: 'dateRange',
      type: 'daterange',
      field: 'rawDate',
      placeholder: 'Filter by date',
    },
    {
      id: 'status',
      type: 'select',
      placeholder: 'Status',
      options: [
        { label: 'All statuses', value: 'all' },
        { label: 'Pending', value: 'pending' },
        { label: 'Paid', value: 'paid' },
        { label: 'Failed', value: 'failed' },
        { label: 'Refunded', value: 'refunded' },
        { label: 'Expired', value: 'expired' },
      ],
    },
    {
      id: 'paymentMethod',
      type: 'select',
      placeholder: 'Payment method',
      options: [
        { label: 'All methods', value: 'all' },
        { label: 'Credit/Debit Card', value: 'card' },
        { label: 'E-Wallet', value: 'ewallet' },
        { label: 'Bank Transfer', value: 'bank_transfer' },
        { label: 'Direct Debit', value: 'direct_debit' },
      ],
    },
  ];

  return {
    rows,
    columns,
    filters,
  };
};

// ==================== PROFILE PAGE HANDLERS ====================

/**
 * Helper to get status badge variant
 */
function getStatusBadgeVariant(status: DonationStatus): string {
  switch (status) {
    case 'pending': return 'warning';
    case 'paid': return 'success';
    case 'failed': return 'destructive';
    case 'refunded': return 'secondary';
    case 'expired': return 'secondary';
    case 'cancelled': return 'secondary';
    default: return 'secondary';
  }
}

const resolveDonationProfileHeader: ServiceDataSourceHandler = async (request) => {
  const donationId = request.params?.donationId as string;

  if (!donationId) {
    throw new Error('Donation ID is required');
  }

  const tenantService = container.get<TenantService>(TYPES.TenantService);
  const donationService = container.get<DonationService>(TYPES.DonationService);

  const tenant = await tenantService.getCurrentTenant();
  if (!tenant) {
    throw new Error('No tenant context available');
  }

  const currency = await getTenantCurrency();
  const timezone = await getTenantTimezone();

  // Get donation with decrypted details
  const donation = await donationService.getDonationWithDetails(donationId, tenant.id);

  if (!donation) {
    return {
      eyebrow: 'Donation not found',
      title: 'Error',
      subtitle: 'The requested donation could not be found',
      badge: { label: 'Error', variant: 'destructive' },
      metrics: [],
      actions: [],
    };
  }

  const donorName = donation.anonymous
    ? 'Anonymous Donor'
    : (donation.donor_name || 'Guest Donor');

  const paidDate = donation.paid_at
    ? formatDate(new Date(donation.paid_at), timezone)
    : '—';

  // Build actions based on status
  const actions: { label: string; variant: string; handler?: string; url?: string }[] = [];
  if (donation.status === 'paid') {
    actions.push({
      label: 'Issue Refund',
      variant: 'destructive',
      handler: 'admin-finance.donations.refund',
    });
  }

  return {
    eyebrow: `Donation #${donationId.substring(0, 8).toUpperCase()}`,
    title: donorName,
    subtitle: donation.anonymous ? 'Anonymous donation' : (donation.donor_email || 'Online donation'),
    badge: {
      label: donation.status.charAt(0).toUpperCase() + donation.status.slice(1),
      variant: getStatusBadgeVariant(donation.status),
    },
    metrics: [
      {
        label: 'Amount',
        value: formatCurrency(donation.amount, currency),
        caption: 'Donation amount',
      },
      {
        label: 'Total Charged',
        value: formatCurrency(donation.total_charged, currency),
        caption: 'Including fees',
      },
      {
        label: 'Date',
        value: paidDate,
        caption: donation.status === 'paid' ? 'Payment completed' : 'Created',
      },
    ],
    actions,
  };
};

const resolveDonationProfileDetails: ServiceDataSourceHandler = async (request) => {
  const donationId = request.params?.donationId as string;

  if (!donationId) {
    throw new Error('Donation ID is required');
  }

  const tenantService = container.get<TenantService>(TYPES.TenantService);
  const donationService = container.get<DonationService>(TYPES.DonationService);

  const tenant = await tenantService.getCurrentTenant();
  if (!tenant) {
    throw new Error('No tenant context available');
  }

  const currency = await getTenantCurrency();
  const timezone = await getTenantTimezone();

  const donation = await donationService.getDonationWithDetails(donationId, tenant.id);

  if (!donation) {
    return {
      panels: [
        {
          id: 'error',
          title: 'Donation not found',
          description: 'The requested donation could not be found',
          columns: 1,
          items: [],
        },
      ],
    };
  }

  // Payment method display
  const paymentMethodNames: Record<string, string> = {
    card: 'Credit/Debit Card',
    ewallet: 'E-Wallet',
    bank_transfer: 'Bank Transfer',
    direct_debit: 'Direct Debit',
  };

  const paymentMethod = donation.payment_method_type
    ? paymentMethodNames[donation.payment_method_type] || donation.payment_method_type
    : '—';

  const createdDate = donation.created_at
    ? formatDate(new Date(donation.created_at), timezone)
    : '—';

  const paidDate = donation.paid_at
    ? formatDate(new Date(donation.paid_at), timezone)
    : '—';

  return {
    panels: [
      {
        id: 'donor-info',
        title: 'Donor information',
        description: 'Details about the donor',
        columns: 2,
        items: [
          {
            label: 'Name',
            value: donation.anonymous ? 'Anonymous' : (donation.donor_name || 'Guest Donor'),
            type: 'text',
          },
          {
            label: 'Email',
            value: donation.anonymous ? '—' : (donation.donor_email || '—'),
            type: 'text',
          },
          {
            label: 'Phone',
            value: donation.anonymous ? '—' : (donation.donor_phone || '—'),
            type: 'text',
          },
          {
            label: 'Anonymous',
            value: donation.anonymous ? 'Yes' : 'No',
            type: 'badge',
            badgeVariant: donation.anonymous ? 'informative' : 'neutral',
          },
        ],
      },
      {
        id: 'payment-info',
        title: 'Payment details',
        description: 'Payment method and transaction information',
        columns: 2,
        items: [
          { label: 'Payment Method', value: paymentMethod, type: 'text' },
          { label: 'Channel', value: donation.payment_channel || '—', type: 'text' },
          { label: 'Card/Account', value: donation.payment_method_masked || '—', type: 'text' },
          {
            label: 'Status',
            value: donation.status.charAt(0).toUpperCase() + donation.status.slice(1),
            type: 'badge',
            badgeVariant: getStatusBadgeVariant(donation.status),
          },
        ],
      },
      {
        id: 'amount-breakdown',
        title: 'Amount breakdown',
        description: 'Donation amount and fees',
        columns: 2,
        items: [
          { label: 'Donation Amount', value: formatCurrency(donation.amount, currency), type: 'text' },
          { label: 'Xendit Fee', value: formatCurrency(donation.xendit_fee, currency), type: 'text' },
          { label: 'Platform Fee', value: formatCurrency(donation.platform_fee, currency), type: 'text' },
          { label: 'Total Charged', value: formatCurrency(donation.total_charged, currency), type: 'text' },
        ],
      },
      {
        id: 'dates',
        title: 'Timeline',
        description: 'Important dates',
        columns: 2,
        items: [
          { label: 'Created', value: createdDate, type: 'text' },
          { label: 'Paid', value: paidDate, type: 'text' },
          {
            label: 'Recurring',
            value: donation.is_recurring ? `Yes (${donation.recurring_frequency || 'Monthly'})` : 'No',
            type: 'badge',
            badgeVariant: donation.is_recurring ? 'informative' : 'neutral',
          },
          {
            label: 'Source',
            value: donation.source.charAt(0).toUpperCase() + donation.source.slice(1),
            type: 'text',
          },
        ],
      },
      ...(donation.notes ? [{
        id: 'notes',
        title: 'Notes',
        description: 'Additional information',
        columns: 1,
        items: [
          { label: 'Notes', value: donation.notes, type: 'multiline' },
        ],
      }] : []),
      ...(donation.refund_reason ? [{
        id: 'refund',
        title: 'Refund information',
        description: 'Details about the refund',
        columns: 2,
        items: [
          {
            label: 'Refunded At',
            value: donation.refunded_at
              ? formatDate(new Date(donation.refunded_at), timezone)
              : '—',
            type: 'text',
          },
          { label: 'Reason', value: donation.refund_reason, type: 'text' },
        ],
      }] : []),
    ],
  };
};

const resolveDonationProfileTimeline: ServiceDataSourceHandler = async (request) => {
  const donationId = request.params?.donationId as string;
  const timezone = await getTenantTimezone();

  if (!donationId) {
    return {
      items: [
        {
          id: 'empty-state',
          title: 'No timeline available',
          date: formatDate(new Date(), timezone, { month: 'short', day: 'numeric' }),
          timeAgo: 'Today',
          description: 'Timeline events will appear here.',
          category: 'Info',
          status: 'new',
        },
      ],
    };
  }

  const tenantService = container.get<TenantService>(TYPES.TenantService);
  const donationRepo = container.get<IDonationRepository>(TYPES.IDonationRepository);

  const tenant = await tenantService.getCurrentTenant();
  if (!tenant) {
    throw new Error('No tenant context available');
  }

  const donationsResult = await donationRepo.findAll();
  const donations = (donationsResult?.data || []) as Donation[];
  const donation = donations.find(d => d.id === donationId);

  if (!donation) {
    return {
      items: [
        {
          id: 'error',
          title: 'Donation not found',
          date: formatDate(new Date(), timezone, { month: 'short', day: 'numeric' }),
          timeAgo: 'Today',
          description: 'The requested donation could not be found.',
          category: 'Error',
          status: 'error',
        },
      ],
    };
  }

  const items: {
    id: string;
    title: string;
    date: string;
    timeAgo: string;
    description: string;
    category: string;
    status: string;
  }[] = [];

  // Created event
  if (donation.created_at) {
    const createdDate = new Date(donation.created_at);
    items.push({
      id: 'created',
      title: 'Donation initiated',
      date: formatDate(createdDate, timezone, { month: 'short', day: 'numeric' }),
      timeAgo: getTimeAgo(createdDate),
      description: 'Donor started the donation process.',
      category: 'Created',
      status: 'completed',
    });
  }

  // Payment pending
  if (donation.status === 'pending') {
    items.push({
      id: 'pending',
      title: 'Awaiting payment',
      date: formatDate(new Date(), timezone, { month: 'short', day: 'numeric' }),
      timeAgo: 'Now',
      description: 'Payment is being processed by payment gateway.',
      category: 'Pending',
      status: 'pending',
    });
  }

  // Paid event
  if (donation.paid_at) {
    const paidDate = new Date(donation.paid_at);
    items.push({
      id: 'paid',
      title: 'Payment completed',
      date: formatDate(paidDate, timezone, { month: 'short', day: 'numeric' }),
      timeAgo: getTimeAgo(paidDate),
      description: 'Payment was successfully processed.',
      category: 'Completed',
      status: 'completed',
    });
  }

  // Failed event
  if (donation.status === 'failed') {
    items.push({
      id: 'failed',
      title: 'Payment failed',
      date: formatDate(new Date(donation.updated_at || donation.created_at || new Date()), timezone, { month: 'short', day: 'numeric' }),
      timeAgo: getTimeAgo(new Date(donation.updated_at || donation.created_at || new Date())),
      description: 'The payment could not be processed.',
      category: 'Failed',
      status: 'error',
    });
  }

  // Refunded event
  if (donation.refunded_at) {
    const refundedDate = new Date(donation.refunded_at);
    items.push({
      id: 'refunded',
      title: 'Refund issued',
      date: formatDate(refundedDate, timezone, { month: 'short', day: 'numeric' }),
      timeAgo: getTimeAgo(refundedDate),
      description: donation.refund_reason || 'Donation was refunded.',
      category: 'Refunded',
      status: 'completed',
    });
  }

  // Expired event
  if (donation.status === 'expired') {
    items.push({
      id: 'expired',
      title: 'Payment expired',
      date: formatDate(new Date(donation.updated_at || donation.created_at || new Date()), timezone, { month: 'short', day: 'numeric' }),
      timeAgo: getTimeAgo(new Date(donation.updated_at || donation.created_at || new Date())),
      description: 'The payment link expired before completion.',
      category: 'Expired',
      status: 'error',
    });
  }

  // Sort by most recent first
  items.reverse();

  return { items };
};

/**
 * Helper to get relative time ago string
 */
function getTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
  return `${Math.floor(diffDays / 365)} years ago`;
}

// ==================== ACTION HANDLERS ====================

const refundDonation: ServiceDataSourceHandler = async (request) => {
  const params = request.params as Record<string, unknown>;
  const donationId = (params.donationId ?? params.id) as string;
  const reason = (params.reason ?? 'Refund requested by admin') as string;

  console.log('[refundDonation] Processing refund for donation:', donationId);

  if (!donationId) {
    return {
      success: false,
      message: 'Donation ID is required',
    };
  }

  try {
    const tenantService = container.get<TenantService>(TYPES.TenantService);
    const donationService = container.get<DonationService>(TYPES.DonationService);

    const tenant = await tenantService.getCurrentTenant();
    if (!tenant) {
      return {
        success: false,
        message: 'No tenant context available',
      };
    }

    // Process refund via donation service (handles Xendit refund API)
    await donationService.processRefund(donationId, tenant.id, reason);

    console.log('[refundDonation] Refund processed successfully:', donationId);

    return {
      success: true,
      message: 'Refund initiated successfully',
      redirectUrl: '/admin/finance/donations',
      toast: {
        type: 'success',
        title: 'Refund processed',
        description: 'The donation has been refunded.',
      },
    };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to process refund';
    console.error('[refundDonation] Failed:', error);

    return {
      success: false,
      message: errorMessage,
      toast: {
        type: 'error',
        title: 'Refund failed',
        description: errorMessage,
      },
    };
  }
};

// Export all handlers
export const adminFinanceDonationsHandlers: Record<string, ServiceDataSourceHandler> = {
  // List page handlers
  'admin-finance.donations.list.hero': resolveDonationsListHero,
  'admin-finance.donations.list.summary': resolveDonationsListSummary,
  'admin-finance.donations.list.statusOverview': resolveDonationsListStatusOverview,
  'admin-finance.donations.list.table': resolveDonationsListTable,
  // Profile page handlers
  'admin-finance.donations.profile.header': resolveDonationProfileHeader,
  'admin-finance.donations.profile.details': resolveDonationProfileDetails,
  'admin-finance.donations.profile.timeline': resolveDonationProfileTimeline,
  // Action handlers
  'admin-finance.donations.refund': refundDonation,
};
