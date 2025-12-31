import { NextResponse } from "next/server";
import { isCachedSuperAdmin } from "@/lib/auth/authCache";

/**
 * GET /api/system-settings/templates
 * Fetches system-wide notification templates
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

    // Return system templates
    // In production, these would be fetched from a system_notification_templates table
    const systemTemplates = [
      {
        id: "sys-welcome-email",
        event_type: "system.welcome",
        channel: "email",
        name: "Welcome Email - Default",
        subject: "Welcome to StewardTrack!",
        body_template: `<h1>Welcome to StewardTrack!</h1>
<p>Hello {{user_name}},</p>
<p>Thank you for joining StewardTrack. Your account has been created successfully.</p>
<p>Get started by exploring your dashboard at <a href="{{app_url}}">{{app_url}}</a>.</p>
<p>Best regards,<br>The StewardTrack Team</p>`,
        is_active: true,
        is_system: true,
        is_default: true,
        variables: [
          { name: "user_name", description: "User's name", required: true },
          { name: "app_url", description: "Application URL", required: true },
        ],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: "sys-password-reset-email",
        event_type: "system.password_reset",
        channel: "email",
        name: "Password Reset Email - Default",
        subject: "Reset Your Password",
        body_template: `<h1>Password Reset Request</h1>
<p>Hello {{user_name}},</p>
<p>We received a request to reset your password. Click the link below to set a new password:</p>
<p><a href="{{reset_link}}">Reset Password</a></p>
<p>This link will expire in 1 hour. If you didn't request this, please ignore this email.</p>
<p>Best regards,<br>The StewardTrack Team</p>`,
        is_active: true,
        is_system: true,
        is_default: true,
        variables: [
          { name: "user_name", description: "User's name", required: true },
          { name: "reset_link", description: "Password reset link", required: true },
        ],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: "sys-subscription-created-email",
        event_type: "system.subscription_created",
        channel: "email",
        name: "Subscription Created Email - Default",
        subject: "Your Subscription is Active!",
        body_template: `<h1>Subscription Activated</h1>
<p>Hello {{tenant_name}},</p>
<p>Your {{plan_name}} subscription has been activated successfully.</p>
<p>You now have access to all features included in your plan. Visit your dashboard to get started.</p>
<p>Best regards,<br>The StewardTrack Team</p>`,
        is_active: true,
        is_system: true,
        is_default: true,
        variables: [
          { name: "tenant_name", description: "Tenant/Church name", required: true },
          { name: "plan_name", description: "Subscription plan name", required: true },
        ],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: "sys-trial-ending-email",
        event_type: "system.trial_ending",
        channel: "email",
        name: "Trial Ending Email - Default",
        subject: "Your Trial Ends in {{days_remaining}} Days",
        body_template: `<h1>Your Trial is Ending Soon</h1>
<p>Hello {{tenant_name}},</p>
<p>Your StewardTrack trial will end in {{days_remaining}} days.</p>
<p>To continue using all features, please upgrade to a paid plan.</p>
<p><a href="{{upgrade_link}}">Upgrade Now</a></p>
<p>Best regards,<br>The StewardTrack Team</p>`,
        is_active: true,
        is_system: true,
        is_default: true,
        variables: [
          { name: "tenant_name", description: "Tenant/Church name", required: true },
          { name: "days_remaining", description: "Days until trial ends", required: true },
          { name: "upgrade_link", description: "Upgrade page URL", required: true },
        ],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ];

    return NextResponse.json({
      data: systemTemplates,
      total: systemTemplates.length,
    });
  } catch (error) {
    console.error("[API] Error fetching system templates:", error);
    return NextResponse.json(
      { error: "Failed to fetch system templates" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/system-settings/templates
 * Creates a new system template
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
    if (!body.event_type || !body.name || !body.body_template) {
      return NextResponse.json(
        { error: "Missing required fields: event_type, name, body_template" },
        { status: 400 }
      );
    }

    // In production, save to database
    const newTemplate = {
      id: `sys-${Date.now()}`,
      ...body,
      is_system: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    return NextResponse.json({
      success: true,
      data: newTemplate,
    });
  } catch (error) {
    console.error("[API] Error creating system template:", error);
    return NextResponse.json(
      { error: "Failed to create system template" },
      { status: 500 }
    );
  }
}
