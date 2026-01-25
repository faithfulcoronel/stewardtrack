import { NextRequest, NextResponse } from 'next/server';
import { container } from '@/lib/container';
import { TYPES } from '@/lib/types';
import type { SettingService } from '@/services/SettingService';
import type { TenantService } from '@/services/TenantService';
import { FacebookChannelService } from '@/services/communication/FacebookChannelService';
import { authUtils } from '@/utils/authUtils';
import { tenantUtils } from '@/utils/tenantUtils';

/**
 * POST /api/settings/integrations/facebook/test
 * Send a test post to the configured Facebook Page
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

    const settingService = container.get<SettingService>(TYPES.SettingService);
    const tenantService = container.get<TenantService>(TYPES.TenantService);
    const facebookService = container.get<FacebookChannelService>(TYPES.FacebookChannelService);

    // Get Facebook config from settings
    const facebookConfig = await settingService.getFacebookConfig();

    if (!facebookConfig?.pageId || !facebookConfig?.accessToken) {
      return NextResponse.json(
        { error: 'Facebook is not fully configured. Please save your configuration first.' },
        { status: 400 }
      );
    }

    // Get tenant name for the message
    const tenant = await tenantService.findById(tenantId);
    const tenantName = tenant?.name || 'your church';

    // Post a test message to the Facebook Page
    const testMessage = `[StewardTrack Test] This is a test post from ${tenantName}. If you see this, your Facebook integration is working correctly! You may delete this post.`;

    const result = await facebookService.postToPage(
      facebookConfig.pageId,
      facebookConfig.accessToken,
      testMessage
    );

    if (result.success) {
      // Mark Facebook as verified
      await settingService.markFacebookVerified();

      return NextResponse.json({
        success: true,
        message: 'Test post published successfully',
        postId: result.postId,
        note: 'A test post has been published to your Facebook Page. You can delete it if you wish.',
      });
    } else {
      return NextResponse.json(
        {
          error: result.error || 'Failed to publish test post',
          details: 'Check your Facebook Page permissions and access token.',
        },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('[POST /api/settings/integrations/facebook/test] Error:', error);
    return NextResponse.json(
      { error: 'Failed to send test post to Facebook' },
      { status: 500 }
    );
  }
}
