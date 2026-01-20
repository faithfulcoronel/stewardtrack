import 'server-only';
import 'reflect-metadata';
import { injectable, inject } from 'inversify';
import { BaseAdapter, type IBaseAdapter, type QueryOptions } from '@/adapters/base.adapter';
import type { AuditService } from '@/services/AuditService';
import { TYPES } from '@/lib/types';
import type {
  DonorPaymentMethod,
  CreatePaymentMethodDto,
  PaymentMethodDisplay,
  PaymentMethodStatus,
} from '@/models/donorPaymentMethod.model';
import type { PaymentMethodType } from '@/models/donation.model';

/**
 * Interface for DonorPaymentMethod data access operations
 */
export interface IDonorPaymentMethodAdapter extends IBaseAdapter<DonorPaymentMethod> {
  createPaymentMethod(data: CreatePaymentMethodDto, tenantId: string): Promise<DonorPaymentMethod>;
  updatePaymentMethod(
    id: string,
    data: Partial<DonorPaymentMethod>,
    tenantId: string
  ): Promise<DonorPaymentMethod>;
  setDefaultPaymentMethod(id: string, memberId: string, tenantId: string): Promise<void>;
  updatePaymentMethodStatus(
    id: string,
    status: PaymentMethodStatus,
    tenantId: string
  ): Promise<DonorPaymentMethod>;
  findByMemberId(memberId: string, tenantId: string): Promise<DonorPaymentMethod[]>;
  findByXenditCustomerId(xenditCustomerId: string): Promise<DonorPaymentMethod[]>;
  findByXenditPaymentMethodId(xenditPaymentMethodId: string): Promise<DonorPaymentMethod | null>;
  getDefaultPaymentMethod(memberId: string, tenantId: string): Promise<DonorPaymentMethod | null>;
  getPaymentMethodsForDisplay(memberId: string, tenantId: string): Promise<PaymentMethodDisplay[]>;
  revokePaymentMethod(id: string, tenantId: string): Promise<void>;
  expirePaymentMethods(tenantId: string, beforeDate: string): Promise<number>;
}

