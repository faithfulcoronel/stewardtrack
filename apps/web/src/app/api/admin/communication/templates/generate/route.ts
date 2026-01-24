/**
 * API Route: POST /api/admin/communication/templates/generate
 *
 * AI-powered template generation.
 * Uses Claude AI to generate message templates based on a prompt.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentTenantId } from '@/lib/server/context';
import { container } from '@/lib/container';
import { TYPES } from '@/lib/types';
import type { AICreditService } from '@/services/ai-chat/AICreditService';
import type { CommunicationService } from '@/services/communication/CommunicationService';
import type { TemplateCategory } from '@/models/communication/template.model';
import Anthropic from '@anthropic-ai/sdk';

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

export async function POST(request: NextRequest) {
  try {
    const tenantId = await getCurrentTenantId();
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

    // Call Claude AI
    const anthropic = new Anthropic();

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2048,
      messages: [
        {
          role: 'user',
          content: body.prompt,
        },
      ],
      system: systemPrompt,
    });

    // Extract text response
    const textContent = message.content.find((block) => block.type === 'text');
    const rawResult = textContent ? textContent.text : '{}';

    // Deduct credits
    const tokensUsed = (message.usage?.input_tokens ?? 0) + (message.usage?.output_tokens ?? 0);
    await creditService.deductCredits(tenantId, tokensUsed);

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
