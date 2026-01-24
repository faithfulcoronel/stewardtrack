import 'server-only';
import 'reflect-metadata';
import { injectable, inject } from 'inversify';
import { TYPES } from '@/lib/types';
import type { IScheduleRegistrationRepository } from '@/repositories/scheduleRegistration.repository';
import type { IMinistryScheduleRepository } from '@/repositories/ministrySchedule.repository';
import type { ITenantRepository } from '@/repositories/tenant.repository';
import type { IDonationFeeConfigRepository } from '@/repositories/donationFeeConfig.repository';
import type { IFinancialSourceRepository } from '@/repositories/financialSource.repository';
import type { ICategoryRepository } from '@/repositories/category.repository';
import type { XenditService } from '@/services/XenditService';
import type { IncomeExpenseTransactionService } from '@/services/IncomeExpenseTransactionService';
import type { DonationConfigService } from '@/services/DonationConfigService';
import type { AccountService } from '@/services/AccountService';
import type { PaymentMethodType } from '@/models/donation.model';
import type { DonationFeeConfig } from '@/models/donationFeeConfig.model';
import { getTenantCurrency } from '@/lib/metadata/services/finance-utils';

/**
 * Fee calculation result for registration payments
 */
export interface RegistrationFeeCalculation {
  registration_fee: number;
  xendit_fee: number;
  platform_fee: number;
  total_fees: number;
  total_charged: number;
  currency: string;
  is_early_bird: boolean;
}

/**
 * DTO for creating a registration payment
 */
export interface CreateRegistrationPaymentDto {
  registration_id: string;
  occurrence_id: string;
  schedule_id: string;
  payment_method_type: PaymentMethodType;
  channel_code?: string;
  registrant_name: string;
  registrant_email: string;
  registrant_phone?: string;
  member_id?: string;
}

/**
 * Result from initiating a registration payment
 */
export interface CreateRegistrationPaymentResult {
  registration_id: string;
  payment_url: string | null;
  expires_at: string | null;
  amount: number;
  is_early_bird: boolean;
}

/**
 * ScheduleRegistrationPaymentService
 *
 * Handles online payment processing for event registrations using Xendit.
 * Similar to DonationService, this service:
 * - Calculates fees (Xendit + platform fees)
 * - Creates payment requests via Xendit
 * - Processes successful payments and creates income transactions
 * - Handles failed/expired payments
 */
@injectable()
export class ScheduleRegistrationPaymentService {
  constructor(
    @inject(TYPES.IScheduleRegistrationRepository) private registrationRepository: IScheduleRegistrationRepository,
    @inject(TYPES.IMinistryScheduleRepository) private scheduleRepository: IMinistryScheduleRepository,
    @inject(TYPES.ITenantRepository) private tenantRepository: ITenantRepository,
    @inject(TYPES.IDonationFeeConfigRepository) private feeConfigRepository: IDonationFeeConfigRepository,
    @inject(TYPES.IFinancialSourceRepository) private sourceRepository: IFinancialSourceRepository,
    @inject(TYPES.ICategoryRepository) private categoryRepository: ICategoryRepository,
    @inject(TYPES.XenditService) private xenditService: XenditService,
    @inject(TYPES.IncomeExpenseTransactionService) private transactionService: IncomeExpenseTransactionService,
    @inject(TYPES.DonationConfigService) private donationConfigService: DonationConfigService,
    @inject(TYPES.AccountService) private accountService: AccountService
  ) {}

  // ==================== FEE CALCULATION ====================