@injectable()
export class DonorPaymentMethodAdapter
  extends BaseAdapter<DonorPaymentMethod>
  implements IDonorPaymentMethodAdapter
{
  constructor(@inject(TYPES.AuditService) private auditService: AuditService) {
    super();
  }

  protected tableName = 'donor_payment_methods';

  protected defaultSelect = `
    id,
    tenant_id,
    member_id,
    xendit_customer_id,
    xendit_payment_token_id,
    xendit_linked_account_token_id,
    xendit_payment_method_id,
    payment_type,
    channel_code,
    display_name,
    masked_account,
    is_default,
    nickname,
    status,
    expires_at,
    created_by,
    updated_by,
    created_at,
    updated_at
  `;

  protected defaultRelationships: QueryOptions['relationships'] = [
    {
      table: 'members',
      foreignKey: 'member_id',
      select: ['id', 'first_name', 'last_name'],
    },
  ];

  protected override async onAfterCreate(data: DonorPaymentMethod): Promise<void> {
    await this.auditService.logAuditEvent('create', 'donor_payment_method', data.id, {
      payment_type: data.payment_type,
      channel_code: data.channel_code,
    });
  }

  /**
   * Create a new payment method
   */
  async createPaymentMethod(
    data: CreatePaymentMethodDto,
    tenantId: string
  ): Promise<DonorPaymentMethod> {
    const supabase = await this.getSupabaseClient();
    const userId = await this.getUserId();

    const record = {
      tenant_id: tenantId,
      member_id: data.member_id || null,
      xendit_customer_id: data.xendit_customer_id,
      xendit_payment_token_id: data.xendit_payment_token_id || null,
      xendit_linked_account_token_id: data.xendit_linked_account_token_id || null,
      xendit_payment_method_id: data.xendit_payment_method_id || null,
      payment_type: data.payment_type,
      channel_code: data.channel_code || null,
      display_name: data.display_name || null,
      masked_account: data.masked_account || null,
      is_default: data.is_default || false,
      nickname: data.nickname || null,
      status: 'active',
      expires_at: data.expires_at || null,
      created_by: userId,
      updated_by: userId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data: result, error } = await supabase
      .from(this.tableName)
      .insert([record])
      .select(this.defaultSelect)
      .single();

    if (error) {
      throw new Error(`Failed to create payment method: ${error.message}`);
    }

    if (!result) {
      throw new Error('Failed to create payment method: missing response payload');
    }

    // Cast to proper type for TypeScript
    const typedResult = result as unknown as DonorPaymentMethod;

    // If this is the default, unset other defaults
    if (data.is_default && data.member_id) {
      await this.unsetOtherDefaults(typedResult.id, data.member_id, tenantId);
    }

    await this.onAfterCreate(typedResult);

    return typedResult;
  }

  /**
   * Update a payment method
   */
  async updatePaymentMethod(
    id: string,
    data: Partial<DonorPaymentMethod>,
    tenantId: string
  ): Promise<DonorPaymentMethod> {
    const supabase = await this.getSupabaseClient();
    const userId = await this.getUserId();

    const { data: result, error } = await supabase
      .from(this.tableName)
      .update({
        ...data,
        updated_by: userId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .select(this.defaultSelect)
      .single();

    if (error) {
      throw new Error(`Failed to update payment method: ${error.message}`);
    }

    if (!result) {
      throw new Error('Failed to update payment method: record not found');
    }

    return result as unknown as DonorPaymentMethod;
  }

  /**
   * Set a payment method as default
   */
  async setDefaultPaymentMethod(id: string, memberId: string, tenantId: string): Promise<void> {
    const supabase = await this.getSupabaseClient();
    const userId = await this.getUserId();

    // First, unset all other defaults for this member
    await this.unsetOtherDefaults(id, memberId, tenantId);

    // Then set this one as default
    const { error } = await supabase
      .from(this.tableName)
      .update({
        is_default: true,
        updated_by: userId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('member_id', memberId)
      .eq('tenant_id', tenantId);

    if (error) {
      throw new Error(`Failed to set default payment method: ${error.message}`);
    }
  }

  /**
   * Update payment method status
   */
  async updatePaymentMethodStatus(
    id: string,
    status: PaymentMethodStatus,
    tenantId: string
  ): Promise<DonorPaymentMethod> {
    const supabase = await this.getSupabaseClient();
    const userId = await this.getUserId();

    const { data: result, error } = await supabase
      .from(this.tableName)
      .update({
        status,
        updated_by: userId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .select(this.defaultSelect)
      .single();

    if (error) {
      throw new Error(`Failed to update payment method status: ${error.message}`);
    }

    if (!result) {
      throw new Error('Failed to update payment method status: record not found');
    }

    await this.auditService.logAuditEvent('update', 'donor_payment_method', id, { status });

    return result as unknown as DonorPaymentMethod;
  }

  /**
   * Find payment methods by member ID
   */
  async findByMemberId(memberId: string, tenantId: string): Promise<DonorPaymentMethod[]> {
    const supabase = await this.getSupabaseClient();

    const { data, error } = await supabase
      .from(this.tableName)
      .select(this.defaultSelect)
      .eq('member_id', memberId)
      .eq('tenant_id', tenantId)
      .eq('status', 'active')
      .is('deleted_at', null)
      .order('is_default', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to find payment methods by member ID: ${error.message}`);
    }

    return (data as unknown as DonorPaymentMethod[]) || [];
  }

  /**
   * Find payment methods by Xendit customer ID
   */
  async findByXenditCustomerId(xenditCustomerId: string): Promise<DonorPaymentMethod[]> {
    const supabase = await this.getSupabaseClient();

    const { data, error } = await supabase
      .from(this.tableName)
      .select(this.defaultSelect)
      .eq('xendit_customer_id', xenditCustomerId)
      .eq('status', 'active')
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to find payment methods by Xendit customer ID: ${error.message}`);
    }

    return (data as unknown as DonorPaymentMethod[]) || [];
  }

  /**
   * Find payment method by Xendit payment method ID
   */
  async findByXenditPaymentMethodId(
    xenditPaymentMethodId: string
  ): Promise<DonorPaymentMethod | null> {
    const supabase = await this.getSupabaseClient();

    const { data, error } = await supabase
      .from(this.tableName)
      .select(this.defaultSelect)
      .eq('xendit_payment_method_id', xenditPaymentMethodId)
      .is('deleted_at', null)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw new Error(`Failed to find payment method by Xendit ID: ${error.message}`);
    }

    return (data as unknown as DonorPaymentMethod) || null;
  }

  /**
   * Get default payment method for a member
   */
  async getDefaultPaymentMethod(
    memberId: string,
    tenantId: string
  ): Promise<DonorPaymentMethod | null> {
    const supabase = await this.getSupabaseClient();

    const { data, error } = await supabase
      .from(this.tableName)
      .select(this.defaultSelect)
      .eq('member_id', memberId)
      .eq('tenant_id', tenantId)
      .eq('is_default', true)
      .eq('status', 'active')
      .is('deleted_at', null)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw new Error(`Failed to get default payment method: ${error.message}`);
    }

    return (data as unknown as DonorPaymentMethod) || null;
  }

  /**
   * Get payment methods formatted for display
   */
  async getPaymentMethodsForDisplay(
    memberId: string,
    tenantId: string
  ): Promise<PaymentMethodDisplay[]> {
    const methods = await this.findByMemberId(memberId, tenantId);

    return methods.map((method) => ({
      id: method.id,
      payment_type: method.payment_type,
      display_name: method.display_name || this.getDefaultDisplayName(method.payment_type),
      masked_account: method.masked_account,
      channel_code: method.channel_code,
      is_default: method.is_default,
      nickname: method.nickname,
      icon: this.getPaymentMethodIcon(method.payment_type, method.channel_code),
    }));
  }

  /**
   * Revoke a payment method (soft delete)
   */
  async revokePaymentMethod(id: string, tenantId: string): Promise<void> {
    const supabase = await this.getSupabaseClient();
    const userId = await this.getUserId();

    const { error } = await supabase
      .from(this.tableName)
      .update({
        status: 'revoked',
        is_default: false,
        updated_by: userId,
        updated_at: new Date().toISOString(),
        deleted_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('tenant_id', tenantId);

    if (error) {
      throw new Error(`Failed to revoke payment method: ${error.message}`);
    }

    await this.auditService.logAuditEvent('delete', 'donor_payment_method', id, {
      action: 'revoked',
    });
  }

  /**
   * Expire payment methods that have passed their expiration date
   */
  async expirePaymentMethods(tenantId: string, beforeDate: string): Promise<number> {
    const supabase = await this.getSupabaseClient();

    const { data, error } = await supabase
      .from(this.tableName)
      .update({
        status: 'expired',
        is_default: false,
        updated_at: new Date().toISOString(),
      })
      .eq('tenant_id', tenantId)
      .eq('status', 'active')
      .lte('expires_at', beforeDate)
      .is('deleted_at', null)
      .select('id');

    if (error) {
      throw new Error(`Failed to expire payment methods: ${error.message}`);
    }

    return data?.length || 0;
  }

  /**
   * Unset default flag for all other payment methods for a member
   */
  private async unsetOtherDefaults(
    excludeId: string,
    memberId: string,
    tenantId: string
  ): Promise<void> {
    const supabase = await this.getSupabaseClient();

    const { error } = await supabase
      .from(this.tableName)
      .update({
        is_default: false,
        updated_at: new Date().toISOString(),
      })
      .eq('member_id', memberId)
      .eq('tenant_id', tenantId)
      .neq('id', excludeId)
      .eq('is_default', true);

    if (error) {
      throw new Error(`Failed to unset other default payment methods: ${error.message}`);
    }
  }

  /**
   * Get default display name for payment type
   */
  private getDefaultDisplayName(paymentType: PaymentMethodType): string {
    const labels: Record<PaymentMethodType, string> = {
      card: 'Credit/Debit Card',
      ewallet: 'E-Wallet',
      bank_transfer: 'Bank Transfer',
      direct_debit: 'Direct Debit',
    };
    return labels[paymentType] || paymentType;
  }

  /**
   * Get icon name for payment method
   */
  private getPaymentMethodIcon(
    paymentType: PaymentMethodType,
    channelCode: string | null
  ): string {
    // Common e-wallet icons
    if (paymentType === 'ewallet' && channelCode) {
      const ewalletIcons: Record<string, string> = {
        GCASH: 'gcash',
        GRABPAY: 'grabpay',
        PAYMAYA: 'paymaya',
        SHOPEEPAY: 'shopeepay',
        OVO: 'ovo',
        DANA: 'dana',
        LINKAJA: 'linkaja',
      };
      return ewalletIcons[channelCode.toUpperCase()] || 'ewallet';
    }

    // Default icons by type
    const typeIcons: Record<PaymentMethodType, string> = {
      card: 'credit-card',
      ewallet: 'wallet',
      bank_transfer: 'bank',
      direct_debit: 'bank',
    };

    return typeIcons[paymentType] || 'payment';
  }
}
