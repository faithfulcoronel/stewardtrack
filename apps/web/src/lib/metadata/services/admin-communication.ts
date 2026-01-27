/**
 * Communication Module Service Handlers
 *
 * Provides data for the Communication module metadata-driven pages.
 * Includes dashboard, campaigns, and templates handlers.
 */

import { container } from '@/lib/container';
import { TYPES } from '@/lib/types';
import type { CampaignService } from '@/services/communication/CampaignService';
import type { TemplateService } from '@/services/communication/TemplateService';
import type { RecipientService } from '@/services/communication/RecipientService';
import type { TenantService } from '@/services/TenantService';
import { getTenantTimezone, formatDate, formatRelativeTime } from './datetime-utils';
import { getCurrentUserId } from '@/lib/server/context';
import { PermissionGate } from '@/lib/access-gate';

import type { ServiceDataSourceHandler, ServiceDataSourceRequest } from './types';

// Handler IDs for dashboard components
const DASHBOARD_HERO_HANDLER_ID = 'admin-communication.dashboard.hero';
const DASHBOARD_METRICS_HANDLER_ID = 'admin-communication.dashboard.metrics';
const DASHBOARD_QUICK_LINKS_HANDLER_ID = 'admin-communication.dashboard.quickLinks';
const DASHBOARD_ACTIVITY_HANDLER_ID = 'admin-communication.dashboard.activity';

// Handler IDs for campaigns
const CAMPAIGNS_LIST_HERO_HANDLER_ID = 'admin-communication.campaigns.list.hero';
const CAMPAIGNS_LIST_TABLE_HANDLER_ID = 'admin-communication.campaigns.list.table';
const CAMPAIGN_PROFILE_HERO_HANDLER_ID = 'admin-communication.campaigns.profile.hero';
const CAMPAIGN_PROFILE_DETAILS_HANDLER_ID = 'admin-communication.campaigns.profile.details';
const CAMPAIGN_PROFILE_STATS_HANDLER_ID = 'admin-communication.campaigns.profile.stats';
const CAMPAIGN_PROFILE_RECIPIENTS_HANDLER_ID = 'admin-communication.campaigns.profile.recipients';

// Handler IDs for templates
const TEMPLATES_LIST_HERO_HANDLER_ID = 'admin-communication.templates.list.hero';
const TEMPLATES_LIST_TABLE_HANDLER_ID = 'admin-communication.templates.list.table';

/**
 * Get services from DI container
 */
function getCampaignService(): CampaignService {
  return container.get<CampaignService>(TYPES.CommCampaignService);
}

function getTemplateService(): TemplateService {
  return container.get<TemplateService>(TYPES.TemplateService);
}

function getTenantService(): TenantService {
  return container.get<TenantService>(TYPES.TenantService);
}

function getRecipientService(): RecipientService {
  return container.get<RecipientService>(TYPES.RecipientService);
}

// ============================================================================
// DASHBOARD HANDLERS
// ============================================================================

/**
 * Dashboard Hero Handler
 */
async function resolveDashboardHero(
  _request: ServiceDataSourceRequest
): Promise<{
  eyebrow: string;
  headline: string;
  description: string;
  metrics: Array<{ label: string; value: string; caption: string }>;
}> {
  const campaignService = getCampaignService();
  const tenantService = getTenantService();
  const tenant = await tenantService.getCurrentTenant();

  if (!tenant) {
    return {
      eyebrow: 'Communication',
      headline: 'Connect with your congregation',
      description: 'Send messages, create campaigns, and manage templates.',
      metrics: [],
    };
  }

  // Get campaign statistics
  const campaigns = await campaignService.getCampaigns(tenant.id);
  const sentCampaigns = campaigns.filter((c) => c.status === 'sent');
  const totalSent = sentCampaigns.reduce((sum, c) => sum + (c.sent_count || 0), 0);
  const totalDelivered = sentCampaigns.reduce((sum, c) => sum + (c.delivered_count || 0), 0);
  const deliveryRate = totalSent > 0 ? Math.round((totalDelivered / totalSent) * 100) : 0;
  const activeCampaigns = campaigns.filter(
    (c) => c.status === 'sending' || c.status === 'scheduled'
  ).length;

  return {
    eyebrow: 'Communication hub',
    headline: 'Engage your community with targeted messaging',
    description:
      'Create email and SMS campaigns, use templates, and track delivery across all channels.',
    metrics: [
      {
        label: 'Messages sent',
        value: totalSent.toLocaleString(),
        caption: 'Total messages delivered this month.',
      },
      {
        label: 'Delivery rate',
        value: `${deliveryRate}%`,
        caption: 'Messages successfully delivered.',
      },
      {
        label: 'Active campaigns',
        value: activeCampaigns.toString(),
        caption: 'Campaigns currently sending or scheduled.',
      },
    ],
  };
}

/**
 * Dashboard Metrics Handler
 */
