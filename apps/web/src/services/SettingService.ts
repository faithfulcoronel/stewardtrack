import 'server-only';
import { injectable, inject } from 'inversify';
import { TYPES } from '@/lib/types';
import type { ISettingRepository } from '@/repositories/setting.repository';
import type { Setting } from '@/models/setting.model';
import { tenantUtils } from '@/utils/tenantUtils';
import type { AuthService } from '@/services/AuthService';
import { SettingValidator } from '@/validators/setting.validator';
import { validateOrThrow } from '@/utils/validation';

// Integration settings types
export interface TwilioConfig {
  accountSid: string;
  authToken: string;
  fromNumber: string;
  senderId: string | null; // Alphanumeric Sender ID for international SMS (e.g., "CalacaBapCh")
  verified: boolean;
  lastTested: string | null;
}

export interface EmailConfig {
  provider: 'resend' | 'sendgrid' | 'smtp';
  apiKey: string;
  fromEmail: string;
  fromName: string;
  replyTo: string | null;
  verified: boolean;
  lastTested: string | null;
}

export interface WebhookConfig {
  url: string;
  secret: string;
  enabled: boolean;
  verified: boolean;
  lastTested: string | null;
}

export interface FirebaseConfig {
  projectId: string;
  clientEmail: string;
  privateKey: string;
  vapidKey: string;
  enabled: boolean;
  verified: boolean;
  lastTested: string | null;
}

export interface IntegrationSettings {
  twilio: {
    accountSid: string;
    authToken: string;
    fromNumber: string;
    senderId: string | null; // Alphanumeric Sender ID for international SMS
    configured: boolean;
    verified: boolean;
    lastTested: string | null;
  };
  email: {
    provider: string;
    apiKey: string;
    fromEmail: string;
    fromName: string;
    replyTo: string;
    configured: boolean;
    verified: boolean;
    lastTested: string | null;
  };
  webhook: {
    url: string;
    secret: string;
    enabled: boolean;
    configured: boolean;
    verified: boolean;
    lastTested: string | null;
  };
  firebase: {
    projectId: string;
    clientEmail: string;
    privateKey: string;
    vapidKey: string;
    enabled: boolean;
    configured: boolean;
    verified: boolean;
    lastTested: string | null;
  };
}

// Setting keys for integrations
const INTEGRATION_KEYS = {
  TWILIO_ACCOUNT_SID: 'integration.twilio.account_sid',
  TWILIO_AUTH_TOKEN: 'integration.twilio.auth_token',
  TWILIO_FROM_NUMBER: 'integration.twilio.from_number',
  TWILIO_SENDER_ID: 'integration.twilio.sender_id',
  TWILIO_VERIFIED: 'integration.twilio.verified',
  TWILIO_LAST_TESTED: 'integration.twilio.last_tested',
  EMAIL_PROVIDER: 'integration.email.provider',
  EMAIL_API_KEY: 'integration.email.api_key',
  EMAIL_FROM_EMAIL: 'integration.email.from_email',
  EMAIL_FROM_NAME: 'integration.email.from_name',
  EMAIL_REPLY_TO: 'integration.email.reply_to',
  EMAIL_VERIFIED: 'integration.email.verified',
  EMAIL_LAST_TESTED: 'integration.email.last_tested',
  WEBHOOK_URL: 'integration.webhook.url',
  WEBHOOK_SECRET: 'integration.webhook.secret',
  WEBHOOK_ENABLED: 'integration.webhook.enabled',
  WEBHOOK_VERIFIED: 'integration.webhook.verified',
  WEBHOOK_LAST_TESTED: 'integration.webhook.last_tested',
  // Firebase (system-level, uses env vars for config but persists verification status)
  FIREBASE_VERIFIED: 'integration.firebase.verified',
  FIREBASE_LAST_TESTED: 'integration.firebase.last_tested',
} as const;

