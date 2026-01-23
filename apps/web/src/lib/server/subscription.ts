import 'server-only';
import { redirect } from 'next/navigation';
import { container } from '@/lib/container';
import { TYPES } from '@/lib/types';
import type { TenantService } from '@/services/TenantService';
import type { SettingService, EmailConfig } from '@/services/SettingService';
import { renderSubscriptionGracePeriodEmail } from '@/emails';

const GRACE_PERIOD_DAYS = 7;

export interface SubscriptionStatus {
  isActive: boolean;
  isExpired: boolean;
  isInGracePeriod: boolean;
  subscriptionStatus: string | null;
  nextBillingDate: string | null;
  gracePeriodEndDate: Date | null;
  daysUntilExpiry: number | null;
}

/**
 * Check subscription status for a tenant (server-side)
 * @param tenantId - The tenant ID
 * @param useServiceRole - If true, uses service role to bypass RLS (for webhook/cron contexts)
 */
export async function getSubscriptionStatus(
  tenantId: string,
  useServiceRole: boolean = false
): Promise<SubscriptionStatus> {
  const tenantService = container.get<TenantService>(TYPES.TenantService);
  const tenant = useServiceRole
    ? await tenantService.findByIdWithServiceRole(tenantId)
    : await tenantService.findById(tenantId);

  if (!tenant) {
    return {
      isActive: false,
      isExpired: true,
      isInGracePeriod: false,
      subscriptionStatus: null,
      nextBillingDate: null,
      gracePeriodEndDate: null,
      daysUntilExpiry: null,
    };
  }

  const subscriptionStatus = tenant.subscription_status;
  const nextBillingDate = tenant.next_billing_date ?? null;
  const now = new Date();

  // Check for cancelled or inactive status
  const isCancelled = subscriptionStatus === 'cancelled';
  const isActiveStatus = ['active', 'paid', 'trial'].includes(subscriptionStatus?.toLowerCase() || '');

  // Calculate grace period end date
  let gracePeriodEndDate: Date | null = null;
  let isInGracePeriod = false;
  let isExpired = false;
  let daysUntilExpiry: number | null = null;

  if (nextBillingDate) {
    const billingDate = new Date(nextBillingDate);
    gracePeriodEndDate = new Date(billingDate);
    gracePeriodEndDate.setDate(gracePeriodEndDate.getDate() + GRACE_PERIOD_DAYS);

    // Check if in grace period (between billing date and grace period end)
    if (now > billingDate && now <= gracePeriodEndDate) {
      isInGracePeriod = true;
      const diffTime = gracePeriodEndDate.getTime() - now.getTime();
      daysUntilExpiry = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }

    // Check if expired (past grace period)
    if (now > gracePeriodEndDate) {
      isExpired = true;
    }
  }
  else {
    if(subscriptionStatus?.toLowerCase() !== 'trial') {
      isExpired = true;
    }
  }

  // Subscription is active if:
  // 1. Status is active/paid/trial AND
  // 2. Not past grace period
  const isActive = isActiveStatus && !isExpired && !isCancelled;

  return {
    isActive,
    isExpired: isExpired || isCancelled,
    isInGracePeriod,
    subscriptionStatus,
    nextBillingDate,
    gracePeriodEndDate,
    daysUntilExpiry,
  };
}

/**
 * Check if subscription is expired and redirect if so
 */
export async function requireActiveSubscription(
  tenantId: string,
  redirectTo: string = '/subscription-expired'
): Promise<SubscriptionStatus> {
  const status = await getSubscriptionStatus(tenantId);

  if (status.isExpired) {
    redirect(redirectTo);
  }

  return status;
}

/**
 * Check subscription without redirecting
 */
export async function checkSubscription(tenantId: string): Promise<{
  allowed: boolean;
  status: SubscriptionStatus;
}> {
  const status = await getSubscriptionStatus(tenantId);

  return {
    allowed: !status.isExpired,
    status,
  };
}

/**
 * Get email configuration from settings or environment
 */
async function getEmailConfig(): Promise<{
  apiKey: string;
  fromEmail: string;
  fromName?: string;
} | null> {
  try {
    const settingService = container.get<SettingService>(TYPES.SettingService);

    // Try system-level configuration
    const systemConfig: EmailConfig | null = await settingService.getSystemEmailConfig();
    if (systemConfig?.apiKey && systemConfig?.fromEmail) {
      return {
        apiKey: systemConfig.apiKey,
        fromEmail: systemConfig.fromEmail,
        fromName: systemConfig.fromName || undefined,
      };
    }
  } catch {
    // Fall through to env vars
  }

  // Fallback to environment variables
  const envApiKey = process.env.RESEND_API_KEY;
  const envFromEmail = process.env.RESEND_FROM_EMAIL;

  if (envApiKey && envFromEmail) {
    return {
      apiKey: envApiKey,
      fromEmail: envFromEmail,
    };
  }

  return null;
}

