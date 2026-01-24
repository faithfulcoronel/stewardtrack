import 'server-only';
import 'reflect-metadata';
import { injectable, inject } from 'inversify';
import { TYPES } from '@/lib/types';
import type { IDiscountRepository } from '@/repositories/discount.repository';
import type {
  Discount,
  DiscountRedemption,
  CreateDiscountDto,
  UpdateDiscountDto,
  DiscountValidationResult,
  ActiveDiscount,
  RedeemDiscountParams,
  DiscountWithStats,
} from '@/models/discount.model';

export interface ApplyDiscountResult {
  success: boolean;
  discount?: ActiveDiscount;
  discountedPrice: number;
  discountAmount: number;
  originalPrice: number;
  durationBillingCycles?: number | null;
  errorMessage?: string;
}

export interface DiscountSummary {
  totalActive: number;
  totalCoupons: number;
  totalAutomatic: number;
  totalRedemptions: number;
  totalSavings: number;
}

@injectable()
export class DiscountService {
  constructor(
    @inject(TYPES.IDiscountRepository) private discountRepository: IDiscountRepository
  ) {}

  // ==========================================================================
  // CRUD Operations
  // ==========================================================================

  async createDiscount(data: CreateDiscountDto): Promise<Discount> {
    // Validate discount data
    this.validateDiscountData(data);

    // Ensure code is uppercase for coupon codes
    if (data.code) {
      data.code = data.code.toUpperCase().trim();
    }

    return this.discountRepository.createDiscount(data);
  }

  async updateDiscount(id: string, data: UpdateDiscountDto): Promise<Discount> {
    // Validate if code is being updated
    if (data.code) {
      data.code = data.code.toUpperCase().trim();
    }

    return this.discountRepository.updateDiscount(id, data);
  }

  async deleteDiscount(id: string): Promise<void> {
    return this.discountRepository.deleteDiscount(id);
  }

  async getDiscountById(id: string): Promise<Discount | null> {
    return this.discountRepository.getDiscountById(id);
  }

  async getDiscountByCode(code: string): Promise<Discount | null> {
    return this.discountRepository.getDiscountByCode(code);
  }

  // ==========================================================================
  // Query Operations
  // ==========================================================================

  async getActiveDiscounts(): Promise<Discount[]> {
    return this.discountRepository.getActiveDiscounts();
  }

  async getAutomaticDiscounts(): Promise<Discount[]> {
    return this.discountRepository.getAutomaticDiscounts();
  }

  async getCouponDiscounts(): Promise<Discount[]> {
    return this.discountRepository.getCouponDiscounts();
  }

  async getAllDiscounts(includeInactive: boolean = false): Promise<Discount[]> {
    return this.discountRepository.getAllDiscounts(includeInactive);
  }

  async getDiscountsWithStats(): Promise<DiscountWithStats[]> {
    const discounts = await this.discountRepository.getAllDiscounts(true);

    const discountsWithStats: DiscountWithStats[] = await Promise.all(
      discounts.map(async (discount) => {
        const redemptions = await this.discountRepository.getDiscountRedemptions(discount.id);

        const totalRedemptions = redemptions.length;
        const totalSavings = redemptions.reduce((sum, r) => sum + r.discount_amount, 0);

        return {
          ...discount,
          total_redemptions: totalRedemptions,
          total_savings: totalSavings,
        };
      })
    );

    return discountsWithStats;
  }

  // ==========================================================================
  // Validation and Application
  // ==========================================================================

  async validateDiscountCode(
    code: string,
    offeringId: string,
    tenantId: string,
    amount: number,
    currency: string
  ): Promise<DiscountValidationResult> {
    return this.discountRepository.validateDiscountCode(
      code,
      offeringId,
      tenantId,
      amount,
      currency
    );
  }

  async validateDiscountCodePublic(
    code: string,
    offeringId: string,
    amount: number,
    currency: string
  ): Promise<DiscountValidationResult> {
    return this.discountRepository.validateDiscountCodePublic(
      code,
      offeringId,
      amount,
      currency
    );
  }

