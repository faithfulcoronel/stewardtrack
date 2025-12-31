import { NextRequest, NextResponse } from 'next/server';
import { container } from '@/lib/container';
import { TYPES } from '@/lib/types';
import { PaymentService } from '@/services/PaymentService';

/**
 * POST /api/checkout/create-invoice
 *
 * Creates a Xendit invoice for subscription payment.
 * Called during registration or plan upgrade flows.
 *
 * Request body:
 * - tenantId: string
 * - offeringId: string
 * - payerEmail: string
 * - payerName: string
 *
 * Returns:
 * - invoice_url: string (Xendit payment page URL)
 * - invoice_id: string
 * - payment_id: string (internal payment record ID)
 */

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { tenantId, offeringId, payerEmail, payerName } = body;

    // Validate required fields
    if (!tenantId || !offeringId || !payerEmail || !payerName) {
      return NextResponse.json(
        { error: 'Missing required fields: tenantId, offeringId, payerEmail, payerName' },
        { status: 400 }
      );
    }

    // Get payment service from DI container
    const paymentService = container.get<PaymentService>(TYPES.PaymentService);

    // Check if Xendit is configured
    if (!paymentService.isConfigured()) {
      return NextResponse.json(
        { error: 'Payment gateway not configured. Please contact support.' },
        { status: 503 }
      );
    }

    // Get offering details
    const { createSupabaseServerClient } = await import('@/lib/supabase/server');
    const supabase = await createSupabaseServerClient();

    const { data: offering, error: offeringError }:any = await supabase
      .from('product_offerings')
      .select('*')
      .eq('id', offeringId)
      .single();

    if (offeringError || !offering) {
      return NextResponse.json(
        { error: 'Invalid offering ID' },
        { status: 404 }
      );
    }

    let externalId = `SUB-${tenantId}-${Date.now()}`;
    // Build success and failure URLs
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const successUrl = `${baseUrl}/signup/success?external_id=${externalId}`;
    const failureUrl = `${baseUrl}/signup/failed?external_id=${externalId}`;

    // Create payment invoice
    const { invoice, payment } = await paymentService.createSubscriptionPayment({
      tenantId,
      offeringId: offering.id,
      offeringName: offering.name,
      amount: offering.base_price,
      payerEmail,
      payerName,
      billingCycle: offering.billing_cycle,
      successUrl,
      failureUrl,
    });

    return NextResponse.json({
      success: true,
      invoice_url: invoice.invoice_url,
      invoice_id: invoice.id,
      payment_id: payment.id,
      amount: payment.amount,
      currency: payment.currency,
      expires_at: invoice.expiry_date,
    });
  } catch (error: any) {
    console.error('[Checkout API] Error creating invoice:', error);

    return NextResponse.json(
      {
        error: 'Failed to create payment invoice',
        details: error.message,
      },
      { status: 500 }
    );
  }
}
