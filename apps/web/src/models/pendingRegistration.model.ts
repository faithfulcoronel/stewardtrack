/**
 * Pending Registration Model
 *
 * Represents a registration that is pending email verification.
 * This data is stored temporarily until the email is verified,
 * at which point tenant provisioning occurs.
 */

export interface PendingRegistration {
  id: string;
  user_id: string;
  verification_token: string;
  token_expires_at: string;
  token_used_at: string | null;

  // Registration data
  email: string;
  church_name: string;
  first_name: string;
  last_name: string;
  offering_id: string;
  denomination: string | null;
  contact_number: string | null;
  address: string | null;

  // Offering type flags
  is_trial: boolean;
  is_free: boolean;
  price_is_zero: boolean;

  // Coupon/discount data
  coupon_code: string | null;
  coupon_discount_id: string | null;
  coupon_discount_amount: number | null;
  coupon_discounted_price: number | null;
  coupon_duration_billing_cycles: number | null;

  // Metadata
  created_at: string;
}

export interface CreatePendingRegistrationDto {
  user_id: string;
  verification_token: string;
  email: string;
  church_name: string;
  first_name: string;
  last_name: string;
  offering_id: string;
  denomination?: string | null;
  contact_number?: string | null;
  address?: string | null;

  // Offering type flags
  is_trial?: boolean;
  is_free?: boolean;
  price_is_zero?: boolean;

  // Coupon/discount data
  coupon_code?: string | null;
  coupon_discount_id?: string | null;
  coupon_discount_amount?: number | null;
  coupon_discounted_price?: number | null;
  coupon_duration_billing_cycles?: number | null;
}
