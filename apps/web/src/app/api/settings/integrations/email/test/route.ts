import { NextRequest, NextResponse } from 'next/server';
import { container } from '@/lib/container';
import { TYPES } from '@/lib/types';
import type { SettingService } from '@/services/SettingService';
import type { TenantService } from '@/services/TenantService';
import { authUtils } from '@/utils/authUtils';
import { tenantUtils } from '@/utils/tenantUtils';

/**
 * POST /api/settings/integrations/email/test
 * Send a test email using the configured email provider
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
    const { email } = body;

    if (!email) {
      return NextResponse.json(
        { error: 'Email address is required for testing' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email address format' },
        { status: 400 }
      );
    }

    const settingService = container.get<SettingService>(TYPES.SettingService);
    const tenantService = container.get<TenantService>(TYPES.TenantService);

    // Get email config from settings
    const emailConfig = await settingService.getEmailConfig();

    if (!emailConfig?.apiKey || !emailConfig?.fromEmail) {
      return NextResponse.json(
        { error: 'Email is not fully configured. Please save your configuration first.' },
        { status: 400 }
      );
    }

    // Get tenant name for the email
    const tenant = await tenantService.findById(tenantId);
    const tenantName = tenant?.name || 'your church';

    // Send test email using Resend
    try {
      const { Resend } = await import('resend');
      const resend = new Resend(emailConfig.apiKey);

      const result = await resend.emails.send({
        from: `${emailConfig.fromName} <${emailConfig.fromEmail}>`,
        to: email,
        replyTo: emailConfig.replyTo || undefined,
        subject: `[StewardTrack] Test Email from ${tenantName}`,
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #1a1a1a; margin-bottom: 16px;">Email Integration Test</h2>
            <p style="color: #4a4a4a; line-height: 1.6;">
              This is a test email from <strong>${tenantName}</strong>.
            </p>
            <p style="color: #4a4a4a; line-height: 1.6;">
              If you received this message, your email integration is working correctly!
            </p>
            <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 24px 0;" />
            <p style="color: #888; font-size: 12px;">
              Sent via StewardTrack Church Management System
            </p>
          </div>
        `,
      });

      if (result.error) {
        throw new Error(result.error.message);
      }

      // Mark email as verified using SettingService
      await settingService.markEmailVerified();

      return NextResponse.json({
        success: true,
        message: 'Test email sent successfully',
        emailId: result.data?.id,
      });
    } catch (emailError: any) {
      console.error('[Email Test] Error:', emailError);

      const errorMessage = emailError.message || 'Failed to send test email';

      return NextResponse.json(
        {
          error: errorMessage,
          details: 'Check your Resend API key and email configuration.',
        },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('[POST /api/settings/integrations/email/test] Error:', error);
    return NextResponse.json(
      { error: 'Failed to send test email' },
      { status: 500 }
    );
  }
}