async function resolveDashboardMetrics(
  _request: ServiceDataSourceRequest
): Promise<{
  items: Array<{
    id: string;
    label: string;
    value: string;
    change?: string;
    changeLabel?: string;
    trend: 'up' | 'down' | 'flat';
    tone: 'positive' | 'negative' | 'neutral' | 'informative';
    description: string;
  }>;
}> {
  const campaignService = getCampaignService();
  const templateService = getTemplateService();
  const tenantService = getTenantService();
  const tenant = await tenantService.getCurrentTenant();

  if (!tenant) {
    return { items: [] };
  }

  const campaigns = await campaignService.getCampaigns(tenant.id);
  const templates = await templateService.getTemplates(tenant.id);

  const sentCampaigns = campaigns.filter((c) => c.status === 'sent');
  const totalOpened = sentCampaigns.reduce((sum, c) => sum + (c.opened_count || 0), 0);
  const totalSent = sentCampaigns.reduce((sum, c) => sum + (c.sent_count || 0), 0);
  const openRate = totalSent > 0 ? Math.round((totalOpened / totalSent) * 100) : 0;

  const emailCampaigns = campaigns.filter((c) => c.channels?.includes('email')).length;
  const smsCampaigns = campaigns.filter((c) => c.channels?.includes('sms')).length;

  return {
    items: [
      {
        id: 'metric-campaigns',
        label: 'Total campaigns',
        value: campaigns.length.toString(),
        trend: 'flat',
        tone: 'informative',
        description: `${sentCampaigns.length} sent, ${campaigns.length - sentCampaigns.length} in progress.`,
      },
      {
        id: 'metric-open-rate',
        label: 'Open rate',
        value: `${openRate}%`,
        trend: openRate >= 20 ? 'up' : 'flat',
        tone: openRate >= 20 ? 'positive' : 'neutral',
        description: 'Average email open rate across campaigns.',
      },
      {
        id: 'metric-email',
        label: 'Email campaigns',
        value: emailCampaigns.toString(),
        trend: 'flat',
        tone: 'informative',
        description: 'Campaigns using email channel.',
      },
      {
        id: 'metric-sms',
        label: 'SMS campaigns',
        value: smsCampaigns.toString(),
        trend: 'flat',
        tone: 'informative',
        description: 'Campaigns using SMS channel.',
      },
      {
        id: 'metric-templates',
        label: 'Templates',
        value: templates.length.toString(),
        trend: 'flat',
        tone: 'neutral',
        description: 'Reusable message templates available.',
      },
    ],
  };
}

/**
 * Dashboard Quick Links Handler
 *
 * Quick links and actions are permission-gated:
 * - Compose message: Requires communication:manage permission
 * - View campaigns/templates: Always visible (requires communication:view at route level)
 */
async function resolveDashboardQuickLinks(
  _request: ServiceDataSourceRequest
): Promise<{
  items: Array<{
    id: string;
    title: string;
    description: string;
    href: string;
    icon: string;
    badge?: string;
  }>;
  actions: Array<{
    id: string;
    label: string;
    href: string;
    variant: 'primary' | 'secondary' | 'ghost';
  }>;
}> {
  const campaignService = getCampaignService();
  const tenantService = getTenantService();
  const tenant = await tenantService.getCurrentTenant();

  // Check user permissions for action visibility using PermissionGate
  const userId = await getCurrentUserId({ optional: true });

  let canManage = false;
  if (userId && tenant) {
    const manageResult = await new PermissionGate('communication:manage').check(userId, tenant.id);
    canManage = manageResult.allowed;
  }

  let draftCount = 0;
  if (tenant) {
    const campaigns = await campaignService.getCampaigns(tenant.id);
    draftCount = campaigns.filter((c) => c.status === 'draft').length;
  }

  // Build items array based on permissions
  const items: Array<{
    id: string;
    title: string;
    description: string;
    href: string;
    icon: string;
    badge?: string;
  }> = [];

  // Compose message link - requires manage permission
  if (canManage) {
    items.push({
      id: 'link-compose',
      title: 'Compose message',
      description: 'Create a new message or campaign.',
      href: '/admin/communication/compose',
      icon: 'pen-square',
    });
  }

  // View links - always visible
  items.push(
    {
      id: 'link-campaigns',
      title: 'View campaigns',
      description: 'Manage all your communication campaigns.',
      href: '/admin/communication/campaigns',
      icon: 'send',
      badge: draftCount > 0 ? `${draftCount} drafts` : undefined,
    },
    {
      id: 'link-templates',
      title: 'Message templates',
      description: 'Create and manage reusable templates.',
      href: '/admin/communication/templates',
      icon: 'file-text',
    }
  );

  // Build actions array based on permissions
  const actions: Array<{
    id: string;
    label: string;
    href: string;
    variant: 'primary' | 'secondary' | 'ghost';
  }> = [];

  if (canManage) {
    actions.push({
      id: 'action-compose',
      label: 'Compose message',
      href: '/admin/communication/compose',
      variant: 'primary',
    });
  }

  actions.push({
    id: 'action-campaigns',
    label: 'View all campaigns',
    href: '/admin/communication/campaigns',
    variant: canManage ? 'secondary' : 'primary',
  });

  return { items, actions };
}

/**
 * Dashboard Activity Handler
 */
async function resolveDashboardActivity(
  _request: ServiceDataSourceRequest
): Promise<{
  items: Array<{
    id: string;
    title: string;
    description: string;
    date: string;
    timeAgo: string;
    icon: string;
    status?: string;
    statusVariant?: string;
  }>;
}> {
  const campaignService = getCampaignService();
  const tenantService = getTenantService();
  const tenant = await tenantService.getCurrentTenant();
  const timezone = await getTenantTimezone();

  if (!tenant) {
    return { items: [] };
  }

  const campaigns = await campaignService.getCampaigns(tenant.id);

  // Get recent campaigns sorted by updated_at
  const recentCampaigns = campaigns
    .filter((c) => c.updated_at)
    .sort((a, b) => new Date(b.updated_at!).getTime() - new Date(a.updated_at!).getTime())
    .slice(0, 5);

  const items = recentCampaigns.map((campaign) => {
    const dateStr = campaign.sent_at || campaign.updated_at || campaign.created_at;
    const statusLabel = campaign.status?.replace(/_/g, ' ') || 'draft';
    const statusVariant =
      campaign.status === 'sent'
        ? 'success'
        : campaign.status === 'sending'
          ? 'info'
          : campaign.status === 'failed'
            ? 'critical'
            : 'neutral';

    let description = '';
    if (campaign.status === 'sent') {
      description = `Delivered to ${campaign.delivered_count || 0} of ${campaign.total_recipients || 0} recipients.`;
    } else if (campaign.status === 'sending') {
      description = `Sending to ${campaign.total_recipients || 0} recipients...`;
    } else if (campaign.status === 'scheduled') {
      description = `Scheduled for ${campaign.scheduled_at ? formatDate(new Date(campaign.scheduled_at), timezone) : 'later'}.`;
    } else {
      description = `${campaign.campaign_type || 'Campaign'} - ${campaign.channels?.join(', ') || 'email'}`;
    }

    return {
      id: campaign.id!,
      title: campaign.name || 'Untitled campaign',
      description,
      date: dateStr ? formatDate(new Date(dateStr), timezone) : '',
      timeAgo: dateStr ? formatRelativeTime(new Date(dateStr), timezone) : '',
      icon: campaign.channels?.includes('sms') ? 'message-square' : 'mail',
      status: statusLabel.charAt(0).toUpperCase() + statusLabel.slice(1),
      statusVariant,
    };
  });

  return { items };
}

