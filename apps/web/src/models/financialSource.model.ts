import { BaseModel } from '@/models/base.model';
import type { ChartOfAccount } from '@/models/chartOfAccount.model';
import type { DisbursementSchedule } from '@/models/disbursement.model';

export type SourceType = 'bank' | 'fund' | 'wallet' | 'cash' | 'online' | 'other';

export interface FinancialSource extends BaseModel {
  id: string;
  name: string;
  description: string | null;
  source_type: SourceType;
  account_number: string | null;
  coa_id: string | null;
  chart_of_accounts?: ChartOfAccount;
  is_active: boolean;

  // Xendit payout configuration
  xendit_payout_channel_id: string | null;
  xendit_payout_channel_type: string | null;
  disbursement_schedule: DisbursementSchedule | null;
  disbursement_minimum_amount: number | null;
  last_disbursement_at: string | null;

  // XenPlatform payout destination configuration
  is_donation_destination: boolean;
  bank_account_holder_name: string | null;
  bank_account_number_encrypted: string | null;  // Encrypted bank account number
  xendit_channel_code: string | null;  // e.g., PH_BDO, PH_BPI, PH_MBTC
}

/**
 * Philippine bank channel codes supported by Xendit
 */
export const PH_BANK_CHANNELS = [
  { code: 'PH_BDO', name: 'BDO Unibank' },
  { code: 'PH_BPI', name: 'Bank of the Philippine Islands' },
  { code: 'PH_MBTC', name: 'Metrobank' },
  { code: 'PH_PNB', name: 'Philippine National Bank' },
  { code: 'PH_RCBC', name: 'RCBC' },
  { code: 'PH_UBP', name: 'UnionBank of the Philippines' },
  { code: 'PH_LAND', name: 'Land Bank of the Philippines' },
  { code: 'PH_CBC', name: 'Chinabank' },
  { code: 'PH_SCB', name: 'Security Bank' },
  { code: 'PH_EWB', name: 'EastWest Bank' },
  { code: 'PH_PSB', name: 'Philippine Savings Bank' },
  { code: 'PH_UCPB', name: 'UCPB' },
  { code: 'PH_BOC', name: 'Bank of Commerce' },
  { code: 'PH_AUB', name: 'Asia United Bank' },
  { code: 'PH_CTBC', name: 'CTBC Bank Philippines' },
  { code: 'PH_MAYB', name: 'Maybank Philippines' },
  { code: 'PH_ROBINSONSBANK', name: 'Robinsons Bank' },
  { code: 'PH_GCASH', name: 'GCash' },
  { code: 'PH_GRAB', name: 'GrabPay' },
  { code: 'PH_PAYMAYA', name: 'Maya (PayMaya)' },
] as const;

export type PhBankChannelCode = typeof PH_BANK_CHANNELS[number]['code'];

/**
 * DTO for updating payout configuration
 */
export interface UpdatePayoutConfigDto {
  xendit_channel_code: string;
  bank_account_holder_name: string;
  bank_account_number: string;  // Plain text, will be encrypted
  disbursement_schedule: DisbursementSchedule;
  disbursement_minimum_amount: number;
  is_donation_destination: boolean;
}