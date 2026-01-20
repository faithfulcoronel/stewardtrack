/**
 * GET /api/members/me/payment-methods
 *
 * Lists all saved payment methods for the current user's member profile.
 * Returns payment methods with display information (masked account numbers, etc.)
 */

import { NextRequest, NextResponse } from 'next/server';
import { container } from '@/lib/container';
import { TYPES } from '@/lib/types';
import { authUtils } from '@/utils/authUtils';
import { tenantUtils } from '@/utils/tenantUtils';
import type { DonorPaymentMethodService } from '@/services/DonorPaymentMethodService';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const user = await authUtils.getUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const tenantId = await tenantUtils.getTenantId();
    if (!tenantId) {
      return NextResponse.json(
        { success: false, error: 'No tenant context' },
        { status: 400 }
      );
    }

    const supabase = await createSupabaseServerClient();

    // Get the member linked to this user
    const { data: member, error: memberError } = await supabase
      .from('members')
      .select('id')
      .eq('user_id', user.id)
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .single();

    if (memberError || !member) {
      return NextResponse.json(
        { success: false, error: 'Member profile not found' },
        { status: 404 }
      );
    }

    // Get payment methods from service
    const paymentMethodService = container.get<DonorPaymentMethodService>(
      TYPES.DonorPaymentMethodService
    );

    const paymentMethods = await paymentMethodService.getPaymentMethodsForDisplay(
      member.id,
      tenantId
    );

    return NextResponse.json({
      success: true,
      data: paymentMethods,
    });
  } catch (error) {
    console.error('Error fetching payment methods:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch payment methods',
      },
      { status: 500 }
    );
  }
}
