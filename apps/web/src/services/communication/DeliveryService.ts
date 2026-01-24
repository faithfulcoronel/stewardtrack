import 'server-only';
import { injectable, inject } from 'inversify';
import { TYPES } from '@/lib/types';
import type { ICampaignRepository } from '@/repositories/communication/campaign.repository';
import type { IRecipientRepository } from '@/repositories/communication/recipient.repository';
import type { CampaignRecipient } from '@/models/communication/recipient.model';
import type { Campaign, CommunicationChannel } from '@/models/communication/campaign.model';
import type { IDeliveryChannel, NotificationMessage } from '@/services/notification/channels/IDeliveryChannel';
import type { NotificationEvent } from '@/models/notification/notificationEvent.model';
import type { TenantService } from '@/services/TenantService';
import { renderCampaignEmail } from '@/emails/service/EmailTemplateService';

export interface DeliveryResult {
  recipientId: string;
  success: boolean;
  messageId?: string;
  error?: string;
}

export interface DeliveryService {
  sendCampaign(campaignId: string, tenantId: string): Promise<void>;
  sendToRecipient(
    recipient: CampaignRecipient,
    campaign: Campaign,
    tenant?: { name?: string; email?: string | null; logo_url?: string | null } | null
  ): Promise<DeliveryResult>;
  sendEmail(to: string, subject: string, html: string, text?: string): Promise<{ success: boolean; messageId?: string; error?: string }>;
  sendSms(to: string, message: string): Promise<{ success: boolean; messageId?: string; error?: string }>;
  processDeliveryWebhook(payload: unknown): Promise<void>;
}

@injectable()
export class SupabaseDeliveryService implements DeliveryService {
  constructor(
    @inject(TYPES.ICommCampaignRepository) private campaignRepo: ICampaignRepository,
    @inject(TYPES.IRecipientRepository) private recipientRepo: IRecipientRepository,
    @inject(TYPES.EmailChannel) private emailChannel: IDeliveryChannel,
    @inject(TYPES.SmsChannel) private smsChannel: IDeliveryChannel,
    @inject(TYPES.TenantService) private tenantService: TenantService
  ) {}