// ============================================================================
// CAMPAIGNS LIST HANDLERS
// ============================================================================

/**
 * Campaigns List Hero Handler
 */
async function resolveCampaignsListHero(
  _request: ServiceDataSourceRequest
): Promise<{
  eyebrow: string;
  headline: string;
  description: string;
  metrics: Array<{ label: string; value: string; caption: string }>;
}> {
  const campaignService = getCampaignService();
  const tenantService = getTenantService();
  const tenant = await tenantService.getCurrentTenant();

  if (!tenant) {
    return {
      eyebrow: 'Campaigns',
      headline: 'Manage your campaigns',
      description: 'Create, schedule, and track your communication campaigns.',
      metrics: [],
    };
  }

  const campaigns = await campaignService.getCampaigns(tenant.id);
  const sentCampaigns = campaigns.filter((c) => c.status === 'sent');
  const draftCampaigns = campaigns.filter((c) => c.status === 'draft');
  const scheduledCampaigns = campaigns.filter((c) => c.status === 'scheduled');

  return {
    eyebrow: 'Communication campaigns',
    headline: 'Reach your congregation with targeted messages',
    description: 'Create email and SMS campaigns to engage members, announce events, and share updates.',
    metrics: [
      {
        label: 'Total campaigns',
        value: campaigns.length.toString(),
        caption: 'All-time campaigns created.',
      },
      {
        label: 'Sent',
        value: sentCampaigns.length.toString(),
        caption: 'Campaigns successfully delivered.',
      },
      {
        label: 'Drafts',
        value: draftCampaigns.length.toString(),
        caption: 'Campaigns in progress.',
      },
      {
        label: 'Scheduled',
        value: scheduledCampaigns.length.toString(),
        caption: 'Campaigns waiting to send.',
      },
    ],
  };
}

/**
 * Campaigns List Table Handler
 *
 * Actions are permission-gated:
 * - View: Always visible (requires communication:view at route level)
 * - Edit: Requires communication:manage permission
 * - Duplicate: Requires communication:manage permission
 * - Delete: Requires communication:delete permission
 */
async function resolveCampaignsListTable(
  _request: ServiceDataSourceRequest
): Promise<{
  rows: Array<Record<string, unknown>>;
  columns: Array<Record<string, unknown>>;
  filters: Array<Record<string, unknown>>;
  actions: Array<Record<string, unknown>>;
  emptyState: Record<string, unknown>;
}> {
  const campaignService = getCampaignService();
  const tenantService = getTenantService();
  const tenant = await tenantService.getCurrentTenant();
  const timezone = await getTenantTimezone();

  const rows: Array<Record<string, unknown>> = [];

  // Check user permissions for action visibility using PermissionGate
  const userId = await getCurrentUserId({ optional: true });

  let canManage = false;
  let canDelete = false;

  if (userId && tenant) {
    const [manageResult, deleteResult] = await Promise.all([
      new PermissionGate('communication:manage').check(userId, tenant.id),
      new PermissionGate('communication:delete').check(userId, tenant.id),
    ]);
    canManage = manageResult.allowed;
    canDelete = deleteResult.allowed;
  }

  if (tenant) {
    const campaigns = await campaignService.getCampaigns(tenant.id);

    for (const campaign of campaigns) {
      const statusLabel = campaign.status?.replace(/_/g, ' ') || 'draft';
      const statusVariant =
        campaign.status === 'sent'
          ? 'success'
          : campaign.status === 'sending'
            ? 'info'
            : campaign.status === 'failed'
              ? 'critical'
              : campaign.status === 'scheduled'
                ? 'warning'
                : 'neutral';

      rows.push({
        id: campaign.id,
        name: campaign.name || 'Untitled campaign',
        type: campaign.campaign_type || 'bulk',
        status: statusLabel.charAt(0).toUpperCase() + statusLabel.slice(1),
        statusVariant,
        channels: campaign.channels?.join(', ') || 'email',
        recipients: campaign.total_recipients || 0,
        sent: campaign.sent_count || 0,
        opened: campaign.opened_count || 0,
        createdAt: campaign.created_at
          ? formatDate(new Date(campaign.created_at), timezone)
          : '',
        rawCreatedAt: campaign.created_at || '',
      });
    }
  }

  // Build actions array based on permissions
  const actions: Array<Record<string, unknown>> = [
    { id: 'view', label: 'View', href: '/admin/communication/campaigns/{{id}}' },
  ];

  if (canManage) {
    actions.push({ id: 'edit', label: 'Edit', href: '/admin/communication/compose?id={{id}}' });
    actions.push({ id: 'duplicate', label: 'Duplicate', href: '/admin/communication/compose?duplicate={{id}}' });
  }

  if (canDelete) {
    actions.push({ id: 'delete', label: 'Delete', action: 'delete', variant: 'destructive' });
  }

  return {
    rows,
    columns: [
      { field: 'name', headerName: 'Campaign', type: 'text', flex: 1.5 },
      { field: 'type', headerName: 'Type', type: 'text', flex: 0.7 },
      { field: 'status', headerName: 'Status', type: 'badge', flex: 0.8, badgeVariantField: 'statusVariant' },
      { field: 'channels', headerName: 'Channels', type: 'text', flex: 0.7 },
      { field: 'recipients', headerName: 'Recipients', type: 'number', flex: 0.7 },
      { field: 'sent', headerName: 'Sent', type: 'number', flex: 0.6 },
      { field: 'opened', headerName: 'Opened', type: 'number', flex: 0.6 },
      { field: 'createdAt', headerName: 'Created', type: 'text', flex: 0.8 },
    ],
    filters: [
      {
        id: 'status',
        type: 'select',
        field: 'status',
        placeholder: 'All statuses',
        options: [
          { label: 'All statuses', value: 'all' },
          { label: 'Draft', value: 'Draft' },
          { label: 'Scheduled', value: 'Scheduled' },
          { label: 'Sending', value: 'Sending' },
          { label: 'Sent', value: 'Sent' },
          { label: 'Failed', value: 'Failed' },
        ],
      },
      {
        id: 'channel',
        type: 'select',
        field: 'channels',
        placeholder: 'All channels',
        options: [
          { label: 'All channels', value: 'all' },
          { label: 'Email', value: 'email' },
          { label: 'SMS', value: 'sms' },
        ],
      },
      {
        id: 'dateRange',
        type: 'daterange',
        field: 'rawCreatedAt',
        placeholder: 'Filter by date',
      },
    ],
    actions,
    emptyState: {
      title: 'No campaigns yet',
      description: 'Create your first communication campaign to reach your congregation.',
      action: {
        label: 'Create campaign',
        href: '/admin/communication/compose',
      },
    },
  };
}