export interface SettingService {
  getSetting(key: string): Promise<Setting | null>;
  setSetting(key: string, value: string, scope?: 'tenant' | 'user' | 'app'): Promise<Setting>;
  getTenantCurrency(): Promise<string | null>;
  setTenantCurrency(code: string): Promise<Setting>;
  getTenantTimezone(): Promise<string | null>;
  setTenantTimezone(timezone: string): Promise<Setting>;
  getUserWelcomeFlag(): Promise<boolean>;
  setUserWelcomeFlag(value: boolean): Promise<Setting>;
  // Integration settings
  getIntegrationSettings(): Promise<IntegrationSettings>;
  getTwilioConfig(): Promise<TwilioConfig | null>;
  saveTwilioConfig(config: { accountSid: string; authToken: string; fromNumber: string; senderId?: string | null }): Promise<void>;
  markTwilioVerified(): Promise<void>;
  getEmailConfig(): Promise<EmailConfig | null>;
  saveEmailConfig(config: { provider?: string; apiKey: string; fromEmail: string; fromName: string; replyTo?: string }): Promise<void>;
  markEmailVerified(): Promise<void>;
  getWebhookConfig(): Promise<WebhookConfig | null>;
  saveWebhookConfig(config: { url: string; secret: string; enabled?: boolean }): Promise<void>;
  markWebhookVerified(): Promise<void>;
  // Firebase (system-level, uses env vars for config)
  getFirebaseStatus(): Promise<{ verified: boolean; lastTested: string | null }>;
  markFirebaseVerified(): Promise<void>;
  getIntegrationConfiguredCount(): Promise<number>;
  // System-level email settings (tenant_id = NULL, used for registration emails)
  getSystemEmailConfig(): Promise<EmailConfig | null>;
  saveSystemEmailConfig(config: { provider?: string; apiKey: string; fromEmail: string; fromName: string; replyTo?: string }): Promise<void>;
}

@injectable()
export class SupabaseSettingService implements SettingService {
  constructor(
    @inject(TYPES.ISettingRepository)
    private repo: ISettingRepository,
    @inject(TYPES.AuthService)
    private authService: AuthService,
  ) {}

  async getSetting(key: string): Promise<Setting | null> {
    return this.repo.getByKey(key);
  }

  private async upsertSetting(key: string, value: string, scope: 'tenant' | 'user' | 'app' = 'tenant'): Promise<Setting> {
    const existing = await this.repo.getByKey(key);
    const {
      data: { user },
    } = await this.authService.getUser();
    const tenantId = await tenantUtils.getTenantId();
    const payload: Partial<Setting> = { key, value };
    validateOrThrow(SettingValidator, payload);
    if (scope === 'tenant') {
      payload.tenant_id = tenantId || undefined;
    } else if (scope === 'user') {
      payload.user_id = user?.id;
      payload.tenant_id = tenantId || undefined;
    }
    if (existing) {
      return this.repo.update(existing.id, { value });
    }
    return this.repo.create(payload as Partial<Setting>);
  }

  async setSetting(key: string, value: string, scope: 'tenant' | 'user' | 'app' = 'tenant'): Promise<Setting> {
    return this.upsertSetting(key, value, scope);
  }

  async getTenantCurrency(): Promise<string | null> {
    const setting = await this.getSetting('tenant.currency');
    return setting?.value || null;
  }

  async setTenantCurrency(code: string): Promise<Setting> {
    return this.upsertSetting('tenant.currency', code, 'tenant');
  }

  async getTenantTimezone(): Promise<string | null> {
    const setting = await this.getSetting('tenant.timezone');
    return setting?.value || null;
  }

  async setTenantTimezone(timezone: string): Promise<Setting> {
    return this.upsertSetting('tenant.timezone', timezone, 'tenant');
  }

  async getUserWelcomeFlag(): Promise<boolean> {
    const setting = await this.getSetting('user.welcome_shown');
    return setting?.value === 'true';
  }

  async setUserWelcomeFlag(value: boolean): Promise<Setting> {
    return this.upsertSetting('user.welcome_shown', value.toString(), 'user');
  }

  // Integration Settings Methods

  private async getAllIntegrationKeys(): Promise<Record<string, string>> {
    const result: Record<string, string> = {};

    // Fetch all integration settings
    const { data } = await this.repo.find({
      filters: {
        key: { operator: 'like', value: 'integration.%' },
      },
    });

    if (data) {
      for (const setting of data) {
        result[setting.key] = setting.value;
      }
    }

    return result;
  }

