import { injectable, inject } from 'inversify';
import 'reflect-metadata';
import { TYPES } from '@/lib/types';
import { XenditService, XenditInvoice } from './XenditService';
import type { ISubscriptionPaymentRepository } from '@/repositories/subscriptionPayment.repository';
import type { SubscriptionPayment } from '@/models/subscriptionPayment.model';

/**
 * Payment Service
 *
 * Handles payment processing business logic for StewardTrack subscriptions.
 * Integrates with Xendit payment gateway and manages payment records through repository.
 *
 * Architecture: Service → Repository → Adapter → Supabase
 */

export interface DiscountInfo {
  discount_id: string;
  discount_code?: string;
  discount_name: string;
  discount_type: 'coupon' | 'automatic';
  calculation_type: 'percentage' | 'fixed_amount';
  discount_value: number;
  discount_amount: number;
  original_price: number;
}

export interface CreatePaymentParams {
  tenantId: string;
  externalId:string;
  offeringId: string;
  offeringName: string;
  amount: number;
  currency?: string;
  payerEmail: string;
  payerName: string;
  billingCycle: 'monthly' | 'annual' | 'lifetime';
  successUrl: string;
  failureUrl: string;
  externalId?: string;
  discount?: DiscountInfo;
}

@injectable()
export class PaymentService {
  constructor(
    @inject(TYPES.XenditService) private xenditService: XenditService,
    @inject(TYPES.ISubscriptionPaymentRepository)
    private paymentRepository: ISubscriptionPaymentRepository
  ) {}

  /**
   * Create a new payment invoice for subscription
   *
   * @param params Payment creation parameters
   * @returns Created invoice and payment record
   */
  async createSubscriptionPayment(params: CreatePaymentParams): Promise<{
    invoice: XenditInvoice;
    payment: SubscriptionPayment;
  }> {
    // Create invoice via Xendit (pass externalId if provided)
    const invoice = await this.xenditService.createSubscriptionInvoice({
      ...params,
      externalId: params.externalId,
    });

    // Build metadata including discount info if present
    const paymentMetadata: Record<string, any> = {
      offering_name: params.offeringName,
      billing_cycle: params.billingCycle,
      payer_name: params.payerName,
    };

    // Add discount information to metadata for tracking
    if (params.discount) {
      paymentMetadata.discount = {
        discount_id: params.discount.discount_id,
        discount_code: params.discount.discount_code,
        discount_name: params.discount.discount_name,
        discount_type: params.discount.discount_type,
        calculation_type: params.discount.calculation_type,
        discount_value: params.discount.discount_value,
        discount_amount: params.discount.discount_amount,
        original_price: params.discount.original_price,
      };
    }

    // Store payment record via repository
    const payment = await this.paymentRepository.createPayment({
      tenant_id: params.tenantId,
      offering_id: params.offeringId,
      xendit_invoice_id: invoice.id,
      external_id: invoice.external_id,
      amount: params.amount,
      currency: invoice.currency,
      status: 'pending',
      invoice_url: invoice.invoice_url,
      payer_email: params.payerEmail,
      description: invoice.description,
      expired_at: invoice.expiry_date,
      metadata: paymentMetadata,
    });

    return { invoice, payment };
  }

  /**
   * Get payment by Xendit invoice ID
   *
   * @param xenditInvoiceId Xendit invoice ID
   * @returns Payment record or null
   */
  async getPaymentByXenditId(xenditInvoiceId: string): Promise<SubscriptionPayment | null> {
    return this.paymentRepository.getPaymentByXenditId(xenditInvoiceId);
  }

  /**
   * Get payment by external ID
   *
   * @param externalId External payment ID
   * @returns Payment record or null
   */
  async getPaymentByExternalId(externalId: string): Promise<SubscriptionPayment | null> {
    return this.paymentRepository.getPaymentByExternalId(externalId);
  }

  /**
   * Get all payments for a tenant
   *
   * @param tenantId Tenant ID
   * @param options Query options
   * @returns Array of payment records
   */
  async getTenantPayments(
    tenantId: string,
    options?: {
      limit?: number;
      offset?: number;
      status?: SubscriptionPayment['status'];
    }
  ): Promise<SubscriptionPayment[]> {
    return this.paymentRepository.getTenantPayments(tenantId, options);
  }

