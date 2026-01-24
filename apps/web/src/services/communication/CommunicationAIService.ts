import 'server-only';
import { injectable, inject } from 'inversify';
import { TYPES } from '@/lib/types';
import type { AICreditService } from '@/services/ai-chat/AICreditService';
import Anthropic from '@anthropic-ai/sdk';

/**
 * Tone types for message composition
 */
export type ToneType = 'formal' | 'friendly' | 'casual' | 'urgent';

/**
 * AI assist types
 */
export type AssistType = 'improve' | 'subject' | 'personalize' | 'grammar' | 'shorten';

/**
 * Subject line suggestion result
 */
export interface SubjectSuggestion {
  text: string;
  score?: number;
}

/**
 * Content improvement result
 */
export interface ContentImprovement {
  improved: string;
  changes: string[];
}

/**
 * Audience suggestion
 */
export interface AudienceSuggestion {
  groupId: string;
  groupName: string;
  source: 'family' | 'event' | 'ministry' | 'all_members';
  relevance: 'high' | 'medium' | 'low';
  reason: string;
  memberCount: number;
}

/**
 * AI operation result with token tracking
 */
export interface AIOperationResult<T> {
  data: T;
  tokensUsed: number;
}

/**
 * CommunicationAIService - AI-powered features for the Communication module
 *
 * This service provides intelligent assistance for message composition,
 * template generation, and audience targeting. It integrates with the
 * existing AI credit system to track usage.
 */
export interface ICommunicationAIService {
  /**
   * Check if tenant has sufficient AI credits
   */
  checkCredits(tenantId: string): Promise<boolean>;

  /**
   * Suggest multiple subject lines for an email
   */
  suggestSubjectLines(
    content: string,
    context: { purpose?: string; audience?: string },
    tenantId: string
  ): Promise<AIOperationResult<SubjectSuggestion[]>>;

  /**
   * Improve message content with AI suggestions
   */
  improveContent(
    content: string,
    tone: ToneType,
    tenantId: string
  ): Promise<AIOperationResult<ContentImprovement>>;

  /**
   * Personalize a message template for individual recipients
   */
  personalizeMessage(
    template: string,
    recipientData: Record<string, string>,
    tenantId: string
  ): Promise<AIOperationResult<string>>;

  /**
   * Fix grammar and spelling in content
   */
  fixGrammar(
    content: string,
    tenantId: string
  ): Promise<AIOperationResult<string>>;

  /**
   * Shorten content (useful for SMS)
   */
  shortenContent(
    content: string,
    maxLength: number,
    tenantId: string
  ): Promise<AIOperationResult<string>>;

  /**
   * Generate a complete message based on purpose
   */
  generateMessage(
    purpose: string,
    options: {
      audience?: string;
      tone?: ToneType;
      channel?: 'email' | 'sms' | 'both';
      keyPoints?: string[];
    },
    tenantId: string
  ): Promise<AIOperationResult<{
    subject?: string;
    bodyHtml?: string;
    bodyText?: string;
    smsText?: string;
  }>>;

  /**
   * Suggest optimal send time based on audience
   */
  suggestSendTime(
    messageType: string,
    audience: string,
    tenantId: string
  ): Promise<AIOperationResult<{ suggestedTime: string; reasoning: string }>>;
}

@injectable()
export class SupabaseCommunicationAIService implements ICommunicationAIService {
  private anthropic: Anthropic;

  constructor(
    @inject(TYPES.AICreditService) private creditService: AICreditService
  ) {
    this.anthropic = new Anthropic();
  }

  async checkCredits(tenantId: string): Promise<boolean> {
    return await this.creditService.hasSufficientCredits(tenantId);
  }

  private async deductCredits(tenantId: string, tokensUsed: number): Promise<void> {
    await this.creditService.deductCredits(tenantId, tokensUsed);
  }

