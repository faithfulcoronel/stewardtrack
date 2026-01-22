/**
 * AI Credit Transaction Models
 * Domain models for credit usage audit log (immutable)
 */

/**
 * AI Credit Transaction (Usage Record)
 */
export interface AICreditTransaction {
  id: string;
  tenant_id: string;
  user_id: string;
  session_id: string;
  conversation_turn: number;
  credits_used: number;
  input_tokens: number;
  output_tokens: number;
  tool_executions_count: number;
  cost_breakdown: CostBreakdown;
  model_name: string | null;
  created_at: string;
}

/**
 * Cost breakdown structure
 */
export interface CostBreakdown {
  input_tokens: number;
  output_tokens: number;
  input_cost: number;
  output_cost: number;
  total_cost: number;
  credits_calculated: number;
  tool_count: number;
}

/**
 * Create AICreditTransaction input
 */
export interface CreateAICreditTransactionInput {
  tenant_id: string;
  user_id: string;
  session_id: string;
  conversation_turn: number;
  credits_used: number;
  input_tokens: number;
  output_tokens: number;
  tool_executions_count: number;
  cost_breakdown: CostBreakdown;
  model_name?: string;
}

/**
 * Transaction query options
 */
export interface TransactionQueryOptions {
  tenant_id?: string;
  user_id?: string;
  session_id?: string;
  start_date?: string;
  end_date?: string;
  limit?: number;
  offset?: number;
}

/**
 * Usage statistics
 */
export interface UsageStatistics {
  total_conversations: number;
  total_credits_used: number;
  total_input_tokens: number;
  total_output_tokens: number;
  total_tool_executions: number;
  avg_credits_per_conversation: number;
  daily_usage: DailyUsage[];
  top_tools: ToolUsage[];
}

/**
 * Daily usage data point
 */
export interface DailyUsage {
  date: string;
  credits_used: number;
  conversations: number;
}

/**
 * Tool usage statistics
 */
export interface ToolUsage {
  tool_name: string;
  executions: number;
  avg_credits: number;
}
