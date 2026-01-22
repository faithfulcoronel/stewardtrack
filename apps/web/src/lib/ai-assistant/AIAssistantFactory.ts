/**
 * AIAssistantFactory
 * Factory for creating AI Assistant instances with dependency injection
 *
 * This factory creates a fully configured ChatOrchestrator with:
 * - Tool registry
 * - AI executor
 * - Stream handler
 * - All dependencies properly injected
 */

import { ChatOrchestrator } from './application/services/ChatOrchestrator';
import { ToolRegistry } from './application/services/ToolRegistry';
import { PluginAwareAgenticExecutor } from './infrastructure/ai/PluginAwareAgenticExecutor';
import { SSEStreamHandler } from './infrastructure/streaming/SSEStreamHandler';
import { IAIService } from './infrastructure/ai/IAIService';
import { configureTools } from './config/ToolConfiguration';
import { ProgressCallback } from './core/interfaces/IExecutor';

/**
 * Create a ChatOrchestrator instance with all dependencies
 *
 * @param aiService - AI service implementation (Claude, OpenAI, etc.)
 * @param streamController - ReadableStream controller for SSE
 * @param onProgress - Optional progress callback
 * @returns Fully configured ChatOrchestrator
 */
export async function createChatOrchestrator(
  aiService: IAIService,
  streamController: ReadableStreamDefaultController,
  onProgress?: ProgressCallback
): Promise<ChatOrchestrator> {
  console.log('🏭 AIAssistantFactory: Creating ChatOrchestrator...');

  // 1. Configure tools
  const toolRegistry = await configureTools();
  console.log(`   ✅ Tool registry configured with ${toolRegistry.count()} tools`);

  // 2. Create executor
  const executor = new PluginAwareAgenticExecutor(aiService, toolRegistry, onProgress);
  console.log('   ✅ Executor created');

  // 3. Create stream handler
  const streamHandler = new SSEStreamHandler(streamController);
  console.log('   ✅ Stream handler created');

  // 4. Create orchestrator
  const orchestrator = new ChatOrchestrator(executor, toolRegistry, streamHandler);
  console.log('   ✅ ChatOrchestrator created successfully');

  return orchestrator;
}

/**
 * Create a standalone ToolRegistry for testing or API endpoints
 */
export async function createToolRegistry(): Promise<ToolRegistry> {
  return await configureTools();
}
