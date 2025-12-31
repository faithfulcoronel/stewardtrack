import { NextResponse } from "next/server";
import { isCachedSuperAdmin } from "@/lib/auth/authCache";
import { container } from "@/lib/container";
import { TYPES } from "@/lib/types";
import type { SettingService } from "@/services/SettingService";
import crypto from "crypto";

/**
 * POST /api/system-settings/integrations/webhook/test
 * Send a test webhook payload using stored webhook configuration
 * SECURITY: Super admin only
 */
export async function POST(request: Request) {
  try {
    // Check super admin access
    const isSuperAdmin = await isCachedSuperAdmin();
    if (!isSuperAdmin) {
      return NextResponse.json(
        { error: "Super admin access required" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { url: providedUrl } = body;

    // Get webhook config from stored settings
    const settingService = container.get<SettingService>(TYPES.SettingService);
    const webhookConfig = await settingService.getWebhookConfig();

    // Use provided URL or stored URL
    const webhookUrl = providedUrl || webhookConfig?.url;
    const webhookSecret = webhookConfig?.secret;

    if (!webhookUrl) {
      return NextResponse.json(
        {
          error: "Webhook URL is not configured. Please save your webhook configuration first.",
        },
        { status: 400 }
      );
    }

    // Validate URL format
    try {
      new URL(webhookUrl);
    } catch {
      return NextResponse.json(
        { error: "Invalid webhook URL format" },
        { status: 400 }
      );
    }

    // Create test payload
    const timestamp = new Date().toISOString();
    const payload = {
      event: "test",
      source: "stewardtrack-system-settings",
      timestamp,
      message: "This is a test webhook from StewardTrack System Settings",
      data: {
        test_id: crypto.randomUUID(),
      },
    };

    const payloadString = JSON.stringify(payload);

    // Create signature if secret is configured
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "X-StewardTrack-Event": "test",
      "X-StewardTrack-Timestamp": timestamp,
    };

    if (webhookSecret) {
      const signature = crypto
        .createHmac("sha256", webhookSecret)
        .update(payloadString)
        .digest("hex");
      headers["X-StewardTrack-Signature"] = `sha256=${signature}`;
    }

    // Send webhook request
    try {
      const response = await fetch(webhookUrl, {
        method: "POST",
        headers,
        body: payloadString,
        signal: AbortSignal.timeout(10000), // 10 second timeout
      });

      if (!response.ok) {
        const responseText = await response.text().catch(() => "No response body");
        return NextResponse.json(
          {
            error: `Webhook returned status ${response.status}`,
            details: responseText.substring(0, 500),
          },
          { status: 400 }
        );
      }

      // Mark webhook as verified
      await settingService.markWebhookVerified();

      return NextResponse.json({
        success: true,
        message: "Test webhook sent successfully",
        statusCode: response.status,
        url: webhookUrl,
      });
    } catch (fetchError: unknown) {
      console.error("[Webhook Test] Error:", fetchError);

      let errorMessage = "Failed to send webhook";
      if (fetchError instanceof Error) {
        if (fetchError.name === "TimeoutError" || fetchError.name === "AbortError") {
          errorMessage = "Webhook request timed out after 10 seconds";
        } else {
          errorMessage = fetchError.message;
        }
      }

      return NextResponse.json(
        {
          error: errorMessage,
          details: "Check that the webhook URL is accessible and responding.",
        },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error("[API] Error sending test webhook:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to send test webhook" },
      { status: 500 }
    );
  }
}
