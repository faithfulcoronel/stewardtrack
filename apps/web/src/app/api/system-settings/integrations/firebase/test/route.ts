import { NextResponse } from "next/server";
import { isCachedSuperAdmin, getCachedUser } from "@/lib/auth/authCache";
import {
  isFirebaseAdminConfigured,
  sendPushNotification,
  validateFirebaseConfig,
} from "@/lib/firebase/admin";
import { container } from "@/lib/container";
import { TYPES } from "@/lib/types";
import type { INotificationBusService } from "@/services/notification/NotificationBusService";
import type { IPushDeviceTokenService } from "@/services/PushDeviceTokenService";
import type { SettingService } from "@/services/SettingService";
import { NotificationEventType } from "@/models/notification/notificationEvent.model";
import { tenantUtils } from "@/utils/tenantUtils";
import { v4 as uuidv4 } from "uuid";

/**
 * POST /api/system-settings/integrations/firebase/test
 * Sends a test push notification to verify Firebase configuration.
 *
 * Supports two modes:
 * 1. Direct Test (default): Sends directly via FCM to verify Firebase credentials
 * 2. Enterprise Test (mode=enterprise): Uses NotificationBusService for full multi-channel delivery
 *
 * The enterprise mode demonstrates proper notification routing through:
 * - Feature access checks (tenant must have notifications-push feature)
 * - User preference checks
 * - Multi-channel delivery (push + in_app)
 * - Device token routing
 *
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

    // Get current user from auth cache
    const { user, error: authError } = await getCachedUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { fcmToken, mode = "direct" } = body;

    if (!fcmToken) {
      return NextResponse.json(
        { error: "FCM device token is required" },
        { status: 400 }
      );
    }

    // Check if Firebase is configured
    if (!isFirebaseAdminConfigured()) {
      return NextResponse.json(
        {
          error: "Firebase is not configured. Please set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY environment variables.",
        },
        { status: 400 }
      );
    }

    // Validate Firebase configuration
    const validation = await validateFirebaseConfig();
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error || "Invalid Firebase configuration" },
        { status: 400 }
      );
    }

    const notificationTitle = "StewardTrack Test Notification";
    const notificationBody = "This is a test push notification from StewardTrack System Settings. If you received this, Firebase Cloud Messaging is configured correctly!";
    const timestamp = new Date().toISOString();

    // Enterprise mode: Use NotificationBusService for proper multi-channel delivery
    if (mode === "enterprise") {
      return handleEnterpriseTest(user.id, fcmToken, notificationTitle, notificationBody, timestamp);
    }

    // Direct mode (default): Send directly via FCM to verify configuration
    return handleDirectTest(user.id, fcmToken, notificationTitle, notificationBody, timestamp);
  } catch (error) {
    console.error("[API] Error sending test push notification:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to send test push notification" },
      { status: 500 }
    );
  }
}

/**
 * Direct FCM test - sends push notification directly to verify Firebase credentials.
 * Also creates an in-app notification for the notification bell.
 */
async function handleDirectTest(
  userId: string,
  fcmToken: string,
  title: string,
  body: string,
  timestamp: string
) {
  // Send push notification via FCM directly
  const result = await sendPushNotification(
    fcmToken,
    {
      title: `🔔 ${title}`,
      body,
    },
    {
      type: "test",
      timestamp,
      source: "system-settings",
    }
  );

  if (!result.success) {
    return NextResponse.json(
      { error: result.error || "Failed to send push notification" },
      { status: 500 }
    );
  }

  // Mark Firebase as verified since the test succeeded
  try {
    const settingService = container.get<SettingService>(TYPES.SettingService);
    await settingService.markFirebaseVerified();
    console.log("[API] Marked Firebase integration as verified");
  } catch (verifyError) {
    // Log but don't fail - the push notification was sent successfully
    console.error("[API] Failed to mark Firebase as verified:", verifyError);
  }

  // Create in-app notification using NotificationBusService for proper routing
  try {
    const tenantId = await tenantUtils.getTenantId();

    if (tenantId) {
      const notificationBus = container.get<INotificationBusService>(
        TYPES.NotificationBusService
      );

      await notificationBus.publish({
        id: uuidv4(),
        eventType: NotificationEventType.SYSTEM_ANNOUNCEMENT,
        category: "system",
        priority: "normal",
        tenantId,
        recipient: {
          userId,
        },
        payload: {
          title,
          message: body,
        },
        channels: ["in_app"], // Only in-app for direct test (push was sent directly)
        metadata: {
          source: "firebase-test-direct",
          fcm_message_id: result.messageId,
          timestamp,
        },
      });

      console.log("[API] Created in-app notification via NotificationBusService for Firebase test");
    }
  } catch (notificationError) {
    // Log but don't fail - push notification was already sent successfully
    console.error("[API] Failed to create in-app notification:", notificationError);
  }

  return NextResponse.json({
    success: true,
    mode: "direct",
    messageId: result.messageId,
    message: "Test push notification sent successfully (direct FCM)",
  });
}

