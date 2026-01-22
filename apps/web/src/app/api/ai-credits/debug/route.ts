import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { container } from '@/lib/container';
import { TYPES } from '@/lib/types';
import type { IAICreditPurchaseRepository } from '@/repositories/aiCreditPurchase.repository';
import type { IAICreditPackageRepository } from '@/repositories/aiCreditPackage.repository';

/**
 * GET /api/ai-credits/debug
 *
 * Debug endpoint to check AI credits system status
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();

    // Get current user and tenant
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Get tenant from tenant_users
    const { data: tenantUser } = await supabase
      .from('tenant_users')
      .select('tenant_id')
      .eq('user_id', user.id)
      .single();

    if (!tenantUser) {
      return NextResponse.json({ error: 'No tenant found' }, { status: 404 });
    }

    const tenantId = tenantUser.tenant_id;

    // Get packages
    const packageRepo = container.get<IAICreditPackageRepository>(
      TYPES.IAICreditPackageRepository
    );
    const packages = await packageRepo.getActivePackages('PHP');

    // Get purchases
    const purchaseRepo = container.get<IAICreditPurchaseRepository>(
      TYPES.IAICreditPurchaseRepository
    );
    const purchases = await purchaseRepo.findAll();

    // Get credit balance
    const { data: creditBalance } = await supabase
      .rpc('get_tenant_credit_balance', { p_tenant_id: tenantId });

    return NextResponse.json({
      success: true,
      tenantId,
      userId: user.id,
      userEmail: user.email,
      packages: packages.map(p => ({
        id: p.id,
        name: p.name,
        credits: p.credits_amount,
        price: p.price,
        currency: p.currency,
      })),
      purchases: purchases.map(p => ({
        id: p.id,
        package_id: p.package_id,
        credits: p.credits_purchased,
        amount: p.amount_paid,
        currency: p.currency,
        status: p.payment_status,
        xendit_invoice_id: p.xendit_invoice_id,
        created_at: p.created_at,
      })),
      creditBalance,
    });
  } catch (error: any) {
    console.error('[Debug] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        stack: error.stack,
      },
      { status: 500 }
    );
  }
}
