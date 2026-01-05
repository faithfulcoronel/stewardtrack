import { NextRequest, NextResponse } from 'next/server';
import { container } from '@/lib/container';
import { TYPES } from '@/lib/types';
import type { FamilyService } from '@/services/FamilyService';
import type { TenantService } from '@/services/TenantService';

interface RouteParams {
  params: Promise<{ memberId: string }>;
}

/**
 * GET /api/members/[memberId]/families
 *
 * Fetches all families a member belongs to.
 * Returns both primary and secondary family memberships.
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { memberId } = await params;

    // Get tenant context
    const tenantService = container.get<TenantService>(TYPES.TenantService);
    const tenant = await tenantService.getCurrentTenant();

    if (!tenant) {
      return NextResponse.json({ error: 'No tenant context available' }, { status: 401 });
    }

    // Fetch member families using service
    const familyService = container.get<FamilyService>(TYPES.FamilyService);
    const families = await familyService.getMemberFamilies(memberId, tenant.id);

    return NextResponse.json({ data: families });
  } catch (error: unknown) {
    console.error('[GET /api/members/[memberId]/families] Error:', error);
    const message = error instanceof Error ? error.message : 'Failed to fetch member families';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