  async sendCampaign(campaignId: string, tenantId: string): Promise<void> {
    console.log(`[DeliveryService] sendCampaign called for campaignId: ${campaignId}, tenantId: ${tenantId}`);

    const campaign = await this.campaignRepo.getCampaignById(campaignId, tenantId);
    if (!campaign) {
      console.error(`[DeliveryService] Campaign not found: ${campaignId}`);
      throw new Error('Campaign not found');
    }

    console.log(`[DeliveryService] Campaign found:`, {
      id: campaign.id,
      name: campaign.name,
      status: campaign.status,
      channels: campaign.channels,
      subject: campaign.subject,
    });

    if (campaign.status !== 'draft' && campaign.status !== 'scheduled') {
      console.error(`[DeliveryService] Invalid campaign status: ${campaign.status}`);
      throw new Error(`Cannot send campaign with status: ${campaign.status}`);
    }

    // Get tenant info for email branding
    const tenant = await this.tenantService.findById(tenantId);
    console.log(`[DeliveryService] Tenant info:`, {
      name: tenant?.name,
      email: tenant?.email,
      hasLogo: !!tenant?.logo_url,
    });

    // Update status to sending
    await this.campaignRepo.updateCampaign(campaignId, { status: 'sending' }, tenantId);
    console.log(`[DeliveryService] Campaign status updated to 'sending'`);

    try {
      // Get all pending recipients
      const recipients = await this.recipientRepo.getPendingRecipients(campaignId);
      console.log(`[DeliveryService] Found ${recipients.length} pending recipients for campaign ${campaignId}`);

      let sentCount = 0;
      let failedCount = 0;

      if (recipients.length === 0) {
        console.warn(`[DeliveryService] No pending recipients found for campaign ${campaignId}. Make sure recipients were added before sending.`);
      }

      // Process recipients in batches
      for (let i = 0; i < recipients.length; i++) {
        const recipient = recipients[i];
        console.log(`[DeliveryService] Processing recipient ${i + 1}/${recipients.length}:`, {
          id: recipient.id,
          email: recipient.email,
          phone: recipient.phone,
          channel: recipient.channel,
          status: recipient.status,
          recipientType: recipient.recipient_type,
        });

        const result = await this.sendToRecipient(recipient, campaign, tenant);
        console.log(`[DeliveryService] Send result for recipient ${recipient.id}:`, result);

        if (result.success) {
          sentCount++;
          await this.recipientRepo.updateRecipientStatus(recipient.id, {
            status: 'sent',
            sent_at: new Date().toISOString(),
            provider_message_id: result.messageId,
          });
        } else {
          failedCount++;
          await this.recipientRepo.updateRecipientStatus(recipient.id, {
            status: 'failed',
            error_message: result.error,
          });
        }

        // Update campaign counts periodically
        if ((sentCount + failedCount) % 10 === 0) {
          await this.campaignRepo.updateCampaignCounts(campaignId, {
            sent_count: sentCount,
            failed_count: failedCount,
          });
        }
      }

      // Final count update
      await this.campaignRepo.updateCampaignCounts(campaignId, {
        sent_count: sentCount,
        failed_count: failedCount,
      });

      // Mark campaign as sent
      await this.campaignRepo.updateCampaign(
        campaignId,
        { status: 'sent' },
        tenantId
      );

      console.log(`[DeliveryService] Campaign ${campaignId} completed successfully:`, {
        totalRecipients: recipients.length,
        sentCount,
        failedCount,
      });
    } catch (error) {
      console.error(`[DeliveryService] Campaign ${campaignId} failed with error:`, error);
      // Mark campaign as failed
      await this.campaignRepo.updateCampaign(
        campaignId,
        { status: 'failed' },
        tenantId
      );
      throw error;
    }
  }

  async sendToRecipient(
    recipient: CampaignRecipient,
    campaign: Campaign,
    tenant?: { name?: string; email?: string | null; logo_url?: string | null } | null
  ): Promise<DeliveryResult> {
    const channel = recipient.channel as CommunicationChannel;
    console.log(`[DeliveryService] sendToRecipient called:`, {
      recipientId: recipient.id,
      channel,
      email: recipient.email,
      phone: recipient.phone,
    });

    // Personalize content
    const { subject, contentHtml, contentText } = this.personalizeContent(
      campaign.subject || '',
      campaign.content_html || '',
      campaign.content_text || '',
      recipient.personalization_data || {}
    );

    console.log(`[DeliveryService] Personalized content prepared:`, {
      subject,
      contentHtmlLength: contentHtml?.length || 0,
      contentTextLength: contentText?.length || 0,
    });

    if (channel === 'email' && recipient.email) {
      console.log(`[DeliveryService] Sending via email channel to: ${recipient.email}`);

      // Render the campaign content within the standard email layout
      // Note: We pass tenantName but NOT tenantLogoUrl - the header should always show StewardTrack logo
      let finalHtml = contentHtml;
      try {
        finalHtml = await renderCampaignEmail(
          {
            preview: subject,
            subject,
            contentHtml,
          },
          {
            tenantName: tenant?.name,
            // tenantLogoUrl is intentionally NOT passed - header always shows StewardTrack logo
          }
        );
        console.log(`[DeliveryService] Rendered campaign email with layout, length: ${finalHtml.length}`);
      } catch (error) {
        console.warn(`[DeliveryService] Failed to render campaign email template, using raw HTML:`, error);
      }

      // Pass tenant info for email headers (From name and Reply-To)
      const result = await this.sendEmailWithTenantInfo(
        recipient.email,
        subject,
        finalHtml,
        contentText,
        tenant
      );
      console.log(`[DeliveryService] Email send result:`, result);
      return {
        recipientId: recipient.id,
        ...result,
      };
    }

    if (channel === 'sms' && recipient.phone) {
      console.log(`[DeliveryService] Sending via SMS channel to: ${recipient.phone}`);
      const result = await this.sendSms(recipient.phone, contentText || subject);
      console.log(`[DeliveryService] SMS send result:`, result);
      return {
        recipientId: recipient.id,
        ...result,
      };
    }

    console.warn(`[DeliveryService] Cannot send: Invalid channel or missing contact info`, {
      channel,
      hasEmail: !!recipient.email,
      hasPhone: !!recipient.phone,
    });

    return {
      recipientId: recipient.id,
      success: false,
      error: `Invalid channel or missing contact info for ${channel}`,
    };
  }

