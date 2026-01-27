/**
 * SuggestAudienceTool
 * AI-powered audience suggestion for church communications
 *
 * Features:
 * - Analyzes message content to suggest appropriate recipients
 * - Returns available recipient groups with relevance scores
 * - Helps users target the right audience for their message
 */

import { BaseTool } from '../../BaseTool';
import { ToolResult, ToolExecutionContext } from '../../../../core/interfaces/ITool';
import { createSupabaseServerClient as createClient } from '@/lib/supabase/server';
import { createAIService, isAIServiceAvailable } from '../../../ai/AIProviderFactory';
import { extractTextFromResponse } from '../../../ai/IAIService';

export interface SuggestAudienceInput {
  message_content: string;
  message_purpose?: string;
  channel?: 'email' | 'sms' | 'both';
}

interface RecipientGroup {
  id: string;
  source: 'family' | 'event' | 'ministry' | 'all_members';
  name: string;
  member_count: number;
  relevance: 'high' | 'medium' | 'low';
  reason: string;
}

export class SuggestAudienceTool extends BaseTool {
  readonly name = 'suggest_audience';
  readonly description =
    'Analyzes a message and suggests the most appropriate recipients from available groups. ' +
    'Returns families, events, ministries, or other groups with relevance scores. ' +
    'Use this when the user wants help deciding who should receive a message ' +
    'or when they ask "who should I send this to?"';

  getCategory(): string {
    return 'Communication Tools';
  }

  getSamplePrompts(): string[] {
    return [
      'Who should receive this event announcement?',
      'Suggest the audience for this volunteer appreciation message',
      'Who would be interested in this youth group update?',
      'Help me choose recipients for this prayer request',
      'Which groups should get this newsletter?',
    ];
  }

  /**
   * Required permission for suggesting communication audience
   */
  protected getRequiredPermissions(): string[] {
    return ['communication:view'];
  }

  protected getInputSchema() {
    return {
      type: 'object' as const,
      properties: {
        message_content: {
          type: 'string',
          description: 'The message content to analyze for audience suggestion',
        },
        message_purpose: {
          type: 'string',
          description: 'Optional: The purpose of the message (e.g., "event announcement", "volunteer appreciation")',
        },
        channel: {
          type: 'string',
          enum: ['email', 'sms', 'both'],
          description: 'Communication channel (affects suggestions based on contact availability)',
        },
      },
      required: ['message_content'],
    };
  }

