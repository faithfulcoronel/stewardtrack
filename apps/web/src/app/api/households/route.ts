import { NextResponse } from 'next/server';
import { container } from '@/lib/container';
import { TYPES } from '@/lib/types';
import type { MemberHouseholdService } from '@/services/MemberHouseholdService';
import type { TenantService } from '@/services/TenantService';
import { PermissionGate } from '@/lib/access-gate';
import { getCurrentUserId } from '@/lib/server/context';

/**
 * GET /api/households
 *
 * Fetches all households for the current tenant.
 * Used by client components that need household data.
 *
 * @permission households:view
 */
export async function GET() {
  try {
    // Get tenant context
    const tenantService = container.get<TenantService>(TYPES.TenantService);
    const tenant = await tenantService.getCurrentTenant();

    if (!tenant) {
      return NextResponse.json(
        { error: 'No tenant context available' },
        { status: 401 }
      );
    }

    // Check permission using PermissionGate (single source of truth)
    const userId = await getCurrentUserId();
    const permissionGate = new PermissionGate('households:view', 'all');
    const accessResult = await permissionGate.check(userId, tenant.id);

    if (!accessResult.allowed) {
      return NextResponse.json(
        { error: accessResult.reason || 'You do not have permission to view households' },
        { status: 403 }
      );
    }

    // Fetch households using service
    const householdService = container.get<MemberHouseholdService>(TYPES.MemberHouseholdService);
    const households = await householdService.getHouseholdsByTenant(tenant.id);

    // Return formatted response
    return NextResponse.json({
      data: households.map(household => ({
        id: household.id,
        name: household.name,
        address_street: household.address_street,
        address_city: household.address_city,
        address_state: household.address_state,
        address_postal_code: household.address_postal_code,
        member_names: household.member_names,
      })),
    });
  } catch (error: any) {
    console.error('[GET /api/households] Error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to fetch households' },
      { status: 500 }
    );
  }
}
