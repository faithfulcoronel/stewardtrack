import 'server-only';
import { injectable, inject } from 'inversify';
import { TYPES } from '@/lib/types';
import type { AICreditService } from '@/services/AICreditService';
import {
  createAIService,
  isAIServiceAvailable,
  validateAIProviderConfig,
  getCurrentProvider,
} from '@/lib/ai-assistant/infrastructure/ai/AIProviderFactory';
import type { IAIService } from '@/lib/ai-assistant/infrastructure/ai/IAIService';
import { extractTextFromResponse } from '@/lib/ai-assistant/infrastructure/ai/IAIService';
import { getCurrentUserId } from '@/lib/server/context';
import {
  extractImagesFromHtml,
  createMultimodalContent,
  htmlToPlainText,
  type ExtractedImage,
} from '@/lib/utils/extractImagesFromHtml';

/**
 * Tone types for message composition
 */
export type ToneType = 'formal' | 'friendly' | 'casual' | 'urgent';

/**
 * AI assist types
 */
export type AssistType = 'improve' | 'subject' | 'personalize' | 'grammar' | 'shorten';

/**
 * Image data for multimodal AI requests
 */
export interface ImageData {
  /** Base64-encoded image data */
  data: string;
  /** MIME type */
  mediaType: 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp';
}

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
 * Options for AI assist operations that may include images
 */
export interface AIAssistOptions {
  /** Pre-extracted images (if already processed client-side) */
  images?: ImageData[];
  /** Whether to extract images from HTML content automatically */
  extractImages?: boolean;
}

/**
 * CommunicationAIService - AI-powered features for the Communication module
 *
 * This service provides intelligent assistance for message composition,
 * template generation, and audience targeting. It integrates with the
 * existing AI credit system to track usage.
 *
 * Supports multimodal content - can analyze images embedded in messages
 * to provide context-aware suggestions.
 */
export interface ICommunicationAIService {
  /**
   * Check if tenant has sufficient AI credits
   */
  checkCredits(tenantId: string): Promise<boolean>;

  /**
   * Suggest multiple subject lines for an email
   * Can analyze embedded images for context
   */
  suggestSubjectLines(
    content: string,
    context: { purpose?: string; audience?: string },
    tenantId: string,
    options?: AIAssistOptions
  ): Promise<AIOperationResult<SubjectSuggestion[]>>;

