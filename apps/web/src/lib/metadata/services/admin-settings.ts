import type { ServiceDataSourceHandler } from "./types";
import { container } from "@/lib/container";
import { TYPES } from "@/lib/types";
import type { TenantService } from "@/services/TenantService";
import type { SettingService } from "@/services/SettingService";
import type { AICreditService } from "@/services/AICreditService";
import type { AICreditPackageService } from "@/services/AICreditPackageService";
import type { AICreditPurchaseService } from "@/services/AICreditPurchaseService";
import type { AICreditTransactionRepository } from "@/repositories/aiCreditTransaction.repository";
import { TIMEZONE_OPTIONS, clearTimezoneCache, formatDate } from "./datetime-utils";

const SETTINGS_OVERVIEW_HANDLER_ID = "admin-settings.settings.overview";
const SETTINGS_SAVE_HANDLER_ID = "admin-settings.settings.overview.save";

// Asian currencies list
const ASIAN_CURRENCIES = [
  { label: "Philippine Peso (PHP)", value: "PHP" },
  { label: "Japanese Yen (JPY)", value: "JPY" },
  { label: "Chinese Yuan (CNY)", value: "CNY" },
  { label: "South Korean Won (KRW)", value: "KRW" },
  { label: "Indian Rupee (INR)", value: "INR" },
  { label: "Indonesian Rupiah (IDR)", value: "IDR" },
  { label: "Thai Baht (THB)", value: "THB" },
  { label: "Vietnamese Dong (VND)", value: "VND" },
  { label: "Malaysian Ringgit (MYR)", value: "MYR" },
  { label: "Singapore Dollar (SGD)", value: "SGD" },
  { label: "Hong Kong Dollar (HKD)", value: "HKD" },
  { label: "Taiwan Dollar (TWD)", value: "TWD" },
  { label: "Pakistani Rupee (PKR)", value: "PKR" },
  { label: "Bangladeshi Taka (BDT)", value: "BDT" },
  { label: "Sri Lankan Rupee (LKR)", value: "LKR" },
];