// ============================================================================
// CAMPAIGN PROFILE HANDLERS
// ============================================================================

/**
 * Campaign Profile Hero Handler
 */
async function resolveCampaignProfileHero(
  request: ServiceDataSourceRequest
): Promise<{
  eyebrow: string;
  headline: string;
  description: string;
  metrics: Array<{ label: string; value: string; caption: string }>;
}> {
  const campaignId = request.params?.campaignId as string;
  const campaignService = getCampaignService();
  const tenantService = getTenantService();
  const tenant = await tenantService.getCurrentTenant();

  if (!tenant || !campaignId) {
    return {
      eyebrow: 'Campaign',
      headline: 'Campaign not found',
      description: 'The requested campaign could not be found.',
      metrics: [],
    };
  }

  const campaign = await campaignService.getCampaignById(campaignId, tenant.id);

  if (!campaign) {
    return {
      eyebrow: 'Campaign',
      headline: 'Campaign not found',
      description: 'The requested campaign could not be found.',
      metrics: [],
    };
  }

  const deliveryRate =
    campaign.sent_count && campaign.sent_count > 0
      ? Math.round(((campaign.delivered_count || 0) / campaign.sent_count) * 100)
      : 0;

  const openRate =
    campaign.delivered_count && campaign.delivered_count > 0
      ? Math.round(((campaign.opened_count || 0) / campaign.delivered_count) * 100)
      : 0;

  return {
    eyebrow: campaign.campaign_type?.replace(/_/g, ' ') || 'Campaign',
    headline: campaign.name || 'Untitled campaign',
    description: campaign.description || 'No description provided.',
    metrics: [
      {
        label: 'Total recipients',
        value: (campaign.total_recipients || 0).toString(),
        caption: 'People targeted by this campaign.',
      },
      {
        label: 'Delivery rate',
        value: `${deliveryRate}%`,
        caption: `${campaign.delivered_count || 0} messages delivered.`,
      },
      {
        label: 'Open rate',
        value: `${openRate}%`,
        caption: `${campaign.opened_count || 0} messages opened.`,
      },
    ],
  };
}

/**
 * Campaign Profile Details Handler
 */
async function resolveCampaignProfileDetails(
  request: ServiceDataSourceRequest
): Promise<{
  panels: Array<Record<string, unknown>>;
}> {
  const campaignId = request.params?.campaignId as string;
  const campaignService = getCampaignService();
  const tenantService = getTenantService();
  const tenant = await tenantService.getCurrentTenant();
  const timezone = await getTenantTimezone();

  if (!tenant || !campaignId) {
    return { panels: [] };
  }

  const campaign = await campaignService.getCampaignById(campaignId, tenant.id);

  if (!campaign) {
    return { panels: [] };
  }

  return {
    panels: [
      {
        id: 'message-content',
        title: 'Message content',
        items: [
          { label: 'Subject', value: campaign.subject || '—' },
          { label: 'Content', value: campaign.content_text || campaign.content_html || '—', type: 'text' },
        ],
      },
      {
        id: 'campaign-settings',
        title: 'Campaign settings',
        items: [
          { label: 'Type', value: campaign.campaign_type?.replace(/_/g, ' ') || 'Bulk' },
          { label: 'Channels', value: campaign.channels?.join(', ') || 'Email' },
          { label: 'Status', value: campaign.status?.replace(/_/g, ' ') || 'Draft' },
          {
            label: 'Scheduled for',
            value: campaign.scheduled_at
              ? formatDate(new Date(campaign.scheduled_at), timezone)
              : '—',
          },
          {
            label: 'Sent at',
            value: campaign.sent_at ? formatDate(new Date(campaign.sent_at), timezone) : '—',
          },
        ],
      },
    ],
  };
}

/**
 * Campaign Profile Stats Handler
 */