  async applyCouponCodePublic(
    code: string,
    offeringId: string,
    amount: number,
    currency: string
  ): Promise<ApplyDiscountResult> {
    const validation = await this.validateDiscountCodePublic(
      code,
      offeringId,
      amount,
      currency
    );

    if (!validation.is_valid) {
      return {
        success: false,
        discountedPrice: amount,
        discountAmount: 0,
        originalPrice: amount,
        errorMessage: validation.error_message || 'Invalid discount code',
      };
    }

    return {
      success: true,
      discount: {
        discount_id: validation.discount_id!,
        discount_name: validation.discount_name!,
        discount_type: validation.discount_type!,
        calculation_type: validation.calculation_type!,
        discount_value: validation.discount_value!,
        duration_billing_cycles: validation.duration_billing_cycles,
      },
      discountedPrice: validation.final_amount!,
      discountAmount: validation.discount_amount!,
      originalPrice: amount,
      durationBillingCycles: validation.duration_billing_cycles,
    };
  }

  async getActiveDiscountsForOffering(
    offeringId: string,
    currency: string = 'PHP'
  ): Promise<ActiveDiscount[]> {
    return this.discountRepository.getActiveDiscountsForOffering(offeringId, currency);
  }

  async getBestDiscountForOffering(
    offeringId: string,
    amount: number,
    currency: string = 'PHP'
  ): Promise<ActiveDiscount | null> {
    const discounts = await this.getActiveDiscountsForOffering(offeringId, currency);

    if (discounts.length === 0) {
      return null;
    }

    // Calculate actual discount amounts and return the best one
    let bestDiscount: ActiveDiscount | null = null;
    let bestDiscountAmount = 0;

    for (const discount of discounts) {
      let discountAmount: number;

      if (discount.calculation_type === 'percentage') {
        discountAmount = amount * (discount.discount_value / 100);
      } else {
        discountAmount = discount.discount_value;
      }

      // Cap discount at original price
      discountAmount = Math.min(discountAmount, amount);

      if (discountAmount > bestDiscountAmount) {
        bestDiscountAmount = discountAmount;
        bestDiscount = discount;
      }
    }

    return bestDiscount;
  }

  async applyBestDiscount(
    offeringId: string,
    amount: number,
    currency: string = 'PHP'
  ): Promise<ApplyDiscountResult> {
    const bestDiscount = await this.getBestDiscountForOffering(offeringId, amount, currency);

    if (!bestDiscount) {
      return {
        success: false,
        discountedPrice: amount,
        discountAmount: 0,
        originalPrice: amount,
        errorMessage: 'No applicable discounts found',
      };
    }

    let discountAmount: number;

    if (bestDiscount.calculation_type === 'percentage') {
      discountAmount = Math.round(amount * (bestDiscount.discount_value / 100) * 100) / 100;
    } else {
      discountAmount = bestDiscount.discount_value;
    }

    // Cap discount at original price
    discountAmount = Math.min(discountAmount, amount);
    const discountedPrice = Math.round((amount - discountAmount) * 100) / 100;

    return {
      success: true,
      discount: bestDiscount,
      discountedPrice,
      discountAmount,
      originalPrice: amount,
      durationBillingCycles: bestDiscount.duration_billing_cycles,
    };
  }

  async applyCouponCode(
    code: string,
    offeringId: string,
    tenantId: string,
    amount: number,
    currency: string
  ): Promise<ApplyDiscountResult> {
    const validation = await this.validateDiscountCode(
      code,
      offeringId,
      tenantId,
      amount,
      currency
    );

    if (!validation.is_valid) {
      return {
        success: false,
        discountedPrice: amount,
        discountAmount: 0,
        originalPrice: amount,
        errorMessage: validation.error_message || 'Invalid discount code',
      };
    }

    return {
      success: true,
      discount: {
        discount_id: validation.discount_id!,
        discount_name: validation.discount_name!,
        discount_type: validation.discount_type!,
        calculation_type: validation.calculation_type!,
        discount_value: validation.discount_value!,
        duration_billing_cycles: validation.duration_billing_cycles,
      },
      discountedPrice: validation.final_amount!,
      discountAmount: validation.discount_amount!,
      originalPrice: amount,
      durationBillingCycles: validation.duration_billing_cycles,
    };
  }

  // ==========================================================================
  // Redemption
  // ==========================================================================

  async redeemDiscount(params: RedeemDiscountParams): Promise<string> {
    return this.discountRepository.redeemDiscount(params);
  }

