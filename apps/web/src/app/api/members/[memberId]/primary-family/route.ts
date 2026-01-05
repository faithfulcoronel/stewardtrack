import { NextRequest, NextResponse } from 'next/server';
import { container } from '@/lib/container';
import { TYPES } from '@/lib/types';
import type { FamilyService } from '@/services/FamilyService';
import type { TenantService } from '@/services/TenantService';

interface RouteParams {
  params: Promise<{ memberId: string }>;
}

/**
 * GET /api/members/[memberId]/primary-family
 *
 * Fetches a member's primary family.
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

    // Fetch primary family using service
    const familyService = container.get<FamilyService>(TYPES.FamilyService);
    const primaryFamily = await familyService.getPrimaryFamily(memberId, tenant.id);

    if (!primaryFamily) {
      return NextResponse.json({ data: null });
    }

    return NextResponse.json({ data: primaryFamily });
  } catch (error: unknown) {
    console.error('[GET /api/members/[memberId]/primary-family] Error:', error);
    const message = error instanceof Error ? error.message : 'Failed to fetch primary family';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * PUT /api/members/[memberId]/primary-family
 *
 * Sets a member's primary family.
 *
 * Body:
 * {
 *   familyId: string
 * }
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { memberId } = await params;

    // Get tenant context
    const tenantService = container.get<TenantService>(TYPES.TenantService);
    const tenant = await tenantService.getCurrentTenant();

    if (!tenant) {
      return NextResponse.json({ error: 'No tenant context available' }, { status: 401 });
    }

    // Parse request body
    const body = await request.json();

    if (!body.familyId) {
      return NextResponse.json({ error: 'familyId is required' }, { status: 400 });
    }

    // Set primary family using service
    const familyService = container.get<FamilyService>(TYPES.FamilyService);

    // Verify member is in the family
    const isInFamily = await familyService.isMemberInFamily(body.familyId, memberId, tenant.id);
    if (!isInFamily) {
      return NextResponse.json(
        { error: 'Member must be added to the family before setting it as primary' },
        { status: 400 }
      );
    }

    await familyService.setPrimaryFamily(memberId, body.familyId, tenant.id);

    // Fetch updated primary family
    const primaryFamily = await familyService.getPrimaryFamily(memberId, tenant.id);

    return NextResponse.json({ data: primaryFamily });
  } catch (error: unknown) {
    console.error('[PUT /api/members/[memberId]/primary-family] Error:', error);
    const message = error instanceof Error ? error.message : 'Failed to set primary family';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
