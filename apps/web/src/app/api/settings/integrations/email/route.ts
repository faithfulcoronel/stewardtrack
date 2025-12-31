import { NextRequest, NextResponse } from 'next/server';
import { container } from '@/lib/container';
import { TYPES } from '@/lib/types';
import type { SettingService } from '@/services/SettingService';
import { authUtils } from '@/utils/authUtils';
import { tenantUtils } from '@/utils/tenantUtils';

/**
 * POST /api/settings/integrations/email
 * Save email configuration for the current tenant
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
    const { provider, apiKey, fromEmail, fromName, replyTo } = body;

    // Validate required fields
    if (!fromEmail || !fromName) {
      return NextResponse.json(
        { error: 'From Email and From Name are required' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(fromEmail)) {
      return NextResponse.json(
        { error: 'Invalid From Email format' },
        { status: 400 }
      );
    }

    if (replyTo && !emailRegex.test(replyTo)) {
      return NextResponse.json(
        { error: 'Invalid Reply-To Email format' },
        { status: 400 }
      );
    }

    const settingService = container.get<SettingService>(TYPES.SettingService);

    // Get existing config to check if API key is being masked
    const existingConfig = await settingService.getEmailConfig();

    // Determine if API key should be updated (only update if not masked value)
    const newApiKey = apiKey && !apiKey.includes('•')
      ? apiKey
      : existingConfig?.apiKey;

    if (!newApiKey) {
      return NextResponse.json(
        { error: 'API Key is required' },
        { status: 400 }
      );
    }

    // Save email configuration using SettingService
    await settingService.saveEmailConfig({
      provider: provider || 'resend',
      apiKey: newApiKey,
      fromEmail,
      fromName,
      replyTo,
    });

    return NextResponse.json({
      success: true,
      message: 'Email configuration saved',
      verified: false,
    });
  } catch (error) {
    console.error('[POST /api/settings/integrations/email] Error:', error);
    return NextResponse.json(
      { error: 'Failed to save email configuration' },
      { status: 500 }
    );
  }
}
