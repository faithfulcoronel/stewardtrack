import { injectable, inject } from 'inversify';
import { BaseRepository } from './base.repository';
import { TYPES } from '@/lib/types';
import {
  AICreditTransaction,
  UsageStatistics,
  DailyUsage,
  ToolUsage,
} from '@/models/aiCreditTransaction.model';
import type { IAICreditTransactionAdapter } from '@/adapters/aiCreditTransaction.adapter';

export interface IAICreditTransactionRepository
  extends BaseRepository<AICreditTransaction> {
  /**
   * Get transactions for a specific session
   */
  getSessionTransactions(sessionId: string): Promise<AICreditTransaction[]>;

  /**
   * Get transactions for a specific user
   */
  getUserTransactions(
    userId: string,
    limit?: number,
    offset?: number
  ): Promise<AICreditTransaction[]>;

  /**
   * Get transactions for a tenant with pagination
   */
  getTenantTransactions(
    tenantId: string,
    limit?: number,
    offset?: number
  ): Promise<AICreditTransaction[]>;

  /**
   * Get usage statistics for a tenant over a period
   */
  getUsageStatistics(tenantId: string, days: number): Promise<UsageStatistics>;

  /**
   * Get daily usage breakdown
   */
  getDailyUsage(tenantId: string, days: number): Promise<DailyUsage[]>;

  /**
   * Get total credits used by tenant
   */
  getTotalCreditsUsed(tenantId: string): Promise<number>;

  /**
   * Get average credits per conversation
   */
  getAverageCreditsPerConversation(tenantId: string): Promise<number>;
}

@injectable()
export class AICreditTransactionRepository
  extends BaseRepository<AICreditTransaction>
  implements IAICreditTransactionRepository
{
  constructor(
    @inject(TYPES.IAICreditTransactionAdapter)
    private readonly transactionAdapter: IAICreditTransactionAdapter
  ) {
    super(transactionAdapter);
  }

  async getSessionTransactions(sessionId: string): Promise<AICreditTransaction[]> {
    return await this.transactionAdapter.getSessionTransactions(sessionId);
  }

  async getUserTransactions(
    userId: string,
    limit?: number,
    offset?: number
  ): Promise<AICreditTransaction[]> {
    return await this.transactionAdapter.getUserTransactions(userId, limit, offset);
  }

  async getTenantTransactions(
    tenantId: string,
    limit?: number,
    offset?: number
  ): Promise<AICreditTransaction[]> {
    return await this.transactionAdapter.getTenantTransactions(
      tenantId,
      limit,
      offset
    );
  }

  async getUsageStatistics(
    tenantId: string,
    days: number = 30
  ): Promise<UsageStatistics> {
    return await this.transactionAdapter.getUsageStatistics(tenantId, days);
  }

  async getDailyUsage(tenantId: string, days: number = 30): Promise<DailyUsage[]> {
    return await this.transactionAdapter.getDailyUsage(tenantId, days);
  }

  async getTotalCreditsUsed(tenantId: string): Promise<number> {
    return await this.transactionAdapter.getTotalCreditsUsed(tenantId);
  }

  async getAverageCreditsPerConversation(tenantId: string): Promise<number> {
    return await this.transactionAdapter.getAverageCreditsPerConversation(tenantId);
  }

  /**
   * Override create to prevent modification (immutable log)
   */
  protected override async beforeCreate(
    data: Partial<AICreditTransaction>
  ): Promise<Partial<AICreditTransaction>> {
    // Validate transaction data
    if (!data.tenant_id) {
      throw new Error('Tenant ID is required');
    }

    if (!data.user_id) {
      throw new Error('User ID is required');
    }

    if (!data.session_id) {
      throw new Error('Session ID is required');
    }

    if (!data.credits_used || data.credits_used <= 0) {
      throw new Error('Credits used must be greater than 0');
    }

    if (data.input_tokens === undefined || data.input_tokens < 0) {
      throw new Error('Input tokens must be provided and non-negative');
    }

    if (data.output_tokens === undefined || data.output_tokens < 0) {
      throw new Error('Output tokens must be provided and non-negative');
    }

    if (!data.cost_breakdown) {
      throw new Error('Cost breakdown is required');
    }

    return data;
  }

  /**
   * Disable update operation (immutable log)
   */
  override async update(
    _id: string,
    _data: Partial<AICreditTransaction>
  ): Promise<AICreditTransaction> {
    throw new Error(
      'Update operation is not allowed on AI Credit Transactions (immutable audit log)'
    );
  }

  /**
   * Disable delete operation (immutable log)
   */
  override async delete(_id: string): Promise<void> {
    throw new Error(
      'Delete operation is not allowed on AI Credit Transactions (immutable audit log)'
    );
  }
}