const resolveSettingsOverview: ServiceDataSourceHandler = async (_request) => {
  // Get real tenant data using service layer
  const tenantService = container.get<TenantService>(TYPES.TenantService);
  const settingService = container.get<SettingService>(TYPES.SettingService);
  const tenant = await tenantService.getCurrentTenant();

  if (!tenant) {
    throw new Error("No tenant context available");
  }

  const tenantId = tenant.id;
  const ministryName = tenant.name || "Church";
  const tenantEmail = tenant.email || "";
  const tenantPhone = tenant.contact_number || "";
  const tenantAddress = tenant.address || "";
  const tenantWebsite = tenant.website || "";
  const subscriptionTier = tenant.subscription_tier || "starter";
  const currency = tenant.currency || "PHP"; // Default currency from tenant
  const timezone = await settingService.getTenantTimezone() || "Asia/Manila"; // Default timezone

  // Check integration status from settings service
  const integrationSettings = await settingService.getIntegrationSettings();
  const twilioConfigured = integrationSettings.twilio.configured;
  const emailConfigured = integrationSettings.email.configured;
  const webhookConfigured = integrationSettings.webhook.configured;
  const integrationsConfiguredCount = (twilioConfigured ? 1 : 0) + (emailConfigured ? 1 : 0) + (webhookConfigured ? 1 : 0);

  // Format last updated date using tenant timezone
  const lastUpdated = tenant.updated_at
    ? formatDate(new Date(tenant.updated_at), timezone, { year: 'numeric', month: 'long', day: 'numeric' })
    : 'Not available';

  // Safe date formatting with fallbacks using tenant timezone
  const createdAt = tenant.created_at ? new Date(tenant.created_at) : new Date();
  const updatedAt = tenant.updated_at ? new Date(tenant.updated_at) : new Date();

  return {
    tenantId,
    // Tab configuration for AdminSettingsTabs
    tabs: [
      {
        id: 'general',
        label: 'General',
        icon: 'settings',
        description: 'Church profile and preferences',
      },
      {
        id: 'notifications',
        label: 'Notifications',
        icon: 'bell',
        description: 'Alert and communication settings',
      },
      {
        id: 'integrations',
        label: 'Integrations',
        icon: 'link',
        description: 'Email, SMS, and webhook providers',
        badge: integrationsConfiguredCount > 0 ? `${integrationsConfiguredCount}/3` : undefined,
      },
      {
        id: 'templates',
        label: 'Templates',
        icon: 'file-text',
        description: 'Notification message templates',
        badge: 'Enterprise',
      },
      {
        id: 'analytics',
        label: 'Analytics',
        icon: 'bar-chart-3',
        description: 'Notification delivery metrics',
        badge: 'Premium',
      },
      {
        id: 'scheduled',
        label: 'Scheduled',
        icon: 'calendar-clock',
        description: 'Future notification delivery',
        badge: 'Enterprise',
      },
      {
        id: 'ai-credits',
        label: 'AI Credits',
        icon: 'zap',
        description: 'Manage AI Assistant credits and usage',
      },
    ],
    aiCredits: await resolveAICreditsTab(tenant.id, currency, timezone),
    hero: {
      eyebrow: "StewardTrack Admin",
      headline: `Configure ${ministryName} Settings`,
      description:
        "Manage your church information, integrations, and global settings.",
      highlights: [
        "Update your church profile and contact information.",
        "Configure messaging and email integrations for communications.",
        "Set currency and regional preferences for your ministry.",
      ],
      metrics: [
        {
          label: "Subscription",
          value: subscriptionTier.charAt(0).toUpperCase() + subscriptionTier.slice(1),
          caption: `${tenant.subscription_status || 'Active'} • ${tenant.billing_cycle || 'monthly'} billing`,
        },
        {
          label: "Created",
          value: formatDate(createdAt, timezone, { month: 'short', year: 'numeric' }),
          caption: "Tenant established",
        },
        {
          label: "Last Updated",
          value: formatDate(updatedAt, timezone, { month: 'short', day: 'numeric' }),
          caption: "Settings modified",
        },
      ],
      primaryCta: null,
      secondaryCta: null,
    },
    summary: {
      panels: [
        {
          id: "tenant-profile",
          title: "Tenant Profile",
          description: "Your church information and contact details.",
          columns: 2,
          items: [
            { label: "Ministry Name", value: ministryName, type: "text" },
            { label: "Subdomain", value: tenant.subdomain, type: "text" },
            {
              label: "Contact Email",
              value: tenantEmail || "Not set",
              type: tenantEmail ? "link" : "text",
              ...(tenantEmail && { href: `mailto:${tenantEmail}` }),
            },
            {
              label: "Contact Number",
              value: tenantPhone || "Not set",
              type: "text",
            },
            {
              label: "Address",
              value: tenantAddress || "Not set",
              type: "multiline",
            },
            {
              label: "Website",
              value: tenantWebsite || "Not set",
              type: tenantWebsite ? "link" : "text",
              ...(tenantWebsite && { href: tenantWebsite }),
            },
            {
              label: "Last Updated",
              value: lastUpdated,
              type: "text",
            },
            {
              label: "Tenant ID",
              value: tenantId,
              type: "multiline",
            },
          ],
        },
        {
          id: "integrations",
          title: "Integrations",
          description: "Configure external services for messaging and communications.",
          columns: 2,
          badge: `${integrationsConfiguredCount} configured`,
          items: [
            {
              label: "Twilio (SMS)",
              value: twilioConfigured ? "Configured" : "Not configured",
              type: "badge",
              variant: twilioConfigured ? "success" : "default",
              description: "SMS and messaging capabilities",
            },
            {
              label: "Email Service",
              value: emailConfigured ? "Configured" : "Not configured",
              type: "badge",
              variant: emailConfigured ? "success" : "default",
              description: "Transactional and bulk email",
            },
            {
              label: "Webhook",
              value: webhookConfigured ? "Configured" : "Not configured",
              type: "badge",
              variant: webhookConfigured ? "success" : "default",
              description: "External system notifications",
            },
          ],
        },
      ],
    },
    notification: {
      title: "Notification Preferences",
      description: "Configure how and when you receive notifications from StewardTrack.",
    },
    integrations: {
      title: "Integration Settings",
      description: "Configure external services for messaging and email communications.",
    },
    form: {
      mode: "edit",
      title: "Update Global Settings",
      description: "Configure your church details and regional preferences.",
      submitLabel: "Save Settings",
      contextParams: { tenantId },
      footnote: "Changes will be applied immediately to your church management system.",
      initialValues: {
        ministryName,
        contactEmail: tenantEmail,
        contactNumber: tenantPhone,
        address: tenantAddress,
        website: tenantWebsite,
        currency,
        timezone,
        requireTwoFactor: false,
      },
      fields: [
        {
          name: "ministryName",
          label: "Ministry Name",
          type: "text",
          colSpan: "half",
          placeholder: "Your Church Name",
          helperText: "Displayed across member portal and communications.",
          required: true,
        },
        {
          name: "contactEmail",
          label: "Primary Contact Email",
          type: "email",
          colSpan: "half",
          placeholder: "admin@yourchurch.org",
          helperText: "Main email for church communications.",
          required: true,
        },
        {
          name: "contactNumber",
          label: "Contact Number",
          type: "tel",
          colSpan: "half",
          placeholder: "+63 912 345 6789",
          helperText: "Primary phone number for the church.",
        },
        {
          name: "address",
          label: "Church Address",
          type: "textarea",
          colSpan: "half",
          placeholder: "123 Main St, City, Province",
          helperText: "Physical address of your church.",
          rows: 3,
        },
        {
          name: "website",
          label: "Website URL",
          type: "text",
          colSpan: "half",
          placeholder: "https://www.yourchurch.org",
          helperText: "Your church website (optional).",
        },
        {
          name: "currency",
          label: "Currency",
          type: "select",
          colSpan: "half",
          required: true,
          helperText: "Default currency for financial transactions and reports.",
          options: {
            items: ASIAN_CURRENCIES,
          },
        },
        {
          name: "timezone",
          label: "Timezone",
          type: "select",
          colSpan: "half",
          required: true,
          helperText: "Default timezone for date and time displays.",
          options: {
            items: TIMEZONE_OPTIONS.map(tz => ({ label: tz.label, value: tz.value })),
          },
        },
        {
          name: "requireTwoFactor",
          label: "Enforce Two-Factor Login (SOON)",
          type: "toggle",
          colSpan: "half",
          helperText: "Two-factor authentication for admin users (coming soon).",
          disabled: true,
        },
      ],
    },
  };
};

