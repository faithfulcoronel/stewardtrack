import type { ServiceDataSourceHandler } from "./types";

const SYSTEM_OVERVIEW_HANDLER_ID = "super-admin-settings.system.overview";
const SYSTEM_SAVE_HANDLER_ID = "super-admin-settings.system.overview.save";

const resolveSystemOverview: ServiceDataSourceHandler = async (_request) => {
  // System settings don't require tenant context
  // These are platform-wide settings managed by super admins

  const now = new Date();
  const lastUpdated = now.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return {
    // Tab configuration for AdminSettingsTabs
    // NOTE: Order matters - must match the order of Children in XML
    tabs: [
      {
        id: 'overview',
        label: 'Overview',
        icon: 'settings',
        description: 'System status and information',
      },
      {
        id: 'integrations',
        label: 'Integrations',
        icon: 'link',
        description: 'Email, SMS, Push, and Webhook providers',
        badge: 'System',
      },
      {
        id: 'templates',
        label: 'Templates',
        icon: 'file-text',
        description: 'Global notification templates',
        badge: 'System',
      },
    ],
    hero: {
      eyebrow: "Super Admin",
      headline: "System Settings",
      description:
        "Configure platform-wide integrations and global templates that apply to all tenants.",
      highlights: [
        "Configure system-wide Email, SMS, and Push notification services.",
        "Manage global notification templates for all tenants.",
        "Set default webhook endpoints for external integrations.",
      ],
      metrics: [
        {
          label: "Platform",
          value: "StewardTrack",
          caption: "Church Management SaaS",
        },
        {
          label: "Access Level",
          value: "Super Admin",
          caption: "System-wide configuration",
        },
        {
          label: "Last Updated",
          value: now.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          caption: "Settings modified",
        },
      ],
      primaryCta: null,
      secondaryCta: null,
    },
    summary: {
      panels: [
        {
          id: "platform-info",
          title: "Platform Information",
          description: "StewardTrack system configuration status.",
          columns: 2,
          items: [
            {
              label: "Platform Name",
              value: "StewardTrack",
              type: "text"
            },
            {
              label: "Environment",
              value: process.env.NODE_ENV || "development",
              type: "badge",
              variant: process.env.NODE_ENV === "production" ? "success" : "default",
            },
            {
              label: "Last Configuration Update",
              value: lastUpdated,
              type: "text",
            },
            {
              label: "Configuration Status",
              value: "Active",
              type: "badge",
              variant: "success",
            },
          ],
        },
        {
          id: "integration-status",
          title: "Integration Status",
          description: "Overview of configured system integrations.",
          columns: 2,
          badge: "Configure in Integrations tab",
          items: [
            {
              label: "Email Service",
              value: "Check Integrations tab",
              type: "text",
              description: "Resend, SendGrid, or SMTP",
            },
            {
              label: "SMS Service (Twilio)",
              value: "Check Integrations tab",
              type: "text",
              description: "SMS and messaging capabilities",
            },
            {
              label: "Push Notifications (Firebase)",
              value: "Check Integrations tab",
              type: "text",
              description: "FCM for web and mobile",
            },
            {
              label: "Webhook Delivery",
              value: "Check Integrations tab",
              type: "text",
              description: "External system notifications",
            },
          ],
        },
      ],
    },
  };
};

const saveSystemSettings: ServiceDataSourceHandler = async (_request) => {
  // System settings save handler
  // In production, this would persist to a system configuration table

  return {
    success: true,
    message: "System settings saved successfully",
  };
};

export const superAdminSettingsHandlers: Record<string, ServiceDataSourceHandler> = {
  [SYSTEM_OVERVIEW_HANDLER_ID]: resolveSystemOverview,
  [SYSTEM_SAVE_HANDLER_ID]: saveSystemSettings,
};