  async getDiscountRedemptions(discountId: string): Promise<DiscountRedemption[]> {
    return this.discountRepository.getDiscountRedemptions(discountId);
  }

  async getTenantRedemptions(tenantId: string): Promise<DiscountRedemption[]> {
    return this.discountRepository.getTenantRedemptions(tenantId);
  }

  // ==========================================================================
  // Analytics
  // ==========================================================================

  async getDiscountSummary(): Promise<DiscountSummary> {
    const [activeDiscounts, coupons, automatic, allDiscounts] = await Promise.all([
      this.getActiveDiscounts(),
      this.getCouponDiscounts(),
      this.getAutomaticDiscounts(),
      this.getAllDiscounts(true),
    ]);

    // Get all redemptions for statistics
    let totalRedemptions = 0;
    let totalSavings = 0;

    for (const discount of allDiscounts) {
      const redemptions = await this.getDiscountRedemptions(discount.id);
      totalRedemptions += redemptions.length;
      totalSavings += redemptions.reduce((sum, r) => sum + r.discount_amount, 0);
    }

    return {
      totalActive: activeDiscounts.length,
      totalCoupons: coupons.length,
      totalAutomatic: automatic.length,
      totalRedemptions,
      totalSavings,
    };
  }

  // ==========================================================================
  // Helper Methods
  // ==========================================================================

  private validateDiscountData(data: CreateDiscountDto): void {
    // Coupon codes must have a code
    if (data.discount_type === 'coupon' && !data.code) {
      throw new Error('Coupon discounts must have a code');
    }

    // Automatic discounts should not have a code
    if (data.discount_type === 'automatic' && data.code) {
      throw new Error('Automatic discounts should not have a code');
    }

    // Fixed amount discounts must have a currency
    if (data.calculation_type === 'fixed_amount' && !data.discount_currency) {
      throw new Error('Fixed amount discounts must specify a currency');
    }

    // Percentage discounts should be between 0 and 100
    if (data.calculation_type === 'percentage') {
      if (data.discount_value <= 0 || data.discount_value > 100) {
        throw new Error('Percentage discounts must be between 0 and 100');
      }
    }

    // Fixed amount discounts should be positive
    if (data.calculation_type === 'fixed_amount' && data.discount_value <= 0) {
      throw new Error('Fixed amount discounts must be positive');
    }

    // Tier targeting must have target tiers
    if (data.target_scope === 'tier' && (!data.target_tiers || data.target_tiers.length === 0)) {
      throw new Error('Tier-scoped discounts must specify target tiers');
    }

    // Offering targeting must have target offering IDs
    if (data.target_scope === 'offering' && (!data.target_offering_ids || data.target_offering_ids.length === 0)) {
      throw new Error('Offering-scoped discounts must specify target offering IDs');
    }

    // Ends at must be after starts at
    if (data.ends_at && data.starts_at) {
      const starts = new Date(data.starts_at);
      const ends = new Date(data.ends_at);
      if (ends <= starts) {
        throw new Error('End date must be after start date');
      }
    }
  }

  calculateDiscountAmount(
    originalPrice: number,
    calculationType: 'percentage' | 'fixed_amount',
    discountValue: number
  ): number {
    let discountAmount: number;

    if (calculationType === 'percentage') {
      discountAmount = Math.round(originalPrice * (discountValue / 100) * 100) / 100;
    } else {
      discountAmount = discountValue;
    }

    // Cap discount at original price
    return Math.min(discountAmount, originalPrice);
  }

  formatDiscountLabel(
    calculationType: 'percentage' | 'fixed_amount',
    discountValue: number,
    currency?: string
  ): string {
    if (calculationType === 'percentage') {
      return `${discountValue}% OFF`;
    } else {
      const currencySymbol = this.getCurrencySymbol(currency || 'PHP');
      return `${currencySymbol}${discountValue} OFF`;
    }
  }

  private getCurrencySymbol(currency: string): string {
    const symbols: Record<string, string> = {
      USD: '$',
      PHP: '₱',
      EUR: '€',
      GBP: '£',
      SGD: 'S$',
      MYR: 'RM',
      THB: '฿',
      IDR: 'Rp',
      VND: '₫',
    };
    return symbols[currency] || currency;
  }
}