/**
 * Enterprise test - uses NotificationBusService for full multi-channel delivery.
 * This demonstrates proper notification routing with:
 * - Device token registration
 * - Feature access checks
 * - User preference checks
 * - Multi-channel delivery (push + in_app)
 */
async function handleEnterpriseTest(
  userId: string,
  fcmToken: string,
  title: string,
  body: string,
  timestamp: string
) {
  const tenantId = await tenantUtils.getTenantId();

  if (!tenantId) {
    return NextResponse.json(
      { error: "No tenant context found. Enterprise test requires tenant context." },
      { status: 400 }
    );
  }

  // First, temporarily register the device token for this test
  // This allows the PushChannel to find the token when routing
  const deviceTokenService = container.get<IPushDeviceTokenService>(
    TYPES.IPushDeviceTokenService
  );

  try {
    await deviceTokenService.registerToken(userId, tenantId, {
      token: fcmToken,
      device_type: "web",
      device_name: "Firebase Test Device",
    });
    console.log("[API] Registered test device token for enterprise test");
  } catch (error) {
    // Token might already exist, which is fine
    console.log("[API] Device token may already exist:", error);
  }

  // Use NotificationBusService for proper multi-channel delivery
  const notificationBus = container.get<INotificationBusService>(
    TYPES.NotificationBusService
  );

  const eventId = uuidv4();
  const publishResult = await notificationBus.publish({
    id: eventId,
    eventType: NotificationEventType.SYSTEM_ANNOUNCEMENT,
    category: "system",
    priority: "high", // High priority for immediate delivery
    tenantId,
    recipient: {
      userId,
      deviceTokens: [fcmToken], // Include device token for push channel
    },
    payload: {
      title: `🔔 ${title} (Enterprise)`,
      message: body,
    },
    channels: ["push", "in_app"], // Request both channels
    metadata: {
      source: "firebase-test-enterprise",
      timestamp,
    },
  });

  // Check results
  const pushResult = publishResult.channelResults.find(r => r.channel === "push");
  const inAppResult = publishResult.channelResults.find(r => r.channel === "in_app");

  // Mark Firebase as verified if push was successful
  if (pushResult?.status === "success") {
    try {
      const settingService = container.get<SettingService>(TYPES.SettingService);
      await settingService.markFirebaseVerified();
      console.log("[API] Marked Firebase integration as verified (enterprise mode)");
    } catch (verifyError) {
      console.error("[API] Failed to mark Firebase as verified:", verifyError);
    }
  }

  return NextResponse.json({
    success: publishResult.deliveredCount > 0,
    mode: "enterprise",
    eventId,
    message: "Test notification processed via NotificationBusService",
    results: {
      delivered: publishResult.deliveredCount,
      failed: publishResult.failedCount,
      skipped: publishResult.skippedCount,
      push: pushResult ? {
        status: pushResult.status,
        messageId: pushResult.providerMessageId,
        error: pushResult.error,
        reason: pushResult.reason,
      } : null,
      inApp: inAppResult ? {
        status: inAppResult.status,
        error: inAppResult.error,
        reason: inAppResult.reason,
      } : null,
    },
  });
}