async function resolveCampaignProfileStats(
  request: ServiceDataSourceRequest
): Promise<{
  metrics: Array<{
    id: string;
    label: string;
    value: string;
    trend: 'up' | 'down' | 'flat';
    tone: 'positive' | 'negative' | 'neutral' | 'informative';
    description: string;
  }>;
  footnote: string;
}> {
  const campaignId = request.params?.campaignId as string;
  const campaignService = getCampaignService();
  const tenantService = getTenantService();
  const tenant = await tenantService.getCurrentTenant();
  const timezone = await getTenantTimezone();

  if (!tenant || !campaignId) {
    return { metrics: [], footnote: '' };
  }

  const campaign = await campaignService.getCampaignById(campaignId, tenant.id);

  if (!campaign) {
    return { metrics: [], footnote: '' };
  }

  const sent = campaign.sent_count || 0;
  const delivered = campaign.delivered_count || 0;
  const failed = campaign.failed_count || 0;
  const opened = campaign.opened_count || 0;
  const clicked = campaign.clicked_count || 0;

  return {
    metrics: [
      {
        id: 'stat-sent',
        label: 'Sent',
        value: sent.toString(),
        trend: 'flat',
        tone: 'informative',
        description: 'Total messages sent.',
      },
      {
        id: 'stat-delivered',
        label: 'Delivered',
        value: delivered.toString(),
        trend: delivered > 0 ? 'up' : 'flat',
        tone: delivered > 0 ? 'positive' : 'neutral',
        description: 'Successfully delivered to inbox.',
      },
      {
        id: 'stat-failed',
        label: 'Failed',
        value: failed.toString(),
        trend: failed > 0 ? 'down' : 'flat',
        tone: failed > 0 ? 'negative' : 'neutral',
        description: 'Failed to deliver.',
      },
      {
        id: 'stat-opened',
        label: 'Opened',
        value: opened.toString(),
        trend: opened > 0 ? 'up' : 'flat',
        tone: opened > 0 ? 'positive' : 'neutral',
        description: 'Messages opened by recipients.',
      },
      {
        id: 'stat-clicked',
        label: 'Clicked',
        value: clicked.toString(),
        trend: clicked > 0 ? 'up' : 'flat',
        tone: clicked > 0 ? 'positive' : 'neutral',
        description: 'Links clicked in messages.',
      },
    ],
    footnote: campaign.updated_at
      ? `Last updated ${formatDate(new Date(campaign.updated_at), timezone)}`
      : 'Statistics updated in real-time.',
  };
}

/**
 * Campaign Profile Recipients Handler
 */
async function resolveCampaignProfileRecipients(
  request: ServiceDataSourceRequest
): Promise<{
  rows: Array<Record<string, unknown>>;
  columns: Array<Record<string, unknown>>;
  filters: Array<Record<string, unknown>>;
  emptyState: Record<string, unknown>;
}> {
  const campaignId = request.params?.campaignId as string;
  const recipientService = getRecipientService();
  const tenantService = getTenantService();
  const tenant = await tenantService.getCurrentTenant();
  const timezone = await getTenantTimezone();

  const rows: Array<Record<string, unknown>> = [];

  if (tenant && campaignId) {
    try {
      const recipients = await recipientService.getRecipientsByCampaign(campaignId, tenant.id);

      for (const recipient of recipients) {
        const statusLabel = recipient.status?.replace(/_/g, ' ') || 'pending';
        const statusVariant =
          recipient.status === 'delivered' || recipient.status === 'opened' || recipient.status === 'clicked'
            ? 'success'
            : recipient.status === 'sent'
              ? 'info'
              : recipient.status === 'failed' || recipient.status === 'bounced'
                ? 'critical'
                : 'neutral';

        rows.push({
          id: recipient.id,
          name: recipient.personalization_data?.full_name ||
                recipient.personalization_data?.first_name ||
                'Unknown',
          email: recipient.email || '—',
          phone: recipient.phone || '—',
          status: statusLabel.charAt(0).toUpperCase() + statusLabel.slice(1),
          statusVariant,
          deliveredAt: recipient.delivered_at
            ? formatDate(new Date(recipient.delivered_at), timezone)
            : '—',
          openedAt: recipient.opened_at
            ? formatDate(new Date(recipient.opened_at), timezone)
            : '—',
          clickedAt: recipient.clicked_at
            ? formatDate(new Date(recipient.clicked_at), timezone)
            : '—',
          channel: recipient.channel || 'email',
          error: recipient.error_message || undefined,
        });
      }
    } catch (error) {
      console.error('[Campaign Recipients] Error fetching recipients:', error);
    }
  }

  return {
    rows,
    columns: [
      { field: 'name', headerName: 'Recipient', type: 'text', flex: 1 },
      { field: 'email', headerName: 'Email', type: 'text', flex: 1 },
      { field: 'channel', headerName: 'Channel', type: 'text', flex: 0.5 },
      { field: 'status', headerName: 'Status', type: 'badge', flex: 0.8, badgeVariantField: 'statusVariant' },
      { field: 'deliveredAt', headerName: 'Delivered', type: 'text', flex: 0.8 },
      { field: 'openedAt', headerName: 'Opened', type: 'text', flex: 0.8 },
    ],
    filters: [
      {
        id: 'status',
        type: 'select',
        field: 'status',
        placeholder: 'All statuses',
        options: [
          { label: 'All statuses', value: 'all' },
          { label: 'Pending', value: 'Pending' },
          { label: 'Sent', value: 'Sent' },
          { label: 'Delivered', value: 'Delivered' },
          { label: 'Opened', value: 'Opened' },
          { label: 'Clicked', value: 'Clicked' },
          { label: 'Failed', value: 'Failed' },
          { label: 'Bounced', value: 'Bounced' },
        ],
      },
      {
        id: 'channel',
        type: 'select',
        field: 'channel',
        placeholder: 'All channels',
        options: [
          { label: 'All channels', value: 'all' },
          { label: 'Email', value: 'email' },
          { label: 'SMS', value: 'sms' },
        ],
      },
    ],
    emptyState: {
      title: 'No recipients yet',
      description: rows.length === 0
        ? 'This campaign has no recipients. Add recipients to start sending.'
        : 'No recipients match your filter criteria.',
    },
  };
}

