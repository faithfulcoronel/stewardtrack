import 'server-only';
import 'reflect-metadata';
import { injectable, inject } from 'inversify';
import { TYPES } from '@/lib/types';
import type { IDonationRepository } from '@/repositories/donation.repository';
import type { ICampaignRepository } from '@/repositories/campaign.repository';
import type { IDonationFeeConfigRepository } from '@/repositories/donationFeeConfig.repository';
import type { IDonorPaymentMethodRepository } from '@/repositories/donorPaymentMethod.repository';
import type { XenditService } from '@/services/XenditService';
import type { IncomeExpenseTransactionService } from '@/services/IncomeExpenseTransactionService';
import type { EncryptionService } from '@/lib/encryption/EncryptionService';
import type { DonationConfigService } from '@/services/DonationConfigService';
import type {
  Donation,
  CreateDonationDto,
  CreateDonationResult,
  DonationFeeCalculation,
  DonationWithDetails,
  PaymentMethodType,
} from '@/models/donation.model';
import type { DonationFeeConfig } from '@/models/donationFeeConfig.model';
// DonorPaymentMethod type available for future use if needed

/**
 * DonationService
 *
 * Main service for handling online donations with Xendit integration.
 * Key responsibilities:
 * - Fee calculation (Xendit fees + StewardTrack platform fee)
 * - Payment request creation via Xendit
 * - Donation record management
 * - Financial transaction integration
 * - PII encryption/decryption
 */
@injectable()
export class DonationService {
  constructor(
    @inject(TYPES.IDonationRepository) private donationRepository: IDonationRepository,
    @inject(TYPES.ICampaignRepository) private campaignRepository: ICampaignRepository,
    @inject(TYPES.IDonationFeeConfigRepository) private feeConfigRepository: IDonationFeeConfigRepository,
    @inject(TYPES.IDonorPaymentMethodRepository) private paymentMethodRepository: IDonorPaymentMethodRepository,
    @inject(TYPES.XenditService) private xenditService: XenditService,
    @inject(TYPES.IncomeExpenseTransactionService) private transactionService: IncomeExpenseTransactionService,
    @inject(TYPES.EncryptionService) private encryptionService: EncryptionService,
    @inject(TYPES.DonationConfigService) private donationConfigService: DonationConfigService
  ) {}

  // ==================== FEE CALCULATION ====================

  /**
   * Calculate fees for a donation
   * Donor bears all fees so church receives exact declared amount
   */
  async calculateFees(
    amount: number,
    paymentMethodType: PaymentMethodType,
    tenantId: string,
    currency: string = 'PHP'
  ): Promise<DonationFeeCalculation> {
    // Get tenant fee configuration
    const feeConfig = await this.feeConfigRepository.getConfigByTenantId(tenantId);

    // Calculate Xendit fee based on payment method
    const xenditFee = this.calculateXenditFee(amount, paymentMethodType, feeConfig);

    // Calculate platform fee
    const platformFee = this.calculatePlatformFee(amount, feeConfig);

    const totalFees = xenditFee + platformFee;
    const totalCharged = amount + totalFees;

    return {
      donation_amount: amount,
      xendit_fee: Math.round(xenditFee * 100) / 100, // Round to 2 decimal places
      platform_fee: Math.round(platformFee * 100) / 100,
      total_fees: Math.round(totalFees * 100) / 100,
      total_charged: Math.round(totalCharged * 100) / 100,
      currency,
    };
  }

  /**
   * Calculate Xendit fee based on payment method type
   */
  private calculateXenditFee(
    amount: number,
    paymentMethodType: PaymentMethodType,
    config: DonationFeeConfig
  ): number {
    switch (paymentMethodType) {
      case 'card':
        return (amount * config.xendit_card_fee_percentage / 100) + config.xendit_card_fee_fixed;

      case 'ewallet':
        return (amount * config.xendit_ewallet_fee_percentage / 100) + config.xendit_ewallet_fee_fixed;

      case 'bank_transfer':
        return config.xendit_bank_fee_fixed;

      case 'direct_debit':
        return (amount * config.xendit_direct_debit_fee_percentage / 100) + config.xendit_direct_debit_fee_fixed;

      default:
        // Default to card fees for unknown types
        return (amount * config.xendit_card_fee_percentage / 100) + config.xendit_card_fee_fixed;
    }
  }

  /**
   * Calculate StewardTrack platform fee
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

  // ==================== TERMS ACCEPTANCE ====================

  /**
   * Current terms version - increment when terms change
   */
  private readonly CURRENT_TERMS_VERSION = 'v1.0';

  /**
   * Validate that terms have been accepted
   */
  private validateTermsAcceptance(dto: CreateDonationDto): void {
    if (!dto.terms_accepted) {
      throw new Error('Terms and conditions must be accepted before processing the donation.');
    }
  }

