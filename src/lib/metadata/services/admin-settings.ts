import type { ServiceDataSourceHandler } from "./types";

const SETTINGS_OVERVIEW_HANDLER_ID = "admin-settings.settings.overview";

type FeatureToggle = {
  id: string;
  label: string;
  description: string;
  category: string;
  enabled: boolean;
};

type CommunicationChannel = {
  id: string;
  label: string;
  value: string;
};

function resolveTenantId(params: Record<string, string | string[] | undefined>): string {
  const candidate = params.tenant;
  if (Array.isArray(candidate)) {
    const first = candidate.find((entry) => typeof entry === "string" && entry.trim().length > 0);
    if (first) {
      return first.trim();
    }
  }
  if (typeof candidate === "string" && candidate.trim().length > 0) {
    return candidate.trim();
  }
  return "demo-hope-chapel";
}

function getDefaultFeatureToggles(): FeatureToggle[] {
  return [
    {
      id: "online-check-in",
      label: "Online check-in",
      description: "Families pre-register kids and volunteers through the portal before Sunday gatherings.",
      category: "Engagement",
      enabled: true,
    },
    {
      id: "care-plan-workflows",
      label: "Care plan workflows",
      description: "Route pastoral care plans to center pastors with automated task assignments.",
      category: "Care",
      enabled: true,
    },
    {
      id: "mission-support-pledges",
      label: "Mission support pledges",
      description: "Track global mission pledges with quarterly reminder cadences.",
      category: "Giving",
      enabled: false,
    },
    {
      id: "sabbath-mode",
      label: "Sabbath quiet hours",
      description: "Pause outbound notifications from Friday sundown through Saturday evening.",
      category: "Communications",
      enabled: true,
    },
  ];
}

function getCommunicationChannels(): CommunicationChannel[] {
  return [
    {
      id: "weekly-digest",
      label: "Weekly shepherd digest",
      value: "Sends every Monday at 6am with pastoral assignments and care escalations.",
    },
    {
      id: "finance-brief",
      label: "Finance covenant brief",
      value: "Monthly giving recap distributed to elders and finance stewards.",
    },
    {
      id: "volunteer-roster",
      label: "Volunteer roster sync",
      value: "Mid-week schedule reminders with serving confirmations.",
    },
  ];
}