  async suggestSubjectLines(
    content: string,
    context: { purpose?: string; audience?: string },
    tenantId: string
  ): Promise<AIOperationResult<SubjectSuggestion[]>> {
    const hasCredits = await this.checkCredits(tenantId);
    if (!hasCredits) {
      throw new Error('Insufficient AI credits');
    }

    const systemPrompt = `You are an expert at writing compelling email subject lines for church communications.
Based on the message content, generate 5 different subject lines that would encourage recipients to open the email.

Guidelines:
- Keep subject lines under 50 characters when possible
- Make them specific and relevant
- Create a sense of value without being clickbait
- Maintain a warm, church-appropriate tone

Return the subject lines in this exact JSON format:
{ "subjects": ["subject 1", "subject 2", "subject 3", "subject 4", "subject 5"] }`;

    const userPrompt = context.purpose
      ? `Purpose: ${context.purpose}\nAudience: ${context.audience ?? 'general'}\n\nContent:\n${content}`
      : content;

    const message = await this.anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 500,
      messages: [{ role: 'user', content: userPrompt }],
      system: systemPrompt,
    });

    const tokensUsed = (message.usage?.input_tokens ?? 0) + (message.usage?.output_tokens ?? 0);
    await this.deductCredits(tenantId, tokensUsed);

    const textContent = message.content.find((block) => block.type === 'text');
    const rawResult = textContent ? textContent.text : '{"subjects":[]}';

    try {
      const cleanJson = rawResult.replace(/^```json?\n?/m, '').replace(/\n?```$/m, '').trim();
      const parsed = JSON.parse(cleanJson);
      return {
        data: (parsed.subjects ?? []).map((text: string) => ({ text })),
        tokensUsed,
      };
    } catch {
      return { data: [], tokensUsed };
    }
  }

  async improveContent(
    content: string,
    tone: ToneType,
    tenantId: string
  ): Promise<AIOperationResult<ContentImprovement>> {
    const hasCredits = await this.checkCredits(tenantId);
    if (!hasCredits) {
      throw new Error('Insufficient AI credits');
    }

    const systemPrompt = `You are an expert church communication writer.
Improve the following message to be more engaging, clear, and ${tone} while maintaining a warm, welcoming tone appropriate for a church community.

Return in this exact JSON format:
{
  "improved": "the improved message text",
  "changes": ["list of changes made"]
}`;

    const message = await this.anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      messages: [{ role: 'user', content }],
      system: systemPrompt,
    });

    const tokensUsed = (message.usage?.input_tokens ?? 0) + (message.usage?.output_tokens ?? 0);
    await this.deductCredits(tenantId, tokensUsed);

    const textContent = message.content.find((block) => block.type === 'text');
    const rawResult = textContent ? textContent.text : '';

    try {
      const cleanJson = rawResult.replace(/^```json?\n?/m, '').replace(/\n?```$/m, '').trim();
      const parsed = JSON.parse(cleanJson);
      return {
        data: {
          improved: parsed.improved ?? content,
          changes: parsed.changes ?? [],
        },
        tokensUsed,
      };
    } catch {
      return {
        data: { improved: content, changes: [] },
        tokensUsed,
      };
    }
  }

  async personalizeMessage(
    template: string,
    recipientData: Record<string, string>,
    tenantId: string
  ): Promise<AIOperationResult<string>> {
    const hasCredits = await this.checkCredits(tenantId);
    if (!hasCredits) {
      throw new Error('Insufficient AI credits');
    }

    // Simple variable substitution (no AI needed for basic cases)
    let personalized = template;
    for (const [key, value] of Object.entries(recipientData)) {
      personalized = personalized.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value);
    }

    return { data: personalized, tokensUsed: 0 };
  }

  async fixGrammar(
    content: string,
    tenantId: string
  ): Promise<AIOperationResult<string>> {
    const hasCredits = await this.checkCredits(tenantId);
    if (!hasCredits) {
      throw new Error('Insufficient AI credits');
    }

    const systemPrompt = `You are an expert editor.
Fix any grammar, spelling, punctuation, or style issues in the following text.
Maintain the original meaning and tone.
Return ONLY the corrected text, no explanations.`;

    const message = await this.anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      messages: [{ role: 'user', content }],
      system: systemPrompt,
    });

    const tokensUsed = (message.usage?.input_tokens ?? 0) + (message.usage?.output_tokens ?? 0);
    await this.deductCredits(tenantId, tokensUsed);

    const textContent = message.content.find((block) => block.type === 'text');
    return {
      data: textContent?.text ?? content,
      tokensUsed,
    };
  }

  async shortenContent(
    content: string,
    maxLength: number,
    tenantId: string
  ): Promise<AIOperationResult<string>> {
    const hasCredits = await this.checkCredits(tenantId);
    if (!hasCredits) {
      throw new Error('Insufficient AI credits');
    }

    const systemPrompt = `You are an expert at condensing messages.
Shorten the following message to under ${maxLength} characters while preserving the key information.
Return ONLY the shortened text, no explanations.`;

    const message = await this.anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 500,
      messages: [{ role: 'user', content }],
      system: systemPrompt,
    });

    const tokensUsed = (message.usage?.input_tokens ?? 0) + (message.usage?.output_tokens ?? 0);
    await this.deductCredits(tenantId, tokensUsed);

    const textContent = message.content.find((block) => block.type === 'text');
    return {
      data: textContent?.text ?? content,
      tokensUsed,
    };
  }

  async generateMessage(
    purpose: string,
    options: {
      audience?: string;
      tone?: ToneType;
      channel?: 'email' | 'sms' | 'both';
      keyPoints?: string[];
    },
    tenantId: string
  ): Promise<AIOperationResult<{
    subject?: string;
    bodyHtml?: string;
    bodyText?: string;
    smsText?: string;
  }>> {
    const hasCredits = await this.checkCredits(tenantId);
    if (!hasCredits) {
      throw new Error('Insufficient AI credits');
    }

    const tone = options.tone ?? 'friendly';
    const channel = options.channel ?? 'email';
    const includesSms = channel === 'sms' || channel === 'both';

    const systemPrompt = `You are an expert communication writer for church organizations.
Create a warm, engaging message for a church community.

Tone: ${tone}
Channel: ${channel}

Return in this exact JSON format:
{
  "subject": "email subject line",
  "bodyHtml": "HTML email content with <p> tags",
  "bodyText": "plain text version"${includesSms ? ',\n  "smsText": "SMS version under 160 characters"' : ''}
}`;

    let userPrompt = `Purpose: ${purpose}`;
    if (options.audience) userPrompt += `\nAudience: ${options.audience}`;
    if (options.keyPoints?.length) {
      userPrompt += `\n\nKey points:\n${options.keyPoints.map((p) => `- ${p}`).join('\n')}`;
    }

    const message = await this.anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      messages: [{ role: 'user', content: userPrompt }],
      system: systemPrompt,
    });

    const tokensUsed = (message.usage?.input_tokens ?? 0) + (message.usage?.output_tokens ?? 0);
    await this.deductCredits(tenantId, tokensUsed);

    const textContent = message.content.find((block) => block.type === 'text');
    const rawResult = textContent?.text ?? '{}';

    try {
      const cleanJson = rawResult.replace(/^```json?\n?/m, '').replace(/\n?```$/m, '').trim();
      const parsed = JSON.parse(cleanJson);
      return {
        data: {
          subject: parsed.subject,
          bodyHtml: parsed.bodyHtml,
          bodyText: parsed.bodyText,
          smsText: parsed.smsText,
        },
        tokensUsed,
      };
    } catch {
      return {
        data: { bodyText: rawResult },
        tokensUsed,
      };
    }
  }

  async suggestSendTime(
    messageType: string,
    audience: string,
    tenantId: string
  ): Promise<AIOperationResult<{ suggestedTime: string; reasoning: string }>> {
    const hasCredits = await this.checkCredits(tenantId);
    if (!hasCredits) {
      throw new Error('Insufficient AI credits');
    }

    const systemPrompt = `You are an expert in church communication timing.
Suggest the optimal send time for a church communication.

Return in this exact JSON format:
{
  "suggestedTime": "specific time recommendation (e.g., 'Tuesday 10:00 AM')",
  "reasoning": "brief explanation of why this time is optimal"
}`;

    const message = await this.anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 300,
      messages: [{ role: 'user', content: `Message type: ${messageType}\nAudience: ${audience}` }],
      system: systemPrompt,
    });

    const tokensUsed = (message.usage?.input_tokens ?? 0) + (message.usage?.output_tokens ?? 0);
    await this.deductCredits(tenantId, tokensUsed);

    const textContent = message.content.find((block) => block.type === 'text');
    const rawResult = textContent?.text ?? '{}';

    try {
      const cleanJson = rawResult.replace(/^```json?\n?/m, '').replace(/\n?```$/m, '').trim();
      const parsed = JSON.parse(cleanJson);
      return {
        data: {
          suggestedTime: parsed.suggestedTime ?? 'Tuesday 10:00 AM',
          reasoning: parsed.reasoning ?? 'Mid-week mornings typically have high open rates',
        },
        tokensUsed,
      };
    } catch {
      return {
        data: {
          suggestedTime: 'Tuesday 10:00 AM',
          reasoning: 'Mid-week mornings typically have high open rates',
        },
        tokensUsed,
      };
    }
  }
}
