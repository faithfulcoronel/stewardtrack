import { NextResponse } from "next/server";
import { isCachedSuperAdmin } from "@/lib/auth/authCache";
import { container } from "@/lib/container";
import { TYPES } from "@/lib/types";
import type { SettingService } from "@/services/SettingService";

/**
 * POST /api/system-settings/integrations/email
 * Saves email configuration to database
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
    if (!body.apiKey || !body.fromEmail) {
      return NextResponse.json(
        { error: "Missing required fields: apiKey, fromEmail" },
        { status: 400 }
      );
    }

    // Save email configuration using SettingService
    const settingService = container.get<SettingService>(TYPES.SettingService);
    await settingService.saveEmailConfig({
      provider: body.provider || "resend",
      apiKey: body.apiKey,
      fromEmail: body.fromEmail,
      fromName: body.fromName || "StewardTrack",
      replyTo: body.replyTo,
    });

    return NextResponse.json({
      success: true,
      configured: true,
      verified: false, // Reset verification when config changes
      message: "Email configuration saved",
    });
  } catch (error) {
    console.error("[API] Error saving email configuration:", error);
    return NextResponse.json(
      { error: "Failed to save email configuration" },
      { status: 500 }
    );
  }
}
