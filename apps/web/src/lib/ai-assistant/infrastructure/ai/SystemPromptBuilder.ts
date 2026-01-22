/**
 * SystemPromptBuilder
 * Builds AI system prompts with composable tool sections
 *
 * This is a placeholder implementation that will be customized for StewardTrack
 */

import { IToolRegistry } from '../../core/interfaces/IToolRegistry';
import { UserContext } from '../../core/value-objects/UserContext';

export class SystemPromptBuilder {
  /**
   * Build system prompt with context and tool instructions
   *
   * @param context - User context (tenant, ministry, campus)
   * @param toolRegistry - Registry of available tools
   * @param userEmail - User's email for personalization
   * @param memories - Relevant memories for context
   */
  static build(
    context?: UserContext | any,
    toolRegistry?: IToolRegistry,
    userEmail?: string,
    memories?: any
  ): string {
    const sections: string[] = [];

    // Base system prompt for StewardTrack AI Assistant
    sections.push(`You are a helpful AI assistant for StewardTrack, a church management system.

You help church staff and administrators with:
- Managing members and their information
- Tracking donations and finances
- Organizing events and ministries
- Viewing reports and analytics
- Answering questions about church operations

Always be respectful, professional, and mindful that you're working with church data.`);

    // Add context information if available
    if (context && context.hasContext?.()) {
      sections.push(`\nCurrent Context:\n${context.toString()}`);
    }

    // Add user information if available
    if (userEmail) {
      sections.push(`\nUser: ${userEmail}`);
    }

    // Add current date
    sections.push(`\nCurrent Date: ${new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })}`);

    // Add memory context if available
    if (memories && memories.length > 0) {
      sections.push(`\nRelevant Information from Previous Conversations:`);
      memories.forEach((memory: any) => {
        sections.push(`- ${memory.content || memory}`);
      });
    }

    // Add tool-specific instructions from plugins (composable architecture)
    if (toolRegistry) {
      const tools = toolRegistry.getAllTools();
      const toolSections = tools
        .map(tool => tool.getSystemPromptSection?.())
        .filter((section): section is string => !!section);

      if (toolSections.length > 0) {
        sections.push('\n=== TOOL-SPECIFIC INSTRUCTIONS ===\n');
        sections.push(toolSections.join('\n\n'));
      }
    }

    // Add response quality standards
    sections.push(`\n=== RESPONSE GUIDELINES ===

1. Be concise and clear in your responses
2. Use tool results to provide accurate information
3. If you don't have access to information, say so honestly
4. Format data in a user-friendly way (tables, lists, etc.)
5. Always respect tenant data isolation and permissions
6. When referencing specific records, include IDs when available`);

    return sections.join('\n');
  }
}