const resolveSettingsOverview: ServiceDataSourceHandler = async (request) => {
  const tenantId = resolveTenantId(request.params);
  const toggles = getDefaultFeatureToggles();
  const enabledToggleCount = toggles.filter((toggle) => toggle.enabled).length;

  return {
    tenantId,
    hero: {
      eyebrow: "StewardTrack Admin",
      headline: "Configure ministry operations for " + tenantId.replace(/[-_]/g, " "),
      description:
        "Manage multi-campus preferences, guardrails, and notifications for your church management teams.",
      highlights: [
        "Align finance, pastoral care, and discipleship workflows in one control surface.",
        "Automate compliance reminders for background checks and child safety renewals.",
        "Roll out new feature toggles to campuses with confidence using staged rollout windows.",
      ],
      metrics: [
        {
          label: "Active campuses",
          value: "8",
          caption: "Downtown, Northside, Riverwalk, and five microsites synced nightly.",
        },
        {
          label: "Weekly check-ins",
          value: "1,942",
          caption: "Kids and students checked-in across weekend gatherings.",
        },
        {
          label: "Automations",
          value: "27",
          caption: "Live pastoral workflows powering shepherd assignments.",
        },
      ],
      primaryCta: {
        id: "view-change-log",
        kind: "link",
        config: {
          label: "View change log",
          url: "/admin/settings/change-log",
          variant: "secondary",
        },
      },
      secondaryCta: {
        id: "launch-campus-wizard",
        kind: "link",
        config: {
          label: "Launch campus setup",
          url: "/admin/settings/campuses",
        },
      },
    },
    summary: {
      panels: [
        {
          id: "tenant-profile",
          title: "Tenant profile",
          description: "Snapshot of the ministry identity stewarded across StewardTrack.",
          columns: 2,
          items: [
            { label: "Ministry", value: "Hope Chapel Collective", type: "text" },
            { label: "Headquarters", value: "Franklin, TN", type: "text" },
            {
              label: "Primary contact",
              value: "marissa.owens@hopechapel.org",
              type: "link",
              href: "mailto:marissa.owens@hopechapel.org",
            },
            {
              label: "Data steward",
              value: "Marissa Owens",
              type: "badge",
              variant: "info",
              description: "Director of Administration",
            },
            {
              label: "Last review",
              value: "September 12, 2024",
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
          description: "Connected systems powering giving, communications, and volunteer coordination.",
          columns: 2,
          badge: `${enabledToggleCount} live`,
          items: [
            {
              label: "Accounting",
              value: "Sage Intacct",
              type: "text",
              description: "Daily journal sync with restricted ledger segments.",
            },
            {
              label: "Background checks",
              value: "ProtectMyMinistry",
              type: "text",
            },
            {
              label: "Messaging",
              value: "Twilio Notify",
              type: "text",
              description: "SMS deliverability tuned for multi-campus alerts.",
            },
            {
              label: "File storage",
              value: "SharePoint",
              type: "text",
            },
            {
              label: "Check-in kiosks",
              value: "Church Center iPad fleet",
              type: "text",
            },
          ],
        },
        {
          id: "communications",
          title: "Broadcast channels",
          description: "Weekly rhythms that StewardTrack automates for your teams.",
          columns: 1,
          items: getCommunicationChannels().map((channel) => ({
            label: channel.label,
            value: channel.value,
            type: "multiline",
          })),
        },
      ],
    },
    form: {
      mode: "edit",
      title: "Update global settings",
      description: "Fine-tune how StewardTrack coordinates ministries, security, and congregational care.",
      submitLabel: "Save settings",
      contextParams: { tenantId },
      footnote: "Changes sync to all campuses instantly. Feature toggles roll out during the next deployment window.",
      initialValues: {
        ministryName: "Hope Chapel Collective",
        contactEmail: "marissa.owens@hopechapel.org",
        smsNumber: "+1 (615) 555-1188",
        timeZone: "America/Chicago",
        weekendStartDay: "friday",
        enableBackgroundChecks: true,
        requireTwoFactor: true,
        featureFlags: toggles.filter((toggle) => toggle.enabled).map((toggle) => toggle.id),
        pledgeCampaign: "Kingdom Builders 2025",
      },
      fields: [
        {
          name: "ministryName",
          label: "Ministry name",
          type: "text",
          colSpan: "half",
          placeholder: "Hope Chapel Collective",
          helperText: "Displayed across the member portal and email communications.",
          required: true,
        },
        {
          name: "contactEmail",
          label: "Primary contact email",
          type: "email",
          colSpan: "half",
          placeholder: "admin@hopechapel.org",
          required: true,
        },
        {
          name: "smsNumber",
          label: "SMS reply-to",
          type: "tel",
          colSpan: "half",
          placeholder: "+1 (615) 555-1188",
          helperText: "Used for SMS confirmations and volunteer reminders.",
        },
        {
          name: "timeZone",
          label: "Primary time zone",
          type: "select",
          colSpan: "half",
          required: true,
          options: {
            items: [
              { label: "Central (US)", value: "America/Chicago" },
              { label: "Eastern (US)", value: "America/New_York" },
              { label: "Mountain (US)", value: "America/Denver" },
              { label: "Pacific (US)", value: "America/Los_Angeles" },
            ],
          },
        },
        {
          name: "weekendStartDay",
          label: "Weekend start",
          type: "select",
          colSpan: "half",
          options: {
            items: [
              { label: "Thursday", value: "thursday" },
              { label: "Friday", value: "friday" },
              { label: "Saturday", value: "saturday" },
            ],
          },
          helperText: "Drives attendance and volunteer reporting windows.",
        },
        {
          name: "enableBackgroundChecks",
          label: "Require background checks",
          type: "toggle",
          colSpan: "half",
          helperText: "Enforces background checks for all NextGen and Care volunteers.",
        },
        {
          name: "requireTwoFactor",
          label: "Enforce two-factor login",
          type: "toggle",
          colSpan: "half",
          helperText: "Applies to admins and campus leads across StewardTrack.",
        },
        {
          name: "featureFlags",
          label: "Feature toggles",
          type: "tags",
          colSpan: "full",
          helperText: "Enable new capabilities before rolling out to every campus.",
          options: {
            items: toggles.map((toggle) => ({ label: `${toggle.label} (${toggle.category})`, value: toggle.id })),
          },
        },
        {
          name: "pledgeCampaign",
          label: "Current pledge campaign",
          type: "text",
          colSpan: "full",
          placeholder: "Kingdom Builders 2025",
        },
      ],
    },
  };
};

export const adminSettingsHandlers: Record<string, ServiceDataSourceHandler> = {
  [SETTINGS_OVERVIEW_HANDLER_ID]: resolveSettingsOverview,
};
