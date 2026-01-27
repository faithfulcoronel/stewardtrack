/**
 * GenerateTemplateTool
 * AI-powered template generation for church communications
 *
 * Features:
 * - Generate reusable message templates
 * - Supports various template categories
 * - Creates templates with variable placeholders
 * - Can optionally save to template library
 */

import { BaseTool } from '../../BaseTool';
import { ToolResult, ToolExecutionContext } from '../../../../core/interfaces/ITool';
import { container } from '@/lib/container';
import { TYPES } from '@/lib/types';
import type { CommunicationService } from '@/services/communication/CommunicationService';
import type { TemplateCategory } from '@/models/communication/template.model';
import { createAIService, isAIServiceAvailable } from '../../../ai/AIProviderFactory';
import { extractTextFromResponse } from '../../../ai/IAIService';

export interface GenerateTemplateInput {
  description: string;
  category?: TemplateCategory;
  channels?: ('email' | 'sms')[];
  template_name?: string;
  save_template?: boolean;
}

const CATEGORY_DESCRIPTIONS: Record<TemplateCategory, string> = {
  welcome: 'Welcome messages for new members joining the church',
  event: 'Event announcements, invitations, and reminders',
  newsletter: 'Regular church newsletters and updates',
  prayer: 'Prayer requests, prayer chains, and spiritual encouragement',
  announcement: 'General church announcements',
  'follow-up': 'Follow-up messages for visitors or members',
  birthday: 'Birthday greetings and celebrations',
  anniversary: 'Anniversary celebrations (membership, wedding)',
  custom: 'General-purpose templates',
};

export class GenerateTemplateTool extends BaseTool {
  readonly name = 'generate_template';
  readonly description =
    'Generates a reusable message template for church communications. ' +
    'Templates include variable placeholders (like {{first_name}}) for personalization. ' +
    'Use this when the user wants to create a template that can be reused for multiple recipients ' +
    'or recurring communications like birthday greetings, event announcements, or newsletters.';

  getCategory(): string {
    return 'Communication Tools';
  }

  getSamplePrompts(): string[] {
    return [
      'Create a birthday greeting template',
      'Generate a welcome email template for new members',
      'Make a template for event announcements',
      'Create a prayer request follow-up template',
      'Generate a newsletter template',
      'Create a volunteer thank you template',
    ];
  }

  /**
   * Required permission for generating communication templates
   */
  protected getRequiredPermissions(): string[] {
    return ['communication:manage'];
  }

  protected getInputSchema() {
    return {
      type: 'object' as const,
      properties: {
        description: {
          type: 'string',
          description: 'Description of the template to generate (e.g., "birthday greeting with personal touch", "event announcement with RSVP")',
        },
        category: {
          type: 'string',
          enum: ['welcome', 'event', 'newsletter', 'prayer', 'announcement', 'follow-up', 'birthday', 'anniversary', 'custom'],
          description: 'Template category (default: custom)',
        },
        channels: {
          type: 'array',
          items: {
            type: 'string',
            enum: ['email', 'sms'],
          },
          description: 'Communication channels for this template (default: ["email"])',
        },
        template_name: {
          type: 'string',
          description: 'Name for the template if saving (e.g., "Friendly Birthday Greeting")',
        },
        save_template: {
          type: 'boolean',
          description: 'Whether to save the template to the library (default: false)',
        },
      },
      required: ['description'],
    };
  }

  async execute(input: GenerateTemplateInput, context: ToolExecutionContext): Promise<ToolResult> {
    this.logStart(input);
    const startTime = Date.now();

    try {
      const category = input.category ?? 'custom';
      const channels = input.channels ?? ['email'];
      const includesSms = channels.includes('sms');

      // Build the AI prompt
      const systemPrompt = this.buildSystemPrompt(category, includesSms);
      const userPrompt = input.description;

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
      let templateData: {
        subject?: string;
        content_html?: string;
        content_text?: string;
        sms_content?: string;
        variables?: string[];
      };

      try {
        const cleanJson = rawResult
          .replace(/^```json?\n?/m, '')
          .replace(/\n?```$/m, '')
          .trim();
        templateData = JSON.parse(cleanJson);
      } catch {
        templateData = {
          content_text: rawResult,
        };
      }

      const tokensUsed = (response.usage?.input_tokens ?? 0) + (response.usage?.output_tokens ?? 0);

      // Optionally save the template
      let savedTemplateId: string | undefined;
      if (input.save_template && input.template_name && context.tenantId) {
        try {
          const communicationService = container.get<CommunicationService>(TYPES.CommunicationService);

          const savedTemplate = await communicationService.createTemplate(
            {
              name: input.template_name,
              description: `AI-generated: ${input.description.slice(0, 100)}`,
              category,
              channels,
              subject: templateData.subject,
              content_html: templateData.content_html,
              content_text: templateData.content_text ?? templateData.sms_content,
              is_ai_generated: true,
              ai_prompt: input.description,
            },
            context.tenantId
          );

          savedTemplateId = savedTemplate.id;
        } catch (saveError) {
          console.error('[GenerateTemplateTool] Failed to save template:', saveError);
          // Continue without saving - template is still generated
        }
      }

      this.logSuccess(Date.now() - startTime);

      return this.success({
        description: input.description,
        category,
        channels,
        template: {
          subject: templateData.subject,
          content_html: templateData.content_html,
          content_text: templateData.content_text,
          sms_content: templateData.sms_content,
          variables_detected: templateData.variables ?? this.detectVariables(templateData),
        },
        saved: !!savedTemplateId,
        saved_template_id: savedTemplateId,
        template_name: input.template_name,
        tokens_used: tokensUsed,
        summary: `Generated ${category} template${savedTemplateId ? ' and saved to library' : ''}`,
      });
    } catch (error: any) {
      this.logError(error);
      return this.error(`Failed to generate template: ${error.message || 'Unknown error'}`);
    }
  }

