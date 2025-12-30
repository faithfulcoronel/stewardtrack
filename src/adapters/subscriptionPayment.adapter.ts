import 'server-only';
import 'reflect-metadata';
import { injectable, inject } from 'inversify';
import { BaseAdapter, type IBaseAdapter } from '@/adapters/base.adapter';
import {
  SubscriptionPayment,
  SubscriptionPaymentWithTenant,
  SubscriptionPaymentWithOffering,
  SubscriptionPaymentComplete,
} from '@/models/subscriptionPayment.model';
import type { AuditService } from '@/services/AuditService';
import { TYPES } from '@/lib/types';

export interface ISubscriptionPaymentAdapter extends IBaseAdapter<SubscriptionPayment> {
  getPaymentByXenditId(xenditInvoiceId: string): Promise<SubscriptionPayment | null>;
  getPaymentByExternalId(externalId: string): Promise<SubscriptionPayment | null>;
  getTenantPayments(
    tenantId: string,
    options?: {
      limit?: number;
      offset?: number;
      status?: SubscriptionPayment['status'];
    }
  ): Promise<SubscriptionPayment[]>;
  getPaymentWithTenant(paymentId: string): Promise<SubscriptionPaymentWithTenant | null>;
  getPaymentWithOffering(paymentId: string): Promise<SubscriptionPaymentWithOffering | null>;
  getPaymentComplete(paymentId: string): Promise<SubscriptionPaymentComplete | null>;
  getTenantPaymentsSummary(tenantId: string): Promise<{
    total_paid: number;
    total_pending: number;
    total_failed: number;
    payment_count: number;
    last_payment_date: string | null;
  }>;
}

