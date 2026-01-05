import { NextRequest, NextResponse } from 'next/server';
import { container } from '@/lib/container';
import { TYPES } from '@/lib/types';
import type { FamilyService } from '@/services/FamilyService';
import type { TenantService } from '@/services/TenantService';
import type { FamilyRole } from '@/models/familyMember.model';

interface RouteParams {
  params: Promise<{ familyId: string; memberId: string }>;
}

/**
 * PUT /api/families/[familyId]/members/[memberId]
 *
 * Updates a member's role in a family.
 *
 * Body:
 * {
 *   role?: 'head' | 'spouse' | 'child' | 'dependent' | 'other',
 *   roleNotes?: string,
 *   isPrimary?: boolean
 * }
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { familyId, memberId } = await params;

    // Get tenant context
    const tenantService = container.get<TenantService>(TYPES.TenantService);
    const tenant = await tenantService.getCurrentTenant();

    if (!tenant) {
      return NextResponse.json({ error: 'No tenant context available' }, { status: 401 });
    }

    // Parse request body
    const body = await request.json();

    // Validate role if provided
    const validRoles: FamilyRole[] = ['head', 'spouse', 'child', 'dependent', 'other'];
    if (body.role && !validRoles.includes(body.role)) {
      return NextResponse.json(
        { error: `Invalid role. Must be one of: ${validRoles.join(', ')}` },
        { status: 400 }
      );
    }

    const familyService = container.get<FamilyService>(TYPES.FamilyService);

    // Check if member is in family
    const isInFamily = await familyService.isMemberInFamily(familyId, memberId, tenant.id);
    if (!isInFamily) {
      return NextResponse.json({ error: 'Member is not in this family' }, { status: 404 });
    }

    // Update role if provided
    if (body.role) {
      await familyService.updateMemberRole(familyId, memberId, tenant.id, body.role, body.roleNotes);
    }

    // Update primary status if provided
    if (body.isPrimary === true) {
      await familyService.setPrimaryFamily(memberId, familyId, tenant.id);
    }

    // Fetch updated family member
    const members = await familyService.getFamilyMembers(familyId, tenant.id);
    const updatedMember = members.find((m) => m.member_id === memberId);

    return NextResponse.json({ data: updatedMember });
  } catch (error: unknown) {
    console.error('[PUT /api/families/[familyId]/members/[memberId]] Error:', error);
    const message = error instanceof Error ? error.message : 'Failed to update family member';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * DELETE /api/families/[familyId]/members/[memberId]
 *
 * Removes a member from a family.
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { familyId, memberId } = await params;

    // Get tenant context
    const tenantService = container.get<TenantService>(TYPES.TenantService);
    const tenant = await tenantService.getCurrentTenant();

    if (!tenant) {
      return NextResponse.json({ error: 'No tenant context available' }, { status: 401 });
    }

    const familyService = container.get<FamilyService>(TYPES.FamilyService);

    // Check if member is in family
    const isInFamily = await familyService.isMemberInFamily(familyId, memberId, tenant.id);
    if (!isInFamily) {
      return NextResponse.json({ error: 'Member is not in this family' }, { status: 404 });
    }

    // Remove member from family
    await familyService.removeMemberFromFamily(familyId, memberId, tenant.id);

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error('[DELETE /api/families/[familyId]/members/[memberId]] Error:', error);
    const message = error instanceof Error ? error.message : 'Failed to remove member from family';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
