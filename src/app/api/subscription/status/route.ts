import { NextResponse } from 'next/server';
import 'reflect-metadata';
import { container } from '@/lib/container';
import { TYPES } from '@/lib/types';
import type { PaymentService } from '@/services/PaymentService';
import type { LicensingService } from '@/services/LicensingService';
import { getCurrentTenantId } from '@/lib/server/context';
import { getCurrentUser } from '@/lib/server/context';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { Tenant } from '@/models/tenant.model';
import { TenantService } from '@/services/TenantService';
import { te } from 'date-fns/locale';
import { off } from 'process';

/**
 * GET /api/subscription/status
 *
 * Fetches the current subscription and payment status for the authenticated user's tenant.
 * Follows architecture: Supabase -> Adapter -> Repository -> Services
 *
 * Returns:
 * - hasActiveSubscription: boolean
 * - tenant: { id, church_name, subscription_status, payment_status, next_billing_date }
 * - currentOffering?: { id, name, tier, base_price, billing_cycle }
 * - latestPayment?: { id, amount, currency, status, paid_at, invoice_url, payment_method }
 * - paymentSummary?: { total_paid, total_pending, total_failed, payment_count, last_payment_date }
 */
export async function GET() {
  try {
    // Get current tenant ID
    const tenantId = await getCurrentTenantId();
    const $user =  await getCurrentUser();

    if (!tenantId) {
      return NextResponse.json({ error: 'No tenant context available' }, { status: 400 });
    }

    // Get services from DI container
    const licensingService = container.get<LicensingService>(TYPES.LicensingService);
    const paymentService = container.get<PaymentService>(TYPES.PaymentService);

    const tenantService = container.get<TenantService>(TYPES.TenantService);


    // console.log('CURRENT TENANT:', tenant);

    // Fetch tenant details directly (repository requires context setup in API routes)
    const supabase = await createSupabaseServerClient();
    // const { data: tenant, error: tenantError } = await supabase
    //   .from('tenants')
    //   .select('id, name, subscription_status, subscription_end_date, subscription_offering_id')
    //   .eq('id', tenantId)
    //   .single();

    let tenant: any;
    try {
      tenant = await tenantService.getCurrentTenant();
      console.log('TENANT:', tenant);

      // Determine if subscription is active
      const hasActiveSubscription =
      tenant?.subscription_status === 'active' || tenant?.subscription_status === 'trial';

      // Fetch latest payment using payment service
      const latestPayment = await paymentService.getLatestPayment(tenantId);

      console.log('Latest Payment:', latestPayment);

      
      // const offering:any = await licensingService.getProductOffering('3a83a10c-1882-4b24-88f8-7c9b069c39a1');

      //notes: will move this implemenation to proper achitecture later
      const { data: offering } = await supabase
      .from('product_offerings')
      .select('id, name, tier, base_price, billing_cycle')
      .eq('id', tenant.subscription_offering_id)
      .single();
      console.log('Product Offering:', offering);

      // Get offering from latest payment if available, otherwise try subscription tier
      let currentOffering = {
        id: offering?.id || '',
        name: offering?.name || '',
        tier: offering?.tier || '',
        base_price: offering?.base_price || 0,
        billing_cycle: offering?.billing_cycle,
      }

      // if (latestPayment && latestPayment.offering_id) {
      //   const offering = await licensingService.getProductOffering(latestPayment.offering_id);
      //   if (offering) {
      //     currentOffering = {
      //       id: offering.id,
      //       name: offering.name,
      //       tier: offering.tier,
      //       base_price: offering.base_price,
      //       billing_cycle: offering.billing_cycle,
      //     };
      //   }
      // }

      // Fetch payment summary using payment service
    const paymentSummary = await paymentService.getTenantPaymentsSummary(tenantId);

    return NextResponse.json({
      hasActiveSubscription,
      tenant: {
        id: tenant?.id,
        church_name: tenant?.name, // name field in Tenant model
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
