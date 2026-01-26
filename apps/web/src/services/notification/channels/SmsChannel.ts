/**
 * ================================================================================
 * SMS DELIVERY CHANNEL
 * ================================================================================
 *
 * Delivers notifications via SMS using Twilio.
 *
 * Feature Code: integrations.sms (Professional tier)
 *
 * Phone Number Formatting:
 * - Automatically formats phone numbers to E.164 format for Twilio
 * - Default country is determined by: Tenant Setting > Env Variable > 'PH'
 * - Tenant setting: 'tenant.default_country' (set during registration/onboarding)
 *
 * Required Environment Variables:
 * - TWILIO_ACCOUNT_SID
 * - TWILIO_AUTH_TOKEN
 * - TWILIO_PHONE_NUMBER
 *
 * Optional Environment Variables:
 * - DEFAULT_PHONE_COUNTRY (fallback if tenant setting not available, defaults to 'PH')
 *
 * ================================================================================
 */

import 'server-only';
import { injectable, inject } from 'inversify';
import { TYPES } from '@/lib/types';
import type {
  IDeliveryChannel,
  NotificationMessage,
  DeliveryResult,
  RecipientInfo,
} from './IDeliveryChannel';
import type { DeliveryChannelType } from '@/models/notification/notificationEvent.model';
import type { SettingService } from '@/services/SettingService';
import {
  formatPhoneForTwilio,
  isValidE164,
  getDefaultCountryCode,
} from '@/utils/phoneUtils';

@injectable()
export class SmsChannel implements IDeliveryChannel {
  readonly channelType: DeliveryChannelType = 'sms';
  readonly featureCode: string = 'integrations.sms';

  constructor(
    @inject(TYPES.SettingService)
    private settingService: SettingService
  ) {}

  /**
   * Get the default country code for phone number formatting.
   * Priority: Tenant setting > Environment variable > Default (PH)
   */
  private async getDefaultCountry(): Promise<string> {
    try {
      const tenantCountry = await this.settingService.getTenantDefaultCountry();
      if (tenantCountry) {
        return tenantCountry;
      }
    } catch (error) {
      // If no tenant context available, fall back to env var
      console.log('[SmsChannel] No tenant context for default country, using fallback');
    }
    return getDefaultCountryCode();
  }

  async isAvailable(): Promise<boolean> {
    // Check if Twilio is configured
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const phoneNumber = process.env.TWILIO_PHONE_NUMBER;
    return !!accountSid && !!authToken && !!phoneNumber;
  }

  async send(message: NotificationMessage): Promise<DeliveryResult> {
    if (!message.recipient.phone) {
      return {
        success: false,
        messageId: message.id,
        error: 'Recipient phone number is required',
        retryable: false,
      };
    }

    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const fromNumber = process.env.TWILIO_PHONE_NUMBER;

    if (!accountSid || !authToken || !fromNumber) {
      return {
        success: false,
        messageId: message.id,
        error: 'SMS service not configured',
        retryable: false,
      };
    }

    // Format phone number to E.164 format for Twilio
    // Use tenant's default country setting for phone formatting
    const defaultCountry = await this.getDefaultCountry();
    const phoneResult = formatPhoneForTwilio(message.recipient.phone, {
      defaultCountry,
    });

    if (!phoneResult.success || !phoneResult.formatted) {
      return {
        success: false,
        messageId: message.id,
        error: `Invalid phone number: ${phoneResult.error || 'Unable to format'}`,
        retryable: false,
      };
    }

    const formattedPhone = phoneResult.formatted;
    console.log(`[SmsChannel] Formatted phone: ${message.recipient.phone} -> ${formattedPhone}`);

    try {
      // Build SMS body (limited to 160 chars for single segment)
      const smsBody = this.buildSmsBody(message);

      // Use Twilio REST API directly
      const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
      const credentials = Buffer.from(`${accountSid}:${authToken}`).toString('base64');

      const response = await fetch(twilioUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${credentials}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          To: formattedPhone,
          From: fromNumber,
          Body: smsBody,
        }).toString(),
      });

      if (!response.ok) {
        const errorData = await response.json();
        const isRetryable = response.status >= 500 || response.status === 429;

        return {
          success: false,
          messageId: message.id,
          error: `SMS delivery failed: ${errorData.message || response.statusText}`,
          retryable: isRetryable,
          retryAfterMs: isRetryable ? 10000 : undefined,
        };
      }

      const result = await response.json();

      return {
        success: true,
        messageId: message.id,
        providerMessageId: result.sid,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error sending SMS';
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
    if (!recipient.phone) {
      return false;
    }

    // Try to format the phone number - if it succeeds, it's valid
    // Use tenant's default country setting for phone formatting
    const defaultCountry = await this.getDefaultCountry();
    const phoneResult = formatPhoneForTwilio(recipient.phone, {
      defaultCountry,
    });

    // Phone is valid if we can format it to E.164 or it's already valid E.164
    return phoneResult.success || isValidE164(recipient.phone);
  }

  private buildSmsBody(message: NotificationMessage): string {
    // SMS messages should be concise
    // Title + short message, max ~160 chars for single segment
    const title = message.title;
    const body = message.body;

    // If combined length is reasonable, include both
    if (title.length + body.length + 3 <= 160) {
      return `${title}: ${body}`;
    }

    // Otherwise, just send the title with truncated body
    const maxBodyLength = 160 - title.length - 6; // " - ..."
    if (maxBodyLength > 20) {
      return `${title}: ${body.substring(0, maxBodyLength)}...`;
    }

    // If title is too long, truncate it
    return title.substring(0, 157) + '...';
  }
}
