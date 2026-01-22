/**
 * AI Credit Purchase Models
 * Domain models for credit purchases and payment history
 */

/**
 * AI Credit Purchase
 */
export interface AICreditPurchase {
  id: string;
  tenant_id: string;
  package_id: string;
  credits_purchased: number;
  amount_paid: number;
  currency: string;
  xendit_invoice_id: string | null;
  payment_status: 'pending' | 'paid' | 'completed' | 'failed' | 'expired';
  purchased_at: string | null;
  credits_added_at: string | null;
  purchase_type: 'manual' | 'auto_recharge' | 'trial' | 'comp';
  metadata: Record<string, any> | null;
  created_at: string;
  updated_at: string;
}

/**
 * Purchase with package details
 */
export interface AICreditPurchaseWithPackage extends AICreditPurchase {
  package_name: string;
  package_credits: number;
}

/**
 * Create AICreditPurchase input
 */
export interface CreateAICreditPurchaseInput {
  tenant_id: string;
  package_id: string;
  credits_purchased: number;
  amount_paid: number;
  currency: string;
  xendit_invoice_id?: string;
  payment_status?: 'pending' | 'paid' | 'completed' | 'failed' | 'expired';
  purchased_at?: string;
  credits_added_at?: string;
  purchase_type?: 'manual' | 'auto_recharge' | 'trial' | 'comp';
  metadata?: Record<string, any>;
}

/**
 * Update AICreditPurchase input
 */
export interface UpdateAICreditPurchaseInput {
  xendit_invoice_id?: string;
  payment_status?: 'pending' | 'paid' | 'completed' | 'failed' | 'expired';
  purchased_at?: string;
  credits_added_at?: string;
  metadata?: Record<string, any>;
}

/**
 * Purchase result (after creating Xendit invoice)
 */
export interface PurchaseResult {
  purchase_id: string;
  invoice_url: string;
  expires_at: string;
}

/**
 * Purchase history query options
 */
export interface PurchaseHistoryOptions {
  limit?: number;
  offset?: number;
  status?: 'pending' | 'paid' | 'completed' | 'failed' | 'expired';
}