  async getIntegrationSettings(): Promise<IntegrationSettings> {
    const settings = await this.getAllIntegrationKeys();

    const twilioAccountSid = settings[INTEGRATION_KEYS.TWILIO_ACCOUNT_SID] || '';
    const twilioAuthToken = settings[INTEGRATION_KEYS.TWILIO_AUTH_TOKEN] || '';
    const emailApiKey = settings[INTEGRATION_KEYS.EMAIL_API_KEY] || '';
    const webhookUrl = settings[INTEGRATION_KEYS.WEBHOOK_URL] || '';
    const webhookSecret = settings[INTEGRATION_KEYS.WEBHOOK_SECRET] || '';

    return {
      twilio: {
        accountSid: twilioAccountSid,
        // Mask auth token if configured
        authToken: twilioAuthToken ? '••••••••••••••••' : '',
        fromNumber: settings[INTEGRATION_KEYS.TWILIO_FROM_NUMBER] || '',
        senderId: settings[INTEGRATION_KEYS.TWILIO_SENDER_ID] || null,
        configured: !!(twilioAccountSid && twilioAuthToken),
        verified: settings[INTEGRATION_KEYS.TWILIO_VERIFIED] === 'true',
        lastTested: settings[INTEGRATION_KEYS.TWILIO_LAST_TESTED] || null,
      },
      email: {
        provider: settings[INTEGRATION_KEYS.EMAIL_PROVIDER] || 'resend',
        // Mask API key if configured
        apiKey: emailApiKey ? '••••••••••••••••' : '',
        fromEmail: settings[INTEGRATION_KEYS.EMAIL_FROM_EMAIL] || '',
        fromName: settings[INTEGRATION_KEYS.EMAIL_FROM_NAME] || '',
        replyTo: settings[INTEGRATION_KEYS.EMAIL_REPLY_TO] || '',
        configured: !!emailApiKey,
        verified: settings[INTEGRATION_KEYS.EMAIL_VERIFIED] === 'true',
        lastTested: settings[INTEGRATION_KEYS.EMAIL_LAST_TESTED] || null,
      },
      webhook: {
        url: webhookUrl,
        // Mask secret if configured
        secret: webhookSecret ? '••••••••••••••••' : '',
        enabled: settings[INTEGRATION_KEYS.WEBHOOK_ENABLED] === 'true',
        configured: !!(webhookUrl && webhookSecret),
        verified: settings[INTEGRATION_KEYS.WEBHOOK_VERIFIED] === 'true',
        lastTested: settings[INTEGRATION_KEYS.WEBHOOK_LAST_TESTED] || null,
      },
      firebase: {
        // Firebase config comes from environment variables
        projectId: process.env.FIREBASE_PROJECT_ID || '',
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL || '',
        privateKey: process.env.FIREBASE_PRIVATE_KEY ? '••••••••••••••••' : '',
        vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY || '',
        enabled: !!process.env.FIREBASE_PROJECT_ID,
        configured: !!(process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_PRIVATE_KEY && process.env.FIREBASE_CLIENT_EMAIL),
        // Verified status comes from database
        verified: settings[INTEGRATION_KEYS.FIREBASE_VERIFIED] === 'true',
        lastTested: settings[INTEGRATION_KEYS.FIREBASE_LAST_TESTED] || null,
      },
    };
  }

  async getTwilioConfig(): Promise<TwilioConfig | null> {
    const settings = await this.getAllIntegrationKeys();

    const accountSid = settings[INTEGRATION_KEYS.TWILIO_ACCOUNT_SID];
    const authToken = settings[INTEGRATION_KEYS.TWILIO_AUTH_TOKEN];
    const fromNumber = settings[INTEGRATION_KEYS.TWILIO_FROM_NUMBER];

    if (!accountSid || !authToken || !fromNumber) {
      return null;
    }

    return {
      accountSid,
      authToken,
      fromNumber,
      senderId: settings[INTEGRATION_KEYS.TWILIO_SENDER_ID] || null,
      verified: settings[INTEGRATION_KEYS.TWILIO_VERIFIED] === 'true',
      lastTested: settings[INTEGRATION_KEYS.TWILIO_LAST_TESTED] || null,
    };
  }

  async saveTwilioConfig(config: {
    accountSid: string;
    authToken: string;
    fromNumber: string;
    senderId?: string | null;
  }): Promise<void> {
    // Get existing auth token if the new one is masked
    let authToken = config.authToken;
    if (authToken.includes('•')) {
      const existing = await this.getTwilioConfig();
      authToken = existing?.authToken || '';
    }

    await this.upsertSetting(INTEGRATION_KEYS.TWILIO_ACCOUNT_SID, config.accountSid, 'tenant');
    await this.upsertSetting(INTEGRATION_KEYS.TWILIO_AUTH_TOKEN, authToken, 'tenant');
    await this.upsertSetting(INTEGRATION_KEYS.TWILIO_FROM_NUMBER, config.fromNumber, 'tenant');
    // Save Sender ID if provided (for international SMS via Alphanumeric Sender ID)
    if (config.senderId !== undefined) {
      await this.upsertSetting(INTEGRATION_KEYS.TWILIO_SENDER_ID, config.senderId || '', 'tenant');
    }
    // Reset verification when config changes
    await this.upsertSetting(INTEGRATION_KEYS.TWILIO_VERIFIED, 'false', 'tenant');
  }

