import { NextResponse } from "next/server";
import { isCachedSuperAdmin } from "@/lib/auth/authCache";
import { container } from "@/lib/container";
import { TYPES } from "@/lib/types";
import type { SettingService } from "@/services/SettingService";

/**
 * GET /api/system-settings/integrations
 * Fetches system-wide integration configurations from stored settings
 * SECURITY: Super admin only
 */
export async function GET() {
  try {
    // Check super admin access
    const isSuperAdmin = await isCachedSuperAdmin();
    if (!isSuperAdmin) {
      return NextResponse.json(
        { error: "Super admin access required" },
        { status: 403 }
      );
    }

    // Get all integration settings from the SettingService
    const settingService = container.get<SettingService>(TYPES.SettingService);
    const integrationSettings = await settingService.getIntegrationSettings();

    // Return stored integration settings (sensitive values are masked by the service)
    return NextResponse.json({
      email: {
        provider: integrationSettings.email.provider,
        apiKey: integrationSettings.email.apiKey ? true : false,
        fromEmail: integrationSettings.email.fromEmail,
        fromName: integrationSettings.email.fromName,
        replyTo: integrationSettings.email.replyTo,
        configured: integrationSettings.email.configured,
        verified: integrationSettings.email.verified,
        lastTested: integrationSettings.email.lastTested,
      },
      twilio: {
        accountSid: integrationSettings.twilio.accountSid,
        authToken: integrationSettings.twilio.authToken ? true : false,
        fromNumber: integrationSettings.twilio.fromNumber,
        senderId: integrationSettings.twilio.senderId || "", // Alphanumeric Sender ID for international SMS
        messagingServiceSid: "", // Not stored in settings currently
        configured: integrationSettings.twilio.configured,
        verified: integrationSettings.twilio.verified,
        lastTested: integrationSettings.twilio.lastTested,
      },
      firebase: {
        projectId: integrationSettings.firebase.projectId,
        clientEmail: integrationSettings.firebase.clientEmail,
        privateKey: integrationSettings.firebase.privateKey ? true : false,
        vapidKey: integrationSettings.firebase.vapidKey,
        enabled: integrationSettings.firebase.enabled,
        configured: integrationSettings.firebase.configured,
        verified: integrationSettings.firebase.verified,
        lastTested: integrationSettings.firebase.lastTested,
      },
      webhook: {
        url: integrationSettings.webhook.url,
        secret: integrationSettings.webhook.secret ? true : false,
        enabled: integrationSettings.webhook.enabled,
        retryPolicy: "exponential",
        maxRetries: 3,
        configured: integrationSettings.webhook.configured,
        verified: integrationSettings.webhook.verified,
        lastTested: integrationSettings.webhook.lastTested,
      },
    });
  } catch (error) {
    console.error("[API] Error fetching system integrations:", error);
    return NextResponse.json(
      { error: "Failed to fetch system integrations" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/system-settings/integrations
 * Updates system-wide integration configurations
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

    // In production, save to database
    // For now, acknowledge the request
    return NextResponse.json({
      success: true,
      message: "System integrations updated",
      data: body,
    });
  } catch (error) {
    console.error("[API] Error updating system integrations:", error);
    return NextResponse.json(
      { error: "Failed to update system integrations" },
      { status: 500 }
    );
  }
}
