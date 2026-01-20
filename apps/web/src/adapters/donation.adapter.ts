import 'server-only';
import 'reflect-metadata';
import { injectable, inject } from 'inversify';
import { BaseAdapter, type IBaseAdapter, type QueryOptions } from '@/adapters/base.adapter';
import type { AuditService } from '@/services/AuditService';
import { TYPES } from '@/lib/types';
import type {
  Donation,
  DonationStatus,
  DonationWithDetails,
} from '@/models/donation.model';

/**
 * Interface for Donation data access operations
 */
export interface IDonationAdapter extends IBaseAdapter<Donation> {
  createDonation(data: Partial<Donation>, tenantId: string): Promise<Donation>;
  updateDonation(id: string, data: Partial<Donation>, tenantId: string): Promise<Donation>;
  updateDonationStatus(
    id: string,
    status: DonationStatus,
    tenantId: string,
    additionalData?: Partial<Donation>
  ): Promise<Donation>;
  findByXenditPaymentRequestId(paymentRequestId: string): Promise<Donation | null>;
  findByXenditPaymentId(paymentId: string): Promise<Donation | null>;
  findByMemberId(memberId: string, tenantId: string): Promise<Donation[]>;
  findByCampaignId(campaignId: string, tenantId: string): Promise<Donation[]>;
  getDonationWithDetails(id: string, tenantId: string): Promise<DonationWithDetails | null>;
  getRecurringDonationsDue(tenantId: string, dueDate: string): Promise<Donation[]>;
}

@injectable()
export class DonationAdapter extends BaseAdapter<Donation> implements IDonationAdapter {
  constructor(@inject(TYPES.AuditService) private auditService: AuditService) {
    super();
  }

  protected tableName = 'donations';

  protected defaultSelect = `
    id,
    tenant_id,
    member_id,
    xendit_customer_id,
    donor_name_encrypted,
    donor_email_encrypted,
    donor_phone_encrypted,
    amount,
    currency,
    category_id,
    fund_id,
    campaign_id,
    xendit_fee,
    platform_fee,
    total_charged,
    xendit_payment_request_id,
    xendit_payment_id,
    payment_method_type,
    payment_channel,
    payment_method_masked,
    status,
    paid_at,
    refunded_at,
    refund_reason,
    is_recurring,
    recurring_frequency,
    recurring_payment_token_id,
    recurring_next_date,
    recurring_end_date,
    recurring_parent_id,
    financial_transaction_header_id,
    notes,
    anonymous,
    source,
    terms_accepted,
    terms_accepted_at,
    terms_version,
    created_by,
    updated_by,
    created_at,
    updated_at
  `;

  protected defaultRelationships: QueryOptions['relationships'] = [
    {
      table: 'categories',
      foreignKey: 'category_id',
      select: ['id', 'name', 'code'],
    },
    {
      table: 'funds',
      foreignKey: 'fund_id',
      select: ['id', 'name', 'code'],
    },
    {
      table: 'campaigns',
      foreignKey: 'campaign_id',
      select: ['id', 'name'],
    },
    {
      table: 'members',
      foreignKey: 'member_id',
      select: ['id', 'first_name', 'last_name'],
    },
  ];

  protected override async onAfterCreate(data: Donation): Promise<void> {
    await this.auditService.logAuditEvent('create', 'donation', data.id, {
      amount: data.amount,
      status: data.status,
      category_id: data.category_id,
    });
  }

  protected override async onAfterUpdate(data: Donation): Promise<void> {
    await this.auditService.logAuditEvent('update', 'donation', data.id, {
      status: data.status,
      paid_at: data.paid_at,
    });
  }

  /**
   * Create a new donation record
   */
  async createDonation(data: Partial<Donation>, tenantId: string): Promise<Donation> {
    const supabase = await this.getSupabaseClient();
    const userId = await this.getUserId();

    const record = {
      ...data,
      tenant_id: tenantId,
      status: data.status || 'pending',
      is_recurring: data.is_recurring || false,
      anonymous: data.anonymous || false,
      source: data.source || 'online',
      // Terms acceptance (required for online donations)
      terms_accepted: data.terms_accepted || false,
      terms_accepted_at: data.terms_accepted_at || (data.terms_accepted ? new Date().toISOString() : null),
      terms_version: data.terms_version || null,
      created_by: userId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data: result, error } = await supabase
      .from(this.tableName)
      .insert([record])
      .select(this.defaultSelect)
      .single();

    if (error) {
      throw new Error(`Failed to create donation: ${error.message}`);
    }

    if (!result) {
      throw new Error('Failed to create donation: missing response payload');
    }

    await this.onAfterCreate(result as unknown as Donation);

    return result as unknown as Donation;
  }

