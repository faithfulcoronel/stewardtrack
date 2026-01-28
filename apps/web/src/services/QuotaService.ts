import 'server-only';
import 'reflect-metadata';
import { injectable, inject } from 'inversify';
import { TYPES } from '@/lib/types';
import { tenantUtils } from '@/utils/tenantUtils';
import type { ITenantUsageRepository } from '@/repositories/tenantUsage.repository';
import type {
  QuotaType,
  UsageSummary,
  QuotaCheckResult,
  QuotaExceededError,
  QUOTA_DISPLAY_INFO,
} from '@/models/tenantUsage.model';

/**
 * Custom error for quota exceeded scenarios
 */
export class QuotaExceededException extends Error {
  public readonly quotaType: QuotaType;
  public readonly current: number;
  public readonly limit: number;
  public readonly attempted: number;

  constructor(details: QuotaExceededError) {
    super(details.message);
    this.name = 'QuotaExceededException';
    this.quotaType = details.quotaType;
    this.current = details.current;
    this.limit = details.limit;
    this.attempted = details.attempted;
  }

  toJSON(): QuotaExceededError {
    return {
      quotaType: this.quotaType,
      current: this.current,
      limit: this.limit,
      attempted: this.attempted,
      message: this.message,
    };
  }
}

/**
 * Quota Service
 *
 * Main service for quota enforcement and usage tracking.
 * Provides methods to check, enforce, and record quota usage.
 */
@injectable()
export class QuotaService {
  constructor(
    @inject(TYPES.ITenantUsageRepository)
    private readonly tenantUsageRepository: ITenantUsageRepository
  ) {}

  // ==================== TENANT RESOLUTION ====================

  /**
   * Resolve tenant ID from parameter or current context
   */
  private async resolveTenantId(tenantId?: string): Promise<string> {
    const resolved = tenantId ?? (await tenantUtils.getTenantId());
    if (!resolved) {
      throw new Error('No tenant context available');
    }
    return resolved;
  }

  // ==================== USAGE SUMMARY ====================

  /**
   * Get complete usage summary for a tenant
   *
   * Returns all quota statuses with current usage, limits, percentages,
   * and warning flags for quotas at or above 80%.
   */
  async getUsageSummary(tenantId?: string): Promise<UsageSummary> {
    const effectiveTenantId = await this.resolveTenantId(tenantId);
    return this.tenantUsageRepository.getUsageSummary(effectiveTenantId);
  }

  // ==================== QUOTA CHECKING ====================

  /**
   * Check if a quota operation is allowed (non-throwing)
   *
   * @param quotaType - Type of quota to check
   * @param increment - Amount to add (default: 1)
   * @param tenantId - Optional tenant ID (defaults to current context)
   * @returns QuotaCheckResult with allowed status and details
   */
  async checkQuota(
    quotaType: QuotaType,
    increment: number = 1,
    tenantId?: string
  ): Promise<QuotaCheckResult> {
    const effectiveTenantId = await this.resolveTenantId(tenantId);
    return this.tenantUsageRepository.getQuotaCheckResult(
      effectiveTenantId,
      quotaType,
      increment
    );
  }

  /**
   * Check if quota is allowed (simple boolean)
   */
  async isQuotaAllowed(
    quotaType: QuotaType,
    increment: number = 1,
    tenantId?: string
  ): Promise<boolean> {
    const effectiveTenantId = await this.resolveTenantId(tenantId);
    return this.tenantUsageRepository.checkQuotaAllowed(
      effectiveTenantId,
      quotaType,
      increment
    );
  }

