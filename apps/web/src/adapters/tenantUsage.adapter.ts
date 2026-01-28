import 'server-only';
import 'reflect-metadata';
import { injectable } from 'inversify';
import { BaseAdapter, type IBaseAdapter } from '@/adapters/base.adapter';
import type {
  TenantUsage,
  QuotaType,
  UsageSummary,
  QuotaCheckResult,
} from '@/models/tenantUsage.model';

/**
 * Interface for Tenant Usage Adapter
 */
export interface ITenantUsageAdapter extends IBaseAdapter<TenantUsage> {
  /**
   * Get usage record for a tenant (creates if not exists)
   */
  getUsageRecord(tenantId: string): Promise<TenantUsage | null>;

  /**
   * Check if a quota operation is allowed
   */
  checkQuotaAllowed(tenantId: string, quotaType: QuotaType, increment?: number): Promise<boolean>;

  /**
   * Increment a usage counter
   */
  incrementUsage(tenantId: string, quotaType: QuotaType, amount?: number): Promise<number>;

  /**
   * Get complete usage summary with limits and warnings
   */
  getUsageSummary(tenantId: string): Promise<UsageSummary>;

  /**
   * Sync usage counts from source tables
   */
  syncUsageCounts(tenantId: string): Promise<void>;

  /**
   * Reset monthly counters (typically called by cron job)
   */
  resetMonthlyCounters(): Promise<number>;
}

/**
 * Tenant Usage Adapter
 *
 * Handles database operations for quota tracking and enforcement.
 * Uses PostgreSQL functions for atomic operations.
 */
@injectable()
export class TenantUsageAdapter extends BaseAdapter<TenantUsage> implements ITenantUsageAdapter {
  protected tableName = 'tenant_usage';
  protected defaultSelect = '*';

  /**
   * Get usage record for a tenant
   */
  async getUsageRecord(tenantId: string): Promise<TenantUsage | null> {
    const supabase = await this.getSupabaseClient();

    // First try to get existing record
    const { data, error } = await supabase
      .from(this.tableName)
      .select('*')
      .eq('tenant_id', tenantId)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw new Error(`Failed to fetch usage record: ${error.message}`);
    }

    if (data) {
      return data as unknown as TenantUsage;
    }

    // Create new record if not exists
    const { data: newRecord, error: insertError } = await supabase
      .from(this.tableName)
      .insert({ tenant_id: tenantId })
      .select('*')
      .single();

    if (insertError) {
      // Handle race condition - another process might have created it
      if (insertError.code === '23505') {
        // Unique constraint violation - retry fetch
        const { data: retryData } = await supabase
          .from(this.tableName)
          .select('*')
          .eq('tenant_id', tenantId)
          .single();
        return retryData as unknown as TenantUsage;
      }
      throw new Error(`Failed to create usage record: ${insertError.message}`);
    }

