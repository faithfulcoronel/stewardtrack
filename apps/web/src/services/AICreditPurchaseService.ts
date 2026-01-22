import { injectable, inject } from 'inversify';
import { TYPES } from '@/lib/types';
import {
  AICreditPurchase,
  AICreditPurchaseWithPackage,
  PurchaseResult,
  PurchaseHistoryOptions,
} from '@/models/aiCreditPurchase.model';
import type { IAICreditPurchaseRepository } from '@/repositories/aiCreditPurchase.repository';
import type { IAICreditPackageRepository } from '@/repositories/aiCreditPackage.repository';
import { AICreditService } from './AICreditService';
import { XenditService } from './XenditService';

/**
 * AI Credit Purchase Service
 * Orchestrates credit purchase workflow with Xendit payment integration
 */
@injectable()
export class AICreditPurchaseService {
  constructor(
    @inject(TYPES.IAICreditPurchaseRepository)
    private readonly purchaseRepository: IAICreditPurchaseRepository,
    @inject(TYPES.IAICreditPackageRepository)
    private readonly packageRepository: IAICreditPackageRepository,
    @inject(TYPES.AICreditService)
    private readonly creditService: AICreditService,
    @inject(TYPES.XenditService)
    private readonly xenditService: XenditService
  ) {}

  /**
   * Create a credit purchase and return Xendit payment URL
   */
  async createPurchase(
    tenantId: string,
    packageId: string,
    userEmail: string,
    userName: string,
    successUrl: string,
    failureUrl: string
  ): Promise<PurchaseResult> {
    // 1. Get package details
    const pkg = await this.packageRepository.findById(packageId);

    if (!pkg) {
      throw new Error('Package not found');
    }

    if (!pkg.is_active) {
      throw new Error('Package is not available for purchase');
    }

    // 2. Create purchase record (status: pending)
    const purchase = await this.purchaseRepository.create({
      tenant_id: tenantId,
      package_id: packageId,
      credits_purchased: pkg.credits_amount,
      amount_paid: pkg.price,
      currency: pkg.currency,
      payment_status: 'pending',
      purchase_type: 'manual',
    });

    // 3. Create Xendit invoice
    try {
      const invoice = await this.xenditService.createInvoice({
        external_id: `AI-CREDIT-${tenantId}-${Date.now()}`,
        amount: pkg.price,
        currency: pkg.currency,
        payer_email: userEmail,
        description: `StewardTrack AI Credits - ${pkg.name}`,
        success_redirect_url: successUrl,
        failure_redirect_url: failureUrl,
        invoice_duration: 86400, // 24 hours
        should_send_email: true,
        metadata: {
          payment_type: 'ai_credits',
          purchase_id: purchase.id,
          tenant_id: tenantId,
          package_id: packageId,
          credits: pkg.credits_amount,
          user_email: userEmail,
          user_name: userName,
        },
      });

      // 4. Update purchase with Xendit invoice ID
      await this.purchaseRepository.update(purchase.id, {
        xendit_invoice_id: invoice.id,
      });

      return {
        purchase_id: purchase.id,
        invoice_url: invoice.invoice_url,
        expires_at: invoice.expiry_date,
      };
    } catch (error) {
      // Mark purchase as failed if Xendit invoice creation fails
      await this.purchaseRepository.markFailed(
        purchase.id,
        (error as Error).message
      );
      throw new Error(`Failed to create payment invoice: ${(error as Error).message}`);
    }
  }

  /**
   * Process paid purchase (called from Xendit webhook)
   */
  async processPaidPurchase(xenditInvoiceId: string): Promise<void> {
    // 1. Find purchase by Xendit invoice ID
    const purchase = await this.purchaseRepository.findByXenditInvoiceId(
      xenditInvoiceId
    );

    if (!purchase) {
      throw new Error(`Purchase not found for invoice: ${xenditInvoiceId}`);
    }

    // Prevent double-processing
    if (purchase.payment_status === 'completed') {
      console.log(`[AI Credits] Purchase ${purchase.id} already completed`);
      return;
    }

    // 2. Add credits to tenant balance (atomic operation)
    const result = await this.creditService.addCredits(
      purchase.tenant_id,
      purchase.credits_purchased,
      purchase.id
    );

    if (!result.success) {
      throw new Error(
        `Failed to add credits: ${result.error_message || 'Unknown error'}`
      );
    }

    console.log(
      `[AI Credits] Successfully added ${purchase.credits_purchased} credits to tenant ${purchase.tenant_id}. New balance: ${result.new_balance}`
    );

    // Note: Purchase status is updated to 'completed' by the add_ai_credits() DB function
  }

