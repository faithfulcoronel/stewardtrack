import { NextRequest, NextResponse } from 'next/server';
import { container } from '@/lib/container';
import { TYPES } from '@/lib/types';
import type { SettingService } from '@/services/SettingService';
import type { TenantService } from '@/services/TenantService';
import { authUtils } from '@/utils/authUtils';
import { tenantUtils } from '@/utils/tenantUtils';

/**
 * POST /api/settings/integrations/twilio/test
 * Send a test SMS using the configured Twilio credentials
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
    const { phone } = body;

    if (!phone) {
      return NextResponse.json(
        { error: 'Phone number is required for testing' },
        { status: 400 }
      );
    }

    // Validate phone format
    if (!phone.match(/^\+[1-9]\d{1,14}$/)) {
      return NextResponse.json(
        { error: 'Phone number must be in E.164 format (e.g., +1234567890)' },
        { status: 400 }
      );
    }

    const settingService = container.get<SettingService>(TYPES.SettingService);
    const tenantService = container.get<TenantService>(TYPES.TenantService);

    // Get Twilio config from settings
    const twilioConfig = await settingService.getTwilioConfig();

    if (!twilioConfig?.accountSid || !twilioConfig?.authToken || !twilioConfig?.fromNumber) {
      return NextResponse.json(
        { error: 'Twilio is not fully configured. Please save your configuration first.' },
        { status: 400 }
      );
    }

    // Get tenant name for the message
    const tenant = await tenantService.findById(tenantId);
    const tenantName = tenant?.name || 'your church';

    // Initialize Twilio client dynamically
    try {
      const twilio = await import('twilio');
      const client = twilio.default(twilioConfig.accountSid, twilioConfig.authToken);

      const message = await client.messages.create({
        body: `[StewardTrack] Test message from ${tenantName}. If you received this, your Twilio integration is working correctly!`,
        from: twilioConfig.fromNumber,
        to: phone,
      });

      // Mark Twilio as verified
      await settingService.markTwilioVerified();

      return NextResponse.json({
        success: true,
        message: 'Test SMS sent successfully',
        messageSid: message.sid,
      });
    } catch (twilioError: any) {
      console.error('[Twilio Test] Error:', twilioError);

      // Parse Twilio error
      const errorMessage = twilioError.message || 'Failed to send test SMS';
      const errorCode = twilioError.code;

      return NextResponse.json(
        {
          error: errorMessage,
          code: errorCode,
          details: 'Check your Twilio credentials and phone number configuration.',
        },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('[POST /api/settings/integrations/twilio/test] Error:', error);
    return NextResponse.json(
      { error: 'Failed to send test SMS' },
      { status: 500 }
    );
  }
}
