import { NextRequest, NextResponse } from 'next/server';
import { container } from '@/lib/container';
import { TYPES } from '@/lib/types';
import type { SettingService } from '@/services/SettingService';
import { FacebookChannelService } from '@/services/communication/FacebookChannelService';
import { authUtils } from '@/utils/authUtils';
import { tenantUtils } from '@/utils/tenantUtils';

/**
 * POST /api/admin/communication/facebook/link-preview
 * Fetch Open Graph metadata for a URL to generate link preview
 */
export async function POST(request: NextRequest) {
  try {
    // Verify user is authenticated
    const user = await authUtils.getUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Verify tenant context
    const tenantId = await tenantUtils.getTenantId();
    if (!tenantId) {
      return NextResponse.json(
        { success: false, error: 'No tenant context' },
        { status: 400 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { url } = body;

    if (!url) {
      return NextResponse.json(
        { success: false, error: 'URL is required' },
        { status: 400 }
      );
    }

    // Validate URL format
    try {
      new URL(url);
    } catch {
      return NextResponse.json(
        { success: false, error: 'Invalid URL format' },
        { status: 400 }
      );
    }

    // Get Facebook configuration to use the access token
    const settingService = container.get<SettingService>(TYPES.SettingService);
    const facebookConfig = await settingService.getFacebookConfig();

    if (!facebookConfig?.accessToken) {
      // If no Facebook token, try to fetch basic Open Graph data without Facebook API
      // This is a fallback that uses a simple HTTP fetch
      try {
        const response = await fetch(url, {
          headers: {
            'User-Agent': 'facebookexternalhit/1.1',
          },
        });

        if (!response.ok) {
          return NextResponse.json({
            success: true,
            preview: null,
          });
        }

        const html = await response.text();

        // Extract Open Graph metadata using regex (simple extraction)
        const getMetaContent = (property: string): string | undefined => {
          const regex = new RegExp(`<meta[^>]*property=["']og:${property}["'][^>]*content=["']([^"']+)["']`, 'i');
          const altRegex = new RegExp(`<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:${property}["']`, 'i');
          const match = html.match(regex) || html.match(altRegex);
          return match?.[1];
        };

        const preview = {
          title: getMetaContent('title') || getMetaContent('site_name'),
          description: getMetaContent('description'),
          image: getMetaContent('image'),
        };

        // If no OG tags found, try getting basic title
        if (!preview.title) {
          const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
          preview.title = titleMatch?.[1];
        }

        return NextResponse.json({
          success: true,
          preview: preview.title ? preview : null,
        });
      } catch (error) {
        console.error('[Link Preview] Fallback fetch failed:', error);
        return NextResponse.json({
          success: true,
          preview: null,
        });
      }
    }

    // Use Facebook Graph API to get Open Graph data
    const facebookService = container.get<FacebookChannelService>(TYPES.FacebookChannelService);
    const preview = await facebookService.fetchLinkPreview(url, facebookConfig.accessToken);

    return NextResponse.json({
      success: true,
      preview,
    });
  } catch (error) {
    console.error('[POST /api/admin/communication/facebook/link-preview] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch link preview',
      },
      { status: 500 }
    );
  }
}
