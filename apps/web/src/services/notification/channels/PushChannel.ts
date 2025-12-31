/**
 * ================================================================================
 * PUSH NOTIFICATION DELIVERY CHANNEL
 * ================================================================================
 *
 * Delivers notifications via push notifications using Firebase Cloud Messaging.
 *
 * Feature Code: notifications-push (Professional tier)
 *
 * Required Environment Variables:
 * - FIREBASE_PROJECT_ID
 * - FIREBASE_PRIVATE_KEY
 * - FIREBASE_CLIENT_EMAIL
 *
 * ================================================================================
 */

import 'server-only';
import { injectable } from 'inversify';
import type {
  IDeliveryChannel,
  NotificationMessage,
  DeliveryResult,
  RecipientInfo,
} from './IDeliveryChannel';
import type { DeliveryChannelType } from '@/models/notification/notificationEvent.model';

@injectable()
export class PushChannel implements IDeliveryChannel {
  readonly channelType: DeliveryChannelType = 'push';
  readonly featureCode: string = 'notifications-push';

  async isAvailable(): Promise<boolean> {
    // Check if Firebase is configured
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    return !!projectId && !!privateKey && !!clientEmail;
  }

  async send(message: NotificationMessage): Promise<DeliveryResult> {
    const deviceTokens = message.recipient.deviceTokens;

    if (!deviceTokens || deviceTokens.length === 0) {
      return {
        success: false,
        messageId: message.id,
        error: 'No device tokens available for push notification',
        retryable: false,
      };
    }

    const projectId = process.env.FIREBASE_PROJECT_ID;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;

    if (!projectId || !privateKey || !clientEmail) {
      return {
        success: false,
        messageId: message.id,
        error: 'Push notification service not configured',
        retryable: false,
      };
    }

    try {
      // Get OAuth2 access token for Firebase
      const accessToken = await this.getFirebaseAccessToken(clientEmail, privateKey);

      if (!accessToken) {
        return {
          success: false,
          messageId: message.id,
          error: 'Failed to obtain Firebase access token',
          retryable: true,
          retryAfterMs: 5000,
        };
      }

      // Send to each device token
      const results = await Promise.all(
        deviceTokens.map(token => this.sendToDevice(projectId, accessToken, token, message))
      );

      // Count successes and failures
      const successCount = results.filter(r => r.success).length;
      const failureCount = results.filter(r => !r.success).length;

      if (successCount > 0) {
        return {
          success: true,
          messageId: message.id,
          providerMessageId: results.find(r => r.providerMessageId)?.providerMessageId,
        };
      }

      return {
        success: false,
        messageId: message.id,
        error: `Push notification failed for all ${failureCount} devices`,
        retryable: true,
        retryAfterMs: 5000,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error sending push notification';
      return {
        success: false,
        messageId: message.id,
        error: errorMessage,
        retryable: true,
        retryAfterMs: 5000,
      };
    }
  }

  async validateRecipient(recipient: RecipientInfo): Promise<boolean> {
    // Push notifications require device tokens
    return !!recipient.deviceTokens && recipient.deviceTokens.length > 0;
  }

  /**
   * Get Firebase access token using service account credentials
   */
  private async getFirebaseAccessToken(clientEmail: string, privateKey: string): Promise<string | null> {
    try {
      // Create JWT for service account authentication
      const now = Math.floor(Date.now() / 1000);
      const header = { alg: 'RS256', typ: 'JWT' };
      const payload = {
        iss: clientEmail,
        sub: clientEmail,
        aud: 'https://oauth2.googleapis.com/token',
        iat: now,
        exp: now + 3600,
        scope: 'https://www.googleapis.com/auth/firebase.messaging',
      };

      // Base64URL encode
      const base64UrlEncode = (obj: Record<string, unknown>) => {
        return Buffer.from(JSON.stringify(obj))
          .toString('base64')
          .replace(/\+/g, '-')
          .replace(/\//g, '_')
          .replace(/=/g, '');
      };

      const headerEncoded = base64UrlEncode(header);
      const payloadEncoded = base64UrlEncode(payload);
      const signatureInput = `${headerEncoded}.${payloadEncoded}`;

      // Sign with private key using Node.js crypto
      const crypto = await import('crypto');
      const sign = crypto.createSign('RSA-SHA256');
      sign.update(signatureInput);
      const signature = sign.sign(privateKey, 'base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '');

      const jwt = `${signatureInput}.${signature}`;

      // Exchange JWT for access token
      const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
          assertion: jwt,
        }),
      });

      if (!response.ok) {
        console.error('Failed to get Firebase access token:', await response.text());
        return null;
      }

      const data = await response.json();
      return data.access_token;
    } catch (error) {
      console.error('Error getting Firebase access token:', error);
      return null;
    }
  }

  /**
   * Send push notification to a single device
   */
  private async sendToDevice(
    projectId: string,
    accessToken: string,
    deviceToken: string,
    message: NotificationMessage
  ): Promise<{ success: boolean; providerMessageId?: string; error?: string }> {
    try {
      const fcmUrl = `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`;

      const notification = {
        message: {
          token: deviceToken,
          notification: {
            title: message.title,
            body: message.body,
          },
          data: {
            eventId: message.event.id,
            eventType: message.event.eventType,
            ...(message.metadata?.actionPayload && { actionUrl: String(message.metadata.actionPayload) }),
          },
          android: {
            priority: 'high' as const,
            notification: {
              click_action: 'OPEN_APP',
            },
          },
          apns: {
            payload: {
              aps: {
                sound: 'default',
                badge: 1,
              },
            },
          },
        },
      };

      const response = await fetch(fcmUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(notification),
      });

      if (!response.ok) {
        const errorText = await response.text();
        return {
          success: false,
          error: `FCM error: ${errorText}`,
        };
      }

      const result = await response.json();
      return {
        success: true,
        providerMessageId: result.name,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown FCM error',
      };
    }
  }
}
