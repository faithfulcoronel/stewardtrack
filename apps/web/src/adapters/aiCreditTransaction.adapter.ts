import 'server-only';
import { injectable } from 'inversify';
import { BaseAdapter } from './base.adapter';
import { tenantUtils } from '@/utils/tenantUtils';
import {
  AICreditTransaction,
  UsageStatistics,
  DailyUsage,
  ToolUsage,
} from '@/models/aiCreditTransaction.model';
import { IBaseAdapter } from './base.adapter';

export interface IAICreditTransactionAdapter extends IBaseAdapter<AICreditTransaction> {
  getSessionTransactions(sessionId: string): Promise<AICreditTransaction[]>;
  getUserTransactions(
    userId: string,
    limit?: number,
    offset?: number
  ): Promise<AICreditTransaction[]>;
  getTenantTransactions(
    tenantId: string,
    limit?: number,
    offset?: number
  ): Promise<AICreditTransaction[]>;
  getUsageStatistics(tenantId: string, days: number): Promise<UsageStatistics>;
  getDailyUsage(tenantId: string, days: number): Promise<DailyUsage[]>;
  getTotalCreditsUsed(tenantId: string): Promise<number>;
  getAverageCreditsPerConversation(tenantId: string): Promise<number>;
}

@injectable()
export class AICreditTransactionAdapter
  extends BaseAdapter<AICreditTransaction>
  implements IAICreditTransactionAdapter
{
  protected tableName = 'ai_credit_transactions';
  protected defaultSelect = `
    id,
    tenant_id,
    user_id,
    session_id,
    conversation_turn,
    credits_used,
    input_tokens,
    output_tokens,
    tool_executions_count,
    cost_breakdown,
    model_name,
    created_at
  `;

  private async getTenantId() {
    return this.context?.tenantId ?? (await tenantUtils.getTenantId());
  }

  /**
   * Get all transactions for a specific session
   */
  async getSessionTransactions(sessionId: string): Promise<AICreditTransaction[]> {
    const client = await this.getSupabaseClient();
    const { data, error } = await client
      .from(this.tableName)
      .select(this.defaultSelect)
      .eq('session_id', sessionId)
      .order('conversation_turn', { ascending: true });

    if (error) {
      throw new Error(`Failed to get session transactions: ${error.message}`);
    }

    return ((data || []) as unknown) as AICreditTransaction[];
  }

  /**
   * Get transactions for a specific user
   */
  async getUserTransactions(
    userId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<AICreditTransaction[]> {
    const client = await this.getSupabaseClient();
    const { data, error } = await client
      .from(this.tableName)
      .select(this.defaultSelect)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      throw new Error(`Failed to get user transactions: ${error.message}`);
    }

    return ((data || []) as unknown) as AICreditTransaction[];
  }

  /**
   * Get transactions for a tenant with pagination
   */
  async getTenantTransactions(
    tenantId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<AICreditTransaction[]> {
    const client = await this.getSupabaseClient();
    const { data, error } = await client
      .from(this.tableName)
      .select(this.defaultSelect)
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      throw new Error(`Failed to get tenant transactions: ${error.message}`);
    }

    return ((data || []) as unknown) as AICreditTransaction[];
  }

  /**
   * Get usage statistics for a tenant over a period
   */
  async getUsageStatistics(tenantId: string, days: number): Promise<UsageStatistics> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Get aggregate statistics
    const client = await this.getSupabaseClient();
    const { data: aggregateData, error: aggregateError } = await client
      .from(this.tableName)
      .select('credits_used, input_tokens, output_tokens, tool_executions_count, session_id')
      .eq('tenant_id', tenantId)
      .gte('created_at', startDate.toISOString());

    if (aggregateError) {
      throw new Error(`Failed to get usage statistics: ${aggregateError.message}`);
    }

    const transactions = aggregateData as AICreditTransaction[];

    // Calculate statistics
    const totalCreditsUsed = transactions.reduce(
      (sum, t) => sum + t.credits_used,
      0
    );
    const totalInputTokens = transactions.reduce(
      (sum, t) => sum + t.input_tokens,
      0
    );
    const totalOutputTokens = transactions.reduce(
      (sum, t) => sum + t.output_tokens,
      0
    );
    const totalToolExecutions = transactions.reduce(
      (sum, t) => sum + (t.tool_executions_count || 0),
      0
    );

    // Count unique sessions (conversations)
    const uniqueSessions = new Set(transactions.map((t) => t.session_id));
    const totalConversations = uniqueSessions.size;

    const avgCreditsPerConversation =
      totalConversations > 0 ? totalCreditsUsed / totalConversations : 0;

    // Get daily usage and top tools
    const [dailyUsage, topTools] = await Promise.all([
      this.getDailyUsage(tenantId, days),
      this.getTopTools(tenantId, days),
    ]);

    return {
      total_conversations: totalConversations,
      total_credits_used: totalCreditsUsed,
      total_input_tokens: totalInputTokens,
      total_output_tokens: totalOutputTokens,
      total_tool_executions: totalToolExecutions,
      avg_credits_per_conversation: Math.round(avgCreditsPerConversation * 100) / 100,
      daily_usage: dailyUsage,
      top_tools: topTools,
    };
  }

  /**
   * Get daily usage breakdown
   */
  async getDailyUsage(tenantId: string, days: number): Promise<DailyUsage[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const client = await this.getSupabaseClient();
    const { data, error } = await client
      .from(this.tableName)
      .select('created_at, credits_used, session_id')
      .eq('tenant_id', tenantId)
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: true });

    if (error) {
      throw new Error(`Failed to get daily usage: ${error.message}`);
    }

    // Group by date
    const usageByDate = new Map<string, { credits: number; sessions: Set<string> }>();

    (data as AICreditTransaction[]).forEach((transaction) => {
      const date = new Date(transaction.created_at).toISOString().split('T')[0];

      if (!usageByDate.has(date)) {
        usageByDate.set(date, { credits: 0, sessions: new Set() });
      }

      const entry = usageByDate.get(date)!;
      entry.credits += transaction.credits_used;
      entry.sessions.add(transaction.session_id);
    });

    // Convert to array
    return Array.from(usageByDate.entries()).map(([date, data]) => ({
      date,
      credits_used: data.credits,
      conversations: data.sessions.size,
    }));
  }

  /**
   * Get top tools used
   */
  private async getTopTools(tenantId: string, days: number): Promise<ToolUsage[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const client = await this.getSupabaseClient();
    const { data, error } = await client
      .from(this.tableName)
      .select('tool_executions_count, cost_breakdown')
      .eq('tenant_id', tenantId)
      .gte('created_at', startDate.toISOString())
      .gt('tool_executions_count', 0);

    if (error) {
      throw new Error(`Failed to get top tools: ${error.message}`);
    }

    // For now, return empty array as we don't track individual tool names in transactions
    // This can be enhanced in the future if tool names are stored
    return [];
  }

  /**
   * Get total credits used by tenant
   */
  async getTotalCreditsUsed(tenantId: string): Promise<number> {
    const client = await this.getSupabaseClient();
    const { data, error } = await client
      .from(this.tableName)
      .select('credits_used')
      .eq('tenant_id', tenantId);

    if (error) {
      throw new Error(`Failed to get total credits used: ${error.message}`);
    }

    return (data as AICreditTransaction[]).reduce(
      (sum, t) => sum + t.credits_used,
      0
    );
  }

  /**
   * Get average credits per conversation
   */
  async getAverageCreditsPerConversation(tenantId: string): Promise<number> {
    const client = await this.getSupabaseClient();
    const { data, error } = await client
      .from(this.tableName)
      .select('credits_used, session_id')
      .eq('tenant_id', tenantId);

    if (error) {
      throw new Error(
        `Failed to get average credits per conversation: ${error.message}`
      );
    }

    const transactions = data as AICreditTransaction[];
    const uniqueSessions = new Set(transactions.map((t) => t.session_id));
    const totalCredits = transactions.reduce((sum, t) => sum + t.credits_used, 0);

    return uniqueSessions.size > 0
      ? Math.round((totalCredits / uniqueSessions.size) * 100) / 100
      : 0;
  }

  /**
   * Override findAll to filter by tenant
   */
  async findAll(): Promise<AICreditTransaction[]> {
    const tenantId = await this.getTenantId();

    const client = await this.getSupabaseClient();
    const { data, error } = await client
      .from(this.tableName)
      .select(this.defaultSelect)
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .limit(100); // Limit to prevent large queries

    if (error) {
      throw new Error(`Failed to find transactions: ${error.message}`);
    }

    return ((data || []) as unknown) as AICreditTransaction[];
  }
}
