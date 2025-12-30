import { NextRequest, NextResponse } from 'next/server';
import { container } from '@/lib/container';
import { TYPES } from '@/lib/types';
import type { SettingService } from '@/services/SettingService';
import { authUtils } from '@/utils/authUtils';
import { tenantUtils } from '@/utils/tenantUtils';

/**
 * POST /api/settings/integrations/twilio
 * Save Twilio configuration for the current tenant
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
    const { accountSid, authToken, fromNumber } = body;

    // Validate required fields
    if (!accountSid || !fromNumber) {
      return NextResponse.json(
        { error: 'Account SID and From Number are required' },
        { status: 400 }
      );
    }

    // Validate Account SID format
    if (!accountSid.startsWith('AC') || accountSid.length !== 34) {
      return NextResponse.json(
        { error: 'Invalid Twilio Account SID format' },
        { status: 400 }
      );
    }

    // Validate phone number format (basic E.164 check)
    if (!fromNumber.match(/^\+[1-9]\d{1,14}$/)) {
      return NextResponse.json(
        { error: 'Phone number must be in E.164 format (e.g., +1234567890)' },
        { status: 400 }
      );
    }

    const settingService = container.get<SettingService>(TYPES.SettingService);

    // Get existing config to check if auth token is being masked
    const existingConfig = await settingService.getTwilioConfig();

    // Determine if auth token should be updated (only update if not masked value)
    const newAuthToken = authToken && !authToken.includes('•')
      ? authToken
      : existingConfig?.authToken;

    if (!newAuthToken) {
      return NextResponse.json(
        { error: 'Auth Token is required' },
        { status: 400 }
      );
    }

    // Save Twilio configuration using SettingService
    await settingService.saveTwilioConfig({
      accountSid,
      authToken: newAuthToken,
      fromNumber,
    });

    return NextResponse.json({
      success: true,
      message: 'Twilio configuration saved',
      verified: false,
    });
  } catch (error) {
    console.error('[POST /api/settings/integrations/twilio] Error:', error);
    return NextResponse.json(
      { error: 'Failed to save Twilio configuration' },
      { status: 500 }
    );
  }
}