const saveSettings: ServiceDataSourceHandler = async (request) => {
  const tenantService = container.get<TenantService>(TYPES.TenantService);
  const settingService = container.get<SettingService>(TYPES.SettingService);
  const tenant = await tenantService.getCurrentTenant();

  if (!tenant) {
    throw new Error("No tenant context available");
  }

  // Extract form data from params
  const params = request.params as any;

  // Update tenant with form data
  const updates: Record<string, any> = {
    name: params.ministryName as string,
    email: params.contactEmail as string,
    contact_number: params.contactNumber ? (params.contactNumber as string) : null,
    address: params.address ? (params.address as string) : null,
    website: params.website ? (params.website as string) : null,
    currency: params.currency ? (params.currency as string) : "PHP",
  };

  await tenantService.updateTenant(tenant.id, updates);

  // Save timezone to settings table and clear cache
  if (params.timezone) {
    await settingService.setTenantTimezone(params.timezone as string);
    await clearTimezoneCache();
  }

  return {
    success: true,
    message: "Settings saved successfully",
    tenantId: tenant.id,
  };
};

/**
 * Resolve AI Credits tab data
 */
const resolveAICreditsTab = async (tenantId: string, currency: string, timezone: string) => {
  try {
    const creditService = container.get<AICreditService>(TYPES.AICreditService);
    const packageService = container.get<AICreditPackageService>(TYPES.AICreditPackageService);
    const purchaseService = container.get<AICreditPurchaseService>(TYPES.AICreditPurchaseService);
    const transactionRepo = container.get<AICreditTransactionRepository>(TYPES.IAICreditTransactionRepository);

    // Fetch all data in parallel
    const [balance, packages, purchaseHistory, usageStats] = await Promise.all([
      creditService.getBalance(tenantId),
      packageService.getActivePackages(currency),
      purchaseService.getPurchaseHistory(tenantId, { limit: 10 }),
      transactionRepo.getUsageStatistics(tenantId, 30)
    ]);

    // Calculate usage percentage
    const usagePercentage = balance.total_credits > 0
      ? Math.round((balance.remaining_credits / balance.total_credits) * 100)
      : 0;

    return {
      balance: {
        total: balance.total_credits,
        used: balance.used_credits,
        remaining: balance.remaining_credits,
        percentage: usagePercentage,
        lowThreshold: balance.low_credit_threshold,
        isLow: balance.remaining_credits < balance.low_credit_threshold,
      },
      packages: packages.map(pkg => ({
        id: pkg.id,
        name: pkg.name,
        description: pkg.description,
        credits: pkg.credits,
        price: pkg.price,
        currency: pkg.currency,
        badge: pkg.badge,
        savings: pkg.savings,
        featured: pkg.featured,
        pricePerCredit: (pkg.price / pkg.credits).toFixed(4),
      })),
      purchaseHistory: purchaseHistory.map(p => {
        console.log('[AI Credits Tab] Processing purchase for UI:', {
          id: p.id,
          created_at: p.created_at,
          package_name: p.package_name,
          credits_purchased: p.credits_purchased,
          amount_paid: p.amount_paid,
          currency: p.currency,
          payment_status: p.payment_status,
        });

        const formattedDate = formatDate(new Date(p.created_at), timezone, {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });

        const result = {
          id: p.id,
          date: formattedDate,
          packageName: p.package_name,
          credits: p.credits_purchased,
          amount: p.amount_paid,
          currency: p.currency,
          status: p.payment_status,
          statusLabel: p.payment_status.charAt(0).toUpperCase() + p.payment_status.slice(1),
        };

        console.log('[AI Credits Tab] Formatted purchase for UI:', result);

        return result;
      }),
      usageStats: {
        totalConversations: usageStats.total_conversations,
        avgCreditsPerConversation: Math.round(usageStats.avg_credits_per_conversation * 10) / 10,
        totalInputTokens: usageStats.total_input_tokens,
        totalOutputTokens: usageStats.total_output_tokens,
        dailyUsage: usageStats.daily_usage?.map(day => ({
          date: formatDate(new Date(day.date), timezone, { month: 'short', day: 'numeric' }),
          credits: day.credits_used,
          conversations: day.conversations,
        })) || [],
      },
      autoRecharge: {
        enabled: balance.auto_recharge_enabled,
        packageId: balance.auto_recharge_package_id,
        threshold: balance.low_credit_threshold,
      },
      currency,
    };
  } catch (error) {
    console.error('[AI Credits Tab] Error fetching data:', error);
    // Return empty state on error
    return {
      balance: {
        total: 0,
        used: 0,
        remaining: 0,
        percentage: 0,
        lowThreshold: 10,
        isLow: true,
      },
      packages: [],
      purchaseHistory: [],
      usageStats: {
        totalConversations: 0,
        avgCreditsPerConversation: 0,
        totalInputTokens: 0,
        totalOutputTokens: 0,
        dailyUsage: [],
      },
      autoRecharge: {
        enabled: false,
        packageId: null,
        threshold: 10,
      },
      currency: 'PHP',
      error: error instanceof Error ? error.message : 'Failed to load AI Credits data',
    };
  }
};

export const adminSettingsHandlers: Record<string, ServiceDataSourceHandler> = {
  [SETTINGS_OVERVIEW_HANDLER_ID]: resolveSettingsOverview,
  [SETTINGS_SAVE_HANDLER_ID]: saveSettings,
};