// ============================================================================
// TEMPLATES LIST HANDLERS
// ============================================================================

/**
 * Templates List Hero Handler
 */
async function resolveTemplatesListHero(
  _request: ServiceDataSourceRequest
): Promise<{
  eyebrow: string;
  headline: string;
  description: string;
  metrics: Array<{ label: string; value: string; caption: string }>;
}> {
  const templateService = getTemplateService();
  const tenantService = getTenantService();
  const tenant = await tenantService.getCurrentTenant();

  if (!tenant) {
    return {
      eyebrow: 'Templates',
      headline: 'Message templates',
      description: 'Create and manage reusable message templates.',
      metrics: [],
    };
  }

  const templates = await templateService.getTemplates(tenant.id);
  const emailTemplates = templates.filter((t) => t.channels?.includes('email')).length;
  const smsTemplates = templates.filter((t) => t.channels?.includes('sms')).length;
  const aiGeneratedTemplates = templates.filter((t) => t.is_ai_generated).length;

  return {
    eyebrow: 'Message templates',
    headline: 'Reusable templates for consistent communication',
    description: 'Create templates for common messages like welcome emails, event announcements, and prayer requests.',
    metrics: [
      {
        label: 'Total templates',
        value: templates.length.toString(),
        caption: 'Templates available to use.',
      },
      {
        label: 'Email',
        value: emailTemplates.toString(),
        caption: 'Email-ready templates.',
      },
      {
        label: 'SMS',
        value: smsTemplates.toString(),
        caption: 'SMS-ready templates.',
      },
      {
        label: 'AI generated',
        value: aiGeneratedTemplates.toString(),
        caption: 'Templates created with AI.',
      },
    ],
  };
}

/**
 * Templates List Table Handler
 *
 * Actions are permission-gated:
 * - View: Always visible (requires communication:view at route level)
 * - Edit: Requires communication:manage permission
 * - Use in campaign: Requires communication:manage permission
 * - Duplicate: Requires communication:manage permission
 * - Delete: Requires communication:delete permission
 */
async function resolveTemplatesListTable(
  _request: ServiceDataSourceRequest
): Promise<{
  rows: Array<Record<string, unknown>>;
  columns: Array<Record<string, unknown>>;
  filters: Array<Record<string, unknown>>;
  actions: Array<Record<string, unknown>>;
  emptyState: Record<string, unknown>;
}> {
  const templateService = getTemplateService();
  const tenantService = getTenantService();
  const tenant = await tenantService.getCurrentTenant();
  const timezone = await getTenantTimezone();

  const rows: Array<Record<string, unknown>> = [];

  // Check user permissions for action visibility using PermissionGate
  const userId = await getCurrentUserId({ optional: true });

  let canManage = false;
  let canDelete = false;

  if (userId && tenant) {
    const [manageResult, deleteResult] = await Promise.all([
      new PermissionGate('communication:manage').check(userId, tenant.id),
      new PermissionGate('communication:delete').check(userId, tenant.id),
    ]);
    canManage = manageResult.allowed;
    canDelete = deleteResult.allowed;
  }

  if (tenant) {
    const templates = await templateService.getTemplates(tenant.id);

    for (const template of templates) {
      const categoryLabel = template.category?.replace(/_/g, ' ') || 'custom';

      rows.push({
        id: template.id,
        name: template.name || 'Untitled template',
        category: categoryLabel.charAt(0).toUpperCase() + categoryLabel.slice(1),
        channels: template.channels?.join(', ') || 'email',
        usageCount: template.usage_count || 0,
        isAiGenerated: template.is_ai_generated ? 'Yes' : 'No',
        createdAt: template.created_at
          ? formatDate(new Date(template.created_at), timezone)
          : '',
        rawCreatedAt: template.created_at || '',
      });
    }
  }

  // Build actions array based on permissions
  const actions: Array<Record<string, unknown>> = [
    { id: 'view', label: 'View', href: '/admin/communication/templates/{{id}}' },
  ];

  if (canManage) {
    actions.push({ id: 'edit', label: 'Edit', href: '/admin/communication/templates/{{id}}/edit' });
    actions.push({ id: 'use', label: 'Use in campaign', href: '/admin/communication/compose?template={{id}}' });
    actions.push({ id: 'duplicate', label: 'Duplicate', action: 'duplicate' });
  }

  if (canDelete) {
    actions.push({ id: 'delete', label: 'Delete', action: 'delete', variant: 'destructive' });
  }

  return {
    rows,
    columns: [
      { field: 'name', headerName: 'Template', type: 'text', flex: 1.5 },
      { field: 'category', headerName: 'Category', type: 'text', flex: 0.8 },
      { field: 'channels', headerName: 'Channels', type: 'text', flex: 0.7 },
      { field: 'usageCount', headerName: 'Uses', type: 'number', flex: 0.5 },
      { field: 'isAiGenerated', headerName: 'AI', type: 'text', flex: 0.4 },
      { field: 'createdAt', headerName: 'Created', type: 'text', flex: 0.8 },
    ],
    filters: [
      {
        id: 'category',
        type: 'select',
        field: 'category',
        placeholder: 'All categories',
        options: [
          { label: 'All categories', value: 'all' },
          { label: 'Welcome', value: 'Welcome' },
          { label: 'Event', value: 'Event' },
          { label: 'Newsletter', value: 'Newsletter' },
          { label: 'Prayer', value: 'Prayer' },
          { label: 'Announcement', value: 'Announcement' },
          { label: 'Follow-up', value: 'Follow-up' },
          { label: 'Birthday', value: 'Birthday' },
          { label: 'Anniversary', value: 'Anniversary' },
          { label: 'Custom', value: 'Custom' },
        ],
      },
      {
        id: 'channel',
        type: 'select',
        field: 'channels',
        placeholder: 'All channels',
        options: [
          { label: 'All channels', value: 'all' },
          { label: 'Email', value: 'email' },
          { label: 'SMS', value: 'sms' },
        ],
      },
    ],
    actions,
    emptyState: {
      title: 'No templates yet',
      description: 'Create your first message template to speed up campaign creation.',
      action: {
        label: 'Create template',
        href: '/admin/communication/templates/new',
      },
    },
  };
}