  /**
   * Calculate fees for a registration payment.
   * Uses the same fee structure as donations.
   * Automatically determines if early bird pricing applies.
   */
  async calculateFees(
    scheduleId: string,
    tenantId: string,
    paymentMethodType: PaymentMethodType,
    currency?: string
  ): Promise<RegistrationFeeCalculation> {
    // Get schedule to determine the registration fee
    const schedule = await this.scheduleRepository.getById(scheduleId, tenantId);
    if (!schedule) {
      throw new Error('Schedule not found');
    }

    if (!schedule.accept_online_payment || !schedule.registration_fee_amount) {
      throw new Error('This schedule does not accept online payment');
    }

    // Determine if early bird pricing applies
    const now = new Date();
    const isEarlyBird = schedule.early_registration_fee_amount &&
      schedule.early_registration_deadline &&
      new Date(schedule.early_registration_deadline) >= now;

    const registrationFee = isEarlyBird
      ? schedule.early_registration_fee_amount!
      : schedule.registration_fee_amount;

    // Get tenant fee configuration (same as donations)
    const feeConfig = await this.feeConfigRepository.getConfigByTenantId(tenantId);

    // Calculate Xendit fee based on payment method
    const xenditFee = this.calculateXenditFee(registrationFee, paymentMethodType, feeConfig);

    // Calculate platform fee
    const platformFee = this.calculatePlatformFee(registrationFee, feeConfig);

    const totalFees = xenditFee + platformFee;
    const totalCharged = registrationFee + totalFees;

    // Use schedule's configured currency, or fall back to tenant's default currency
    const tenantCurrency = await getTenantCurrency();
    const effectiveCurrency = schedule.registration_fee_currency || currency || tenantCurrency;

    return {
      registration_fee: registrationFee,
      xendit_fee: Math.round(xenditFee * 100) / 100,
      platform_fee: Math.round(platformFee * 100) / 100,
      total_fees: Math.round(totalFees * 100) / 100,
      total_charged: Math.round(totalCharged * 100) / 100,
      currency: effectiveCurrency,
      is_early_bird: !!isEarlyBird,
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

    if (config.platform_fee_min !== null && fee < config.platform_fee_min) {
      fee = config.platform_fee_min;
    }

    if (config.platform_fee_max !== null && fee > config.platform_fee_max) {
      fee = config.platform_fee_max;
    }

    return fee;
  }

  // ==================== PAYMENT CREATION ====================

  /**
   * Initiate a payment for a registration.
   * Creates a Xendit payment request and updates the registration record.
   */
  async initiatePayment(
    dto: CreateRegistrationPaymentDto,
    tenantId: string
  ): Promise<CreateRegistrationPaymentResult> {
    // Calculate fees
    const fees = await this.calculateFees(
      dto.schedule_id,
      tenantId,
      dto.payment_method_type
    );

    // Get schedule for the event name
    const schedule = await this.scheduleRepository.getById(dto.schedule_id, tenantId);
    if (!schedule) {
      throw new Error('Schedule not found');
    }

    // Generate a unique external ID for this payment
    const externalId = `reg_${dto.registration_id}_${Date.now()}`;

    // Get base URL for redirect URLs
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    // Get tenant's XenPlatform sub-account ID for routing payments
    const tenant = await this.tenantRepository.findById(tenantId);
    const subAccountId = tenant?.xendit_sub_account_id || undefined;
    const splitRuleId = process.env.XENDIT_SPLIT_RULE_ID || undefined;

    // Create Xendit payment request
    const paymentRequest = await this.xenditService.createDonationPaymentForSubAccount({
      donationId: dto.registration_id, // Using registration ID as the reference
      amount: fees.total_charged,
      currency: fees.currency,
      description: `Event Registration: ${schedule.name}`,
      paymentMethodType: this.toXenditPaymentMethodType(dto.payment_method_type),
      channelCode: dto.channel_code,
      successUrl: `${baseUrl}/register/success?registration_id=${dto.registration_id}`,
      failureUrl: `${baseUrl}/register/failed?registration_id=${dto.registration_id}`,
      metadata: {
        payment_type: 'event_registration',
        tenant_id: tenantId,
        registration_id: dto.registration_id,
        occurrence_id: dto.occurrence_id,
        schedule_id: dto.schedule_id,
        registration_fee: fees.registration_fee.toString(),
        xendit_fee: fees.xendit_fee.toString(),
        platform_fee: fees.platform_fee.toString(),
        is_early_bird: fees.is_early_bird ? 'true' : 'false',
      },
    }, subAccountId, splitRuleId);

    // Get payment action URL
    const paymentUrl = this.xenditService.getPaymentActionUrl(paymentRequest);

    // Update registration with payment details
    await this.registrationRepository.updateRegistration(dto.registration_id, {
      payment_status: 'pending',
      payment_amount: fees.registration_fee,
      xendit_fee: fees.xendit_fee,
      platform_fee: fees.platform_fee,
      total_charged: fees.total_charged,
      payment_currency: fees.currency,
      xendit_payment_request_id: paymentRequest.id,
      external_id: externalId,
      payment_method_type: dto.payment_method_type,
      payment_url: paymentUrl,
      payment_expires_at: paymentRequest.expires_at || null,
    }, tenantId);

    return {
      registration_id: dto.registration_id,
      payment_url: paymentUrl,
      expires_at: paymentRequest.expires_at || null,
      amount: fees.total_charged,
      is_early_bird: fees.is_early_bird,
    };
  }

  /**
   * Convert payment method type to Xendit format
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

  // ==================== PAYMENT STATUS MANAGEMENT ====================

  /**
   * Process successful payment (called by webhook handler).
   * Updates registration status and creates income transaction.
   */
  async processSuccessfulPayment(
    registrationId: string,
    tenantId: string,
    xenditPaymentId: string,
    paymentMethodMasked?: string
  ): Promise<void> {
    // Update registration payment status
    await this.registrationRepository.updateRegistration(registrationId, {
      payment_status: 'paid',
      xendit_payment_id: xenditPaymentId,
      paid_at: new Date().toISOString(),
    }, tenantId);

    // Get the registration with full details for transaction creation
    const registration = await this.registrationRepository.getById(registrationId, tenantId);
    if (!registration) {
      console.error(`Registration ${registrationId} not found after payment success`);
      return;
    }

    // Create income transaction
    await this.createIncomeTransaction(registration, tenantId);

    console.log(`[ScheduleRegistrationPaymentService] Successfully processed payment for registration ${registrationId}`);
  }

  /**
   * Process failed payment
   */
  async processFailedPayment(
    registrationId: string,
    tenantId: string,
    failureReason?: string
  ): Promise<void> {
    await this.registrationRepository.updateRegistration(registrationId, {
      payment_status: 'failed',
      admin_notes: failureReason ? `Payment failed: ${failureReason}` : 'Payment failed',
    }, tenantId);

    console.log(`[ScheduleRegistrationPaymentService] Payment failed for registration ${registrationId}: ${failureReason || 'Unknown reason'}`);
  }

  /**
   * Process expired payment
   */
  async processExpiredPayment(
    registrationId: string,
    tenantId: string
  ): Promise<void> {
    await this.registrationRepository.updateRegistration(registrationId, {
      payment_status: 'expired',
    }, tenantId);

    console.log(`[ScheduleRegistrationPaymentService] Payment expired for registration ${registrationId}`);
  }

  // ==================== FINANCIAL TRANSACTION INTEGRATION ====================

  /**
   * Create income transaction for completed registration payment.
   * Records the registration fee as income.
   */
  private async createIncomeTransaction(
    registration: {
      id: string;
      tenant_id: string;
      member_id?: string | null;
      payment_amount?: number | null;
      total_charged?: number | null;
      payment_currency?: string | null;
      xendit_payment_id?: string | null;
      guest_name?: string | null;
      guest_email?: string | null;
    },
    tenantId: string
  ): Promise<void> {
    console.log(`[ScheduleRegistrationPaymentService] Creating income transaction for registration ${registration.id}`, {
      payment_amount: registration.payment_amount,
      total_charged: registration.total_charged,
      tenantId,
    });

    if (!registration.payment_amount) {
      console.warn(`[ScheduleRegistrationPaymentService] Registration ${registration.id} has no payment amount, skipping financial transaction`);
      return;
    }

    try {
      // Determine the account for the transaction
      let accountId: string | null = null;

      if (registration.member_id) {
        const { data: memberAccounts } = await this.accountService.findAll({
          filters: {
            tenant_id: { operator: 'eq', value: tenantId },
            member_id: { operator: 'eq', value: registration.member_id },
          },
        });

        if (memberAccounts && memberAccounts.length > 0) {
          accountId = memberAccounts[0].id;
        }
      }

      // Fall back to church organization account
      if (!accountId) {
        accountId = await this.getChurchAccountId(tenantId);
      }

      console.log(`[ScheduleRegistrationPaymentService] Resolved accountId: ${accountId}`);

      // Get or create event registration income source
      const sourceId = await this.getEventRegistrationSourceId(tenantId);
      console.log(`[ScheduleRegistrationPaymentService] Resolved sourceId: ${sourceId}`);

      // Get the event registration income category
      const categoryId = await this.getEventRegistrationCategoryId(tenantId);
      console.log(`[ScheduleRegistrationPaymentService] Resolved categoryId: ${categoryId}`);

      // Resolve COA IDs
      let sourceCOAId: string | null = null;
      let categoryCOAId: string | null = null;

      if (sourceId) {
        const { data: sources } = await this.sourceRepository.findAll({
          filters: {
            id: { operator: 'eq', value: sourceId },
            tenant_id: { operator: 'eq', value: tenantId },
          },
        });
        const source = sources?.[0] || null;
        sourceCOAId = source?.coa_id || null;
      }

      if (categoryId) {
        const { data: categories } = await this.categoryRepository.findAll({
          filters: {
            id: { operator: 'eq', value: categoryId },
            tenant_id: { operator: 'eq', value: tenantId },
          },
        });
        const category = categories?.[0] || null;
        categoryCOAId = category?.chart_of_account_id || null;
      }

      // Build transaction description
      const registrantName = registration.guest_name || 'Member';
      const transactionDescription = `Event Registration Payment from ${registrantName}`;

      // Build line description with details
      const lineDescription = [
        `Registrant: ${registrantName}`,
        registration.guest_email ? `Email: ${registration.guest_email}` : null,
        `Event registration payment via Xendit`,
        `Total charged: ${registration.payment_currency || 'PHP'} ${registration.total_charged}`,
      ].filter(Boolean).join('. ');

      // Create income transaction
      const transactionResult = await this.transactionService.create(
        {
          tenant_id: tenantId,
          transaction_date: new Date().toISOString(),
          description: transactionDescription,
          source_id: sourceId || undefined,
          status: 'posted',
        },
        [
          {
            transaction_type: 'income',
            amount: registration.payment_amount, // Record the registration fee (church receives this)
            description: lineDescription,
            category_id: categoryId ?? null,
            account_id: accountId ?? null,
            source_id: sourceId ?? null,
            source_coa_id: sourceCOAId ?? null,
            category_coa_id: categoryCOAId ?? null,
            fund_id: null,
          },
        ]
      );

      console.log(`[ScheduleRegistrationPaymentService] Created income transaction ${transactionResult?.id} for registration ${registration.id}`);
    } catch (error) {
      console.error('Failed to create financial transaction for registration payment', {
        registrationId: registration.id,
        error,
      });
      // Don't throw - registration is still valid even if transaction fails
    }
  }

  /**
   * Get the church organization account ID
   */
  private async getChurchAccountId(tenantId: string): Promise<string | null> {
    try {
      const { data: accounts } = await this.accountService.findAll({
        filters: {
          tenant_id: { operator: 'eq', value: tenantId },
          account_type: { operator: 'eq', value: 'organization' },
        },
      });

      return accounts?.[0]?.id || null;
    } catch (error) {
      console.error('[ScheduleRegistrationPaymentService] Failed to get church account ID:', error);
      return null;
    }
  }

  /**
   * Get or create the Event Registration financial source ID
   */
  private async getEventRegistrationSourceId(tenantId: string): Promise<string | undefined> {
    try {
      // Try to find existing "Event Registration" source
      const { data: sources } = await this.sourceRepository.findAll({
        filters: {
          tenant_id: { operator: 'eq', value: tenantId },
          name: { operator: 'eq', value: 'Event Registration' },
        },
      });

      if (sources && sources.length > 0) {
        return sources[0].id;
      }

      // Fall back to using the Online Giving source if Event Registration doesn't exist
      return await this.donationConfigService.getOnlineGivingSourceId(tenantId);
    } catch (error) {
      console.error('[ScheduleRegistrationPaymentService] Failed to get Event Registration source ID:', error);
      return undefined;
    }
  }

  /**
   * Get the Event Registration income category ID
   */
  private async getEventRegistrationCategoryId(tenantId: string): Promise<string | undefined> {
    try {
      // Try to find existing "Event Fees" or similar category
      const { data: categories } = await this.categoryRepository.findAll({
        filters: {
          tenant_id: { operator: 'eq', value: tenantId },
        },
      });

      // Look for a category that matches event-related income
      const eventCategory = categories?.find(c =>
        c.name?.toLowerCase().includes('event') ||
        c.name?.toLowerCase().includes('registration') ||
        c.name?.toLowerCase().includes('fees')
      );

      if (eventCategory) {
        return eventCategory.id;
      }

      // Fall back to first income category
      const incomeCategory = categories?.find(c => c.type === 'income_transaction');
      return incomeCategory?.id;
    } catch (error) {
      console.error('[ScheduleRegistrationPaymentService] Failed to get Event Registration category ID:', error);
      return undefined;
    }
  }

  // ==================== REFUND HANDLING ====================

  /**
   * Process a refund for a registration payment
   */
  async processRefund(
    registrationId: string,
    tenantId: string,
    reason?: string
  ): Promise<void> {
    const registration = await this.registrationRepository.getById(registrationId, tenantId);
    if (!registration) {
      throw new Error('Registration not found');
    }

    if (registration.payment_status !== 'paid') {
      throw new Error('Cannot refund a registration that has not been paid');
    }

    // TODO: Implement Xendit refund via xenditService.createRefund()
    // For now, just update the status

    await this.registrationRepository.updateRegistration(registrationId, {
      payment_status: 'refunded',
      admin_notes: reason ? `Refunded: ${reason}` : 'Payment refunded',
    }, tenantId);

    // TODO: Create a reversal transaction for the refund

    console.log(`[ScheduleRegistrationPaymentService] Refunded payment for registration ${registrationId}`);
  }

  // ==================== UTILITY METHODS ====================

  /**
   * Get registration by Xendit payment request ID
   */
  async getRegistrationByPaymentRequestId(
    paymentRequestId: string,
    tenantId: string
  ): Promise<{ id: string; tenant_id: string } | null> {
    return await this.registrationRepository.getByPaymentRequestId(paymentRequestId, tenantId);
  }
}
