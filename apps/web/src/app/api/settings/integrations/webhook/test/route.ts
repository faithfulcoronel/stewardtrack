import { NextResponse } from 'next/server';
import { container } from '@/lib/container';
import { TYPES } from '@/lib/types';
import type { SettingService } from '@/services/SettingService';
import type { TenantService } from '@/services/TenantService';
import { authUtils } from '@/utils/authUtils';
import { tenantUtils } from '@/utils/tenantUtils';
import crypto from 'crypto';

/**
 * POST /api/settings/integrations/webhook/test
 * Send a test webhook payload to the configured endpoint
 */
export async function POST() {
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

    // Get webhook config from settings
    const webhookConfig = await settingService.getWebhookConfig();

    if (!webhookConfig?.url) {
      return NextResponse.json(
        { error: 'Webhook URL is not configured. Please save your configuration first.' },
        { status: 400 }
      );
    }

    // Get tenant name for the payload
    const tenant = await tenantService.findById(tenantId);
    const tenantName = tenant?.name || 'your church';

    // Build test payload
    const timestamp = Math.floor(Date.now() / 1000);
    const testPayload = {
      event_id: crypto.randomUUID(),
      event_type: 'test.webhook',
      timestamp: new Date().toISOString(),
      tenant_id: tenantId,
      priority: 'normal',
      category: 'system',
      recipient: {
        user_id: user.id,
      },
      notification: {
        title: 'Webhook Test',
        body: `This is a test webhook from ${tenantName}. If you received this, your webhook integration is working correctly!`,
        subject: 'Webhook Integration Test',
      },
      data: {
        test: true,
        source: 'StewardTrack',
      },
      metadata: {
        correlation_id: crypto.randomUUID(),
      },
    };

    // Build headers
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-StewardTrack-Timestamp': timestamp.toString(),
      'X-StewardTrack-Event-Type': 'test.webhook',
      'X-StewardTrack-Message-Id': testPayload.event_id,
    };

    // Add signature if secret is configured
    if (webhookConfig.secret) {
      const signaturePayload = `${timestamp}.${JSON.stringify(testPayload)}`;
      const hmac = crypto.createHmac('sha256', webhookConfig.secret);
      hmac.update(signaturePayload);
      headers['X-StewardTrack-Signature'] = `sha256=${hmac.digest('hex')}`;
    }

    // Send test webhook with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    try {
      const response = await fetch(webhookConfig.url, {
        method: 'POST',
        headers,
        body: JSON.stringify(testPayload),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        // Mark webhook as verified
        await settingService.markWebhookVerified();

        return NextResponse.json({
          success: true,
          message: 'Test webhook sent successfully',
          statusCode: response.status,
          requestId: response.headers.get('X-Request-Id') || undefined,
        });
      }

      // Handle error response
      const errorText = await response.text().catch(() => 'Unknown error');
      return NextResponse.json(
        {
          error: `Webhook returned ${response.status}: ${errorText}`,
          statusCode: response.status,
          details: 'Check your webhook endpoint and ensure it returns a 2xx status code.',
        },
        { status: 400 }
      );
    } catch (fetchError) {
      clearTimeout(timeoutId);

      if (fetchError instanceof Error && fetchError.name === 'AbortError') {
        return NextResponse.json(
          {
            error: 'Webhook request timed out after 10 seconds',
            details: 'Ensure your endpoint is accessible and responds quickly.',
          },
          { status: 400 }
        );
      }

      throw fetchError;
    }
  } catch (error) {
    console.error('[POST /api/settings/integrations/webhook/test] Error:', error);

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      {
        error: 'Failed to send test webhook',
        details: errorMessage,
      },
      { status: 500 }
    );
  }
}