// ============================================================================
// CAMPAIGN MANAGE (COMPOSE) HANDLERS
// ============================================================================

// Handler IDs for campaign compose/manage
const CAMPAIGN_MANAGE_HEADER_HANDLER_ID = 'admin-communication.campaigns.manage.header';
const CAMPAIGN_MANAGE_FORM_HANDLER_ID = 'admin-communication.campaigns.manage.form';
const CAMPAIGN_SAVE_HANDLER_ID = 'admin-communication.campaigns.save';
const CAMPAIGN_SEND_HANDLER_ID = 'admin-communication.campaigns.send';

/**
 * Campaign Manage Header Handler
 */
async function resolveCampaignManageHeader(
  request: ServiceDataSourceRequest
): Promise<{
  eyebrow: string;
  headline: string;
  description: string;
}> {
  const campaignId = request.params?.id as string;
  const duplicateId = request.params?.duplicate as string;
  const templateId = request.params?.template as string;

  if (duplicateId) {
    return {
      eyebrow: 'Duplicate campaign',
      headline: 'Create a copy of an existing campaign',
      description: 'Modify the duplicated campaign as needed before sending.',
    };
  }

  if (campaignId) {
    return {
      eyebrow: 'Edit campaign',
      headline: 'Update your campaign',
      description: 'Make changes to your campaign content, recipients, or schedule.',
    };
  }

  if (templateId) {
    return {
      eyebrow: 'New from template',
      headline: 'Create campaign from template',
      description: 'Customize the template content for your campaign.',
    };
  }

  return {
    eyebrow: 'New campaign',
    headline: 'Compose your message',
    description: 'Create an email or SMS campaign to reach your congregation.',
  };
}

/**
 * Campaign Manage Form Handler
 */
async function resolveCampaignManageForm(
  request: ServiceDataSourceRequest
): Promise<{
  campaign: Record<string, unknown> | null;
  templates: Array<Record<string, unknown>>;
  recipientSources: Array<Record<string, unknown>>;
  aiEnabled: boolean;
}> {
  const campaignId = request.params?.id as string;
  const duplicateId = request.params?.duplicate as string;
  const templateId = request.params?.template as string;

  const campaignService = getCampaignService();
  const templateService = getTemplateService();
  const tenantService = getTenantService();
  const tenant = await tenantService.getCurrentTenant();

  if (!tenant) {
    return {
      campaign: null,
      templates: [],
      recipientSources: [],
      aiEnabled: false,
    };
  }

  // Load existing campaign if editing
  let campaign: Record<string, unknown> | null = null;
  if (campaignId) {
    const existingCampaign = await campaignService.getCampaignById(campaignId, tenant.id);
    if (existingCampaign) {
      campaign = {
        id: existingCampaign.id,
        name: existingCampaign.name,
        description: existingCampaign.description,
        campaign_type: existingCampaign.campaign_type,
        channels: existingCampaign.channels,
        subject: existingCampaign.subject,
        content_html: existingCampaign.content_html,
        content_text: existingCampaign.content_text,
        template_id: existingCampaign.template_id,
        recipient_criteria: existingCampaign.recipient_criteria,
        scheduled_at: existingCampaign.scheduled_at,
        status: existingCampaign.status,
      };
    }
  } else if (duplicateId) {
    const sourceCampaign = await campaignService.getCampaignById(duplicateId, tenant.id);
    if (sourceCampaign) {
      campaign = {
        name: `${sourceCampaign.name} (Copy)`,
        description: sourceCampaign.description,
        campaign_type: sourceCampaign.campaign_type,
        channels: sourceCampaign.channels,
        subject: sourceCampaign.subject,
        content_html: sourceCampaign.content_html,
        content_text: sourceCampaign.content_text,
        template_id: sourceCampaign.template_id,
        recipient_criteria: sourceCampaign.recipient_criteria,
        status: 'draft',
      };
    }
  } else if (templateId) {
    const template = await templateService.getTemplateById(templateId, tenant.id);
    if (template) {
      campaign = {
        name: '',
        description: '',
        campaign_type: 'bulk',
        channels: template.channels,
        subject: template.subject,
        content_html: template.content_html,
        content_text: template.content_text,
        template_id: template.id,
        status: 'draft',
      };
    }
  }

  // Load available templates
  const allTemplates = await templateService.getTemplates(tenant.id);
  const templates = allTemplates.map((t) => ({
    id: t.id,
    name: t.name,
    category: t.category,
    channels: t.channels,
    subject: t.subject,
  }));

  // Define recipient sources
  const recipientSources = [
    {
      id: 'members',
      label: 'Members',
      description: 'Individual members from your membership database',
      icon: 'users',
    },
    {
      id: 'families',
      label: 'Families',
      description: 'Send to all family members in a household',
      icon: 'home',
    },
    {
      id: 'events',
      label: 'Event Attendees',
      description: 'Past or registered event attendees',
      icon: 'calendar',
    },
    {
      id: 'ministries',
      label: 'Ministry Groups',
      description: 'Members of ministry teams and small groups',
      icon: 'heart',
    },
    {
      id: 'custom',
      label: 'Custom List',
      description: 'Saved recipient lists or manual entry',
      icon: 'list',
    },
  ];

  // Check if AI features are enabled (based on tenant credits)
  // For now, always enable - credit check happens at usage time
  const aiEnabled = true;

  return {
    campaign,
    templates,
    recipientSources,
    aiEnabled,
  };
}

