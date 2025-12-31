/**
 * ================================================================================
 * WEBHOOK DELIVERY CHANNEL
 * ================================================================================
 *
 * Delivers notifications via HTTP webhooks to external systems.
 * Supports signature verification, retry logic, and exponential backoff.
 *
 * Feature Code: notifications-webhooks (Enterprise tier)
 *
 * Webhook Payload Format:
 * {
 *   "event_id": "uuid",
 *   "event_type": "care_plan.assigned",
 *   "timestamp": "2025-12-28T12:00:00Z",
 *   "tenant_id": "uuid",
 *   "data": { ... notification payload ... }
 * }
 *
 * Headers:
 * - X-StewardTrack-Signature: HMAC-SHA256 signature of payload
 * - X-StewardTrack-Timestamp: Unix timestamp
 * - Content-Type: application/json
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

/**
 * Webhook configuration for a recipient
 */
interface WebhookConfig {
  url: string;
  secret?: string;
  headers?: Record<string, string>;
  timeout?: number;
}

@injectable()
export class WebhookChannel implements IDeliveryChannel {
  readonly channelType: DeliveryChannelType = 'webhook';
  readonly featureCode: string = 'notifications-webhooks';

  private readonly defaultTimeout = 10000; // 10 seconds

  async isAvailable(): Promise<boolean> {
    // Webhook channel is always available - configuration is per-recipient
    return true;
  }

  async send(message: NotificationMessage): Promise<DeliveryResult> {
    const webhookUrl = message.recipient.webhookUrl;

    if (!webhookUrl) {
      return {
        success: false,
        messageId: message.id,
        error: 'No webhook URL configured for recipient',
        retryable: false,
      };
    }

    // Validate URL format
    if (!this.isValidUrl(webhookUrl)) {
      return {
        success: false,
        messageId: message.id,
        error: 'Invalid webhook URL format',
        retryable: false,
      };
    }

    try {
      const webhookConfig = this.getWebhookConfig(message);
      const payload = this.buildPayload(message);
      const timestamp = Math.floor(Date.now() / 1000);

      // Build headers
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'X-StewardTrack-Timestamp': timestamp.toString(),
        'X-StewardTrack-Event-Type': message.event.eventType,
        'X-StewardTrack-Message-Id': message.id,
        ...(webhookConfig.headers || {}),
      };

      // Add signature if secret is configured
      if (webhookConfig.secret) {
        const signature = await this.generateSignature(payload, timestamp, webhookConfig.secret);
        headers['X-StewardTrack-Signature'] = signature;
      }

      // Send webhook request with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(
        () => controller.abort(),
        webhookConfig.timeout || this.defaultTimeout
      );

      try {
        const response = await fetch(webhookConfig.url, {
          method: 'POST',
          headers,
          body: JSON.stringify(payload),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (response.ok) {
          return {
            success: true,
            messageId: message.id,
            providerMessageId: response.headers.get('X-Request-Id') || undefined,
          };
        }

        // Handle different error status codes
        const isRetryable = this.isRetryableStatus(response.status);
        const errorText = await response.text().catch(() => 'Unknown error');

        return {
          success: false,
          messageId: message.id,
          error: `Webhook returned ${response.status}: ${errorText}`,
          retryable: isRetryable,
          retryAfterMs: this.getRetryDelay(response),
        };
      } catch (error) {
        clearTimeout(timeoutId);
        throw error;
      }
    } catch (error) {
      // Handle timeout and network errors
      if (error instanceof Error && error.name === 'AbortError') {
        return {
          success: false,
          messageId: message.id,
          error: 'Webhook request timed out',
          retryable: true,
          retryAfterMs: 30000,
        };
      }

      const errorMessage = error instanceof Error ? error.message : 'Unknown webhook error';
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
    if (!recipient.webhookUrl) {
      return false;
    }
    return this.isValidUrl(recipient.webhookUrl);
  }

  /**
   * Build the webhook payload
   */
  private buildPayload(message: NotificationMessage): Record<string, unknown> {
    return {
      event_id: message.event.id,
      event_type: message.event.eventType,
      timestamp: new Date().toISOString(),
      tenant_id: message.event.tenantId,
      priority: message.event.priority,
      category: message.event.category,
      recipient: {
        user_id: message.recipient.userId,
      },
      notification: {
        title: message.title,
        body: message.body,
        subject: message.subject,
      },
      data: message.event.payload,
      metadata: {
        ...message.event.metadata,
        correlation_id: message.event.correlationId,
      },
    };
  }

  /**
   * Get webhook configuration from message metadata
   */
  private getWebhookConfig(message: NotificationMessage): WebhookConfig {
    return {
      url: message.recipient.webhookUrl!,
      secret: message.metadata?.webhookSecret as string | undefined,
      headers: message.metadata?.webhookHeaders as Record<string, string> | undefined,
      timeout: message.metadata?.webhookTimeout as number | undefined,
    };
  }

  /**
   * Generate HMAC-SHA256 signature for webhook payload
   */
  private async generateSignature(
    payload: Record<string, unknown>,
    timestamp: number,
    secret: string
  ): Promise<string> {
    const crypto = await import('crypto');
    const signaturePayload = `${timestamp}.${JSON.stringify(payload)}`;
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(signaturePayload);
    return `sha256=${hmac.digest('hex')}`;
  }

  /**
   * Check if a URL is valid
   */
  private isValidUrl(url: string): boolean {
    try {
      const parsed = new URL(url);
      // Only allow HTTPS in production, HTTP allowed for localhost
      return (
        parsed.protocol === 'https:' ||
        (parsed.protocol === 'http:' && parsed.hostname === 'localhost')
      );
    } catch {
      return false;
    }
  }

  /**
   * Check if HTTP status code is retryable
   */
  private isRetryableStatus(status: number): boolean {
    // Retry on server errors and rate limiting
    return status >= 500 || status === 429 || status === 408;
  }

  /**
   * Get retry delay from response headers or use default
   */
  private getRetryDelay(response: Response): number {
    const retryAfter = response.headers.get('Retry-After');
    if (retryAfter) {
      const seconds = parseInt(retryAfter, 10);
      if (!isNaN(seconds)) {
        return seconds * 1000;
      }
    }

    // Exponential backoff based on status
    if (response.status === 429) {
      return 60000; // 1 minute for rate limiting
    }
    return 10000; // 10 seconds default
  }
}
