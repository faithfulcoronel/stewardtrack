"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { container } from "@/lib/container";
import { TYPES } from "@/lib/types";
import type { AuthService } from "@/services/AuthService";
import type { TenantService } from "@/services/TenantService";
import { clearTenantSession, writeTenantSession } from "@/lib/tenant/session-cache";
import { warmTenantSettingsCache, clearTenantSettingsCache } from "@/lib/tenant/settings-cache";
import { renderPasswordResetEmail } from "@/emails/service/EmailTemplateService";
import { getSupabaseServiceClient } from "@/lib/supabase/service";

export type SignInState = {
  error?: string;
  needsVerification?: boolean;
  email?: string;
};

export type ForgotPasswordState = {
  error?: string;
  success?: boolean;
};

/**
 * Verify Cloudflare Turnstile token
 */
async function verifyTurnstileToken(token: string): Promise<{ success: boolean; error?: string }> {
  const secretKey = process.env.TURNSTILE_SECRET_KEY;

  if (!secretKey) {
    console.warn('[Auth] TURNSTILE_SECRET_KEY not configured, skipping verification');
    return { success: true };
  }

  try {
    const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        secret: secretKey,
        response: token,
      }),
    });

    const result = await response.json();

    if (!result.success) {
      console.error('[Auth] Turnstile verification failed:', result['error-codes']);
      return {
        success: false,
        error: 'Security verification failed. Please try again.'
      };
    }

    return { success: true };
  } catch (error) {
    console.error('[Auth] Turnstile verification error:', error);
    return {
      success: false,
      error: 'Security verification failed. Please try again.'
    };
  }
}

export async function signInWithPassword(
  _prevState: SignInState,
  formData: FormData
): Promise<SignInState> {
  const email = formData.get("email");
  const password = formData.get("password");
  const redirectTo = formData.get("redirectTo");
  const turnstileToken = formData.get("turnstileToken");
  const remember = formData.get("remember") === "on"; // Checkbox value

  if (typeof email !== "string" || typeof password !== "string") {
    return { error: "Email and password are required." };
  }

  // Verify Turnstile CAPTCHA token
  if (typeof turnstileToken !== "string" || !turnstileToken) {
    return { error: "Please complete the security check." };
  }

  const turnstileResult = await verifyTurnstileToken(turnstileToken);
  if (!turnstileResult.success) {
    return { error: turnstileResult.error || "Security verification failed." };
  }

  const authService = container.get<AuthService>(TYPES.AuthService);
  const { data, error } = await authService.signIn(email, password, remember);

  if (error) {
    return { error: error.message };
  }

  // Check if email is verified
  if (data.user && !data.user.email_confirmed_at) {
    // Sign out the user since they shouldn't be logged in yet
    await authService.signOut();
    return {
      error: "Please verify your email before signing in.",
      needsVerification: true,
      email: email,
    };
  }

  const sessionId = (data.session?.access_token as string | undefined) ?? null;
  let tenant = (data.user?.app_metadata?.tenant as string | undefined)?.trim() ?? null;

  if (!tenant) {
    try {
      const tenantService = container.get<TenantService>(TYPES.TenantService);
      const tenantData = await tenantService.getCurrentTenant();

      if (tenantData) {
        tenant = tenantData.id?.trim() ?? null;
      }
    } catch (tenantLookupError) {
      if (process.env.NODE_ENV !== "test") {
        console.error("Failed to determine tenant during sign-in", tenantLookupError);
      }
    }
  }

  if (tenant && sessionId) {
    await writeTenantSession(tenant, sessionId);
    // Warm the tenant settings cache (timezone, currency) on login
    await warmTenantSettingsCache();
  } else {
    await clearTenantSession();
    await clearTenantSettingsCache();
  }

  // Determine the redirect destination
  // Default to /admin, but use the provided redirectTo if it's a valid path
  let destination = "/admin";
  if (typeof redirectTo === "string" && redirectTo.startsWith("/")) {
    // Security: Only allow internal paths (starting with /)
    // and specifically paths under /admin to prevent open redirect
    if (redirectTo.startsWith("/admin")) {
      destination = redirectTo;
    }
  }

  revalidatePath("/admin", "page");
  redirect(destination);
}

