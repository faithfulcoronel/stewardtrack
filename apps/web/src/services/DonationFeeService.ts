import 'server-only';
import 'reflect-metadata';
import { injectable, inject } from 'inversify';
import { TYPES } from '@/lib/types';
import type { IDonationFeeConfigRepository } from '@/repositories/donationFeeConfig.repository';
import type {
  DonationFeeConfig,
  UpdateDonationFeeConfigDto,
} from '@/models/donationFeeConfig.model';
import type { PaymentMethodType } from '@/models/donation.model';

/**
 * Fee display information for UI
 */
export interface FeeDisplay {
  payment_type: PaymentMethodType;
  label: string;
  description: string;
  fee_percentage: number;
  fee_fixed: number;
  example_amount: number;
  example_fee: number;
  example_total: number;
}

/**
 * DonationFeeService
 *
 * Service for managing donation fee configurations.
 * Allows tenants to customize platform fees and view Xendit fee rates.
 */
@injectable()
export class DonationFeeService {
  constructor(
    @inject(TYPES.IDonationFeeConfigRepository) private feeConfigRepository: IDonationFeeConfigRepository
  ) {}

  // ==================== FEE CONFIGURATION ====================

  /**
   * Get fee configuration for a tenant
   */
  async getFeeConfig(tenantId: string): Promise<DonationFeeConfig> {
    return await this.feeConfigRepository.getConfigByTenantId(tenantId);
  }

  /**
   * Update fee configuration
   */
  async updateFeeConfig(
    tenantId: string,
    data: UpdateDonationFeeConfigDto
  ): Promise<DonationFeeConfig> {
    // Validate fee configuration
    this.validateFeeConfig(data);

    return await this.feeConfigRepository.updateConfig(tenantId, data);
  }

  /**
   * Reset fee configuration to defaults
   */
  async resetFeeConfigToDefaults(tenantId: string): Promise<DonationFeeConfig> {
    const defaultConfig: UpdateDonationFeeConfigDto = {
      platform_fee_type: 'percentage',
      platform_fee_percentage: 2.50,
      platform_fee_fixed: 0,
      platform_fee_min: null,
      platform_fee_max: null,
      show_fee_breakdown: true,
      allow_donor_fee_coverage: true,
    };

    return await this.feeConfigRepository.updateConfig(tenantId, defaultConfig);
  }

  // ==================== FEE DISPLAY ====================

  /**
   * Get fee information for display to donors
   */
  async getFeeDisplayInfo(
    tenantId: string,
    exampleAmount: number = 1000
  ): Promise<FeeDisplay[]> {
    const config = await this.getFeeConfig(tenantId);

    const paymentTypes: { type: PaymentMethodType; label: string; description: string }[] = [
      { type: 'card', label: 'Credit/Debit Card', description: 'Visa, Mastercard, etc.' },
      { type: 'ewallet', label: 'E-Wallet', description: 'GCash, GrabPay, PayMaya' },
      { type: 'bank_transfer', label: 'Bank Transfer', description: 'Direct bank transfer' },
      { type: 'direct_debit', label: 'Direct Debit', description: 'Auto-debit from bank account' },
    ];

    return paymentTypes.map(pt => {
      const xenditFee = this.calculateXenditFeeForType(exampleAmount, pt.type, config);
      const platformFee = this.calculatePlatformFee(exampleAmount, config);
      const totalFee = xenditFee + platformFee;

      return {
        payment_type: pt.type,
        label: pt.label,
        description: pt.description,
        fee_percentage: this.getFeePercentageForType(pt.type, config),
        fee_fixed: this.getFeeFixedForType(pt.type, config),
        example_amount: exampleAmount,
        example_fee: Math.round(totalFee * 100) / 100,
        example_total: Math.round((exampleAmount + totalFee) * 100) / 100,
      };
    });
  }

  /**
   * Calculate total fee for a given amount and payment type
   */
  async calculateTotalFee(
    amount: number,
    paymentType: PaymentMethodType,
    tenantId: string
  ): Promise<{
    xendit_fee: number;
    platform_fee: number;
    total_fee: number;
    total_charged: number;
  }> {
    const config = await this.getFeeConfig(tenantId);

    const xenditFee = this.calculateXenditFeeForType(amount, paymentType, config);
    const platformFee = this.calculatePlatformFee(amount, config);
    const totalFee = xenditFee + platformFee;

    return {
      xendit_fee: Math.round(xenditFee * 100) / 100,
      platform_fee: Math.round(platformFee * 100) / 100,
      total_fee: Math.round(totalFee * 100) / 100,
      total_charged: Math.round((amount + totalFee) * 100) / 100,
    };
  }