  async execute(input: SuggestAudienceInput, context: ToolExecutionContext): Promise<ToolResult> {
    this.logStart(input);
    const startTime = Date.now();

    try {
      if (!context.tenantId) {
        return this.error('No tenant context available');
      }

      // Fetch available recipient groups from database
      const supabase = await createClient();
      const tenantId = context.tenantId;

      // Get families
      const { data: familyData } = await supabase
        .from('accounts')
        .select('id, name, account_members(count)')
        .eq('tenant_id', tenantId)
        .eq('account_type', 'family')
        .is('deleted_at', null)
        .limit(20);

      // Get recent events
      const { data: eventData } = await supabase
        .from('schedules')
        .select('id, title, registrations(count)')
        .eq('tenant_id', tenantId)
        .eq('schedule_type', 'event')
        .is('deleted_at', null)
        .order('start_date', { ascending: false })
        .limit(20);

      // Get ministries
      const { data: ministryData } = await supabase
        .from('ministries')
        .select('id, name, ministry_members(count)')
        .eq('tenant_id', tenantId)
        .is('deleted_at', null)
        .limit(20);

      // Get total member count
      const { count: totalMembers } = await supabase
        .from('members')
        .select('id', { count: 'exact', head: true })
        .eq('tenant_id', tenantId)
        .is('deleted_at', null);

      // Format available groups for AI analysis
      const availableGroups = [
        {
          id: 'all_members',
          source: 'all_members' as const,
          name: 'All Church Members',
          member_count: totalMembers ?? 0,
        },
        ...(familyData ?? []).map((f: any) => ({
          id: f.id,
          source: 'family' as const,
          name: f.name,
          member_count: f.account_members?.[0]?.count ?? 0,
        })),
        ...(eventData ?? []).map((e: any) => ({
          id: e.id,
          source: 'event' as const,
          name: e.title,
          member_count: e.registrations?.[0]?.count ?? 0,
        })),
        ...(ministryData ?? []).map((m: any) => ({
          id: m.id,
          source: 'ministry' as const,
          name: m.name,
          member_count: m.ministry_members?.[0]?.count ?? 0,
        })),
      ];

      // Check if AI service is available
      if (!isAIServiceAvailable()) {
        return this.error('AI service is not configured. Please contact your administrator.');
      }

      // Use AI to analyze and suggest appropriate audience
      const aiService = createAIService();

      const systemPrompt = `You are an expert at targeting church communications to the right audience.
Analyze the message content and available recipient groups to suggest the most appropriate audiences.

Available recipient groups:
${JSON.stringify(availableGroups, null, 2)}

Return your analysis in this exact JSON format:
{
  "suggestions": [
    {
      "id": "group_id",
      "source": "family|event|ministry|all_members",
      "name": "Group Name",
      "member_count": 50,
      "relevance": "high|medium|low",
      "reason": "Brief explanation why this group is appropriate"
    }
  ],
  "analysis": "Overall analysis of the message and recommended targeting strategy",
  "recommended_action": "What the user should do next"
}

Return ONLY the JSON, no additional text.`;

      const userPrompt = input.message_purpose
        ? `Message purpose: ${input.message_purpose}\n\nMessage content:\n${input.message_content}`
        : `Message content:\n${input.message_content}`;

      const response = await aiService.sendMessage({
        messages: [{ role: 'user', content: userPrompt }],
        system: systemPrompt,
        max_tokens: 1500,
      });

      // Extract text response
      const rawResult = extractTextFromResponse(response) || '';

      // Parse the JSON response
      let aiAnalysis: {
        suggestions: RecipientGroup[];
        analysis: string;
        recommended_action: string;
      };

      try {
        const cleanJson = rawResult
          .replace(/^```json?\n?/m, '')
          .replace(/\n?```$/m, '')
          .trim();
        aiAnalysis = JSON.parse(cleanJson);
      } catch {
        // Default response if parsing fails
        aiAnalysis = {
          suggestions: [
            {
              id: 'all_members',
              source: 'all_members',
              name: 'All Church Members',
              member_count: totalMembers ?? 0,
              relevance: 'medium',
              reason: 'General message - could be sent to all members',
            },
          ],
          analysis: 'Unable to fully analyze - defaulting to all members',
          recommended_action: 'Review the suggested audience and refine based on your needs',
        };
      }

      const tokensUsed = (response.usage?.input_tokens ?? 0) + (response.usage?.output_tokens ?? 0);

      this.logSuccess(Date.now() - startTime);

      return this.success({
        message_preview: input.message_content.substring(0, 200) + (input.message_content.length > 200 ? '...' : ''),
        purpose: input.message_purpose,
        channel: input.channel ?? 'email',
        suggestions: aiAnalysis.suggestions,
        analysis: aiAnalysis.analysis,
        recommended_action: aiAnalysis.recommended_action,
        total_available_groups: availableGroups.length,
        tokens_used: tokensUsed,
        summary: `Suggested ${aiAnalysis.suggestions.length} recipient group(s)`,
      });
    } catch (error: any) {
      this.logError(error);
      return this.error(`Failed to suggest audience: ${error.message || 'Unknown error'}`);
    }
  }

  getProgressMessage(input: SuggestAudienceInput): string {
    return 'Analyzing message and suggesting appropriate recipients...';
  }

  generateComponents(result: ToolResult): any[] | null {
    if (!result.success || !result.data || !result.data.suggestions) {
      return null;
    }

    return [
      {
        type: 'AudienceSuggestions',
        props: {
          suggestions: result.data.suggestions,
          analysis: result.data.analysis,
          recommendedAction: result.data.recommended_action,
        },
      },
    ];
  }

  getSystemPromptSection(): string {
    return `
SUGGEST AUDIENCE TOOL - Usage Instructions:

**When to Use:**
- User asks who should receive a message
- User wants help targeting their communication
- User is unsure about the right audience for an announcement
- Examples: "Who should I send this to?", "Suggest recipients for this message"

**Input Options:**
- message_content (required): The message to analyze
- message_purpose: Optional description of the message intent
- channel: email, sms, or both (affects suggestions)

**How It Works:**
1. Analyzes the message content and intent
2. Retrieves available recipient groups (families, events, ministries)
3. Uses AI to match message to appropriate audiences
4. Returns groups with relevance scores and reasoning

**Relevance Levels:**
- high: Perfect match for the message content
- medium: Could be relevant depending on user intent
- low: May have some overlap but not primary audience

**Best Practices:**
1. Have the user share the message content before suggesting
2. Explain the reasoning behind each suggestion
3. Let the user know they can combine multiple groups
4. Remind them to consider opt-out preferences

**Example Interaction:**
User: "Who should receive this volunteer appreciation message?"
Assistant: Let me analyze your message and find the best recipients.
[Calls suggest_audience with the message content]
Based on your message, I suggest:
1. Ministry Leaders (high relevance) - They coordinate volunteers
2. All Active Volunteers (high relevance) - Direct recipients of appreciation
3. Volunteer families (medium) - To share the appreciation
    `.trim();
  }
}