  // ==================== DONATION CREATION ====================

  /**
   * Create a new donation and initiate payment
   */
  async createDonation(
    dto: CreateDonationDto,
    tenantId: string
  ): Promise<CreateDonationResult> {
    // Validate terms acceptance (required before payment processing)
    this.validateTermsAcceptance(dto);

    // Calculate fees
    const fees = await this.calculateFees(
      dto.amount,
      dto.payment_method_type,
      tenantId,
      dto.currency
    );

    // Encrypt donor PII
    const encryptedPii = await this.encryptDonorPii(
      tenantId,
      dto.donor_name,
      dto.donor_email,
      dto.donor_phone
    );

    // Get or create Xendit customer
    let xenditCustomerId: string | undefined;
    if (dto.member_id) {
      // Check for existing payment methods for this member
      const existingMethods = await this.paymentMethodRepository.findByMemberId(dto.member_id, tenantId);
      if (existingMethods.length > 0) {
        xenditCustomerId = existingMethods[0].xendit_customer_id;
      }
    }

    // If no existing customer, create one
    if (!xenditCustomerId && dto.donor_email) {
      const customer = await this.xenditService.createCustomer({
        reference_id: dto.member_id || `guest_${Date.now()}`,
        email: dto.donor_email,
        given_names: dto.donor_name?.split(' ')[0],
        surname: dto.donor_name?.split(' ').slice(1).join(' '),
        mobile_number: dto.donor_phone,
      });
      xenditCustomerId = customer.id;
    }

    // Create donation record (pending status)
    const donationData: Partial<Donation> = {
      tenant_id: tenantId,
      member_id: dto.member_id || null,
      xendit_customer_id: xenditCustomerId || null,
      donor_name_encrypted: encryptedPii.name,
      donor_email_encrypted: encryptedPii.email,
      donor_phone_encrypted: encryptedPii.phone,
      amount: dto.amount,
      currency: dto.currency || 'PHP',
      category_id: dto.category_id,
      fund_id: dto.fund_id || null,
      campaign_id: dto.campaign_id || null,
      xendit_fee: fees.xendit_fee,
      platform_fee: fees.platform_fee,
      total_charged: fees.total_charged,
      payment_method_type: dto.payment_method_type,
      status: 'pending',
      is_recurring: dto.is_recurring || false,
      recurring_frequency: dto.recurring_frequency || null,
      anonymous: dto.anonymous || false,
      notes: dto.notes || null,
      source: 'online',
      // Terms acceptance tracking
      terms_accepted: dto.terms_accepted,
      terms_accepted_at: new Date().toISOString(),
      terms_version: dto.terms_version || this.CURRENT_TERMS_VERSION,
    };

    const donation = await this.donationRepository.createDonation(donationData, tenantId);

    // Create Xendit payment request
    const paymentRequest = await this.xenditService.createDonationPayment({
      donationId: donation.id,
      amount: fees.total_charged, // Charge total including fees
      currency: dto.currency || 'PHP',
      description: this.buildPaymentDescription(dto, tenantId),
      paymentMethodType: this.toXenditPaymentMethodType(dto.payment_method_type),
      channelCode: dto.channel_code,
      customerId: xenditCustomerId,
      successUrl: `${process.env.NEXT_PUBLIC_APP_URL}/donate/success?id=${donation.id}`,
      failureUrl: `${process.env.NEXT_PUBLIC_APP_URL}/donate/failed?id=${donation.id}`,
      metadata: {
        tenant_id: tenantId,
        donation_id: donation.id,
        donation_amount: dto.amount.toString(),
        xendit_fee: fees.xendit_fee.toString(),
        platform_fee: fees.platform_fee.toString(),
      },
      savePaymentMethod: dto.save_payment_method,
    });

    // Extract channel code from nested payment method properties
    const paymentChannelCode = paymentRequest.payment_method?.ewallet?.channel_code
      || paymentRequest.payment_method?.direct_debit?.channel_code
      || dto.channel_code
      || null;

    // Update donation with Xendit payment request ID
    await this.donationRepository.updateDonation(donation.id, {
      xendit_payment_request_id: paymentRequest.id,
      payment_channel: paymentChannelCode,
    }, tenantId);

    // Get payment action URL
    const paymentUrl = this.xenditService.getPaymentActionUrl(paymentRequest);

    return {
      donation_id: donation.id,
      payment_url: paymentUrl,
      expires_at: paymentRequest.expires_at || null,
    };
  }

