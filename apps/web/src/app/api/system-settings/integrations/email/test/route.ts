import { NextResponse } from "next/server";
import { isCachedSuperAdmin } from "@/lib/auth/authCache";
import { container } from "@/lib/container";
import { TYPES } from "@/lib/types";
import type { SettingService } from "@/services/SettingService";

/**
 * POST /api/system-settings/integrations/email/test
 * Send a test email using stored email configuration
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
    const { email } = body;

    if (!email) {
      return NextResponse.json(
        { error: "Email address is required for testing" },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Invalid email format" },
        { status: 400 }
      );
    }

    // Get email config from stored settings
    const settingService = container.get<SettingService>(TYPES.SettingService);
    const emailConfig = await settingService.getEmailConfig();

    if (!emailConfig?.apiKey || !emailConfig?.fromEmail) {
      return NextResponse.json(
        {
          error: "Email is not configured. Please save your email configuration first.",
        },
        { status: 400 }
      );
    }

    // Send test email using Resend
    try {
      const { Resend } = await import("resend");
      const resend = new Resend(emailConfig.apiKey);

      const fromName = emailConfig.fromName || "StewardTrack";

      const result = await resend.emails.send({
        from: `${fromName} <${emailConfig.fromEmail}>`,
        to: email,
        subject: "[StewardTrack] Test Email",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #333;">Test Email from StewardTrack</h1>
            <p>This is a test email sent from the System Settings page.</p>
            <p>If you received this message, your email integration is working correctly!</p>
            <hr style="border: 1px solid #eee; margin: 20px 0;" />
            <p style="color: #666; font-size: 12px;">
              This email was sent from StewardTrack System Settings to verify email configuration.
            </p>
          </div>
        `,
      });

      if (result.error) {
        return NextResponse.json(
          {
            error: result.error.message || "Failed to send test email",
            details: "Check your Resend API key and sender email configuration.",
          },
          { status: 400 }
        );
      }

      // Mark email as verified
      await settingService.markEmailVerified();

      return NextResponse.json({
        success: true,
        message: "Test email sent successfully",
        emailId: result.data?.id,
      });
    } catch (emailError: unknown) {
      console.error("[Email Test] Error:", emailError);

      const errorMessage = emailError instanceof Error ? emailError.message : "Failed to send test email";

      return NextResponse.json(
        {
          error: errorMessage,
          details: "Check your email provider credentials.",
        },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error("[API] Error sending test email:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to send test email" },
      { status: 500 }
    );
  }
}
