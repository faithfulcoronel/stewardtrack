import type { BaseModel } from '@/models/base.model';
import type { FinancialSource } from '@/models/financialSource.model';

/**
 * Disbursement status
 */
export type DisbursementStatus =
  | 'pending'     // Created, awaiting processing
  | 'processing'  // Sent to Xendit
  | 'succeeded'   // Payout completed
  | 'failed'      // Payout failed
  | 'cancelled';  // Manually cancelled

/**
 * Disbursement schedule type
 */
export type DisbursementSchedule = 'manual' | 'daily' | 'weekly' | 'monthly';

/**
 * Who triggered the disbursement
 */
export type DisbursementTrigger = 'system' | 'manual' | 'cron';

/**
 * Disbursement entity
 * Tracks payouts to tenant bank accounts via Xendit
 *
 * IMPORTANT: This does NOT store bank account details.
 * Bank accounts are managed in Xendit Dashboard.
 * StewardTrack only stores the Xendit payout channel reference.
 */
export interface Disbursement extends BaseModel {
  id: string;
  tenant_id: string;

  // Financial source (payout destination)
  financial_source_id: string;
  financial_source?: FinancialSource;

  // Payout details
  amount: number;
  currency: string;

  // Xendit reference (NOT bank details!)
  xendit_disbursement_id: string | null;
  xendit_payout_channel_id: string;
  xendit_payout_channel_type: string | null;

  // Status tracking
  status: DisbursementStatus;
  status_message: string | null;

  // Processing period (donations included in this payout)
  period_start: string;  // DATE
  period_end: string;    // DATE

  // Breakdown
  gross_amount: number;        // Total donation amount before fees
  xendit_fees_total: number;   // Total Xendit fees deducted
  platform_fees_total: number; // Total platform fees deducted
  adjustments: number;         // Refunds, chargebacks, etc.
  net_amount: number;          // Final payout amount

  // Donation count
  donations_count: number;

  // Processing timestamps
  scheduled_at: string | null;
  processed_at: string | null;
  completed_at: string | null;
  failed_at: string | null;

  // Error tracking
  error_code: string | null;
  error_message: string | null;
  retry_count: number;

  // Audit
  triggered_by: DisbursementTrigger;
}

/**
 * Donation included in a disbursement
 */
export interface DisbursementDonation {
  id: string;
  disbursement_id: string;
  donation_id: string;

  // Amount breakdown
  donation_amount: number;
  xendit_fee: number;
  platform_fee: number;
  net_amount: number;

  created_at: string;
}

/**
 * DTO for creating a disbursement
 */
export interface CreateDisbursementDto {
  tenant_id: string;
  financial_source_id: string;
  // Legacy fields (optional for XenPlatform)
  xendit_payout_channel_id?: string;
  xendit_payout_channel_type?: string;
  currency?: string;
  period_start: string;
  period_end: string;
  scheduled_at?: string;
  triggered_by?: DisbursementTrigger;
  created_by?: string;
}

/**
 * Result of processing a disbursement
 */
export interface DisbursementResult {
  disbursement_id: string;
  status: DisbursementStatus;
  xendit_disbursement_id: string | null;
  amount: number;
  donations_count: number;
  error_code: string | null;
  error_message: string | null;
}

/**
 * Summary of disbursement for a period
 */
export interface DisbursementSummary {
  tenant_id: string;
  total_disbursed: number;
  total_pending: number;
  total_failed: number;
  disbursement_count: number;
  last_disbursement_at: string | null;
}

/**
 * Donations ready for disbursement (from RPC function)
 */
export interface DisbursementReadyDonation {
  donation_id: string;
  amount: number;
  xendit_fee: number;
  platform_fee: number;
  net_amount: number;
  paid_at: string;
}

/**
 * Financial source with payout enabled (from RPC function)
 *
 * Supports both XenPlatform and legacy approaches:
 * - XenPlatform: is_donation_destination + xendit_channel_code + bank_account_holder_name
 * - Legacy: xendit_payout_channel_id (Xendit Dashboard managed)
 */
export interface PayoutEnabledSource {
  id: string;
  name: string;
  // Legacy fields (for backward compatibility)
  xendit_payout_channel_id: string | null;
  xendit_payout_channel_type: string | null;
  // XenPlatform fields
  xendit_channel_code: string | null;
  bank_account_holder_name: string | null;
  is_donation_destination: boolean;
  // Common fields
  disbursement_schedule: DisbursementSchedule;
  disbursement_minimum_amount: number;
  last_disbursement_at: string | null;
}
