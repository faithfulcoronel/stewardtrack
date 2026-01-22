import { injectable, inject } from 'inversify';
import { BaseRepository } from './base.repository';
import { TYPES } from '@/lib/types';
import {
  TenantAICredit,
  CreditBalance,
  DeductionResult,
  AdditionResult,
  AutoRechargeConfig,
  CreateTenantAICreditInput,
  UpdateTenantAICreditInput,
} from '@/models/aiCredit.model';
import type { IAICreditAdapter } from '@/adapters/aiCredit.adapter';

export interface IAICreditRepository extends BaseRepository<TenantAICredit> {
  /**
   * Get credit balance for a tenant
   */
  getBalance(tenantId: string): Promise<CreditBalance>;

  /**
   * Deduct credits and log transaction (atomic operation)
   */
  deductCredits(
    tenantId: string,
    creditsAmount: number,
    userId: string,
    sessionId: string,
    conversationTurn: number,
    inputTokens: number,
    outputTokens: number,
    toolCount: number,
    costBreakdown: Record<string, any>,
    modelName: string
  ): Promise<DeductionResult>;

  /**
   * Add credits to tenant balance (atomic operation)
   */
  addCredits(
    tenantId: string,
    creditsAmount: number,
    purchaseId: string
  ): Promise<AdditionResult>;

  /**
   * Update auto-recharge configuration
   */
  updateAutoRecharge(
    tenantId: string,
    config: AutoRechargeConfig
  ): Promise<void>;

  /**
   * Check if auto-recharge should be triggered
   */
  shouldTriggerAutoRecharge(tenantId: string): Promise<boolean>;

  /**
   * Initialize credit record for new tenant
   */
  initializeTenantCredits(
    tenantId: string,
    initialCredits?: number
  ): Promise<TenantAICredit>;
}

@injectable()
export class AICreditRepository
  extends BaseRepository<TenantAICredit>
  implements IAICreditRepository
{
  constructor(
    @inject(TYPES.IAICreditAdapter) private readonly creditAdapter: IAICreditAdapter
  ) {
    super(creditAdapter);
  }

  async getBalance(tenantId: string): Promise<CreditBalance> {
    return await this.creditAdapter.getBalance(tenantId);
  }

  async deductCredits(
    tenantId: string,
    creditsAmount: number,
    userId: string,
    sessionId: string,
    conversationTurn: number,
    inputTokens: number,
    outputTokens: number,
    toolCount: number,
    costBreakdown: Record<string, any>,
    modelName: string
  ): Promise<DeductionResult> {
    return await this.creditAdapter.deductCredits(
      tenantId,
      creditsAmount,
      userId,
      sessionId,
      conversationTurn,
      inputTokens,
      outputTokens,
      toolCount,
      costBreakdown,
      modelName
    );
  }

  async addCredits(
    tenantId: string,
    creditsAmount: number,
    purchaseId: string
  ): Promise<AdditionResult> {
    return await this.creditAdapter.addCredits(tenantId, creditsAmount, purchaseId);
  }

  async updateAutoRecharge(
    tenantId: string,
    config: AutoRechargeConfig
  ): Promise<void> {
    await this.creditAdapter.updateAutoRecharge(tenantId, config);
  }

  async shouldTriggerAutoRecharge(tenantId: string): Promise<boolean> {
    const balance = await this.getBalance(tenantId);
    return (
      balance.auto_recharge_enabled &&
      balance.remaining_credits < balance.low_credit_threshold
    );
  }

  async initializeTenantCredits(
    tenantId: string,
    initialCredits: number = 10
  ): Promise<TenantAICredit> {
    const input: CreateTenantAICreditInput = {
      tenant_id: tenantId,
      total_credits: initialCredits,
      used_credits: 0,
      remaining_credits: initialCredits,
    };
    return await this.create(input);
  }
}
