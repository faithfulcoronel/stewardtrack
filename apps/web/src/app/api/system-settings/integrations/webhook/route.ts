import { NextResponse } from "next/server";
import { isCachedSuperAdmin } from "@/lib/auth/authCache";
import { container } from "@/lib/container";
import { TYPES } from "@/lib/types";
import type { SettingService } from "@/services/SettingService";

/**
 * POST /api/system-settings/integrations/webhook
 * Saves webhook configuration to database
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

    // Validate required fields
    if (!body.url) {
      return NextResponse.json(
        { error: "Missing required field: url" },
        { status: 400 }
      );
    }

    // Validate URL format
    try {
      const webhookUrl = new URL(body.url);
      // Only allow HTTPS in production (HTTP allowed for localhost testing)
      if (webhookUrl.protocol !== 'https:' && !webhookUrl.hostname.includes('localhost')) {
        return NextResponse.json(
          { error: "Webhook URL must use HTTPS" },
          { status: 400 }
        );
      }
    } catch {
      return NextResponse.json(
        { error: "Invalid webhook URL format" },
        { status: 400 }
      );
    }

    // Save webhook configuration using SettingService
    const settingService = container.get<SettingService>(TYPES.SettingService);
    await settingService.saveWebhookConfig({
      url: body.url,
      secret: body.secret || "",
      enabled: body.enabled ?? true,
    });

    return NextResponse.json({
      success: true,
      configured: true,
      verified: false, // Reset verification when config changes
      message: "Webhook configuration saved",
    });
  } catch (error) {
    console.error("[API] Error saving webhook configuration:", error);
    return NextResponse.json(
      { error: "Failed to save webhook configuration" },
      { status: 500 }
    );
  }
}