  /**
   * Encrypt donor PII for storage
   */
  private async encryptDonorPii(
    tenantId: string,
    name?: string,
    email?: string,
    phone?: string
  ): Promise<{ name: string | null; email: string | null; phone: string | null }> {
    return {
      name: name ? await this.encryptionService.encrypt(name, 'donor_name', tenantId) : null,
      email: email ? await this.encryptionService.encrypt(email, 'donor_email', tenantId) : null,
      phone: phone ? await this.encryptionService.encrypt(phone, 'donor_phone', tenantId) : null,
    };
  }

  /**
   * Convert our payment method type (lowercase) to Xendit format (uppercase)
   */
  private toXenditPaymentMethodType(
    type: PaymentMethodType
  ): 'CARD' | 'EWALLET' | 'DIRECT_DEBIT' | 'VIRTUAL_ACCOUNT' | 'QR_CODE' {
    const typeMap: Record<PaymentMethodType, 'CARD' | 'EWALLET' | 'DIRECT_DEBIT' | 'VIRTUAL_ACCOUNT' | 'QR_CODE'> = {
      card: 'CARD',
      ewallet: 'EWALLET',
      direct_debit: 'DIRECT_DEBIT',
      bank_transfer: 'VIRTUAL_ACCOUNT',
    };
    return typeMap[type] || 'CARD';
  }

  /**
   * Build payment description for Xendit
   */
  private buildPaymentDescription(dto: CreateDonationDto, _tenantId: string): string {
    const parts = ['Donation'];

    if (dto.campaign_id) {
      parts.push('to campaign');
    }

    parts.push(`- ${dto.currency || 'PHP'} ${dto.amount.toFixed(2)}`);

    return parts.join(' ');
  }

  // ==================== DONATION STATUS MANAGEMENT ====================

  /**
   * Process successful payment (called by webhook handler)
   */
  async processSuccessfulPayment(
    donationId: string,
    tenantId: string,
    xenditPaymentId: string,
    paymentMethodMasked?: string
  ): Promise<Donation> {
    // Update donation status
    const donation = await this.donationRepository.updateDonationStatus(
      donationId,
      'paid',
      tenantId,
      {
        xendit_payment_id: xenditPaymentId,
        payment_method_masked: paymentMethodMasked || null,
        paid_at: new Date().toISOString(),
      }
    );

    // Create financial transaction
    await this.createFinancialTransaction(donation, tenantId);

    // Update campaign totals (trigger handles this, but we can refresh)
    if (donation.campaign_id) {
      await this.campaignRepository.refreshCampaignTotals(donation.campaign_id, tenantId);
    }

    return donation;
  }

  /**
   * Process failed payment
   */
  async processFailedPayment(
    donationId: string,
    tenantId: string,
    failureReason?: string
  ): Promise<Donation> {
    return await this.donationRepository.updateDonationStatus(
      donationId,
      'failed',
      tenantId,
      {
        notes: failureReason ? `Payment failed: ${failureReason}` : 'Payment failed',
      }
    );
  }

  /**
   * Process expired payment
   */
  async processExpiredPayment(
    donationId: string,
    tenantId: string
  ): Promise<Donation> {
    return await this.donationRepository.updateDonationStatus(
      donationId,
      'expired',
      tenantId
    );
  }

  // ==================== FINANCIAL TRANSACTION INTEGRATION ====================

  /**
   * Create financial transaction for completed donation
   * Uses 'income' transaction type with donor-selected category
   */
  private async createFinancialTransaction(
    donation: Donation,
    tenantId: string
  ): Promise<void> {
    if (!donation.category_id) {
      console.warn(`Donation ${donation.id} has no category, skipping financial transaction`);
      return;
    }

    try {
      // Create income transaction (DR Asset, CR Revenue)
      // Uses IncomeExpenseTransactionService.create with header and lines
      const transactionResult = await this.transactionService.create(
        {
          tenant_id: tenantId,
          transaction_date: donation.paid_at || new Date().toISOString(),
          description: this.buildTransactionDescription(donation),
          source_id: await this.getOnlineGivingSourceId(tenantId),
          status: 'posted',
        },
        [
          {
            transaction_type: 'income',
            amount: donation.amount, // Record the actual donation amount (church receives this)
            description: `Online donation via Xendit. Total charged: ${donation.currency} ${donation.total_charged}`,
            category_id: donation.category_id,
            fund_id: donation.fund_id || null,
            // These will be resolved by the service based on category/source
            account_id: null,
            source_id: null,
            source_coa_id: null,
            category_coa_id: null,
          },
        ]
      );

      // Update donation with transaction header ID
      if (transactionResult?.id) {
        await this.donationRepository.updateDonation(donation.id, {
          financial_transaction_header_id: transactionResult.id,
        }, tenantId);
      }
    } catch (error) {
      console.error('Failed to create financial transaction for donation', {
        donationId: donation.id,
        error,
      });
      // Don't throw - donation is still valid even if transaction fails
    }
  }

