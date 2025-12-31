/**
 * ================================================================================
 * FIREBASE ADMIN SDK - SERVER-SIDE PUSH NOTIFICATIONS
 * ================================================================================
 *
 * Server-side Firebase Admin SDK for sending push notifications.
 * This module handles:
 * - Firebase Admin initialization
 * - Sending push notifications to FCM tokens
 * - Batch notifications
 * - Topic messaging
 *
 * Required Environment Variables:
 * - FIREBASE_PROJECT_ID
 * - FIREBASE_CLIENT_EMAIL
 * - FIREBASE_PRIVATE_KEY
 *
 * ================================================================================
 */

import * as admin from 'firebase-admin';

let firebaseAdmin: admin.app.App | null = null;

/**
 * Check if Firebase Admin is configured
 */
export function isFirebaseAdminConfigured(): boolean {
  return !!(
    process.env.FIREBASE_PROJECT_ID &&
    process.env.FIREBASE_CLIENT_EMAIL &&
    process.env.FIREBASE_PRIVATE_KEY
  );
}

/**
 * Initialize Firebase Admin SDK
 */
export function initializeFirebaseAdmin(): admin.app.App | null {
  if (firebaseAdmin) {
    return firebaseAdmin;
  }

  if (!isFirebaseAdminConfigured()) {
    console.warn('Firebase Admin is not configured. Push notifications will not work.');
    return null;
  }

  try {
    // Check if already initialized
    if (admin.apps.length > 0) {
      firebaseAdmin = admin.apps[0]!;
      return firebaseAdmin;
    }

    // Parse private key - handle escaped newlines
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

    firebaseAdmin = admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: privateKey,
      }),
    });

    console.log('[Firebase Admin] Initialized successfully');
    return firebaseAdmin;
  } catch (error) {
    console.error('[Firebase Admin] Failed to initialize:', error);
    return null;
  }
}

/**
 * Get Firebase Messaging instance
 */
function getMessaging(): admin.messaging.Messaging | null {
  const app = initializeFirebaseAdmin();
  if (!app) return null;
  return admin.messaging(app);
}

/**
 * Send a push notification to a single device
 */
export async function sendPushNotification(
  token: string,
  notification: {
    title: string;
    body: string;
    imageUrl?: string;
  },
  data?: Record<string, string>
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const messaging = getMessaging();
  if (!messaging) {
    return {
      success: false,
      error: 'Firebase Admin is not configured',
    };
  }

  try {
    const message: admin.messaging.Message = {
      token,
      notification: {
        title: notification.title,
        body: notification.body,
        imageUrl: notification.imageUrl,
      },
      data: data || {},
      webpush: {
        notification: {
          icon: '/icon-192x192.png',
          badge: '/badge-72x72.png',
          requireInteraction: false,
        },
        fcmOptions: {
          link: data?.url || '/',
        },
      },
    };

    const messageId = await messaging.send(message);
    return {
      success: true,
      messageId,
    };
  } catch (error) {
    console.error('[Firebase Admin] Failed to send push notification:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Send push notifications to multiple devices
 */
export async function sendPushNotificationBatch(
  tokens: string[],
  notification: {
    title: string;
    body: string;
    imageUrl?: string;
  },
  data?: Record<string, string>
): Promise<{
  successCount: number;
  failureCount: number;
  responses: Array<{ success: boolean; error?: string }>;
}> {
  const messaging = getMessaging();
  if (!messaging) {
    return {
      successCount: 0,
      failureCount: tokens.length,
      responses: tokens.map(() => ({ success: false, error: 'Firebase Admin is not configured' })),
    };
  }

  try {
    const message: admin.messaging.MulticastMessage = {
      tokens,
      notification: {
        title: notification.title,
        body: notification.body,
        imageUrl: notification.imageUrl,
      },
      data: data || {},
      webpush: {
        notification: {
          icon: '/icon-192x192.png',
          badge: '/badge-72x72.png',
        },
      },
    };

    const response = await messaging.sendEachForMulticast(message);
    return {
      successCount: response.successCount,
      failureCount: response.failureCount,
      responses: response.responses.map((r) => ({
        success: r.success,
        error: r.error?.message,
      })),
    };
  } catch (error) {
    console.error('[Firebase Admin] Failed to send batch push notifications:', error);
    return {
      successCount: 0,
      failureCount: tokens.length,
      responses: tokens.map(() => ({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      })),
    };
  }
}

/**
 * Send a push notification to a topic
 */
export async function sendPushNotificationToTopic(
  topic: string,
  notification: {
    title: string;
    body: string;
    imageUrl?: string;
  },
  data?: Record<string, string>
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const messaging = getMessaging();
  if (!messaging) {
    return {
      success: false,
      error: 'Firebase Admin is not configured',
    };
  }

  try {
    const message: admin.messaging.Message = {
      topic,
      notification: {
        title: notification.title,
        body: notification.body,
        imageUrl: notification.imageUrl,
      },
      data: data || {},
    };

    const messageId = await messaging.send(message);
    return {
      success: true,
      messageId,
    };
  } catch (error) {
    console.error('[Firebase Admin] Failed to send topic notification:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Subscribe tokens to a topic
 */
export async function subscribeToTopic(
  tokens: string[],
  topic: string
): Promise<{ successCount: number; failureCount: number }> {
  const messaging = getMessaging();
  if (!messaging) {
    return { successCount: 0, failureCount: tokens.length };
  }

  try {
    const response = await messaging.subscribeToTopic(tokens, topic);
    return {
      successCount: response.successCount,
      failureCount: response.failureCount,
    };
  } catch (error) {
    console.error('[Firebase Admin] Failed to subscribe to topic:', error);
    return { successCount: 0, failureCount: tokens.length };
  }
}

/**
 * Unsubscribe tokens from a topic
 */
export async function unsubscribeFromTopic(
  tokens: string[],
  topic: string
): Promise<{ successCount: number; failureCount: number }> {
  const messaging = getMessaging();
  if (!messaging) {
    return { successCount: 0, failureCount: tokens.length };
  }

  try {
    const response = await messaging.unsubscribeFromTopic(tokens, topic);
    return {
      successCount: response.successCount,
      failureCount: response.failureCount,
    };
  } catch (error) {
    console.error('[Firebase Admin] Failed to unsubscribe from topic:', error);
    return { successCount: 0, failureCount: tokens.length };
  }
}

/**
 * Validate FCM configuration by checking if initialization succeeds
 */
export async function validateFirebaseConfig(): Promise<{
  valid: boolean;
  projectId?: string;
  error?: string;
}> {
  if (!isFirebaseAdminConfigured()) {
    return {
      valid: false,
      error: 'Firebase Admin is not configured. Missing required environment variables.',
    };
  }

  try {
    const app = initializeFirebaseAdmin();
    if (!app) {
      return {
        valid: false,
        error: 'Failed to initialize Firebase Admin',
      };
    }

    return {
      valid: true,
      projectId: process.env.FIREBASE_PROJECT_ID,
    };
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