export async function signOut(returnUrl?: string) {
  const authService = container.get<AuthService>(TYPES.AuthService);
  await authService.signOut();
  await clearTenantSession();
  // Clear tenant settings cache (timezone, currency) on logout
  await clearTenantSettingsCache();
  revalidatePath("/", "layout");

  // Build login URL with optional return path
  let loginUrl = "/login";
  if (returnUrl && returnUrl.startsWith("/admin")) {
    loginUrl = `/login?redirectTo=${encodeURIComponent(returnUrl)}`;
  }

  redirect(loginUrl);
}

/**
 * Get system email configuration directly using service client.
 * This bypasses DI container dependencies that may fail for unauthenticated requests.
 */
async function getSystemEmailConfigDirect(): Promise<{
  apiKey: string;
  fromEmail: string;
  fromName: string;
  replyTo: string | null;
} | null> {
  try {
    const supabase = await getSupabaseServiceClient();

    const { data, error } = await supabase
      .from("settings")
      .select("key, value")
      .is("tenant_id", null)
      .is("deleted_at", null)
      .like("key", "integration.email.%");

    if (error || !data || data.length === 0) {
      return null;
    }

    // Build config from settings
    const settingsMap: Record<string, string> = {};
    for (const setting of data) {
      settingsMap[setting.key] = setting.value;
    }

    const apiKey = settingsMap["integration.email.api_key"];
    const fromEmail = settingsMap["integration.email.from_email"];

    if (!apiKey || !fromEmail) {
      return null;
    }

    return {
      apiKey,
      fromEmail,
      fromName: settingsMap["integration.email.from_name"] || "StewardTrack",
      replyTo: settingsMap["integration.email.reply_to"] || null,
    };
  } catch (err) {
    console.error("Failed to get system email config:", err);
    return null;
  }
}

export async function forgotPassword(
  _prevState: ForgotPasswordState,
  formData: FormData
): Promise<ForgotPasswordState> {
  const email = formData.get("email");

  if (typeof email !== "string" || !email.trim()) {
    return { error: "Email address is required." };
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { error: "Please enter a valid email address." };
  }

  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://stewardtrack.com";

    // Get system email configuration directly (bypasses DI container for unauthenticated access)
    const emailConfig = await getSystemEmailConfigDirect();

    if (!emailConfig) {
      // Fall back to Supabase's built-in password reset if no system email is configured
      const authService = container.get<AuthService>(TYPES.AuthService);
      const { error } = await authService.resetPasswordForEmail(
        email,
        `${baseUrl}/auth/reset-password`
      );

      if (error) {
        // Don't reveal if the email exists or not for security
        console.error("Password reset error:", error.message);
      }

      // Always return success to prevent email enumeration
      return { success: true };
    }

    // Use custom email via system settings
    // Generate password reset link via Supabase Admin API (service client)
    const supabase = await getSupabaseServiceClient();
    const { data, error } = await supabase.auth.admin.generateLink({
      type: "recovery",
      email,
      options: {
        redirectTo: `${baseUrl}/auth/reset-password`,
      },
    });

    if (error) {
      // Don't reveal if the email exists or not for security
      console.error("Password reset link generation error:", error.message);
      return { success: true }; // Still return success to prevent email enumeration
    }

    if (data?.properties?.action_link) {
      // Render the password reset email template
      const htmlBody = await renderPasswordResetEmail({
        resetUrl: data.properties.action_link,
        expiresIn: "1 hour",
        baseUrl,
      });

      // Send email via system settings (Resend API)
      const fromField = emailConfig.fromName
        ? `${emailConfig.fromName} <${emailConfig.fromEmail}>`
        : emailConfig.fromEmail;

      const emailPayload: Record<string, unknown> = {
        from: fromField,
        to: email,
        subject: "Reset Your StewardTrack Password",
        html: htmlBody,
      };

      if (emailConfig.replyTo) {
        emailPayload.reply_to = emailConfig.replyTo;
      }

      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${emailConfig.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(emailPayload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Failed to send password reset email:", errorText);
        // Still return success to prevent email enumeration
      }
    }

    return { success: true };
  } catch (error) {
    console.error("Forgot password error:", error);
    // Return success even on error to prevent email enumeration
    return { success: true };
  }
}
