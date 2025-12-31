import { NextResponse } from 'next/server';
import { container } from '@/lib/container';
import { TYPES } from '@/lib/types';
import { UserMemberLinkService } from '@/services/UserMemberLinkService';

interface RouteContext {
  params: {
    id: string;
  };
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const userMemberLinkService = container.get<UserMemberLinkService>(TYPES.UserMemberLinkService);
    const { id: invitationId } = context.params;

    // Check if invitation exists and get its current status
    const invitation = await userMemberLinkService.getInvitationById(invitationId);

    if (!invitation) {
      return NextResponse.json({ error: 'Invitation not found' }, { status: 404 });
    }

    if (invitation.status === 'accepted') {
      return NextResponse.json({ error: 'Cannot resend an accepted invitation' }, { status: 400 });
    }

    const now = new Date();
    const expiresAt = new Date(invitation.expires_at);
    const isExpired = now > expiresAt;

    const updatedInvitation = await userMemberLinkService.resendInvitation(
      invitationId,
      'system' // TODO: Get from authentication layer
    );

    return NextResponse.json({
      success: true,
      message: 'Invitation resent successfully',
      invitation: {
        id: updatedInvitation.id,
        member_name: invitation.member_id, // Service doesn't return member details
        email: updatedInvitation.email,
        status: updatedInvitation.status,
        expires_at: updatedInvitation.expires_at,
        was_expired: isExpired
      }
    });

  } catch (error) {
    console.error('Error resending invitation:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}