@injectable()
export class SubscriptionPaymentAdapter
  extends BaseAdapter<SubscriptionPayment>
  implements ISubscriptionPaymentAdapter
{
  constructor(@inject(TYPES.AuditService) private auditService: AuditService) {
    super();
  }

  protected tableName = 'subscription_payments';

  protected defaultSelect = `
    id,
    tenant_id,
    offering_id,
    xendit_invoice_id,
    xendit_payment_id,
    external_id,
    amount,
    currency,
    status,
    payment_method,
    payment_channel,
    invoice_url,
    invoice_pdf_url,
    payer_email,
    paid_at,
    expired_at,
    failed_at,
    failure_code,
    failure_reason,
    description,
    metadata,
    created_by,
    updated_by,
    created_at,
    updated_at,
    deleted_at
  `;

  protected defaultRelationships = [];

  async getPaymentByXenditId(xenditInvoiceId: string): Promise<SubscriptionPayment | null> {
    const supabase = await this.getSupabaseClient();

    const { data, error } = await supabase
      .from(this.tableName)
      .select(this.defaultSelect)
      .eq('xendit_invoice_id', xenditInvoiceId)
      .is('deleted_at', null)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Not found
      }
      throw new Error(`Failed to get payment by Xendit ID: ${error.message}`);
    }

    return data as SubscriptionPayment;
  }

  async getPaymentByExternalId(externalId: string): Promise<SubscriptionPayment | null> {
    const supabase = await this.getSupabaseClient();

    const { data, error } = await supabase
      .from(this.tableName)
      .select(this.defaultSelect)
      .eq('external_id', externalId)
      .is('deleted_at', null)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Not found
      }
      throw new Error(`Failed to get payment by external ID: ${error.message}`);
    }

    return data as SubscriptionPayment;
  }

  async getTenantPayments(
    tenantId: string,
    options?: {
      limit?: number;
      offset?: number;
      status?: SubscriptionPayment['status'];
    }
  ): Promise<SubscriptionPayment[]> {
    const supabase = await this.getSupabaseClient();

    let query = supabase
      .from(this.tableName)
      .select(this.defaultSelect)
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (options?.status) {
      query = query.eq('status', options.status);
    }

    if (options?.limit) {
      query = query.limit(options.limit);
    }

    if (options?.offset) {
      query = query.range(
        options.offset,
        options.offset + (options.limit || 10) - 1
      );
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to get tenant payments: ${error.message}`);
    }

    return (data || []) as SubscriptionPayment[];
  }

  async getPaymentWithTenant(paymentId: string): Promise<SubscriptionPaymentWithTenant | null> {
    const supabase = await this.getSupabaseClient();

    const { data, error } = await supabase
      .from(this.tableName)
      .select(`
        ${this.defaultSelect},
        tenant:tenants (
          id,
          name,
          subscription_status
        )
      `)
      .eq('id', paymentId)
      .is('deleted_at', null)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      throw new Error(`Failed to get payment with tenant: ${error.message}`);
    }

    return data as any;
  }

  async getPaymentWithOffering(paymentId: string): Promise<SubscriptionPaymentWithOffering | null> {
    const supabase = await this.getSupabaseClient();

    const { data, error } = await supabase
      .from(this.tableName)
      .select(`
        ${this.defaultSelect},
        offering:product_offerings (
          id,
          name,
          tier,
          base_price,
          billing_cycle
        )
      `)
      .eq('id', paymentId)
      .is('deleted_at', null)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      throw new Error(`Failed to get payment with offering: ${error.message}`);
    }

    return data as any;
  }

  async getPaymentComplete(paymentId: string): Promise<SubscriptionPaymentComplete | null> {
    const supabase = await this.getSupabaseClient();

    const { data, error } = await supabase
      .from(this.tableName)
      .select(`
        ${this.defaultSelect},
        tenant:tenants (
          id,
          name,
          subscription_status
        ),
        offering:product_offerings (
          id,
          name,
          tier,
          base_price,
          billing_cycle
        )
      `)
      .eq('id', paymentId)
      .is('deleted_at', null)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      throw new Error(`Failed to get complete payment: ${error.message}`);
    }

    return data as any;
  }

  async getTenantPaymentsSummary(tenantId: string): Promise<{
    total_paid: number;
    total_pending: number;
    total_failed: number;
    payment_count: number;
    last_payment_date: string | null;
  }> {
    const supabase = await this.getSupabaseClient();

    const { data, error } = await supabase
      .from(this.tableName)
      .select('status, amount, paid_at')
      .eq('tenant_id', tenantId)
      .is('deleted_at', null);

    if (error) {
      throw new Error(`Failed to get payment summary: ${error.message}`);
    }

    const payments = data || [];

    const summary = {
      total_paid: 0,
      total_pending: 0,
      total_failed: 0,
      payment_count: payments.length,
      last_payment_date: null as string | null,
    };

    let latestPaidAt: Date | null = null;

    payments.forEach((payment: any) => {
      if (payment.status === 'paid' || payment.status === 'settled') {
        summary.total_paid += payment.amount || 0;
        if (payment.paid_at) {
          const paidDate = new Date(payment.paid_at);
          if (!latestPaidAt || paidDate > latestPaidAt) {
            latestPaidAt = paidDate;
          }
        }
      } else if (payment.status === 'pending') {
        summary.total_pending += payment.amount || 0;
      } else if (payment.status === 'failed' || payment.status === 'expired') {
        summary.total_failed += payment.amount || 0;
      }
    });

    if (latestPaidAt) {
      summary.last_payment_date = latestPaidAt.toISOString();
    }

    return summary;
  }

  protected override async onAfterCreate(data: SubscriptionPayment): Promise<void> {
    await this.auditService.logAuditEvent('create', this.tableName, data.id, data);
  }

  protected override async onAfterUpdate(data: SubscriptionPayment): Promise<void> {
    await this.auditService.logAuditEvent('update', this.tableName, data.id, data);
  }

  protected override async onAfterDelete(id: string): Promise<void> {
    await this.auditService.logAuditEvent('delete', this.tableName, id, { id });
  }
}
