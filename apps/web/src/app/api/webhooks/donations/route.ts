import { NextRequest, NextResponse } from 'next/server';
import { container } from '@/lib/container';
import { TYPES } from '@/lib/types';
import { XenditService } from '@/services/XenditService';
import { DonationService } from '@/services/DonationService';
import { DonorPaymentMethodService } from '@/services/DonorPaymentMethodService';
import type { IDonationWebhookRepository } from '@/repositories/donationWebhook.repository';
import type { IDonationRepository } from '@/repositories/donation.repository';

/**
 * POST /api/webhooks/donations
 *
 * Xendit webhook handler for donation payment events.
 *
 * Webhook Events (Payments API v3):
 * - payment.succeeded: Payment has been completed
 * - payment.failed: Payment has failed
 * - payment.pending: Payment is pending (awaiting user action)
 * - payment.expired: Payment request has expired
 * - payment_method.activated: Payment method saved successfully
 *
 * Webhook Configuration in Xendit Dashboard:
 * 1. Go to Settings -> Webhooks
 * 2. Add webhook URL: https://your-domain.com/api/webhooks/donations
 * 3. Select events: payment.succeeded, payment.failed, payment.expired
 * 4. Copy verification token to XENDIT_WEBHOOK_VERIFICATION_TOKEN env var
 */
