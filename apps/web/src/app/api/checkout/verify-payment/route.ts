import { NextRequest, NextResponse } from 'next/server';
import { container } from '@/lib/container';
import { TYPES } from '@/lib/types';
import { PaymentService } from '@/services/PaymentService';
import { PaymentSubscriptionService } from '@/services/PaymentSubscriptionService';

/**
 * GET /api/checkout/verify-payment?external_id=xxx
 *
 * Verifies payment status by external_id or xendit_invoice_id.
 * Used on success/failure redirect pages to confirm payment status.
 *
 * Query params:
 * - external_id: string OR
 * - invoice_id: string
 *
 * Returns:
 * - status: 'pending' | 'paid' | 'settled' | 'expired' | 'failed'
 * - payment: Payment record
 * - subscription: Subscription status (if paid)
 */

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const externalId = searchParams.get('external_id');
    const invoiceId = searchParams.get('invoice_id');

    if (!externalId && !invoiceId) {
      return NextResponse.json(
        { error: 'Missing required parameter: external_id or invoice_id' },
        { status: 400 }
      );
    }

    // Get services from DI container
    const paymentService = container.get<PaymentService>(TYPES.PaymentService);
    const subscriptionService = container.get<PaymentSubscriptionService>(
      TYPES.PaymentSubscriptionService
    );

    // Get payment record
    let payment = null;

    if (externalId) {
      payment = await paymentService.getPaymentByExternalId(externalId);
    } else if (invoiceId) {
      payment = await paymentService.getPaymentByXenditId(invoiceId);
    }

    if (!payment) {
      return NextResponse.json(
        { error: 'Payment not found' },
        { status: 404 }
      );
    }

    // Get current Xendit invoice status
    try {
      const xenditInvoice = await paymentService.getXenditInvoice(payment.xendit_invoice_id!);

      // Update local status if different
      if (xenditInvoice.status.toLowerCase() !== payment.status) {
        const updatedStatus = xenditInvoice.status.toLowerCase() as any;
        payment = await paymentService.updatePaymentStatus(
          payment.xendit_invoice_id!,
          updatedStatus,
          {
            payment_method: xenditInvoice.payment_method,
            payment_channel: xenditInvoice.payment_channel,
            paid_at: xenditInvoice.paid_at,
          }
        );
      }
    } catch (error: any) {
      console.error('[Verify Payment] Error fetching Xendit invoice:', error.message);
      // Continue with local payment status if Xendit API fails
    }

    // Get subscription status if payment is successful
    let subscriptionStatus = null;
    if (payment.status === 'paid' || payment.status === 'settled') {
      subscriptionStatus = await subscriptionService.getSubscriptionStatus(
        payment.tenant_id
      );
    }

    return NextResponse.json({
      success: true,
      status: payment.status,
      payment: {
        id: payment.id,
        amount: payment.amount,
        currency: payment.currency,
        status: payment.status,
        payment_method: payment.payment_method,
        paid_at: payment.paid_at,
        invoice_url: payment.invoice_url,
      },
      subscription: subscriptionStatus,
    });
  } catch (error: any) {
    console.error('[Verify Payment API] Error:', error);

    return NextResponse.json(
      {
        error: 'Failed to verify payment status',
        details: error.message,
      },
      { status: 500 }
    );
  }
}
