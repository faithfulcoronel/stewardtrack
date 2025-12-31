import { NextResponse } from "next/server";
import { isCachedSuperAdmin } from "@/lib/auth/authCache";
import { container } from "@/lib/container";
import { TYPES } from "@/lib/types";
import type { SettingService } from "@/services/SettingService";

/**
 * POST /api/system-settings/integrations/twilio/test
 * Send a test SMS using stored Twilio configuration
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
    const { phone } = body;

    if (!phone) {
      return NextResponse.json(
        { error: "Phone number is required for testing" },
        { status: 400 }
      );
    }

    // Validate phone format (E.164)
    if (!phone.match(/^\+[1-9]\d{1,14}$/)) {
      return NextResponse.json(
        { error: "Phone number must be in E.164 format (e.g., +1234567890)" },
        { status: 400 }
      );
    }

    // Get Twilio config from stored settings
    const settingService = container.get<SettingService>(TYPES.SettingService);
    const twilioConfig = await settingService.getTwilioConfig();

    if (!twilioConfig?.accountSid || !twilioConfig?.authToken || !twilioConfig?.fromNumber) {
      return NextResponse.json(
        {
          error: "Twilio is not configured. Please save your Twilio configuration first.",
        },
        { status: 400 }
      );
    }

    // Initialize Twilio client dynamically
    try {
      const twilio = await import("twilio");
      const client = twilio.default(twilioConfig.accountSid, twilioConfig.authToken);

      // Determine whether to use Sender ID or phone number
      // Use Sender ID for international (non-US) numbers if configured
      const isUSNumber = phone.startsWith("+1");
      const useSenderId = !isUSNumber && twilioConfig.senderId;
      const fromValue = useSenderId ? twilioConfig.senderId : twilioConfig.fromNumber;

      const message = await client.messages.create({
        body: "[StewardTrack] Test message from System Settings. If you received this, your Twilio integration is working correctly!",
        from: fromValue,
        to: phone,
      });

      // Mark Twilio as verified
      await settingService.markTwilioVerified();

      return NextResponse.json({
        success: true,
        message: "Test SMS sent successfully",
        messageSid: message.sid,
        usedSenderId: useSenderId ? twilioConfig.senderId : null,
      });
    } catch (twilioError: unknown) {
      console.error("[Twilio Test] Error:", twilioError);

      // Parse Twilio error
      const errorMessage = twilioError instanceof Error ? twilioError.message : "Failed to send test SMS";
      const errorCode = (twilioError as { code?: number })?.code;

      // Provide helpful suggestions based on error
      let details = "Check your Twilio credentials and phone number configuration.";
      if (errorCode === 21211) {
        details = "Invalid 'To' phone number format. Ensure it's in E.164 format (e.g., +639123456789).";
      } else if (errorCode === 21614 || errorCode === 21408) {
        details = "This phone number cannot receive SMS from your current 'From' number/Sender ID. For international numbers, configure an Alphanumeric Sender ID.";
      }

      return NextResponse.json(
        {
          error: errorMessage,
          code: errorCode,
          details,
        },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error("[API] Error sending Twilio test SMS:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to send test SMS" },
      { status: 500 }
    );
  }
}
