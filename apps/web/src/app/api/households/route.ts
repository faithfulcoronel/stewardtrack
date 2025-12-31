import { NextRequest, NextResponse } from 'next/server';
import { container } from '@/lib/container';
import { TYPES } from '@/lib/types';
import type { MemberHouseholdService } from '@/services/MemberHouseholdService';
import type { TenantService } from '@/services/TenantService';

/**
 * GET /api/households
 *
 * Fetches all households for the current tenant.
 * Used by client components that need household data.
 */
export async function GET(request: NextRequest) {
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
