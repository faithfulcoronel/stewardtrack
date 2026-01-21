/**
 * Plugin-Aware Agentic Executor
 * Clean implementation that delegates to plugin system
 *
 * SOLID Principles Applied:
 * - Single Responsibility: Only orchestrates agentic conversation loop
 * - Open/Closed: Adding new tools requires zero changes here
 * - Liskov Substitution: All plugins implement ITool interface
 * - Interface Segregation: Depends only on needed interfaces
 * - Dependency Inversion: Depends on IToolRegistry abstraction
 *
 * Key Features:
 * - Zero switch statements (fully delegates to plugins)
 * - Adding new tool = just register plugin (no code changes here)
 * - Multi-turn agentic conversation loop
 * - Progress streaming support
 * - Token usage tracking
 * - Cancellation support via AbortSignal
 */

import {
  IAIService,
  AIMessage,
  AIResponse,
  extractTextFromResponse,
  extractToolUses,
  hasToolUses,
  createToolResultMessage,
  ToolUse,
} from './IAIService';
import { IToolRegistry } from '../../core/interfaces/IToolRegistry';
import { IExecutor, ExecutionRequest, ExecutionResult, ExecutionStep, ProgressCallback } from '../../core/interfaces/IExecutor';
import { ToolExecutionContext } from '../../core/interfaces/ITool';
import { SystemPromptBuilder } from './SystemPromptBuilder';

export class PluginAwareAgenticExecutor implements IExecutor {
  private maxTurns: number = 10; // Prevent infinite loops

  constructor(
    private aiService: IAIService,
    private toolRegistry: IToolRegistry,
    private onProgress?: ProgressCallback
  ) {}

  /**
   * Execute a query with multi-turn agentic behavior
   * Delegates all tool operations to plugins via registry
   */
  async execute(request: ExecutionRequest, onProgress?: ProgressCallback): Promise<ExecutionResult> {
    const { userQuery, conversationHistory, context } = request;

    // Use progress callback from parameter if provided, otherwise use constructor callback
    const progressCallback = onProgress || this.onProgress;

    const steps: ExecutionStep[] = [];
    const components: any[] = [];
    let totalInputTokens = 0;
    let totalOutputTokens = 0;

    // Build system prompt with composable tool sections (including memories)
    const systemPrompt = SystemPromptBuilder.build(
      context,
      this.toolRegistry,
      request.userEmail,
      request.memories // Pass memories from request
    );

    // Build initial messages
    const messages: AIMessage[] = [
      ...conversationHistory,
      { role: 'user', content: userQuery },
    ];

    // Get tool definitions from registry (plugin system)
    const toolDefinitions = this.toolRegistry.getToolDefinitions();

    let turnCount = 0;
    let currentResponse: AIResponse | null = null;

    // Agentic loop: Continue until Claude provides a final response (no tool use)
    while (turnCount < this.maxTurns) {
      // Check if the operation was cancelled
      request.signal?.throwIfAborted();

      turnCount++;

      console.log(`🔄 Agentic turn ${turnCount}/${this.maxTurns}`);

      // Send progress for multi-turn conversations
      if (turnCount > 1 && progressCallback) {
        progressCallback({
          type: 'thinking',
          content: 'Processing results and planning next steps...',
          timestamp: new Date(),
        });
      }

      // Call AI service with tools
      currentResponse = await this.aiService.sendMessage({
        messages,
        system: systemPrompt,
        max_tokens: 4096,
        temperature: 0.7,
        tools: toolDefinitions,
      });

      // Track token usage (if available)
      if (currentResponse.usage) {
        totalInputTokens += currentResponse.usage.input_tokens;
        totalOutputTokens += currentResponse.usage.output_tokens;
      }

      // Send progress after receiving response
      if (turnCount === 1 && progressCallback) {
        progressCallback({
          type: 'thinking',
          content: 'Analyzing your request...',
          timestamp: new Date(),
        });
      }

      // Extract text response (Claude's thinking)
      const thinkingText = extractTextFromResponse(currentResponse);
      if (thinkingText && thinkingText.trim()) {
        const thinkingStep: ExecutionStep = {
          type: 'thinking',
          content: thinkingText.trim(),
          timestamp: new Date(),
        };
        steps.push(thinkingStep);

        // Notify progress
        if (progressCallback) {
          progressCallback(thinkingStep);
        }
      }

      // Check if Claude wants to use tools
      if (hasToolUses(currentResponse)) {
        const toolUses = extractToolUses(currentResponse);

        console.log(`🛠️ Claude wants to use ${toolUses.length} tool(s)`);

        // Send immediate feedback about tool execution
        if (progressCallback && toolUses.length > 0) {
          const taskText = toolUses.length === 1 ? '1 task' : `${toolUses.length} tasks in parallel`;
          progressCallback({
            type: 'thinking',
            content: `Executing ${taskText}...`,
            timestamp: new Date(),
          });
        }

        // Add Claude's response to conversation
        messages.push({
          role: 'assistant',
          content: currentResponse.content,
        });

        // Execute each tool via plugin system
        const toolResults: any[] = [];

        for (const toolUse of toolUses) {
          // Check if the operation was cancelled before executing each tool
          request.signal?.throwIfAborted();

          console.log(`🔧 Executing tool: ${toolUse.name}`, toolUse.input);

          // Execute via plugin and collect results
          const { result, step, toolComponents } = await this.executeToolViaPlugin(
            toolUse,
            this.createExecutionContext(request, progressCallback)
          );

          // Add step to history
          steps.push(step);

          // Notify progress
          if (progressCallback) {
            progressCallback(step);
          }

          // Collect components from tool
          if (toolComponents && toolComponents.length > 0) {
            console.log(`📦 Collecting ${toolComponents.length} components from ${toolUse.name}`);
            components.push(...toolComponents);
          }

          // Create tool result message for Claude
          // For failures: prefer error message, but fall back to data if error is missing
          // For successes: use data
          const content = result.success
            ? result.data
            : (result.error || result.data || 'Tool execution failed');

          const toolResultMessage = createToolResultMessage(
            toolUse.id,
            content,
            !result.success
          );

          toolResults.push(toolResultMessage);
        }

        // Add tool results to conversation
        messages.push({
          role: 'user',
          content: toolResults,
        });

        // Continue loop - Claude will process tool results and decide next action
      } else {
        // No tool use - Claude has provided final response
        console.log('✅ Claude provided final response (no tool use)');
        break;
      }
    }

    if (turnCount >= this.maxTurns) {
      console.warn('⚠️ Max turns reached, stopping agentic loop');
    }

    // Extract final response
    const finalResponse = currentResponse
      ? extractTextFromResponse(currentResponse).trim()
      : 'I apologize, but I reached the maximum number of steps while processing your request.';

    console.log(`✅ Execution complete. Total components collected: ${components.length}`, components);

    // Send final response as a 'response' type event (not 'thinking')
    // This allows the UI to distinguish between ephemeral thinking and the final message
    if (progressCallback && finalResponse) {
      const responseStep: ExecutionStep = {
        type: 'response',
        content: finalResponse,
        timestamp: new Date(),
      };
      steps.push(responseStep);
      progressCallback(responseStep);
    }

    return {
      finalResponse,
      steps,
      components,
      tokensUsed: {
        input: totalInputTokens,
        output: totalOutputTokens,
      },
    };
  }

