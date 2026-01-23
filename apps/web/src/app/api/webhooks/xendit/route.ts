import { NextRequest, NextResponse } from 'next/server';
import { container } from '@/lib/container';
import { TYPES } from '@/lib/types';
import { XenditService } from '@/services/XenditService';
import { PaymentSubscriptionService } from '@/services/PaymentSubscriptionService';
import { PaymentService } from '@/services/PaymentService';
import { BillingEventService } from '@/services/BillingEventService';
import { TenantService } from '@/services/TenantService';
import type { AICreditPurchaseService } from '@/services/AICreditPurchaseService';
import type { LicensingService } from '@/services/LicensingService';

/**
 * POST /api/webhooks/xendit
 *
 * Xendit webhook handler for invoice payment events.
 *
 * Webhook Events:
 * - invoice.paid: Invoice has been paid
 * - invoice.expired: Invoice has expired without payment
 * - invoice.pending: Invoice created (optional)
 *
 * Webhook Configuration in Xendit Dashboard:
 * 1. Go to Settings → Webhooks
 * 2. Add webhook URL: https://your-domain.com/api/webhooks/xendit
 * 3. Select events: invoice.paid, invoice.expired
 * 4. Copy verification token to XENDIT_WEBHOOK_VERIFICATION_TOKEN env var
 */

