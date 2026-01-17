import { BaseModel } from '@/models/base.model';

/**
 * Discount type - how the discount is applied
 */
export type DiscountType = 'coupon' | 'automatic';

/**
 * Calculation type - how the discount value is calculated
 */
export type CalculationType = 'percentage' | 'fixed_amount';

/**
 * Target scope - what the discount applies to
 */
export type TargetScope = 'global' | 'tier' | 'offering';

/**
 * Discount entity
 */
export interface Discount extends BaseModel {
  id: string;
  code: string | null;
  name: string;
  description?: string | null;
  discount_type: DiscountType;
  calculation_type: CalculationType;
  discount_value: number;
  discount_currency?: string | null;
  starts_at: string;
  ends_at?: string | null;
  max_uses?: number | null;
  max_uses_per_tenant: number;
  current_uses: number;
  target_scope: TargetScope;
  target_tiers?: string[] | null;
  target_offering_ids?: string[] | null;
  min_amount?: number | null;
  first_purchase_only: boolean;
  new_tenant_only: boolean;
  applicable_billing_cycles: string[];
  duration_billing_cycles?: number | null;
  is_active: boolean;
  show_banner: boolean;
  banner_text?: string | null;
  badge_text?: string | null;
  metadata?: Record<string, any>;
  deleted_at?: string | null;
}

/**
 * Discount redemption record
 */
export interface DiscountRedemption {
  id: string;
  discount_id: string;
  tenant_id: string;
  offering_id: string;
  original_price: number;
  discount_amount: number;
  final_price: number;
  currency: string;
  payment_id?: string | null;
  redeemed_at: string;
  redeemed_by?: string | null;
}

/**
 * DTO for creating a new discount
 */
export interface CreateDiscountDto {
  code?: string | null;
  name: string;
  description?: string | null;
  discount_type: DiscountType;
  calculation_type: CalculationType;
  discount_value: number;
  discount_currency?: string | null;
  starts_at?: string;
  ends_at?: string | null;
  max_uses?: number | null;
  max_uses_per_tenant?: number;
  target_scope?: TargetScope;
  target_tiers?: string[] | null;
  target_offering_ids?: string[] | null;
  min_amount?: number | null;
  first_purchase_only?: boolean;
  new_tenant_only?: boolean;
  applicable_billing_cycles?: string[];
  duration_billing_cycles?: number | null;
  is_active?: boolean;
  show_banner?: boolean;
  banner_text?: string | null;
  badge_text?: string | null;
  metadata?: Record<string, any>;
}

/**
 * DTO for updating a discount
 */
export interface UpdateDiscountDto {
  name?: string;
  description?: string | null;
  discount_value?: number;
  discount_currency?: string | null;
  starts_at?: string;
  ends_at?: string | null;
  max_uses?: number | null;
  max_uses_per_tenant?: number;
  target_scope?: TargetScope;
  target_tiers?: string[] | null;
  target_offering_ids?: string[] | null;
  min_amount?: number | null;
  first_purchase_only?: boolean;
  new_tenant_only?: boolean;
  applicable_billing_cycles?: string[];
  duration_billing_cycles?: number | null;
  is_active?: boolean;
  show_banner?: boolean;
  banner_text?: string | null;
  badge_text?: string | null;
  metadata?: Record<string, any>;
}

/**
 * Result of validating a discount code
 */
export interface DiscountValidationResult {
  is_valid: boolean;
  discount_id?: string | null;
  discount_name?: string | null;
  discount_type?: string | null;
  calculation_type?: string | null;
  discount_value?: number | null;
  discount_amount?: number | null;
  final_amount?: number | null;
  duration_billing_cycles?: number | null;
  error_message?: string | null;
}

/**
 * Active discount for an offering
 */
export interface ActiveDiscount {
  discount_id: string;
  discount_name: string;
  discount_type: string;
  calculation_type: string;
  discount_value: number;
  badge_text?: string | null;
  banner_text?: string | null;
  ends_at?: string | null;
  duration_billing_cycles?: number | null;
}

/**
 * Discount with computed fields for display
 */
export interface DiscountWithStats extends Discount {
  redemption_count?: number;
  remaining_uses?: number | null;
  is_expired?: boolean;
  is_upcoming?: boolean;
  days_remaining?: number | null;
  total_redemptions?: number;
  total_savings?: number;
}

/**
 * Parameters for redeeming a discount
 */
export interface RedeemDiscountParams {
  discount_id: string;
  tenant_id: string;
  offering_id: string;
  original_price: number;
  discount_amount: number;
  final_price: number;
  currency: string;
  payment_id?: string | null;
}