  /**
   * Execute a tool via plugin system
   * No switch statements - fully delegated to plugins!
   */
  private async executeToolViaPlugin(
    toolUse: ToolUse,
    context: ToolExecutionContext
  ): Promise<{
    result: any;
    step: ExecutionStep;
    toolComponents: any[];
  }> {
    // Get tool plugin from registry
    const tool = this.toolRegistry.getTool(toolUse.name);

    if (!tool) {
      const errorResult = {
        success: false,
        error: `Tool not found: ${toolUse.name}`,
      };

      return {
        result: errorResult,
        step: {
          type: 'tool_use' as const,
          content: `Error: Tool not found - ${toolUse.name}`,
          toolName: toolUse.name,
          toolInput: toolUse.input,
          toolResult: errorResult,
          timestamp: new Date(),
        },
        toolComponents: [],
      };
    }

    // Get progress message from plugin (no switch statement!)
    const progressMessage = tool.getProgressMessage(toolUse.input);

    // Create execution step
    const step: ExecutionStep = {
      type: 'tool_use',
      content: progressMessage,
      toolName: toolUse.name,
      toolInput: toolUse.input,
      timestamp: new Date(),
    };

    // Execute via plugin (no switch statement!)
    const result = await tool.execute(toolUse.input, context);

    // Add result to step
    step.toolResult = result;

    // Extract components from plugin (no switch statement!)
    const toolComponents = tool.generateComponents?.(result) || [];
    console.log(`🎨 [${toolUse.name}] Generated ${toolComponents.length} components:`, JSON.stringify(toolComponents, null, 2));

    return {
      result,
      step,
      toolComponents,
    };
  }

  /**
   * Create execution context for tools
   */
  private createExecutionContext(request: ExecutionRequest, progressCallback?: ProgressCallback): ToolExecutionContext {
    return {
      userId: request.userId,
      sessionId: request.sessionId,
      userEmail: request.userEmail,
      tenantId: request.tenantId,
      context: request.context,
      signal: request.signal, // Pass abort signal for cancellation support
      onProgress: progressCallback ? (progress) => {
        // Forward tool progress to the main progress callback
        progressCallback(progress);
      } : undefined,
    };
  }
}

/**
 * Factory function
 */
export function createPluginAwareAgenticExecutor(
  aiService: IAIService,
  toolRegistry: IToolRegistry,
  onProgress?: ProgressCallback
): PluginAwareAgenticExecutor {
  return new PluginAwareAgenticExecutor(aiService, toolRegistry, onProgress);
}