  async sendEmail(
    to: string,
    subject: string,
    html: string,
    text?: string
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      console.log(`[DeliveryService] sendEmail called:`, {
        to,
        subject,
        htmlLength: html?.length || 0,
        textLength: text?.length || 0,
      });

      // Build NotificationMessage for EmailChannel
      const messageId = `campaign_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      console.log(`[DeliveryService] Generated messageId: ${messageId}`);

      // Create a minimal event object for the notification system
      const event: NotificationEvent = {
        id: messageId,
        eventType: 'communication.campaign',
        category: 'communication',
        priority: 'normal',
        tenantId: '', // Will be set by the channel if needed
        recipient: {
          userId: '', // External communication, no user ID
          email: to,
        },
        payload: {
          subject,
          contentText: text,
        },
      };

      const notificationMessage: NotificationMessage = {
        id: messageId,
        event,
        recipient: {
          userId: '', // External communication
          email: to,
        },
        title: subject,
        subject: subject,
        body: text || '',
        htmlBody: html,
      };

      // Use the existing EmailChannel to send
      console.log(`[DeliveryService] Calling emailChannel.send() with NotificationMessage...`);
      const result = await this.emailChannel.send(notificationMessage);
      console.log(`[DeliveryService] emailChannel.send() returned:`, {
        success: result.success,
        messageId: result.messageId,
        providerMessageId: result.providerMessageId,
        error: result.error,
      });

      if (result.success) {
        console.log(`[DeliveryService] Email sent successfully to ${to}`);
        return {
          success: true,
          messageId: result.providerMessageId || messageId,
        };
      } else {
        console.warn(`[DeliveryService] Email failed to send to ${to}: ${result.error}`);
        return {
          success: false,
          error: result.error || 'Failed to send email',
        };
      }
    } catch (error) {
      console.error('[DeliveryService] Email send exception:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error sending email',
      };
    }
  }

  /**
   * Send email with tenant-specific From name and Reply-To address.
   * The From email remains noreply@stewardtrack.com, but the display name uses the tenant name.
   * Reply-To is set to the tenant's registered email so recipients can reply directly.
   */
  private async sendEmailWithTenantInfo(
    to: string,
    subject: string,
    html: string,
    text?: string,
    tenant?: { name?: string; email?: string | null; logo_url?: string | null } | null
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      console.log(`[DeliveryService] sendEmailWithTenantInfo called:`, {
        to,
        subject,
        htmlLength: html?.length || 0,
        textLength: text?.length || 0,
        tenantName: tenant?.name,
        tenantEmail: tenant?.email,
      });

      // Build NotificationMessage for EmailChannel
      const messageId = `campaign_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      console.log(`[DeliveryService] Generated messageId: ${messageId}`);

      // Create a minimal event object for the notification system
      const event: NotificationEvent = {
        id: messageId,
        eventType: 'communication.campaign',
        category: 'communication',
        priority: 'normal',
        tenantId: '', // Will be set by the channel if needed
        recipient: {
          userId: '', // External communication, no user ID
          email: to,
        },
        payload: {
          subject,
          contentText: text,
        },
      };

      const notificationMessage: NotificationMessage = {
        id: messageId,
        event,
        recipient: {
          userId: '', // External communication
          email: to,
        },
        title: subject,
        subject: subject,
        body: text || '',
        htmlBody: html,
        metadata: {
          // Pass tenant name as the From display name
          // Email will be sent from "Church Name <noreply@stewardtrack.com>"
          fromName: tenant?.name || undefined,
          // Set Reply-To to tenant's email so members can reply
          replyTo: tenant?.email || undefined,
          tenantName: tenant?.name || undefined,
          // tenantLogoUrl is intentionally NOT passed - header always shows StewardTrack logo
        },
      };

      // Use the existing EmailChannel to send
      console.log(`[DeliveryService] Calling emailChannel.send() with tenant info:`, {
        fromName: notificationMessage.metadata?.fromName,
        replyTo: notificationMessage.metadata?.replyTo,
      });
      const result = await this.emailChannel.send(notificationMessage);
      console.log(`[DeliveryService] emailChannel.send() returned:`, {
        success: result.success,
        messageId: result.messageId,
        providerMessageId: result.providerMessageId,
        error: result.error,
      });

      if (result.success) {
        console.log(`[DeliveryService] Email sent successfully to ${to}`);
        return {
          success: true,
          messageId: result.providerMessageId || messageId,
        };
      } else {
        console.warn(`[DeliveryService] Email failed to send to ${to}: ${result.error}`);
        return {
          success: false,
          error: result.error || 'Failed to send email',
        };
      }
    } catch (error) {
      console.error('[DeliveryService] Email send exception:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error sending email',
      };
    }
  }

  async sendSms(
    to: string,
    message: string
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      console.log(`[DeliveryService] Sending SMS to ${to}: ${message.substring(0, 50)}...`);

      // Build NotificationMessage for SmsChannel
      const messageId = `sms_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Create a minimal event object for the notification system
      const event: NotificationEvent = {
        id: messageId,
        eventType: 'communication.campaign',
        category: 'communication',
        priority: 'normal',
        tenantId: '', // Will be set by the channel if needed
        recipient: {
          userId: '', // External communication, no user ID
          phone: to,
        },
        payload: {
          message,
        },
      };

      const notificationMessage: NotificationMessage = {
        id: messageId,
        event,
        recipient: {
          userId: '', // External communication
          phone: to,
        },
        title: message,
        body: message,
      };

      // Use the existing SmsChannel to send
      const result = await this.smsChannel.send(notificationMessage);

      if (result.success) {
        return {
          success: true,
          messageId: result.providerMessageId || messageId,
        };
      } else {
        return {
          success: false,
          error: result.error || 'Failed to send SMS',
        };
      }
    } catch (error) {
      console.error('[DeliveryService] SMS send error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error sending SMS',
      };
    }
  }

  async processDeliveryWebhook(payload: unknown): Promise<void> {
    // TODO: Process webhooks from email/SMS providers
    // Update recipient status based on delivery events (delivered, bounced, opened, clicked)
    console.log('[DeliveryService] Processing webhook:', payload);
  }

  private personalizeContent(
    subject: string,
    contentHtml: string,
    contentText: string,
    data: Record<string, unknown>
  ): { subject: string; contentHtml: string; contentText: string } {
    let personalizedSubject = subject;
    let personalizedHtml = contentHtml;
    let personalizedText = contentText;

    // Replace variables like {{first_name}}, {{last_name}}, etc.
    for (const [key, value] of Object.entries(data)) {
      const pattern = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
      const replacement = String(value || '');
      personalizedSubject = personalizedSubject.replace(pattern, replacement);
      personalizedHtml = personalizedHtml.replace(pattern, replacement);
      personalizedText = personalizedText.replace(pattern, replacement);
    }

    // Remove any remaining unsubstituted variables
    const unsubstitutedPattern = /{{[^}]+}}/g;
    personalizedSubject = personalizedSubject.replace(unsubstitutedPattern, '');
    personalizedHtml = personalizedHtml.replace(unsubstitutedPattern, '');
    personalizedText = personalizedText.replace(unsubstitutedPattern, '');

    return {
      subject: personalizedSubject,
      contentHtml: personalizedHtml,
      contentText: personalizedText,
    };
  }
}
