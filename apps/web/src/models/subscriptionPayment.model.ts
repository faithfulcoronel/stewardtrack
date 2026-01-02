import { BaseModel } from './base.model';

/**
 * SubscriptionPayment Model
 *
 * Represents a payment transaction for tenant subscriptions via Xendit.
 */
export interface SubscriptionPayment extends BaseModel {
  tenant_id: string;
  offering_id: string | null;

  // Xendit payment details
  xendit_invoice_id: string | null;
  xendit_payment_id: string | null;
  external_id: string;

  // Payment information
  amount: number;
  currency: string;
  status: 'pending' | 'paid' | 'settled' | 'expired' | 'failed' | 'refunded';
  payment_method: string | null;
  payment_channel: string | null;

  // Invoice details
  invoice_url: string | null;
  invoice_pdf_url: string | null;
  payer_email: string | null;

  // Dates
  paid_at: string | null;
  expired_at: string | null;
  failed_at: string | null;

  // Error handling
  failure_code: string | null;
  failure_reason: string | null;

  // Metadata
  description: string | null;
  metadata: Record<string, any> | null;
}

/**
 * SubscriptionPayment with related tenant information
 */
export interface SubscriptionPaymentWithTenant extends SubscriptionPayment {
  tenant?: {
    id: string;
    name: string;
    subscription_status: string;
  };
}

/**
 * SubscriptionPayment with related offering information
 */
export interface SubscriptionPaymentWithOffering extends SubscriptionPayment {
  offering?: {
    id: string;
    name: string;
    tier: string;
    billing_cycle: string;
  };
}

/**
 * Complete SubscriptionPayment with all relations
 */
export interface SubscriptionPaymentComplete extends SubscriptionPayment {
  tenant?: {
    id: string;
    name: string;
    subscription_status: string;
  };
  offering?: {
    id: string;
    name: string;
    tier: string;
    billing_cycle: string;
  };
}
