import { NextRequest, NextResponse } from 'next/server';
import { container } from '@/lib/container';
import { TYPES } from '@/lib/types';
import { PaymentService } from '@/services/PaymentService';
import { LicensingService } from '@/services/LicensingService';
import { PRIMARY_CURRENCY } from '@/lib/currency';

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
 * - currency?: string (optional, defaults to PHP)
 *
 * Returns:
 * - invoice_url: string (Xendit payment page URL)
 * - invoice_id: string
 * - payment_id: string (internal payment record ID)
 */

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { tenantId, offeringId, payerEmail, payerName, currency: requestedCurrency } = body;

    // Validate required fields
    if (!tenantId || !offeringId || !payerEmail || !payerName) {
      return NextResponse.json(
        { error: 'Missing required fields: tenantId, offeringId, payerEmail, payerName' },
        { status: 400 }
      );
    }

    // Get services from DI container
    const paymentService = container.get<PaymentService>(TYPES.PaymentService);
    const licensingService = container.get<LicensingService>(TYPES.LicensingService);

    // Check if Xendit is configured
    if (!paymentService.isConfigured()) {
      return NextResponse.json(
        { error: 'Payment gateway not configured. Please contact support.' },
        { status: 503 }
      );
    }

    // Get offering details via LicensingService
    const offering = await licensingService.getProductOffering(offeringId);
    if (!offering) {
      return NextResponse.json(
        { error: 'Invalid offering ID' },
        { status: 404 }
      );
    }

    // Get prices for this offering
    const prices = await licensingService.getOfferingPrices(offeringId);
    const preferredCurrency = requestedCurrency || PRIMARY_CURRENCY;

    // Find price in requested currency, fall back to primary currency or first available
    let priceInfo: { price: number; currency: string } = { price: 0, currency: preferredCurrency };

    if (prices && prices.length > 0) {
      const priceInCurrency = prices.find(p => p.currency === preferredCurrency && p.is_active);
      if (priceInCurrency) {
        priceInfo = { price: priceInCurrency.price, currency: priceInCurrency.currency };
      } else {
        const primaryPrice = prices.find(p => p.currency === PRIMARY_CURRENCY && p.is_active);
        if (primaryPrice) {
          priceInfo = { price: primaryPrice.price, currency: primaryPrice.currency };
        } else {
          const firstActivePrice = prices.find(p => p.is_active);
          if (firstActivePrice) {
            priceInfo = { price: firstActivePrice.price, currency: firstActivePrice.currency };
          }
        }
      }
    }

    // Generate external ID for payment tracking
    const externalId = `SUB-${tenantId}-${Date.now()}`;

    // Build success and failure URLs with external_id for payment verification
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const successUrl = `${baseUrl}/signup/success?external_id=${externalId}`;
    const failureUrl = `${baseUrl}/signup/failed?external_id=${externalId}`;

    // Create payment invoice with the same externalId used in callback URLs
    const { invoice, payment } = await paymentService.createSubscriptionPayment({
      tenantId,
      offeringId: offering.id,
      offeringName: offering.name,
      amount: priceInfo.price,
      currency: priceInfo.currency,
      payerEmail,
      payerName,
      billingCycle: offering.billing_cycle || 'monthly',
      successUrl,
      failureUrl,
      externalId,
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