export async function POST(request: NextRequest) {
  try {
    // Get callback token from header for verification
    const callbackToken = request.headers.get('x-callback-token');

    if (!callbackToken) {
      console.error('[Donation Webhook] Missing X-CALLBACK-TOKEN header');
      return NextResponse.json(
        { error: 'Missing verification token' },
        { status: 401 }
      );
    }

    // Get services from container
    const xenditService = container.get<XenditService>(TYPES.XenditService);
    const donationService = container.get<DonationService>(TYPES.DonationService);
    const paymentMethodService = container.get<DonorPaymentMethodService>(
      TYPES.DonorPaymentMethodService
    );
    const webhookRepository = container.get<IDonationWebhookRepository>(
      TYPES.IDonationWebhookRepository
    );
    const donationRepository = container.get<IDonationRepository>(
      TYPES.IDonationRepository
    );

    // Verify webhook signature
    if (!xenditService.verifyWebhookSignature(callbackToken)) {
      console.error('[Donation Webhook] Invalid verification token');
      return NextResponse.json(
        { error: 'Invalid verification token' },
        { status: 401 }
      );
    }

    // Parse webhook payload
    const payload = await request.json();

    console.log('[Donation Webhook] Received event:', {
      event: payload.event,
      business_id: payload.business_id,
      data: {
        id: payload.data?.id,
        reference_id: payload.data?.reference_id,
        status: payload.data?.status,
      },
    });

    // Extract event details
    const eventType = payload.event;
    const webhookId = request.headers.get('webhook-id') || `wh_${Date.now()}`;
    const eventData = payload.data;

    // Find donation by payment request ID
    const paymentRequestId = eventData?.id || eventData?.payment_request_id;
    let donation = null;

    if (paymentRequestId) {
      donation = await donationRepository.findByXenditPaymentRequestId(paymentRequestId);
    }

    // If not found by payment request ID, try by metadata
    if (!donation && eventData?.metadata?.donation_id) {
      donation = await donationRepository.getDonationWithDetails(
        eventData.metadata.donation_id,
        eventData.metadata.tenant_id
      );
    }

    // Log webhook event
    const webhookLog = await webhookRepository.logWebhook({
      xendit_webhook_id: webhookId,
      event_type: eventType,
      tenant_id: donation?.tenant_id || eventData?.metadata?.tenant_id || undefined,
      donation_id: donation?.id || undefined,
      payload_sanitized: payload,
    });

    // If donation not found, log and return success (don't fail the webhook)
    if (!donation) {
      console.warn('[Donation Webhook] Donation not found for event:', {
        paymentRequestId,
        metadata: eventData?.metadata,
      });

      await webhookRepository.markAsFailed(
        webhookLog.id,
        'Donation not found for payment request'
      );

      // Return 200 to acknowledge receipt (don't want Xendit to retry for missing donations)
      return NextResponse.json({
        success: true,
        warning: 'Donation not found',
      });
    }

    // Process event based on type
    try {
      await webhookRepository.updateWebhookStatus(webhookLog.id, 'processing');

      switch (eventType) {
        case 'payment.succeeded':
          await handlePaymentSucceeded(
            eventData,
            donation,
            donationService,
            paymentMethodService
          );
          break;

        case 'payment.failed':
          await handlePaymentFailed(eventData, donation, donationService);
          break;

        case 'payment.expired':
          await handlePaymentExpired(donation, donationService);
          break;

        case 'payment.pending':
          // No action needed for pending - donation already in pending state
          console.log('[Donation Webhook] Payment pending:', donation.id);
          break;

        case 'payment_method.activated':
          await handlePaymentMethodActivated(
            eventData,
            donation,
            paymentMethodService
          );
          break;

        default:
          console.log('[Donation Webhook] Unhandled event type:', eventType);
      }

      // Mark webhook as processed
      await webhookRepository.markAsProcessed(webhookLog.id, donation.id);

      return NextResponse.json({ success: true });
    } catch (processingError: any) {
      console.error('[Donation Webhook] Processing error:', processingError);

      await webhookRepository.markAsFailed(webhookLog.id, processingError.message);

      // Return 500 so Xendit can retry
      return NextResponse.json(
        {
          error: 'Processing failed',
          details: processingError.message,
        },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error('[Donation Webhook] Fatal error:', error);

    return NextResponse.json(
      {
        error: 'Webhook processing failed',
        details: error.message,
      },
      { status: 500 }
    );
  }
}

/**
 * Handle successful payment
 */
async function handlePaymentSucceeded(
  eventData: any,
  donation: any,
  donationService: DonationService,
  paymentMethodService: DonorPaymentMethodService
) {
  console.log('[Donation Webhook] Processing successful payment:', donation.id);

  // Extract payment details
  const paymentId = eventData.id;
  const paymentMethod = eventData.payment_method;
  const maskedAccount = extractMaskedAccount(paymentMethod);

  // Update donation status to paid
  await donationService.processSuccessfulPayment(
    donation.id,
    donation.tenant_id,
    paymentId,
    maskedAccount
  );

  // If payment method was saved, store it for future use
  if (eventData.payment_method?.reusable && donation.member_id) {
    try {
      await paymentMethodService.savePaymentMethodFromXendit(
        donation.tenant_id,
        donation.member_id,
        donation.xendit_customer_id,
        paymentMethod.id,
        mapPaymentType(paymentMethod.type),
        paymentMethod.channel_code,
        getDisplayName(paymentMethod),
        maskedAccount
      );
    } catch (err) {
      // Don't fail the webhook if payment method save fails
      console.error('[Donation Webhook] Failed to save payment method:', err);
    }
  }

  console.log('[Donation Webhook] Successfully processed payment:', donation.id);
}

/**
 * Handle failed payment
 */
async function handlePaymentFailed(
  eventData: any,
  donation: any,
  donationService: DonationService
) {
  console.log('[Donation Webhook] Processing failed payment:', donation.id);

  const failureReason = eventData.failure_code
    ? `${eventData.failure_code}: ${eventData.failure_message || 'Payment failed'}`
    : 'Payment failed';

  await donationService.processFailedPayment(
    donation.id,
    donation.tenant_id,
    failureReason
  );

  console.log('[Donation Webhook] Marked donation as failed:', donation.id);
}

/**
 * Handle expired payment
 */
async function handlePaymentExpired(
  donation: any,
  donationService: DonationService
) {
  console.log('[Donation Webhook] Processing expired payment:', donation.id);

  await donationService.processExpiredPayment(donation.id, donation.tenant_id);

  console.log('[Donation Webhook] Marked donation as expired:', donation.id);
}

/**
 * Handle payment method activation (saved payment method)
 */
async function handlePaymentMethodActivated(
  eventData: any,
  donation: any,
  paymentMethodService: DonorPaymentMethodService
) {
  console.log('[Donation Webhook] Processing payment method activation');

  if (!donation.member_id) {
    console.log('[Donation Webhook] No member ID, skipping payment method save');
    return;
  }

  const paymentMethod = eventData;
  const maskedAccount = extractMaskedAccount(paymentMethod);

  await paymentMethodService.savePaymentMethodFromXendit(
    donation.tenant_id,
    donation.member_id,
    donation.xendit_customer_id,
    paymentMethod.id,
    mapPaymentType(paymentMethod.type),
    paymentMethod.channel_code,
    getDisplayName(paymentMethod),
    maskedAccount
  );

  console.log('[Donation Webhook] Saved payment method for member:', donation.member_id);
}

/**
 * Extract masked account from payment method
 */
function extractMaskedAccount(paymentMethod: any): string | undefined {
  if (!paymentMethod) return undefined;

  // Card
  if (paymentMethod.card?.masked_card_number) {
    return paymentMethod.card.masked_card_number.slice(-4);
  }

  // E-Wallet
  if (paymentMethod.ewallet?.account_mobile_number) {
    const mobile = paymentMethod.ewallet.account_mobile_number;
    return `****${mobile.slice(-4)}`;
  }

  // Direct Debit
  if (paymentMethod.direct_debit?.masked_bank_account_number) {
    return paymentMethod.direct_debit.masked_bank_account_number;
  }

  // Bank Transfer (virtual account)
  if (paymentMethod.virtual_account?.masked_account_number) {
    return paymentMethod.virtual_account.masked_account_number;
  }

  return undefined;
}

/**
 * Map Xendit payment type to our type
 */
function mapPaymentType(xenditType: string): 'card' | 'ewallet' | 'bank_transfer' | 'direct_debit' {
  const typeMap: Record<string, 'card' | 'ewallet' | 'bank_transfer' | 'direct_debit'> = {
    CARD: 'card',
    EWALLET: 'ewallet',
    VIRTUAL_ACCOUNT: 'bank_transfer',
    DIRECT_DEBIT: 'direct_debit',
    QR_CODE: 'ewallet',
    OVER_THE_COUNTER: 'bank_transfer',
  };

  return typeMap[xenditType?.toUpperCase()] || 'card';
}

/**
 * Get display name for payment method
 */
function getDisplayName(paymentMethod: any): string {
  if (paymentMethod.channel_code) {
    const channelNames: Record<string, string> = {
      GCASH: 'GCash',
      GRABPAY: 'GrabPay',
      PAYMAYA: 'PayMaya',
      SHOPEEPAY: 'ShopeePay',
      OVO: 'OVO',
      DANA: 'DANA',
      LINKAJA: 'LinkAja',
      BPI: 'BPI',
      BDO: 'BDO',
      UNIONBANK: 'UnionBank',
    };

    const code = paymentMethod.channel_code.toUpperCase();
    if (channelNames[code]) {
      return channelNames[code];
    }
  }

  // Default labels
  const typeLabels: Record<string, string> = {
    CARD: 'Credit/Debit Card',
    EWALLET: 'E-Wallet',
    VIRTUAL_ACCOUNT: 'Bank Transfer',
    DIRECT_DEBIT: 'Direct Debit',
  };

  return typeLabels[paymentMethod.type?.toUpperCase()] || 'Payment Method';
}

/**
 * GET /api/webhooks/donations
 *
 * Health check endpoint for webhook configuration testing
 */
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    message: 'Donation webhook endpoint is active',
    version: '1.0',
    supported_events: [
      'payment.succeeded',
      'payment.failed',
      'payment.expired',
      'payment.pending',
      'payment_method.activated',
    ],
    timestamp: new Date().toISOString(),
  });
}