/**
 * Send grace period warning email to tenant
 * @param tenantId - The tenant ID
 * @param recipientEmail - Email address to send to (typically tenant contact email)
 * @param recipientName - Name of the recipient
 * @returns Whether the email was sent successfully
 */
export async function sendGracePeriodWarningEmail(
  tenantId: string,
  recipientEmail: string,
  recipientName: string
): Promise<{ success: boolean; error?: string }> {
  const tenantService = container.get<TenantService>(TYPES.TenantService);
  // Use service role to bypass RLS (for webhook/cron contexts)
  const tenant = await tenantService.findByIdWithServiceRole(tenantId);

  if (!tenant) {
    return { success: false, error: 'Tenant not found' };
  }

  // Use service role since this can be called from webhook/cron
  const status = await getSubscriptionStatus(tenantId, true);

  if (!status.isInGracePeriod || status.daysUntilExpiry === null) {
    return { success: false, error: 'Tenant is not in grace period' };
  }

  const emailConfig = await getEmailConfig();
  if (!emailConfig) {
    return { success: false, error: 'Email service not configured' };
  }

  // Format the grace period end date
  const gracePeriodEndDateStr = status.gracePeriodEndDate
    ? status.gracePeriodEndDate.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : 'Unknown';

  try {
    // Render the email template
    const htmlBody = await renderSubscriptionGracePeriodEmail({
      recipientName,
      tenantName: tenant.name,
      subscriptionTier: tenant.subscription_tier || 'Standard',
      daysRemaining: status.daysUntilExpiry,
      gracePeriodEndDate: gracePeriodEndDateStr,
      paymentUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'https://stewardtrack.com'}/admin/subscription`,
      supportEmail: 'stewardtrack@gmail.com',
    });

    // Build the from field
    const fromField = emailConfig.fromName
      ? `${emailConfig.fromName} <${emailConfig.fromEmail}>`
      : emailConfig.fromEmail;

    // Send the email via Resend
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${emailConfig.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: fromField,
        to: recipientEmail,
        subject: `Action Required: ${status.daysUntilExpiry} day${status.daysUntilExpiry !== 1 ? 's' : ''} until your StewardTrack access is restricted`,
        html: htmlBody,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Subscription] Failed to send grace period email:', errorText);
      return { success: false, error: `Email delivery failed: ${errorText}` };
    }

    console.log('[Subscription] Grace period warning email sent to:', recipientEmail);
    return { success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Subscription] Error sending grace period email:', errorMessage);
    return { success: false, error: errorMessage };
  }
}

/**
 * Check subscription status and send grace period warning if applicable
 * This function can be called from a cron job or webhook
 * @param tenantId - The tenant ID to check
 * @returns The subscription status and whether a warning was sent
 */
export async function checkAndNotifyGracePeriod(
  tenantId: string
): Promise<{
  status: SubscriptionStatus;
  notificationSent: boolean;
  error?: string;
}> {
  const tenantService = container.get<TenantService>(TYPES.TenantService);
  // Use service role to bypass RLS (for webhook/cron contexts)
  const tenant = await tenantService.findByIdWithServiceRole(tenantId);

  if (!tenant) {
    // Use service role since this is called from webhook/cron
    const status = await getSubscriptionStatus(tenantId, true);
    return { status, notificationSent: false, error: 'Tenant not found' };
  }

  // Use service role since this is called from webhook/cron
  const status = await getSubscriptionStatus(tenantId, true);

  // Only send notification if in grace period
  if (!status.isInGracePeriod || status.daysUntilExpiry === null) {
    return { status, notificationSent: false };
  }

  // Get the tenant's email address
  const tenantEmail = tenant.email;
  if (!tenantEmail) {
    return {
      status,
      notificationSent: false,
      error: 'No tenant email address configured'
    };
  }

  // Send the grace period warning email
  const result = await sendGracePeriodWarningEmail(
    tenantId,
    tenantEmail,
    tenant.name // Use tenant name as recipient name
  );

  return {
    status,
    notificationSent: result.success,
    error: result.error,
  };
}
