import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { container } from '@/lib/container';
import { TYPES } from '@/lib/types';
import type { IAICreditPurchaseRepository } from '@/repositories/aiCreditPurchase.repository';

/**
 * GET /api/ai-credits/test-query
 *
 * Debug endpoint to test purchase history query
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

    console.log('[Test Query] Testing purchase history for tenant:', tenantId);

    // Test 1: Direct Supabase query
    const { data: directData, error: directError } = await supabase
      .from('ai_credit_purchases')
      .select(`
        *,
        package:ai_credit_packages!package_id (
          name,
          credits_amount
        )
      `)
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .limit(5);

    console.log('[Test Query] Direct query result:', JSON.stringify(directData, null, 2));
    console.log('[Test Query] Direct query error:', directError);

    // Test 2: Through repository
    const purchaseRepo = container.get<IAICreditPurchaseRepository>(
      TYPES.IAICreditPurchaseRepository
    );
    const repoData = await purchaseRepo.getPurchaseHistory(tenantId, { limit: 5 });

    console.log('[Test Query] Repository result:', JSON.stringify(repoData, null, 2));

    return NextResponse.json({
      success: true,
      tenantId,
      directQuery: {
        data: directData,
        error: directError,
      },
      repositoryQuery: repoData,
    });
  } catch (error: any) {
    console.error('[Test Query] Error:', error);
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
