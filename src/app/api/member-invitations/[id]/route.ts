import { NextRequest, NextResponse } from 'next/server';
import { container } from '@/lib/container';
import { TYPES } from '@/lib/types';
import { UserMemberLinkService } from '@/services/UserMemberLinkService';
import { authUtils } from '@/utils/authUtils';
import { tenantUtils } from '@/utils/tenantUtils';

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

// GET /api/member-invitations/[id] - Get specific invitation
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await authUtils.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const tenantId = await tenantUtils.getTenantId();
    if (!tenantId) {
      return NextResponse.json({ error: 'No tenant context' }, { status: 400 });
    }

    const userMemberLinkService = container.get<UserMemberLinkService>(TYPES.UserMemberLinkService);
    const { id } = await params;

    const invitation = await userMemberLinkService.getInvitationById(id, tenantId);

    if (!invitation) {
      return NextResponse.json({ error: 'Invitation not found' }, { status: 404 });
    }

    return NextResponse.json(invitation);
  } catch (error) {
    console.error('Error fetching invitation:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/member-invitations/[id] - Revoke invitation
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await authUtils.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const tenantId = await tenantUtils.getTenantId();
    if (!tenantId) {
      return NextResponse.json({ error: 'No tenant context' }, { status: 400 });
    }

    const body = await request.json();
    const { reason } = body;

    const userMemberLinkService = container.get<UserMemberLinkService>(TYPES.UserMemberLinkService);
    const { id } = await params;

    const result = await userMemberLinkService.revokeInvitation(
      id,
      user.id,
      reason,
      tenantId
    );

    if (result.success) {
      return NextResponse.json(result);
    } else {
      return NextResponse.json(result, { status: 400 });
    }
  } catch (error) {
    console.error('Error revoking invitation:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}