export async function POST(request: NextRequest) {
  try {
    // Get callback token from header for verification
    const callbackToken = request.headers.get('x-callback-token');

    if (!callbackToken) {
      console.error('[Xendit Webhook] Missing X-CALLBACK-TOKEN header');
      return NextResponse.json(
        { error: 'Missing verification token' },
        { status: 401 }
      );
    }

    // Get services from container
    const xenditService = container.get<XenditService>(TYPES.XenditService);
    const subscriptionService = container.get<PaymentSubscriptionService>(
      TYPES.PaymentSubscriptionService
    );
    const paymentService = container.get<PaymentService>(TYPES.PaymentService);
    const billingEventService = container.get<BillingEventService>(TYPES.BillingEventService);
    const tenantService = container.get<TenantService>(TYPES.TenantService);

    // Verify webhook signature
    if (!xenditService.verifyWebhookSignature(callbackToken)) {
      console.error('[Xendit Webhook] Invalid verification token');
      return NextResponse.json(
        { error: 'Invalid verification token' },
        { status: 401 }
      );
    }

    // Parse webhook payload
    const payload = await request.json();
    const event = xenditService.parseWebhookEvent(payload);

    console.log('[Xendit Webhook] Received event:', {
      id: event.id,
      external_id: event.external_id,
      status: event.status,
      payment_type: event.metadata?.payment_type,
    });

    // === AI CREDITS: Check if this is an AI credit purchase ===
    if (event.metadata?.payment_type === 'ai_credits') {
      console.log('[Xendit Webhook] Processing AI credit purchase:', event.external_id);

      const purchaseService = container.get<AICreditPurchaseService>(
        TYPES.AICreditPurchaseService
      );

      try {
        const status = event.status as string;

        if (status === 'PAID' || status === 'SETTLED') {
          await purchaseService.processPaidPurchase(event.id);
          console.log('[Xendit Webhook] AI credit purchase processed successfully');
        } else if (status === 'EXPIRED' || status === 'FAILED' || status.toLowerCase() === 'failed') {
          await purchaseService.markPurchaseFailed(event.id, status);
          console.log('[Xendit Webhook] AI credit purchase marked as failed/expired');
        } else {
          console.log('[Xendit Webhook] AI credit purchase status:', status);
        }

        return NextResponse.json({ success: true, type: 'ai_credits' });
      } catch (error: any) {
        console.error('[Xendit Webhook] AI credit purchase processing error:', error);
        return NextResponse.json(
          { error: 'Failed to process AI credit purchase', details: error.message },
          { status: 500 }
        );
      }
    }

    // === SUBSCRIPTION PAYMENT: Continue with existing logic ===
    // Get payment record using service role client (bypasses RLS for webhook context)
    const payment = await paymentService.getPaymentByXenditIdWithServiceRole(event.id);

    console.log('[Xendit Webhook] Payment lookup result:', { payment });
    if (!payment) {
      console.error('[Xendit Webhook] Payment not found:', event.external_id);

      // Still log the event via BillingEventService
      await billingEventService.logEventNotFound(
        event.external_id,
        `invoice.${event.status.toLowerCase()}`,
        event.id,
        payload
      );

      return NextResponse.json(
        { error: 'Payment not found' },
        { status: 404 }
      );
    }

    // Insert billing event log via BillingEventService
    await billingEventService.logEvent(
      event.external_id,
      `invoice.${event.status.toLowerCase()}`,
      payment.tenant_id,
      payment.id,
      event.id,
      payload
    );

    // Handle event based on status
    try {
      switch (event.status) {
        case 'PAID':
        case 'SETTLED':
          await handlePaidInvoice(
            event,
            payment,
            paymentService,
            tenantService,
            subscriptionService
          );
          break;

        case 'EXPIRED':
          await handleExpiredInvoice(
            event,
            payment,
            paymentService,
            tenantService,
            subscriptionService
          );
          break;

        case 'PENDING':
          // Optional: Handle pending status if needed
          console.log('[Xendit Webhook] Invoice pending:', event.external_id);
          break;

        default:
          console.warn('[Xendit Webhook] Unknown status:', event.status);
      }

      // Mark event as processed via BillingEventService
      await billingEventService.markAsProcessed(event.external_id);

      return NextResponse.json({ success: true });
    } catch (error: any) {
      console.error('[Xendit Webhook] Error processing event:', error);

      // Log processing error via BillingEventService
      await billingEventService.logProcessingError(event.external_id, error.message);

      throw error;
    }
  } catch (error: any) {
    console.error('[Xendit Webhook] Fatal error:', error);

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
 * Handle paid invoice event
 */
async function handlePaidInvoice(
  event: any,
  payment: any,
  paymentService: PaymentService,
  tenantService: TenantService,
  subscriptionService: PaymentSubscriptionService
) {
  console.log('[Xendit Webhook] Processing paid invoice:', event.external_id);

  // Update payment status via PaymentService
  await paymentService.updatePaymentByXenditIdWithServiceRole(event.id, {
    status: 'paid',
    xendit_payment_id: event.id,
    payment_method: event.payment_method,
    payment_channel: event.payment_channel,
    paid_at: event.paid_at,
  });

  // Update tenant payment status via TenantService
  await tenantService.updateTenantPaymentStatusWithServiceRole(
    payment.tenant_id,
    event.id,
    'paid',
    event.paid_at
  );

  console.log('[Xendit Webhook] Tenant payment status updated successfully for tenant:', payment.tenant_id);

  // Activate subscription and provision features
  if (payment.offering_id) {
    const licensingService = container.get<LicensingService>(TYPES.LicensingService);
    const offering = await licensingService.getProductOfferingWithServiceRole(payment.offering_id);

    console.log('[Xendit Webhook] Payment offering_id:', payment.offering_id);
    console.log('[Xendit Webhook] Retrieved offering:', offering);

    if (!offering) {
      console.error('[Xendit Webhook] Product offering not found for id:', payment.offering_id);
      throw new Error(`Product offering not found: ${payment.offering_id}`);
    }

    await subscriptionService.activateSubscription(
      payment.tenant_id,
      offering,
      new Date(event.paid_at)
    );
  } else {
    console.warn('[Xendit Webhook] Payment has no offering_id, skipping subscription activation');
  }

  console.log('[Xendit Webhook] Successfully processed paid invoice');
}

/**
 * Handle expired invoice event
 */
async function handleExpiredInvoice(
  event: any,
  payment: any,
  paymentService: PaymentService,
  tenantService: TenantService,
  subscriptionService: PaymentSubscriptionService
) {
  console.log('[Xendit Webhook] Processing expired invoice:', event.external_id);

  // Update payment status via PaymentService
  await paymentService.updatePaymentByXenditIdWithServiceRole(event.id, {
    status: 'expired',
    failed_at: new Date().toISOString(),
    failure_reason: 'Invoice expired without payment',
  });

  // Update tenant payment status via TenantService
  await tenantService.updateTenantPaymentStatusWithServiceRole(
    payment.tenant_id,
    event.id,
    'expired',
    null
  );

  // Handle payment failure
  await subscriptionService.handlePaymentFailure(
    payment.tenant_id,
    'Invoice expired without payment'
  );

  console.log('[Xendit Webhook] Successfully processed expired invoice');
}

/**
 * GET /api/webhooks/xendit
 *
 * Health check endpoint for webhook configuration testing
 */
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    message: 'Xendit webhook endpoint is active',
    timestamp: new Date().toISOString(),
  });
}
