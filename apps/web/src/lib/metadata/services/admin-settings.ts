import type { ServiceDataSourceHandler } from "./types";
import { container } from "@/lib/container";
import { TYPES } from "@/lib/types";
import type { TenantService } from "@/services/TenantService";
import type { SettingService } from "@/services/SettingService";

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

  // Check integration status from settings service
  const integrationSettings = await settingService.getIntegrationSettings();
  const twilioConfigured = integrationSettings.twilio.configured;
  const emailConfigured = integrationSettings.email.configured;
  const webhookConfigured = integrationSettings.webhook.configured;
  const integrationsConfiguredCount = (twilioConfigured ? 1 : 0) + (emailConfigured ? 1 : 0) + (webhookConfigured ? 1 : 0);

  // Format last updated date
  const lastUpdated = tenant.updated_at
    ? new Date(tenant.updated_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    : 'Not available';

  // Safe date formatting with fallbacks
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
    ],
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
          value: createdAt.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
          caption: "Tenant established",
        },
        {
          label: "Last Updated",
          value: updatedAt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
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

  return {
    success: true,
    message: "Settings saved successfully",
    tenantId: tenant.id,
  };
};

export const adminSettingsHandlers: Record<string, ServiceDataSourceHandler> = {
  [SETTINGS_OVERVIEW_HANDLER_ID]: resolveSettingsOverview,
  [SETTINGS_SAVE_HANDLER_ID]: saveSettings,
};
