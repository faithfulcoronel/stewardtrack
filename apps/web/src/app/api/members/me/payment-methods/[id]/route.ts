/**
 * DELETE /api/members/me/payment-methods/[id]
 *
 * Removes a saved payment method for the current user.
 * Revokes the payment token with Xendit and marks as revoked locally.
 */

import { NextRequest, NextResponse } from 'next/server';
import { container } from '@/lib/container';
import { TYPES } from '@/lib/types';
import { authUtils } from '@/utils/authUtils';
import { tenantUtils } from '@/utils/tenantUtils';
import type { DonorPaymentMethodService } from '@/services/DonorPaymentMethodService';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function DELETE(
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

    // Verify payment method belongs to this member
    const { data: paymentMethod, error: paymentMethodError } = await supabase
      .from('donor_payment_methods')
      .select('id, member_id')
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

    // Revoke payment method
    const paymentMethodService = container.get<DonorPaymentMethodService>(
      TYPES.DonorPaymentMethodService
    );

    await paymentMethodService.revokePaymentMethod(paymentMethodId, tenantId);

    return NextResponse.json({
      success: true,
      message: 'Payment method removed successfully',
    });
  } catch (error) {
    console.error('Error removing payment method:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to remove payment method',
      },
      { status: 500 }
    );
  }
}
