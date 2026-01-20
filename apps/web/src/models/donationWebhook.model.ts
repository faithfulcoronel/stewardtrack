import type { Donation } from '@/models/donation.model';

// Webhook processing status
export type WebhookStatus = 'received' | 'processing' | 'processed' | 'failed' | 'skipped';

// Xendit webhook event types for donations
export type DonationWebhookEventType =
  | 'payment.succeeded'
  | 'payment.failed'
  | 'payment.pending'
  | 'payment.expired'
  | 'payment_method.activated'
  | 'payment_method.expired'
  | 'refund.succeeded'
  | 'refund.failed';

/**
 * DonationWebhook model
 * Audit log for Xendit webhook events
 */
export interface DonationWebhook {
  id: string;
  tenant_id?: string;

  // Webhook Details
  xendit_webhook_id: string;
  event_type: DonationWebhookEventType | string;

  // Related Records
  donation_id: string | null;
  donation?: Donation;
  xendit_payment_id: string | null;

  // Payload (sanitized - no sensitive data)
  payload_sanitized: Record<string, unknown> | null;

  // Processing
  status: WebhookStatus;
  processed_at: string | null;
  error_message: string | null;
  retry_count: number;

  // Audit
  received_at: string;
}

/**
 * DTO for logging a webhook
 */
export interface LogWebhookDto {
  tenant_id?: string;
  xendit_webhook_id: string;
  event_type: string;
  donation_id?: string;
  xendit_payment_id?: string;
  payload_sanitized?: Record<string, unknown>;
}

/**
 * Xendit webhook payload structure (partial, for type safety)
 */
export interface XenditWebhookPayload {
  id: string;
  event: DonationWebhookEventType;
  business_id: string;
  created: string;
  data: {
    id: string;
    reference_id: string;
    status: string;
    amount: number;
    currency: string;
    payment_method?: {
      id: string;
      type: string;
      channel_code?: string;
      card?: {
        masked_card_number?: string;
      };
      ewallet?: {
        channel_code?: string;
        account_mobile_number?: string;
      };
      direct_debit?: {
        channel_code?: string;
        masked_bank_account_number?: string;
      };
    };
    customer_id?: string;
    metadata?: Record<string, unknown>;
    paid_at?: string;
    failure_code?: string;
  };
}
