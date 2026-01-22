/**
 * AI Credit Models
 * Domain models for AI credit balance and transactions
 */

import { BaseModel } from './base.model';

/**
 * Tenant AI Credit Balance (Source of Truth)
 * Note: This table uses tenant_id as the primary key (id = tenant_id)
 */
export interface TenantAICredit extends BaseModel {
  tenant_id: string;
  total_credits: number;
  used_credits: number;
  remaining_credits: number;
  auto_recharge_enabled: boolean;
  auto_recharge_package_id: string | null;
  low_credit_threshold: number;
  last_purchase_at: string | null;
  last_usage_at: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Credit balance DTO (simplified for API responses)
 */
export interface CreditBalance {
  total_credits: number;
  used_credits: number;
  remaining_credits: number;
  auto_recharge_enabled: boolean;
  auto_recharge_package_id: string | null;
  low_credit_threshold: number;
  last_purchase_at: string | null;
  last_usage_at: string | null;
}

/**
 * Create TenantAICredit input
 */
export interface CreateTenantAICreditInput {
  tenant_id: string;
  total_credits?: number;
  used_credits?: number;
  remaining_credits?: number;
  auto_recharge_enabled?: boolean;
  auto_recharge_package_id?: string | null;
  low_credit_threshold?: number;
}

/**
 * Update TenantAICredit input
 */
export interface UpdateTenantAICreditInput {
  auto_recharge_enabled?: boolean;
  auto_recharge_package_id?: string | null;
  low_credit_threshold?: number;
}

/**
 * Credit deduction result
 */
export interface DeductionResult {
  success: boolean;
  new_balance?: number;
  credits_deducted?: number;
  error_message?: string;
  current_balance?: number;
  required?: number;
}

/**
 * Credit addition result
 */
export interface AdditionResult {
  success: boolean;
  new_balance?: number;
  credits_added?: number;
  error_message?: string;
}

/**
 * Auto-recharge configuration
 */
export interface AutoRechargeConfig {
  enabled: boolean;
  package_id: string | null;
  threshold: number;
}
