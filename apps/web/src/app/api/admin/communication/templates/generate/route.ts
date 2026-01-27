/**
 * API Route: POST /api/admin/communication/templates/generate
 *
 * AI-powered template generation.
 * Uses the AI service (via AIProviderFactory) to generate message templates based on a prompt.
 * Supports both Anthropic API and AWS Bedrock as providers.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentTenantId, getCurrentUserId } from '@/lib/server/context';
import { PermissionGate } from '@/lib/access-gate';
import { container } from '@/lib/container';
import { TYPES } from '@/lib/types';
import type { AICreditService } from '@/services/AICreditService';
import type { CommunicationService } from '@/services/communication/CommunicationService';
import type { TemplateCategory } from '@/models/communication/template.model';
import {
  createAIService,
  isAIServiceAvailable,
} from '@/lib/ai-assistant/infrastructure/ai/AIProviderFactory';
import { extractTextFromResponse } from '@/lib/ai-assistant/infrastructure/ai/IAIService';

interface GenerateRequest {
  prompt: string;
  category?: TemplateCategory;
  channels?: ('email' | 'sms')[];
  saveTemplate?: boolean;
  templateName?: string;
}

const CATEGORY_CONTEXTS: Record<TemplateCategory, string> = {
  welcome: 'This template welcomes new members to the church community.',
  event: 'This template promotes or provides information about church events.',
  newsletter: 'This template is for regular church newsletters and updates.',
  prayer: 'This template is for prayer requests, prayer chains, or spiritual encouragement.',
  announcement: 'This template is for general church announcements.',
  'follow-up': 'This template is for following up with visitors or members.',
  birthday: 'This template celebrates member birthdays.',
  anniversary: 'This template celebrates member anniversaries or milestones.',
  custom: 'This is a general-purpose template.',
};

/**
 * POST /api/admin/communication/templates/generate
 *
 * AI-powered template generation
 * @requires communication:manage permission
 */
export async function POST(request: NextRequest) {
  try {
    const tenantId = await getCurrentTenantId();
    const userId = await getCurrentUserId();

    // Check permission using PermissionGate (single source of truth)
    const permissionGate = new PermissionGate('communication:manage', 'all');
    const accessResult = await permissionGate.check(userId, tenantId);

    if (!accessResult.allowed) {
      return NextResponse.json(
        { success: false, error: accessResult.reason || 'Permission denied' },
        { status: 403 }
      );
    }

    const body: GenerateRequest = await request.json();

    // Validate request
    if (!body.prompt?.trim()) {
      return NextResponse.json(
        { success: false, error: 'Prompt is required' },
        { status: 400 }
      );
    }

    // Check AI credits
    const creditService = container.get<AICreditService>(TYPES.AICreditService);
    const hasCredits = await creditService.hasSufficientCredits(tenantId);

    if (!hasCredits) {
      return NextResponse.json(
        {
          success: false,
          error: 'Insufficient AI credits. Please add more credits to use AI template generation.',
        },
        { status: 402 }
      );
    }

    const category = body.category ?? 'custom';
    const channels = body.channels ?? ['email'];
    const includesSms = channels.includes('sms');

    // Build system prompt
    const systemPrompt = `You are an expert communication writer for church organizations.
Generate a professional, warm, and engaging message template based on the user's request.

Context: ${CATEGORY_CONTEXTS[category]}

Guidelines:
- Use a warm, welcoming tone appropriate for church communication
- Include personalization placeholders like {{first_name}}, {{last_name}}, {{church_name}} where appropriate
- Keep the message professional yet personal
- Make it easy to customize for specific uses

${
  includesSms
    ? `
SMS Requirements:
- Keep SMS version under 160 characters
- Focus on the key message only
- Include a call to action
`
    : ''
}

Return the template in this exact JSON format:
{
  "subject": "Email subject line (for email templates)",
  "contentHtml": "Full HTML email content with <p> tags for paragraphs",
  "contentText": "Plain text version (required for SMS, optional for email)"${includesSms ? ',\n  "smsContent": "Short SMS version under 160 characters"' : ''}
}

Return ONLY the JSON, no additional text or markdown formatting.`;

    // Check if AI service is available
    if (!isAIServiceAvailable()) {
      return NextResponse.json(
        {
          success: false,
          error: 'AI service is not configured. Please contact your administrator.',
        },
        { status: 503 }
      );
    }

    // Create AI service via factory (single source of truth)
    const aiService = createAIService();

    // Send message to AI service
    const response = await aiService.sendMessage({
      messages: [
        {
          role: 'user',
          content: body.prompt,
        },
      ],
      system: systemPrompt,
      max_tokens: 2048,
    });

    // Extract text response using helper function
    const rawResult = extractTextFromResponse(response) || '{}';

    // Deduct credits for AI usage
    const inputTokens = response.usage?.input_tokens ?? 0;
    const outputTokens = response.usage?.output_tokens ?? 0;
    await creditService.deductCredits(
      tenantId,
      userId,
      `template-gen-${Date.now()}`, // sessionId for template generation
      1, // conversationTurn - single request
      inputTokens,
      outputTokens,
      0, // toolCount - no tools used
      response.model ?? 'claude-3-5-sonnet'
    );

    // Parse the JSON response
    let templateData: {
      subject?: string;
      contentHtml?: string;
      contentText?: string;
      smsContent?: string;
    };

    try {
      // Clean up potential markdown code blocks
      const cleanJson = rawResult
        .replace(/^```json?\n?/m, '')
        .replace(/\n?```$/m, '')
        .trim();
      templateData = JSON.parse(cleanJson);
    } catch {
      // If JSON parsing fails, try to extract content
      templateData = {
        contentText: rawResult,
      };
    }

    // Optionally save the template
    let savedTemplate = null;
    if (body.saveTemplate && body.templateName) {
      const communicationService = container.get<CommunicationService>(
        TYPES.CommunicationService
      );

      savedTemplate = await communicationService.createTemplate(
        {
          name: body.templateName,
          description: `AI-generated template: ${body.prompt.slice(0, 100)}`,
          category,
          channels,
          subject: templateData.subject,
          content_html: templateData.contentHtml,
          content_text: templateData.contentText ?? templateData.smsContent,
          is_ai_generated: true,
          ai_prompt: body.prompt,
        },
        tenantId
      );
    }

    return NextResponse.json({
      success: true,
      template: {
        subject: templateData.subject,
        contentHtml: templateData.contentHtml,
        contentText: templateData.contentText ?? templateData.smsContent,
      },
      savedTemplateId: savedTemplate?.id,
      tokensUsed,
    });
  } catch (error) {
    console.error('[Communication AI] Error generating template:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Template generation failed',
      },
      { status: 500 }
    );
  }
}
