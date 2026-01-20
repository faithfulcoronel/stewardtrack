import 'server-only';
import 'reflect-metadata';
import { injectable, inject } from 'inversify';
import { TYPES } from '@/lib/types';
import type { IDonorPaymentMethodRepository } from '@/repositories/donorPaymentMethod.repository';
import type { XenditService } from '@/services/XenditService';
import type {
  DonorPaymentMethod,
  CreatePaymentMethodDto,
  PaymentMethodDisplay,
} from '@/models/donorPaymentMethod.model';
import type { PaymentMethodType } from '@/models/donation.model';

/**
 * DonorPaymentMethodService
 *
 * Service for managing saved payment methods for donors.
 * Handles Xendit tokenization and payment method lifecycle.
 */
@injectable()
export class DonorPaymentMethodService {
  constructor(
    @inject(TYPES.IDonorPaymentMethodRepository) private paymentMethodRepository: IDonorPaymentMethodRepository,
    @inject(TYPES.XenditService) private xenditService: XenditService
  ) {}

  // ==================== PAYMENT METHOD RETRIEVAL ====================

  /**
   * Get all payment methods for a member
   */
  async getMemberPaymentMethods(memberId: string, tenantId: string): Promise<DonorPaymentMethod[]> {
    return await this.paymentMethodRepository.findByMemberId(memberId, tenantId);
  }

  /**
   * Get payment methods formatted for UI display
   */
  async getPaymentMethodsForDisplay(memberId: string, tenantId: string): Promise<PaymentMethodDisplay[]> {
    return await this.paymentMethodRepository.getPaymentMethodsForDisplay(memberId, tenantId);
  }

  /**
   * Get default payment method for a member
   */
  async getDefaultPaymentMethod(memberId: string, tenantId: string): Promise<DonorPaymentMethod | null> {
    return await this.paymentMethodRepository.getDefaultPaymentMethod(memberId, tenantId);
  }

  /**
   * Get payment method by ID
   */
  async getPaymentMethodById(paymentMethodId: string, tenantId: string): Promise<DonorPaymentMethod | null> {
    const methods = await this.paymentMethodRepository.findByMemberId('', tenantId);
    return methods.find(m => m.id === paymentMethodId) || null;
  }

  // ==================== PAYMENT METHOD CREATION ====================

  /**
   * Save a new payment method from Xendit webhook/callback
   * Called when PAY_AND_SAVE flow completes
   */
  async savePaymentMethodFromXendit(
    tenantId: string,
    memberId: string,
    xenditCustomerId: string,
    xenditPaymentMethodId: string,
    paymentType: PaymentMethodType,
    channelCode?: string,
    displayName?: string,
    maskedAccount?: string,
    isDefault: boolean = false
  ): Promise<DonorPaymentMethod> {
    const dto: CreatePaymentMethodDto = {
      member_id: memberId,
      xendit_customer_id: xenditCustomerId,
      xendit_payment_method_id: xenditPaymentMethodId,
      payment_type: paymentType,
      channel_code: channelCode,
      display_name: displayName || this.getDefaultDisplayName(paymentType, channelCode),
      masked_account: maskedAccount,
      is_default: isDefault,
    };

    return await this.paymentMethodRepository.createPaymentMethod(dto, tenantId);
  }

  /**
   * Initialize a new payment method via linked account flow
   * Used for e-wallets and direct debit
   */
  async initializeLinkedAccount(
    tenantId: string,
    memberId: string,
    xenditCustomerId: string,
    channelCode: string,
    successRedirectUrl: string,
    failureRedirectUrl: string
  ): Promise<{ authorizer_url: string; linked_account_token_id: string }> {
    const result = await this.xenditService.initializeLinkedAccount({
      customerId: xenditCustomerId,
      channelCode: channelCode,
      successRedirectUrl: successRedirectUrl,
      failureRedirectUrl: failureRedirectUrl,
    });

    return {
      authorizer_url: result.authorizer_url || '',
      linked_account_token_id: result.id,
    };
  }

  /**
   * Complete linked account setup after authorization
   */
  async completeLinkedAccountSetup(
    tenantId: string,
    memberId: string,
    xenditCustomerId: string,
    linkedAccountTokenId: string,
    paymentType: PaymentMethodType,
    channelCode: string,
    maskedAccount?: string
  ): Promise<DonorPaymentMethod> {
    const dto: CreatePaymentMethodDto = {
      member_id: memberId,
      xendit_customer_id: xenditCustomerId,
      xendit_linked_account_token_id: linkedAccountTokenId,
      payment_type: paymentType,
      channel_code: channelCode,
      display_name: this.getDefaultDisplayName(paymentType, channelCode),
      masked_account: maskedAccount,
      is_default: false,
    };

    return await this.paymentMethodRepository.createPaymentMethod(dto, tenantId);
  }

  // ==================== PAYMENT METHOD MANAGEMENT ====================

  /**
   * Set a payment method as default
   */
  async setDefaultPaymentMethod(
    paymentMethodId: string,
    memberId: string,
    tenantId: string
  ): Promise<void> {
    await this.paymentMethodRepository.setDefaultPaymentMethod(paymentMethodId, memberId, tenantId);
  }

  /**
   * Update payment method nickname
   */
  async updateNickname(
    paymentMethodId: string,
    nickname: string,
    tenantId: string
  ): Promise<DonorPaymentMethod> {
    return await this.paymentMethodRepository.updatePaymentMethod(
      paymentMethodId,
      { nickname },
      tenantId
    );
  }

