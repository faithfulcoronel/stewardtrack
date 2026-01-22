import 'server-only';
import 'reflect-metadata';
import { injectable } from 'inversify';
import { BaseAdapter, type IBaseAdapter } from '@/adapters/base.adapter';
import type {
  Discount,
  DiscountRedemption,
  CreateDiscountDto,
  UpdateDiscountDto,
  DiscountValidationResult,
  ActiveDiscount,
  RedeemDiscountParams,
} from '@/models/discount.model';

export interface IDiscountAdapter extends IBaseAdapter<Discount> {
  // CRUD operations
  createDiscount(data: CreateDiscountDto): Promise<Discount>;
  updateDiscount(id: string, data: UpdateDiscountDto): Promise<Discount>;
  deleteDiscount(id: string): Promise<void>;
  getDiscountById(id: string): Promise<Discount | null>;
  getDiscountByCode(code: string): Promise<Discount | null>;

  // Query operations
  getActiveDiscounts(): Promise<Discount[]>;
  getAutomaticDiscounts(): Promise<Discount[]>;
  getCouponDiscounts(): Promise<Discount[]>;
  getAllDiscounts(includeInactive?: boolean): Promise<Discount[]>;

  // Validation and redemption
  validateDiscountCode(
    code: string,
    offeringId: string,
    tenantId: string,
    amount: number,
    currency: string
  ): Promise<DiscountValidationResult>;

  validateDiscountCodePublic(
    code: string,
    offeringId: string,
    amount: number,
    currency: string
  ): Promise<DiscountValidationResult>;

  getActiveDiscountsForOffering(
    offeringId: string,
    currency?: string
  ): Promise<ActiveDiscount[]>;

  redeemDiscount(params: RedeemDiscountParams): Promise<string>;

  // Redemption history
  getDiscountRedemptions(discountId: string): Promise<DiscountRedemption[]>;
  getTenantRedemptions(tenantId: string): Promise<DiscountRedemption[]>;
}

