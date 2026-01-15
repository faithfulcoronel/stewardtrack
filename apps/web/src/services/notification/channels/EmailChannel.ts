/**
 * ================================================================================
 * EMAIL DELIVERY CHANNEL
 * ================================================================================
 *
 * Delivers notifications via email using the Resend API.
 * Uses React Email templates for professional, branded emails.
 *
 * Feature Code: integrations.email (Essential tier)
 *
 * Required Environment Variables:
 * - RESEND_API_KEY
 * - RESEND_FROM_EMAIL
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
import {
  renderNotificationEmail,
  renderCarePlanAssignedEmail,
  renderCarePlanMemberNotificationEmail,
  renderCarePlanFollowUpEmail,
  renderDiscipleshipPlanCreatedEmail,
  renderDiscipleshipMilestoneEmail,
  renderBirthdayGreetingEmail,
  renderAnniversaryGreetingEmail,
} from '@/emails/service/EmailTemplateService';

@injectable()
export class EmailChannel implements IDeliveryChannel {
  readonly channelType: DeliveryChannelType = 'email';
  readonly featureCode: string = 'integrations.email';

  async isAvailable(): Promise<boolean> {
    // Check if email service is configured
    const apiKey = process.env.RESEND_API_KEY;
    const fromEmail = process.env.RESEND_FROM_EMAIL;
    return !!apiKey && !!fromEmail;
  }

  async send(message: NotificationMessage): Promise<DeliveryResult> {
    if (!message.recipient.email) {
      return {
        success: false,
        messageId: message.id,
        error: 'Recipient email address is required',
        retryable: false,
      };
    }

    try {
      const apiKey = process.env.RESEND_API_KEY;
      const fromEmail = process.env.RESEND_FROM_EMAIL;

      if (!apiKey || !fromEmail) {
        return {
          success: false,
          messageId: message.id,
          error: 'Email service not configured',
          retryable: false,
        };
      }

      // Build email HTML using React Email templates
      const htmlBody = message.htmlBody || await this.buildDefaultHtml(message);

      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: fromEmail,
          to: message.recipient.email,
          subject: message.subject || message.title,
          html: htmlBody,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        const isRetryable = response.status >= 500 || response.status === 429;

        return {
          success: false,
          messageId: message.id,
          error: `Email delivery failed: ${errorText}`,
          retryable: isRetryable,
          retryAfterMs: isRetryable ? this.getRetryDelay(response) : undefined,
        };
      }

      const result = await response.json();

      return {
        success: true,
        messageId: message.id,
        providerMessageId: result.id,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error sending email';
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
    if (!recipient.email) {
      return false;
    }

    // Basic email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(recipient.email);
  }

  private async buildDefaultHtml(message: NotificationMessage): Promise<string> {
    // Use React Email template for professional, branded emails
    try {
      // Check for specific email template type
      const emailTemplate = message.metadata?.emailTemplate as string | undefined;
      const tenantName = message.metadata?.tenantName as string | undefined;

      // Route to appropriate template based on emailTemplate field
      if (emailTemplate) {
        return await this.renderSpecificTemplate(emailTemplate, message, tenantName);
      }

      // Default to notification template
      const html = await renderNotificationEmail(
        {
          title: message.title,
          body: message.body,
          actionUrl: message.metadata?.actionPayload as string | undefined,
          actionLabel: message.metadata?.actionLabel as string | undefined,
          category: message.metadata?.category as string | undefined,
        },
        {
          recipientName: message.metadata?.recipientName as string | undefined,
          tenantName,
          tenantLogoUrl: message.metadata?.tenantLogoUrl as string | undefined,
        }
      );
      return html;
    } catch {
      // Fallback to basic HTML if template rendering fails
      return this.buildFallbackHtml(message);
    }
  }

  /**
   * Render a specific email template based on the emailTemplate field
   */
  private async renderSpecificTemplate(
    templateType: string,
    message: NotificationMessage,
    tenantName?: string
  ): Promise<string> {
    const metadata = message.metadata || {};

    switch (templateType) {
      case 'care-plan-assigned':
        return await renderCarePlanAssignedEmail(
          {
            recipientName: metadata.recipientName as string,
            memberName: metadata.memberName as string,
            followUpDate: metadata.followUpDate as string | undefined,
            careContext: metadata.careContext as string | undefined,
            carePlanUrl: metadata.carePlanUrl as string,
          },
          { tenantName }
        );

      case 'care-plan-member-notification':
        return await renderCarePlanMemberNotificationEmail(
          {
            recipientName: metadata.recipientName as string,
            caregiverName: metadata.caregiverName as string | undefined,
            followUpDate: metadata.followUpDate as string | undefined,
            carePlanUrl: metadata.carePlanUrl as string | undefined,
          },
          { tenantName }
        );

      case 'care-plan-follow-up':
        return await renderCarePlanFollowUpEmail(
          {
            recipientName: metadata.recipientName as string,
            memberName: metadata.memberName as string,
            followUpDate: metadata.followUpDate as string,
            daysUntilFollowUp: metadata.daysUntilFollowUp as number,
            carePlanUrl: metadata.carePlanUrl as string,
          },
          { tenantName }
        );

      case 'discipleship-plan-created':
        return await renderDiscipleshipPlanCreatedEmail(
          {
            recipientName: metadata.recipientName as string,
            isRecipientMember: metadata.isRecipientMember as boolean | undefined,
            memberName: metadata.memberName as string,
            pathwayName: metadata.pathwayName as string,
            mentorName: metadata.mentorName as string | undefined,
            nextStep: metadata.nextStep as string | undefined,
            planUrl: metadata.planUrl as string,
          },
          { tenantName }
        );

      case 'discipleship-milestone':
        return await renderDiscipleshipMilestoneEmail(
          {
            recipientName: metadata.recipientName as string,
            isRecipientMember: metadata.isRecipientMember as boolean | undefined,
            memberName: metadata.memberName as string,
            milestoneName: metadata.milestoneName as string,
            pathwayName: metadata.pathwayName as string,
            message: metadata.celebrationMessage as string | undefined,
            planUrl: metadata.planUrl as string,
          },
          { tenantName }
        );

      case 'birthday-greeting':
        return await renderBirthdayGreetingEmail(
          {
            recipientName: metadata.recipientName as string,
            memberPhotoUrl: metadata.memberPhotoUrl as string | undefined,
            customMessage: metadata.customMessage as string | undefined,
            age: metadata.age as number | undefined,
            profileUrl: metadata.profileUrl as string | undefined,
          },
          { tenantName }
        );

      case 'anniversary-greeting':
        return await renderAnniversaryGreetingEmail(
          {
            recipientName: metadata.recipientName as string,
            spouseName: metadata.spouseName as string | undefined,
            years: metadata.years as number | undefined,
            customMessage: metadata.customMessage as string | undefined,
            profileUrl: metadata.profileUrl as string | undefined,
          },
          { tenantName }
        );

      default:
        // Unknown template type, fall back to notification template
        return await renderNotificationEmail(
          {
            title: message.title,
            body: message.body,
            actionUrl: metadata.actionPayload as string | undefined,
            actionLabel: metadata.actionLabel as string | undefined,
            category: metadata.category as string | undefined,
          },
          {
            recipientName: metadata.recipientName as string | undefined,
            tenantName,
            tenantLogoUrl: metadata.tenantLogoUrl as string | undefined,
          }
        );
    }
  }

  private buildFallbackHtml(message: NotificationMessage): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${this.escapeHtml(message.title)}</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #2563eb; margin-bottom: 20px;">${this.escapeHtml(message.title)}</h1>
          <div style="margin-bottom: 20px;">
            ${this.escapeHtml(message.body).replace(/\n/g, '<br>')}
          </div>
          ${message.metadata?.actionPayload ? `
            <a href="${this.escapeHtml(message.metadata.actionPayload as string)}"
               style="display: inline-block; background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">
              View Details
            </a>
          ` : ''}
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
          <p style="font-size: 12px; color: #6b7280;">
            This is an automated notification from StewardTrack.
          </p>
        </body>
      </html>
    `;
  }

  private escapeHtml(text: string): string {
    const htmlEntities: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    };
    return text.replace(/[&<>"']/g, char => htmlEntities[char] || char);
  }

  private getRetryDelay(response: Response): number {
    const retryAfter = response.headers.get('Retry-After');
    if (retryAfter) {
      const seconds = parseInt(retryAfter, 10);
      if (!isNaN(seconds)) {
        return seconds * 1000;
      }
    }
    return 5000; // Default 5 second retry
  }
}
