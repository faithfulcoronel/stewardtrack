import 'server-only';
import { injectable } from 'inversify';
import { BaseAdapter } from './base.adapter';
import { tenantUtils } from '@/utils/tenantUtils';
import {
  TenantAICredit,
  CreditBalance,
  DeductionResult,
  AdditionResult,
  AutoRechargeConfig,
} from '@/models/aiCredit.model';
import { IBaseAdapter } from './base.adapter';

export interface IAICreditAdapter extends IBaseAdapter<TenantAICredit> {
  getBalance(tenantId: string): Promise<CreditBalance>;
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
  addCredits(
    tenantId: string,
    creditsAmount: number,
    purchaseId: string
  ): Promise<AdditionResult>;
  updateAutoRecharge(tenantId: string, config: AutoRechargeConfig): Promise<void>;
}

@injectable()
export class AICreditAdapter
  extends BaseAdapter<TenantAICredit>
  implements IAICreditAdapter
{
  protected tableName = 'tenant_ai_credits';
  protected defaultSelect = `
    id,
    tenant_id,
    total_credits,
    used_credits,
    remaining_credits,
    auto_recharge_enabled,
    auto_recharge_package_id,
    low_credit_threshold,
    last_purchase_at,
    last_usage_at,
    created_at,
    updated_at
  `;

  private async getTenantId() {
    return this.context?.tenantId ?? (await tenantUtils.getTenantId());
  }

  /**
   * Get credit balance using database function
   */
  async getBalance(tenantId: string): Promise<CreditBalance> {
    const client = await this.getSupabaseClient();
    const { data, error } = await client.rpc('get_tenant_credit_balance', {
      p_tenant_id: tenantId,
    });

    if (error) {
      throw new Error(`Failed to get credit balance: ${error.message}`);
    }

    return data as CreditBalance;
  }

  /**
   * Deduct credits atomically using database function
   */
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
    const client = await this.getSupabaseClient();
    const { data, error} = await client.rpc('deduct_ai_credits', {
      p_tenant_id: tenantId,
      p_credits_amount: creditsAmount,
      p_user_id: userId,
      p_session_id: sessionId,
      p_conversation_turn: conversationTurn,
      p_input_tokens: inputTokens,
      p_output_tokens: outputTokens,
      p_tool_count: toolCount,
      p_cost_breakdown: costBreakdown,
      p_model_name: modelName,
    });

    if (error) {
      throw new Error(`Failed to deduct credits: ${error.message}`);
    }

    return data as DeductionResult;
  }

  /**
   * Add credits atomically using database function
   */
  async addCredits(
    tenantId: string,
    creditsAmount: number,
    purchaseId: string
  ): Promise<AdditionResult> {
    const client = await this.getSupabaseClient();
    const { data, error } = await client.rpc('add_ai_credits', {
      p_tenant_id: tenantId,
      p_credits_amount: creditsAmount,
      p_purchase_id: purchaseId,
    });

    if (error) {
      throw new Error(`Failed to add credits: ${error.message}`);
    }

    return data as AdditionResult;
  }

  /**
   * Update auto-recharge configuration
   */
  async updateAutoRecharge(
    tenantId: string,
    config: AutoRechargeConfig
  ): Promise<void> {
    const client = await this.getSupabaseClient();
    const { error } = await client
      .from(this.tableName)
      .update({
        auto_recharge_enabled: config.enabled,
        auto_recharge_package_id: config.package_id,
        low_credit_threshold: config.threshold,
        updated_at: new Date().toISOString(),
      })
      .eq('tenant_id', tenantId);

    if (error) {
      throw new Error(`Failed to update auto-recharge config: ${error.message}`);
    }
  }

  /**
   * Override findById to use tenant_id as primary key
   */
  async findById(tenantId: string): Promise<TenantAICredit | null> {
    const client = await this.getSupabaseClient();
    const { data, error } = await client
      .from(this.tableName)
      .select(this.defaultSelect)
      .eq('tenant_id', tenantId)
      .single();

    if (error && error.code !== 'PGRST116') {
      // PGRST116 = not found
      throw new Error(`Failed to find tenant credit: ${error.message}`);
    }

    return data as TenantAICredit | null;
  }
}