  /**
   * Build transaction description
   */
  private buildTransactionDescription(donation: Donation): string {
    const parts = ['Online Donation'];

    if (donation.anonymous) {
      parts.push('(Anonymous)');
    }

    if (donation.xendit_payment_id) {
      parts.push(`- Ref: ${donation.xendit_payment_id}`);
    }

    return parts.join(' ');
  }

  /**
   * Get the financial source ID for online giving.
   * Auto-creates the "Online Giving" source if it doesn't exist.
   */
  private async getOnlineGivingSourceId(tenantId: string): Promise<string | undefined> {
    try {
      const sourceId = await this.donationConfigService.getOnlineGivingSourceId(tenantId);
      return sourceId;
    } catch (error) {
      console.error('[DonationService] Failed to get Online Giving source ID:', error);
      return undefined;
    }
  }

  // ==================== DONATION QUERIES ====================

  /**
   * Get donation with decrypted PII and details
   */
  async getDonationWithDetails(
    donationId: string,
    tenantId: string
  ): Promise<DonationWithDetails | null> {
    const donation = await this.donationRepository.getDonationWithDetails(donationId, tenantId);

    if (!donation) return null;

    // Decrypt PII (convert null to undefined for type compatibility)
    if (donation.donor_name_encrypted) {
      const decryptedName = await this.encryptionService.decrypt(
        donation.donor_name_encrypted,
        'donor_name',
        tenantId
      );
      donation.donor_name = decryptedName || undefined;
    }

    if (donation.donor_email_encrypted) {
      const decryptedEmail = await this.encryptionService.decrypt(
        donation.donor_email_encrypted,
        'donor_email',
        tenantId
      );
      donation.donor_email = decryptedEmail || undefined;
    }

    if (donation.donor_phone_encrypted) {
      const decryptedPhone = await this.encryptionService.decrypt(
        donation.donor_phone_encrypted,
        'donor_phone',
        tenantId
      );
      donation.donor_phone = decryptedPhone || undefined;
    }

    return donation;
  }

  /**
   * Get donations for a member
   */
  async getMemberDonations(memberId: string, tenantId: string): Promise<Donation[]> {
    return await this.donationRepository.findByMemberId(memberId, tenantId);
  }

  /**
   * Get donations for a campaign
   */
  async getCampaignDonations(campaignId: string, tenantId: string): Promise<Donation[]> {
    return await this.donationRepository.findByCampaignId(campaignId, tenantId);
  }

  // ==================== REFUNDS ====================

  /**
   * Process refund for a donation
   */
  async processRefund(
    donationId: string,
    tenantId: string,
    reason: string
  ): Promise<Donation> {
    const donation = await this.donationRepository.getDonationWithDetails(donationId, tenantId);

    if (!donation) {
      throw new Error('Donation not found');
    }

    if (donation.status !== 'paid') {
      throw new Error('Can only refund paid donations');
    }

    if (!donation.xendit_payment_id) {
      throw new Error('No Xendit payment ID for refund');
    }

    // Create refund via Xendit (currency is determined by the payment request)
    const refund = await this.xenditService.createRefund({
      payment_request_id: donation.xendit_payment_request_id!,
      reference_id: `refund_${donationId}`,
      amount: donation.total_charged, // Refund total charged amount
      reason,
    });

    // Update donation status
    const updatedDonation = await this.donationRepository.updateDonationStatus(
      donationId,
      'refunded',
      tenantId,
      {
        refunded_at: new Date().toISOString(),
        refund_reason: reason,
        notes: `Refund ID: ${refund.id}`,
      }
    );

    // Create reversal transaction
    await this.createRefundTransaction(updatedDonation, tenantId);

    // Update campaign totals
    if (donation.campaign_id) {
      await this.campaignRepository.refreshCampaignTotals(donation.campaign_id, tenantId);
    }

    return updatedDonation;
  }

  /**
   * Create refund financial transaction
   */
  private async createRefundTransaction(
    donation: Donation,
    tenantId: string
  ): Promise<void> {
    if (!donation.category_id) return;

    try {
      // Create refund transaction using IncomeExpenseTransactionService.create
      await this.transactionService.create(
        {
          tenant_id: tenantId,
          transaction_date: new Date().toISOString(),
          description: `Refund for donation ${donation.id}`,
          status: 'posted',
        },
        [
          {
            transaction_type: 'refund',
            amount: donation.amount, // Refund the original donation amount
            description: donation.refund_reason || 'Donation refund',
            category_id: donation.category_id,
            fund_id: donation.fund_id || null,
            // These will be resolved by the service based on category/source
            account_id: null,
            source_id: null,
            source_coa_id: null,
            category_coa_id: null,
          },
        ]
      );
    } catch (error) {
      console.error('Failed to create refund transaction', {
        donationId: donation.id,
        error,
      });
    }
  }
}
