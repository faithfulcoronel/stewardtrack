/**
 * ComposeMessageTool
 * AI-powered message composition assistant for church communications
 *
 * Features:
 * - Draft messages based on natural language requests
 * - Suggests appropriate tone and style for church context
 * - Can generate both email and SMS content
 * - Includes personalization variables
 */

import { BaseTool } from '../../BaseTool';
import { ToolResult, ToolExecutionContext } from '../../../../core/interfaces/ITool';
import { createAIService, isAIServiceAvailable } from '../../../ai/AIProviderFactory';
import { extractTextFromResponse } from '../../../ai/IAIService';

export interface ComposeMessageInput {
  purpose: string;
  audience?: string;
  tone?: 'formal' | 'friendly' | 'casual' | 'urgent';
  channel?: 'email' | 'sms' | 'both';
  include_personalization?: boolean;
  key_points?: string[];
}

export class ComposeMessageTool extends BaseTool {
  readonly name = 'compose_message';
  readonly description =
    'Composes a church communication message based on the purpose and audience. ' +
    'Can generate email content (with subject line and HTML body) or SMS content (short text). ' +
    'Use this when the user wants to draft a message for members, event announcements, ' +
    'prayer requests, newsletters, or any church-related communication.';

  getCategory(): string {
    return 'Communication Tools';
  }

  getSamplePrompts(): string[] {
    return [
      'Draft a welcome email for new church members',
      'Write an announcement for the upcoming potluck dinner',
      'Compose a prayer request follow-up message',
      'Create an SMS reminder for Sunday service',
      'Write a thank you message for volunteers',
      'Draft a birthday greeting for members',
    ];
  }

  /**
   * Required permission for composing messages
   *
   * NOTE: Permission enforcement is handled by PermissionGate at the
   * executor level (PluginAwareAgenticExecutor) - the single source of truth.
   * This method only DECLARES the required permissions.
   */
  protected getRequiredPermissions(): string[] {
    return ['communication:manage'];
  }

  protected getInputSchema() {
    return {
      type: 'object' as const,
      properties: {
        purpose: {
          type: 'string',
          description: 'The purpose of the message (e.g., "welcome new members", "announce Sunday service changes", "prayer request follow-up")',
        },
        audience: {
          type: 'string',
          description: 'Who the message is for (e.g., "new members", "all congregation", "volunteers", "youth group")',
        },
        tone: {
          type: 'string',
          enum: ['formal', 'friendly', 'casual', 'urgent'],
          description: 'The tone of the message (default: friendly)',
        },
        channel: {
          type: 'string',
          enum: ['email', 'sms', 'both'],
          description: 'The communication channel (default: email)',
        },
        include_personalization: {
          type: 'boolean',
          description: 'Whether to include personalization variables like {{first_name}} (default: true)',
        },
        key_points: {
          type: 'array',
          items: { type: 'string' },
          description: 'Key points to include in the message',
        },
      },
      required: ['purpose'],
    };
  }

  async execute(input: ComposeMessageInput, context: ToolExecutionContext): Promise<ToolResult> {
    this.logStart(input);
    const startTime = Date.now();

    try {
      const channel = input.channel ?? 'email';
      const tone = input.tone ?? 'friendly';
      const includePersonalization = input.include_personalization !== false;

      // Build the AI prompt
      const systemPrompt = this.buildSystemPrompt(tone, channel, includePersonalization);
      const userPrompt = this.buildUserPrompt(input);

      // Check if AI service is available
      if (!isAIServiceAvailable()) {
        return this.error('AI service is not configured. Please contact your administrator.');
      }

      // Create AI service via factory (single source of truth)
      const aiService = createAIService();

      const response = await aiService.sendMessage({
        messages: [{ role: 'user', content: userPrompt }],
        system: systemPrompt,
        max_tokens: 2048,
      });

      // Extract text response
      const rawResult = extractTextFromResponse(response) || '';

      // Parse the JSON response
      let composedMessage: {
        subject?: string;
        body_html?: string;
        body_text?: string;
        sms_text?: string;
      };

      try {
        const cleanJson = rawResult
          .replace(/^```json?\n?/m, '')
          .replace(/\n?```$/m, '')
          .trim();
        composedMessage = JSON.parse(cleanJson);
      } catch {
        // If JSON parsing fails, treat as plain text
        composedMessage = {
          body_text: rawResult,
        };
      }

      this.logSuccess(Date.now() - startTime);

      return this.success({
        purpose: input.purpose,
        audience: input.audience ?? 'general',
        tone,
        channel,
        message: {
          subject: composedMessage.subject,
          body_html: composedMessage.body_html,
          body_text: composedMessage.body_text,
          sms_text: composedMessage.sms_text,
        },
        personalization_used: includePersonalization,
        tokens_used: (response.usage?.input_tokens ?? 0) + (response.usage?.output_tokens ?? 0),
        summary: `Composed ${channel} message for "${input.purpose}"`,
      });
    } catch (error: any) {
      this.logError(error);
      return this.error(`Failed to compose message: ${error.message || 'Unknown error'}`);
    }
  }

