import { NextRequest, NextResponse } from 'next/server';
import { container } from '@/lib/container';
import { TYPES } from '@/lib/types';
import type { AuthorizationService } from '@/services/AuthorizationService';
import type { IMinistryService } from '@/services/MinistryService';
import type { MinistryTeamUpdateInput } from '@/models/scheduler/ministryTeam.model';

type RouteParams = { params: Promise<{ id: string; memberId: string }> };

/**
 * PUT /api/community/ministries/[id]/team/[memberId]
 * Update a team member's role or status
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const authService = container.get<AuthorizationService>(TYPES.AuthorizationService);
    const authResult = await authService.checkAuthentication();

    if (!authResult.authorized) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { id: ministryId, memberId } = await params;
    const ministryService = container.get<IMinistryService>(TYPES.MinistryService);
    const body: MinistryTeamUpdateInput = await request.json();

    const teamMember = await ministryService.updateTeamMemberByMinistryAndMember(ministryId, memberId, body);

    return NextResponse.json({ success: true, data: teamMember });
  } catch (error) {
    console.error('Error updating team member:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to update team member' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/community/ministries/[id]/team/[memberId]
 * Remove a member from the ministry team
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const authService = container.get<AuthorizationService>(TYPES.AuthorizationService);
    const authResult = await authService.checkAuthentication();

    if (!authResult.authorized) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { id: ministryId, memberId } = await params;
    const ministryService = container.get<IMinistryService>(TYPES.MinistryService);

    await ministryService.removeTeamMemberByMinistryAndMember(ministryId, memberId);

    return NextResponse.json({ success: true, message: 'Team member removed' });
  } catch (error) {
    console.error('Error removing team member:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to remove team member' },
      { status: 500 }
    );
  }
}
