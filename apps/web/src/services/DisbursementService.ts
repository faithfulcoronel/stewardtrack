/**
 * ================================================================================
 * DISBURSEMENT SERVICE
 * ================================================================================
 *
 * Handles automated payout/disbursement of funds to tenant bank accounts via Xendit.
 *
 * With XenPlatform Integration:
 * - Bank account details stored in financial_sources (encrypted)
 * - Payouts made from tenant's sub-account balance using for-user-id header
 *
 * Key Operations:
 * - Create disbursement from pending donations
 * - Process disbursement via Xendit Payout API (with XenPlatform sub-account)
 * - Track disbursement status and history
 * - Handle scheduled (daily/weekly/monthly) disbursements
 *
 * ================================================================================
 */

import { injectable, inject } from 'inversify';
import 'reflect-metadata';
import { TYPES } from '@/lib/types';
import type { IDisbursementRepository } from '@/repositories/disbursement.repository';
import type { ITenantRepository } from '@/repositories/tenant.repository';
import type { XenditService } from '@/services/XenditService';
import type { FinancialSourceService } from '@/services/FinancialSourceService';
import type {
  Disbursement,
  CreateDisbursementDto,
  DisbursementResult,
  DisbursementSummary,
  PayoutEnabledSource,
  DisbursementTrigger,
} from '@/models/disbursement.model';

/**
 * Result of processing disbursements for a tenant
 */
export interface ProcessDisbursementsResult {
  tenant_id: string;
  disbursements_created: number;
  disbursements_processed: number;
  disbursements_failed: number;
  total_amount: number;
  results: DisbursementResult[];
}

@injectable()
export class DisbursementService {
  constructor(
    @inject(TYPES.IDisbursementRepository)
    private disbursementRepository: IDisbursementRepository,
    @inject(TYPES.ITenantRepository)
    private tenantRepository: ITenantRepository,
    @inject(TYPES.XenditService)
    private xenditService: XenditService,
    @inject(TYPES.FinancialSourceService)
    private financialSourceService: FinancialSourceService
  ) {}

  /**
   * Create a disbursement for a tenant's pending donations
   */
  async createDisbursement(
    tenantId: string,
    sourceId: string,
    periodStart: string,
    periodEnd: string,
    triggeredBy: DisbursementTrigger = 'manual',
    createdBy?: string
  ): Promise<Disbursement> {
    console.log(`[DisbursementService] Creating disbursement for tenant ${tenantId}, period ${periodStart} to ${periodEnd}`);

    // Get the financial source with payout config
    const sources = await this.disbursementRepository.getPayoutEnabledSources(tenantId);
    const source = sources.find(s => s.id === sourceId);

    if (!source) {
      throw new Error('Financial source not found or not configured for payouts');
    }

    // Check for XenPlatform fields (preferred) or legacy xendit_payout_channel_id
    const hasXenPlatformConfig = source.is_donation_destination && source.xendit_channel_code;
    const hasLegacyConfig = !!source.xendit_payout_channel_id;

    if (!hasXenPlatformConfig && !hasLegacyConfig) {
      throw new Error('Financial source does not have payout configuration. Please configure bank details for disbursements.');
    }

    // Get donations ready for disbursement
    const donations = await this.disbursementRepository.getDonationsForDisbursement(
      tenantId,
      periodStart,
      periodEnd
    );

    if (donations.length === 0) {
      throw new Error('No donations found for the specified period');
    }

    // Calculate total
    const totalNetAmount = donations.reduce((sum, d) => sum + d.net_amount, 0);

    // Check minimum amount
    if (source.disbursement_minimum_amount && totalNetAmount < source.disbursement_minimum_amount) {
      throw new Error(
        `Total amount (${totalNetAmount}) is below minimum disbursement amount (${source.disbursement_minimum_amount})`
      );
    }

    // Create disbursement record
    // For XenPlatform: xendit_payout_channel_id may be null (we use xendit_channel_code instead for payouts)
    // For Legacy: xendit_payout_channel_id is the Xendit Dashboard managed channel
    const createDto: CreateDisbursementDto = {
      tenant_id: tenantId,
      financial_source_id: sourceId,
      xendit_payout_channel_id: source.xendit_payout_channel_id || source.xendit_channel_code || undefined,
      xendit_payout_channel_type: source.xendit_payout_channel_type || undefined,
      period_start: periodStart,
      period_end: periodEnd,
      triggered_by: triggeredBy,
      created_by: createdBy,
    };

    const disbursement = await this.disbursementRepository.createDisbursement(createDto);

    // Link donations to disbursement
    await this.disbursementRepository.addDonationsToDisbursement(
      disbursement.id,
      donations.map(d => ({
        donation_id: d.donation_id,
        donation_amount: d.amount,
        xendit_fee: d.xendit_fee,
        platform_fee: d.platform_fee,
        net_amount: d.net_amount,
      }))
    );

    // Mark donations as disbursed
    const donationIds = donations.map(d => d.donation_id);
    await this.disbursementRepository.markDonationsAsDisbursed(disbursement.id, donationIds);

    // Fetch updated disbursement with totals
    const updatedDisbursement = await this.disbursementRepository.findById(disbursement.id, tenantId);

    console.log(`[DisbursementService] Created disbursement ${disbursement.id} with ${donations.length} donations, net amount: ${totalNetAmount}`);

    return updatedDisbursement || disbursement;
  }

