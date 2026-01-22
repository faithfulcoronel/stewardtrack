/**
 * PUT /api/members/me/payment-methods/[id]/default
 *
 * Sets a saved payment method as the default for the current user.
 * Only one payment method can be default at a time.
 */

import { NextRequest, NextResponse } from 'next/server';
import { container } from '@/lib/container';
import { TYPES } from '@/lib/types';
import { authUtils } from '@/utils/authUtils';
import { tenantUtils } from '@/utils/tenantUtils';
import type { DonorPaymentMethodService } from '@/services/DonorPaymentMethodService';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: paymentMethodId } = await params;

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

    // Verify payment method belongs to this member and is active
    const { data: paymentMethod, error: paymentMethodError } = await supabase
      .from('donor_payment_methods')
      .select('id, member_id, status')
      .eq('id', paymentMethodId)
      .eq('tenant_id', tenantId)
      .single();

    if (paymentMethodError || !paymentMethod) {
      return NextResponse.json(
        { success: false, error: 'Payment method not found' },
        { status: 404 }
      );
    }

    if (paymentMethod.member_id !== member.id) {
      return NextResponse.json(
        { success: false, error: 'Payment method does not belong to this member' },
        { status: 403 }
      );
    }

    if (paymentMethod.status !== 'active') {
      return NextResponse.json(
        { success: false, error: 'Cannot set inactive payment method as default' },
        { status: 400 }
      );
    }

    // Set as default
    const paymentMethodService = container.get<DonorPaymentMethodService>(
      TYPES.DonorPaymentMethodService
    );

    await paymentMethodService.setDefaultPaymentMethod(
      paymentMethodId,
      member.id,
      tenantId
    );

    return NextResponse.json({
      success: true,
      message: 'Payment method set as default',
    });
  } catch (error) {
    console.error('Error setting default payment method:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to set default payment method',
      },
      { status: 500 }
    );
  }
}