@injectable()
export class DiscountAdapter
  extends BaseAdapter<Discount>
  implements IDiscountAdapter
{
  protected tableName = 'discounts';

  protected defaultSelect = `
    id,
    code,
    name,
    description,
    discount_type,
    calculation_type,
    discount_value,
    discount_currency,
    starts_at,
    ends_at,
    max_uses,
    max_uses_per_tenant,
    current_uses,
    target_scope,
    target_tiers,
    target_offering_ids,
    min_amount,
    first_purchase_only,
    new_tenant_only,
    applicable_billing_cycles,
    duration_billing_cycles,
    is_active,
    show_banner,
    banner_text,
    badge_text,
    metadata,
    created_by,
    updated_by,
    created_at,
    updated_at,
    deleted_at
  `;

  // ==========================================================================
  // CRUD Operations
  // ==========================================================================

  async createDiscount(data: CreateDiscountDto): Promise<Discount> {
    const supabase = await this.getSupabaseClient();
    const userId = await this.getUserId();

    const insertData = {
      ...data,
      code: data.code ? data.code.toUpperCase() : null,
      created_by: userId,
      updated_by: userId,
    };

    const { data: discount, error } = await supabase
      .from(this.tableName)
      .insert(insertData)
      .select(this.defaultSelect)
      .single();

    if (error) {
      throw new Error(`Failed to create discount: ${error.message}`);
    }

    return discount as unknown as Discount;
  }

  async updateDiscount(id: string, data: UpdateDiscountDto): Promise<Discount> {
    const supabase = await this.getSupabaseClient();
    const userId = await this.getUserId();

    const { data: discount, error } = await supabase
      .from(this.tableName)
      .update({
        ...data,
        updated_by: userId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .is('deleted_at', null)
      .select(this.defaultSelect)
      .single();

    if (error) {
      throw new Error(`Failed to update discount: ${error.message}`);
    }

    return discount as unknown as Discount;
  }

  async deleteDiscount(id: string): Promise<void> {
    const supabase = await this.getSupabaseClient();
    const userId = await this.getUserId();

    const { error } = await supabase
      .from(this.tableName)
      .update({
        deleted_at: new Date().toISOString(),
        updated_by: userId,
      })
      .eq('id', id);

    if (error) {
      throw new Error(`Failed to delete discount: ${error.message}`);
    }
  }

  async getDiscountById(id: string): Promise<Discount | null> {
    const supabase = await this.getSupabaseClient();

    const { data, error } = await supabase
      .from(this.tableName)
      .select(this.defaultSelect)
      .eq('id', id)
      .is('deleted_at', null)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw new Error(`Failed to fetch discount: ${error.message}`);
    }

    return data as unknown as Discount;
  }

  async getDiscountByCode(code: string): Promise<Discount | null> {
    const supabase = await this.getSupabaseClient();

    const { data, error } = await supabase
      .from(this.tableName)
      .select(this.defaultSelect)
      .eq('code', code.toUpperCase())
      .is('deleted_at', null)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw new Error(`Failed to fetch discount: ${error.message}`);
    }

    return data as unknown as Discount;
  }

  // ==========================================================================
  // Query Operations
  // ==========================================================================

  async getActiveDiscounts(): Promise<Discount[]> {
    const supabase = await this.getSupabaseClient();

    const { data, error } = await supabase
      .from(this.tableName)
      .select(this.defaultSelect)
      .eq('is_active', true)
      .is('deleted_at', null)
      .lte('starts_at', new Date().toISOString())
      .or(`ends_at.is.null,ends_at.gt.${new Date().toISOString()}`)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch active discounts: ${error.message}`);
    }

    return (data || []) as unknown as Discount[];
  }

  async getAutomaticDiscounts(): Promise<Discount[]> {
    const supabase = await this.getSupabaseClient();

    const { data, error } = await supabase
      .from(this.tableName)
      .select(this.defaultSelect)
      .eq('discount_type', 'automatic')
      .eq('is_active', true)
      .is('deleted_at', null)
      .lte('starts_at', new Date().toISOString())
      .or(`ends_at.is.null,ends_at.gt.${new Date().toISOString()}`)
      .order('discount_value', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch automatic discounts: ${error.message}`);
    }

    return (data || []) as unknown as Discount[];
  }

  async getCouponDiscounts(): Promise<Discount[]> {
    const supabase = await this.getSupabaseClient();

    const { data, error } = await supabase
      .from(this.tableName)
      .select(this.defaultSelect)
      .eq('discount_type', 'coupon')
      .eq('is_active', true)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch coupon discounts: ${error.message}`);
    }

    return (data || []) as unknown as Discount[];
  }

  async getAllDiscounts(includeInactive: boolean = false): Promise<Discount[]> {
    const supabase = await this.getSupabaseClient();

    let query = supabase
      .from(this.tableName)
      .select(this.defaultSelect)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (!includeInactive) {
      query = query.eq('is_active', true);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to fetch discounts: ${error.message}`);
    }

    return (data || []) as unknown as Discount[];
  }

  // ==========================================================================
  // Validation and Redemption
  // ==========================================================================

  async validateDiscountCode(
    code: string,
    offeringId: string,
    tenantId: string,
    amount: number,
    currency: string
  ): Promise<DiscountValidationResult> {
    const supabase = await this.getSupabaseClient();

    const { data, error } = await supabase.rpc('validate_discount_code', {
      p_code: code.toUpperCase(),
      p_offering_id: offeringId,
      p_tenant_id: tenantId,
      p_amount: amount,
      p_currency: currency,
    });

    if (error) {
      throw new Error(`Failed to validate discount code: ${error.message}`);
    }

    // RPC returns array, get first result
    const result = Array.isArray(data) ? data[0] : data;

    return {
      is_valid: result?.is_valid ?? false,
      discount_id: result?.discount_id,
      discount_name: result?.discount_name,
      discount_type: result?.discount_type,
      calculation_type: result?.calculation_type,
      discount_value: result?.discount_value,
      discount_amount: result?.discount_amount,
      final_amount: result?.final_amount,
      duration_billing_cycles: result?.duration_billing_cycles,
      error_message: result?.error_message,
    };
  }

  async getActiveDiscountsForOffering(
    offeringId: string,
    currency: string = 'USD'
  ): Promise<ActiveDiscount[]> {
    const supabase = await this.getSupabaseClient();

    const { data, error } = await supabase.rpc('get_active_discounts_for_offering', {
      p_offering_id: offeringId,
      p_currency: currency,
    });

    if (error) {
      throw new Error(`Failed to fetch active discounts for offering: ${error.message}`);
    }

    return (data || []).map((d: any) => ({
      discount_id: d.discount_id,
      discount_name: d.discount_name,
      discount_type: d.discount_type,
      calculation_type: d.calculation_type,
      discount_value: d.discount_value,
      badge_text: d.badge_text,
      banner_text: d.banner_text,
      ends_at: d.ends_at,
      duration_billing_cycles: d.duration_billing_cycles,
    }));
  }

  async redeemDiscount(params: RedeemDiscountParams): Promise<string> {
    const supabase = await this.getSupabaseClient();

    const { data, error } = await supabase.rpc('redeem_discount', {
      p_discount_id: params.discount_id,
      p_tenant_id: params.tenant_id,
      p_offering_id: params.offering_id,
      p_original_price: params.original_price,
      p_discount_amount: params.discount_amount,
      p_final_price: params.final_price,
      p_currency: params.currency,
      p_payment_id: params.payment_id,
    });

    if (error) {
      throw new Error(`Failed to redeem discount: ${error.message}`);
    }

    return data as string;
  }

  // ==========================================================================
  // Public Validation (no tenant required)
  // ==========================================================================

  async validateDiscountCodePublic(
    code: string,
    offeringId: string,
    amount: number,
    currency: string
  ): Promise<DiscountValidationResult> {
    // Use service client for public validation (no auth required)
    const { getSupabaseServiceClient } = await import('@/lib/supabase/service');
    const supabase = await getSupabaseServiceClient();
    const normalizedCode = code.toUpperCase().trim();

    // Fetch the discount by code
    const { data: discount, error: discountError } = await supabase
      .from(this.tableName)
      .select(this.defaultSelect)
      .eq('code', normalizedCode)
      .eq('is_active', true)
      .is('deleted_at', null)
      .single();

    if (discountError || !discount) {
      return {
        is_valid: false,
        error_message: 'Invalid or expired discount code',
      };
    }

    // Cast to proper type
    const typedDiscount = discount as unknown as Discount;

    // Check date validity
    const now = new Date();
    const startsAt = new Date(typedDiscount.starts_at);
    const endsAt = typedDiscount.ends_at ? new Date(typedDiscount.ends_at) : null;

    if (now < startsAt) {
      return {
        is_valid: false,
        error_message: 'This discount code is not yet active',
      };
    }

    if (endsAt && now > endsAt) {
      return {
        is_valid: false,
        error_message: 'This discount code has expired',
      };
    }

    // Check max global uses
    if (typedDiscount.max_uses != null && typedDiscount.current_uses >= typedDiscount.max_uses) {
      return {
        is_valid: false,
        error_message: 'This discount code has reached its maximum usage limit',
      };
    }

    // Fetch the offering to check targeting
    const { data: offering, error: offeringError } = await supabase
      .from('product_offerings')
      .select('id, tier, billing_cycle')
      .eq('id', offeringId)
      .eq('is_active', true)
      .is('deleted_at', null)
      .single();

    if (offeringError || !offering) {
      return {
        is_valid: false,
        error_message: 'Invalid offering',
      };
    }

    // Check targeting scope
    if (typedDiscount.target_scope === 'tier') {
      if (!typedDiscount.target_tiers || !typedDiscount.target_tiers.includes(offering.tier)) {
        return {
          is_valid: false,
          error_message: 'This discount code is not valid for the selected plan',
        };
      }
    } else if (typedDiscount.target_scope === 'offering') {
      if (!typedDiscount.target_offering_ids || !typedDiscount.target_offering_ids.includes(offeringId)) {
        return {
          is_valid: false,
          error_message: 'This discount code is not valid for the selected plan',
        };
      }
    }

    // Check billing cycle
    if (offering.billing_cycle && typedDiscount.applicable_billing_cycles?.length > 0) {
      if (!typedDiscount.applicable_billing_cycles.includes(offering.billing_cycle)) {
        return {
          is_valid: false,
          error_message: 'This discount code is not valid for the selected billing cycle',
        };
      }
    }

    // Check minimum amount
    if (typedDiscount.min_amount != null && amount < typedDiscount.min_amount) {
      return {
        is_valid: false,
        error_message: `Minimum purchase of ${typedDiscount.min_amount} ${currency} required`,
      };
    }

    // Check currency for fixed amount discounts
    if (typedDiscount.calculation_type === 'fixed_amount') {
      if (typedDiscount.discount_currency && typedDiscount.discount_currency !== currency) {
        return {
          is_valid: false,
          error_message: 'This discount is not available in your currency',
        };
      }
    }

    // Calculate discount amount
    let discountAmount: number;
    if (typedDiscount.calculation_type === 'percentage') {
      discountAmount = Math.round(amount * (typedDiscount.discount_value / 100) * 100) / 100;
    } else {
      discountAmount = typedDiscount.discount_value;
    }

    // Cap discount at original price
    discountAmount = Math.min(discountAmount, amount);
    const finalAmount = Math.round((amount - discountAmount) * 100) / 100;

    return {
      is_valid: true,
      discount_id: typedDiscount.id,
      discount_name: typedDiscount.name,
      discount_type: typedDiscount.discount_type,
      calculation_type: typedDiscount.calculation_type,
      discount_value: typedDiscount.discount_value,
      discount_amount: discountAmount,
      final_amount: finalAmount,
      duration_billing_cycles: typedDiscount.duration_billing_cycles,
    };
  }

  // ==========================================================================
  // Redemption History
  // ==========================================================================

  async getDiscountRedemptions(discountId: string): Promise<DiscountRedemption[]> {
    const supabase = await this.getSupabaseClient();

    const { data, error } = await supabase
      .from('discount_redemptions')
      .select('*')
      .eq('discount_id', discountId)
      .order('redeemed_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch discount redemptions: ${error.message}`);
    }

    return (data || []) as unknown as DiscountRedemption[];
  }

  async getTenantRedemptions(tenantId: string): Promise<DiscountRedemption[]> {
    const supabase = await this.getSupabaseClient();

    const { data, error } = await supabase
      .from('discount_redemptions')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('redeemed_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch tenant redemptions: ${error.message}`);
    }

    return (data || []) as unknown as DiscountRedemption[];
  }
}
