import { NextRequest, NextResponse } from 'next/server';
import { container } from '@/lib/container';
import { TYPES } from '@/lib/types';
import { getCurrentTenantId, getCurrentUserId } from '@/lib/server/context';
import { PermissionGate } from '@/lib/access-gate';
import type { SettingService } from '@/services/SettingService';
import { FacebookChannelService } from '@/services/communication/FacebookChannelService';

/**
 * POST /api/admin/communication/facebook/link-preview
 * Fetch Open Graph metadata for a URL to generate link preview
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
