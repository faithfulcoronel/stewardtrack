import { NextRequest, NextResponse } from 'next/server';
import { container } from '@/lib/container';
import { TYPES } from '@/lib/types';
import type { AuthorizationService } from '@/services/AuthorizationService';
import type { IMinistryService } from '@/services/MinistryService';
import type { MinistryTeamCreateInput } from '@/models/scheduler/ministryTeam.model';

type RouteParams = { params: Promise<{ id: string }> };

/**
 * GET /api/community/ministries/[id]/team
 * Get team members for a ministry
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const authService = container.get<AuthorizationService>(TYPES.AuthorizationService);
    const authResult = await authService.checkAuthentication();

    if (!authResult.authorized) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Handle invalid ministry IDs (e.g., "new", "null", undefined)
    if (!id || id === 'new' || id === 'null' || id === 'undefined') {
      return NextResponse.json({ success: true, data: [] });
    }

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      return NextResponse.json({ success: true, data: [] });
    }

    const ministryService = container.get<IMinistryService>(TYPES.MinistryService);

    const team = await ministryService.getTeam(id);

    // Transform to the format expected by MinistryTeamManager component
    // Note: Member PII fields (first_name, last_name, email, contact_number) are decrypted in the adapter
    const transformedTeam = team.map((member) => ({
      id: member.id,
      memberId: member.member_id,
      memberName: member.member
        ? `${member.member.first_name || ''} ${member.member.last_name || ''}`.trim()
        : 'Unknown Member',
      memberEmail: member.member?.email || null,
      memberPhone: member.member?.contact_number || null,
      memberAvatar: member.member?.profile_picture_url || null,
      role: member.role,
      status: member.status,
      joinedAt: member.joined_at,
    }));

    return NextResponse.json({ success: true, data: transformedTeam });
  } catch (error) {
    console.error('Error fetching ministry team:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to fetch ministry team' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/community/ministries/[id]/team
 * Add a member to the ministry team
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const authService = container.get<AuthorizationService>(TYPES.AuthorizationService);
    const authResult = await authService.checkAuthentication();

    if (!authResult.authorized) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const ministryService = container.get<IMinistryService>(TYPES.MinistryService);
    const body = await request.json();

    // Basic validation
    if (!body.member_id) {
      return NextResponse.json(
        { success: false, error: 'Member ID is required' },
        { status: 400 }
      );
    }

    const teamMemberData: MinistryTeamCreateInput = {
      ministry_id: id,
      member_id: body.member_id,
      role: body.role ?? 'member',
      position: body.position,
      status: body.status ?? 'active',
    };

    const teamMember = await ministryService.addTeamMember(teamMemberData);

    return NextResponse.json({ success: true, data: teamMember }, { status: 201 });
  } catch (error) {
    console.error('Error adding team member:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to add team member' },
      { status: 500 }
    );
  }
}
