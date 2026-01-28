import { BaseModel } from '@/models/base.model';

/**
 * Types of quotas that can be tracked and enforced
 */
export type QuotaType =
  | 'members'
  | 'admin_users'
  | 'storage_mb'
  | 'sms'
  | 'emails'
  | 'transactions'
  | 'ai_credits';

/**
 * Tenant Usage Tracking Record
 *
 * Stores current resource consumption for a tenant, used to
 * enforce quota limits defined in product offerings.
 */
export interface TenantUsage extends BaseModel {
  id: string;
  tenant_id: string;

  // Cumulative resource counters (not reset monthly)
  current_members: number;
  current_admin_users: number;
  current_storage_bytes: number;

  // Monthly usage counters (reset at start of billing period)
  sms_sent_this_month: number;
  emails_sent_this_month: number;
  transactions_this_month: number;
  ai_credits_used_this_month: number;

  // Purchased AI credits (does NOT reset monthly)
  purchased_ai_credits: number;
  purchased_ai_credits_used: number;

  // Monthly tracking metadata
  month_start_date: string;
  last_reset_at: string | null;
}

/**
 * Individual quota status with current value, limit, and calculated fields
 */
export interface QuotaStatus {
  /** Current usage count */
  current: number;
  /** Maximum allowed (NULL = unlimited) */
  limit: number | null;
  /** Whether quota is unlimited */
  unlimited: boolean;
  /** Whether feature is unavailable (limit = 0) */
  unavailable: boolean;
  /** Percentage used (0-100) */
  percentage: number;
  /** Whether quota resets monthly */
  resets_monthly?: boolean;
  /** Purchased credits available (for ai_credits only) */
  purchased_available?: number;
  /** Purchased credits used (for ai_credits only) */
  purchased_used?: number;
}

/**
 * Complete usage summary with all quotas and warnings
 */
export interface UsageSummary {
  /** Active offering info */
  offering: {
    id: string | null;
    name: string;
    tier: string;
  };

  /** All quota statuses by type */
  quotas: {
    members: QuotaStatus;
    admin_users: QuotaStatus;
    storage_mb: QuotaStatus;
    sms: QuotaStatus;
    emails: QuotaStatus;
    transactions: QuotaStatus;
    ai_credits: QuotaStatus;
  };

  /** Billing period information */
  billing_period: {
    month_start: string | null;
    last_reset: string | null;
  };

  /** Quotas that are at or above 80% usage */
  warnings: QuotaType[];
}

/**
 * Result of a quota check operation
 */
export interface QuotaCheckResult {
  /** Whether the operation is allowed */
  allowed: boolean;
  /** Current usage value */
  current: number;
  /** Limit value (null = unlimited) */
  limit: number | null;
  /** Remaining quota (null if unlimited) */
  remaining: number | null;
  /** Error message if not allowed */
  message?: string;
}

/**
 * Quota exceeded error details
 */
export interface QuotaExceededError {
  quotaType: QuotaType;
  current: number;
  limit: number;
  attempted: number;
  message: string;
}

/**
 * Labels and descriptions for each quota type (for UI display)
 */
export const QUOTA_DISPLAY_INFO: Record<QuotaType, { label: string; description: string; unit: string }> = {
  members: {
    label: 'Church Members',
    description: 'Total church members in your database',
    unit: 'members',
  },
  admin_users: {
    label: 'Users',
    description: 'Total users',
    unit: 'users',
  },
  storage_mb: {
    label: 'Storage',
    description: 'Media and file storage used',
    unit: 'MB',
  },
  sms: {
    label: 'SMS Messages',
    description: 'SMS messages sent this month',
    unit: 'messages',
  },
  emails: {
    label: 'Emails',
    description: 'Emails sent this month',
    unit: 'emails',
  },
  transactions: {
    label: 'Transactions',
    description: 'Financial transactions this month',
    unit: 'transactions',
  },
  ai_credits: {
    label: 'AI Credits',
    description: 'AI assistant credits used this month',
    unit: 'credits',
  },
};
