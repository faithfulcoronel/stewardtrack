/**
 * Communication Tools for AI Assistant
 *
 * These tools enable AI-powered communication features:
 * - Composing messages with AI assistance
 * - Generating reusable message templates
 * - Suggesting appropriate audiences for messages
 */

export { ComposeMessageTool } from './ComposeMessageTool';
export type { ComposeMessageInput } from './ComposeMessageTool';

export { GenerateTemplateTool } from './GenerateTemplateTool';
export type { GenerateTemplateInput } from './GenerateTemplateTool';

export { SuggestAudienceTool } from './SuggestAudienceTool';
export type { SuggestAudienceInput } from './SuggestAudienceTool';
