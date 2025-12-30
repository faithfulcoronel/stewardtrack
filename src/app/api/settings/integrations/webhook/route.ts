import { NextRequest, NextResponse } from 'next/server';
import { container } from '@/lib/container';
import { TYPES } from '@/lib/types';
import type { SettingService } from '@/services/SettingService';
import { authUtils } from '@/utils/authUtils';
import { tenantUtils } from '@/utils/tenantUtils';

/**
 * POST /api/settings/integrations/webhook
 * Save webhook configuration for the current tenant
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
    const { url, secret, enabled } = body;

    // Validate required fields
    if (!url) {
      return NextResponse.json(
        { error: 'Webhook URL is required' },
        { status: 400 }
      );
    }

    // Validate URL format (must be HTTPS except for localhost)
    try {
      const parsedUrl = new URL(url);
      if (parsedUrl.protocol !== 'https:' && parsedUrl.hostname !== 'localhost') {
        return NextResponse.json(
          { error: 'Webhook URL must use HTTPS (except for localhost)' },
          { status: 400 }
        );
      }
    } catch {
      return NextResponse.json(
        { error: 'Invalid webhook URL format' },
        { status: 400 }
      );
    }

    const settingService = container.get<SettingService>(TYPES.SettingService);

    // Get existing config to check if secret is being masked
    const existingConfig = await settingService.getWebhookConfig();

    // Determine if secret should be updated (only update if not masked value)
    const newSecret = secret && !secret.includes('•')
      ? secret
      : existingConfig?.secret || '';

    // Save webhook configuration using SettingService
    await settingService.saveWebhookConfig({
      url,
      secret: newSecret,
      enabled: enabled ?? true,
    });

    return NextResponse.json({
      success: true,
      message: 'Webhook configuration saved',
      verified: false,
    });
  } catch (error) {
    console.error('[POST /api/settings/integrations/webhook] Error:', error);
    return NextResponse.json(
      { error: 'Failed to save webhook configuration' },
      { status: 500 }
    );
  }
}
