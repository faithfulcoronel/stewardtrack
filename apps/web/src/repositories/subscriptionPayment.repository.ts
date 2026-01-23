import 'server-only';
import 'reflect-metadata';
import { injectable, inject } from 'inversify';
import { TYPES } from '@/lib/types';
import type { ISubscriptionPaymentAdapter } from '@/adapters/subscriptionPayment.adapter';
import type {
  SubscriptionPayment,
  SubscriptionPaymentWithTenant,
  SubscriptionPaymentWithOffering,
  SubscriptionPaymentComplete,
} from '@/models/subscriptionPayment.model';

export interface ISubscriptionPaymentRepository {
  // Create & Update
  createPayment(data: Partial<SubscriptionPayment>): Promise<SubscriptionPayment>;
  updatePayment(id: string, data: Partial<SubscriptionPayment>): Promise<SubscriptionPayment>;
  updatePaymentStatus(
    xenditInvoiceId: string,
    status: SubscriptionPayment['status'],
    additionalData?: Partial<SubscriptionPayment>
  ): Promise<SubscriptionPayment>;

  // Read operations
  getPaymentById(id: string): Promise<SubscriptionPayment | null>;
  getPaymentByXenditId(xenditInvoiceId: string): Promise<SubscriptionPayment | null>;
  /**
   * Get payment by Xendit invoice ID using service role client (bypasses RLS).
   * Use this for webhook contexts where there is no authenticated user.
   */
  getPaymentByXenditIdWithServiceRole(xenditInvoiceId: string): Promise<SubscriptionPayment | null>;
  /**
   * Update payment by Xendit invoice ID using service role client (bypasses RLS).
   * Use this for webhook contexts where there is no authenticated user.
   */
  updatePaymentByXenditIdWithServiceRole(
    xenditInvoiceId: string,
    data: Partial<SubscriptionPayment>
  ): Promise<SubscriptionPayment | null>;
  getPaymentByExternalId(externalId: string): Promise<SubscriptionPayment | null>;
  getTenantPayments(
    tenantId: string,
    options?: {
      limit?: number;
      offset?: number;
      status?: SubscriptionPayment['status'];
    }
  ): Promise<SubscriptionPayment[]>;
  getLatestPayment(tenantId: string): Promise<SubscriptionPayment | null>;

  // With relations
  getPaymentWithTenant(paymentId: string): Promise<SubscriptionPaymentWithTenant | null>;
  getPaymentWithOffering(paymentId: string): Promise<SubscriptionPaymentWithOffering | null>;
  getPaymentComplete(paymentId: string): Promise<SubscriptionPaymentComplete | null>;

  // Summary & stats
  getTenantPaymentsSummary(tenantId: string): Promise<{
    total_paid: number;
    total_pending: number;
    total_failed: number;
    payment_count: number;
    last_payment_date: string | null;
  }>;
  hasPendingPayments(tenantId: string): Promise<boolean>;

  // Delete
  deletePayment(id: string): Promise<void>;
}

@injectable()
export class SubscriptionPaymentRepository implements ISubscriptionPaymentRepository {
  constructor(
    @inject(TYPES.ISubscriptionPaymentAdapter)
    private adapter: ISubscriptionPaymentAdapter
  ) {}

  async createPayment(data: Partial<SubscriptionPayment>): Promise<SubscriptionPayment> {
    return this.adapter.create(data);
  }

  async updatePayment(id: string, data: Partial<SubscriptionPayment>): Promise<SubscriptionPayment> {
    return this.adapter.update(id, data);
  }

  async updatePaymentStatus(
    xenditInvoiceId: string,
    status: SubscriptionPayment['status'],
    additionalData?: Partial<SubscriptionPayment>
  ): Promise<SubscriptionPayment> {
    const payment = await this.adapter.getPaymentByXenditId(xenditInvoiceId);

    if (!payment) {
      throw new Error(`Payment not found for Xendit invoice ID: ${xenditInvoiceId}`);
    }

    const updateData: Partial<SubscriptionPayment> = {
      status,
      ...(additionalData || {}),
    };

    return this.adapter.update(payment.id, updateData);
  }

  async getPaymentById(id: string): Promise<SubscriptionPayment | null> {
    return this.adapter.fetchById(id);
  }

  async getPaymentByXenditId(xenditInvoiceId: string): Promise<SubscriptionPayment | null> {
    return this.adapter.getPaymentByXenditId(xenditInvoiceId);
  }

  async getPaymentByXenditIdWithServiceRole(xenditInvoiceId: string): Promise<SubscriptionPayment | null> {
    return this.adapter.getPaymentByXenditIdWithServiceRole(xenditInvoiceId);
  }

  async updatePaymentByXenditIdWithServiceRole(
    xenditInvoiceId: string,
    data: Partial<SubscriptionPayment>
  ): Promise<SubscriptionPayment | null> {
    return this.adapter.updatePaymentByXenditIdWithServiceRole(xenditInvoiceId, data);
  }

  async getPaymentByExternalId(externalId: string): Promise<SubscriptionPayment | null> {
    return this.adapter.getPaymentByExternalId(externalId);
  }

  async getTenantPayments(
    tenantId: string,
    options?: {
      limit?: number;
      offset?: number;
      status?: SubscriptionPayment['status'];
    }
  ): Promise<SubscriptionPayment[]> {
    return this.adapter.getTenantPayments(tenantId, options);
  }

  async getLatestPayment(tenantId: string): Promise<SubscriptionPayment | null> {
    const payments = await this.adapter.getTenantPayments(tenantId, { limit: 1 });
    return payments.length > 0 ? payments[0] : null;
  }

  async getPaymentWithTenant(paymentId: string): Promise<SubscriptionPaymentWithTenant | null> {
    return this.adapter.getPaymentWithTenant(paymentId);
  }

  async getPaymentWithOffering(paymentId: string): Promise<SubscriptionPaymentWithOffering | null> {
    return this.adapter.getPaymentWithOffering(paymentId);
  }

  async getPaymentComplete(paymentId: string): Promise<SubscriptionPaymentComplete | null> {
    return this.adapter.getPaymentComplete(paymentId);
  }

  async getTenantPaymentsSummary(tenantId: string): Promise<{
    total_paid: number;
    total_pending: number;
    total_failed: number;
    payment_count: number;
    last_payment_date: string | null;
  }> {
    return this.adapter.getTenantPaymentsSummary(tenantId);
  }

  async hasPendingPayments(tenantId: string): Promise<boolean> {
    const payments = await this.adapter.getTenantPayments(tenantId, {
      status: 'pending',
      limit: 1,
    });
    return payments.length > 0;
  }

  async deletePayment(id: string): Promise<void> {
    return this.adapter.delete(id);
  }
}