  // ==================== VALIDATION ====================

  /**
   * Validate fee configuration
   */
  private validateFeeConfig(data: UpdateDonationFeeConfigDto): void {
    // Validate percentage range
    if (data.platform_fee_percentage !== undefined) {
      if (data.platform_fee_percentage < 0 || data.platform_fee_percentage > 10) {
        throw new Error('Platform fee percentage must be between 0 and 10');
      }
    }

    // Validate fixed fee is non-negative
    if (data.platform_fee_fixed !== undefined && data.platform_fee_fixed < 0) {
      throw new Error('Platform fixed fee cannot be negative');
    }

    // Validate min/max relationship
    if (data.platform_fee_min !== undefined && data.platform_fee_max !== undefined) {
      if (data.platform_fee_min !== null && data.platform_fee_max !== null) {
        if (data.platform_fee_min > data.platform_fee_max) {
          throw new Error('Minimum fee cannot be greater than maximum fee');
        }
      }
    }
  }

  // ==================== CALCULATION HELPERS ====================

  /**
   * Calculate Xendit fee for a payment type
   */
  private calculateXenditFeeForType(
    amount: number,
    paymentType: PaymentMethodType,
    config: DonationFeeConfig
  ): number {
    switch (paymentType) {
      case 'card':
        return (amount * config.xendit_card_fee_percentage / 100) + config.xendit_card_fee_fixed;

      case 'ewallet':
        return (amount * config.xendit_ewallet_fee_percentage / 100) + config.xendit_ewallet_fee_fixed;

      case 'bank_transfer':
        return config.xendit_bank_fee_fixed;

      case 'direct_debit':
        return (amount * config.xendit_direct_debit_fee_percentage / 100) + config.xendit_direct_debit_fee_fixed;

      default:
        return (amount * config.xendit_card_fee_percentage / 100) + config.xendit_card_fee_fixed;
    }
  }

  /**
   * Calculate platform fee
   */
  private calculatePlatformFee(amount: number, config: DonationFeeConfig): number {
    let fee = 0;

    switch (config.platform_fee_type) {
      case 'percentage':
        fee = amount * config.platform_fee_percentage / 100;
        break;

      case 'fixed':
        fee = config.platform_fee_fixed;
        break;

      case 'hybrid':
        fee = (amount * config.platform_fee_percentage / 100) + config.platform_fee_fixed;
        break;
    }

    // Apply min/max caps
    if (config.platform_fee_min !== null && fee < config.platform_fee_min) {
      fee = config.platform_fee_min;
    }

    if (config.platform_fee_max !== null && fee > config.platform_fee_max) {
      fee = config.platform_fee_max;
    }

    return fee;
  }

  /**
   * Get fee percentage for a payment type
   */
  private getFeePercentageForType(
    paymentType: PaymentMethodType,
    config: DonationFeeConfig
  ): number {
    switch (paymentType) {
      case 'card':
        return config.xendit_card_fee_percentage + config.platform_fee_percentage;

      case 'ewallet':
        return config.xendit_ewallet_fee_percentage + config.platform_fee_percentage;

      case 'bank_transfer':
        return config.platform_fee_percentage; // Bank has flat fee only

      case 'direct_debit':
        return config.xendit_direct_debit_fee_percentage + config.platform_fee_percentage;

      default:
        return config.xendit_card_fee_percentage + config.platform_fee_percentage;
    }
  }

  /**
   * Get fixed fee for a payment type
   */
  private getFeeFixedForType(
    paymentType: PaymentMethodType,
    config: DonationFeeConfig
  ): number {
    switch (paymentType) {
      case 'card':
        return config.xendit_card_fee_fixed + config.platform_fee_fixed;

      case 'ewallet':
        return config.xendit_ewallet_fee_fixed + config.platform_fee_fixed;

      case 'bank_transfer':
        return config.xendit_bank_fee_fixed + config.platform_fee_fixed;

      case 'direct_debit':
        return config.xendit_direct_debit_fee_fixed + config.platform_fee_fixed;

      default:
        return config.xendit_card_fee_fixed + config.platform_fee_fixed;
    }
  }
}