/**
 * Campaign Save Handler (Save as Draft)
 */
async function resolveCampaignSave(
  request: ServiceDataSourceRequest
): Promise<{
  success: boolean;
  message: string;
  redirectUrl?: string;
  campaignId?: string;
}> {
  const params = request.params as Record<string, unknown>;
  const values = (params.values ?? params) as Record<string, unknown>;

  const campaignService = getCampaignService();
  const tenantService = getTenantService();
  const tenant = await tenantService.getCurrentTenant();

  if (!tenant) {
    return {
      success: false,
      message: 'No tenant context available',
    };
  }

  const campaignId = values.id as string | undefined;
  const campaignData = {
    name: values.name as string,
    description: values.description as string | undefined,
    campaign_type: (values.campaign_type as string) || 'bulk',
    channels: (values.channels as string[]) || ['email'],
    subject: values.subject as string | undefined,
    content_html: values.content_html as string | undefined,
    content_text: values.content_text as string | undefined,
    template_id: values.template_id as string | undefined,
    recipient_criteria: values.recipient_criteria as Record<string, unknown> | undefined,
    scheduled_at: values.scheduled_at as string | undefined,
    status: 'draft' as const,
  };

  try {
    if (campaignId) {
      await campaignService.updateCampaign(campaignId, campaignData, tenant.id);
      return {
        success: true,
        message: 'Campaign saved as draft',
        redirectUrl: '/admin/communication/campaigns',
        campaignId,
      };
    } else {
      const newCampaign = await campaignService.createCampaign(campaignData, tenant.id);
      return {
        success: true,
        message: 'Campaign created as draft',
        redirectUrl: '/admin/communication/campaigns',
        campaignId: newCampaign.id,
      };
    }
  } catch (error) {
    console.error('[Campaign Save] Error:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to save campaign',
    };
  }
}

/**
 * Campaign Send Handler (Send Immediately)
 */
async function resolveCampaignSend(
  request: ServiceDataSourceRequest
): Promise<{
  success: boolean;
  message: string;
  redirectUrl?: string;
  campaignId?: string;
}> {
  const params = request.params as Record<string, unknown>;
  const values = (params.values ?? params) as Record<string, unknown>;

  const campaignService = getCampaignService();
  const tenantService = getTenantService();
  const tenant = await tenantService.getCurrentTenant();

  if (!tenant) {
    return {
      success: false,
      message: 'No tenant context available',
    };
  }

  const campaignId = values.id as string | undefined;
  const campaignData = {
    name: values.name as string,
    description: values.description as string | undefined,
    campaign_type: (values.campaign_type as string) || 'bulk',
    channels: (values.channels as string[]) || ['email'],
    subject: values.subject as string | undefined,
    content_html: values.content_html as string | undefined,
    content_text: values.content_text as string | undefined,
    template_id: values.template_id as string | undefined,
    recipient_criteria: values.recipient_criteria as Record<string, unknown> | undefined,
    status: 'sending' as const,
  };

  try {
    let savedCampaignId = campaignId;

    if (campaignId) {
      await campaignService.updateCampaign(campaignId, campaignData, tenant.id);
    } else {
      const newCampaign = await campaignService.createCampaign(campaignData, tenant.id);
      savedCampaignId = newCampaign.id;
    }

    // TODO: Trigger actual send via DeliveryService
    // For now, just mark as sending - actual delivery will be handled by a background job

    return {
      success: true,
      message: 'Campaign queued for sending',
      redirectUrl: '/admin/communication/campaigns',
      campaignId: savedCampaignId,
    };
  } catch (error) {
    console.error('[Campaign Send] Error:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to send campaign',
    };
  }
}

// ============================================================================
// EXPORT HANDLERS
// ============================================================================

export const adminCommunicationHandlers: Record<string, ServiceDataSourceHandler> = {
  // Dashboard handlers
  [DASHBOARD_HERO_HANDLER_ID]: resolveDashboardHero,
  [DASHBOARD_METRICS_HANDLER_ID]: resolveDashboardMetrics,
  [DASHBOARD_QUICK_LINKS_HANDLER_ID]: resolveDashboardQuickLinks,
  [DASHBOARD_ACTIVITY_HANDLER_ID]: resolveDashboardActivity,

  // Campaigns list handlers
  [CAMPAIGNS_LIST_HERO_HANDLER_ID]: resolveCampaignsListHero,
  [CAMPAIGNS_LIST_TABLE_HANDLER_ID]: resolveCampaignsListTable,

  // Campaign profile handlers
  [CAMPAIGN_PROFILE_HERO_HANDLER_ID]: resolveCampaignProfileHero,
  [CAMPAIGN_PROFILE_DETAILS_HANDLER_ID]: resolveCampaignProfileDetails,
  [CAMPAIGN_PROFILE_STATS_HANDLER_ID]: resolveCampaignProfileStats,
  [CAMPAIGN_PROFILE_RECIPIENTS_HANDLER_ID]: resolveCampaignProfileRecipients,

  // Campaign manage handlers
  [CAMPAIGN_MANAGE_HEADER_HANDLER_ID]: resolveCampaignManageHeader,
  [CAMPAIGN_MANAGE_FORM_HANDLER_ID]: resolveCampaignManageForm,
  [CAMPAIGN_SAVE_HANDLER_ID]: resolveCampaignSave,
  [CAMPAIGN_SEND_HANDLER_ID]: resolveCampaignSend,

  // Templates list handlers
  [TEMPLATES_LIST_HERO_HANDLER_ID]: resolveTemplatesListHero,
  [TEMPLATES_LIST_TABLE_HANDLER_ID]: resolveTemplatesListTable,
};
