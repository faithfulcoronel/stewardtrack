import { injectable, inject } from 'inversify';
import { TYPES } from '@/lib/types';
import {
  CreditBalance,
  DeductionResult,
  AdditionResult,
  AutoRechargeConfig,
} from '@/models/aiCredit.model';
import type { IAICreditRepository } from '@/repositories/aiCredit.repository';

// Credit pricing constants (Claude API costs + markup)
const CLAUDE_INPUT_COST_PER_TOKEN = 0.000003; // $3 per 1M tokens
const CLAUDE_OUTPUT_COST_PER_TOKEN = 0.000015; // $15 per 1M tokens
const CREDIT_VALUE = 0.01785; // $0.01785 per credit (75% markup over Claude cost)

/**
 * AI Credit Service
 * Manages credit balance, deduction, and auto-recharge for AI Assistant usage
 */
@injectable()
export class AICreditService {
  constructor(
    @inject(TYPES.IAICreditRepository)
    private readonly creditRepository: IAICreditRepository
  ) {}

  /**
   * Get credit balance for a tenant
   */
  async getBalance(tenantId: string): Promise<CreditBalance> {
    return await this.creditRepository.getBalance(tenantId);
  }

  /**
   * Calculate credits needed based on token usage
   */
  calculateCreditsUsed(inputTokens: number, outputTokens: number): number {
    const inputCost = inputTokens * CLAUDE_INPUT_COST_PER_TOKEN;
    const outputCost = outputTokens * CLAUDE_OUTPUT_COST_PER_TOKEN;
    const totalCost = inputCost + outputCost;

    // Calculate credits and always round UP to ensure we never undercharge
    const creditsFloat = totalCost / CREDIT_VALUE;
    return Math.max(1, Math.ceil(creditsFloat)); // Minimum 1 credit
  }

  /**
   * Deduct credits and log transaction (atomic operation)
   */
  async deductCredits(
    tenantId: string,
    userId: string,
    sessionId: string,
    conversationTurn: number,
    inputTokens: number,
    outputTokens: number,
    toolCount: number,
    modelName: string
  ): Promise<DeductionResult> {
    // Calculate credits based on actual token usage
    const creditsUsed = this.calculateCreditsUsed(inputTokens, outputTokens);

    // Build detailed cost breakdown
    const inputCost = inputTokens * CLAUDE_INPUT_COST_PER_TOKEN;
    const outputCost = outputTokens * CLAUDE_OUTPUT_COST_PER_TOKEN;
    const totalCost = inputCost + outputCost;

    const costBreakdown = {
      input_tokens: inputTokens,
      output_tokens: outputTokens,
      input_cost: inputCost,
      output_cost: outputCost,
      total_cost: totalCost,
      credits_calculated: creditsUsed,
      tool_count: toolCount,
    };

    // Call atomic database function to deduct credits and log transaction
    return await this.creditRepository.deductCredits(
      tenantId,
      creditsUsed,
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

  /**
   * Add credits to tenant balance (after successful payment)
   */
  async addCredits(
    tenantId: string,
    creditsAmount: number,
    purchaseId: string
  ): Promise<AdditionResult> {
    return await this.creditRepository.addCredits(
      tenantId,
      creditsAmount,
      purchaseId
    );
  }

  /**
   * Check if tenant has sufficient credits
   */
  async hasSufficientCredits(
    tenantId: string,
    required: number = 1
  ): Promise<boolean> {
    const balance = await this.getBalance(tenantId);
    return balance.remaining_credits >= required;
  }

  /**
   * Configure auto-recharge settings
   */
  async configureAutoRecharge(
    tenantId: string,
    config: AutoRechargeConfig
  ): Promise<void> {
    // Validate threshold
    if (config.enabled && config.threshold < 0) {
      throw new Error('Threshold must be non-negative');
    }

    // Validate package_id if enabled
    if (config.enabled && !config.package_id) {
      throw new Error('Package ID is required when auto-recharge is enabled');
    }

    await this.creditRepository.updateAutoRecharge(tenantId, config);
  }

  /**
   * Check if auto-recharge should be triggered
   */
  async shouldTriggerAutoRecharge(tenantId: string): Promise<boolean> {
    return await this.creditRepository.shouldTriggerAutoRecharge(tenantId);
  }

  /**
   * Initialize credit record for a new tenant (with trial credits)
   */
  async initializeTenantCredits(
    tenantId: string,
    initialCredits: number = 10
  ): Promise<void> {
    try {
      await this.creditRepository.initializeTenantCredits(tenantId, initialCredits);
    } catch (error) {
      // Ignore if record already exists
      if (!(error as Error).message.includes('duplicate key')) {
        throw error;
      }
    }
  }

  /**
   * Estimate credits needed for a conversation (for UI display)
   */
  estimateCreditsForConversation(
    estimatedInputTokens: number = 500,
    estimatedOutputTokens: number = 600
  ): number {
    return this.calculateCreditsUsed(estimatedInputTokens, estimatedOutputTokens);
  }

  /**
   * Get credit value in currency
   */
  getCreditValue(): number {
    return CREDIT_VALUE;
  }

  /**
   * Calculate cost breakdown for display
   */
  calculateCostBreakdown(inputTokens: number, outputTokens: number) {
    const inputCost = inputTokens * CLAUDE_INPUT_COST_PER_TOKEN;
    const outputCost = outputTokens * CLAUDE_OUTPUT_COST_PER_TOKEN;
    const totalCost = inputCost + outputCost;
    const credits = this.calculateCreditsUsed(inputTokens, outputTokens);

    return {
      inputTokens,
      outputTokens,
      inputCost,
      outputCost,
      totalCost,
      credits,
      creditValue: CREDIT_VALUE,
    };
  }
}