  /**
   * Require quota to be available (throwing)
   *
   * Use this at the start of operations that consume quota.
   * Throws QuotaExceededException if quota would be exceeded.
   *
   * @param quotaType - Type of quota to check
   * @param increment - Amount to add (default: 1)
   * @param tenantId - Optional tenant ID (defaults to current context)
   * @throws QuotaExceededException if operation would exceed quota
   */
  async requireQuota(
    quotaType: QuotaType,
    increment: number = 1,
    tenantId?: string
  ): Promise<void> {
    const result = await this.checkQuota(quotaType, increment, tenantId);

    if (!result.allowed) {
      throw new QuotaExceededException({
        quotaType,
        current: result.current,
        limit: result.limit ?? 0,
        attempted: increment,
        message: result.message ?? `Quota exceeded for ${quotaType}`,
      });
    }
  }

  // ==================== USAGE RECORDING ====================

  /**
   * Record usage for a quota type
   *
   * Increments the usage counter. Call this after successfully
   * completing an operation that consumes quota.
   *
   * @param quotaType - Type of quota to increment
   * @param amount - Amount to add (default: 1)
   * @param tenantId - Optional tenant ID (defaults to current context)
   * @returns New usage value after increment
   */
  async recordUsage(
    quotaType: QuotaType,
    amount: number = 1,
    tenantId?: string
  ): Promise<number> {
    const effectiveTenantId = await this.resolveTenantId(tenantId);
    return this.tenantUsageRepository.incrementUsage(
      effectiveTenantId,
      quotaType,
      amount
    );
  }

  /**
   * Check and record usage in one operation
   *
   * First checks if quota is available, then records the usage.
   * Throws if quota would be exceeded.
   *
   * @param quotaType - Type of quota
   * @param amount - Amount to add (default: 1)
   * @param tenantId - Optional tenant ID
   * @returns New usage value after increment
   * @throws QuotaExceededException if quota exceeded
   */
  async consumeQuota(
    quotaType: QuotaType,
    amount: number = 1,
    tenantId?: string
  ): Promise<number> {
    await this.requireQuota(quotaType, amount, tenantId);
    return this.recordUsage(quotaType, amount, tenantId);
  }

  // ==================== USAGE SYNCHRONIZATION ====================

  /**
   * Synchronize usage counts from source tables
   *
   * Recalculates cumulative counters (members, admin_users, storage)
   * from their source tables. Useful for data integrity checks.
   */
  async syncUsageCounts(tenantId?: string): Promise<void> {
    const effectiveTenantId = await this.resolveTenantId(tenantId);
    return this.tenantUsageRepository.syncUsageCounts(effectiveTenantId);
  }

  /**
   * Reset monthly counters for all tenants
   *
   * Should be called by a scheduled job at the start of each billing period.
   * Returns the number of tenants that were reset.
   */
  async resetMonthlyCounters(): Promise<number> {
    return this.tenantUsageRepository.resetMonthlyCounters();
  }

  // ==================== UTILITY METHODS ====================

  /**
   * Get quota warnings for a tenant
   *
   * Returns list of quota types that are at or above 80% usage.
   */
  async getQuotaWarnings(tenantId?: string): Promise<QuotaType[]> {
    const summary = await this.getUsageSummary(tenantId);
    return summary.warnings || [];
  }

  /**
   * Check if any quotas are near limit (>80%)
   */
  async hasQuotaWarnings(tenantId?: string): Promise<boolean> {
    const warnings = await this.getQuotaWarnings(tenantId);
    return warnings.length > 0;
  }

  /**
   * Get remaining quota for a specific type
   *
   * @returns Number of remaining units, or null if unlimited
   */
  async getRemainingQuota(
    quotaType: QuotaType,
    tenantId?: string
  ): Promise<number | null> {
    const result = await this.checkQuota(quotaType, 0, tenantId);
    return result.remaining;
  }

  /**
   * Check if a feature is available (limit > 0)
   */
  async isFeatureAvailable(
    quotaType: QuotaType,
    tenantId?: string
  ): Promise<boolean> {
    const summary = await this.getUsageSummary(tenantId);
    const quotaStatus = summary.quotas[quotaType];
    return quotaStatus && !quotaStatus.unavailable;
  }
}
