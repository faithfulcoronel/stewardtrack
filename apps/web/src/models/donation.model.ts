import { BaseModel } from '@/models/base.model';
import type { Fund } from '@/models/fund.model';
import type { Member } from '@/models/member.model';
import type { Category } from '@/models/category.model';
import type { FinancialTransactionHeader } from '@/models/financialTransactionHeader.model';
import type { Campaign } from '@/models/campaign.model';

// Donation status enum
export type DonationStatus = 'pending' | 'paid' | 'failed' | 'refunded' | 'expired' | 'cancelled';

// Recurring frequency options
export type RecurringFrequency = 'weekly' | 'monthly' | 'quarterly' | 'annually';

// Donation source (how the donation was created)
export type DonationSource = 'online' | 'kiosk' | 'import' | 'manual' | 'recurring';

// Payment method types supported by Xendit
export type PaymentMethodType = 'card' | 'ewallet' | 'bank_transfer' | 'direct_debit';

/**
 * Donation model
 * Represents an individual donation/giving transaction
 */
export interface Donation extends BaseModel {
  id: string;
  tenant_id: string;

  // Donor Information (references)
  member_id: string | null;
  member?: Member;
  xendit_customer_id: string | null;

  // Donor PII (encrypted)
  donor_name_encrypted: string | null;
  donor_email_encrypted: string | null;
  donor_phone_encrypted: string | null;

  // Decrypted PII (populated by service layer after decryption)
  donor_name?: string;
  donor_email?: string;
  donor_phone?: string;

  // Donation Details
  amount: number;
  currency: string;
  category_id: string | null;
  category?: Category;
  fund_id: string | null;
  fund?: Fund;
  campaign_id: string | null;
  campaign?: Campaign;

  // Fee Breakdown (donor bears all fees, church receives exact amount)
  xendit_fee: number;         // Xendit transaction fee
  platform_fee: number;       // StewardTrack processing fee
  total_charged: number;      // Total charged to donor (amount + xendit_fee + platform_fee)

  // Payment Information (Xendit references only)
  xendit_payment_request_id: string | null;
  xendit_payment_id: string | null;
  payment_method_type: PaymentMethodType | null;
  payment_channel: string | null;
  payment_method_masked: string | null;

  // Status
  status: DonationStatus;
  paid_at: string | null;

  // Refund tracking
  refunded_at: string | null;
  refund_reason: string | null;

  // Recurring Donation Setup
  is_recurring: boolean;
  recurring_frequency: RecurringFrequency | null;
  recurring_payment_token_id: string | null;
  recurring_next_date: string | null;
  recurring_end_date: string | null;
  recurring_parent_id: string | null;

  // Financial Transaction Link
  financial_transaction_header_id: string | null;
  financial_transaction_header?: FinancialTransactionHeader;

  // Metadata
  notes: string | null;
  anonymous: boolean;
  source: DonationSource;

  // Terms Acceptance (required before payment processing)
  terms_accepted: boolean;
  terms_accepted_at: string | null;
  terms_version: string | null;  // e.g., "v1.0" for auditability
}

/**
 * DTO for creating a new donation
 */
export interface CreateDonationDto {
  member_id?: string;
  amount: number;
  currency?: string;
  category_id: string;
  fund_id?: string;
  campaign_id?: string;
  donor_name?: string;
  donor_email: string;
  donor_phone?: string;
  payment_method_type: PaymentMethodType;
  channel_code?: string;
  is_recurring?: boolean;
  recurring_frequency?: RecurringFrequency;
  anonymous?: boolean;
  notes?: string;
  // For saved payment methods
  saved_payment_method_id?: string;
  // For new payment methods
  save_payment_method?: boolean;
  // Terms acceptance (required)
  terms_accepted: boolean;
  terms_version?: string;
}

/**
 * Result of creating a donation
 */
export interface CreateDonationResult {
  donation_id: string;
  payment_url: string | null;
  expires_at: string | null;
}

/**
 * Donation with computed/display fields for UI
 */
export interface DonationWithDetails extends Donation {
  // Display fields (masked/decrypted)
  donor_display_name: string;
  category_name: string | null;
  fund_name: string | null;
  campaign_name: string | null;
  payment_method_display: string | null;
  transaction_number: string | null;
  // Fee display
  total_fees: number;
}

/**
 * Fee calculation result
 */
export interface DonationFeeCalculation {
  donation_amount: number;      // Original donation amount (what church receives)
  xendit_fee: number;           // Xendit transaction fee
  platform_fee: number;         // StewardTrack platform fee
  total_fees: number;           // xendit_fee + platform_fee
  total_charged: number;        // donation_amount + total_fees (what donor pays)
  currency: string;
}

/**
 * Fee configuration for a tenant
 */
export interface DonationFeeConfig {
  // Xendit fees vary by payment method, these are passed from Xendit API
  // Platform fee configuration
  platform_fee_type: 'percentage' | 'fixed' | 'hybrid';
  platform_fee_percentage: number;  // e.g., 2.5 for 2.5%
  platform_fee_fixed: number;       // e.g., 10 for PHP 10
  platform_fee_min?: number;        // Minimum platform fee
  platform_fee_max?: number;        // Maximum platform fee (cap)
}
