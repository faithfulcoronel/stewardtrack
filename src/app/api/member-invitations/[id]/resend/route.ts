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

// POST /api/member-invitations/[id]/resend - Resend invitation
export async function POST(request: NextRequest, { params }: RouteParams) {
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

    const invitation = await userMemberLinkService.resendInvitation(id, user.id, tenantId);

    return NextResponse.json({
      success: true,
      message: 'Invitation resent successfully',
      invitation
    });
  } catch (error) {
    console.error('Error resending invitation:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}