  async markTwilioVerified(): Promise<void> {
    await this.upsertSetting(INTEGRATION_KEYS.TWILIO_VERIFIED, 'true', 'tenant');
    await this.upsertSetting(INTEGRATION_KEYS.TWILIO_LAST_TESTED, new Date().toISOString(), 'tenant');
  }

  async getEmailConfig(): Promise<EmailConfig | null> {
    const settings = await this.getAllIntegrationKeys();

    const apiKey = settings[INTEGRATION_KEYS.EMAIL_API_KEY];
    const fromEmail = settings[INTEGRATION_KEYS.EMAIL_FROM_EMAIL];

    if (!apiKey || !fromEmail) {
      return null;
    }

    return {
      provider: (settings[INTEGRATION_KEYS.EMAIL_PROVIDER] || 'resend') as EmailConfig['provider'],
      apiKey,
      fromEmail,
      fromName: settings[INTEGRATION_KEYS.EMAIL_FROM_NAME] || '',
      replyTo: settings[INTEGRATION_KEYS.EMAIL_REPLY_TO] || null,
      verified: settings[INTEGRATION_KEYS.EMAIL_VERIFIED] === 'true',
      lastTested: settings[INTEGRATION_KEYS.EMAIL_LAST_TESTED] || null,
    };
  }

  async saveEmailConfig(config: {
    provider?: string;
    apiKey: string;
    fromEmail: string;
    fromName: string;
    replyTo?: string;
  }): Promise<void> {
    // Get existing API key if the new one is masked
    let apiKey = config.apiKey;
    if (apiKey.includes('•')) {
      const existing = await this.getEmailConfig();
      apiKey = existing?.apiKey || '';
    }

    await this.upsertSetting(INTEGRATION_KEYS.EMAIL_PROVIDER, config.provider || 'resend', 'tenant');
    await this.upsertSetting(INTEGRATION_KEYS.EMAIL_API_KEY, apiKey, 'tenant');
    await this.upsertSetting(INTEGRATION_KEYS.EMAIL_FROM_EMAIL, config.fromEmail, 'tenant');
    await this.upsertSetting(INTEGRATION_KEYS.EMAIL_FROM_NAME, config.fromName, 'tenant');
    if (config.replyTo) {
      await this.upsertSetting(INTEGRATION_KEYS.EMAIL_REPLY_TO, config.replyTo, 'tenant');
    }
    // Reset verification when config changes
    await this.upsertSetting(INTEGRATION_KEYS.EMAIL_VERIFIED, 'false', 'tenant');
  }

  async markEmailVerified(): Promise<void> {
    await this.upsertSetting(INTEGRATION_KEYS.EMAIL_VERIFIED, 'true', 'tenant');
    await this.upsertSetting(INTEGRATION_KEYS.EMAIL_LAST_TESTED, new Date().toISOString(), 'tenant');
  }

  async getWebhookConfig(): Promise<WebhookConfig | null> {
    const settings = await this.getAllIntegrationKeys();

    const url = settings[INTEGRATION_KEYS.WEBHOOK_URL];
    const secret = settings[INTEGRATION_KEYS.WEBHOOK_SECRET];

    if (!url) {
      return null;
    }

    return {
      url,
      secret: secret || '',
      enabled: settings[INTEGRATION_KEYS.WEBHOOK_ENABLED] === 'true',
      verified: settings[INTEGRATION_KEYS.WEBHOOK_VERIFIED] === 'true',
      lastTested: settings[INTEGRATION_KEYS.WEBHOOK_LAST_TESTED] || null,
    };
  }

  async saveWebhookConfig(config: {
    url: string;
    secret: string;
    enabled?: boolean;
  }): Promise<void> {
    // Get existing secret if the new one is masked
    let secret = config.secret;
    if (secret.includes('•')) {
      const existing = await this.getWebhookConfig();
      secret = existing?.secret || '';
    }

    await this.upsertSetting(INTEGRATION_KEYS.WEBHOOK_URL, config.url, 'tenant');
    await this.upsertSetting(INTEGRATION_KEYS.WEBHOOK_SECRET, secret, 'tenant');
    await this.upsertSetting(INTEGRATION_KEYS.WEBHOOK_ENABLED, (config.enabled ?? true).toString(), 'tenant');
    // Reset verification when config changes
    await this.upsertSetting(INTEGRATION_KEYS.WEBHOOK_VERIFIED, 'false', 'tenant');
  }