  /**
   * Mark purchase as failed (called from webhook for EXPIRED/FAILED status)
   */
  async markPurchaseFailed(xenditInvoiceId: string, status: string): Promise<void> {
    const purchase = await this.purchaseRepository.findByXenditInvoiceId(
      xenditInvoiceId
    );

    if (!purchase) {
      throw new Error(`Purchase not found for invoice: ${xenditInvoiceId}`);
    }

    await this.purchaseRepository.markFailed(
      purchase.id,
      `Payment ${status.toLowerCase()}`
    );

    console.log(`[AI Credits] Purchase ${purchase.id} marked as failed (${status})`);
  }

  /**
   * Get purchase history for a tenant
   */
  async getPurchaseHistory(
    tenantId: string,
    options?: PurchaseHistoryOptions
  ): Promise<AICreditPurchaseWithPackage[]> {
    return await this.purchaseRepository.getPurchaseHistory(tenantId, options);
  }

  /**
   * Get a specific purchase by ID
   */
  async getPurchaseById(purchaseId: string): Promise<AICreditPurchase | null> {
    return await this.purchaseRepository.findById(purchaseId);
  }

  /**
   * Get pending purchases for a tenant
   */
  async getPendingPurchases(tenantId: string): Promise<AICreditPurchase[]> {
    return await this.purchaseRepository.getPendingPurchases(tenantId);
  }

  /**
   * Create auto-recharge purchase
   */
  async createAutoRechargePurchase(
    tenantId: string,
    packageId: string,
    userEmail: string,
    userName: string
  ): Promise<PurchaseResult> {
    const pkg = await this.packageRepository.findById(packageId);

    if (!pkg) {
      throw new Error('Auto-recharge package not found');
    }

    // Create purchase with 'auto_recharge' type
    const purchase = await this.purchaseRepository.create({
      tenant_id: tenantId,
      package_id: packageId,
      credits_purchased: pkg.credits_amount,
      amount_paid: pkg.price,
      currency: pkg.currency,
      payment_status: 'pending',
      purchase_type: 'auto_recharge',
      metadata: {
        triggered_at: new Date().toISOString(),
        user_email: userEmail,
      },
    });

    // Create Xendit invoice
    try {
      const invoice = await this.xenditService.createInvoice({
        external_id: `AI-AUTO-RECHARGE-${tenantId}-${Date.now()}`,
        amount: pkg.price,
        currency: pkg.currency,
        payer_email: userEmail,
        description: `StewardTrack AI Credits - Auto-Recharge (${pkg.name})`,
        invoice_duration: 86400, // 24 hours
        should_send_email: true,
        metadata: {
          payment_type: 'ai_credits',
          purchase_id: purchase.id,
          tenant_id: tenantId,
          package_id: packageId,
          credits: pkg.credits_amount,
          user_email: userEmail,
          user_name: userName,
          auto_recharge: true,
        },
      });

      await this.purchaseRepository.update(purchase.id, {
        xendit_invoice_id: invoice.id,
      });

      return {
        purchase_id: purchase.id,
        invoice_url: invoice.invoice_url,
        expires_at: invoice.expiry_date,
      };
    } catch (error) {
      await this.purchaseRepository.markFailed(
        purchase.id,
        (error as Error).message
      );
      throw new Error(
        `Failed to create auto-recharge invoice: ${(error as Error).message}`
      );
    }
  }

  /**
   * Grant complimentary credits (admin operation)
   */
  async grantComplimentaryCredits(
    tenantId: string,
    creditsAmount: number,
    reason: string,
    grantedBy: string
  ): Promise<void> {
    // Create a comp purchase record
    const purchase = await this.purchaseRepository.create({
      tenant_id: tenantId,
      package_id: '00000000-0000-0000-0000-000000000000', // Placeholder ID for comp
      credits_purchased: creditsAmount,
      amount_paid: 0,
      currency: 'PHP',
      payment_status: 'completed',
      purchase_type: 'comp',
      purchased_at: new Date().toISOString(),
      metadata: {
        reason,
        granted_by: grantedBy,
        granted_at: new Date().toISOString(),
      },
    });

    // Add credits immediately
    await this.creditService.addCredits(tenantId, creditsAmount, purchase.id);

    console.log(
      `[AI Credits] Granted ${creditsAmount} complimentary credits to tenant ${tenantId}`
    );
  }
}
