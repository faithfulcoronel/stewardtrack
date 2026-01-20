import 'server-only';
import 'reflect-metadata';
import { injectable, inject } from 'inversify';
import { TYPES } from '@/lib/types';
import type { IDonationRepository } from '@/repositories/donation.repository';
import type { IDonationFeeConfigRepository } from '@/repositories/donationFeeConfig.repository';
import type { IRecurringChargeHistoryRepository } from '@/repositories/recurringChargeHistory.repository';
import type { XenditService } from '@/services/XenditService';
import type { EncryptionService } from '@/lib/encryption/EncryptionService';
import type {
  Donation,
  RecurringStatus,
  RecurringChargeHistory,
  CreateRecurringChargeHistoryDto,
  ProcessRecurringDonationsResult,
  RecurringChargeResult,
  RecurringDonationSummary,
  PaymentMethodType,
} from '@/models/donation.model';
import type { DonationFeeConfig } from '@/models/donationFeeConfig.model';

/**
 * RecurringDonationService
 *
 * Handles recurring donation management including:
 * - Processing due recurring donations (batch charging)
 * - Managing recurring subscription status (pause/resume/cancel)
 * - Tracking charge history and failures
 * - Retry logic for failed payments
 */
@injectable()
export class RecurringDonationService {
  constructor(
    @inject(TYPES.IDonationRepository) private donationRepository: IDonationRepository,
    @inject(TYPES.IDonationFeeConfigRepository) private feeConfigRepository: IDonationFeeConfigRepository,
    @inject(TYPES.IRecurringChargeHistoryRepository) private chargeHistoryRepository: IRecurringChargeHistoryRepository,
    @inject(TYPES.XenditService) private xenditService: XenditService,
    @inject(TYPES.EncryptionService) private encryptionService: EncryptionService
  ) {}

  // ==================== RECURRING DONATION PROCESSING ====================

  /**
   * Process all recurring donations due for a tenant
   * This is called by the cron job to charge recurring donations
   *
   * @param tenantId Tenant to process
   * @param processDate Date to process (default: today)
   * @returns Summary of processed donations
   */
  async processRecurringDonationsForTenant(
    tenantId: string,
    processDate: string = new Date().toISOString().split('T')[0]
  ): Promise<ProcessRecurringDonationsResult> {
    console.log(`[RecurringDonationService] Processing recurring donations for tenant ${tenantId} on ${processDate}`);

    // Get all recurring donations due for charging
    const dueDonations = await this.donationRepository.getRecurringDonationsDue(tenantId, processDate);

    console.log(`[RecurringDonationService] Found ${dueDonations.length} recurring donations due`);

    const results: RecurringChargeResult[] = [];
    let successful = 0;
    let failed = 0;
    let skipped = 0;

    // Process each donation
    for (const donation of dueDonations) {
      try {
        // Skip if no payment token
        if (!donation.recurring_payment_token_id) {
          console.warn(`[RecurringDonationService] Donation ${donation.id} has no payment token, skipping`);
          results.push({
            recurring_donation_id: donation.id,
            child_donation_id: null,
            status: 'skipped',
            amount: donation.amount,
            currency: donation.currency,
            error_message: 'No payment token available',
          });
          skipped++;
          continue;
        }

        const result = await this.chargeRecurringDonation(donation, tenantId);
        results.push(result);

        if (result.status === 'succeeded') {
          successful++;
        } else if (result.status === 'failed') {
          failed++;
        } else {
          skipped++;
        }
      } catch (error) {
        console.error(`[RecurringDonationService] Error processing donation ${donation.id}:`, error);
        results.push({
          recurring_donation_id: donation.id,
          child_donation_id: null,
          status: 'failed',
          amount: donation.amount,
          currency: donation.currency,
          error_message: error instanceof Error ? error.message : 'Unknown error',
        });
        failed++;
      }
    }

    const summary: ProcessRecurringDonationsResult = {
      tenant_id: tenantId,
      process_date: processDate,
      total_processed: dueDonations.length,
      successful,
      failed,
      skipped,
      results,
    };

    console.log(`[RecurringDonationService] Processing complete:`, {
      total: summary.total_processed,
      successful: summary.successful,
      failed: summary.failed,
      skipped: summary.skipped,
    });

    return summary;
  }

