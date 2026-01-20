import { BaseModel } from '@/models/base.model';
import type { Member } from '@/models/member.model';
import type { PaymentMethodType } from '@/models/donation.model';

// Payment method status
export type PaymentMethodStatus = 'active' | 'expired' | 'revoked';

/**
 * DonorPaymentMethod model
 * Stores Xendit payment token references (no sensitive data)
 */
export interface DonorPaymentMethod extends BaseModel {
  id: string;
  tenant_id: string;
  member_id: string | null;
  member?: Member;
  xendit_customer_id: string;

  // Xendit Token References (NO actual payment data)
  xendit_payment_token_id: string | null;
  xendit_linked_account_token_id: string | null;
  xendit_payment_method_id: string | null;

  // Display Information (masked, for UI only)
  payment_type: PaymentMethodType;
  channel_code: string | null;
  display_name: string | null;
  masked_account: string | null;

  // Preferences
  is_default: boolean;
  nickname: string | null;

  // Status
  status: PaymentMethodStatus;
  expires_at: string | null;
}

/**
 * DTO for creating a payment method from Xendit token
 */
export interface CreatePaymentMethodDto {
  member_id?: string;
  xendit_customer_id: string;
  xendit_payment_token_id?: string;
  xendit_linked_account_token_id?: string;
  xendit_payment_method_id?: string;
  payment_type: PaymentMethodType;
  channel_code?: string;
  display_name?: string;
  masked_account?: string;
  is_default?: boolean;
  nickname?: string;
  expires_at?: string;
}

/**
 * Payment method for display in UI
 */
export interface PaymentMethodDisplay {
  id: string;
  payment_type: PaymentMethodType;
  display_name: string;
  masked_account: string | null;
  channel_code: string | null;
  is_default: boolean;
  nickname: string | null;
  icon: string; // Icon name based on payment type/channel
}