  /**
   * Update a donation record
   */
  async updateDonation(id: string, data: Partial<Donation>, tenantId: string): Promise<Donation> {
    const supabase = await this.getSupabaseClient();

    const { data: result, error } = await supabase
      .from(this.tableName)
      .update({
        ...data,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .select(this.defaultSelect)
      .single();

    if (error) {
      throw new Error(`Failed to update donation: ${error.message}`);
    }

    if (!result) {
      throw new Error('Failed to update donation: record not found');
    }

    await this.onAfterUpdate(result as unknown as Donation);

    return result as unknown as Donation;
  }

  /**
   * Update donation status (commonly used by webhook handler)
   */
  async updateDonationStatus(
    id: string,
    status: DonationStatus,
    tenantId: string,
    additionalData?: Partial<Donation>
  ): Promise<Donation> {
    const supabase = await this.getSupabaseClient();

    const updateData: Record<string, unknown> = {
      status,
      updated_at: new Date().toISOString(),
    };

    // Add paid_at timestamp for successful payments
    if (status === 'paid' && !additionalData?.paid_at) {
      updateData.paid_at = new Date().toISOString();
    }

    // Merge additional data
    if (additionalData) {
      Object.assign(updateData, additionalData);
    }

    const { data: result, error } = await supabase
      .from(this.tableName)
      .update(updateData)
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .select(this.defaultSelect)
      .single();

    if (error) {
      throw new Error(`Failed to update donation status: ${error.message}`);
    }

    if (!result) {
      throw new Error('Failed to update donation status: record not found');
    }

    await this.auditService.logAuditEvent('update', 'donation', id, {
      status,
      previous_status: (additionalData as any)?.previous_status,
    });

    return result as unknown as Donation;
  }

  /**
   * Find donation by Xendit payment request ID
   */
  async findByXenditPaymentRequestId(paymentRequestId: string): Promise<Donation | null> {
    const supabase = await this.getSupabaseClient();

    const { data, error } = await supabase
      .from(this.tableName)
      .select(this.defaultSelect)
      .eq('xendit_payment_request_id', paymentRequestId)
      .is('deleted_at', null)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw new Error(`Failed to find donation by payment request ID: ${error.message}`);
    }

    return (data as unknown as Donation) || null;
  }

  /**
   * Find donation by Xendit payment ID
   */
  async findByXenditPaymentId(paymentId: string): Promise<Donation | null> {
    const supabase = await this.getSupabaseClient();

    const { data, error } = await supabase
      .from(this.tableName)
      .select(this.defaultSelect)
      .eq('xendit_payment_id', paymentId)
      .is('deleted_at', null)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw new Error(`Failed to find donation by payment ID: ${error.message}`);
    }

    return (data as unknown as Donation) || null;
  }

  /**
   * Find all donations for a member
   */
  async findByMemberId(memberId: string, tenantId: string): Promise<Donation[]> {
    const supabase = await this.getSupabaseClient();

    const { data, error } = await supabase
      .from(this.tableName)
      .select(this.defaultSelect)
      .eq('member_id', memberId)
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to find donations by member ID: ${error.message}`);
    }

    return (data as unknown as Donation[]) || [];
  }

  /**
   * Find all donations for a campaign
   */
  async findByCampaignId(campaignId: string, tenantId: string): Promise<Donation[]> {
    const supabase = await this.getSupabaseClient();

    const { data, error } = await supabase
      .from(this.tableName)
      .select(this.defaultSelect)
      .eq('campaign_id', campaignId)
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to find donations by campaign ID: ${error.message}`);
    }

    return (data as unknown as Donation[]) || [];
  }

  /**
   * Get donation with full details for display
   */
  async getDonationWithDetails(id: string, tenantId: string): Promise<DonationWithDetails | null> {
    const supabase = await this.getSupabaseClient();

    const { data, error } = await supabase
      .from(this.tableName)
      .select(`
        *,
        categories:category_id (id, name, code),
        funds:fund_id (id, name, code),
        campaigns:campaign_id (id, name),
        members:member_id (id, first_name, last_name),
        financial_transaction_headers:financial_transaction_header_id (id, transaction_number)
      `)
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw new Error(`Failed to get donation with details: ${error.message}`);
    }

    if (!data) return null;

    // Enrich with display fields
    const rawData = data as any;
    return {
      ...rawData,
      donor_display_name: rawData.anonymous
        ? 'Anonymous'
        : rawData.members
          ? `${rawData.members.first_name} ${rawData.members.last_name}`
          : 'Guest Donor',
      category_name: rawData.categories?.name || null,
      fund_name: rawData.funds?.name || null,
      campaign_name: rawData.campaigns?.name || null,
      payment_method_display: this.formatPaymentMethodDisplay(
        rawData.payment_method_type,
        rawData.payment_channel,
        rawData.payment_method_masked
      ),
      transaction_number: rawData.financial_transaction_headers?.transaction_number || null,
      total_fees: (rawData.xendit_fee || 0) + (rawData.platform_fee || 0),
    } as DonationWithDetails;
  }

  /**
   * Get recurring donations that are due for processing
   */
  async getRecurringDonationsDue(tenantId: string, dueDate: string): Promise<Donation[]> {
    const supabase = await this.getSupabaseClient();

    const { data, error } = await supabase
      .from(this.tableName)
      .select(this.defaultSelect)
      .eq('tenant_id', tenantId)
      .eq('is_recurring', true)
      .eq('status', 'paid')
      .lte('recurring_next_date', dueDate)
      .or('recurring_end_date.is.null,recurring_end_date.gte.' + dueDate)
      .is('deleted_at', null)
      .order('recurring_next_date', { ascending: true });

    if (error) {
      throw new Error(`Failed to get recurring donations due: ${error.message}`);
    }

    return (data as unknown as Donation[]) || [];
  }

  /**
   * Format payment method for display
   */
  private formatPaymentMethodDisplay(
    type: string | null,
    channel: string | null,
    masked: string | null
  ): string | null {
    if (!type) return null;

    const typeLabels: Record<string, string> = {
      card: 'Card',
      ewallet: 'E-Wallet',
      bank_transfer: 'Bank Transfer',
      direct_debit: 'Direct Debit',
    };

    const label = typeLabels[type] || type;
    const parts = [label];

    if (channel) {
      parts.push(`(${channel})`);
    }

    if (masked) {
      parts.push(`•••• ${masked}`);
    }

    return parts.join(' ');
  }
}