  /**
   * Update payment status
   *
   * @param xenditInvoiceId Xendit invoice ID
   * @param status New payment status
   * @param additionalData Additional data to update
   * @returns Updated payment record
   */
  async updatePaymentStatus(
    xenditInvoiceId: string,
    status: SubscriptionPayment['status'],
    additionalData?: {
      xendit_payment_id?: string;
      payment_method?: string;
      payment_channel?: string;
      paid_at?: string;
      failed_at?: string;
      failure_code?: string;
      failure_reason?: string;
    }
  ): Promise<SubscriptionPayment> {
    return this.paymentRepository.updatePaymentStatus(
      xenditInvoiceId,
      status,
      additionalData as Partial<SubscriptionPayment>
    );
  }

  /**
   * Get tenant payment summary statistics
   *
   * @param tenantId Tenant ID
   * @returns Payment summary
   */
  async getTenantPaymentsSummary(tenantId: string): Promise<{
    total_paid: number;
    total_pending: number;
    total_failed: number;
    payment_count: number;
    last_payment_date: string | null;
  }> {
    return this.paymentRepository.getTenantPaymentsSummary(tenantId);
  }

  /**
   * Check if tenant has pending payments
   *
   * @param tenantId Tenant ID
   * @returns True if tenant has pending payments
   */
  async hasPendingPayments(tenantId: string): Promise<boolean> {
    return this.paymentRepository.hasPendingPayments(tenantId);
  }

  /**
   * Get latest payment for tenant
   *
   * @param tenantId Tenant ID
   * @returns Latest payment record or null
   */
  async getLatestPayment(tenantId: string): Promise<SubscriptionPayment | null> {
    return this.paymentRepository.getLatestPayment(tenantId);
  }

  /**
   * Expire a pending invoice
   *
   * @param xenditInvoiceId Xendit invoice ID
   * @returns Updated payment record
   */
  async expireInvoice(xenditInvoiceId: string): Promise<SubscriptionPayment> {
    // Expire via Xendit API
    await this.xenditService.expireInvoice(xenditInvoiceId);

    // Update local record via repository
    return this.paymentRepository.updatePaymentStatus(xenditInvoiceId, 'expired', {
      failed_at: new Date().toISOString(),
      failure_reason: 'Invoice expired',
    } as Partial<SubscriptionPayment>);
  }

  /**
   * Retry a failed payment by creating a new invoice
   *
   * @param failedPaymentId Failed payment ID
   * @returns New invoice and payment record
   */
  async retryFailedPayment(failedPaymentId: string): Promise<{
    invoice: XenditInvoice;
    payment: SubscriptionPayment;
  }> {
    // Get the failed payment with offering details
    const failedPayment = await this.paymentRepository.getPaymentWithOffering(failedPaymentId);

    if (!failedPayment) {
      throw new Error('Failed payment not found');
    }

    if (!failedPayment.offering_id || !failedPayment.offering) {
      throw new Error('Payment does not have an associated offering');
    }

    const metadata = failedPayment.metadata as any;

    // Create new payment with same details
    return this.createSubscriptionPayment({
      tenantId: failedPayment.tenant_id,
      externalId: failedPayment.external_id,
      offeringId: failedPayment.offering_id,
      offeringName: metadata?.offering_name || failedPayment.offering.name,
      amount: failedPayment.amount,
      payerEmail: failedPayment.payer_email || '',
      payerName: metadata?.payer_name || 'Unknown',
      billingCycle: (metadata?.billing_cycle || 'monthly') as 'monthly' | 'annual',
      successUrl: metadata?.success_url || `${process.env.NEXT_PUBLIC_APP_URL}/signup/success`,
      failureUrl: metadata?.failure_url || `${process.env.NEXT_PUBLIC_APP_URL}/signup/failed`,
    });
  }

  /**
   * Check if Xendit is configured
   *
   * @returns True if Xendit is properly configured
   */
  isConfigured(): boolean {
    return this.xenditService.isConfigured();
  }

  /**
   * Get Xendit invoice from API
   *
   * @param xenditInvoiceId Xendit invoice ID
   * @returns Invoice object
   */
  async getXenditInvoice(xenditInvoiceId: string): Promise<XenditInvoice> {
    return this.xenditService.getInvoice(xenditInvoiceId);
  }
}