  /**
   * Improve message content with AI suggestions
   * Can analyze embedded images for context
   */
  improveContent(
    content: string,
    tone: ToneType,
    tenantId: string,
    options?: AIAssistOptions
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
   * Can analyze embedded images for context
   */
  fixGrammar(
    content: string,
    tenantId: string,
    options?: AIAssistOptions
  ): Promise<AIOperationResult<string>>;

  /**
   * Shorten content (useful for SMS)
   * Can analyze embedded images for context
   */
  shortenContent(
    content: string,
    maxLength: number,
    tenantId: string,
    options?: AIAssistOptions
  ): Promise<AIOperationResult<string>>;

  /**
   * Generate a complete message based on purpose
   * Can analyze provided images for context
   */
  generateMessage(
    purpose: string,
    options: {
      audience?: string;
      tone?: ToneType;
      channel?: 'email' | 'sms' | 'both';
      keyPoints?: string[];
      images?: ImageData[];
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
  private aiService: IAIService | null = null;

  constructor(
    @inject(TYPES.AICreditService) private creditService: AICreditService
  ) {}

  /**
   * Get AI service instance (lazy initialization)
   * Uses the AIProviderFactory as single source of truth
   */
  private getAIService(): IAIService {
    if (!this.aiService) {
      if (!isAIServiceAvailable()) {
        const validation = validateAIProviderConfig();
        throw new Error(
          validation.error ||
            'AI service is not configured. Please set the required environment variables (ANTHROPIC_API_KEY or AWS_REGION for Bedrock).'
        );
      }
      this.aiService = createAIService();
    }
    return this.aiService;
  }

  async checkCredits(tenantId: string): Promise<boolean> {
    return await this.creditService.hasSufficientCredits(tenantId);
  }

  private async deductCredits(
    tenantId: string,
    inputTokens: number,
    outputTokens: number
  ): Promise<void> {
    const totalTokens = inputTokens + outputTokens;
    if (totalTokens > 0) {
      // Get current user ID for credit tracking
      const userId = await getCurrentUserId({ optional: true });
      if (!userId) {
        // If no user context, skip credit deduction (shouldn't happen in normal flow)
        console.warn('[CommunicationAIService] No user context for credit deduction');
        return;
      }

      // Generate a session ID for communication AI operations
      const sessionId = `comm-ai-${Date.now()}`;
      const modelName = getCurrentProvider() === 'bedrock' ? 'claude-3-sonnet-bedrock' : 'claude-3-sonnet';

      await this.creditService.deductCredits(
        tenantId,
        userId,
        sessionId,
        1, // conversationTurn - each call is independent
        inputTokens,
        outputTokens,
        0, // toolCount - no tools in communication AI
        modelName
      );
    }
  }

  /**
   * Process images from HTML content or use provided images
   * Returns images ready for multimodal AI request
   */
  private async processImages(
    content: string,
    options?: AIAssistOptions
  ): Promise<ExtractedImage[]> {
    // If images are already provided, convert to ExtractedImage format
    if (options?.images && options.images.length > 0) {
      return options.images.map((img) => ({
        data: img.data,
        mediaType: img.mediaType,
        source: 'provided',
      }));
    }

    // If extractImages is enabled, extract from HTML
    if (options?.extractImages) {
      try {
        const extracted = await extractImagesFromHtml(content, 5);
        if (extracted.length > 0) {
          console.log(`[CommunicationAIService] Extracted ${extracted.length} images from content`);
        }
        return extracted;
      } catch (error) {
        console.warn('[CommunicationAIService] Failed to extract images:', error);
        return [];
      }
    }

    return [];
  }

  /**
   * Create message content - either simple text or multimodal with images
   */
  private createMessageContent(
    text: string,
    images: ExtractedImage[]
  ): string | Array<{ type: 'text'; text: string } | { type: 'image'; source: { type: 'base64'; media_type: string; data: string } }> {
    if (images.length === 0) {
      return text;
    }

    // Create multimodal content with images and text
    return createMultimodalContent(text, images);
  }

  async suggestSubjectLines(
    content: string,
    context: { purpose?: string; audience?: string },
    tenantId: string,
    options?: AIAssistOptions
  ): Promise<AIOperationResult<SubjectSuggestion[]>> {
    const hasCredits = await this.checkCredits(tenantId);
    if (!hasCredits) {
      throw new Error('Insufficient AI credits');
    }

    // Process images if available
    const images = await this.processImages(content, options);
    const hasImages = images.length > 0;

    const systemPrompt = `You are an expert at writing compelling email subject lines for church communications.
Based on the message content${hasImages ? ' and any images provided' : ''}, generate 5 different subject lines that would encourage recipients to open the email.

Guidelines:
- Keep subject lines under 50 characters when possible
- Make them specific and relevant
- Create a sense of value without being clickbait
- Maintain a warm, church-appropriate tone
${hasImages ? '- If images show event details (dates, times, locations), incorporate relevant specifics into subject lines' : ''}

Return the subject lines in this exact JSON format:
{ "subjects": ["subject 1", "subject 2", "subject 3", "subject 4", "subject 5"] }`;

    // Get plain text from HTML for the prompt
    const textContent = htmlToPlainText(content);
    const userPrompt = context.purpose
      ? `Purpose: ${context.purpose}\nAudience: ${context.audience ?? 'general'}\n\nContent:\n${textContent}`
      : textContent;

    // Create message content (multimodal if images present)
    const messageContent = this.createMessageContent(userPrompt, images);

    const response = await this.getAIService().sendMessage({
      messages: [{ role: 'user', content: messageContent }],
      system: systemPrompt,
      max_tokens: 500,
    });

    const inputTokens = response.usage?.input_tokens ?? 0;
    const outputTokens = response.usage?.output_tokens ?? 0;
    const tokensUsed = inputTokens + outputTokens;
    await this.deductCredits(tenantId, inputTokens, outputTokens);

    const rawResult = extractTextFromResponse(response) || '{"subjects":[]}';

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
    tenantId: string,
    options?: AIAssistOptions
  ): Promise<AIOperationResult<ContentImprovement>> {
    const hasCredits = await this.checkCredits(tenantId);
    if (!hasCredits) {
      throw new Error('Insufficient AI credits');
    }

    // Process images if available
    const images = await this.processImages(content, options);
    const hasImages = images.length > 0;

    const systemPrompt = `You are an expert church communication writer.
Improve the following message to be more engaging, clear, and ${tone} while maintaining a warm, welcoming tone appropriate for a church community.

${hasImages ? `IMPORTANT: The message includes images. Analyze the image content to:
- Extract relevant details (event names, dates, times, locations, speakers, costs)
- Incorporate these details naturally into the improved message
- Make the text complement and enhance what's shown in the images
- Add context that helps readers understand the visual content` : ''}

Return in this exact JSON format:
{
  "improved": "the improved message text (HTML format with <p>, <strong>, <ul>/<li> tags as appropriate)",
  "changes": ["list of changes made"]
}`;

    // Get text content for the prompt
    const textContent = htmlToPlainText(content);
    const messageContent = this.createMessageContent(textContent, images);

    const response = await this.getAIService().sendMessage({
      messages: [{ role: 'user', content: messageContent }],
      system: systemPrompt,
      max_tokens: 2000,
    });

    const inputTokens = response.usage?.input_tokens ?? 0;
    const outputTokens = response.usage?.output_tokens ?? 0;
    const tokensUsed = inputTokens + outputTokens;
    await this.deductCredits(tenantId, inputTokens, outputTokens);

    const rawResult = extractTextFromResponse(response) || '';

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
    tenantId: string,
    options?: AIAssistOptions
  ): Promise<AIOperationResult<string>> {
    const hasCredits = await this.checkCredits(tenantId);
    if (!hasCredits) {
      throw new Error('Insufficient AI credits');
    }

    // Process images if available
    const images = await this.processImages(content, options);
    const hasImages = images.length > 0;

    const systemPrompt = `You are an expert editor.
Fix any grammar, spelling, punctuation, or style issues in the following text.
Maintain the original meaning and tone.
${hasImages ? 'If images contain text that should be referenced, ensure names, dates, and details are spelled correctly.' : ''}
Return ONLY the corrected text, no explanations.`;

    // Get text content for the prompt
    const textContent = htmlToPlainText(content);
    const messageContent = this.createMessageContent(textContent, images);

    const response = await this.getAIService().sendMessage({
      messages: [{ role: 'user', content: messageContent }],
      system: systemPrompt,
      max_tokens: 2000,
    });

    const inputTokens = response.usage?.input_tokens ?? 0;
    const outputTokens = response.usage?.output_tokens ?? 0;
    const tokensUsed = inputTokens + outputTokens;
    await this.deductCredits(tenantId, inputTokens, outputTokens);

    const resultText = extractTextFromResponse(response);
    return {
      data: resultText || content,
      tokensUsed,
    };
  }

  async shortenContent(
    content: string,
    maxLength: number,
    tenantId: string,
    options?: AIAssistOptions
  ): Promise<AIOperationResult<string>> {
    const hasCredits = await this.checkCredits(tenantId);
    if (!hasCredits) {
      throw new Error('Insufficient AI credits');
    }

    // Process images if available
    const images = await this.processImages(content, options);
    const hasImages = images.length > 0;

    const systemPrompt = `You are an expert at condensing messages.
Shorten the following message to under ${maxLength} characters while preserving the key information.
${hasImages ? 'Reference the image content to identify the most important details to keep (event name, date, time, location).' : ''}
Return ONLY the shortened text, no explanations.`;

    // Get text content for the prompt
    const textContent = htmlToPlainText(content);
    const messageContent = this.createMessageContent(textContent, images);

    const response = await this.getAIService().sendMessage({
      messages: [{ role: 'user', content: messageContent }],
      system: systemPrompt,
      max_tokens: 500,
    });

    const inputTokens = response.usage?.input_tokens ?? 0;
    const outputTokens = response.usage?.output_tokens ?? 0;
    const tokensUsed = inputTokens + outputTokens;
    await this.deductCredits(tenantId, inputTokens, outputTokens);

    const resultText = extractTextFromResponse(response);
    return {
      data: resultText || content,
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
      images?: ImageData[];
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

    // Process images if provided
    const images: ExtractedImage[] = (options.images ?? []).map((img) => ({
      data: img.data,
      mediaType: img.mediaType,
      source: 'provided',
    }));
    const hasImages = images.length > 0;

    const systemPrompt = `You are an expert communication writer for church organizations.
Create a warm, engaging message for a church community.

Tone: ${tone}
Channel: ${channel}

${hasImages ? `IMPORTANT: Images have been provided. Analyze them to extract:
- Event name, theme, or title
- Date and time
- Location/venue
- Speaker or host information
- Registration fees or costs
- Any other relevant details

Incorporate all extracted details naturally into your message.` : ''}

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

    // Create multimodal message if images present
    const messageContent = this.createMessageContent(userPrompt, images);

    const response = await this.getAIService().sendMessage({
      messages: [{ role: 'user', content: messageContent }],
      system: systemPrompt,
      max_tokens: 2000,
    });

    const inputTokens = response.usage?.input_tokens ?? 0;
    const outputTokens = response.usage?.output_tokens ?? 0;
    const tokensUsed = inputTokens + outputTokens;
    await this.deductCredits(tenantId, inputTokens, outputTokens);

    const rawResult = extractTextFromResponse(response) || '{}';

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

    const response = await this.getAIService().sendMessage({
      messages: [{ role: 'user', content: `Message type: ${messageType}\nAudience: ${audience}` }],
      system: systemPrompt,
      max_tokens: 300,
    });

    const inputTokens = response.usage?.input_tokens ?? 0;
    const outputTokens = response.usage?.output_tokens ?? 0;
    const tokensUsed = inputTokens + outputTokens;
    await this.deductCredits(tenantId, inputTokens, outputTokens);

    const rawResult = extractTextFromResponse(response) || '{}';

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
