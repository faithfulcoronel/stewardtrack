/**
 * ToolRegistry Implementation
 * Manages the registration and discovery of tool plugins
 *
 * Design Pattern: Registry Pattern
 * SOLID: Single Responsibility - Only manages tool registration
 */

import { ITool, ToolDefinition } from '../../core/interfaces/ITool';
import { IToolRegistry } from '../../core/interfaces/IToolRegistry';

export class ToolRegistry implements IToolRegistry {
  private tools: Map<string, ITool> = new Map();

  /**
   * Register a tool plugin
   */
  register(tool: ITool): void {
    if (this.tools.has(tool.name)) {
      console.warn(`⚠️ Tool "${tool.name}" is already registered. Overwriting...`);
    }

    this.tools.set(tool.name, tool);
    console.log(`✅ Registered tool: ${tool.name}`);
  }

  /**
   * Register multiple tools at once
   */
  registerAll(tools: ITool[]): void {
    tools.forEach(tool => this.register(tool));
  }

  /**
   * Get a tool by name
   */
  getTool(name: string): ITool | undefined {
    return this.tools.get(name);
  }

  /**
   * Get all registered tools
   */
  getAllTools(): ITool[] {
    return Array.from(this.tools.values());
  }

  /**
   * Get tool definitions for Claude API
   */
  getToolDefinitions(): ToolDefinition[] {
    return this.getAllTools().map(tool => tool.getDefinition());
  }

  /**
   * Check if a tool is registered
   */
  hasTool(name: string): boolean {
    return this.tools.has(name);
  }

  /**
   * Unregister a tool
   */
  unregister(name: string): void {
    if (this.tools.delete(name)) {
      console.log(`🗑️ Unregistered tool: ${name}`);
    }
  }

  /**
   * Clear all tools (useful for testing)
   */
  clear(): void {
    this.tools.clear();
    console.log(`🗑️ Cleared all tools`);
  }

  /**
   * Get count of registered tools
   */
  count(): number {
    return this.tools.size;
  }

  /**
   * Get list of tool names
   */
  getToolNames(): string[] {
    return Array.from(this.tools.keys());
  }

  /**
   * Print registered tools (for debugging)
   */
  printTools(): void {
    console.log(`\n📋 Registered Tools (${this.count()}):`);
    this.getAllTools().forEach(tool => {
      console.log(`   - ${tool.name}: ${tool.description}`);
    });
    console.log('');
  }
}

/**
 * Singleton instance (can be replaced with DI container in the future)
 */
let globalRegistry: ToolRegistry | null = null;

export function getToolRegistry(): ToolRegistry {
  if (!globalRegistry) {
    globalRegistry = new ToolRegistry();
  }
  return globalRegistry;
}

/**
 * Reset the global registry (for testing)
 */
export function resetToolRegistry(): void {
  globalRegistry = null;
}