  /**
   * Revoke/delete a payment method
   */
  async revokePaymentMethod(
    paymentMethodId: string,
    tenantId: string
  ): Promise<void> {
    // Get the payment method first
    const method = await this.getPaymentMethodById(paymentMethodId, tenantId);

    if (!method) {
      throw new Error('Payment method not found');
    }

    // Expire the payment method in Xendit if possible
    if (method.xendit_payment_method_id) {
      try {
        await this.xenditService.expirePaymentMethod(method.xendit_payment_method_id);
      } catch (error) {
        console.warn('Failed to expire payment method in Xendit', error);
        // Continue with local revocation even if Xendit fails
      }
    }

    // Revoke locally
    await this.paymentMethodRepository.revokePaymentMethod(paymentMethodId, tenantId);
  }

  // ==================== PAYMENT METHOD SYNC ====================

  /**
   * Sync payment methods from Xendit for a customer
   * Useful for reconciliation and initial setup
   */
  async syncPaymentMethodsFromXendit(
    tenantId: string,
    memberId: string,
    xenditCustomerId: string
  ): Promise<DonorPaymentMethod[]> {
    // Get existing payment methods from our database
    const existingMethods = await this.paymentMethodRepository.findByXenditCustomerId(xenditCustomerId);
    const existingXenditIds = new Set(
      existingMethods
        .map(m => m.xendit_payment_method_id)
        .filter((id): id is string => id !== null)
    );

    // Get payment methods from Xendit
    const xenditMethods = await this.xenditService.listPaymentMethods(xenditCustomerId);

    // Create records for any new methods
    const newMethods: DonorPaymentMethod[] = [];

    for (const xenditMethod of xenditMethods) {
      if (!existingXenditIds.has(xenditMethod.id)) {
        // Extract channel_code from nested ewallet or direct_debit properties
        const channelCode = xenditMethod.ewallet?.channel_code || xenditMethod.direct_debit?.channel_code;
        const dto: CreatePaymentMethodDto = {
          member_id: memberId,
          xendit_customer_id: xenditCustomerId,
          xendit_payment_method_id: xenditMethod.id,
          payment_type: this.mapXenditPaymentType(xenditMethod.type),
          channel_code: channelCode,
          display_name: this.getDefaultDisplayName(
            this.mapXenditPaymentType(xenditMethod.type),
            channelCode
          ),
          masked_account: this.extractMaskedAccount(xenditMethod),
          is_default: false,
        };

        const method = await this.paymentMethodRepository.createPaymentMethod(dto, tenantId);
        newMethods.push(method);
      }
    }

    return newMethods;
  }

  // ==================== EXPIRATION MANAGEMENT ====================

  /**
   * Process expired payment methods
   * Should be called periodically via background job
   */
  async processExpiredPaymentMethods(tenantId: string): Promise<number> {
    const now = new Date().toISOString();
    return await this.paymentMethodRepository.expirePaymentMethods(tenantId, now);
  }

  // ==================== HELPER METHODS ====================

  /**
   * Get default display name for payment type
   */
  private getDefaultDisplayName(paymentType: PaymentMethodType, channelCode?: string | null): string {
    if (channelCode) {
      const channelNames: Record<string, string> = {
        GCASH: 'GCash',
        GRABPAY: 'GrabPay',
        PAYMAYA: 'PayMaya',
        SHOPEEPAY: 'ShopeePay',
        OVO: 'OVO',
        DANA: 'DANA',
        LINKAJA: 'LinkAja',
        BPI: 'BPI',
        BDO: 'BDO',
        UNIONBANK: 'UnionBank',
        CHINABANK: 'Chinabank',
      };

      if (channelNames[channelCode.toUpperCase()]) {
        return channelNames[channelCode.toUpperCase()];
      }
    }

    const typeNames: Record<PaymentMethodType, string> = {
      card: 'Credit/Debit Card',
      ewallet: 'E-Wallet',
      bank_transfer: 'Bank Transfer',
      direct_debit: 'Direct Debit',
    };

    return typeNames[paymentType] || paymentType;
  }

  /**
   * Map Xendit payment type to our type
   */
  private mapXenditPaymentType(xenditType: string): PaymentMethodType {
    const typeMap: Record<string, PaymentMethodType> = {
      CARD: 'card',
      EWALLET: 'ewallet',
      VIRTUAL_ACCOUNT: 'bank_transfer',
      DIRECT_DEBIT: 'direct_debit',
      QR_CODE: 'ewallet',
      OVER_THE_COUNTER: 'bank_transfer',
    };

    return typeMap[xenditType.toUpperCase()] || 'card';
  }

  /**
   * Extract masked account from Xendit payment method
   */
  private extractMaskedAccount(xenditMethod: any): string | undefined {
    if (xenditMethod.card?.masked_card_number) {
      return xenditMethod.card.masked_card_number.slice(-4);
    }

    if (xenditMethod.ewallet?.account_mobile_number) {
      const mobile = xenditMethod.ewallet.account_mobile_number;
      return `****${mobile.slice(-4)}`;
    }

    if (xenditMethod.direct_debit?.masked_bank_account_number) {
      return xenditMethod.direct_debit.masked_bank_account_number;
    }

    return undefined;
  }
}