  /**
   * Charge a single recurring donation
   * Creates a child donation record and charges via Xendit
   *
   * @param parentDonation The recurring parent donation
   * @param tenantId Tenant ID
   * @returns Charge result
   */
  async chargeRecurringDonation(
    parentDonation: Donation,
    tenantId: string
  ): Promise<RecurringChargeResult> {
    console.log(`[RecurringDonationService] Charging recurring donation ${parentDonation.id}`);

    // Get fee configuration
    const feeConfig = await this.feeConfigRepository.getConfigByTenantId(tenantId);

    // Calculate fees for this charge
    const fees = this.calculateFees(
      parentDonation.amount,
      parentDonation.payment_method_type || 'card',
      feeConfig
    );

    // Get current attempt number
    const attemptCount = await this.chargeHistoryRepository.getAttemptCount(
      parentDonation.id,
      parentDonation.recurring_next_date!
    );
    const attemptNumber = attemptCount + 1;

    // Create charge history record (processing status)
    const chargeHistoryData: CreateRecurringChargeHistoryDto = {
      tenant_id: tenantId,
      recurring_donation_id: parentDonation.id,
      attempt_number: attemptNumber,
      scheduled_date: parentDonation.recurring_next_date!,
      amount: parentDonation.amount,
      currency: parentDonation.currency,
      status: 'processing',
    };

    const chargeHistory = await this.chargeHistoryRepository.create(chargeHistoryData);

    try {
      // Create child donation record (pending status)
      const childDonationData: Partial<Donation> = {
        tenant_id: tenantId,
        member_id: parentDonation.member_id,
        xendit_customer_id: parentDonation.xendit_customer_id,
        donor_name_encrypted: parentDonation.donor_name_encrypted,
        donor_email_encrypted: parentDonation.donor_email_encrypted,
        donor_phone_encrypted: parentDonation.donor_phone_encrypted,
        amount: parentDonation.amount,
        currency: parentDonation.currency,
        category_id: parentDonation.category_id,
        fund_id: parentDonation.fund_id,
        campaign_id: parentDonation.campaign_id,
        xendit_fee: fees.xendit_fee,
        platform_fee: fees.platform_fee,
        total_charged: fees.total_charged,
        payment_method_type: parentDonation.payment_method_type,
        status: 'pending',
        is_recurring: false, // Child donations are not recurring themselves
        recurring_parent_id: parentDonation.id,
        anonymous: parentDonation.anonymous,
        source: 'recurring',
        terms_accepted: true, // Inherited from parent
        terms_accepted_at: new Date().toISOString(),
        terms_version: parentDonation.terms_version,
      };

      const childDonation = await this.donationRepository.createDonation(childDonationData, tenantId);

      // Charge the saved payment method via Xendit
      const paymentResult = await this.xenditService.chargePaymentMethod({
        paymentMethodId: parentDonation.recurring_payment_token_id!,
        amount: fees.total_charged,
        currency: parentDonation.currency,
        referenceId: childDonation.id,
        customerId: parentDonation.xendit_customer_id || undefined,
        description: `Recurring donation - ${parentDonation.currency} ${parentDonation.amount}`,
        metadata: {
          tenant_id: tenantId,
          donation_id: childDonation.id,
          parent_donation_id: parentDonation.id,
          payment_type: 'recurring',
        },
      });

      // Check payment status
      if (paymentResult.status === 'SUCCEEDED') {
        // Payment successful - update child donation
        await this.donationRepository.updateDonationStatus(childDonation.id, 'paid', tenantId, {
          xendit_payment_request_id: paymentResult.id,
          xendit_payment_id: paymentResult.payment_method?.id,
          paid_at: new Date().toISOString(),
        });

        // Update charge history as succeeded
        await this.chargeHistoryRepository.update(chargeHistory.id, {
          status: 'succeeded',
          child_donation_id: childDonation.id,
          xendit_payment_request_id: paymentResult.id,
          xendit_payment_id: paymentResult.payment_method?.id,
        });

        // Update parent donation (next date, reset failure count)
        await this.chargeHistoryRepository.updateRecurringDonationAfterCharge(
          parentDonation.id,
          true,
          childDonation.id
        );

        return {
          recurring_donation_id: parentDonation.id,
          child_donation_id: childDonation.id,
          status: 'succeeded',
          amount: parentDonation.amount,
          currency: parentDonation.currency,
        };
      } else if (paymentResult.status === 'PENDING' || paymentResult.status === 'REQUIRES_ACTION') {
        // Payment is pending (may need 3DS or async processing)
        // Update child donation with payment request ID
        await this.donationRepository.updateDonation(childDonation.id, {
          xendit_payment_request_id: paymentResult.id,
        }, tenantId);

        // Update charge history
        await this.chargeHistoryRepository.update(chargeHistory.id, {
          status: 'pending',
          child_donation_id: childDonation.id,
          xendit_payment_request_id: paymentResult.id,
        });

        // Note: The webhook will handle the final status update
        return {
          recurring_donation_id: parentDonation.id,
          child_donation_id: childDonation.id,
          status: 'succeeded', // Mark as succeeded for processing purposes
          amount: parentDonation.amount,
          currency: parentDonation.currency,
        };
      } else {
        // Payment failed
        throw new Error(`Payment failed with status: ${paymentResult.status}`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorCode = (error as any)?.error_code || 'CHARGE_FAILED';

      console.error(`[RecurringDonationService] Charge failed for donation ${parentDonation.id}:`, error);

      // Update charge history as failed
      await this.chargeHistoryRepository.update(chargeHistory.id, {
        status: 'failed',
        error_code: errorCode,
        error_message: errorMessage,
        retry_scheduled_at: this.calculateRetryDate(attemptNumber),
      });

      // Update parent donation failure count
      await this.chargeHistoryRepository.updateRecurringDonationAfterCharge(
        parentDonation.id,
        false
      );

      return {
        recurring_donation_id: parentDonation.id,
        child_donation_id: null,
        status: 'failed',
        amount: parentDonation.amount,
        currency: parentDonation.currency,
        error_code: errorCode,
        error_message: errorMessage,
      };
    }
  }

  // ==================== SUBSCRIPTION MANAGEMENT ====================

  /**
   * Pause a recurring donation
   */
  async pauseRecurringDonation(donationId: string, tenantId: string): Promise<Donation> {
    console.log(`[RecurringDonationService] Pausing recurring donation ${donationId}`);

    const donation = await this.donationRepository.getDonationWithDetails(donationId, tenantId);
    if (!donation) {
      throw new Error('Recurring donation not found');
    }

    if (!donation.is_recurring) {
      throw new Error('This is not a recurring donation');
    }

    if (donation.recurring_status === 'paused') {
      throw new Error('Recurring donation is already paused');
    }

    if (donation.recurring_status === 'cancelled') {
      throw new Error('Cannot pause a cancelled recurring donation');
    }

    return await this.donationRepository.updateDonation(donationId, {
      recurring_status: 'paused',
      recurring_paused_at: new Date().toISOString(),
    }, tenantId);
  }

  /**
   * Resume a paused recurring donation
   */
  async resumeRecurringDonation(donationId: string, tenantId: string): Promise<Donation> {
    console.log(`[RecurringDonationService] Resuming recurring donation ${donationId}`);

    const donation = await this.donationRepository.getDonationWithDetails(donationId, tenantId);
    if (!donation) {
      throw new Error('Recurring donation not found');
    }

    if (!donation.is_recurring) {
      throw new Error('This is not a recurring donation');
    }

    if (donation.recurring_status !== 'paused') {
      throw new Error('Recurring donation is not paused');
    }

    // Calculate new next date if the old one has passed
    let nextDate = donation.recurring_next_date;
    const today = new Date().toISOString().split('T')[0];

    if (!nextDate || nextDate < today) {
      nextDate = await this.chargeHistoryRepository.calculateNextRecurringDate(
        today,
        donation.recurring_frequency || 'monthly'
      );
    }

    return await this.donationRepository.updateDonation(donationId, {
      recurring_status: 'active',
      recurring_paused_at: null,
      recurring_next_date: nextDate,
      recurring_failure_count: 0, // Reset failure count on resume
    }, tenantId);
  }

  /**
   * Cancel a recurring donation
   */
  async cancelRecurringDonation(donationId: string, tenantId: string, reason?: string): Promise<Donation> {
    console.log(`[RecurringDonationService] Cancelling recurring donation ${donationId}`);

    const donation = await this.donationRepository.getDonationWithDetails(donationId, tenantId);
    if (!donation) {
      throw new Error('Recurring donation not found');
    }

    if (!donation.is_recurring) {
      throw new Error('This is not a recurring donation');
    }

    if (donation.recurring_status === 'cancelled') {
      throw new Error('Recurring donation is already cancelled');
    }

    // Optionally expire the payment method in Xendit
    if (donation.recurring_payment_token_id) {
      try {
        await this.xenditService.expirePaymentMethod(donation.recurring_payment_token_id);
      } catch (error) {
        console.warn(`[RecurringDonationService] Failed to expire payment method:`, error);
        // Continue with cancellation even if this fails
      }
    }

    return await this.donationRepository.updateDonation(donationId, {
      recurring_status: 'cancelled',
      recurring_cancelled_at: new Date().toISOString(),
      notes: reason ? `Cancelled: ${reason}` : donation.notes,
    }, tenantId);
  }

  // ==================== QUERY METHODS ====================

  /**
   * Get all recurring donations for a member
   */
  async getMemberRecurringDonations(
    memberId: string,
    tenantId: string,
    status?: RecurringStatus
  ): Promise<Donation[]> {
    // Use donation repository's findByMemberId and filter
    const allDonations = await this.donationRepository.findByMemberId(memberId, tenantId);

    // Filter for recurring donations
    let recurring = allDonations.filter(d => d.is_recurring && !d.recurring_parent_id);

    // Filter by status if provided
    if (status) {
      recurring = recurring.filter(d => d.recurring_status === status);
    }

    return recurring;
  }

  /**
   * Get recurring donation summary for a member (with totals)
   */
  async getMemberRecurringSummary(
    memberId: string,
    tenantId: string
  ): Promise<RecurringDonationSummary[]> {
    // Get recurring donations
    const donations = await this.getMemberRecurringDonations(memberId, tenantId);

    if (donations.length === 0) {
      return [];
    }

    const summaries: RecurringDonationSummary[] = [];

    for (const donation of donations) {
      // Get charge counts and totals
      const totalCharges = await this.chargeHistoryRepository.countSuccessful(donation.id);
      const totalAmount = await this.chargeHistoryRepository.sumSuccessfulAmount(donation.id);

      summaries.push({
        id: donation.id,
        amount: donation.amount,
        currency: donation.currency,
        frequency: donation.recurring_frequency || 'monthly',
        status: donation.recurring_status || 'active',
        next_charge_date: donation.recurring_next_date,
        last_charge_date: donation.recurring_last_charge_at || null,
        failure_count: donation.recurring_failure_count || 0,
        category_name: donation.category?.name || null,
        fund_name: donation.fund?.name || null,
        campaign_name: donation.campaign?.name || null,
        created_at: donation.created_at || new Date().toISOString(),
        total_charges: totalCharges,
        total_amount_donated: totalAmount,
      });
    }

    return summaries;
  }

  /**
   * Get charge history for a recurring donation
   */
  async getChargeHistory(
    donationId: string,
    tenantId: string
  ): Promise<RecurringChargeHistory[]> {
    return await this.chargeHistoryRepository.findByRecurringDonationId(donationId, tenantId);
  }

  // ==================== HELPER METHODS ====================

  /**
   * Calculate fees for recurring charge
   */
  private calculateFees(
    amount: number,
    paymentMethodType: PaymentMethodType,
    config: DonationFeeConfig
  ): { xendit_fee: number; platform_fee: number; total_charged: number } {
    // Calculate Xendit fee based on payment method
    let xenditFee = 0;
    switch (paymentMethodType) {
      case 'card':
        xenditFee = (amount * config.xendit_card_fee_percentage / 100) + config.xendit_card_fee_fixed;
        break;
      case 'ewallet':
        xenditFee = (amount * config.xendit_ewallet_fee_percentage / 100) + config.xendit_ewallet_fee_fixed;
        break;
      case 'bank_transfer':
        xenditFee = config.xendit_bank_fee_fixed;
        break;
      case 'direct_debit':
        xenditFee = (amount * config.xendit_direct_debit_fee_percentage / 100) + config.xendit_direct_debit_fee_fixed;
        break;
      default:
        xenditFee = (amount * config.xendit_card_fee_percentage / 100) + config.xendit_card_fee_fixed;
    }

    // Calculate platform fee
    let platformFee = 0;
    switch (config.platform_fee_type) {
      case 'percentage':
        platformFee = amount * config.platform_fee_percentage / 100;
        break;
      case 'fixed':
        platformFee = config.platform_fee_fixed;
        break;
      case 'hybrid':
        platformFee = (amount * config.platform_fee_percentage / 100) + config.platform_fee_fixed;
        break;
    }

    // Apply min/max caps
    if (config.platform_fee_min !== null && platformFee < config.platform_fee_min) {
      platformFee = config.platform_fee_min;
    }
    if (config.platform_fee_max !== null && platformFee > config.platform_fee_max) {
      platformFee = config.platform_fee_max;
    }

    return {
      xendit_fee: Math.round(xenditFee * 100) / 100,
      platform_fee: Math.round(platformFee * 100) / 100,
      total_charged: Math.round((amount + xenditFee + platformFee) * 100) / 100,
    };
  }

  /**
   * Calculate retry date for failed charges
   * Exponential backoff: 1 day, 3 days, 7 days
   */
  private calculateRetryDate(attemptNumber: number): string | null {
    if (attemptNumber >= 3) {
      return null; // No more retries after 3 attempts
    }

    const daysToAdd = attemptNumber === 1 ? 1 : attemptNumber === 2 ? 3 : 7;
    const retryDate = new Date();
    retryDate.setDate(retryDate.getDate() + daysToAdd);

    return retryDate.toISOString();
  }
}
