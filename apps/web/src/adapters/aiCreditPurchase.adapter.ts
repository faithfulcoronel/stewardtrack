import 'server-only';
import { injectable } from 'inversify';
import { BaseAdapter } from './base.adapter';
import { tenantUtils } from '@/utils/tenantUtils';
import {
  AICreditPurchase,
  AICreditPurchaseWithPackage,
  PurchaseHistoryOptions,
} from '@/models/aiCreditPurchase.model';
import { IBaseAdapter } from './base.adapter';

export interface IAICreditPurchaseAdapter extends IBaseAdapter<AICreditPurchase> {
  findById(id: string): Promise<AICreditPurchase | null>;
  findByXenditInvoiceId(invoiceId: string): Promise<AICreditPurchase | null>;
  getPurchaseHistory(
    tenantId: string,
    options?: PurchaseHistoryOptions
  ): Promise<AICreditPurchaseWithPackage[]>;
  findByStatus(
    status: 'pending' | 'paid' | 'completed' | 'failed' | 'expired'
  ): Promise<AICreditPurchase[]>;
  getPendingPurchases(tenantId: string): Promise<AICreditPurchase[]>;
}

@injectable()
export class AICreditPurchaseAdapter
  extends BaseAdapter<AICreditPurchase>
  implements IAICreditPurchaseAdapter
{
  protected tableName = 'ai_credit_purchases';
  protected defaultSelect = `
    id,
    tenant_id,
    package_id,
    credits_purchased,
    amount_paid,
    currency,
    xendit_invoice_id,
    payment_status,
    purchased_at,
    credits_added_at,
    purchase_type,
    metadata,
    created_at,
    updated_at
  `;

  private async getTenantId() {
    return this.context?.tenantId ?? (await tenantUtils.getTenantId());
  }

  /**
   * Override create to not include created_by/updated_by fields (table doesn't have them)
   */
  async create(data: Partial<AICreditPurchase>): Promise<AICreditPurchase> {
    const client = await this.getSupabaseClient();

    // Don't include created_by/updated_by fields
    const { data: result, error } = await client
      .from(this.tableName)
      .insert(data)
      .select(this.defaultSelect)
      .single();

    if (error) {
      throw new Error(`Failed to create purchase: ${error.message}`);
    }

    return result as unknown as AICreditPurchase;
  }

  /**
   * Override update to not include updated_by field
   */
  async update(id: string, data: Partial<AICreditPurchase>): Promise<AICreditPurchase> {
    const client = await this.getSupabaseClient();

    const { data: result, error } = await client
      .from(this.tableName)
      .update({
        ...data,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select(this.defaultSelect)
      .single();

    if (error) {
      throw new Error(`Failed to update purchase: ${error.message}`);
    }

    return result as unknown as AICreditPurchase;
  }

  /**
   * Find purchase by Xendit invoice ID
   */
  async findByXenditInvoiceId(invoiceId: string): Promise<AICreditPurchase | null> {
    const client = await this.getSupabaseClient();
    const { data, error } = await client
      .from(this.tableName)
      .select(this.defaultSelect)
      .eq('xendit_invoice_id', invoiceId)
      .single();

    if (error && error.code !== 'PGRST116') {
      // PGRST116 = not found
      throw new Error(`Failed to find purchase by invoice ID: ${error.message}`);
    }

    return data as AICreditPurchase | null;
  }

  /**
   * Get purchase history with package details
   */
  async getPurchaseHistory(
    tenantId: string,
    options?: PurchaseHistoryOptions
  ): Promise<AICreditPurchaseWithPackage[]> {
    const client = await this.getSupabaseClient();
    let query = client
      .from(this.tableName)
      .select(
        `
        ${this.defaultSelect},
        package:ai_credit_packages!package_id (
          name,
          credits_amount
        )
      `
      )
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false });

    // Apply status filter if provided
    if (options?.status) {
      query = query.eq('payment_status', options.status);
    }

    // Apply pagination
    if (options?.limit) {
      query = query.limit(options.limit);
    }

    if (options?.offset) {
      query = query.range(
        options.offset,
        options.offset + (options.limit || 20) - 1
      );
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to get purchase history: ${error.message}`);
    }

    console.log('[AICreditPurchaseAdapter] Raw query result:', JSON.stringify(data, null, 2));

    // Transform to include package details
    const result = (data as any[]).map((purchase) => {
      console.log('[AICreditPurchaseAdapter] Processing purchase:', {
        id: purchase.id,
        package_id: purchase.package_id,
        package_data: purchase.package,
        credits_purchased: purchase.credits_purchased,
        amount_paid: purchase.amount_paid,
      });

      return {
        ...purchase,
        package_name: purchase.package?.name || 'Unknown Package',
        package_credits: purchase.package?.credits_amount || 0,
      };
    }) as AICreditPurchaseWithPackage[];

    console.log('[AICreditPurchaseAdapter] Transformed result:', JSON.stringify(result, null, 2));

    return result;
  }

  /**
   * Find purchases by status
   */
  async findByStatus(
    status: 'pending' | 'paid' | 'completed' | 'failed' | 'expired'
  ): Promise<AICreditPurchase[]> {
    const tenantId = await this.getTenantId();

    const client = await this.getSupabaseClient();
    const { data, error } = await client
      .from(this.tableName)
      .select(this.defaultSelect)
      .eq('tenant_id', tenantId)
      .eq('payment_status', status)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to find purchases by status: ${error.message}`);
    }

    return ((data || []) as unknown) as AICreditPurchase[];
  }

  /**
   * Get pending purchases for tenant
   */
  async getPendingPurchases(tenantId: string): Promise<AICreditPurchase[]> {
    const client = await this.getSupabaseClient();
    const { data, error } = await client
      .from(this.tableName)
      .select(this.defaultSelect)
      .eq('tenant_id', tenantId)
      .eq('payment_status', 'pending')
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to get pending purchases: ${error.message}`);
    }

    return ((data || []) as unknown) as AICreditPurchase[];
  }

  /**
   * Override findAll to filter by tenant
   */
  async findAll(): Promise<AICreditPurchase[]> {
    const tenantId = await this.getTenantId();

    const client = await this.getSupabaseClient();
    const { data, error } = await client
      .from(this.tableName)
      .select(this.defaultSelect)
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to find purchases: ${error.message}`);
    }

    return ((data || []) as unknown) as AICreditPurchase[];
  }

  /**
   * Override findById to not filter by deleted_at (table doesn't have soft delete)
   */
  async findById(id: string): Promise<AICreditPurchase | null> {
    const client = await this.getSupabaseClient();
    const { data, error } = await client
      .from(this.tableName)
      .select(this.defaultSelect)
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // Not found
        return null;
      }
      throw new Error(`Failed to find purchase by id: ${error.message}`);
    }

    return data as unknown as AICreditPurchase;
  }

  /**
   * Override fetch to not filter by deleted_at (table doesn't have soft delete)
   */
  async fetch(options?: any): Promise<{ data: AICreditPurchase[]; count: number | null }> {
    const tenantId = await this.getTenantId();
    const client = await this.getSupabaseClient();

    let query = client
      .from(this.tableName)
      .select(this.defaultSelect, { count: 'exact' })
      .eq('tenant_id', tenantId);

    // Apply filters if provided
    if (options?.filter) {
      Object.keys(options.filter).forEach(key => {
        if (options.filter[key] !== undefined && options.filter[key] !== null) {
          query = query.eq(key, options.filter[key]);
        }
      });
    }

    // Apply ordering
    if (options?.orderBy) {
      query = query.order(options.orderBy, { ascending: options.ascending ?? false });
    } else {
      query = query.order('created_at', { ascending: false });
    }

    // Apply pagination
    if (options?.limit) {
      query = query.limit(options.limit);
    }

    if (options?.offset) {
      query = query.range(options.offset, options.offset + (options.limit || 10) - 1);
    }

    const { data, error, count } = await query;

    if (error) {
      throw new Error(`Failed to fetch purchases: ${error.message}`);
    }

    return {
      data: ((data || []) as unknown) as AICreditPurchase[],
      count: count ?? null
    };
  }
}
