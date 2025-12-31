import { NextResponse } from "next/server";
import { isCachedSuperAdmin } from "@/lib/auth/authCache";
import { container } from "@/lib/container";
import { TYPES } from "@/lib/types";
import type { SettingService } from "@/services/SettingService";

/**
 * POST /api/system-settings/integrations/twilio
 * Saves Twilio configuration to database
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
    if (!body.accountSid || !body.authToken || !body.fromNumber) {
      return NextResponse.json(
        { error: "Missing required fields: accountSid, authToken, fromNumber" },
        { status: 400 }
      );
    }

    // Save Twilio configuration using SettingService
    const settingService = container.get<SettingService>(TYPES.SettingService);
    await settingService.saveTwilioConfig({
      accountSid: body.accountSid,
      authToken: body.authToken,
      fromNumber: body.fromNumber,
      senderId: body.senderId || null, // Alphanumeric Sender ID for international SMS
    });

    return NextResponse.json({
      success: true,
      configured: true,
      verified: false, // Reset verification when config changes
      message: "Twilio configuration saved",
    });
  } catch (error) {
    console.error("[API] Error saving Twilio configuration:", error);
    return NextResponse.json(
      { error: "Failed to save Twilio configuration" },
      { status: 500 }
    );
  }
}
