import { NextRequest, NextResponse } from 'next/server';
import { container } from '@/lib/container';
import { TYPES } from '@/lib/types';
import type { FamilyService } from '@/services/FamilyService';
import type { TenantService } from '@/services/TenantService';
import type { FamilyRole } from '@/models/familyMember.model';

interface RouteParams {
  params: Promise<{ familyId: string }>;
}

/**
 * GET /api/families/[familyId]/members
 *
 * Fetches all members of a family.
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { familyId } = await params;

    // Get tenant context
    const tenantService = container.get<TenantService>(TYPES.TenantService);
    const tenant = await tenantService.getCurrentTenant();

    if (!tenant) {
      return NextResponse.json({ error: 'No tenant context available' }, { status: 401 });
    }

    // Fetch family members using service
    const familyService = container.get<FamilyService>(TYPES.FamilyService);
    const members = await familyService.getFamilyMembers(familyId, tenant.id);

    return NextResponse.json({ data: members });
  } catch (error: unknown) {
    console.error('[GET /api/families/[familyId]/members] Error:', error);
    const message = error instanceof Error ? error.message : 'Failed to fetch family members';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * POST /api/families/[familyId]/members
 *
 * Adds a member to a family.
 *
 * Body:
 * {
 *   memberId: string,
 *   role?: 'head' | 'spouse' | 'child' | 'dependent' | 'other',
 *   isPrimary?: boolean,
 *   roleNotes?: string
 * }
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { familyId } = await params;

    // Get tenant context
    const tenantService = container.get<TenantService>(TYPES.TenantService);
    const tenant = await tenantService.getCurrentTenant();

    if (!tenant) {
      return NextResponse.json({ error: 'No tenant context available' }, { status: 401 });
    }

    // Parse request body
    const body = await request.json();

    if (!body.memberId) {
      return NextResponse.json({ error: 'memberId is required' }, { status: 400 });
    }

    // Validate role if provided
    const validRoles: FamilyRole[] = ['head', 'spouse', 'child', 'dependent', 'other'];
    if (body.role && !validRoles.includes(body.role)) {
      return NextResponse.json(
        { error: `Invalid role. Must be one of: ${validRoles.join(', ')}` },
        { status: 400 }
      );
    }

    // Add member to family using service
    const familyService = container.get<FamilyService>(TYPES.FamilyService);

    const familyMember = await familyService.addMemberToFamily(
      familyId,
      body.memberId,
      tenant.id,
      {
        isPrimary: body.isPrimary ?? false,
        role: body.role ?? 'other',
        roleNotes: body.roleNotes,
      }
    );

    return NextResponse.json({ data: familyMember }, { status: 201 });
  } catch (error: unknown) {
    console.error('[POST /api/families/[familyId]/members] Error:', error);
    const message = error instanceof Error ? error.message : 'Failed to add member to family';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
