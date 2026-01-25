import { NextRequest, NextResponse } from 'next/server';
import { container } from '@/lib/container';
import { TYPES } from '@/lib/types';
import type { SettingService } from '@/services/SettingService';
import { FacebookChannelService } from '@/services/communication/FacebookChannelService';
import { authUtils } from '@/utils/authUtils';
import { tenantUtils } from '@/utils/tenantUtils';

/**
 * POST /api/settings/integrations/facebook
 * Save Facebook Page configuration for the current tenant
 */
export async function POST(request: NextRequest) {
  try {
    const user = await authUtils.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const tenantId = await tenantUtils.getTenantId();
    if (!tenantId) {
      return NextResponse.json({ error: 'No tenant context' }, { status: 400 });
    }

    const body = await request.json();
    const { pageId, pageName, accessToken } = body;

    // Validate required fields
    if (!pageId) {
      return NextResponse.json(
        { error: 'Facebook Page ID is required' },
        { status: 400 }
      );
    }

    const settingService = container.get<SettingService>(TYPES.SettingService);

    // Get existing config to check if access token is being masked
    const existingConfig = await settingService.getFacebookConfig();

    // Determine if access token should be updated (only update if not masked value)
    const newAccessToken = accessToken && !accessToken.includes('•')
      ? accessToken
      : existingConfig?.accessToken;

    if (!newAccessToken) {
      return NextResponse.json(
        { error: 'Access Token is required' },
        { status: 400 }
      );
    }

    // Validate the access token and get page info
    const facebookService = container.get<FacebookChannelService>(TYPES.FacebookChannelService);
    const validation = await facebookService.validateToken(newAccessToken);

    if (!validation.valid) {
      return NextResponse.json(
        { error: `Invalid access token: ${validation.error}` },
        { status: 400 }
      );
    }

    // Verify the page ID matches the token
    if (validation.pageId && validation.pageId !== pageId) {
      return NextResponse.json(
        { error: `Access token is for a different page (${validation.pageName || validation.pageId})` },
        { status: 400 }
      );
    }

    // Save Facebook configuration using SettingService
    await settingService.saveFacebookConfig({
      pageId,
      pageName: validation.pageName || pageName || '',
      accessToken: newAccessToken,
    });

    return NextResponse.json({
      success: true,
      message: 'Facebook configuration saved',
      pageName: validation.pageName,
      verified: false,
    });
  } catch (error) {
    console.error('[POST /api/settings/integrations/facebook] Error:', error);
    return NextResponse.json(
      { error: 'Failed to save Facebook configuration' },
      { status: 500 }
    );
  }
}
