import { NextRequest, NextResponse } from 'next/server';
import { container } from '@/lib/container';
import { TYPES } from '@/lib/types';
import { XenditService } from '@/services/XenditService';
import { PaymentService } from '@/services/PaymentService';
import { PaymentSubscriptionService } from '@/services/PaymentSubscriptionService';
import type { AICreditPurchaseService } from '@/services/AICreditPurchaseService';
import type { ScheduleRegistrationPaymentService } from '@/services/ScheduleRegistrationPaymentService';
import { createSupabaseServerClient } from '@/lib/supabase/server';

/**
 * POST /api/webhooks/xendit
 *
 * Xendit webhook handler for payment events.
 *
 * Supported Payment Types (via metadata.payment_type):
 * - ai_credits: AI credit purchases
 * - event_registration: Event/schedule registration payments
 * - (default): Subscription/license payments
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
    const paymentService = container.get<PaymentService>(TYPES.PaymentService);
    const subscriptionService = container.get<PaymentSubscriptionService>(
      TYPES.PaymentSubscriptionService
    );

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

    // Log event to database
    const supabase = await createSupabaseServerClient();

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

    // === EVENT REGISTRATION: Check if this is an event registration payment ===
    if (event.metadata?.payment_type === 'event_registration') {
      console.log('[Xendit Webhook] Processing event registration payment:', {
        external_id: event.external_id,
        event_id: event.id,
        status: event.status,
        metadata: event.metadata,
      });

      const registrationId = event.metadata?.registration_id;
      const tenantId = event.metadata?.tenant_id;

      if (!registrationId || !tenantId) {
        console.error('[Xendit Webhook] Missing registration_id or tenant_id in metadata:', event.metadata);
        return NextResponse.json(
          { error: 'Missing registration or tenant ID in payment metadata' },
          { status: 400 }
        );
      }

      try {
        const registrationPaymentService = container.get<ScheduleRegistrationPaymentService>(
          TYPES.ScheduleRegistrationPaymentService
        );

        const status = event.status as string;
        console.log(`[Xendit Webhook] Event registration status: ${status}, registrationId: ${registrationId}, tenantId: ${tenantId}`);

        if (status === 'PAID' || status === 'SETTLED') {
          console.log('[Xendit Webhook] Calling processSuccessfulPayment...');
          await registrationPaymentService.processSuccessfulPayment(
            registrationId,
            tenantId,
            event.id,
            event.payment_method
          );
          console.log('[Xendit Webhook] Event registration payment processed successfully');
        } else if (status === 'FAILED' || status.toLowerCase() === 'failed') {
          await registrationPaymentService.processFailedPayment(
            registrationId,
            tenantId,
            'Payment failed'
          );
          console.log('[Xendit Webhook] Event registration payment marked as failed');
        } else if (status === 'EXPIRED') {
          await registrationPaymentService.processExpiredPayment(
            registrationId,
            tenantId
          );
          console.log('[Xendit Webhook] Event registration payment marked as expired');
        } else {
          console.log('[Xendit Webhook] Event registration payment status:', status);
        }

        return NextResponse.json({ success: true, type: 'event_registration' });
      } catch (error: any) {
        console.error('[Xendit Webhook] Event registration payment processing error:', error);
        return NextResponse.json(
          { error: 'Failed to process event registration payment', details: error.message },
          { status: 500 }
        );
      }
    }

    // === SUBSCRIPTION PAYMENT: Continue with existing logic ===
    // Get payment record
    const payment = await paymentService.getPaymentByXenditId(event.id);

    if (!payment) {
      console.error('[Xendit Webhook] Payment not found:', event.external_id);

      // Still log the event
      await supabase.from('billing_events').insert({
        event_id: event.external_id,
        event_type: `invoice.${event.status.toLowerCase()}`,
        xendit_event_id: event.id,
        payload: payload,
        processed: false,
        processing_error: 'Payment record not found',
      });

      return NextResponse.json(
        { error: 'Payment not found' },
        { status: 404 }
      );
    }

    // Insert billing event log
    await supabase.from('billing_events').insert({
      event_id: event.external_id,
      event_type: `invoice.${event.status.toLowerCase()}`,
      tenant_id: payment.tenant_id,
      payment_id: payment.id,
      xendit_event_id: event.id,
      payload: payload,
      processed: false,
    });

    // Handle event based on status
    try {
      switch (event.status) {
        case 'PAID':
        case 'SETTLED':
          await handlePaidInvoice(event, payment, paymentService, subscriptionService, supabase);
          break;

        case 'EXPIRED':
          await handleExpiredInvoice(event, payment, paymentService, subscriptionService, supabase);
          break;

        case 'PENDING':
          // Optional: Handle pending status if needed
          console.log('[Xendit Webhook] Invoice pending:', event.external_id);
          break;

        default:
          console.warn('[Xendit Webhook] Unknown status:', event.status);
      }

      // Mark event as processed
      await supabase
        .from('billing_events')
        .update({
          processed: true,
          processed_at: new Date().toISOString(),
        })
        .eq('event_id', event.external_id);

      return NextResponse.json({ success: true });
    } catch (error: any) {
      console.error('[Xendit Webhook] Error processing event:', error);

      // Log processing error
      await supabase
        .from('billing_events')
        .update({
          processing_error: error.message,
          retry_count: supabase.rpc('increment', { x: 1 }),
        })
        .eq('event_id', event.external_id);

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
  subscriptionService: PaymentSubscriptionService,
  supabase: any
) {
  console.log('[Xendit Webhook] Processing paid invoice:', event.external_id);

  // Update payment status
  await paymentService.updatePaymentStatus(
    event.id,
    'paid',
    {
      xendit_payment_id: event.id,
      payment_method: event.payment_method,
      payment_channel: event.payment_channel,
      paid_at: event.paid_at,
    }
  );

  // Call database function to update tenant payment status
  await supabase.rpc('update_tenant_payment_status', {
    p_tenant_id: payment.tenant_id,
    p_xendit_invoice_id: event.id,
    p_status: 'paid',
    p_paid_at: event.paid_at,
  });

  // Activate subscription and provision features
  if (payment.offering_id) {
    await subscriptionService.activateSubscription(
      payment.tenant_id,
      payment.offering_id,
      new Date(event.paid_at)
    );
  }

  console.log('[Xendit Webhook] Successfully processed paid invoice');

  // TODO: Send payment confirmation email to tenant
}

/**
 * Handle expired invoice event
 */
async function handleExpiredInvoice(
  event: any,
  payment: any,
  paymentService: PaymentService,
  subscriptionService: PaymentSubscriptionService,
  supabase: any
) {
  console.log('[Xendit Webhook] Processing expired invoice:', event.external_id);

  // Update payment status
  await paymentService.updatePaymentStatus(
    event.id,
    'expired',
    {
      failed_at: new Date().toISOString(),
      failure_reason: 'Invoice expired without payment',
    }
  );

  // Call database function to update tenant payment status
  await supabase.rpc('update_tenant_payment_status', {
    p_tenant_id: payment.tenant_id,
    p_xendit_invoice_id: event.id,
    p_status: 'expired',
    p_paid_at: null,
  });

  // Handle payment failure
  await subscriptionService.handlePaymentFailure(
    payment.tenant_id,
    'Invoice expired without payment'
  );

  console.log('[Xendit Webhook] Successfully processed expired invoice');

  // TODO: Send payment failed email with retry link
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