  private buildSystemPrompt(category: TemplateCategory, includesSms: boolean): string {
    const categoryContext = CATEGORY_DESCRIPTIONS[category];

    return `You are an expert at creating church communication templates.
Create professional, warm, and reusable message templates with variable placeholders.

Template Category: ${category}
Context: ${categoryContext}

Guidelines:
- Use variable placeholders: {{first_name}}, {{last_name}}, {{full_name}}, {{church_name}}, {{email}}
- For events, use: {{event_name}}, {{event_date}}, {{event_time}}, {{event_location}}
- Make templates easily customizable
- Use a warm, welcoming tone appropriate for church communication
- Keep content clear and actionable

${includesSms ? `
SMS Requirements:
- Keep SMS version under 160 characters
- Focus on the key message only
- Include a call to action
` : ''}

Return the template in this exact JSON format:
{
  "subject": "Email subject line with {{first_name}} or other variables",
  "content_html": "Full HTML email content with <p> tags and variables",
  "content_text": "Plain text version"${includesSms ? ',\n  "sms_content": "Short SMS version under 160 characters"' : ''},
  "variables": ["first_name", "church_name", "...other variables used"]
}

Return ONLY the JSON, no additional text or markdown formatting.`;
  }

  private detectVariables(templateData: any): string[] {
    const content = [
      templateData.subject ?? '',
      templateData.content_html ?? '',
      templateData.content_text ?? '',
      templateData.sms_content ?? '',
    ].join(' ');

    const variablePattern = /\{\{(\w+)\}\}/g;
    const matches = content.matchAll(variablePattern);
    const variables = new Set<string>();

    for (const match of matches) {
      variables.add(match[1]);
    }

    return Array.from(variables);
  }

  getProgressMessage(input: GenerateTemplateInput): string {
    const category = input.category ?? 'custom';
    return `Generating ${category} template...`;
  }

  generateComponents(result: ToolResult): any[] | null {
    if (!result.success || !result.data || !result.data.template) {
      return null;
    }

    return [
      {
        type: 'GeneratedTemplatePreview',
        props: {
          category: result.data.category,
          channels: result.data.channels,
          template: result.data.template,
          saved: result.data.saved,
          templateName: result.data.template_name,
        },
      },
    ];
  }

  getSystemPromptSection(): string {
    return `
GENERATE TEMPLATE TOOL - Usage Instructions:

**When to Use:**
- User wants to create a reusable message template
- User asks for a template that can be used multiple times
- User wants birthday, event, welcome, or other recurring message formats
- Examples: "Create a birthday template", "Make a volunteer appreciation template"

**Template Categories:**
- welcome: New member welcome messages
- event: Event announcements and invitations
- newsletter: Regular church newsletters
- prayer: Prayer requests and encouragement
- announcement: General announcements
- follow-up: Visitor/member follow-ups
- birthday: Birthday greetings
- anniversary: Anniversary celebrations
- custom: General-purpose

**Input Options:**
- description (required): What the template should be for
- category: Template type (helps with appropriate content)
- channels: email, sms, or both
- template_name: Name if saving to library
- save_template: Whether to save for future use

**Best Practices:**
1. Ask which category best fits the user's needs
2. Confirm if they want email, SMS, or both versions
3. Ask if they want to save it to their template library
4. Preview the template before saving
5. Explain the variable placeholders used

**Example Interaction:**
User: "Create a birthday greeting template"
Assistant: I'll create a birthday greeting template for you!
- Should this be for email, SMS, or both?
- Would you like me to save it to your template library?
- Any specific message or style you'd like to include?

After gathering details, call generate_template with the appropriate parameters.
    `.trim();
  }
}
