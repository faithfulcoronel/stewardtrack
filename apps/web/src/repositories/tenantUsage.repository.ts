import 'server-only';
import 'reflect-metadata';
import { injectable, inject } from 'inversify';
import { TYPES } from '@/lib/types';
import type { ITenantUsageAdapter } from '@/adapters/tenantUsage.adapter';
import type {
  TenantUsage,
  QuotaType,
  UsageSummary,
  QuotaCheckResult,
} from '@/models/tenantUsage.model';

/**
 * Interface for Tenant Usage Repository
 */
export interface ITenantUsageRepository {
  /**
   * Get usage record for a tenant
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
   * Get detailed quota check result
   */
  getQuotaCheckResult(
    tenantId: string,
    quotaType: QuotaType,
    increment?: number
  ): Promise<QuotaCheckResult>;

  /**
   * Sync usage counts from source tables
   */
  syncUsageCounts(tenantId: string): Promise<void>;

  /**
   * Reset monthly counters (for cron job)
   */
  resetMonthlyCounters(): Promise<number>;
}

/**
 * Tenant Usage Repository
 *
 * Provides data access layer for quota tracking operations.
 * Delegates to TenantUsageAdapter for database interactions.
 */
@injectable()
export class TenantUsageRepository implements ITenantUsageRepository {
  constructor(
    @inject(TYPES.ITenantUsageAdapter)
    private readonly tenantUsageAdapter: ITenantUsageAdapter
  ) {}

  /**
   * Get usage record for a tenant
   */
  async getUsageRecord(tenantId: string): Promise<TenantUsage | null> {
    return this.tenantUsageAdapter.getUsageRecord(tenantId);
  }

  /**
   * Check if a quota operation is allowed
   */
  async checkQuotaAllowed(
    tenantId: string,
    quotaType: QuotaType,
    increment: number = 1
  ): Promise<boolean> {
    return this.tenantUsageAdapter.checkQuotaAllowed(tenantId, quotaType, increment);
  }

  /**
   * Increment a usage counter
   */
  async incrementUsage(
    tenantId: string,
    quotaType: QuotaType,
    amount: number = 1
  ): Promise<number> {
    return this.tenantUsageAdapter.incrementUsage(tenantId, quotaType, amount);
  }

  /**
   * Get complete usage summary with limits and warnings
   */
  async getUsageSummary(tenantId: string): Promise<UsageSummary> {
    return this.tenantUsageAdapter.getUsageSummary(tenantId);
  }

  /**
   * Get detailed quota check result
   */
  async getQuotaCheckResult(
    tenantId: string,
    quotaType: QuotaType,
    increment: number = 1
  ): Promise<QuotaCheckResult> {
    return this.tenantUsageAdapter.getQuotaCheckResult(tenantId, quotaType, increment);
  }

  /**
   * Sync usage counts from source tables
   */
  async syncUsageCounts(tenantId: string): Promise<void> {
    return this.tenantUsageAdapter.syncUsageCounts(tenantId);
  }

  /**
   * Reset monthly counters
   */
  async resetMonthlyCounters(): Promise<number> {
    return this.tenantUsageAdapter.resetMonthlyCounters();
  }
}
