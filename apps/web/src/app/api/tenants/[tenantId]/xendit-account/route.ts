/**
 * ================================================================================
 * XENDIT SUB-ACCOUNT API ROUTE
 * ================================================================================
 *
 * Manages Xendit XenPlatform sub-accounts for tenants.
 *
 * POST /api/tenants/[tenantId]/xendit-account
 *   Creates a new Xendit sub-account for the tenant
 *
 * GET /api/tenants/[tenantId]/xendit-account
 *   Gets the sub-account status and balance
 *
 * ================================================================================
 */

import { NextRequest, NextResponse } from 'next/server';
import { container } from '@/lib/container';
import { TYPES } from '@/lib/types';
import type { XenPlatformService } from '@/services/XenPlatformService';
import type { ITenantRepository } from '@/repositories/tenant.repository';
import { getCurrentUserId } from '@/lib/server/context';

type RouteParams = {
  params: Promise<{ tenantId: string }>;
};

/**
 * POST /api/tenants/[tenantId]/xendit-account
 * Create a Xendit sub-account for the tenant
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { tenantId } = await params;
    await getCurrentUserId(); // Ensure authenticated

    const body = await request.json();
    const { businessName, email } = body;

    if (!businessName || !email) {
      return NextResponse.json(
        { error: 'businessName and email are required' },
        { status: 400 }
      );
    }

    const xenPlatformService = container.get<XenPlatformService>(TYPES.XenPlatformService);

    // Check if tenant already has a sub-account
    const existingSubAccountId = await xenPlatformService.getTenantSubAccountId(tenantId);
    if (existingSubAccountId) {
      return NextResponse.json(
        { error: 'Tenant already has a Xendit sub-account' },
        { status: 409 }
      );
    }

    // Create the sub-account
    const subAccount = await xenPlatformService.createSubAccount(tenantId, businessName, email);

    return NextResponse.json({
      success: true,
      subAccount: {
        id: subAccount.id,
        status: subAccount.status,
        email: subAccount.email,
        businessName: subAccount.public_profile.business_name,
      },
    });
  } catch (error) {
    console.error('[POST /api/tenants/[tenantId]/xendit-account]', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create sub-account' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/tenants/[tenantId]/xendit-account
 * Get the sub-account status and balance
 */
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { tenantId } = await params;
    await getCurrentUserId(); // Ensure authenticated

    const xenPlatformService = container.get<XenPlatformService>(TYPES.XenPlatformService);
    const tenantRepository = container.get<ITenantRepository>(TYPES.ITenantRepository);

    // Get tenant details
    const tenant = await tenantRepository.findById(tenantId);
    if (!tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
    }

    // Check if sub-account exists
    if (!tenant.xendit_sub_account_id) {
      return NextResponse.json({
        configured: false,
        subAccountId: null,
        status: null,
        balance: null,
      });
    }

    // Get sub-account status with balance
    const status = await xenPlatformService.getTenantSubAccountStatus(tenantId);

    return NextResponse.json({
      configured: true,
      subAccountId: status?.subAccountId,
      status: status?.status,
      balance: status?.balance,
      pendingBalance: status?.pendingBalance,
      currency: status?.currency,
    });
  } catch (error) {
    console.error('[GET /api/tenants/[tenantId]/xendit-account]', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get sub-account status' },
      { status: 500 }
    );
  }
}
