/**
 * API Route: POST /api/admin/communication/ai/assist
 *
 * AI-powered assistance for message composition.
 * Uses CommunicationAIService to improve content, suggest subject lines,
 * personalize messages, fix grammar, and shorten content.
 *
 * Supports multimodal content - can analyze images embedded in messages
 * when extractImages option is enabled, or via imageUrls for remote images.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentTenantId, getCurrentUserId } from '@/lib/server/context';
import { PermissionGate } from '@/lib/access-gate';
import { container } from '@/lib/container';
import { TYPES } from '@/lib/types';
import type { ICommunicationAIService, ToneType, AssistType, ImageData } from '@/services/communication/CommunicationAIService';
import { fetchImageFromUrl } from '@/lib/utils/extractImagesFromHtml';

interface AssistRequest {
  type: AssistType;
  content: string;
  /** Enable image extraction from HTML content */
  extractImages?: boolean;
  /** Pre-extracted images (base64 encoded) */
  images?: ImageData[];
  /** Remote image URLs to fetch and include in analysis (e.g., social media uploads) */
  imageUrls?: string[];
  context?: {
    subject?: string;
    recipientCount?: number;
    channel?: 'email' | 'sms' | 'both' | 'facebook';
    tone?: ToneType;
    maxLength?: number;
    purpose?: string;
    audience?: string;
    /** Existing campaign name (for autofill - only fill if empty) */
    existingName?: string;
    /** Existing campaign description (for autofill - only fill if empty) */
    existingDescription?: string;
    /** Existing subject line (for autofill - only fill if empty) */
    existingSubject?: string;
  };
}

/**
 * POST /api/admin/communication/ai/assist
 *
 * AI-powered content assistance
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

    const body: AssistRequest = await request.json();

    // Validate request
    if (!body.type || !body.content) {
      return NextResponse.json(
        { success: false, error: 'Type and content are required' },
        { status: 400 }
      );
    }

    const validTypes: AssistType[] = ['improve', 'subject', 'personalize', 'grammar', 'shorten', 'autofill'];
    if (!validTypes.includes(body.type)) {
      return NextResponse.json(
        { success: false, error: 'Invalid assist type' },
        { status: 400 }
      );
    }

    // Get CommunicationAIService from container
    const aiService = container.get<ICommunicationAIService>(TYPES.CommunicationAIService);

    // Check AI credits
    const hasCredits = await aiService.checkCredits(tenantId);
    if (!hasCredits) {
      return NextResponse.json(
        {
          success: false,
          error: 'Insufficient AI credits. Please add more credits to use AI assistance.',
        },
        { status: 402 }
      );
    }

    let response: {
      result: string;
      suggestions?: string[];
      tokensUsed: number;
      changes?: string[];
      campaignName?: string;
      campaignDescription?: string;
      subject?: string;
    };

    // Fetch any remote images (e.g., from social media uploads)
    const fetchedImages: ImageData[] = [];
    if (body.imageUrls && body.imageUrls.length > 0) {
      console.log('[Communication AI] Fetching remote images for analysis:', body.imageUrls.length);
      for (const url of body.imageUrls.slice(0, 5)) { // Limit to 5 images
        try {
          const extracted = await fetchImageFromUrl(url);
          if (extracted) {
            fetchedImages.push({
              data: extracted.data,
              mediaType: extracted.mediaType,
            });
            console.log('[Communication AI] Successfully fetched image from URL');
          }
        } catch (error) {
          console.warn('[Communication AI] Failed to fetch image from URL:', url, error);
        }
      }
    }

    // Combine pre-extracted images with fetched images
    const allImages = [...(body.images ?? []), ...fetchedImages];

    // Prepare AI assist options with image support and channel info
    const aiOptions = {
      extractImages: body.extractImages ?? false,
      images: allImages.length > 0 ? allImages : undefined,
      // Pass channel so AI service can return plain text for Facebook/SMS
      channel: body.context?.channel,
    };

    switch (body.type) {
      case 'subject': {
        const result = await aiService.suggestSubjectLines(
          body.content,
          {
            purpose: body.context?.purpose,
            audience: body.context?.audience,
          },
          tenantId,
          aiOptions
        );
        response = {
          result: result.data[0]?.text ?? '',
          suggestions: result.data.map((s) => s.text),
          tokensUsed: result.tokensUsed,
        };
        break;
      }

      case 'improve': {
        const tone: ToneType = body.context?.tone ?? 'friendly';
        console.log('[Communication AI] Improve request:', { tone, channel: body.context?.channel, contentLength: body.content?.length });
        const result = await aiService.improveContent(body.content, tone, tenantId, aiOptions);
        console.log('[Communication AI] Improve result:', { hasImproved: !!result.data.improved, improvedLength: result.data.improved?.length, changes: result.data.changes });
        response = {
          result: result.data.improved,
          changes: result.data.changes,
          tokensUsed: result.tokensUsed,
        };
        break;
      }

      case 'personalize': {
        // For personalization, we just add placeholders - no AI needed
        const result = await aiService.personalizeMessage(
          body.content,
          {}, // Empty recipient data - returns template with placeholders
          tenantId
        );
        // Add standard placeholders if not present
        let personalizedContent = result.data;
        if (!personalizedContent.includes('{{first_name}}')) {
          personalizedContent = personalizedContent.replace(
            /^(Dear |Hello |Hi )?/i,
            'Dear {{first_name}}, '
          );
        }
        response = {
          result: personalizedContent,
          tokensUsed: result.tokensUsed,
        };
        break;
      }

      case 'grammar': {
        const result = await aiService.fixGrammar(body.content, tenantId, aiOptions);
        response = {
          result: result.data,
          tokensUsed: result.tokensUsed,
        };
        break;
      }

      case 'shorten': {
        const maxLength = body.context?.maxLength ?? (body.context?.channel === 'sms' ? 160 : 500);
        const result = await aiService.shortenContent(body.content, maxLength, tenantId, aiOptions);
        response = {
          result: result.data,
          tokensUsed: result.tokensUsed,
        };
        break;
      }

      case 'autofill': {
        console.log('[Communication AI] Autofill request:', {
          channel: body.context?.channel,
          existingName: body.context?.existingName,
          existingDescription: body.context?.existingDescription,
          existingSubject: body.context?.existingSubject,
          contentLength: body.content?.length,
        });
        const result = await aiService.autoFillCampaignDetails(
          body.content,
          {
            channel: body.context?.channel,
            existingName: body.context?.existingName,
            existingDescription: body.context?.existingDescription,
            existingSubject: body.context?.existingSubject,
          },
          tenantId,
          aiOptions
        );
        console.log('[Communication AI] Autofill result:', {
          campaignName: result.data.campaignName,
          campaignDescription: result.data.campaignDescription,
          subject: result.data.subject,
          tokensUsed: result.tokensUsed,
        });
        response = {
          result: '',
          campaignName: result.data.campaignName,
          campaignDescription: result.data.campaignDescription,
          subject: result.data.subject,
          tokensUsed: result.tokensUsed,
        };
        break;
      }

      default:
        return NextResponse.json(
          { success: false, error: 'Invalid assist type' },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: true,
      ...response,
    });
  } catch (error) {
    console.error('[Communication AI] Error in AI assist:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'AI assistance failed',
      },
      { status: 500 }
    );
  }
}
