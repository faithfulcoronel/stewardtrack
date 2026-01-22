/**
 * AI Credit Package Models
 * Domain models for credit packages (SKU catalog)
 */

/**
 * AI Credit Package (SKU)
 */
export interface AICreditPackage {
  id: string;
  name: string;
  description: string | null;
  credits_amount: number;
  price: number;
  currency: string;
  sort_order: number;
  is_featured: boolean;
  badge_text: string | null;
  savings_percent: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

/**
 * Create AICreditPackage input
 */
export interface CreateAICreditPackageInput {
  name: string;
  description?: string;
  credits_amount: number;
  price: number;
  currency?: string;
  sort_order?: number;
  is_featured?: boolean;
  badge_text?: string;
  savings_percent?: number;
  is_active?: boolean;
}

/**
 * Update AICreditPackage input
 */
export interface UpdateAICreditPackageInput {
  name?: string;
  description?: string;
  credits_amount?: number;
  price?: number;
  currency?: string;
  sort_order?: number;
  is_featured?: boolean;
  badge_text?: string;
  savings_percent?: number;
  is_active?: boolean;
}

/**
 * Package DTO for API responses
 */
export interface CreditPackageDTO {
  id: string;
  name: string;
  description: string | null;
  credits: number;
  price: number;
  currency: string;
  badge: string | null;
  savings: number | null;
  featured: boolean;
}