  /**
   * Process a pending disbursement via Xendit Payout API
   * Uses XenPlatform sub-account (for-user-id header) to payout from sub-account balance
   */
  async processDisbursement(disbursementId: string, tenantId: string): Promise<DisbursementResult> {
    console.log(`[DisbursementService] Processing disbursement ${disbursementId}`);

    const disbursement = await this.disbursementRepository.findById(disbursementId, tenantId);

    if (!disbursement) {
      throw new Error('Disbursement not found');
    }

    if (disbursement.status !== 'pending') {
      throw new Error(`Disbursement is not pending (current status: ${disbursement.status})`);
    }

    if (disbursement.net_amount <= 0) {
      throw new Error('Disbursement has no amount to process');
    }

    try {
      // Get tenant's XenPlatform sub-account ID
      const tenant = await this.tenantRepository.findById(tenantId);
      const subAccountId = tenant?.xendit_sub_account_id;

      if (!subAccountId) {
        throw new Error('Tenant does not have a XenPlatform sub-account configured');
      }

      // Get the donation destination with bank details
      const donationDest = await this.financialSourceService.getDonationDestination(tenantId);

      if (!donationDest) {
        throw new Error('No donation destination configured. Please configure payout bank account.');
      }

      if (!donationDest.xendit_channel_code || !donationDest.bank_account_holder_name) {
        throw new Error('Donation destination bank details not configured');
      }

      // Decrypt bank account number
      const bankAccountNumber = await this.financialSourceService.getDecryptedBankAccountNumber(
        donationDest.id,
        tenantId
      );

      if (!bankAccountNumber) {
        throw new Error('Bank account number not found or could not be decrypted');
      }

      // Update status to processing
      await this.disbursementRepository.updateDisbursementStatus(
        disbursementId,
        'processing'
      );

      // Call Xendit Payout API with sub-account (for-user-id header)
      // This pays out FROM the sub-account balance TO the bank account
      const payoutResult = await this.xenditService.createPayoutForSubAccount({
        externalId: disbursementId,
        amount: disbursement.net_amount,
        channelCode: donationDest.xendit_channel_code,
        channelProperties: {
          account_holder_name: donationDest.bank_account_holder_name,
          account_number: bankAccountNumber,
        },
        currency: disbursement.currency,
        description: `Disbursement for period ${disbursement.period_start} to ${disbursement.period_end}`,
        referenceId: `disbursement_${disbursementId}`,
      }, subAccountId);

      // Update status to succeeded
      await this.disbursementRepository.updateDisbursementStatus(
        disbursementId,
        'succeeded',
        payoutResult.id
      );

      // Update last_disbursement_at on the financial source
      await this.financialSourceService.update(donationDest.id, {
        last_disbursement_at: new Date().toISOString(),
      });

      console.log(`[DisbursementService] Disbursement ${disbursementId} processed successfully, Xendit ID: ${payoutResult.id}`);

      return {
        disbursement_id: disbursementId,
        status: 'succeeded',
        xendit_disbursement_id: payoutResult.id,
        amount: disbursement.net_amount,
        donations_count: disbursement.donations_count,
        error_code: null,
        error_message: null,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorCode = (error as any)?.code || 'PAYOUT_ERROR';

      console.error(`[DisbursementService] Error processing disbursement ${disbursementId}:`, errorMessage);

      // Update status to failed
      await this.disbursementRepository.updateDisbursementStatus(
        disbursementId,
        'failed',
        undefined,
        errorCode,
        errorMessage
      );

      return {
        disbursement_id: disbursementId,
        status: 'failed',
        xendit_disbursement_id: null,
        amount: disbursement.net_amount,
        donations_count: disbursement.donations_count,
        error_code: errorCode,
        error_message: errorMessage,
      };
    }
  }

  /**
   * Process scheduled disbursements for a tenant
   * Called by cron job
   */
  async processScheduledDisbursementsForTenant(
    tenantId: string,
    sourceId: string,
    schedule: 'daily' | 'weekly' | 'monthly'
  ): Promise<ProcessDisbursementsResult> {
    console.log(`[DisbursementService] Processing ${schedule} disbursements for tenant ${tenantId}`);

    const result: ProcessDisbursementsResult = {
      tenant_id: tenantId,
      disbursements_created: 0,
      disbursements_processed: 0,
      disbursements_failed: 0,
      total_amount: 0,
      results: [],
    };

    try {
      // Calculate period based on schedule
      const { periodStart, periodEnd } = this.calculatePeriod(schedule);

      // Get payout source
      const sources = await this.disbursementRepository.getPayoutEnabledSources(tenantId);
      const source = sources.find(s => s.id === sourceId);

      if (!source) {
        console.log(`[DisbursementService] Source ${sourceId} not found for tenant ${tenantId}`);
        return result;
      }

      // Check if there are donations to disburse
      const donations = await this.disbursementRepository.getDonationsForDisbursement(
        tenantId,
        periodStart,
        periodEnd
      );

      if (donations.length === 0) {
        console.log(`[DisbursementService] No donations to disburse for tenant ${tenantId}`);
        return result;
      }

      // Calculate total and check minimum
      const totalNetAmount = donations.reduce((sum, d) => sum + d.net_amount, 0);

      if (source.disbursement_minimum_amount && totalNetAmount < source.disbursement_minimum_amount) {
        console.log(
          `[DisbursementService] Total ${totalNetAmount} below minimum ${source.disbursement_minimum_amount} for tenant ${tenantId}`
        );
        return result;
      }

      // Create disbursement
      const disbursement = await this.createDisbursement(
        tenantId,
        sourceId,
        periodStart,
        periodEnd,
        'cron'
      );

      result.disbursements_created++;

      // Process disbursement
      const disbursementResult = await this.processDisbursement(disbursement.id, tenantId);
      result.results.push(disbursementResult);

      if (disbursementResult.status === 'succeeded') {
        result.disbursements_processed++;
        result.total_amount += disbursementResult.amount;
      } else {
        result.disbursements_failed++;
      }
    } catch (error) {
      console.error(`[DisbursementService] Error processing scheduled disbursements for tenant ${tenantId}:`, error);
    }

    return result;
  }

  /**
   * Get disbursement summary for a tenant
   */
  async getDisbursementSummary(tenantId: string): Promise<DisbursementSummary> {
    const disbursements = await this.disbursementRepository.findByTenant(tenantId);

    const succeeded = disbursements.filter(d => d.status === 'succeeded');
    const pending = disbursements.filter(d => d.status === 'pending');
    const failed = disbursements.filter(d => d.status === 'failed');

    const lastDisbursement = succeeded
      .filter(d => d.completed_at)
      .sort((a, b) => new Date(b.completed_at!).getTime() - new Date(a.completed_at!).getTime())[0];

    return {
      tenant_id: tenantId,
      total_disbursed: succeeded.reduce((sum, d) => sum + d.net_amount, 0),
      total_pending: pending.reduce((sum, d) => sum + d.net_amount, 0),
      total_failed: failed.reduce((sum, d) => sum + d.net_amount, 0),
      disbursement_count: disbursements.length,
      last_disbursement_at: lastDisbursement?.completed_at || null,
    };
  }

  /**
   * Get payout-enabled financial sources for a tenant
   */
  async getPayoutSources(tenantId: string): Promise<PayoutEnabledSource[]> {
    return await this.disbursementRepository.getPayoutEnabledSources(tenantId);
  }

  /**
   * Get disbursements by tenant
   */
  async getDisbursements(tenantId: string, status?: string): Promise<Disbursement[]> {
    const disbursementStatus = status as any;
    return await this.disbursementRepository.findByTenant(tenantId, disbursementStatus);
  }

  /**
   * Get a single disbursement
   */
  async getDisbursement(disbursementId: string, tenantId: string): Promise<Disbursement | null> {
    return await this.disbursementRepository.findById(disbursementId, tenantId);
  }

  /**
   * Get tenants with scheduled disbursements for cron processing
   */
  async getTenantsWithScheduledDisbursements(
    schedule: string
  ): Promise<Array<{ tenant_id: string; source_id: string }>> {
    return await this.disbursementRepository.getTenantsWithScheduledDisbursements(schedule);
  }

  /**
   * Calculate period dates based on schedule
   */
  private calculatePeriod(schedule: 'daily' | 'weekly' | 'monthly'): {
    periodStart: string;
    periodEnd: string;
  } {
    const now = new Date();
    let periodStart: Date;
    let periodEnd: Date;

    switch (schedule) {
      case 'daily':
        // Yesterday
        periodEnd = new Date(now);
        periodEnd.setDate(periodEnd.getDate() - 1);
        periodStart = new Date(periodEnd);
        break;

      case 'weekly':
        // Previous week (Monday to Sunday)
        periodEnd = new Date(now);
        // Go back to previous Sunday
        const dayOfWeek = periodEnd.getDay();
        periodEnd.setDate(periodEnd.getDate() - (dayOfWeek === 0 ? 7 : dayOfWeek));
        // Previous Monday
        periodStart = new Date(periodEnd);
        periodStart.setDate(periodStart.getDate() - 6);
        break;

      case 'monthly':
        // Previous month
        periodEnd = new Date(now.getFullYear(), now.getMonth(), 0); // Last day of previous month
        periodStart = new Date(now.getFullYear(), now.getMonth() - 1, 1); // First day of previous month
        break;

      default:
        // Default to yesterday
        periodEnd = new Date(now);
        periodEnd.setDate(periodEnd.getDate() - 1);
        periodStart = new Date(periodEnd);
    }

    return {
      periodStart: periodStart.toISOString().split('T')[0],
      periodEnd: periodEnd.toISOString().split('T')[0],
    };
  }
}
