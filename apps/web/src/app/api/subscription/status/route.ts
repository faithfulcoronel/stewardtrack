import { NextResponse } from 'next/server';
import 'reflect-metadata';
import { container } from '@/lib/container';
import { TYPES } from '@/lib/types';
import type { PaymentService } from '@/services/PaymentService';
import type { LicensingService } from '@/services/LicensingService';
import type { DiscountService } from '@/services/DiscountService';
import { getCurrentTenantId } from '@/lib/server/context';
import { TenantService } from '@/services/TenantService';
import { PRIMARY_CURRENCY } from '@/lib/currency';

/**
 * GET /api/subscription/status
 *
 * Fetches the current subscription and payment status for the authenticated user's tenant.
 * Follows architecture: Supabase -> Adapter -> Repository -> Services
 *
 * Returns:
 * - hasActiveSubscription: boolean
 * - tenant: { id, church_name, subscription_status, payment_status, next_billing_date }
 * - currentOffering?: { id, name, tier, resolved_price, resolved_currency, billing_cycle, prices }
 * - latestPayment?: { id, amount, currency, status, paid_at, invoice_url, payment_method }
 * - paymentSummary?: { total_paid, total_pending, total_failed, payment_count, last_payment_date }
 */
export async function GET() {
  try {
    // Get current tenant ID
    const tenantId = await getCurrentTenantId();

    if (!tenantId) {
      return NextResponse.json({ error: 'No tenant context available' }, { status: 400 });
    }

    // Get services from DI container
    const licensingService = container.get<LicensingService>(TYPES.LicensingService);
    const paymentService = container.get<PaymentService>(TYPES.PaymentService);
    const tenantService = container.get<TenantService>(TYPES.TenantService);
    const discountService = container.get<DiscountService>(TYPES.DiscountService);

    let tenant: any;
    try {
      tenant = await tenantService.getCurrentTenant();

      // Determine if subscription is active
      const hasActiveSubscription =
      tenant?.subscription_status === 'active' || tenant?.subscription_status === 'trial';

      // Fetch latest payment using payment service
      const latestPayment = await paymentService.getLatestPayment(tenantId);

      // Get offering via LicensingService
      let currentOffering: any = null;
      if (tenant?.subscription_offering_id) {
        const offering = await licensingService.getProductOffering(tenant.subscription_offering_id);
        if (offering) {
          // Get prices for the offering
          const prices = await licensingService.getOfferingPrices(tenant.subscription_offering_id);

          // Get tenant's preferred currency or default to PRIMARY_CURRENCY
          const tenantCurrency = (tenant as any).preferred_currency || PRIMARY_CURRENCY;

          // Find price in tenant's currency
          let resolvedPrice = 0;
          let resolvedCurrency = tenantCurrency;

          if (prices && prices.length > 0) {
            const priceInCurrency = prices.find(p => p.currency === tenantCurrency && p.is_active);
            if (priceInCurrency) {
              resolvedPrice = priceInCurrency.price;
              resolvedCurrency = priceInCurrency.currency;
            } else {
              const primaryPrice = prices.find(p => p.currency === PRIMARY_CURRENCY && p.is_active);
              if (primaryPrice) {
                resolvedPrice = primaryPrice.price;
                resolvedCurrency = primaryPrice.currency;
              } else {
                const firstActivePrice = prices.find(p => p.is_active);
                if (firstActivePrice) {
                  resolvedPrice = firstActivePrice.price;
                  resolvedCurrency = firstActivePrice.currency;
                }
              }
            }
          }

          // Check for applicable discounts
          let discountInfo: {
            has_discount: boolean;
            discount_name?: string;
            discount_type?: string;
            calculation_type?: string;
            discount_value?: number;
            discount_amount?: number;
            discounted_price?: number;
            original_price?: number;
          } = { has_discount: false };

          if (resolvedPrice > 0) {
            try {
              const discountResult = await discountService.applyBestDiscount(
                tenant.subscription_offering_id,
                resolvedPrice,
                resolvedCurrency
              );

              if (discountResult.success && discountResult.discount) {
                discountInfo = {
                  has_discount: true,
                  discount_name: discountResult.discount.discount_name,
                  discount_type: discountResult.discount.discount_type,
                  calculation_type: discountResult.discount.calculation_type,
                  discount_value: discountResult.discount.discount_value,
                  discount_amount: discountResult.discountAmount,
                  discounted_price: discountResult.discountedPrice,
                  original_price: resolvedPrice,
                };
              }
            } catch (discountError) {
              console.error('Error fetching discount:', discountError);
              // Non-fatal: continue without discount info
            }
          }

          currentOffering = {
            id: offering.id,
            name: offering.name,
            tier: offering.tier,
            billing_cycle: offering.billing_cycle,
            resolved_price: resolvedPrice,
            resolved_currency: resolvedCurrency,
            prices: prices || [],
            discount: discountInfo,
          };
        }
      }

      // Fetch payment summary using payment service
      const paymentSummary = await paymentService.getTenantPaymentsSummary(tenantId);

      return NextResponse.json({
        hasActiveSubscription,
        tenant: {
          id: tenant?.id,
          church_name: tenant?.name,
          subscription_status: tenant?.subscription_status,
          payment_status: latestPayment?.status || null,
          next_billing_date: tenant?.subscription_end_date,
        },
        currentOffering,
        latestPayment: latestPayment
          ? {
              id: latestPayment.id,
              amount: latestPayment.amount,
              currency: latestPayment.currency,
              status: latestPayment.status,
              paid_at: latestPayment.paid_at,
              invoice_url: latestPayment.invoice_url,
              payment_method: latestPayment.payment_method,
            }
          : null,
        paymentSummary,
      });
    } catch (error) {
      return NextResponse.json(
        { error: 'Failed to fetch tenant details' },
        { status: 404 }
      );
    }
  } catch (error) {
    console.error('Error fetching subscription status:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch subscription status',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