  private buildSystemPrompt(tone: string, channel: string, includePersonalization: boolean): string {
    const personalizationNote = includePersonalization
      ? 'Include personalization variables like {{first_name}}, {{last_name}}, {{church_name}} where appropriate.'
      : 'Do not include personalization variables.';

    return `You are an expert communication writer for church organizations.
Create warm, engaging messages that are appropriate for a church community context.

Tone: ${tone}
${personalizationNote}

Guidelines:
- Use a warm, welcoming tone appropriate for church communication
- Be respectful and inclusive
- Keep messages clear and actionable
- For SMS, keep content under 160 characters when possible

Return the message in this exact JSON format:
${channel === 'email' || channel === 'both' ? `{
  "subject": "Email subject line",
  "body_html": "Full HTML email content with <p> tags",
  "body_text": "Plain text version for email"${channel === 'both' ? ',\n  "sms_text": "Short SMS version under 160 characters"' : ''}
}` : `{
  "sms_text": "SMS message under 160 characters"
}`}

Return ONLY the JSON, no additional text or markdown formatting.`;
  }

  private buildUserPrompt(input: ComposeMessageInput): string {
    let prompt = `Purpose: ${input.purpose}`;

    if (input.audience) {
      prompt += `\nAudience: ${input.audience}`;
    }

    if (input.key_points && input.key_points.length > 0) {
      prompt += `\n\nKey points to include:\n${input.key_points.map((p) => `- ${p}`).join('\n')}`;
    }

    return prompt;
  }

  getProgressMessage(input: ComposeMessageInput): string {
    return `Composing message for "${input.purpose}"...`;
  }

  generateComponents(result: ToolResult): any[] | null {
    if (!result.success || !result.data || !result.data.message) {
      return null;
    }

    return [
      {
        type: 'ComposedMessagePreview',
        props: {
          purpose: result.data.purpose,
          audience: result.data.audience,
          tone: result.data.tone,
          channel: result.data.channel,
          message: result.data.message,
        },
      },
    ];
  }

  getSystemPromptSection(): string {
    return `
COMPOSE MESSAGE TOOL - Usage Instructions:

**When to Use:**
- User wants to draft a church communication
- User asks to write an email, SMS, or message
- User needs help composing announcements, newsletters, or greetings
- Examples: "Write a welcome email", "Draft an event announcement", "Compose a birthday greeting"

**Input Options:**
- purpose (required): What the message is for
- audience: Who it's intended for (new members, volunteers, etc.)
- tone: formal, friendly (default), casual, or urgent
- channel: email (default), sms, or both
- include_personalization: Whether to add {{first_name}} etc. (default: true)
- key_points: Specific items to include

**Best Practices:**
1. Ask clarifying questions if the purpose is vague
2. Confirm the audience and tone before composing
3. For SMS, remind users about character limits
4. Present the composed message for user review before using

**Example Interaction:**
User: "Write a message for the youth group about the upcoming retreat"
Assistant: I'll compose a message for you. Let me clarify a few things:
- Should this be an email or SMS (or both)?
- What tone would you prefer - casual for youth, or more formal for parents?
- Any specific details about the retreat (date, location, cost)?

After gathering details, call compose_message with the appropriate parameters.
    `.trim();
  }
}
