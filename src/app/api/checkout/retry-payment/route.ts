import { NextRequest, NextResponse } from 'next/server';
import 'reflect-metadata';
import { container } from '@/lib/container';
import { TYPES } from '@/lib/types';
import type { PaymentService } from '@/services/PaymentService';
import { getCurrentTenantId } from '@/lib/server/context';

/**
 * POST /api/checkout/retry-payment
 *
 * Creates a new invoice for a failed/expired payment
 *
 * Request Body:
 * - paymentId: string (ID of the failed/expired payment)
 *
 * Response:
 * - invoice_url: string
 * - invoice_id: string
 * - payment_id: string
 * - amount: number
 * - currency: string
 */
export async function POST(request: NextRequest) {
  try {
    // Get current tenant ID - validates tenant access
    const tenantId = await getCurrentTenantId();
    
    console.log('Retry Payment - tenantId:');
    console.log('tenantId:', tenantId);

    if (!tenantId) {
      return NextResponse.json({ error: 'No tenant context available' }, { status: 400 });
    }

    const body = await request.json();
    const { paymentId } = body;

    if (!paymentId) {
      return NextResponse.json({ error: 'Missing paymentId' }, { status: 400 });
    }

    const paymentService = container.get<PaymentService>(TYPES.PaymentService);

    // Retry the failed payment - this creates a new invoice
    const { invoice, payment } = await paymentService.retryFailedPayment(paymentId);

    return NextResponse.json({
      invoice_url: invoice.invoice_url,
      invoice_id: invoice.id,
      payment_id: payment.id,
      amount: payment.amount,
      currency: payment.currency,
    });
  } catch (error) {
    console.error('Error retrying payment:', error);
    return NextResponse.json(
      {
        error: 'Failed to retry payment',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