    return newRecord as unknown as TenantUsage;
  }

  /**
   * Check if a quota operation is allowed using database function
   */
  async checkQuotaAllowed(
    tenantId: string,
    quotaType: QuotaType,
    increment: number = 1
  ): Promise<boolean> {
    const supabase = await this.getSupabaseClient();

    const { data, error } = await supabase.rpc('check_quota_allowed', {
      p_tenant_id: tenantId,
      p_quota_type: quotaType,
      p_increment: increment,
    });

    if (error) {
      throw new Error(`Failed to check quota: ${error.message}`);
    }

    return data === true;
  }

  /**
   * Increment a usage counter using database function
   */
  async incrementUsage(
    tenantId: string,
    quotaType: QuotaType,
    amount: number = 1
  ): Promise<number> {
    const supabase = await this.getSupabaseClient();

    const { data, error } = await supabase.rpc('increment_usage', {
      p_tenant_id: tenantId,
      p_quota_type: quotaType,
      p_amount: amount,
    });

    if (error) {
      throw new Error(`Failed to increment usage: ${error.message}`);
    }

    return data as number;
  }

  /**
   * Get complete usage summary using database function
   */
  async getUsageSummary(tenantId: string): Promise<UsageSummary> {
    const supabase = await this.getSupabaseClient();

    // Get quota data from database function
    const { data: quotaRows, error: quotaError } = await supabase.rpc('get_tenant_usage_summary', {
      p_tenant_id: tenantId,
    });

    if (quotaError) {
      throw new Error(`Failed to get usage summary: ${quotaError.message}`);
    }

    // Get tenant's offering info
    const { data: tenantData, error: tenantError } = await supabase
      .from('tenants')
      .select(`
        subscription_offering_id,
        product_offerings (
          id,
          name,
          tier
        )
      `)
      .eq('id', tenantId)
      .single();

    if (tenantError && tenantError.code !== 'PGRST116') {
      throw new Error(`Failed to get tenant offering: ${tenantError.message}`);
    }

    // Get usage record for billing period info
    const { data: usageRecord } = await supabase
      .from('tenant_usage')
      .select('month_start_date, last_reset_at')
      .eq('tenant_id', tenantId)
      .single();

    // Handle null/undefined quota data
    if (!quotaRows || !Array.isArray(quotaRows) || quotaRows.length === 0) {
      return this.getDefaultUsageSummary();
    }

    // Transform rows into UsageSummary shape
    return this.transformQuotaRowsToSummary(quotaRows, tenantData, usageRecord);
  }

  /**
   * Transform database rows into UsageSummary
   */
  private transformQuotaRowsToSummary(
    rows: Array<{
      quota_type: string;
      current_usage: number;
      quota_limit: number | null;
      is_unlimited: boolean;
      resets_monthly: boolean;
      purchased_balance: number;
      purchased_used: number;
    }>,
    tenantData: any,
    usageRecord: any
  ): UsageSummary {
    const warnings: QuotaType[] = [];
    const quotas: UsageSummary['quotas'] = {
      members: this.getDefaultQuotaStatus(),
      admin_users: this.getDefaultQuotaStatus(),
      storage_mb: this.getDefaultQuotaStatus(),
      sms: { ...this.getDefaultQuotaStatus(), resets_monthly: true },
      emails: { ...this.getDefaultQuotaStatus(), resets_monthly: true },
      transactions: { ...this.getDefaultQuotaStatus(), resets_monthly: true },
      ai_credits: { ...this.getDefaultQuotaStatus(), resets_monthly: true },
    };

    for (const row of rows) {
      const quotaType = this.mapQuotaType(row.quota_type);
      if (!quotaType) continue;

      const current = Number(row.current_usage) || 0;
      const limit = row.quota_limit !== null ? Number(row.quota_limit) : null;
      const unlimited = row.is_unlimited || limit === null;
      const unavailable = !unlimited && limit === 0;

      let percentage = 0;
      if (!unlimited && !unavailable && limit !== null && limit > 0) {
        percentage = Math.round((current / limit) * 100);
        if (percentage >= 80) {
          warnings.push(quotaType);
        }
      }

      quotas[quotaType] = {
        current,
        limit,
        unlimited,
        unavailable,
        percentage,
        resets_monthly: row.resets_monthly,
      };

      // Add purchased credits info for ai_credits
      if (quotaType === 'ai_credits') {
        quotas[quotaType].purchased_available = Number(row.purchased_balance) || 0;
        quotas[quotaType].purchased_used = Number(row.purchased_used) || 0;
      }
    }

    // Convert storage_bytes to storage_mb
    if (quotas.storage_mb) {
      quotas.storage_mb.current = Math.round(quotas.storage_mb.current / (1024 * 1024) * 100) / 100;
      if (quotas.storage_mb.limit !== null) {
        quotas.storage_mb.limit = Math.round(quotas.storage_mb.limit / (1024 * 1024 * 1024) * 1000); // GB to MB
      }
    }

    const offering = tenantData?.product_offerings as { id: string; name: string; tier: string } | null;

    return {
      offering: {
        id: offering?.id || null,
        name: offering?.name || 'No Active Plan',
        tier: offering?.tier || 'none',
      },
      quotas,
      billing_period: {
        month_start: usageRecord?.month_start_date || null,
        last_reset: usageRecord?.last_reset_at || null,
      },
      warnings,
    };
  }

  /**
   * Map database quota type string to QuotaType
   */
  private mapQuotaType(dbType: string): QuotaType | null {
    const mapping: Record<string, QuotaType> = {
      members: 'members',
      admin_users: 'admin_users',
      storage_bytes: 'storage_mb',
      sms: 'sms',
      emails: 'emails',
      transactions: 'transactions',
      ai_credits: 'ai_credits',
    };
    return mapping[dbType] || null;
  }

  /**
   * Get default quota status
   */
  private getDefaultQuotaStatus() {
    return {
      current: 0,
      limit: null,
      unlimited: true,
      unavailable: false,
      percentage: 0,
    };
  }

  /**
   * Sync usage counts from source tables
   */
  async syncUsageCounts(tenantId: string): Promise<void> {
    const supabase = await this.getSupabaseClient();

    const { error } = await supabase.rpc('sync_tenant_usage_counts', {
      p_tenant_id: tenantId,
    });

    if (error) {
      throw new Error(`Failed to sync usage counts: ${error.message}`);
    }
  }

  /**
   * Reset monthly counters for all tenants
   */
  async resetMonthlyCounters(): Promise<number> {
    const supabase = await this.getSupabaseClient();

    const { data, error } = await supabase.rpc('reset_monthly_usage_counters');

    if (error) {
      throw new Error(`Failed to reset monthly counters: ${error.message}`);
    }

    return data as number;
  }

  /**
   * Get quota check result with details
   */
  async getQuotaCheckResult(
    tenantId: string,
    quotaType: QuotaType,
    increment: number = 1
  ): Promise<QuotaCheckResult> {
    const summary = await this.getUsageSummary(tenantId);
    const quotaStatus = summary.quotas[quotaType];

    if (!quotaStatus) {
      return {
        allowed: false,
        current: 0,
        limit: null,
        remaining: null,
        message: `Unknown quota type: ${quotaType}`,
      };
    }

    // Unlimited quota
    if (quotaStatus.unlimited) {
      return {
        allowed: true,
        current: quotaStatus.current,
        limit: null,
        remaining: null,
      };
    }

    // Feature unavailable
    if (quotaStatus.unavailable) {
      return {
        allowed: false,
        current: quotaStatus.current,
        limit: 0,
        remaining: 0,
        message: `${quotaType} feature is not available on your plan`,
      };
    }

    const limit = quotaStatus.limit!;
    const remaining = limit - quotaStatus.current;
    const allowed = quotaStatus.current + increment <= limit;

    return {
      allowed,
      current: quotaStatus.current,
      limit,
      remaining: Math.max(0, remaining),
      message: allowed
        ? undefined
        : `${quotaType} quota exceeded: ${quotaStatus.current}/${limit} (trying to add ${increment})`,
    };
  }

  /**
   * Get default usage summary for edge cases
   */
  private getDefaultUsageSummary(): UsageSummary {
    const defaultQuotaStatus = {
      current: 0,
      limit: null,
      unlimited: true,
      unavailable: false,
      percentage: 0,
    };

    return {
      offering: {
        id: null,
        name: 'No Active Plan',
        tier: 'none',
      },
      quotas: {
        members: { ...defaultQuotaStatus },
        admin_users: { ...defaultQuotaStatus },
        storage_mb: { ...defaultQuotaStatus },
        sms: { ...defaultQuotaStatus, resets_monthly: true },
        emails: { ...defaultQuotaStatus, resets_monthly: true },
        transactions: { ...defaultQuotaStatus, resets_monthly: true },
        ai_credits: { ...defaultQuotaStatus, resets_monthly: true, purchased_available: 0, purchased_used: 0 },
      },
      billing_period: {
        month_start: null,
        last_reset: null,
      },
      warnings: [],
    };
  }
}
