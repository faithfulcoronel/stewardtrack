/**
 * IToolRegistry Interface
 * Manages the registration and discovery of tool plugins
 *
 * Implements the Registry Pattern for plugin management
 */

import { ITool, ToolDefinition } from './ITool';

export interface IToolRegistry {
  /**
   * Register a tool plugin
   * @param tool - Tool instance to register
   */
  register(tool: ITool): void;

  /**
   * Get a tool by name
   * @param name - Tool name
   * @returns Tool instance or undefined
   */
  getTool(name: string): ITool | undefined;

  /**
   * Get all registered tools
   * @returns Array of all tools
   */
  getAllTools(): ITool[];

  /**
   * Get tool definitions for Claude API
   * @returns Array of tool definitions
   */
  getToolDefinitions(): ToolDefinition[];

  /**
   * Check if a tool is registered
   * @param name - Tool name
   * @returns True if tool exists
   */
  hasTool(name: string): boolean;

  /**
   * Unregister a tool (for testing/cleanup)
   * @param name - Tool name
   */
  unregister(name: string): void;

  /**
   * Get count of registered tools
   */
  count(): number;
}