  async markWebhookVerified(): Promise<void> {
    await this.upsertSetting(INTEGRATION_KEYS.WEBHOOK_VERIFIED, 'true', 'tenant');
    await this.upsertSetting(INTEGRATION_KEYS.WEBHOOK_LAST_TESTED, new Date().toISOString(), 'tenant');
  }

  // Firebase settings (system-level, config from env vars, but persists verification status)
  async getFirebaseStatus(): Promise<{ verified: boolean; lastTested: string | null }> {
    const settings = await this.getAllIntegrationKeys();
    return {
      verified: settings[INTEGRATION_KEYS.FIREBASE_VERIFIED] === 'true',
      lastTested: settings[INTEGRATION_KEYS.FIREBASE_LAST_TESTED] || null,
    };
  }

  async markFirebaseVerified(): Promise<void> {
    await this.upsertSetting(INTEGRATION_KEYS.FIREBASE_VERIFIED, 'true', 'tenant');
    await this.upsertSetting(INTEGRATION_KEYS.FIREBASE_LAST_TESTED, new Date().toISOString(), 'tenant');
  }

  async getIntegrationConfiguredCount(): Promise<number> {
    const settings = await this.getIntegrationSettings();
    let count = 0;
    if (settings.twilio.configured) count++;
    if (settings.email.configured) count++;
    if (settings.webhook.configured) count++;
    return count;
  }

  // System-level email settings (tenant_id = NULL, used for registration emails)

  /**
   * Get system-level email configuration (tenant_id = NULL).
   * Used for sending emails without tenant context (e.g., registration welcome emails).
   * Uses the same integration.email.* keys but queries without tenant filtering.
   */
  async getSystemEmailConfig(): Promise<EmailConfig | null> {
    const systemSettings = await this.repo.getSystemSettings('integration.email.');

    // Convert array to key-value map
    const settingsMap: Record<string, string> = {};
    for (const setting of systemSettings) {
      settingsMap[setting.key] = setting.value;
    }

    const apiKey = settingsMap[INTEGRATION_KEYS.EMAIL_API_KEY];
    const fromEmail = settingsMap[INTEGRATION_KEYS.EMAIL_FROM_EMAIL];

    if (!apiKey || !fromEmail) {
      return null;
    }

    return {
      provider: (settingsMap[INTEGRATION_KEYS.EMAIL_PROVIDER] || 'resend') as EmailConfig['provider'],
      apiKey,
      fromEmail,
      fromName: settingsMap[INTEGRATION_KEYS.EMAIL_FROM_NAME] || 'StewardTrack',
      replyTo: settingsMap[INTEGRATION_KEYS.EMAIL_REPLY_TO] || 'support@cortanatechsolutions.com',
      verified: settingsMap[INTEGRATION_KEYS.EMAIL_VERIFIED] === 'true',
      lastTested: settingsMap[INTEGRATION_KEYS.EMAIL_LAST_TESTED] || null,
    };
  }

  /**
   * Save system-level email configuration (tenant_id = NULL).
   * Used by super admin to configure email settings for registration/system emails.
   */
  async saveSystemEmailConfig(config: {
    provider?: string;
    apiKey: string;
    fromEmail: string;
    fromName: string;
    replyTo?: string;
  }): Promise<void> {
    // Get existing API key if the new one is masked
    let apiKey = config.apiKey;
    if (apiKey.includes('•')) {
      const existing = await this.getSystemEmailConfig();
      apiKey = existing?.apiKey || '';
    }

    await this.repo.upsertSystemSetting(INTEGRATION_KEYS.EMAIL_PROVIDER, config.provider || 'resend');
    await this.repo.upsertSystemSetting(INTEGRATION_KEYS.EMAIL_API_KEY, apiKey);
    await this.repo.upsertSystemSetting(INTEGRATION_KEYS.EMAIL_FROM_EMAIL, config.fromEmail);
    await this.repo.upsertSystemSetting(INTEGRATION_KEYS.EMAIL_FROM_NAME, config.fromName);
    if (config.replyTo) {
      await this.repo.upsertSystemSetting(INTEGRATION_KEYS.EMAIL_REPLY_TO, config.replyTo);
    }
  }
}