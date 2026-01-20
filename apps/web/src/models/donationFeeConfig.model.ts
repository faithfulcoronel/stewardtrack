import { BaseModel } from '@/models/base.model';

/**
 * Fee calculation type
 */
export type FeeCalculationType = 'percentage' | 'fixed' | 'hybrid';

/**
 * DonationFeeConfig model
 * Configuration for online donation fees per tenant
 */
export interface DonationFeeConfig extends BaseModel {
  id: string;
  tenant_id: string;

  // Platform fee configuration
  platform_fee_type: FeeCalculationType;
  platform_fee_percentage: number;  // e.g., 2.50 for 2.5%
  platform_fee_fixed: number;
  platform_fee_min: number | null;
  platform_fee_max: number | null;  // NULL means no cap

  // Xendit fee reference rates (actual fees come from Xendit API)
  xendit_card_fee_percentage: number;
  xendit_card_fee_fixed: number;
  xendit_ewallet_fee_percentage: number;
  xendit_ewallet_fee_fixed: number;
  xendit_bank_fee_fixed: number;
  xendit_direct_debit_fee_percentage: number;
  xendit_direct_debit_fee_fixed: number;

  // Display settings
  show_fee_breakdown: boolean;
  allow_donor_fee_coverage: boolean;

  // Status
  is_active: boolean;
}

/**
 * DTO for creating/updating fee config
 */
export interface UpdateDonationFeeConfigDto {
  platform_fee_type?: FeeCalculationType;
  platform_fee_percentage?: number;
  platform_fee_fixed?: number;
  platform_fee_min?: number | null;
  platform_fee_max?: number | null;
  xendit_card_fee_percentage?: number;
  xendit_card_fee_fixed?: number;
  xendit_ewallet_fee_percentage?: number;
  xendit_ewallet_fee_fixed?: number;
  xendit_bank_fee_fixed?: number;
  xendit_direct_debit_fee_percentage?: number;
  xendit_direct_debit_fee_fixed?: number;
  show_fee_breakdown?: boolean;
  allow_donor_fee_coverage?: boolean;
  is_active?: boolean;
}

/**
 * Default fee configuration values
 */
export const DEFAULT_FEE_CONFIG: Omit<DonationFeeConfig, 'id' | 'tenant_id' | 'created_at' | 'updated_at' | 'deleted_at' | 'created_by' | 'updated_by'> = {
  platform_fee_type: 'percentage',
  platform_fee_percentage: 2.50,  // 2.5% StewardTrack fee
  platform_fee_fixed: 0,
  platform_fee_min: null,
  platform_fee_max: null,

  // Xendit Philippines rates (reference)
  xendit_card_fee_percentage: 2.90,
  xendit_card_fee_fixed: 0,
  xendit_ewallet_fee_percentage: 2.00,
  xendit_ewallet_fee_fixed: 0,
  xendit_bank_fee_fixed: 25.00,  // PHP 25 flat fee
  xendit_direct_debit_fee_percentage: 1.50,
  xendit_direct_debit_fee_fixed: 15.00,

  show_fee_breakdown: true,
  allow_donor_fee_coverage: true,
  is_active: true,
};
